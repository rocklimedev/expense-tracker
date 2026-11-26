CREATE TABLE IF NOT EXISTS activity_entries (
  id CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL PRIMARY KEY,
  actorId CHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL,
  actorName VARCHAR(120) NOT NULL,
  action VARCHAR(100) NOT NULL,
  method VARCHAR(6) NOT NULL,
  resource VARCHAR(255) NOT NULL,
  createdAt DATETIME NOT NULL,
  INDEX idx_activity_entries_created_id (createdAt, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
