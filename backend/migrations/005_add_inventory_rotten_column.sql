SET @add_rotten_sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'inventory'
      AND COLUMN_NAME = 'is_rotten') = 0,
  'ALTER TABLE `inventory` ADD COLUMN `is_rotten` TINYINT(1) NOT NULL DEFAULT 0;',
  'SELECT 1;'
);
PREPARE add_rotten_stmt FROM @add_rotten_sql;
EXECUTE add_rotten_stmt;
DEALLOCATE PREPARE add_rotten_stmt;
