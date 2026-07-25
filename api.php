<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

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
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS uploaded_files (
            id VARCHAR(64) NOT NULL PRIMARY KEY,
            original_name VARCHAR(255) NOT NULL,
            mime_type VARCHAR(255) NOT NULL,
            file_size BIGINT UNSIGNED NOT NULL,
            storage_name VARCHAR(128) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
    );
    return $pdo;
}

function uploadDir(): string {
    $dir = __DIR__ . '/uploads';
    if (!is_dir($dir) && !mkdir($dir, 0750, true) && !is_dir($dir)) {
        respond(['ok' => false, 'error' => 'Upload-Ordner konnte nicht angelegt werden.'], 500);
    }
    return $dir;
}

function fileUrl(string $id): string {
    $base = strtok((string)($_SERVER['REQUEST_URI'] ?? 'api.php'), '?') ?: 'api.php';
    return $base . '?action=file&id=' . rawurlencode($id);
}

function handleUpload(): never {
    if (!isset($_FILES['file']) || !is_array($_FILES['file'])) {
        respond(['ok' => false, 'error' => 'Keine Datei empfangen.'], 400);
    }

    $file = $_FILES['file'];
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        respond(['ok' => false, 'error' => 'Upload fehlgeschlagen.'], 400);
    }

    $size = (int)($file['size'] ?? 0);
    if ($size <= 0) {
        respond(['ok' => false, 'error' => 'Die Datei ist leer.'], 400);
    }

    $id = bin2hex(random_bytes(16));
    $storageName = $id . '.bin';
    $target = uploadDir() . '/' . $storageName;
    if (!move_uploaded_file((string)$file['tmp_name'], $target)) {
        respond(['ok' => false, 'error' => 'Datei konnte nicht gespeichert werden.'], 500);
    }

    $mime = (string)($file['type'] ?? 'application/octet-stream');
    if ($mime === '') $mime = 'application/octet-stream';
    $name = trim(basename((string)($file['name'] ?? 'Datei')));
    if ($name === '') $name = 'Datei';

    $stmt = db()->prepare(
        'INSERT INTO uploaded_files (id, original_name, mime_type, file_size, storage_name)
         VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->execute([$id, substr($name, 0, 255), substr($mime, 0, 255), $size, $storageName]);

    respond(['ok' => true, 'file' => [
        'id' => $id,
        'name' => $name,
        'type' => $mime,
        'size' => $size,
        'url' => fileUrl($id),
        'createdAt' => gmdate('c'),
    ]]);
}

function streamFile(): never {
    $id = (string)($_GET['id'] ?? '');
    if (!preg_match('/^[a-f0-9]{32}$/', $id)) {
        respond(['ok' => false, 'error' => 'Datei nicht gefunden.'], 404);
    }

    $stmt = db()->prepare('SELECT * FROM uploaded_files WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        respond(['ok' => false, 'error' => 'Datei nicht gefunden.'], 404);
    }

    $path = uploadDir() . '/' . (string)$row['storage_name'];
    if (!is_file($path)) {
        respond(['ok' => false, 'error' => 'Datei fehlt auf dem Server.'], 404);
    }

    header_remove('Content-Type');
    header('Content-Type: ' . (string)$row['mime_type']);
    header('Content-Length: ' . filesize($path));
    header('Content-Disposition: inline; filename="' . addcslashes((string)$row['original_name'], "\\\"") . '"');
    header('Cache-Control: private, max-age=86400');
    readfile($path);
    exit;
}

function deleteUploadedFile(string $id): void {
    if (!preg_match('/^[a-f0-9]{32}$/', $id)) {
        respond(['ok' => false, 'error' => 'Datei nicht gefunden.'], 404);
    }

    $stmt = db()->prepare('SELECT storage_name FROM uploaded_files WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        respond(['ok' => true, 'deleted' => false]);
    }

    $path = uploadDir() . '/' . (string)$row['storage_name'];
    if (is_file($path) && !unlink($path)) {
        respond(['ok' => false, 'error' => 'Datei konnte nicht vom Server gelöscht werden.'], 500);
    }

    $delete = db()->prepare('DELETE FROM uploaded_files WHERE id = ?');
    $delete->execute([$id]);
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
    $action = (string)($_GET['action'] ?? '');

    if ($action === 'file' && $_SERVER['REQUEST_METHOD'] === 'GET') {
        streamFile();
    }

    if ($action === 'upload' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        handleUpload();
    }

    $input = readInput();

    if ($action === 'load') {
        respond(['ok' => true] + loadState());
    }

    if ($action === 'save') {
        saveState(normalizeTasks($input['tasks'] ?? []), normalizeBoards($input['boards'] ?? null));
        respond(['ok' => true] + loadState());
    }

    if ($action === 'deleteFile') {
        $id = is_string($input['id'] ?? null) ? $input['id'] : '';
        deleteUploadedFile($id);
        respond(['ok' => true, 'deleted' => true]);
    }

    respond(['ok' => false, 'error' => 'Unbekannte API-Aktion.'], 404);
} catch (Throwable $error) {
    respond(['ok' => false, 'error' => 'Datenbankfehler: ' . $error->getMessage()], 500);
}
