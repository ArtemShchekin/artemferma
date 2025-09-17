
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) UNIQUE NOT NULL,
  password_hash VARCHAR(190) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id INT PRIMARY KEY,
  is_cool TINYINT(1) DEFAULT 0,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  middle_name VARCHAR(50),
  nickname VARCHAR(15),
  passport VARCHAR(6),
  balance INT DEFAULT 30,
  sold_count INT DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  kind ENUM('seed','veg_raw','veg_washed') NOT NULL,
  type ENUM('radish','carrot','cabbage','mango','potato','eggplant') NOT NULL,
  status VARCHAR(30) DEFAULT 'new',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS plots (
  user_id INT NOT NULL,
  slot INT NOT NULL,
  type ENUM('radish','carrot','cabbage','mango','potato','eggplant'),
  planted_at TIMESTAMP NULL,
  harvested TINYINT(1) DEFAULT 0,
  PRIMARY KEY(user_id, slot),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
