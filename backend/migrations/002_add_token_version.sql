SET @add_token_version_sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'token_version') = 0,
  'ALTER TABLE `users` ADD COLUMN `token_version` BIGINT NOT NULL DEFAULT 0;',
  'SELECT 1;'
);
PREPARE add_token_version_stmt FROM @add_token_version_sql;
EXECUTE add_token_version_stmt;
DEALLOCATE PREPARE add_token_version_stmt;