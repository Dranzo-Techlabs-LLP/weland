<?php
// ------------------------------------------------------------------
//  Weland API — one-time installer
//  1) Create tables (idempotent)
//  2) Seed roles, invoice settings and the real login accounts
//     -> NO sample bookings / payments / expenses (clean slate)
//
//  Run it EITHER way:
//    - Terminal (WHM/SSH):  php install.php          (add `fresh` to wipe first)
//                           php install.php fresh
//    - Browser:             https://welandresort.com/api/install.php?key=YOUR_INSTALL_KEY
//                           add &fresh=1 to wipe first
//  Then DELETE this file.
//
//  `fresh` DROPS the app tables first (clears ALL bookings/payments/expenses
//  and any leftover tables), then recreates them empty. Without `fresh` it is
//  non-destructive (creates only what is missing, keeps existing rows).
// ------------------------------------------------------------------
declare(strict_types=1);

namespace Weland;

require __DIR__ . '/config.php';
require __DIR__ . '/lib.php';

$isCli = (php_sapi_name() === 'cli');
if (!$isCli) {
  header('Content-Type: text/plain; charset=utf-8');
  // The browser route stays key-protected; the terminal route is trusted.
  if (INSTALL_KEY === '__SET_INSTALL_KEY__' || ($_GET['key'] ?? '') !== INSTALL_KEY) {
    http_response_code(403);
    exit("Forbidden.\nSet INSTALL_KEY in config.php, then open install.php?key=YOUR_INSTALL_KEY\n"
       . "(or just run `php install.php` from the terminal).\n");
  }
}

$fresh = $isCli
  ? in_array('fresh', array_slice($argv ?? [], 1), true)
  : (($_GET['fresh'] ?? '') === '1');

$pdo = db();

// ---------------- Optional wipe (guarantees a clean slate) ----------------
if ($fresh) {
  $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
  foreach (['sessions','payments','bookings','expenses','room_overrides','invoice_settings','users','roles'] as $t) {
    $pdo->exec("DROP TABLE IF EXISTS `$t`");
  }
  $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
  echo "Dropped existing tables (fresh start) — all bookings/payments/expenses cleared.\n";
}

