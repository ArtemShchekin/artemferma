SET @add_role_column_sql := IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = 'role') = 0,
  'ALTER TABLE `users` ADD COLUMN `role` ENUM(\'user\',\'admin\') NOT NULL DEFAULT \'user\';',
  'SELECT 1;'
);
PREPARE add_role_column_stmt FROM @add_role_column_sql;
EXECUTE add_role_column_stmt;
DEALLOCATE PREPARE add_role_column_stmt;

INSERT INTO users (email, password_hash, role)
VALUES ('admin@mail.ru', '$2a$10$Jq6AYFTcD7ZtJiUZ6KGiT.a4.rNxdNhaw7HqNkpMrnMJLrefO9ZGi', 'admin')
ON DUPLICATE KEY UPDATE
  role = 'admin',
  password_hash = VALUES(password_hash);
