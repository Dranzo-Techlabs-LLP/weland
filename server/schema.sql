-- ------------------------------------------------------------------
--  Weland — MySQL schema (reference)
--  You do NOT need to run this by hand: api/install.php creates these
--  tables and seeds roles/invoice/users for you. This file is kept as
--  documentation and as a manual fallback for phpMyAdmin.
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(60) NOT NULL,
  villa VARCHAR(255) NULL,          -- room(s) the user looks after (optional)
  active TINYINT(1) NOT NULL DEFAULT 1,
  last_login DATE NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE,
  `system` TINYINT(1) NOT NULL DEFAULT 0,   -- backticked: SYSTEM is a reserved word in MySQL 8
  rights TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bookings (
  id VARCHAR(32) PRIMARY KEY,
  ref VARCHAR(40) NOT NULL UNIQUE,
  guest VARCHAR(160) NOT NULL,
  phone VARCHAR(40) NOT NULL DEFAULT '',
  alt_phone VARCHAR(40) NULL,
  email VARCHAR(190) NULL,
  villa VARCHAR(255) NOT NULL,   -- one room, a comma list ("A1, B1"), or "Full Property"
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests INT NOT NULL DEFAULT 1, -- total = adults + kids
  adults INT NOT NULL DEFAULT 0,
  kids INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL,
  total INT NOT NULL DEFAULT 0,
  source VARCHAR(30) NOT NULL DEFAULT 'Direct',
  notes TEXT NULL,
  created_at DATE NOT NULL,
  INDEX (check_in), INDEX (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(32) PRIMARY KEY,
  booking_ref VARCHAR(40) NOT NULL,
  date DATE NOT NULL,
  amount INT NOT NULL,
  kind VARCHAR(10) NOT NULL DEFAULT 'payment',
  method VARCHAR(20) NULL,
  reference VARCHAR(100) NULL,
  is_advance TINYINT(1) NOT NULL DEFAULT 0,
  INDEX (booking_ref)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(32) PRIMARY KEY,
  date DATE NOT NULL,
  category VARCHAR(60) NOT NULL,
  villa VARCHAR(60) NOT NULL DEFAULT '',
  booking_ref VARCHAR(40) NULL,
  description VARCHAR(255) NOT NULL DEFAULT '',
  amount INT NOT NULL DEFAULT 0,
  INDEX (date), INDEX (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS room_overrides (
  villa VARCHAR(60) PRIMARY KEY,
  base_rate INT NULL,
  notes TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS invoice_settings (
  id INT PRIMARY KEY,
  prefix VARCHAR(20) NOT NULL DEFAULT 'KV-',
  next INT NOT NULL DEFAULT 1,
  padding INT NOT NULL DEFAULT 5,
  terms TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sessions (
  token VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  created_at DATETIME NOT NULL,
  INDEX (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- To wipe ONLY the transactional entries (keep rooms/users/roles/invoice):
--   DELETE FROM payments;
--   DELETE FROM bookings;
--   DELETE FROM expenses;
