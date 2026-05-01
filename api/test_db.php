<?php
$host   = 'localhost';
$dbname = 'jamvault';
$user   = 'root';
$pass   = '';

try {
    $pdo = new PDO("mysql:host=$host", $user, $pass);
    $stmt = $pdo->query("SHOW DATABASES LIKE '$dbname'");
    $dbExists = $stmt->fetch();
    
    if ($dbExists) {
        $pdo->exec("USE $dbname");
        $stmt = $pdo->query("SHOW TABLES LIKE 'tabs'");
        $tableExists = $stmt->fetch();
        echo json_encode([
            'database' => 'exists',
            'table_tabs' => $tableExists ? 'exists' : 'missing'
        ]);
    } else {
        echo json_encode(['database' => 'missing']);
    }
} catch (PDOException $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
