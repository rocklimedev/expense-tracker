-- Run once on the integer-key schema with the application stopped.
-- MySQL implicitly commits DDL. Take a backup before applying this file.
-- Preserve existing foreign key names and rules, even if Sequelize assigned the names.
-- Keep the numeric-to-UUID mapping in this session until the migration finishes.

DELIMITER $$

CREATE PROCEDURE migrate_integer_keys_to_uuid()
BEGIN
  DECLARE finished BOOLEAN DEFAULT FALSE;
  DECLARE drop_fk TEXT;
  DECLARE add_fk TEXT;
  DECLARE fk_cursor CURSOR FOR SELECT drop_sql, add_sql FROM uuid_foreign_keys;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET finished = TRUE;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  CREATE TEMPORARY TABLE uuid_key_columns (
    table_name VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    column_name VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    parent_table VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    PRIMARY KEY (table_name, column_name)
  );
  INSERT INTO uuid_key_columns VALUES
    ('roles', 'id', 'roles'),
    ('users', 'id', 'users'),
    ('users', 'roleId', 'roles'),
    ('approval_policies', 'id', 'approval_policies'),
    ('approval_policy_steps', 'id', 'approval_policy_steps'),
    ('approval_policy_steps', 'policyId', 'approval_policies'),
    ('trackers', 'id', 'trackers'),
    ('trackers', 'employeeId', 'users'),
    ('tracker_schedules', 'id', 'tracker_schedules'),
    ('tracker_schedules', 'trackerId', 'trackers'),
    ('expenses', 'id', 'expenses'),
    ('expenses', 'employeeId', 'users'),
    ('expenses', 'trackerId', 'trackers'),
    ('expenses', 'scheduleId', 'tracker_schedules'),
    ('expenses', 'approvedById', 'users'),
    ('expense_approvals', 'id', 'expense_approvals'),
    ('expense_approvals', 'expenseId', 'expenses'),
    ('expense_approvals', 'actedById', 'users'),
    ('expense_history', 'id', 'expense_history'),
    ('expense_history', 'expenseId', 'expenses'),
    ('expense_history', 'actorId', 'users'),
    ('payments', 'id', 'payments'),
    ('payments', 'expenseId', 'expenses'),
    ('payments', 'recordedById', 'users'),
    ('attachments', 'id', 'attachments'),
    ('attachments', 'expenseId', 'expenses'),
    ('attachments', 'uploadedById', 'users');

  IF EXISTS (
    SELECT 1 FROM uuid_key_columns AS k
    LEFT JOIN information_schema.COLUMNS AS c
      ON c.TABLE_SCHEMA = DATABASE() AND c.TABLE_NAME = k.table_name AND c.COLUMN_NAME = k.column_name
    WHERE c.DATA_TYPE IS NULL OR c.DATA_TYPE <> 'int'
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Expected the original integer-key expense tracker schema';
  END IF;

  -- Capture relationships on converted child columns.
  CREATE TEMPORARY TABLE uuid_foreign_keys AS
    SELECT
      CONCAT('ALTER TABLE `', f.TABLE_NAME, '` DROP FOREIGN KEY `',
             REPLACE(f.CONSTRAINT_NAME, '`', '``'), '`') AS drop_sql,
      CONCAT('ALTER TABLE `', f.TABLE_NAME, '` ADD CONSTRAINT `',
             REPLACE(f.CONSTRAINT_NAME, '`', '``'), '` FOREIGN KEY (`', f.COLUMN_NAME,
             '`) REFERENCES `', f.REFERENCED_TABLE_NAME, '` (`id`) ON DELETE ',
             r.DELETE_RULE, ' ON UPDATE ', r.UPDATE_RULE) AS add_sql
    FROM information_schema.KEY_COLUMN_USAGE AS f
    JOIN uuid_key_columns AS k ON k.table_name = f.TABLE_NAME AND k.column_name = f.COLUMN_NAME
    JOIN information_schema.REFERENTIAL_CONSTRAINTS AS r
      ON r.CONSTRAINT_SCHEMA = f.CONSTRAINT_SCHEMA AND r.TABLE_NAME = f.TABLE_NAME
      AND r.CONSTRAINT_NAME = f.CONSTRAINT_NAME
    WHERE f.TABLE_SCHEMA = DATABASE() AND f.REFERENCED_TABLE_SCHEMA = DATABASE()
      AND f.REFERENCED_TABLE_NAME = k.parent_table AND f.REFERENCED_COLUMN_NAME = 'id'
      AND f.POSITION_IN_UNIQUE_CONSTRAINT = 1
      AND NOT EXISTS (
        SELECT 1 FROM information_schema.KEY_COLUMN_USAGE AS sibling
        WHERE sibling.CONSTRAINT_SCHEMA = f.CONSTRAINT_SCHEMA AND sibling.TABLE_NAME = f.TABLE_NAME
          AND sibling.CONSTRAINT_NAME = f.CONSTRAINT_NAME AND sibling.ORDINAL_POSITION <> f.ORDINAL_POSITION
      );

  IF (SELECT COUNT(*) FROM uuid_foreign_keys) <> (
    SELECT COUNT(DISTINCT f.CONSTRAINT_SCHEMA, f.TABLE_NAME, f.CONSTRAINT_NAME)
    FROM information_schema.KEY_COLUMN_USAGE AS f
    JOIN uuid_key_columns AS k
      ON (f.TABLE_SCHEMA = DATABASE() AND f.TABLE_NAME = k.table_name AND f.COLUMN_NAME = k.column_name)
      OR (f.REFERENCED_TABLE_SCHEMA = DATABASE() AND f.REFERENCED_TABLE_NAME = k.table_name
          AND f.REFERENCED_COLUMN_NAME = k.column_name)
    WHERE f.REFERENCED_TABLE_NAME IS NOT NULL
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unexpected foreign keys touch columns in the UUID migration';
  END IF;

  CREATE TEMPORARY TABLE uuid_key_map (
    entity VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    old_id VARCHAR(11) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    new_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    PRIMARY KEY (entity, old_id),
    UNIQUE (new_id)
  );

  -- Include unconstrained references so historical actor IDs survive even if a user was deleted.
  INSERT INTO uuid_key_map (entity, old_id, new_id)
  SELECT 'roles', old_id, UUID()
  FROM (
    SELECT `id` AS old_id FROM `roles`
    UNION
    SELECT `roleId` AS old_id FROM `users` WHERE `roleId` IS NOT NULL
  ) AS legacy_ids;

  INSERT INTO uuid_key_map (entity, old_id, new_id)
  SELECT 'users', old_id, UUID()
  FROM (
    SELECT `id` AS old_id FROM `users`
    UNION
    SELECT `employeeId` AS old_id FROM `trackers` WHERE `employeeId` IS NOT NULL
    UNION
    SELECT `employeeId` AS old_id FROM `expenses` WHERE `employeeId` IS NOT NULL
    UNION
    SELECT `approvedById` AS old_id FROM `expenses` WHERE `approvedById` IS NOT NULL
    UNION
    SELECT `actedById` AS old_id FROM `expense_approvals` WHERE `actedById` IS NOT NULL
    UNION
    SELECT `actorId` AS old_id FROM `expense_history` WHERE `actorId` IS NOT NULL
    UNION
    SELECT `recordedById` AS old_id FROM `payments` WHERE `recordedById` IS NOT NULL
    UNION
    SELECT `uploadedById` AS old_id FROM `attachments` WHERE `uploadedById` IS NOT NULL
  ) AS legacy_ids;

  INSERT INTO uuid_key_map (entity, old_id, new_id)
  SELECT 'approval_policies', old_id, UUID()
  FROM (
    SELECT `id` AS old_id FROM `approval_policies`
    UNION
    SELECT `policyId` AS old_id FROM `approval_policy_steps` WHERE `policyId` IS NOT NULL
  ) AS legacy_ids;

  INSERT INTO uuid_key_map (entity, old_id, new_id)
  SELECT 'approval_policy_steps', old_id, UUID()
  FROM (
    SELECT `id` AS old_id FROM `approval_policy_steps`
  ) AS legacy_ids;

  INSERT INTO uuid_key_map (entity, old_id, new_id)
  SELECT 'trackers', old_id, UUID()
  FROM (
    SELECT `id` AS old_id FROM `trackers`
    UNION
    SELECT `trackerId` AS old_id FROM `tracker_schedules` WHERE `trackerId` IS NOT NULL
    UNION
    SELECT `trackerId` AS old_id FROM `expenses` WHERE `trackerId` IS NOT NULL
  ) AS legacy_ids;

  INSERT INTO uuid_key_map (entity, old_id, new_id)
  SELECT 'tracker_schedules', old_id, UUID()
  FROM (
    SELECT `id` AS old_id FROM `tracker_schedules`
    UNION
    SELECT `scheduleId` AS old_id FROM `expenses` WHERE `scheduleId` IS NOT NULL
  ) AS legacy_ids;

  INSERT INTO uuid_key_map (entity, old_id, new_id)
  SELECT 'expenses', old_id, UUID()
  FROM (
    SELECT `id` AS old_id FROM `expenses`
    UNION
    SELECT `expenseId` AS old_id FROM `expense_approvals` WHERE `expenseId` IS NOT NULL
    UNION
    SELECT `expenseId` AS old_id FROM `expense_history` WHERE `expenseId` IS NOT NULL
    UNION
    SELECT `expenseId` AS old_id FROM `payments` WHERE `expenseId` IS NOT NULL
    UNION
    SELECT `expenseId` AS old_id FROM `attachments` WHERE `expenseId` IS NOT NULL
  ) AS legacy_ids;

  INSERT INTO uuid_key_map (entity, old_id, new_id)
  SELECT 'expense_approvals', old_id, UUID()
  FROM (
    SELECT `id` AS old_id FROM `expense_approvals`
  ) AS legacy_ids;

  INSERT INTO uuid_key_map (entity, old_id, new_id)
  SELECT 'expense_history', old_id, UUID()
  FROM (
    SELECT `id` AS old_id FROM `expense_history`
  ) AS legacy_ids;

  INSERT INTO uuid_key_map (entity, old_id, new_id)
  SELECT 'payments', old_id, UUID()
  FROM (
    SELECT `id` AS old_id FROM `payments`
  ) AS legacy_ids;

  INSERT INTO uuid_key_map (entity, old_id, new_id)
  SELECT 'attachments', old_id, UUID()
  FROM (
    SELECT `id` AS old_id FROM `attachments`
  ) AS legacy_ids;

  OPEN fk_cursor;
  drop_constraints: LOOP
    FETCH fk_cursor INTO drop_fk, add_fk;
    IF finished THEN LEAVE drop_constraints; END IF;
    SET @uuid_migration_ddl = drop_fk;
    PREPARE uuid_ddl FROM @uuid_migration_ddl;
    EXECUTE uuid_ddl;
    DEALLOCATE PREPARE uuid_ddl;
  END LOOP;
  CLOSE fk_cursor;

  -- Widen in place so the primary keys and existing indexes stay on their original columns.
  ALTER TABLE `roles`
    MODIFY COLUMN id CHAR(36) BINARY NOT NULL;

  ALTER TABLE `users`
    MODIFY COLUMN id CHAR(36) BINARY NOT NULL,
    MODIFY COLUMN `roleId` CHAR(36) BINARY NOT NULL;

  ALTER TABLE `approval_policies`
    MODIFY COLUMN id CHAR(36) BINARY NOT NULL;

  ALTER TABLE `approval_policy_steps`
    MODIFY COLUMN id CHAR(36) BINARY NOT NULL,
    MODIFY COLUMN `policyId` CHAR(36) BINARY NOT NULL;

  ALTER TABLE `trackers`
    MODIFY COLUMN id CHAR(36) BINARY NOT NULL,
    MODIFY COLUMN `employeeId` CHAR(36) BINARY NOT NULL;

  ALTER TABLE `tracker_schedules`
    MODIFY COLUMN id CHAR(36) BINARY NOT NULL,
    MODIFY COLUMN `trackerId` CHAR(36) BINARY NOT NULL;

  ALTER TABLE `expenses`
    MODIFY COLUMN id CHAR(36) BINARY NOT NULL,
    MODIFY COLUMN `employeeId` CHAR(36) BINARY NOT NULL,
    MODIFY COLUMN `trackerId` CHAR(36) BINARY NULL,
    MODIFY COLUMN `scheduleId` CHAR(36) BINARY NULL,
    MODIFY COLUMN `approvedById` CHAR(36) BINARY NULL;

  ALTER TABLE `expense_approvals`
    MODIFY COLUMN id CHAR(36) BINARY NOT NULL,
    MODIFY COLUMN `expenseId` CHAR(36) BINARY NOT NULL,
    MODIFY COLUMN `actedById` CHAR(36) BINARY NULL;

  ALTER TABLE `expense_history`
    MODIFY COLUMN id CHAR(36) BINARY NOT NULL,
    MODIFY COLUMN `expenseId` CHAR(36) BINARY NOT NULL,
    MODIFY COLUMN `actorId` CHAR(36) BINARY NOT NULL;

  ALTER TABLE `payments`
    MODIFY COLUMN id CHAR(36) BINARY NOT NULL,
    MODIFY COLUMN `expenseId` CHAR(36) BINARY NOT NULL,
    MODIFY COLUMN `recordedById` CHAR(36) BINARY NOT NULL;

  ALTER TABLE `attachments`
    MODIFY COLUMN id CHAR(36) BINARY NOT NULL,
    MODIFY COLUMN `expenseId` CHAR(36) BINARY NOT NULL,
    MODIFY COLUMN `uploadedById` CHAR(36) BINARY NOT NULL;

  START TRANSACTION;

  UPDATE `roles` AS t
  JOIN uuid_key_map AS m ON m.entity = 'roles' AND m.old_id = t.`id`
  SET t.`id` = m.new_id;

  UPDATE `users` AS t
  JOIN uuid_key_map AS m ON m.entity = 'users' AND m.old_id = t.`id`
  SET t.`id` = m.new_id;

  UPDATE `users` AS t
  JOIN uuid_key_map AS m ON m.entity = 'roles' AND m.old_id = t.`roleId`
  SET t.`roleId` = m.new_id;

  UPDATE `approval_policies` AS t
  JOIN uuid_key_map AS m ON m.entity = 'approval_policies' AND m.old_id = t.`id`
  SET t.`id` = m.new_id;

  UPDATE `approval_policy_steps` AS t
  JOIN uuid_key_map AS m ON m.entity = 'approval_policy_steps' AND m.old_id = t.`id`
  SET t.`id` = m.new_id;

  UPDATE `approval_policy_steps` AS t
  JOIN uuid_key_map AS m ON m.entity = 'approval_policies' AND m.old_id = t.`policyId`
  SET t.`policyId` = m.new_id;

  UPDATE `trackers` AS t
  JOIN uuid_key_map AS m ON m.entity = 'trackers' AND m.old_id = t.`id`
  SET t.`id` = m.new_id;

  UPDATE `trackers` AS t
  JOIN uuid_key_map AS m ON m.entity = 'users' AND m.old_id = t.`employeeId`
  SET t.`employeeId` = m.new_id;

  UPDATE `tracker_schedules` AS t
  JOIN uuid_key_map AS m ON m.entity = 'tracker_schedules' AND m.old_id = t.`id`
  SET t.`id` = m.new_id;

  UPDATE `tracker_schedules` AS t
  JOIN uuid_key_map AS m ON m.entity = 'trackers' AND m.old_id = t.`trackerId`
  SET t.`trackerId` = m.new_id;

  UPDATE `expenses` AS t
  JOIN uuid_key_map AS m ON m.entity = 'expenses' AND m.old_id = t.`id`
  SET t.`id` = m.new_id;

  UPDATE `expenses` AS t
  JOIN uuid_key_map AS m ON m.entity = 'users' AND m.old_id = t.`employeeId`
  SET t.`employeeId` = m.new_id;

  UPDATE `expenses` AS t
  JOIN uuid_key_map AS m ON m.entity = 'trackers' AND m.old_id = t.`trackerId`
  SET t.`trackerId` = m.new_id;

  UPDATE `expenses` AS t
  JOIN uuid_key_map AS m ON m.entity = 'tracker_schedules' AND m.old_id = t.`scheduleId`
  SET t.`scheduleId` = m.new_id;

  UPDATE `expenses` AS t
  JOIN uuid_key_map AS m ON m.entity = 'users' AND m.old_id = t.`approvedById`
  SET t.`approvedById` = m.new_id;

  UPDATE `expense_approvals` AS t
  JOIN uuid_key_map AS m ON m.entity = 'expense_approvals' AND m.old_id = t.`id`
  SET t.`id` = m.new_id;

  UPDATE `expense_approvals` AS t
  JOIN uuid_key_map AS m ON m.entity = 'expenses' AND m.old_id = t.`expenseId`
  SET t.`expenseId` = m.new_id;

  UPDATE `expense_approvals` AS t
  JOIN uuid_key_map AS m ON m.entity = 'users' AND m.old_id = t.`actedById`
  SET t.`actedById` = m.new_id;

  UPDATE `expense_history` AS t
  JOIN uuid_key_map AS m ON m.entity = 'expense_history' AND m.old_id = t.`id`
  SET t.`id` = m.new_id;

  UPDATE `expense_history` AS t
  JOIN uuid_key_map AS m ON m.entity = 'expenses' AND m.old_id = t.`expenseId`
  SET t.`expenseId` = m.new_id;

  UPDATE `expense_history` AS t
  JOIN uuid_key_map AS m ON m.entity = 'users' AND m.old_id = t.`actorId`
  SET t.`actorId` = m.new_id;

  UPDATE `payments` AS t
  JOIN uuid_key_map AS m ON m.entity = 'payments' AND m.old_id = t.`id`
  SET t.`id` = m.new_id;

  UPDATE `payments` AS t
  JOIN uuid_key_map AS m ON m.entity = 'expenses' AND m.old_id = t.`expenseId`
  SET t.`expenseId` = m.new_id;

  UPDATE `payments` AS t
  JOIN uuid_key_map AS m ON m.entity = 'users' AND m.old_id = t.`recordedById`
  SET t.`recordedById` = m.new_id;

  UPDATE `attachments` AS t
  JOIN uuid_key_map AS m ON m.entity = 'attachments' AND m.old_id = t.`id`
  SET t.`id` = m.new_id;

  UPDATE `attachments` AS t
  JOIN uuid_key_map AS m ON m.entity = 'expenses' AND m.old_id = t.`expenseId`
  SET t.`expenseId` = m.new_id;

  UPDATE `attachments` AS t
  JOIN uuid_key_map AS m ON m.entity = 'users' AND m.old_id = t.`uploadedById`
  SET t.`uploadedById` = m.new_id;

  COMMIT;

  SET finished = FALSE;
  OPEN fk_cursor;
  restore_constraints: LOOP
    FETCH fk_cursor INTO drop_fk, add_fk;
    IF finished THEN LEAVE restore_constraints; END IF;
    SET @uuid_migration_ddl = add_fk;
    PREPARE uuid_ddl FROM @uuid_migration_ddl;
    EXECUTE uuid_ddl;
    DEALLOCATE PREPARE uuid_ddl;
  END LOOP;
  CLOSE fk_cursor;

  DROP TEMPORARY TABLE uuid_key_map, uuid_foreign_keys, uuid_key_columns;
  SET @uuid_migration_ddl = NULL;
END$$

DELIMITER ;

CALL migrate_integer_keys_to_uuid();
DROP PROCEDURE migrate_integer_keys_to_uuid;

