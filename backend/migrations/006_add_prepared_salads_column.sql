SET @add_prepared_sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'profiles'
      AND COLUMN_NAME = 'prepared_salads') = 0,
  'ALTER TABLE `profiles` ADD COLUMN `prepared_salads` INT NOT NULL DEFAULT 0;',
  'SELECT 1;'
);
PREPARE add_prepared_stmt FROM @add_prepared_sql;
EXECUTE add_prepared_stmt;
DEALLOCATE PREPARE add_prepared_stmt;
