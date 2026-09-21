<?php
// COPY this file to config.php and fill in DB_PASS + INSTALL_KEY on the server.

// ------------------------------------------------------------------
//  Weland API — shared config, DB connection & helpers
//  This file lives SERVER-SIDE only. Its DB credentials are never
//  shipped to the browser.
// ------------------------------------------------------------------
declare(strict_types=1);

// ---- MySQL credentials (edit these on the server) ----
const DB_HOST = 'localhost';
const DB_NAME = 'weland';
const DB_USER = 'weland_app';
const DB_PASS = '__SET_DB_PASSWORD__';        // weland_app@localhost — scoped to the weland schema
const DB_CHARSET = 'utf8mb4';

// ---- Guards install.php in the browser. (Terminal `php install.php` needs no key.) ----
const INSTALL_KEY = '__SET_INSTALL_KEY__';

// ---- Origins allowed to call this API from a browser ----
//  (In production the SPA and API share the same origin, so CORS is not
//   even needed there; the localhost entries are only for `npm run dev`.)
const ALLOWED_ORIGINS = [
  'https://weland.dranzo.com',
  'http://localhost:5173',
  'http://localhost:5199',
];

function cors(): void {
  $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
  if ($origin !== '' && in_array($origin, ALLOWED_ORIGINS, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Vary: Origin');
  }
  header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type, Authorization');
  if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
  }
}

function db(): PDO {
  static $pdo = null;
  if ($pdo === null) {
    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
      PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
  }
  return $pdo;
}

function json_out($data, int $code = 200): void {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

function fail(string $message, int $code = 400): void {
  json_out(['error' => $message], $code);
}

function body(): array {
  $raw = file_get_contents('php://input');
  if ($raw === '' || $raw === false) return [];
  $d = json_decode($raw, true);
  return is_array($d) ? $d : [];
}

function bearer_token(): ?string {
  $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
  if ($h === '' && function_exists('apache_request_headers')) {
    $hdrs = apache_request_headers();
    $h = $hdrs['Authorization'] ?? $hdrs['authorization'] ?? '';
  }
  if (preg_match('/Bearer\s+(.+)/i', (string)$h, $m)) return trim($m[1]);
  return null;
}

function current_user(): ?array {
  $token = bearer_token();
  if (!$token) return null;
  $st = db()->prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? LIMIT 1');
  $st->execute([$token]);
  $u = $st->fetch();
  if (!$u || (int)$u['active'] !== 1) return null;
  return $u;
}

function require_user(): array {
  $u = current_user();
  if (!$u) fail('Not authenticated.', 401);
  return $u;
}

function role_rights(string $role): array {
  $st = db()->prepare('SELECT rights FROM roles WHERE name = ? LIMIT 1');
  $st->execute([$role]);
  $r = $st->fetch();
  if (!$r) return [];
  $rights = json_decode($r['rights'], true);
  return is_array($rights) ? $rights : [];
}

function require_right(array $user, string $right): void {
  if (!in_array($right, role_rights($user['role']), true)) {
    fail('You do not have permission for this action.', 403);
  }
}

function gen_id(string $prefix): string {
  return $prefix . bin2hex(random_bytes(6));
}

// ------------------------------------------------------------------
//  Row -> API shape mappers
// ------------------------------------------------------------------
function public_user(array $u, bool $withRights = false): array {
  $out = [
    'id'        => $u['id'],
    'name'      => $u['name'],
    'email'     => $u['email'],
    'role'      => $u['role'],
    'active'    => (int)$u['active'] === 1,
    'lastLogin' => $u['last_login'] ?? '',
    'password'  => '',                 // never expose hashes to the client
  ];
  if ($withRights) $out['rights'] = role_rights($u['role']);
  return $out;
}

function get_user(string $id): ?array {
  $st = db()->prepare('SELECT * FROM users WHERE id = ?');
  $st->execute([$id]);
  $u = $st->fetch();
  return $u ? public_user($u) : null;
}

function booking_shape(array $b, array $payments): array {
  return [
    'id'        => $b['id'],
    'ref'       => $b['ref'],
    'guest'     => $b['guest'],
    'phone'     => $b['phone'],
    'email'     => $b['email'] ?? '',
    'villa'     => $b['villa'],
    'checkIn'   => $b['check_in'],
    'checkOut'  => $b['check_out'],
    'guests'    => (int)$b['guests'],
    'status'    => $b['status'],
    'total'     => (int)$b['total'],
    'source'    => $b['source'],
    'createdAt' => $b['created_at'],
    'payments'  => array_map(fn($p) => [
      'id' => $p['id'], 'date' => $p['date'], 'amount' => (int)$p['amount'], 'kind' => $p['kind'],
    ], $payments),
  ];
}

function get_booking(string $ref): ?array {
  $st = db()->prepare('SELECT * FROM bookings WHERE ref = ?');
  $st->execute([$ref]);
  $b = $st->fetch();
  if (!$b) return null;
  $ps = db()->prepare('SELECT * FROM payments WHERE booking_ref = ? ORDER BY date ASC, id ASC');
  $ps->execute([$ref]);
  return booking_shape($b, $ps->fetchAll());
}

function bootstrap_payload(): array {
  $pdo = db();

  $bookings = $pdo->query('SELECT * FROM bookings ORDER BY created_at DESC, ref DESC')->fetchAll();
  $byRef = [];
  foreach ($pdo->query('SELECT * FROM payments ORDER BY date ASC, id ASC')->fetchAll() as $p) {
    $byRef[$p['booking_ref']][] = $p;
  }
  $bk = array_map(fn($b) => booking_shape($b, $byRef[$b['ref']] ?? []), $bookings);

  $expenses = array_map(fn($e) => [
    'id' => $e['id'], 'date' => $e['date'], 'category' => $e['category'], 'villa' => $e['villa'],
    'bookingRef' => $e['booking_ref'] ?? null, 'description' => $e['description'], 'amount' => (int)$e['amount'],
  ], $pdo->query('SELECT * FROM expenses ORDER BY date DESC, id DESC')->fetchAll());

  $users = array_map(fn($u) => public_user($u), $pdo->query('SELECT * FROM users ORDER BY id ASC')->fetchAll());

  $roles = array_map(fn($r) => [
    'id' => $r['id'], 'name' => $r['name'], 'system' => (int)$r['system'] === 1,
    'rights' => (json_decode($r['rights'], true) ?: []),
  ], $pdo->query('SELECT * FROM roles ORDER BY id ASC')->fetchAll());

  $inv = $pdo->query('SELECT * FROM invoice_settings WHERE id = 1')->fetch();
  $invoice = $inv
    ? ['prefix' => $inv['prefix'], 'next' => (int)$inv['next'], 'padding' => (int)$inv['padding'], 'terms' => $inv['terms']]
    : ['prefix' => 'KV-', 'next' => 1, 'padding' => 5, 'terms' => ''];

  $overrides = [];
  foreach ($pdo->query('SELECT * FROM room_overrides')->fetchAll() as $o) {
    $entry = [];
    if ($o['base_rate'] !== null) $entry['baseRate'] = (int)$o['base_rate'];
    if ($o['notes'] !== null)     $entry['notes'] = $o['notes'];
    $overrides[$o['villa']] = $entry;
  }

  return [
    'bookings'      => $bk,
    'expenses'      => $expenses,
    'users'         => $users,
    'roles'         => $roles,
    'invoice'       => $invoice,
    'villaOverrides' => (object)$overrides,   // force {} not [] when empty
  ];
}
