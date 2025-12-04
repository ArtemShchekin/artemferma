ALTER TABLE plots
  ADD COLUMN matured_notified TINYINT(1) NOT NULL DEFAULT 0 AFTER harvested;
