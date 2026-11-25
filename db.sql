/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


CREATE TABLE IF NOT EXISTS `approval_policies` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `minAmount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `priority` int NOT NULL DEFAULT '0',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_policies_match` (`isActive`,`category`,`minAmount`,`priority`),
  KEY `fk_approval_policies_category` (`category`),
  CONSTRAINT `fk_approval_policies_category` FOREIGN KEY (`category`) REFERENCES `expense_categories` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `approval_policies` (`id`, `name`, `category`, `minAmount`, `priority`, `isActive`, `createdAt`, `updatedAt`) VALUES
	('38a95aa1-e40a-11f1-bb9b-022b20468ad9', 'Standard claims', NULL, 0.00, 0, 1, '2026-11-19 09:38:53', '2026-11-19 09:38:53'),
	('38a95e56-e40a-11f1-bb9b-022b20468ad9', 'High value claims', NULL, 25000.00, 10, 1, '2026-11-19 09:38:53', '2026-11-19 09:38:53');

CREATE TABLE IF NOT EXISTS `approval_policy_steps` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `policyId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `stepOrder` int unsigned NOT NULL,
  `label` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `requiredPermission` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_policy_step` (`policyId`,`stepOrder`),
  CONSTRAINT `fk_policy_steps_policy` FOREIGN KEY (`policyId`) REFERENCES `approval_policies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `approval_policy_steps` (`id`, `policyId`, `stepOrder`, `label`, `requiredPermission`) VALUES
	('38a963a6-e40a-11f1-bb9b-022b20468ad9', '38a95aa1-e40a-11f1-bb9b-022b20468ad9', 1, 'CA review', 'expense.approve'),
	('38a9691c-e40a-11f1-bb9b-022b20468ad9', '38a95e56-e40a-11f1-bb9b-022b20468ad9', 1, 'CA review', 'expense.approve'),
	('38a96960-e40a-11f1-bb9b-022b20468ad9', '38a95e56-e40a-11f1-bb9b-022b20468ad9', 2, 'Admin sign-off', 'expense.approve.high');

CREATE TABLE IF NOT EXISTS `attachments` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expenseId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `storageKey` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `originalName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mimeType` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sizeBytes` int unsigned NOT NULL,
  `uploadedById` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_attachments_storage_key` (`storageKey`),
  KEY `idx_attachments_expense` (`expenseId`),
  CONSTRAINT `fk_attachments_expense` FOREIGN KEY (`expenseId`) REFERENCES `expenses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `expense_approvals` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expenseId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `stepOrder` int unsigned NOT NULL,
  `label` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `requiredPermission` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('PENDING','APPROVED','REJECTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `actedById` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `actedAt` datetime DEFAULT NULL,
  `comment` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_expense_step` (`expenseId`,`stepOrder`),
  KEY `idx_approvals_actor` (`actedById`),
  CONSTRAINT `fk_approvals_expense` FOREIGN KEY (`expenseId`) REFERENCES `expenses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `expense_approvals` (`id`, `expenseId`, `stepOrder`, `label`, `requiredPermission`, `status`, `actedById`, `actedAt`, `comment`, `createdAt`, `updatedAt`) VALUES
	('21d9fbf7-7a35-483a-821b-dc55d3594879', 'e4487483-46d5-4e1b-a5ac-856aa362a79c', 1, 'CA review', 'expense.approve', 'APPROVED', '38a92743-e40a-11f1-bb9b-022b20468ad9', '2026-11-23 07:18:47', NULL, '2026-11-23 07:18:09', '2026-11-23 07:18:47'),
	('69536e9a-23d6-4b12-863e-e717ec66a3e6', '38a9afa5-e40a-11f1-bb9b-022b20468ad9', 1, 'CA review', 'expense.approve', 'APPROVED', '6a00f1ca-e70a-11f1-b0ed-3a14fab7572d', '2026-11-23 07:09:49', NULL, '2026-11-19 11:13:53', '2026-11-23 07:09:49');

CREATE TABLE IF NOT EXISTS `expense_categories` (
  `code` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `expense_categories` (`code`) VALUES
	('ACCOMMODATION'),
	('MEALS'),
	('OTHER'),
	('SUPPLIES'),
	('TRAVEL');

CREATE TABLE IF NOT EXISTS `expense_history` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expenseId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `fromStatus` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `toStatus` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `actorId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `comment` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_history_expense` (`expenseId`,`createdAt`),
  CONSTRAINT `fk_history_expense` FOREIGN KEY (`expenseId`) REFERENCES `expenses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `expenses` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `employeeId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `trackerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `scheduleId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `occurrenceDate` date DEFAULT NULL,
  `category` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'INR',
  `expenseDate` date NOT NULL,
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `toldBy` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paidTo` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reimbursementCancellationReason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('DRAFT','SUBMITTED','APPROVED','REJECTED','PARTIALLY_PAID','PAID','REIMBURSEMENT_CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `paidAmount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `submittedAt` datetime DEFAULT NULL,
  `approvedById` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `approvedAt` datetime DEFAULT NULL,
  `rejectionReason` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_schedule_occurrence` (`scheduleId`,`occurrenceDate`),
  KEY `idx_expenses_employee_status` (`employeeId`,`status`),
  KEY `idx_expenses_status` (`status`),
  KEY `idx_expenses_tracker_date` (`trackerId`,`expenseDate`),
  KEY `fk_expenses_category` (`category`),
  CONSTRAINT `fk_expenses_category` FOREIGN KEY (`category`) REFERENCES `expense_categories` (`code`),
  CONSTRAINT `fk_expenses_employee` FOREIGN KEY (`employeeId`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_expenses_schedule` FOREIGN KEY (`scheduleId`) REFERENCES `tracker_schedules` (`id`),
  CONSTRAINT `fk_expenses_tracker` FOREIGN KEY (`trackerId`) REFERENCES `trackers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payments` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expenseId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `paidOn` date NOT NULL,
  `reference` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recordedById` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_payments_expense` (`expenseId`),
  KEY `fk_payments_recorder` (`recordedById`),
  CONSTRAINT `fk_payments_expense` FOREIGN KEY (`expenseId`) REFERENCES `expenses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payments_recorder` FOREIGN KEY (`recordedById`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `permissions` (
  `code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `permissions` (`code`) VALUES
	('approval.policy.manage'),
	('expense.approve'),
	('expense.approve.high'),
	('expense.batch_approve'),
	('expense.create'),
	('expense.reject'),
	('expense.view.all'),
	('expense.view.own'),
	('payment.record'),
	('role.manage'),
	('user.manage');

CREATE TABLE IF NOT EXISTS `role_permissions` (
  `roleId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `permissionCode` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`roleId`,`permissionCode`),
  KEY `permissionCode` (`permissionCode`),
  CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`roleId`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `role_permissions_ibfk_2` FOREIGN KEY (`permissionCode`) REFERENCES `permissions` (`code`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `role_permissions` (`roleId`, `permissionCode`) VALUES
	('38a8ab3d-e40a-11f1-bb9b-022b20468ad9', 'expense.approve'),
	('38a8ab3d-e40a-11f1-bb9b-022b20468ad9', 'expense.approve.high'),
	('38a8ab3d-e40a-11f1-bb9b-022b20468ad9', 'expense.batch_approve'),
	('38a8ab3d-e40a-11f1-bb9b-022b20468ad9', 'expense.reject'),
	('38a8ab3d-e40a-11f1-bb9b-022b20468ad9', 'expense.view.all'),
	('38a8ab3d-e40a-11f1-bb9b-022b20468ad9', 'user.manage'),
	('38a8b095-e40a-11f1-bb9b-022b20468ad9', 'expense.approve'),
	('38a8b095-e40a-11f1-bb9b-022b20468ad9', 'expense.batch_approve'),
	('38a8b095-e40a-11f1-bb9b-022b20468ad9', 'expense.create'),
	('38a8b095-e40a-11f1-bb9b-022b20468ad9', 'expense.reject'),
	('38a8b095-e40a-11f1-bb9b-022b20468ad9', 'expense.view.all'),
	('38a8b0d6-e40a-11f1-bb9b-022b20468ad9', 'expense.create'),
	('38a8b0d6-e40a-11f1-bb9b-022b20468ad9', 'expense.view.own'),
	('38a8b0f9-e40a-11f1-bb9b-022b20468ad9', 'expense.create'),
	('38a8b0f9-e40a-11f1-bb9b-022b20468ad9', 'expense.view.all'),
	('38a8b0f9-e40a-11f1-bb9b-022b20468ad9', 'payment.record'),
	('38a8b119-e40a-11f1-bb9b-022b20468ad9', 'approval.policy.manage'),
	('38a8b119-e40a-11f1-bb9b-022b20468ad9', 'expense.approve'),
	('38a8b119-e40a-11f1-bb9b-022b20468ad9', 'expense.approve.high'),
	('38a8b119-e40a-11f1-bb9b-022b20468ad9', 'expense.batch_approve'),
	('38a8b119-e40a-11f1-bb9b-022b20468ad9', 'expense.create'),
	('38a8b119-e40a-11f1-bb9b-022b20468ad9', 'expense.reject'),
	('38a8b119-e40a-11f1-bb9b-022b20468ad9', 'expense.view.all'),
	('38a8b119-e40a-11f1-bb9b-022b20468ad9', 'expense.view.own'),
	('38a8b119-e40a-11f1-bb9b-022b20468ad9', 'payment.record'),
	('38a8b119-e40a-11f1-bb9b-022b20468ad9', 'role.manage'),
	('38a8b119-e40a-11f1-bb9b-022b20468ad9', 'user.manage');

CREATE TABLE IF NOT EXISTS `roles` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roles_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `roles` (`id`, `name`, `createdAt`, `updatedAt`) VALUES
	('38a8ab3d-e40a-11f1-bb9b-022b20468ad9', 'ADMIN', '2026-11-19 09:38:53', '2026-11-19 09:38:53'),
	('38a8b095-e40a-11f1-bb9b-022b20468ad9', 'CA', '2026-11-19 09:38:53', '2026-11-19 09:38:53'),
	('38a8b0d6-e40a-11f1-bb9b-022b20468ad9', 'EMPLOYEE', '2026-11-19 09:38:53', '2026-11-19 09:38:53'),
	('38a8b0f9-e40a-11f1-bb9b-022b20468ad9', 'FINANCE_EXECUTIVE', '2026-11-19 09:38:53', '2026-11-19 09:38:53'),
	('38a8b119-e40a-11f1-bb9b-022b20468ad9', 'SUPER_ADMIN', '2026-11-19 09:38:53', '2026-11-19 09:38:53');

CREATE TABLE IF NOT EXISTS `tracker_schedules` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `trackerId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `frequency` enum('DAILY','WEEKLY','MONTHLY') COLLATE utf8mb4_unicode_ci NOT NULL,
  `interval` int unsigned NOT NULL DEFAULT '1',
  `amount` decimal(12,2) NOT NULL,
  `category` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `startDate` date NOT NULL,
  `endDate` date DEFAULT NULL,
  `generatedThrough` date DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_schedules_tracker` (`trackerId`),
  KEY `fk_tracker_schedules_category` (`category`),
  CONSTRAINT `fk_schedules_tracker` FOREIGN KEY (`trackerId`) REFERENCES `trackers` (`id`),
  CONSTRAINT `fk_tracker_schedules_category` FOREIGN KEY (`category`) REFERENCES `expense_categories` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `trackers` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `employeeId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `title` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `startDate` date NOT NULL,
  `endDate` date DEFAULT NULL,
  `budgetAmount` decimal(12,2) DEFAULT NULL,
  `status` enum('ACTIVE','CLOSED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `closedAt` datetime DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_trackers_employee` (`employeeId`),
  CONSTRAINT `fk_trackers_employee` FOREIGN KEY (`employeeId`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `users` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(190) COLLATE utf8mb4_unicode_ci NOT NULL,
  `passwordHash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `passwordVersion` int unsigned NOT NULL DEFAULT '0',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `roleId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_roleId` (`roleId`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`roleId`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `users` (`id`, `name`, `email`, `passwordHash`, `isActive`, `roleId`, `createdAt`, `updatedAt`) VALUES
	('38a92743-e40a-11f1-bb9b-022b20468ad9', 'Super Admin', 'superadmin@example.com', '$2b$10$hY4Z/.Jr2uTZzJWXa3WvQ.v6l0mkaTPEJr91hvOKF/xaBSe5CoDpW', 1, '38a8b119-e40a-11f1-bb9b-022b20468ad9', '2026-11-19 09:38:53', '2026-11-19 09:38:53'),
	('6a00ef75-e70a-11f1-b0ed-3a14fab7572d', 'Test Admin', 'admin@rbac.test', '$2b$10$cfABkM0U7D/.Fdxm3wsw/.K28N6lpxo7JS6Qii/SCuHHI9nRvpkbi', 1, '38a8ab3d-e40a-11f1-bb9b-022b20468ad9', '2026-11-23 06:52:13', '2026-11-23 06:52:13'),
	('6a00f1ca-e70a-11f1-b0ed-3a14fab7572d', 'Test CA', 'ca@rbac.test', '$2b$10$cfABkM0U7D/.Fdxm3wsw/.K28N6lpxo7JS6Qii/SCuHHI9nRvpkbi', 1, '38a8b095-e40a-11f1-bb9b-022b20468ad9', '2026-11-23 06:52:13', '2026-11-23 06:52:13'),
	('6a00f20a-e70a-11f1-b0ed-3a14fab7572d', 'Test Finance', 'finance@rbac.test', '$2b$10$cfABkM0U7D/.Fdxm3wsw/.K28N6lpxo7JS6Qii/SCuHHI9nRvpkbi', 1, '38a8b0f9-e40a-11f1-bb9b-022b20468ad9', '2026-11-23 06:52:13', '2026-11-23 06:52:13'),
	('6a00f354-e70a-11f1-b0ed-3a14fab7572d', 'Test Employee', 'employee@rbac.test', '$2b$10$cfABkM0U7D/.Fdxm3wsw/.K28N6lpxo7JS6Qii/SCuHHI9nRvpkbi', 1, '38a8b0d6-e40a-11f1-bb9b-022b20468ad9', '2026-11-23 06:52:13', '2026-11-23 06:52:13');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
