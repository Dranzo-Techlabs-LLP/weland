-- ==================================================================
--  Weland — database update for the booking features
--  (several rooms / Full Property, adults + kids, notes, alternate
--   mobile, payment method + reference, advance payment) and the
--  user's room
--
--  phpMyAdmin → click the "weland" database → SQL tab → paste all of
--  this → Go.
--  Safe to run more than once: each step only adds what's missing, and
--  existing data is kept.
-- ==================================================================

-- Rooms: one room, several ("A1, B1") or "Full Property"
ALTER TABLE bookings MODIFY villa VARCHAR(255) NOT NULL;

-- Adults (existing bookings: everyone counted as an adult)
SET @add = (SELECT COUNT(*) = 0 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'adults');
SET @sql = IF(@add, 'ALTER TABLE bookings ADD COLUMN adults INT NOT NULL DEFAULT 0 AFTER guests', 'DO 0');
PREPARE step FROM @sql; EXECUTE step; DEALLOCATE PREPARE step;
SET @sql = IF(@add, 'UPDATE bookings SET adults = guests', 'DO 0');
PREPARE step FROM @sql; EXECUTE step; DEALLOCATE PREPARE step;

-- Kids
SET @add = (SELECT COUNT(*) = 0 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'kids');
SET @sql = IF(@add, 'ALTER TABLE bookings ADD COLUMN kids INT NOT NULL DEFAULT 0 AFTER adults', 'DO 0');
PREPARE step FROM @sql; EXECUTE step; DEALLOCATE PREPARE step;

-- Notes
SET @add = (SELECT COUNT(*) = 0 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'notes');
SET @sql = IF(@add, 'ALTER TABLE bookings ADD COLUMN notes TEXT NULL AFTER source', 'DO 0');
PREPARE step FROM @sql; EXECUTE step; DEALLOCATE PREPARE step;

-- Alternate mobile
SET @add = (SELECT COUNT(*) = 0 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'alt_phone');
SET @sql = IF(@add, 'ALTER TABLE bookings ADD COLUMN alt_phone VARCHAR(40) NULL AFTER phone', 'DO 0');
PREPARE step FROM @sql; EXECUTE step; DEALLOCATE PREPARE step;

-- Payment method (Cash, UPI, Card, Bank transfer)
SET @add = (SELECT COUNT(*) = 0 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'method');
SET @sql = IF(@add, 'ALTER TABLE payments ADD COLUMN method VARCHAR(20) NULL AFTER kind', 'DO 0');
PREPARE step FROM @sql; EXECUTE step; DEALLOCATE PREPARE step;

-- Payment reference (UPI / transaction / cheque no.)
SET @add = (SELECT COUNT(*) = 0 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'reference');
SET @sql = IF(@add, 'ALTER TABLE payments ADD COLUMN reference VARCHAR(100) NULL AFTER method', 'DO 0');
PREPARE step FROM @sql; EXECUTE step; DEALLOCATE PREPARE step;

-- Advance payment flag (existing bookings: the payment made on the day the
-- booking was created is its advance, one per booking)
SET @add = (SELECT COUNT(*) = 0 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'is_advance');
SET @sql = IF(@add, 'ALTER TABLE payments ADD COLUMN is_advance TINYINT(1) NOT NULL DEFAULT 0 AFTER reference', 'DO 0');
PREPARE step FROM @sql; EXECUTE step; DEALLOCATE PREPARE step;
SET @sql = IF(@add, 'UPDATE payments p
                       JOIN (SELECT MIN(p2.id) AS id
                               FROM payments p2
                               JOIN bookings b ON b.ref = p2.booking_ref
                              WHERE p2.kind = ''payment'' AND p2.date = b.created_at
                              GROUP BY p2.booking_ref) a ON a.id = p.id
                        SET p.is_advance = 1', 'DO 0');
PREPARE step FROM @sql; EXECUTE step; DEALLOCATE PREPARE step;

-- Users: the room(s) a staff member looks after (optional)
SET @add = (SELECT COUNT(*) = 0 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'villa');
SET @sql = IF(@add, 'ALTER TABLE users ADD COLUMN villa VARCHAR(255) NULL AFTER role', 'DO 0');
PREPARE step FROM @sql; EXECUTE step; DEALLOCATE PREPARE step;
