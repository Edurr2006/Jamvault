<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
session_start();

$host   = 'localhost';
$dbname = 'jamvault';
$user   = 'root';
$pass   = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    if ($action === 'register') {
        $username = trim($data['username'] ?? '');
        $email = trim($data['email'] ?? '');
        $password = $data['password'] ?? '';

        if (!$username || !$email || !$password) {
            echo json_encode(['error' => 'Missing fields']);
            exit;
        }

        // Check if exists
        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
        $stmt->execute([$username, $email]);
        if ($stmt->fetch()) {
            echo json_encode(['error' => 'Username or email already exists']);
            exit;
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)");
        if ($stmt->execute([$username, $email, $hash])) {
            $userId = $pdo->lastInsertId();
            $_SESSION['user_id'] = $userId;
            $_SESSION['username'] = $username;
            echo json_encode(['success' => true, 'user' => ['id' => $userId, 'username' => $username]]);
        } else {
            echo json_encode(['error' => 'Registration failed']);
        }
        exit;
    }

    if ($action === 'login') {
        $username = trim($data['username'] ?? '');
        $password = $data['password'] ?? '';

        $stmt = $pdo->prepare("SELECT id, username, password_hash FROM users WHERE username = ? OR email = ?");
        $stmt->execute([$username, $username]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password_hash'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            echo json_encode(['success' => true, 'user' => ['id' => $user['id'], 'username' => $user['username']]]);
        } else {
            echo json_encode(['error' => 'Invalid credentials']);
        }
        exit;
    }

    if ($action === 'logout') {
        session_destroy();
        echo json_encode(['success' => true]);
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'me') {
        if (isset($_SESSION['user_id'])) {
            echo json_encode(['loggedIn' => true, 'user' => ['id' => $_SESSION['user_id'], 'username' => $_SESSION['username']]]);
        } else {
            echo json_encode(['loggedIn' => false]);
        }
        exit;
    }
}

echo json_encode(['error' => 'Invalid action']);