// ---------------- Tables ----------------
$pdo->exec("CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(60) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  last_login DATE NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$pdo->exec("CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE,
  `system` TINYINT(1) NOT NULL DEFAULT 0,
  rights TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$pdo->exec("CREATE TABLE IF NOT EXISTS bookings (
  id VARCHAR(32) PRIMARY KEY,
  ref VARCHAR(40) NOT NULL UNIQUE,
  guest VARCHAR(160) NOT NULL,
  phone VARCHAR(40) NOT NULL DEFAULT '',
  alt_phone VARCHAR(40) NULL,
  email VARCHAR(190) NULL,
  villa VARCHAR(255) NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests INT NOT NULL DEFAULT 1,
  adults INT NOT NULL DEFAULT 0,
  kids INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL,
  total INT NOT NULL DEFAULT 0,
  source VARCHAR(30) NOT NULL DEFAULT 'Direct',
  notes TEXT NULL,
  created_at DATE NOT NULL,
  INDEX (check_in), INDEX (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$pdo->exec("CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(32) PRIMARY KEY,
  booking_ref VARCHAR(40) NOT NULL,
  date DATE NOT NULL,
  amount INT NOT NULL,
  kind VARCHAR(10) NOT NULL DEFAULT 'payment',
  method VARCHAR(20) NULL,
  reference VARCHAR(100) NULL,
  is_advance TINYINT(1) NOT NULL DEFAULT 0,
  INDEX (booking_ref)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$pdo->exec("CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(32) PRIMARY KEY,
  date DATE NOT NULL,
  category VARCHAR(60) NOT NULL,
  villa VARCHAR(60) NOT NULL DEFAULT '',
  booking_ref VARCHAR(40) NULL,
  description VARCHAR(255) NOT NULL DEFAULT '',
  amount INT NOT NULL DEFAULT 0,
  INDEX (date), INDEX (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$pdo->exec("CREATE TABLE IF NOT EXISTS room_overrides (
  villa VARCHAR(60) PRIMARY KEY,
  base_rate INT NULL,
  notes TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$pdo->exec("CREATE TABLE IF NOT EXISTS invoice_settings (
  id INT PRIMARY KEY,
  prefix VARCHAR(20) NOT NULL DEFAULT 'KV-',
  next INT NOT NULL DEFAULT 1,
  padding INT NOT NULL DEFAULT 5,
  terms TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$pdo->exec("CREATE TABLE IF NOT EXISTS sessions (
  token VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  created_at DATETIME NOT NULL,
  INDEX (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

echo "Tables ready.\n";

// ---------------- Seed roles ----------------
$roleDefaults = [
  'Administrator' => ["view_payments","record_payments","view_expenses","edit_expenses","view_accounting","view_users","manage_users","edit_invoice","view_bookings","edit_bookings","cancel_bookings","view_calendar","view_dashboard","view_reports","view_villas","edit_villas"],
  'Manager'       => ["view_dashboard","view_calendar","view_bookings","edit_bookings","cancel_bookings","view_accounting","view_expenses","edit_expenses","view_reports","view_villas","view_payments","record_payments","view_users"],
  'Front Desk'    => ["view_dashboard","view_calendar","view_bookings","edit_bookings","view_payments","record_payments","view_villas"],
  'B2B'           => ["view_dashboard","view_calendar","view_bookings","edit_bookings"],
  'Owner'         => ["view_dashboard","view_calendar","view_bookings","view_accounting","view_expenses","view_reports","view_villas","view_payments"],
];
$i = 1;
foreach ($roleDefaults as $name => $rights) {
  $pdo->prepare("INSERT INTO roles (id, name, `system`, rights) VALUES (?,?,1,?)
                 ON DUPLICATE KEY UPDATE rights = VALUES(rights), `system` = 1")
      ->execute(["r$i", $name, json_encode($rights)]);
  $i++;
}
echo "Roles seeded.\n";

// ---------------- Seed invoice settings (single row id=1) ----------------
$terms = "\xF0\x9F\x93\x9E Property Contact & Location\n"
       . "\xE2\x80\xA2  Check-in Manager: 75100 00000\n"
       . "\xE2\x80\xA2  Location Map: shared on WhatsApp after confirmation\n\n"
       . "\xF0\x9F\x95\x91 Timing & Payment\n"
       . "\xE2\x80\xA2  Check-in Time: 3:00 PM (checking in late will not extend your check-out time)\n"
       . "\xE2\x80\xA2  Check-out Time: 12:00 Noon\n\n"
       . "Payment Policy:\n"
       . "o  The complete remaining booking amount must be paid during check-in.\n"
       . "o  Advance amounts are strictly non-refundable.\n"
       . "o  Extra persons will be additionally charged.";
$pdo->prepare("INSERT INTO invoice_settings (id, prefix, next, padding, terms) VALUES (1, 'KV-', 1, 5, ?)
               ON DUPLICATE KEY UPDATE id = id")   // keep existing settings if already present
    ->execute([$terms]);
echo "Invoice settings seeded (prefix KV-, next 1, padding 5).\n";

// ---------------- Seed real login accounts ----------------
//  Existing accounts are left untouched (ON DUPLICATE ... id=id).
$seedUsers = [
  ['u1', 'Shinky',    'admin@weland.co',        'admin123',      'Administrator'],
  ['u6', 'Raheem VP', 'raheem.vp@gmail.com',    'manager123',    'Manager'],
  ['u4', 'Hasna',     'hasnaoyasis@gmail.com',  'frontdesk123',  'Front Desk'],
];
foreach ($seedUsers as [$id, $name, $email, $pw, $role]) {
  $pdo->prepare("INSERT INTO users (id, name, email, password_hash, role, active, last_login)
                 VALUES (?,?,?,?,?,1,NULL) ON DUPLICATE KEY UPDATE id = id")
      ->execute([$id, $name, strtolower($email), password_hash($pw, PASSWORD_DEFAULT), $role]);
}
echo "Login accounts seeded:\n";
echo "  admin@weland.co / admin123        (Administrator)\n";
echo "  raheem.vp@gmail.com / manager123  (Manager)\n";
echo "  hasnaoyasis@gmail.com / frontdesk123 (Front Desk)\n";

echo "\nNo sample bookings, payments or expenses were created \xE2\x80\x94 clean slate.\n";
echo "\nDONE. Now DELETE this install.php file for security.\n";
