<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

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

function normalizeBoards(mixed $boards): ?array {
    if (!is_array($boards)) return null;
    return [
        'enabledBroadcasts' => array_values(array_filter($boards['enabledBroadcasts'] ?? [], static fn($key) => is_string($key))),
        'activeBroadcast' => is_string($boards['activeBroadcast'] ?? null) ? $boards['activeBroadcast'] : null,
        'colors' => is_array($boards['colors'] ?? null) ? $boards['colors'] : [],
        'updatedAt' => is_string($boards['updatedAt'] ?? null) ? $boards['updatedAt'] : gmdate('c'),
    ];
}

function defaultState(): array {
    return [
        'tasks' => [],
        'boards' => null,
    ];
}

function loadState(): array {
    $stmt = db()->prepare('SELECT state_json FROM app_state WHERE state_key = ?');
    $stmt->execute([STATE_KEY]);
    $row = $stmt->fetch();
    if (!$row) return defaultState();
    $data = json_decode((string)$row['state_json'], true);
    if (is_array($data) && isset($data['tasks'])) {
        return [
            'tasks' => normalizeTasks($data['tasks']),
            'boards' => normalizeBoards($data['boards'] ?? null),
        ];
    }
    return [
        'tasks' => normalizeTasks($data),
        'boards' => null,
    ];
}

function saveState(array $tasks, ?array $boards): void {
    $payload = json_encode([
        'app' => 'zeitmanagement',
        'version' => 7,
        'updatedAt' => gmdate('c'),
        'tasks' => normalizeTasks($tasks),
        'boards' => normalizeBoards($boards),
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
        respond(['ok' => true] + loadState());
    }

    if ($action === 'save') {
        saveState(normalizeTasks($input['tasks'] ?? []), normalizeBoards($input['boards'] ?? null));
        respond(['ok' => true] + loadState());
    }

    respond(['ok' => false, 'error' => 'Unbekannte API-Aktion.'], 404);
} catch (Throwable $error) {
    respond(['ok' => false, 'error' => 'Datenbankfehler: ' . $error->getMessage()], 500);
}
