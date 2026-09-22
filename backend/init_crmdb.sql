-- =============================================================================
-- AeroCRM Database Initialization & Seed Script
-- Target DBMS: MySQL 8.0+
-- Database: crmdb
-- Compatible with EF Core Migrations:
--   - 20260524083104_InitialCreate
--   - 20260920000000_EnterpriseAndAutomations
-- =============================================================================

-- 1. Create and Switch to Database
CREATE DATABASE IF NOT EXISTS `crmdb`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE `crmdb`;

-- 2. Entity Framework Core Migration History Table
CREATE TABLE IF NOT EXISTS `__EFMigrationsHistory` (
    `MigrationId` varchar(150) CHARACTER SET utf8mb4 NOT NULL,
    `ProductVersion` varchar(32) CHARACTER SET utf8mb4 NOT NULL,
    CONSTRAINT `PK___EFMigrationsHistory` PRIMARY KEY (`MigrationId`)
) CHARACTER SET=utf8mb4;

-- 3. Organizations Table
CREATE TABLE IF NOT EXISTS `Organizations` (
    `Id` char(36) COLLATE ascii_general_ci NOT NULL,
    `Name` longtext CHARACTER SET utf8mb4 NOT NULL,
    `SubscriptionTier` longtext CHARACTER SET utf8mb4 NOT NULL,
    `CreatedAt` datetime(6) NOT NULL,
    `UpdatedAt` datetime(6) NOT NULL,
    `WebhookApiKey` longtext CHARACTER SET utf8mb4 NOT NULL,
    `AutoAssignRoundRobin` tinyint(1) NOT NULL DEFAULT 1,
    `StaleDealThresholdDays` int NOT NULL DEFAULT 14,
    CONSTRAINT `PK_Organizations` PRIMARY KEY (`Id`)
) CHARACTER SET=utf8mb4;

-- 4. Users Table
CREATE TABLE IF NOT EXISTS `Users` (
    `Id` char(36) COLLATE ascii_general_ci NOT NULL,
    `Email` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
    `PasswordHash` longtext CHARACTER SET utf8mb4 NOT NULL,
    `FirstName` longtext CHARACTER SET utf8mb4 NOT NULL,
    `LastName` longtext CHARACTER SET utf8mb4 NOT NULL,
    `Role` int NOT NULL,
    `OrganizationId` char(36) COLLATE ascii_general_ci NOT NULL,
    `CreatedAt` datetime(6) NOT NULL,
    `UpdatedAt` datetime(6) NOT NULL,
    `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    `DeletedAt` datetime(6) NULL,
    CONSTRAINT `PK_Users` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_Users_Organizations_OrganizationId` FOREIGN KEY (`OrganizationId`) 
        REFERENCES `Organizations` (`Id`) ON DELETE RESTRICT
) CHARACTER SET=utf8mb4;

