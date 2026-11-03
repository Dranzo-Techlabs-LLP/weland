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

/** Rooms whose capacity can be changed on the Rooms page (editableCapacity in src/lib/config.ts). */
const CAPACITY_ROOMS = ['Party Hall'];

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

/** The invoice_settings row as the app sees it (the show_* options are false before the migration). */
function public_invoice(array $inv): array {
  return [
    'prefix' => $inv['prefix'], 'next' => (int)$inv['next'], 'padding' => (int)$inv['padding'], 'terms' => $inv['terms'],
    'showPayments' => (int)($inv['show_payments'] ?? 0) === 1,
    'showB2b'      => (int)($inv['show_b2b'] ?? 0) === 1,
  ];
}

/** A room_overrides row as the app sees it (unset values are left out). */
function public_override(array $o): array {
  $entry = [];
  if (($o['base_rate'] ?? null) !== null)  $entry['baseRate'] = (int)$o['base_rate'];
  if (($o['notes'] ?? null) !== null)      $entry['notes'] = $o['notes'];
  if (($o['min_guests'] ?? null) !== null) $entry['minGuests'] = (int)$o['min_guests'];
  if (($o['max_guests'] ?? null) !== null) $entry['maxGuests'] = (int)$o['max_guests'];
  return $entry;
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

// ---------------------------------------------------------------- cash deposits
const DEPOSIT_METHODS = ['Bank', 'UPI', 'Cash'];
const DEPOSIT_MAX_BYTES = 5 * 1024 * 1024; // 5 MB per attachment
/** Allowed attachment types (checked from the file's first bytes, not its name) => stored extension. */
const DEPOSIT_FILE_TYPES = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'application/pdf' => 'pdf'];

function has_right(array $user, string $right): bool {
  return in_array($right, role_rights($user['role']), true);
}

/** A cash_deposits row as the app sees it (the stored file path never leaves the server). */
function deposit_shape(array $d): array {
  $has = ($d['file_path'] ?? '') !== '' && $d['file_path'] !== null;
  return [
    'id' => $d['id'], 'date' => $d['date'], 'amount' => (int)$d['amount'], 'method' => $d['method'],
    'note' => (string)($d['note'] ?? ''),
    'attachment' => $has ? ['name' => (string)$d['file_name'], 'type' => (string)$d['file_type'], 'size' => (int)$d['file_size']] : null,
    'createdBy' => (string)($d['created_by'] ?? ''),
    'createdAt' => $d['created_at'] ?? null,
  ];
}

/** Deposits for the app; empty before the migration has created the table. */
function deposits_list(): array {
  try {
    $rows = db()->query('SELECT * FROM cash_deposits ORDER BY date DESC, created_at DESC, id DESC')->fetchAll();
  } catch (\PDOException $e) {
    return [];
  }
  return array_map(fn($d) => deposit_shape($d), $rows);
}

/** Folder for deposit attachments: outside the public web folder (next to public_html), or UPLOAD_DIR from config.php. */
function deposit_upload_dir(): string {
  $base = defined('UPLOAD_DIR') ? rtrim((string)constant('UPLOAD_DIR'), '/\\') : dirname(__DIR__, 2) . '/weland_uploads';
  $dir = $base . '/deposits';
  if (!is_dir($dir) && !@mkdir($dir, 0750, true) && !is_dir($dir)) {
    fail('The server could not create the folder for attachments.', 500);
  }
  return $dir;
}

/** The real type of a file from its first bytes (null when it isn't an allowed type). */
function sniff_file_type(string $path): ?string {
  $h = @fopen($path, 'rb');
  if (!$h) return null;
  $head = (string)fread($h, 16);
  fclose($h);
  if (strncmp($head, "%PDF", 4) === 0) return 'application/pdf';
  if (strncmp($head, "\xFF\xD8\xFF", 3) === 0) return 'image/jpeg';
  if (strncmp($head, "\x89PNG\r\n\x1A\n", 8) === 0) return 'image/png';
  if (strncmp($head, 'RIFF', 4) === 0 && substr($head, 8, 4) === 'WEBP') return 'image/webp';
  return null;
}

