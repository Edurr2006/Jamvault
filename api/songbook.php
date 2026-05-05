<?php
/**
 * JamVault - songbook.php
 * API for user-owned songbook (Kanban). Requires an active session.
 *
 * GET  ?action=list           → returns all songs in the logged-in user's songbook
 * POST ?action=add            → { tab_id, category } → insert or update a song entry
 * POST ?action=move           → { tab_id, category } → move song to a different column
 * POST ?action=remove         → { tab_id } → remove a song from the songbook
 */

header('Content-Type: application/json; charset=utf-8');
session_start();

// ── Auth check ──────────────────────────────────────────────────────────────
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$userId = (int) $_SESSION['user_id'];

// ── DB connection ────────────────────────────────────────────────────────────
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
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

$action = $_GET['action'] ?? '';

// ── GET: list ────────────────────────────────────────────────────────────────
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

    // Group by category
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

// ── POST actions ─────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) {
        echo json_encode(['error' => 'Invalid JSON body']);
        exit;
    }

    // ── add / move (upsert) ──────────────────────────────────────────────────
    if ($action === 'add' || $action === 'move') {
        $tabId    = (int) ($body['tab_id'] ?? 0);
        $category = $body['category'] ?? '';

        if (!$tabId || !in_array($category, ['want', 'progress', 'done'])) {
            echo json_encode(['error' => 'Invalid tab_id or category']);
            exit;
        }

        try {
            // INSERT ... ON DUPLICATE KEY UPDATE handles both add and move
            $stmt = $pdo->prepare("
                INSERT INTO user_songbook (user_id, tab_id, category)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE category = VALUES(category)
            ");
            $stmt->execute([$userId, $tabId, $category]);
            echo json_encode(['success' => true]);
        } catch (PDOException $e) {
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
        exit;
    }

    // ── remove ───────────────────────────────────────────────────────────────
    if ($action === 'remove') {
        $tabId = (int) ($body['tab_id'] ?? 0);
        if (!$tabId) {
            echo json_encode(['error' => 'Missing tab_id']);
            exit;
        }
        $stmt = $pdo->prepare("DELETE FROM user_songbook WHERE user_id = ? AND tab_id = ?");
        $stmt->execute([$userId, $tabId]);
        echo json_encode(['success' => true]);
        exit;
    }
}

echo json_encode(['error' => 'Invalid action']);
