-- ==================================================================
--  Weland — full setup for phpMyAdmin
--  Paste ALL of this into: phpMyAdmin > (select) weland > SQL tab > Go
--  Safe to run more than once (it drops & recreates the app tables).
--  Seeds roles, invoice settings and the 3 login accounts.
--  NO bookings / payments / expenses -> clean slate for your clients.
-- ==================================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS sessions, payments, bookings, expenses, room_overrides, invoice_settings, users, roles;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(60) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  last_login DATE NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE roles (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE,
  `system` TINYINT(1) NOT NULL DEFAULT 0,   -- SYSTEM is reserved in MySQL 8 -> backticked
  rights TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE bookings (
  id VARCHAR(32) PRIMARY KEY,
  ref VARCHAR(40) NOT NULL UNIQUE,
  guest VARCHAR(160) NOT NULL,
  phone VARCHAR(40) NOT NULL DEFAULT '',
  email VARCHAR(190) NULL,
  villa VARCHAR(60) NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests INT NOT NULL DEFAULT 1,
  status VARCHAR(20) NOT NULL,
  total INT NOT NULL DEFAULT 0,
  source VARCHAR(30) NOT NULL DEFAULT 'Direct',
  created_at DATE NOT NULL,
  INDEX (check_in), INDEX (villa), INDEX (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE payments (
  id VARCHAR(32) PRIMARY KEY,
  booking_ref VARCHAR(40) NOT NULL,
  date DATE NOT NULL,
  amount INT NOT NULL,
  kind VARCHAR(10) NOT NULL DEFAULT 'payment',
  INDEX (booking_ref)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE expenses (
  id VARCHAR(32) PRIMARY KEY,
  date DATE NOT NULL,
  category VARCHAR(60) NOT NULL,
  villa VARCHAR(60) NOT NULL DEFAULT '',
  booking_ref VARCHAR(40) NULL,
  description VARCHAR(255) NOT NULL DEFAULT '',
  amount INT NOT NULL DEFAULT 0,
  INDEX (date), INDEX (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE room_overrides (
  villa VARCHAR(60) PRIMARY KEY,
  base_rate INT NULL,
  notes TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE invoice_settings (
  id INT PRIMARY KEY,
  prefix VARCHAR(20) NOT NULL DEFAULT 'KV-',
  next INT NOT NULL DEFAULT 1,
  padding INT NOT NULL DEFAULT 5,
  terms TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE sessions (
  token VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  created_at DATETIME NOT NULL,
  INDEX (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---- Roles (rights stored as a JSON array) ----
INSERT INTO roles (id, name, `system`, rights) VALUES
('r1','Administrator',1,'["view_payments","record_payments","view_expenses","edit_expenses","view_accounting","view_users","manage_users","edit_invoice","view_bookings","edit_bookings","cancel_bookings","view_calendar","view_dashboard","view_reports","view_villas","edit_villas"]'),
('r2','Manager',1,'["view_dashboard","view_calendar","view_bookings","edit_bookings","cancel_bookings","view_accounting","view_expenses","edit_expenses","view_reports","view_villas","view_payments","record_payments","view_users"]'),
('r3','Front Desk',1,'["view_dashboard","view_calendar","view_bookings","edit_bookings","view_payments","record_payments","view_villas"]'),
('r4','B2B',1,'["view_dashboard","view_calendar","view_bookings","edit_bookings"]'),
('r5','Owner',1,'["view_dashboard","view_calendar","view_bookings","view_accounting","view_expenses","view_reports","view_villas","view_payments"]');

-- ---- Invoice settings (single row, id = 1) ----
INSERT INTO invoice_settings (id, prefix, next, padding, terms) VALUES
(1,'KV-',1,5,'Check-in Time: 3:00 PM. Check-out Time: 12:00 Noon.\nThe complete remaining booking amount must be paid during check-in.\nAdvance amounts are strictly non-refundable.\nExtra persons will be additionally charged.');

-- ---- Login accounts (bcrypt password hashes) ----
--   admin@weland.co        / admin123        (Administrator)
--   raheem.vp@gmail.com    / manager123      (Manager)
--   hasnaoyasis@gmail.com  / frontdesk123    (Front Desk)
INSERT INTO users (id, name, email, password_hash, role, active, last_login) VALUES
('u1','Shinky','admin@weland.co','$2b$10$MDgDjuEghq40gPksS15b6ejK9yoQuyLM.usoX2NxIcj4R7UlQkVl.','Administrator',1,NULL),
('u6','Raheem VP','raheem.vp@gmail.com','$2b$10$6Zr6hoPLOThH.EAGS/V2H..y4FPWRrcog4r3L4SSSdDm1cEYiPtKa','Manager',1,NULL),
('u4','Hasna','hasnaoyasis@gmail.com','$2b$10$HX9HdefA4DeE/eIlvjIx.uQy0ZC9fKtqIXknMdMHJao7wkyYY28Vm','Front Desk',1,NULL);
