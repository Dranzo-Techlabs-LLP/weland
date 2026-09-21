<?php
// ------------------------------------------------------------------
//  Weland API — front controller / router
//  All /api/* requests land here (see .htaccess).
// ------------------------------------------------------------------
declare(strict_types=1);
require __DIR__ . '/config.php';
cors();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Path after ".../api/" -> e.g. "bookings/KV-00001/payments"
$uri  = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
$uri  = preg_replace('#^.*?/api/?#', '', $uri);
$path = trim((string)$uri, '/');
$seg  = $path === '' ? [] : explode('/', $path);

try {
  // ---------- Public: login ----------
  if ($method === 'POST' && $path === 'login') {
    $b = body();
    $email = strtolower(trim($b['email'] ?? ''));
    $password = (string)($b['password'] ?? '');
    $st = db()->prepare('SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1');
    $st->execute([$email]);
    $u = $st->fetch();
    if (!$u || !password_verify($password, $u['password_hash'])) fail('Incorrect email or password.', 401);
    if ((int)$u['active'] !== 1) fail('This account is inactive.', 403);
    $token = bin2hex(random_bytes(32));
    db()->prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, NOW())')->execute([$token, $u['id']]);
    db()->prepare('UPDATE users SET last_login = CURDATE() WHERE id = ?')->execute([$u['id']]);
    json_out(['token' => $token, 'user' => public_user($u, true)]);
  }

  // ---------- Everything below requires a valid session ----------
  $me = require_user();

  if ($method === 'GET' && $path === 'me') {
    json_out(['user' => public_user($me, true)]);
  }

  if ($method === 'POST' && $path === 'logout') {
    $t = bearer_token();
    if ($t) db()->prepare('DELETE FROM sessions WHERE token = ?')->execute([$t]);
    json_out(['ok' => true]);
  }

  if ($method === 'GET' && $path === 'bootstrap') {
    json_out(bootstrap_payload());
  }

  // ---------- Bookings ----------
  if ($method === 'POST' && $path === 'bookings') {
    require_right($me, 'edit_bookings');
    $b = body();
    $pdo = db();
    $pdo->beginTransaction();
    $inv = $pdo->query('SELECT * FROM invoice_settings WHERE id = 1 FOR UPDATE')->fetch();
    $ref = $inv['prefix'] . str_pad((string)$inv['next'], (int)$inv['padding'], '0', STR_PAD_LEFT);
    $pdo->prepare('UPDATE invoice_settings SET next = next + 1 WHERE id = 1')->execute();
    $id = gen_id('b');
    $pdo->prepare('INSERT INTO bookings (id, ref, guest, phone, email, villa, check_in, check_out, guests, status, total, source, created_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,CURDATE())')
        ->execute([
          $id, $ref, $b['guest'] ?? '', $b['phone'] ?? '', ($b['email'] ?? '') ?: null, $b['villa'] ?? '',
          $b['checkIn'] ?? null, $b['checkOut'] ?? null, (int)($b['guests'] ?? 1),
          $b['status'] ?? 'confirmed', (int)round((float)($b['total'] ?? 0)), $b['source'] ?? 'Direct',
        ]);
    if (!empty($b['advance'])) {
      $pdo->prepare('INSERT INTO payments (id, booking_ref, date, amount, kind) VALUES (?,?,CURDATE(),?,\'payment\')')
          ->execute([gen_id('p'), $ref, (int)round((float)$b['advance'])]);
    }
    $pdo->commit();
    json_out(['ref' => $ref, 'booking' => get_booking($ref)], 201);
  }

  if ($method === 'PATCH' && count($seg) === 2 && $seg[0] === 'bookings') {
    $ref = $seg[1];
    $b = body();
    if (isset($b['status'])) {
      require_right($me, $b['status'] === 'cancelled' ? 'cancel_bookings' : 'edit_bookings');
      db()->prepare('UPDATE bookings SET status = ? WHERE ref = ?')->execute([$b['status'], $ref]);
    }
    json_out(['booking' => get_booking($ref)]);
  }

  // Full edit of a booking's details
  if ($method === 'PUT' && count($seg) === 2 && $seg[0] === 'bookings') {
    require_right($me, 'edit_bookings');
    $ref = $seg[1];
    $b = body();
    $exists = db()->prepare('SELECT ref FROM bookings WHERE ref = ?');
    $exists->execute([$ref]);
    if (!$exists->fetch()) fail('Booking not found.', 404);
    if (($b['status'] ?? '') === 'cancelled') require_right($me, 'cancel_bookings');
    db()->prepare('UPDATE bookings SET guest=?, phone=?, email=?, villa=?, check_in=?, check_out=?, guests=?, status=?, total=?, source=? WHERE ref=?')
        ->execute([
          $b['guest'] ?? '', $b['phone'] ?? '', ($b['email'] ?? '') ?: null, $b['villa'] ?? '',
          $b['checkIn'] ?? null, $b['checkOut'] ?? null, (int)($b['guests'] ?? 1),
          $b['status'] ?? 'confirmed', (int)round((float)($b['total'] ?? 0)), $b['source'] ?? 'Direct', $ref,
        ]);
    json_out(['booking' => get_booking($ref)]);
  }

  // Permanently delete a booking (and its payments)
  if ($method === 'DELETE' && count($seg) === 2 && $seg[0] === 'bookings') {
    require_right($me, 'cancel_bookings');
    $ref = $seg[1];
    $pdo = db();
    $pdo->beginTransaction();
    $pdo->prepare('DELETE FROM payments WHERE booking_ref = ?')->execute([$ref]);
    $pdo->prepare('DELETE FROM bookings WHERE ref = ?')->execute([$ref]);
    $pdo->commit();
    json_out(['ok' => true]);
  }

  if ($method === 'POST' && count($seg) === 3 && $seg[0] === 'bookings' && $seg[2] === 'payments') {
    require_right($me, 'record_payments');
    $ref = $seg[1];
    $b = body();
    $kind = ($b['kind'] ?? 'payment') === 'refund' ? 'refund' : 'payment';
    db()->prepare('INSERT INTO payments (id, booking_ref, date, amount, kind) VALUES (?,?,?,?,?)')
        ->execute([gen_id('p'), $ref, $b['date'] ?? date('Y-m-d'), (int)round((float)($b['amount'] ?? 0)), $kind]);
    json_out(['booking' => get_booking($ref)], 201);
  }

  // ---------- Expenses ----------
  if ($method === 'POST' && $path === 'expenses') {
    require_right($me, 'edit_expenses');
    $b = body();
    $id = gen_id('e');
    $row = [
      'id' => $id, 'date' => $b['date'] ?? date('Y-m-d'), 'category' => $b['category'] ?? 'Misc',
      'villa' => $b['villa'] ?? '', 'bookingRef' => ($b['bookingRef'] ?? '') ?: null,
      'description' => $b['description'] ?? '', 'amount' => (int)round((float)($b['amount'] ?? 0)),
    ];
    db()->prepare('INSERT INTO expenses (id, date, category, villa, booking_ref, description, amount) VALUES (?,?,?,?,?,?,?)')
        ->execute([$row['id'], $row['date'], $row['category'], $row['villa'], $row['bookingRef'], $row['description'], $row['amount']]);
    json_out(['expense' => $row], 201);
  }

  if ($method === 'DELETE' && count($seg) === 2 && $seg[0] === 'expenses') {
    require_right($me, 'edit_expenses');
    db()->prepare('DELETE FROM expenses WHERE id = ?')->execute([$seg[1]]);
    json_out(['ok' => true]);
  }

  // ---------- Users ----------
  if ($method === 'POST' && $path === 'users') {
    require_right($me, 'manage_users');
    $b = body();
    $email = strtolower(trim($b['email'] ?? ''));
    if ($email === '') fail('Email is required.');
    $exists = db()->prepare('SELECT id FROM users WHERE LOWER(email) = ?');
    $exists->execute([$email]);
    if ($exists->fetch()) fail('A user with that email already exists.');
    $id = gen_id('u');
    $hash = password_hash(($b['password'] ?? '') !== '' ? $b['password'] : 'changeme', PASSWORD_DEFAULT);
    db()->prepare('INSERT INTO users (id, name, email, password_hash, role, active, last_login) VALUES (?,?,?,?,?,?,NULL)')
        ->execute([$id, $b['name'] ?? '', $email, $hash, $b['role'] ?? 'Front Desk', array_key_exists('active', $b) ? (int)!!$b['active'] : 1]);
    json_out(['user' => get_user($id)], 201);
  }

  if ($method === 'PATCH' && count($seg) === 2 && $seg[0] === 'users') {
    require_right($me, 'manage_users');
    $b = body();
    if (isset($b['active'])) db()->prepare('UPDATE users SET active = ? WHERE id = ?')->execute([(int)!!$b['active'], $seg[1]]);
    if (isset($b['password']) && $b['password'] !== '') {
      db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([password_hash($b['password'], PASSWORD_DEFAULT), $seg[1]]);
    }
    json_out(['user' => get_user($seg[1])]);
  }

  // ---------- Roles ----------
  if ($method === 'POST' && $path === 'roles') {
    require_right($me, 'manage_users');
    $b = body();
    $id = gen_id('r');
    $name = trim($b['name'] ?? '') ?: 'New role';
    db()->prepare('INSERT INTO roles (id, name, `system`, rights) VALUES (?,?,0,?)')->execute([$id, $name, json_encode([])]);
    json_out(['role' => ['id' => $id, 'name' => $name, 'system' => false, 'rights' => []]], 201);
  }

  if ($method === 'PATCH' && count($seg) === 2 && $seg[0] === 'roles') {
    require_right($me, 'manage_users');
    $b = body();
    $rights = is_array($b['rights'] ?? null) ? array_values($b['rights']) : [];
    db()->prepare('UPDATE roles SET rights = ? WHERE id = ?')->execute([json_encode($rights), $seg[1]]);
    json_out(['ok' => true]);
  }

  // ---------- Invoice settings ----------
  if ($method === 'PUT' && $path === 'invoice') {
    require_right($me, 'edit_invoice');
    $b = body();
    $cur = db()->query('SELECT * FROM invoice_settings WHERE id = 1')->fetch();
    $prefix  = $b['prefix']  ?? $cur['prefix'];
    $next    = isset($b['next'])    ? (int)$b['next']    : (int)$cur['next'];
    $padding = isset($b['padding']) ? (int)$b['padding'] : (int)$cur['padding'];
    $terms   = $b['terms']   ?? $cur['terms'];
    db()->prepare('UPDATE invoice_settings SET prefix=?, next=?, padding=?, terms=? WHERE id=1')
        ->execute([$prefix, $next, $padding, $terms]);
    json_out(['invoice' => ['prefix' => $prefix, 'next' => $next, 'padding' => $padding, 'terms' => $terms]]);
  }

  // ---------- Room overrides (base rate / notes) ----------
  if ($method === 'PUT' && count($seg) === 3 && $seg[0] === 'rooms' && $seg[2] === 'override') {
    require_right($me, 'edit_villas');
    $name = urldecode($seg[1]);
    $b = body();
    $rate  = array_key_exists('baseRate', $b) ? (int)$b['baseRate'] : null;
    $notes = array_key_exists('notes', $b) ? $b['notes'] : null;
    db()->prepare('INSERT INTO room_overrides (villa, base_rate, notes) VALUES (?,?,?)
                   ON DUPLICATE KEY UPDATE base_rate = VALUES(base_rate), notes = VALUES(notes)')
        ->execute([$name, $rate, $notes]);
    json_out(['ok' => true]);
  }

  fail("Not found: $method /$path", 404);
} catch (Throwable $e) {
  fail('Server error: ' . $e->getMessage(), 500);
}
