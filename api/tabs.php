<?php
/**
 * JamVault - API de Tablaturas
 * GET /api/tabs.php          → lista todos los tabs
 * GET /api/tabs.php?q=query  → busca por título o artista
 * GET /api/tabs.php?id=5     → devuelve un tab concreto
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// --- Configuración de conexión ---
$host   = 'localhost';
$dbname = 'jamvault';
$user   = 'root';
$pass   = '';  // En XAMPP la contraseña de root está vacía por defecto

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $user,
        $pass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error de base de datos: ' . $e->getMessage()]);
    exit;
}

// --- Lógica de rutas ---
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;
$q  = isset($_GET['q'])  ? trim($_GET['q'])  : '';

// Función auxiliar para inyectar metadatos virtuales sin tocar la base de datos
function injectMetadata(&$row) {
    if (!$row) return;
    $metadata = [
        'Nothing Else Matters' => ['instruments' => 'guitar,bass', 'tuning' => 'standard'],
        'Stairway to Heaven' => ['instruments' => 'guitar,bass', 'tuning' => 'standard'],
        'Smells Like Teen Spirit' => ['instruments' => 'guitar,bass,drums', 'tuning' => 'standard'],
        'Enter Sandman' => ['instruments' => 'guitar,bass,drums', 'tuning' => 'standard'],
        'Hotel California' => ['instruments' => 'guitar,bass', 'tuning' => 'standard'],
        'Sweet Child O Mine' => ['instruments' => 'guitar,bass', 'tuning' => 'halfstep'],
        'Parisienne Walkways' => ['instruments' => 'guitar,bass', 'tuning' => 'standard']
    ];
    $title = $row['title'] ?? '';
    if (isset($metadata[$title])) {
        $row['instruments'] = $metadata[$title]['instruments'];
        $row['tuning'] = $metadata[$title]['tuning'];
    } else {
        $row['instruments'] = 'guitar';
        $row['tuning'] = 'standard';
    }
}

try {
    if ($id) {
        // Devuelve un solo tab por ID con metadatos inyectados
        $stmt = $pdo->prepare('SELECT * FROM tabs WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            injectMetadata($row);
        }
        echo json_encode($row ?: ['error' => 'Tab no encontrado']);

    } elseif ($q !== '') {
        // Búsqueda por título o artista con metadatos inyectados
        $like = "%$q%";
        $stmt = $pdo->prepare(
            'SELECT * FROM tabs WHERE title LIKE ? OR artist LIKE ? ORDER BY views DESC'
        );
        $stmt->execute([$like, $like]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$row) {
            injectMetadata($row);
        }
        unset($row);
        echo json_encode($rows);

    } else {
        // Lista completa ordenada por popularidad con metadatos inyectados
        $stmt = $pdo->query('SELECT * FROM tabs ORDER BY views DESC');
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$row) {
            injectMetadata($row);
        }
        unset($row);
        echo json_encode($rows);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

