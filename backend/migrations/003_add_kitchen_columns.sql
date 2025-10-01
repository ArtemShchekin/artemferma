SET @add_yogurt_sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'profiles'
      AND COLUMN_NAME = 'yogurt_ml') = 0,
  'ALTER TABLE `profiles` ADD COLUMN `yogurt_ml` INT NOT NULL DEFAULT 0;',
  'SELECT 1;'
);
PREPARE add_yogurt_stmt FROM @add_yogurt_sql;
EXECUTE add_yogurt_stmt;
DEALLOCATE PREPARE add_yogurt_stmt;

SET @add_sunflower_sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'profiles'
      AND COLUMN_NAME = 'sunflower_oil_ml') = 0,
  'ALTER TABLE `profiles` ADD COLUMN `sunflower_oil_ml` INT NOT NULL DEFAULT 0;',
  'SELECT 1;'
);
PREPARE add_sunflower_stmt FROM @add_sunflower_sql;
EXECUTE add_sunflower_stmt;
DEALLOCATE PREPARE add_sunflower_stmt;

SET @add_salads_sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'profiles'
      AND COLUMN_NAME = 'salads_eaten') = 0,
  'ALTER TABLE `profiles` ADD COLUMN `salads_eaten` INT NOT NULL DEFAULT 0;',
  'SELECT 1;'
);
PREPARE add_salads_stmt FROM @add_salads_sql;
EXECUTE add_salads_stmt;
DEALLOCATE PREPARE add_salads_stmt;