<?php
/**
 * JamVault - exercises.php
 * API para ejercicios propiedad del usuario. Requiere una sesión activa.
 *
 * GET  ?action=list           → devuelve todos los ejercicios del usuario logueado
 * POST ?action=save           → inserta o actualiza un ejercicio (cuerpo: objeto JSON del ejercicio)
 * POST ?action=delete         → elimina un ejercicio por id (cuerpo: { id })
 */

header('Content-Type: application/json; charset=utf-8');
session_start();

// ── Comprobación de autenticación ───────────────────────────────────────────
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'No autorizado']);
    exit;
}

$userId = (int) $_SESSION['user_id'];

// ── Conexión a la BD ─────────────────────────────────────────────────────────
$host   = 'localhost';
$dbname = 'jamvault';
$user   = 'root';
$pass   = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $e) {
    echo json_encode(['error' => 'Error de conexión a la base de datos']);
    exit;
}

$action = $_GET['action'] ?? '';

// ── GET: list (listar) ───────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'list') {
    $stmt = $pdo->prepare("SELECT id, title, content, created_at FROM user_exercises WHERE user_id = ? ORDER BY created_at DESC");
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll();

    $exercises = array_map(function ($row) {
        $ex = json_decode($row['content'], true);
        // Almacenar el id de la fila de la BD para poder referenciarlo en actualizaciones/eliminaciones
        $ex['_db_id'] = (int) $row['id'];
        return $ex;
    }, $rows);

    echo json_encode(['success' => true, 'exercises' => $exercises]);
    exit;
}

// ── Acciones POST ────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) {
        echo json_encode(['error' => 'Cuerpo JSON inválido']);
        exit;
    }

    // ── save (guardar: insertar o actualizar) ──────────────────────────────────
    if ($action === 'save') {
        $title   = trim($body['name'] ?? 'Ejercicio sin nombre');
        $content = json_encode($body);
        $dbId    = isset($body['_db_id']) ? (int) $body['_db_id'] : 0;

        try {
            if ($dbId > 0) {
                // Actualizar — verificar propiedad
                $stmt = $pdo->prepare("UPDATE user_exercises SET title = ?, content = ? WHERE id = ? AND user_id = ?");
                $stmt->execute([$title, $content, $dbId, $userId]);
                echo json_encode(['success' => true, 'db_id' => $dbId]);
            } else {
                // Insertar
                $stmt = $pdo->prepare("INSERT INTO user_exercises (user_id, title, content) VALUES (?, ?, ?)");
                $stmt->execute([$userId, $title, $content]);
                echo json_encode(['success' => true, 'db_id' => (int) $pdo->lastInsertId()]);
            }
        } catch (PDOException $e) {
            echo json_encode(['error' => 'Error de base de datos: ' . $e->getMessage()]);
        }
        exit;
    }

    // ── delete (eliminar) ────────────────────────────────────────────────────
    if ($action === 'delete') {
        $dbId = (int) ($body['db_id'] ?? 0);
        if (!$dbId) {
            echo json_encode(['error' => 'Falta db_id']);
            exit;
        }
        $stmt = $pdo->prepare("DELETE FROM user_exercises WHERE id = ? AND user_id = ?");
        $stmt->execute([$dbId, $userId]);
        echo json_encode(['success' => true]);
        exit;
    }
}

echo json_encode(['error' => 'Acción inválida']);