-- 5. Contacts Table
CREATE TABLE IF NOT EXISTS `Contacts` (
    `Id` char(36) COLLATE ascii_general_ci NOT NULL,
    `FirstName` longtext CHARACTER SET utf8mb4 NOT NULL,
    `LastName` longtext CHARACTER SET utf8mb4 NOT NULL,
    `Email` longtext CHARACTER SET utf8mb4 NOT NULL,
    `Phone` longtext CHARACTER SET utf8mb4 NOT NULL,
    `JobTitle` longtext CHARACTER SET utf8mb4 NOT NULL,
    `CompanyName` longtext CHARACTER SET utf8mb4 NOT NULL,
    `OrganizationId` char(36) COLLATE ascii_general_ci NOT NULL,
    `CreatedAt` datetime(6) NOT NULL,
    `UpdatedAt` datetime(6) NOT NULL,
    `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    `DeletedAt` datetime(6) NULL,
    CONSTRAINT `PK_Contacts` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_Contacts_Organizations_OrganizationId` FOREIGN KEY (`OrganizationId`) 
        REFERENCES `Organizations` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

-- 6. Leads Table
CREATE TABLE IF NOT EXISTS `Leads` (
    `Id` char(36) COLLATE ascii_general_ci NOT NULL,
    `FirstName` longtext CHARACTER SET utf8mb4 NOT NULL,
    `LastName` longtext CHARACTER SET utf8mb4 NOT NULL,
    `Email` longtext CHARACTER SET utf8mb4 NOT NULL,
    `Phone` longtext CHARACTER SET utf8mb4 NOT NULL,
    `CompanyName` longtext CHARACTER SET utf8mb4 NOT NULL,
    `EstimatedValue` decimal(18,2) NOT NULL DEFAULT 0.00,
    `Status` int NOT NULL DEFAULT 0,
    `Source` longtext CHARACTER SET utf8mb4 NOT NULL,
    `OrganizationId` char(36) COLLATE ascii_general_ci NOT NULL,
    `AssignedToUserId` char(36) COLLATE ascii_general_ci NULL,
    `CreatedAt` datetime(6) NOT NULL,
    `UpdatedAt` datetime(6) NOT NULL,
    `ExpectedCloseDate` datetime(6) NULL,
    `CloseReason` longtext CHARACTER SET utf8mb4 NULL,
    `LastContactedAt` datetime(6) NULL,
    `Score` int NOT NULL DEFAULT 50,
    `IsDeleted` tinyint(1) NOT NULL DEFAULT 0,
    `DeletedAt` datetime(6) NULL,
    CONSTRAINT `PK_Leads` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_Leads_Organizations_OrganizationId` FOREIGN KEY (`OrganizationId`) 
        REFERENCES `Organizations` (`Id`) ON DELETE CASCADE,
    CONSTRAINT `FK_Leads_Users_AssignedToUserId` FOREIGN KEY (`AssignedToUserId`) 
        REFERENCES `Users` (`Id`) ON DELETE SET NULL
) CHARACTER SET=utf8mb4;

-- 7. ActivityLogs Table
CREATE TABLE IF NOT EXISTS `ActivityLogs` (
    `Id` char(36) COLLATE ascii_general_ci NOT NULL,
    `LeadId` char(36) COLLATE ascii_general_ci NULL,
    `ContactId` char(36) COLLATE ascii_general_ci NULL,
    `UserId` char(36) COLLATE ascii_general_ci NOT NULL,
    `Type` int NOT NULL,
    `Details` longtext CHARACTER SET utf8mb4 NOT NULL,
    `CreatedAt` datetime(6) NOT NULL,
    CONSTRAINT `PK_ActivityLogs` PRIMARY KEY (`Id`),
    CONSTRAINT `FK_ActivityLogs_Contacts_ContactId` FOREIGN KEY (`ContactId`) 
        REFERENCES `Contacts` (`Id`) ON DELETE CASCADE,
    CONSTRAINT `FK_ActivityLogs_Leads_LeadId` FOREIGN KEY (`LeadId`) 
        REFERENCES `Leads` (`Id`) ON DELETE CASCADE,
    CONSTRAINT `FK_ActivityLogs_Users_UserId` FOREIGN KEY (`UserId`) 
        REFERENCES `Users` (`Id`) ON DELETE CASCADE
) CHARACTER SET=utf8mb4;

-- 8. Indexes
CREATE UNIQUE INDEX `IX_Users_Email` ON `Users` (`Email`);
CREATE INDEX `IX_Users_OrganizationId` ON `Users` (`OrganizationId`);
CREATE INDEX `IX_Users_OrganizationId_IsDeleted` ON `Users` (`OrganizationId`, `IsDeleted`);

CREATE INDEX `IX_Contacts_OrganizationId` ON `Contacts` (`OrganizationId`);
CREATE INDEX `IX_Contacts_OrganizationId_IsDeleted_CreatedAt` ON `Contacts` (`OrganizationId`, `IsDeleted`, `CreatedAt`);

CREATE INDEX `IX_Leads_AssignedToUserId` ON `Leads` (`AssignedToUserId`);
CREATE INDEX `IX_Leads_OrganizationId` ON `Leads` (`OrganizationId`);
CREATE INDEX `IX_Leads_OrganizationId_IsDeleted_CreatedAt` ON `Leads` (`OrganizationId`, `IsDeleted`, `CreatedAt`);

CREATE INDEX `IX_ActivityLogs_ContactId` ON `ActivityLogs` (`ContactId`);
CREATE INDEX `IX_ActivityLogs_LeadId` ON `ActivityLogs` (`LeadId`);
CREATE INDEX `IX_ActivityLogs_UserId` ON `ActivityLogs` (`UserId`);

-- 9. Register EF Migrations in __EFMigrationsHistory
INSERT INTO `__EFMigrationsHistory` (`MigrationId`, `ProductVersion`)
VALUES 
    ('20260524083104_InitialCreate', '9.0.0'),
    ('20260920000000_EnterpriseAndAutomations', '9.0.0')
ON DUPLICATE KEY UPDATE `ProductVersion` = VALUES(`ProductVersion`);

-- =============================================================================
-- SEED DATA (Default Organization, Users, Leads, Contacts, and Activity Logs)
-- Default Login Credentials:
--   Email: admin@example.com    | Password: admin123 (or Password123!)
--   Email: manager@example.com  | Password: admin123
--   Email: agent@example.com    | Password: admin123
-- =============================================================================

-- Seed Organization
INSERT INTO `Organizations` (
    `Id`, `Name`, `SubscriptionTier`, `CreatedAt`, `UpdatedAt`, 
    `WebhookApiKey`, `AutoAssignRoundRobin`, `StaleDealThresholdDays`
)
VALUES (
    'd290f1ee-6c54-4b01-90e6-d701748f0851',
    'Apex Technologies Inc',
    'Enterprise',
    UTC_TIMESTAMP(6),
    UTC_TIMESTAMP(6),
    'apex_wh_sec_9f823a41b2e47',
    1,
    14
)
ON DUPLICATE KEY UPDATE `Name` = VALUES(`Name`);

-- Seed Users (Role: 0=Admin, 1=Manager, 2=Agent)
-- Password hash for 'admin123' generated with HMAC-SHA256 PBKDF2 (100k iterations) matching PasswordHasher
INSERT INTO `Users` (
    `Id`, `Email`, `PasswordHash`, `FirstName`, `LastName`, `Role`, 
    `OrganizationId`, `CreatedAt`, `UpdatedAt`, `IsDeleted`, `DeletedAt`
)
VALUES 
(
    'a1111111-1111-1111-1111-111111111111',
    'admin@example.com',
    'PgBo1Gy2oI07INOs+IkdcQ==.aB2RkuvsGirUvrZBZR51gWInwDYg54Pfxrzp3qbijfw=',
    'Alex',
    'Mercer',
    0,
    'd290f1ee-6c54-4b01-90e6-d701748f0851',
    UTC_TIMESTAMP(6),
    UTC_TIMESTAMP(6),
    0,
    NULL
),
(
    'a2222222-2222-2222-2222-222222222222',
    'manager@example.com',
    'PgBo1Gy2oI07INOs+IkdcQ==.aB2RkuvsGirUvrZBZR51gWInwDYg54Pfxrzp3qbijfw=',
    'Sarah',
    'Connor',
    1,
    'd290f1ee-6c54-4b01-90e6-d701748f0851',
    UTC_TIMESTAMP(6),
    UTC_TIMESTAMP(6),
    0,
    NULL
),
(
    'a3333333-3333-3333-3333-333333333333',
    'agent@example.com',
    'PgBo1Gy2oI07INOs+IkdcQ==.aB2RkuvsGirUvrZBZR51gWInwDYg54Pfxrzp3qbijfw=',
    'David',
    'Miller',
    2,
    'd290f1ee-6c54-4b01-90e6-d701748f0851',
    UTC_TIMESTAMP(6),
    UTC_TIMESTAMP(6),
    0,
    NULL
)
ON DUPLICATE KEY UPDATE `Email` = VALUES(`Email`);

-- Seed Contacts
INSERT INTO `Contacts` (
    `Id`, `FirstName`, `LastName`, `Email`, `Phone`, `JobTitle`, 
    `CompanyName`, `OrganizationId`, `CreatedAt`, `UpdatedAt`, `IsDeleted`, `DeletedAt`
)
VALUES 
(
    'c1111111-1111-1111-1111-111111111111',
    'Diana',
    'Prince',
    'diana@themyscira.org',
    '+1 555-0188',
    'VP of Strategic Alliances',
    'Themyscira Global',
    'd290f1ee-6c54-4b01-90e6-d701748f0851',
    UTC_TIMESTAMP(6),
    UTC_TIMESTAMP(6),
    0,
    NULL
),
(
    'c2222222-2222-2222-2222-222222222222',
    'Clark',
    'Kent',
    'clark@dailyplanet.com',
    '+1 555-0199',
    'Senior Editorial Director',
    'Daily Planet Corp',
    'd290f1ee-6c54-4b01-90e6-d701748f0851',
    UTC_TIMESTAMP(6),
    UTC_TIMESTAMP(6),
    0,
    NULL
)
ON DUPLICATE KEY UPDATE `Email` = VALUES(`Email`);

-- Seed Leads (Status: 0=New, 1=Contacted, 2=Qualified, 3=Lost, 4=Won)
INSERT INTO `Leads` (
    `Id`, `FirstName`, `LastName`, `Email`, `Phone`, `CompanyName`, 
    `EstimatedValue`, `Status`, `Source`, `OrganizationId`, `AssignedToUserId`, 
    `CreatedAt`, `UpdatedAt`, `ExpectedCloseDate`, `CloseReason`, `LastContactedAt`, 
    `Score`, `IsDeleted`, `DeletedAt`
)
VALUES 
(
    'b1111111-1111-1111-1111-111111111111',
    'Sophia',
    'Turner',
    'sophia@apexcloud.io',
    '+1 555-0192',
    'Apex Cloud Solutions',
    85000.00,
    0,
    'Website',
    'd290f1ee-6c54-4b01-90e6-d701748f0851',
    'a3333333-3333-3333-3333-333333333333',
    UTC_TIMESTAMP(6),
    UTC_TIMESTAMP(6),
    DATE_ADD(UTC_TIMESTAMP(6), INTERVAL 30 DAY),
    NULL,
    UTC_TIMESTAMP(6),
    88,
    0,
    NULL
),
(
    'b2222222-2222-2222-2222-222222222222',
    'Marcus',
    'Vance',
    'marcus@vancetech.com',
    '+1 555-0144',
    'Vance Global',
    120000.00,
    2,
    'Referral',
    'd290f1ee-6c54-4b01-90e6-d701748f0851',
    'a2222222-2222-2222-2222-222222222222',
    UTC_TIMESTAMP(6),
    UTC_TIMESTAMP(6),
    DATE_ADD(UTC_TIMESTAMP(6), INTERVAL 14 DAY),
    NULL,
    UTC_TIMESTAMP(6),
    94,
    0,
    NULL
),
(
    'b3333333-3333-3333-3333-333333333333',
    'Elena',
    'Rostova',
    'elena@cyberdyne.io',
    '+1 555-0182',
    'Cyberdyne Systems',
    250000.00,
    4,
    'Partner Inbound',
    'd290f1ee-6c54-4b01-90e6-d701748f0851',
    'a1111111-1111-1111-1111-111111111111',
    UTC_TIMESTAMP(6),
    UTC_TIMESTAMP(6),
    DATE_SUB(UTC_TIMESTAMP(6), INTERVAL 2 DAY),
    'Contract signed & executed successfully',
    UTC_TIMESTAMP(6),
    99,
    0,
    NULL
)
ON DUPLICATE KEY UPDATE `Email` = VALUES(`Email`);

-- Seed ActivityLogs (Type: 0=Email, 1=Phone, 2=Meeting, 3=Note, 4=AISummary)
INSERT INTO `ActivityLogs` (
    `Id`, `LeadId`, `ContactId`, `UserId`, `Type`, `Details`, `CreatedAt`
)
VALUES 
(
    'd1111111-1111-1111-1111-111111111111',
    'b1111111-1111-1111-1111-111111111111',
    NULL,
    'a3333333-3333-3333-3333-333333333333',
    0,
    'Sent introductory proposal with enterprise tier pricing sheet.',
    UTC_TIMESTAMP(6)
),
(
    'd2222222-2222-2222-2222-222222222222',
    'b2222222-2222-2222-2222-222222222222',
    NULL,
    'a2222222-2222-2222-2222-222222222222',
    2,
    'Held 45-minute technical demo with IT and Sales directors. Very enthusiastic about automation pipelines.',
    UTC_TIMESTAMP(6)
),
(
    'd3333333-3333-3333-3333-333333333333',
    NULL,
    'c1111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111',
    3,
    'Quarterly check-in completed. Account is healthy with strong expansion opportunity next quarter.',
    UTC_TIMESTAMP(6)
)
ON DUPLICATE KEY UPDATE `Details` = VALUES(`Details`);
