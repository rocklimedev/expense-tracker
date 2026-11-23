-- Run once on an existing UUID schema with the backend and other writers stopped.
-- Requires MySQL 8.0.21+ and a database backup.

CREATE TABLE IF NOT EXISTS permissions (
  code VARCHAR(100) BINARY NOT NULL PRIMARY KEY
) ENGINE=InnoDB;

-- Match the existing roles.id character set and collation for the foreign key.
SELECT CHARACTER_SET_NAME, COLLATION_NAME INTO @role_id_charset, @role_id_collation
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles' AND COLUMN_NAME = 'id';

SET @create_role_permissions = CONCAT(
  'CREATE TABLE IF NOT EXISTS role_permissions (',
  'roleId CHAR(36) CHARACTER SET ', @role_id_charset, ' COLLATE ', @role_id_collation, ' NOT NULL, ',
  'permissionCode VARCHAR(100) BINARY NOT NULL, ',
  'PRIMARY KEY (roleId, permissionCode), ',
  'FOREIGN KEY (roleId) REFERENCES roles(id) ON DELETE CASCADE ON UPDATE CASCADE, ',
  'FOREIGN KEY (permissionCode) REFERENCES permissions(code) ON DELETE CASCADE ON UPDATE CASCADE',
  ') ENGINE=InnoDB'
);
PREPARE create_role_permissions FROM @create_role_permissions;
EXECUTE create_role_permissions;
DEALLOCATE PREPARE create_role_permissions;

START TRANSACTION;

INSERT INTO permissions (code)
SELECT DISTINCT grants.code
FROM roles AS r
CROSS JOIN JSON_TABLE(r.permissions, '$[*]' COLUMNS (code VARCHAR(100) PATH '$')) AS grants
WHERE grants.code IS NOT NULL
ON DUPLICATE KEY UPDATE code = permissions.code;

INSERT INTO role_permissions (roleId, permissionCode)
SELECT DISTINCT r.id, grants.code
FROM roles AS r
CROSS JOIN JSON_TABLE(r.permissions, '$[*]' COLUMNS (code VARCHAR(100) PATH '$')) AS grants
WHERE grants.code IS NOT NULL
ON DUPLICATE KEY UPDATE roleId = role_permissions.roleId;

COMMIT;

ALTER TABLE roles DROP COLUMN permissions;
