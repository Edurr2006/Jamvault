<?php
/**
 * JamVault - songbook.php
 * API para el cancionero del usuario (Kanban). Requiere una sesión activa.
 *
 * GET  ?action=list           → devuelve todas las canciones en el cancionero del usuario logueado
 * POST ?action=add            → { tab_id, category } → inserta o actualiza una entrada de canción
 * POST ?action=move           → { tab_id, category } → mueve una canción a una columna diferente
 * POST ?action=remove         → { tab_id } → elimina una canción del cancionero
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
    $stmt = $pdo->prepare("
        SELECT us.tab_id AS id, t.title, t.artist, us.category
        FROM user_songbook us
        JOIN tabs t ON t.id = us.tab_id
        WHERE us.user_id = ?
        ORDER BY us.added_at ASC
    ");
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll();

    // Agrupar por categoría
    $result = ['want' => [], 'progress' => [], 'done' => []];
    foreach ($rows as $row) {
        $cat = $row['category'];
        if (isset($result[$cat])) {
            $result[$cat][] = [
                'id'     => (int) $row['id'],
                'title'  => $row['title'],
                'artist' => $row['artist'],
            ];
        }
    }

    echo json_encode(['success' => true, 'songbook' => $result]);
    exit;
}

// ── Acciones POST ────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) {
        echo json_encode(['error' => 'Cuerpo JSON inválido']);
        exit;
    }

    // ── add / move (upsert: insertar o actualizar) ─────────────────────────────
    if ($action === 'add' || $action === 'move') {
        $tabId    = (int) ($body['tab_id'] ?? 0);
        $category = $body['category'] ?? '';

        if (!$tabId || !in_array($category, ['want', 'progress', 'done'])) {
            echo json_encode(['error' => 'tab_id o categoría inválidos']);
            exit;
        }

        try {
            // INSERT ... ON DUPLICATE KEY UPDATE maneja tanto añadir como mover
            $stmt = $pdo->prepare("
                INSERT INTO user_songbook (user_id, tab_id, category)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE category = VALUES(category)
            ");
            $stmt->execute([$userId, $tabId, $category]);
            echo json_encode(['success' => true]);
        } catch (PDOException $e) {
            echo json_encode(['error' => 'Error de base de datos: ' . $e->getMessage()]);
        }
        exit;
    }

    // ── remove (eliminar) ────────────────────────────────────────────────────
    if ($action === 'remove') {
        $tabId = (int) ($body['tab_id'] ?? 0);
        if (!$tabId) {
            echo json_encode(['error' => 'Falta tab_id']);
            exit;
        }
        $stmt = $pdo->prepare("DELETE FROM user_songbook WHERE user_id = ? AND tab_id = ?");
        $stmt->execute([$userId, $tabId]);
        echo json_encode(['success' => true]);
        exit;
    }
}

echo json_encode(['error' => 'Acción inválida']);
