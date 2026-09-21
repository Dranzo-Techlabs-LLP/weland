-- ==================================================================
--  Weland — DUMMY demo data (so you can see every feature populated)
--  Import in phpMyAdmin:  weland  >  Import  >  choose this file  >  Go
--
--  TO REMOVE IT LATER (restores the clean slate) run this in the SQL tab:
--    DELETE FROM payments;
--    DELETE FROM bookings;
--    DELETE FROM expenses;
--    UPDATE invoice_settings SET next = 1 WHERE id = 1;
--  (safe as long as you haven't entered real bookings yet)
-- ==================================================================

INSERT INTO bookings (id, ref, guest, phone, email, villa, check_in, check_out, guests, status, total, source, created_at) VALUES
('bd01','KV-00001','Muhammed Shamlan','9846010001','','A1','2026-09-17','2026-09-19',4,'confirmed',14000,'Direct','2026-09-10'),
('bd02','KV-00002','Nishad P','9846010002','','A2','2026-09-16','2026-09-17',3,'confirmed',12000,'B2B','2026-09-10'),
('bd03','KV-00003','Anfas','9846010003','','B1','2026-09-15','2026-09-17',4,'confirmed',16000,'B2B','2026-09-09'),
('bd04','KV-00004','Basavraj B S','9846010004','','Dormitory','2026-09-18','2026-09-19',12,'confirmed',25000,'Direct','2026-09-11'),
('bd05','KV-00005','Renold Shaju','9846010005','','A1','2026-09-19','2026-09-20',5,'confirmed',14000,'Direct','2026-09-12'),
('bd06','KV-00006','Pranav','9846010006','','B2','2026-09-20','2026-09-21',4,'hold',10000,'Direct','2026-09-13'),
('bd07','KV-00007','Kareem','9846010007','','Dormitory','2026-09-21','2026-09-22',14,'confirmed',17000,'B2B','2026-09-13'),
('bd08','KV-00008','Harikrishna','9846010008','','A3','2026-09-22','2026-09-23',3,'enquiry',13000,'Direct','2026-09-14'),
('bd09','KV-00009','Yahya Najeeb','9846010009','','Dormitory','2026-09-25','2026-09-27',16,'confirmed',24000,'Direct','2026-09-14'),
('bd10','KV-00010','Fahad','9846010010','','A4','2026-10-01','2026-10-03',3,'confirmed',18000,'B2B','2026-09-15'),
('bd11','KV-00011','Syam Krishna','9846010011','','B1','2026-09-10','2026-09-11',4,'completed',9000,'B2B','2026-09-05'),
('bd12','KV-00012','Ajmal Najeem','9846010012','','A3','2026-09-08','2026-09-09',3,'completed',12000,'Direct','2026-09-03'),
('bd13','KV-00013','Sooraj','9846010013','','B2','2026-09-05','2026-09-06',5,'completed',11000,'Direct','2026-09-01'),
('bd14','KV-00014','Rithwik','9846010014','','A2','2026-09-12','2026-09-13',2,'cancelled',10000,'Direct','2026-09-07');

INSERT INTO payments (id, booking_ref, date, amount, kind) VALUES
('pd01','KV-00001','2026-09-12',5000,'payment'),
('pd02','KV-00002','2026-09-16',12000,'payment'),
('pd03','KV-00003','2026-09-15',16000,'payment'),
('pd04','KV-00004','2026-09-13',5000,'payment'),
('pd05','KV-00005','2026-09-14',4000,'payment'),
('pd06','KV-00007','2026-09-15',5000,'payment'),
('pd07','KV-00009','2026-09-15',3000,'payment'),
('pd08','KV-00010','2026-09-16',4000,'payment'),
('pd09','KV-00011','2026-09-10',9000,'payment'),
('pd10','KV-00012','2026-09-08',12000,'payment'),
('pd11','KV-00013','2026-09-05',11000,'payment'),
('pd12','KV-00014','2026-09-08',3000,'payment'),
('pd13','KV-00014','2026-09-11',3000,'refund');

INSERT INTO expenses (id, date, category, villa, booking_ref, description, amount) VALUES
('ed01','2026-09-14','Food','A1',NULL,'GROCERIES',2000),
('ed02','2026-09-13','Staff','B1',NULL,'STAFF SALARY',15000),
('ed03','2026-09-16','Maintenance','A2',NULL,'PLUMBING REPAIR',1200),
('ed04','2026-09-11','B2B Commission','B1','KV-00011','B2B commission · KV-00011',800),
('ed05','2026-09-10','Cleaning','Dormitory',NULL,'DEEP CLEANING',1500);

UPDATE invoice_settings SET next = 15 WHERE id = 1;
