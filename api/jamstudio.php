<?php
/**
 * JamVault - API de Proyectos JamStudio
 * Gestiona la creación, listado, carga y eliminación de proyectos del usuario.
 */

session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Configuración de la base de datos
$host = 'localhost';
$dbname = 'jamvault';
$user = 'root';
$pass = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error de conexión a la base de datos']);
    exit;
}

// Verificar sesión activa
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'No autenticado. Inicia sesión para continuar.']);
    exit;
}

$userId = (int)$_SESSION['user_id'];
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// --- LISTADO DE PROYECTOS ---
if ($action === 'list' && $method === 'GET') {
    $stmt = $pdo->prepare(
        'SELECT id, name, updated_at FROM user_jamstudio_projects WHERE user_id = ? ORDER BY updated_at DESC'
    );
    $stmt->execute([$userId]);
    echo json_encode(['projects' => $stmt->fetchAll()]);
    exit;
}

// --- CARGA DE UN PROYECTO ---
if ($action === 'load' && $method === 'GET') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID de proyecto no válido']);
        exit;
    }
    $stmt = $pdo->prepare(
        'SELECT id, name, project_data FROM user_jamstudio_projects WHERE id = ? AND user_id = ?'
    );
    $stmt->execute([$id, $userId]);
    $project = $stmt->fetch();
    if (!$project) {
        http_response_code(404);
        echo json_encode(['error' => 'Proyecto no encontrado']);
        exit;
    }
    echo json_encode(['project' => $project]);
    exit;
}

// --- GUARDADO / ACTUALIZACIÓN DE PROYECTO ---
if ($action === 'save' && $method === 'POST') {
    $rawInput = file_get_contents('php://input');
    
    // Detectar si PHP truncó la petición por superar 'post_max_size'
    if (empty($rawInput) && isset($_SERVER['CONTENT_LENGTH']) && (int)$_SERVER['CONTENT_LENGTH'] > 0) {
        http_response_code(413);
        echo json_encode([
            'error' => 'El proyecto es demasiado grande para los límites actuales de PHP del servidor. Se ha configurado un archivo .htaccess para intentar subir el límite a 128MB. Si continúas viendo este error, por favor aumenta el límite "post_max_size" y "upload_max_filesize" en el archivo php.ini de tu XAMPP.'
        ]);
        exit;
    }

    $body = json_decode($rawInput, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['error' => 'Error al decodificar datos del proyecto (JSON inválido): ' . json_last_error_msg()]);
        exit;
    }

    $name = trim($body['name'] ?? '');
    $projectData = $body['project_data'] ?? null;
    $id = isset($body['id']) ? (int)$body['id'] : 0;

    if (!$name || !$projectData) {
        http_response_code(400);
        echo json_encode(['error' => 'Nombre y datos del proyecto son obligatorios']);
        exit;
    }

    $projectDataJson = json_encode($projectData);

    try {
        if ($id > 0) {
            // Actualizar proyecto existente (verificar que pertenece al usuario)
            $stmt = $pdo->prepare(
                'UPDATE user_jamstudio_projects SET name = ?, project_data = ?, updated_at = NOW() WHERE id = ? AND user_id = ?'
            );
            $stmt->execute([$name, $projectDataJson, $id, $userId]);
            // Nota: rowCount es 0 si no cambió nada, pero se guardó con éxito.
            echo json_encode(['success' => true, 'id' => $id, 'message' => 'Proyecto actualizado']);
        } else {
            // Crear nuevo proyecto
            $stmt = $pdo->prepare(
                'INSERT INTO user_jamstudio_projects (user_id, name, project_data) VALUES (?, ?, ?)'
            );
            $stmt->execute([$userId, $name, $projectDataJson]);
            $newId = $pdo->lastInsertId();
            echo json_encode(['success' => true, 'id' => $newId, 'message' => 'Proyecto guardado']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        if (strpos($e->getMessage(), 'max_allowed_packet') !== false) {
            echo json_encode([
                'error' => 'El proyecto supera el tamaño permitido por la base de datos (límite "max_allowed_packet" en MySQL). Para solucionarlo, edita tu archivo "my.ini" en XAMPP, busca la línea "max_allowed_packet = 1M" (o similar), cámbiala a "max_allowed_packet = 128M" y reinicia MySQL.'
            ]);
        } else {
            echo json_encode(['error' => 'Error en la base de datos al guardar: ' . $e->getMessage()]);
        }
    }
    exit;
}

// --- ELIMINACIÓN DE PROYECTO ---
if ($action === 'delete' && $method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    $id = (int)($body['id'] ?? 0);
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID de proyecto no válido']);
        exit;
    }
    $stmt = $pdo->prepare(
        'DELETE FROM user_jamstudio_projects WHERE id = ? AND user_id = ?'
    );
    $stmt->execute([$id, $userId]);
    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Proyecto no encontrado o sin permisos']);
        exit;
    }
    echo json_encode(['success' => true, 'message' => 'Proyecto eliminado']);
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Acción no reconocida']);
