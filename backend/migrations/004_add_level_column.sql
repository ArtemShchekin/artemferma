ALTER TABLE profiles
  ADD COLUMN level INT NOT NULL DEFAULT 1 AFTER sold_count;

UPDATE profiles
SET level = CASE WHEN sold_count >= 50 THEN 2 ELSE 1 END;
