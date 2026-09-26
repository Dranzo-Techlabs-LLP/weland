<?php
// ------------------------------------------------------------------
//  Weland API — shared helpers: DB connection, auth, JSON output and
//  the row -> API shape mappers. Used by index.php and install.php.
//
//  This file ships with every release. config.php does not (it stays
//  on the server and holds only settings), so all code lives here.
//  Namespaced so an older config.php that still defines these
//  functions can't clash with them.
// ------------------------------------------------------------------
declare(strict_types=1);

namespace Weland;

use PDO;

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

function role_exists(string $name): bool {
  $st = db()->prepare('SELECT 1 FROM roles WHERE name = ? LIMIT 1');
  $st->execute([$name]);
  return (bool)$st->fetch();
}

/** True when an active user other than $exceptId can still manage users, so nobody gets locked out. */
function other_user_manager_exists(string $exceptId): bool {
  $st = db()->prepare('SELECT role FROM users WHERE active = 1 AND id <> ?');
  $st->execute([$exceptId]);
  foreach ($st->fetchAll() as $u) {
    if (in_array('manage_users', role_rights($u['role']), true)) return true;
  }
  return false;
}

function gen_id(string $prefix): string {
  return $prefix . bin2hex(random_bytes(6));
}

/** First room of a booking's villa value ("A1, B1" -> "A1"), or "Full Property". */
function primary_room(string $villa): string {
  if ($villa === 'Full Property') return 'Full Property';
  foreach (explode(',', $villa) as $r) {
    $r = trim($r);
    if ($r !== '') return $r;
  }
  return $villa;
}

/** Create/update/remove the single B2B-commission expense linked to a booking. */
function sync_b2b_expense(string $ref, string $villa, int $commission): void {
  $pdo = db();
  $st = $pdo->prepare("SELECT id FROM expenses WHERE booking_ref = ? AND category = 'B2B Commission' LIMIT 1");
  $st->execute([$ref]);
  $existing = $st->fetch();
  if ($commission > 0) {
    $room = primary_room($villa);
    if ($existing) {
      $pdo->prepare('UPDATE expenses SET villa = ?, amount = ? WHERE id = ?')->execute([$room, $commission, $existing['id']]);
    } else {
      $pdo->prepare("INSERT INTO expenses (id, date, category, villa, booking_ref, description, amount)
                     VALUES (?, CURDATE(), 'B2B Commission', ?, ?, ?, ?)")
          ->execute([gen_id('e'), $room, $ref, "B2B commission · $ref", $commission]);
    }
  } elseif ($existing) {
    $pdo->prepare('DELETE FROM expenses WHERE id = ?')->execute([$existing['id']]);
  }
}

/** Create/update/remove the single advance payment of a booking (the one entered while booking). */
function sync_advance(string $ref, int $amount, string $method): void {
  $pdo = db();
  $st = $pdo->prepare('SELECT id FROM payments WHERE booking_ref = ? AND is_advance = 1 ORDER BY date ASC, id ASC LIMIT 1');
  $st->execute([$ref]);
  $existing = $st->fetch();
  if ($amount > 0) {
    if ($existing) {
      $pdo->prepare('UPDATE payments SET amount = ?, method = ? WHERE id = ?')->execute([$amount, $method ?: null, $existing['id']]);
    } else {
      $pdo->prepare("INSERT INTO payments (id, booking_ref, date, amount, kind, method, reference, is_advance)
                     VALUES (?, ?, CURDATE(), ?, 'payment', ?, NULL, 1)")
          ->execute([gen_id('p'), $ref, $amount, $method ?: null]);
    }
  } elseif ($existing) {
    $pdo->prepare('DELETE FROM payments WHERE id = ?')->execute([$existing['id']]);
  }
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
    'villa'     => $u['villa'] ?? '',     // room(s) the user looks after, "" = not assigned
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
    'altPhone'  => $b['alt_phone'] ?? '',
    'email'     => $b['email'] ?? '',
    'villa'     => $b['villa'],
    'checkIn'   => $b['check_in'],
    'checkOut'  => $b['check_out'],
    'guests'    => (int)$b['guests'],
    'adults'    => isset($b['adults']) && $b['adults'] !== null ? (int)$b['adults'] : (int)$b['guests'],
    'kids'      => isset($b['kids']) && $b['kids'] !== null ? (int)$b['kids'] : 0,
    'status'    => $b['status'],
    'total'     => (int)$b['total'],
    'source'    => $b['source'],
    'notes'     => $b['notes'] ?? '',
    'createdAt' => $b['created_at'],
    'payments'  => array_map(fn($p) => [
      'id' => $p['id'], 'date' => $p['date'], 'amount' => (int)$p['amount'], 'kind' => $p['kind'], 'method' => $p['method'] ?? '', 'reference' => $p['reference'] ?? '',
      'advance' => (int)($p['is_advance'] ?? 0) === 1,
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