/** "1M", "512K", "8G" from php.ini in bytes. */
function ini_bytes(string $v): int {
  $v = trim($v);
  if ($v === '') return 0;
  $n = (int)$v;
  switch (strtolower(substr($v, -1))) {
    case 'g': return $n * 1024 * 1024 * 1024;
    case 'm': return $n * 1024 * 1024;
    case 'k': return $n * 1024;
  }
  return $n;
}

/** The attachment sent as "file", checked; null when no file was sent. */
function deposit_upload(): ?array {
  $f = $_FILES['file'] ?? null;
  if (!$f || ($f['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) return null;
  if (is_array($f['error'])) fail('Attach one file only.');
  if ($f['error'] === UPLOAD_ERR_INI_SIZE || $f['error'] === UPLOAD_ERR_FORM_SIZE) {
    fail('The file is too large for the server. Keep it under ' . ini_get('upload_max_filesize') . 'B.', 413);
  }
  if ($f['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) fail('The file could not be uploaded. Please try again.');
  if ((int)$f['size'] > DEPOSIT_MAX_BYTES) fail('The file is too large. The limit is 5 MB.', 413);
  $type = sniff_file_type($f['tmp_name']);
  if ($type === null) fail('Attach a photo (JPG, PNG or WebP) or a PDF.');
  $name = preg_replace('/[\x00-\x1F\x7F\\\\\/:*?"<>|]+/', '_', basename((string)$f['name']));
  $name = trim($name) !== '' ? $name : 'attachment.' . DEPOSIT_FILE_TYPES[$type];
  if (function_exists('mb_substr')) $name = mb_substr($name, 0, 150);
  return ['tmp' => $f['tmp_name'], 'name' => $name, 'type' => $type, 'size' => (int)$f['size'], 'ext' => DEPOSIT_FILE_TYPES[$type]];
}

/** Date, amount, method and note of a deposit, checked. $cur fills fields that weren't sent (edit). */
function deposit_fields(array $in, ?array $cur = null): array {
  $date = array_key_exists('date', $in) ? trim((string)$in['date']) : (string)($cur['date'] ?? '');
  if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $date, $m) || !checkdate((int)$m[2], (int)$m[3], (int)$m[1])) fail('Enter the date the money was deposited.');
  $amountRaw = array_key_exists('amount', $in) ? trim((string)$in['amount']) : (string)($cur['amount'] ?? '');
  if (!preg_match('/^\d{1,9}$/', $amountRaw) || (int)$amountRaw < 1 || (int)$amountRaw > 100000000) fail('Enter the amount in whole rupees (at least ₹1).');
  $method = array_key_exists('method', $in) ? trim((string)$in['method']) : (string)($cur['method'] ?? '');
  if (!in_array($method, DEPOSIT_METHODS, true)) fail('Choose how it was deposited: Bank, UPI or Cash.');
  $note = array_key_exists('note', $in) ? trim((string)$in['note']) : (string)($cur['note'] ?? '');
  $len = function_exists('mb_strlen') ? mb_strlen($note) : strlen($note);
  if ($len > 1000) fail('Keep the note under 1,000 characters.');
  return ['date' => $date, 'amount' => (int)$amountRaw, 'method' => $method, 'note' => $note];
}

/** Form fields of a deposit request: multipart (with a file) or JSON. Detects a body PHP dropped for being too large. */
function deposit_input(): array {
  $len = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
  $max = ini_bytes((string)ini_get('post_max_size'));
  if ($len > 0 && $max > 0 && $len > $max && empty($_POST) && empty($_FILES)) {
    fail('The file is too large for the server. Keep it under ' . ini_get('post_max_size') . 'B.', 413);
  }
  return $_POST ?: body();
}

/** An expenses row as the app sees it. */
function expense_shape(array $e): array {
  return [
    'id' => $e['id'], 'date' => $e['date'], 'category' => $e['category'], 'villa' => $e['villa'],
    'bookingRef' => $e['booking_ref'] ?? null, 'description' => $e['description'], 'amount' => (int)$e['amount'],
    'external' => (int)($e['external'] ?? 0) === 1, // B2B commission collected externally (false before the migration)
  ];
}

/** An expense's category and linked booking as they are stored: "B2B Commission" in any letter case
 *  becomes that exact name, and a ref that matches a booking (in any case) becomes the booking's own
 *  ref, so the booking page finds it. */
function normalize_expense_link(array $row): array {
  if (is_string($row['category']) && strcasecmp(trim($row['category']), 'B2B Commission') === 0) {
    $row['category'] = 'B2B Commission';
  }
  if ($row['bookingRef'] !== null) {
    $ref = trim((string)$row['bookingRef']);
    $st = db()->prepare('SELECT ref FROM bookings WHERE ref = ?');
    $st->execute([$ref]);
    $found = $st->fetch();
    $row['bookingRef'] = $found ? $found['ref'] : ($ref !== '' ? $ref : null);
  }
  return $row;
}

/** The B2B commission field of older admin versions' New / Edit booking form: create, change or
 *  remove (at 0) the booking's B2B expense. A booking can now have several B2B entries (added with
 *  Expense on the booking page); then they're left as they are, so none is overwritten or lost.
 *  $ref must be the booking's own ref. */
function sync_b2b_expense(string $ref, string $villa, int $commission): void {
  $pdo = db();
  $st = $pdo->prepare("SELECT id FROM expenses WHERE booking_ref = ? AND category = 'B2B Commission'");
  $st->execute([$ref]);
  $rows = $st->fetchAll();
  if (count($rows) > 1) return;
  $existing = $rows[0] ?? null;
  if ($commission > 0) {
    $room = primary_room($villa);
    if ($existing) {
      $pdo->prepare("UPDATE expenses SET booking_ref = ?, category = 'B2B Commission', villa = ?, amount = ? WHERE id = ?")
          ->execute([$ref, $room, $commission, $existing['id']]);
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

function bootstrap_payload(array $me): array {
  $pdo = db();

  $bookings = $pdo->query('SELECT * FROM bookings ORDER BY created_at DESC, ref DESC')->fetchAll();
  $byRef = [];
  foreach ($pdo->query('SELECT * FROM payments ORDER BY date ASC, id ASC')->fetchAll() as $p) {
    $byRef[$p['booking_ref']][] = $p;
  }
  $bk = array_map(fn($b) => booking_shape($b, $byRef[$b['ref']] ?? []), $bookings);

  $expenses = array_map(fn($e) => expense_shape($e), $pdo->query('SELECT * FROM expenses ORDER BY date DESC, id DESC')->fetchAll());

  $users = array_map(fn($u) => public_user($u), $pdo->query('SELECT * FROM users ORDER BY id ASC')->fetchAll());

  $roles = array_map(fn($r) => [
    'id' => $r['id'], 'name' => $r['name'], 'system' => (int)$r['system'] === 1,
    'rights' => (json_decode($r['rights'], true) ?: []),
  ], $pdo->query('SELECT * FROM roles ORDER BY id ASC')->fetchAll());

  $inv = $pdo->query('SELECT * FROM invoice_settings WHERE id = 1')->fetch();
  $invoice = $inv
    ? public_invoice($inv)
    : ['prefix' => 'KV-', 'next' => 1, 'padding' => 5, 'terms' => '', 'showPayments' => false, 'showB2b' => false];

  $overrides = [];
  foreach ($pdo->query('SELECT * FROM room_overrides')->fetchAll() as $o) {
    $overrides[$o['villa']] = public_override($o);
  }

  return [
    'bookings'      => $bk,
    'expenses'      => $expenses,
    'users'         => $users,
    'roles'         => $roles,
    'invoice'       => $invoice,
    'villaOverrides' => (object)$overrides,   // force {} not [] when empty
    // cash deposits only for those allowed to see them
    'deposits'      => has_right($me, 'view_deposits') ? deposits_list() : [],
  ];
}
