<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

const DB_HOST = 'localhost';
const DB_NAME = 'db13163493-zeit';
const DB_USER = 'db13163493-ze';
const DB_PASS = 'MdrZeit!';
const STATE_KEY = 'tasks';

function respond(array $payload, int $status = 200): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function readInput(): array {
    $raw = file_get_contents('php://input') ?: '{}';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;

    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS app_state (
            state_key VARCHAR(64) NOT NULL PRIMARY KEY,
            state_json LONGTEXT NOT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
    );
    return $pdo;
}

function normalizeTasks(mixed $tasks): array {
    if (!is_array($tasks)) return [];
    return array_values(array_filter($tasks, static fn($task) => is_array($task)));
}

function loadTasks(): array {
    $stmt = db()->prepare('SELECT state_json FROM app_state WHERE state_key = ?');
    $stmt->execute([STATE_KEY]);
    $row = $stmt->fetch();
    if (!$row) return [];
    $data = json_decode((string)$row['state_json'], true);
    if (is_array($data) && isset($data['tasks'])) return normalizeTasks($data['tasks']);
    return normalizeTasks($data);
}

function saveTasks(array $tasks): void {
    $payload = json_encode([
        'app' => 'zeitmanagement',
        'version' => 6,
        'updatedAt' => gmdate('c'),
        'tasks' => normalizeTasks($tasks),
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    if ($payload === false) {
        respond(['ok' => false, 'error' => 'Aufgaben konnten nicht serialisiert werden.'], 400);
    }

    $stmt = db()->prepare(
        'INSERT INTO app_state (state_key, state_json)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE state_json = VALUES(state_json)'
    );
    $stmt->execute([STATE_KEY, $payload]);
}

try {
    $input = readInput();
    $action = (string)($_GET['action'] ?? '');

    if ($action === 'load') {
        respond(['ok' => true, 'tasks' => loadTasks()]);
    }

    if ($action === 'save') {
        saveTasks(normalizeTasks($input['tasks'] ?? []));
        respond(['ok' => true, 'tasks' => loadTasks()]);
    }

    respond(['ok' => false, 'error' => 'Unbekannte API-Aktion.'], 404);
} catch (Throwable $error) {
    respond(['ok' => false, 'error' => 'Datenbankfehler: ' . $error->getMessage()], 500);
}
