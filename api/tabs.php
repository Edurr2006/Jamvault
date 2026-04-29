<?php
/**
 * JamVault - API de Tablaturas
 * GET /api/tabs.php          → lista todos los tabs
 * GET /api/tabs.php?q=query  → busca por título o artista
 * GET /api/tabs.php?id=5     → devuelve un tab concreto
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

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

try {
    if ($id) {
        // Devuelve un solo tab por ID
        $stmt = $pdo->prepare('SELECT * FROM tabs WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        echo json_encode($row ?: ['error' => 'Tab no encontrado']);

    } elseif ($q !== '') {
        // Búsqueda por título o artista
        $like = "%$q%";
        $stmt = $pdo->prepare(
            'SELECT * FROM tabs WHERE title LIKE ? OR artist LIKE ? ORDER BY views DESC'
        );
        $stmt->execute([$like, $like]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));

    } else {
        // Lista completa ordenada por popularidad
        $stmt = $pdo->query('SELECT * FROM tabs ORDER BY views DESC');
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
