START TRANSACTION;

INSERT INTO permissions (code) VALUES ('expense.create')
ON DUPLICATE KEY UPDATE code = permissions.code;

INSERT INTO role_permissions (roleId, permissionCode)
SELECT id, 'expense.create'
FROM roles
WHERE name IN ('CA', 'FINANCE_EXECUTIVE')
ON DUPLICATE KEY UPDATE permissionCode = role_permissions.permissionCode;

COMMIT;
