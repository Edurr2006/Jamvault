<?php
/**
 * JamVault - exercises.php
 * API for user-owned exercises. Requires an active session.
 *
 * GET  ?action=list           → returns all exercises for the logged-in user
 * POST ?action=save           → insert or update an exercise (body: JSON exercise object)
 * POST ?action=delete         → delete an exercise by id (body: { id })
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
    $stmt = $pdo->prepare("SELECT id, title, content, created_at FROM user_exercises WHERE user_id = ? ORDER BY created_at DESC");
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll();

    $exercises = array_map(function ($row) {
        $ex = json_decode($row['content'], true);
        // Store the DB row id so we can reference it for updates/deletes
        $ex['_db_id'] = (int) $row['id'];
        return $ex;
    }, $rows);

    echo json_encode(['success' => true, 'exercises' => $exercises]);
    exit;
}

// ── POST actions ─────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) {
        echo json_encode(['error' => 'Invalid JSON body']);
        exit;
    }

    // ── save (insert or update) ──────────────────────────────────────────────
    if ($action === 'save') {
        $title   = trim($body['name'] ?? 'Ejercicio sin nombre');
        $content = json_encode($body);
        $dbId    = isset($body['_db_id']) ? (int) $body['_db_id'] : 0;

        try {
            if ($dbId > 0) {
                // Update — verify ownership
                $stmt = $pdo->prepare("UPDATE user_exercises SET title = ?, content = ? WHERE id = ? AND user_id = ?");
                $stmt->execute([$title, $content, $dbId, $userId]);
                echo json_encode(['success' => true, 'db_id' => $dbId]);
            } else {
                // Insert
                $stmt = $pdo->prepare("INSERT INTO user_exercises (user_id, title, content) VALUES (?, ?, ?)");
                $stmt->execute([$userId, $title, $content]);
                echo json_encode(['success' => true, 'db_id' => (int) $pdo->lastInsertId()]);
            }
        } catch (PDOException $e) {
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
        exit;
    }

    // ── delete ───────────────────────────────────────────────────────────────
    if ($action === 'delete') {
        $dbId = (int) ($body['db_id'] ?? 0);
        if (!$dbId) {
            echo json_encode(['error' => 'Missing db_id']);
            exit;
        }
        $stmt = $pdo->prepare("DELETE FROM user_exercises WHERE id = ? AND user_id = ?");
        $stmt->execute([$dbId, $userId]);
        echo json_encode(['success' => true]);
        exit;
    }
}

echo json_encode(['error' => 'Invalid action']);
