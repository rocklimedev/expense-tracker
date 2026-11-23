-- Run once with the backend and other writers stopped. Back up the database first.
-- Match the category columns created by Sequelize so the foreign keys are compatible.
SELECT CHARACTER_SET_NAME, COLLATION_NAME INTO @category_charset, @category_collation
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'expenses' AND COLUMN_NAME = 'category';

SET @create_expense_categories = CONCAT(
  'CREATE TABLE expense_categories (code VARCHAR(60) CHARACTER SET ',
  @category_charset, ' COLLATE ', @category_collation, ' NOT NULL PRIMARY KEY) ENGINE=InnoDB'
);
PREPARE create_expense_categories FROM @create_expense_categories;
EXECUTE create_expense_categories;
DEALLOCATE PREPARE create_expense_categories;

INSERT INTO expense_categories (code) VALUES
  ('TRAVEL'), ('MEALS'), ('SUPPLIES'), ('ACCOMMODATION'), ('OTHER');

INSERT INTO expense_categories (code)
SELECT existing.category FROM (
  SELECT category FROM expenses
  UNION ALL SELECT category FROM tracker_schedules
  UNION ALL SELECT category FROM approval_policies WHERE category IS NOT NULL
) AS existing
ON DUPLICATE KEY UPDATE code = expense_categories.code;

ALTER TABLE expenses
  ADD CONSTRAINT fk_expenses_category FOREIGN KEY (category) REFERENCES expense_categories (code);
ALTER TABLE tracker_schedules
  ADD CONSTRAINT fk_tracker_schedules_category FOREIGN KEY (category) REFERENCES expense_categories (code);
ALTER TABLE approval_policies
  ADD CONSTRAINT fk_approval_policies_category FOREIGN KEY (category) REFERENCES expense_categories (code);
