SET @add_level_sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'profiles'
      AND COLUMN_NAME = 'level') = 0,
  'ALTER TABLE `profiles` ADD COLUMN `level` INT NOT NULL DEFAULT 1 AFTER `sold_count`;',
  'SELECT 1;'
);
PREPARE add_level_stmt FROM @add_level_sql;
EXECUTE add_level_stmt;
DEALLOCATE PREPARE add_level_stmt;

UPDATE profiles
SET level = CASE WHEN sold_count >= 50 THEN 2 ELSE 1 END;
