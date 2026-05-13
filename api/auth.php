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
    echo json_encode(['error' => 'Error de conexión a la base de datos']);
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

        // Comprobar si ya existe
        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
        $stmt->execute([$username, $email]);
        if ($stmt->fetch()) {
            echo json_encode(['error' => 'El nombre de usuario o email ya existe']);
            exit;
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)");
        if ($stmt->execute([$username, $email, $hash])) {
            $userId = $pdo->lastInsertId();
            $_SESSION['user_id'] = $userId;
            $_SESSION['username'] = $username;
            echo json_encode(['success' => true, 'user' => ['id' => $userId, 'username' => $username, 'email' => $email]]);
        } else {
            echo json_encode(['error' => 'Error en el registro']);
        }
        exit;
    }

    if ($action === 'login') {
        $username = trim($data['username'] ?? '');
        $password = $data['password'] ?? '';

        $stmt = $pdo->prepare("SELECT id, username, email, password_hash FROM users WHERE username = ? OR email = ?");
        $stmt->execute([$username, $username]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password_hash'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            echo json_encode(['success' => true, 'user' => ['id' => $user['id'], 'username' => $user['username'], 'email' => $user['email']]]);
        } else {
            echo json_encode(['error' => 'Credenciales inválidas']);
        }
        exit;
    }

    if ($action === 'logout') {
        session_destroy();
        echo json_encode(['success' => true]);
        exit;
    }

    if ($action === 'update_profile') {
        if (!isset($_SESSION['user_id'])) {
            echo json_encode(['error' => 'No autenticado']);
            exit;
        }

        $userId = $_SESSION['user_id'];
        $newUsername = trim($data['username'] ?? '');
        $newEmail = trim($data['email'] ?? '');
        $newPassword = $data['password'] ?? '';

        if (!$newUsername || !$newEmail) {
            echo json_encode(['error' => 'Missing fields']);
            exit;
        }

        // Comprobar conflictos
        $stmt = $pdo->prepare("SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?");
        $stmt->execute([$newUsername, $newEmail, $userId]);
        if ($stmt->fetch()) {
            echo json_encode(['error' => 'El nombre de usuario o email ya está en uso']);
            exit;
        }

        if ($newPassword) {
            $hash = password_hash($newPassword, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("UPDATE users SET username = ?, email = ?, password_hash = ? WHERE id = ?");
            $res = $stmt->execute([$newUsername, $newEmail, $hash, $userId]);
        } else {
            $stmt = $pdo->prepare("UPDATE users SET username = ?, email = ? WHERE id = ?");
            $res = $stmt->execute([$newUsername, $newEmail, $userId]);
        }

        if ($res) {
            $_SESSION['username'] = $newUsername;
            echo json_encode(['success' => true, 'user' => ['id' => $userId, 'username' => $newUsername, 'email' => $newEmail]]);
        } else {
            echo json_encode(['error' => 'Error al actualizar el perfil']);
        }
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if ($action === 'me') {
        if (isset($_SESSION['user_id'])) {
            // Verificar que el usuario realmente existe en la BD para evitar sesiones "zombi" tras reinicios de la BD
            $stmt = $pdo->prepare("SELECT id, email FROM users WHERE id = ?");
            $stmt->execute([$_SESSION['user_id']]);
            $user = $stmt->fetch();
            if ($user) {
                echo json_encode(['loggedIn' => true, 'user' => ['id' => $_SESSION['user_id'], 'username' => $_SESSION['username'], 'email' => $user['email']]]);
            } else {
                session_destroy();
                echo json_encode(['loggedIn' => false]);
            }
        } else {
            echo json_encode(['loggedIn' => false]);
        }
        exit;
    }
}

echo json_encode(['error' => 'Acción inválida']);
