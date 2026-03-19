-- ============================================================
-- MMG EPM - Enterprise Project Management System
-- Database Schema: Core & Authentication
-- SQL Server 2019+
-- Naming: PascalCase tables, columns; FK_TableName_RefTable
-- ============================================================

USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'MMGEPM')
    CREATE DATABASE MMGEPM
        COLLATE Latin1_General_CI_AS;
GO

USE MMGEPM;
GO

-- ============================================================
-- SCHEMA SETUP
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'Auth')   EXEC('CREATE SCHEMA Auth');
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'Project') EXEC('CREATE SCHEMA Project');
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'Document') EXEC('CREATE SCHEMA Document');
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'Procurement') EXEC('CREATE SCHEMA Procurement');
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'Inventory') EXEC('CREATE SCHEMA Inventory');
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'Resource') EXEC('CREATE SCHEMA Resource');
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'Budget') EXEC('CREATE SCHEMA Budget');
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'Risk') EXEC('CREATE SCHEMA Risk');
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'Audit') EXEC('CREATE SCHEMA Audit');
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'Notify') EXEC('CREATE SCHEMA Notify');
GO

-- ============================================================
-- AUTH SCHEMA
-- ============================================================

CREATE TABLE Auth.Roles (
    RoleId          INT IDENTITY(1,1) NOT NULL,
    RoleName        NVARCHAR(100)     NOT NULL,
    RoleCode        NVARCHAR(50)      NOT NULL,
    Description     NVARCHAR(500)     NULL,
    IsActive        BIT               NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Roles PRIMARY KEY (RoleId),
    CONSTRAINT UQ_Roles_RoleCode UNIQUE (RoleCode)
);
GO

CREATE TABLE Auth.Users (
    UserId          INT IDENTITY(1,1) NOT NULL,
    EmployeeId      NVARCHAR(50)      NULL,
    FirstName       NVARCHAR(100)     NOT NULL,
    LastName        NVARCHAR(100)     NOT NULL,
    Email           NVARCHAR(256)     NOT NULL,
    PasswordHash    NVARCHAR(512)     NOT NULL,
    PhoneNumber     NVARCHAR(20)      NULL,
    Department      NVARCHAR(100)     NULL,
    Designation     NVARCHAR(100)     NULL,
    CountryCode     NVARCHAR(10)      NULL,
    AvatarUrl       NVARCHAR(500)     NULL,
    IsActive        BIT               NOT NULL DEFAULT 1,
    IsEmailVerified BIT               NOT NULL DEFAULT 0,
    LastLoginAt     DATETIME2         NULL,
    FailedLoginCount INT              NOT NULL DEFAULT 0,
    LockoutEndAt    DATETIME2         NULL,
    RefreshToken    NVARCHAR(512)     NULL,
    RefreshTokenExpiry DATETIME2      NULL,
    CreatedBy       INT               NULL,
    UpdatedBy       INT               NULL,
    CreatedAt       DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Users PRIMARY KEY (UserId),
    CONSTRAINT UQ_Users_Email UNIQUE (Email)
);
GO

CREATE TABLE Auth.UserRoles (
    UserRoleId  INT IDENTITY(1,1) NOT NULL,
    UserId      INT               NOT NULL,
    RoleId      INT               NOT NULL,
    AssignedBy  INT               NULL,
    AssignedAt  DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_UserRoles PRIMARY KEY (UserRoleId),
    CONSTRAINT UQ_UserRoles UNIQUE (UserId, RoleId),
    CONSTRAINT FK_UserRoles_Users FOREIGN KEY (UserId) REFERENCES Auth.Users(UserId),
    CONSTRAINT FK_UserRoles_Roles FOREIGN KEY (RoleId) REFERENCES Auth.Roles(RoleId)
);
GO

CREATE TABLE Auth.Permissions (
    PermissionId    INT IDENTITY(1,1) NOT NULL,
    Module          NVARCHAR(100)     NOT NULL,
    SubModule       NVARCHAR(100)     NULL,
    Action          NVARCHAR(50)      NOT NULL, -- View, Create, Edit, Delete, Approve
    Description     NVARCHAR(300)     NULL,
    CONSTRAINT PK_Permissions PRIMARY KEY (PermissionId),
    CONSTRAINT UQ_Permissions UNIQUE (Module, SubModule, Action)
);
GO

CREATE TABLE Auth.RolePermissions (
    RolePermissionId INT IDENTITY(1,1) NOT NULL,
    RoleId           INT               NOT NULL,
    PermissionId     INT               NOT NULL,
    IsGranted        BIT               NOT NULL DEFAULT 1,
    CONSTRAINT PK_RolePermissions PRIMARY KEY (RolePermissionId),
    CONSTRAINT UQ_RolePermissions UNIQUE (RoleId, PermissionId),
    CONSTRAINT FK_RolePermissions_Roles FOREIGN KEY (RoleId) REFERENCES Auth.Roles(RoleId),
    CONSTRAINT FK_RolePermissions_Permissions FOREIGN KEY (PermissionId) REFERENCES Auth.Permissions(PermissionId)
);
GO

-- ============================================================
-- REFERENCE / LOOKUP TABLES
-- ============================================================

CREATE TABLE Auth.Countries (
    CountryId   INT IDENTITY(1,1) NOT NULL,
    CountryName NVARCHAR(100)     NOT NULL,
    CountryCode NVARCHAR(3)       NOT NULL,
    IsActive    BIT               NOT NULL DEFAULT 1,
    CONSTRAINT PK_Countries PRIMARY KEY (CountryId),
    CONSTRAINT UQ_Countries_Code UNIQUE (CountryCode)
);
GO

CREATE TABLE Auth.SBUCodes (
    SBUId       INT IDENTITY(1,1) NOT NULL,
    SBUCode     NVARCHAR(20)      NOT NULL,
    SBUName     NVARCHAR(200)     NOT NULL,
    CountryId   INT               NULL,
    IsActive    BIT               NOT NULL DEFAULT 1,
    CONSTRAINT PK_SBUCodes PRIMARY KEY (SBUId),
    CONSTRAINT FK_SBUCodes_Countries FOREIGN KEY (CountryId) REFERENCES Auth.Countries(CountryId)
);
GO

-- ============================================================
-- AUDIT SCHEMA
-- ============================================================

CREATE TABLE Audit.AuditLog (
    AuditId       BIGINT IDENTITY(1,1) NOT NULL,
    TableName     NVARCHAR(200)        NOT NULL,
    RecordId      NVARCHAR(100)        NOT NULL,
    Action        NVARCHAR(10)         NOT NULL, -- INSERT, UPDATE, DELETE
    OldValues     NVARCHAR(MAX)        NULL,
    NewValues     NVARCHAR(MAX)        NULL,
    ChangedBy     INT                  NULL,
    ChangedAt     DATETIME2            NOT NULL DEFAULT SYSUTCDATETIME(),
    IPAddress     NVARCHAR(50)         NULL,
    UserAgent     NVARCHAR(500)        NULL,
    CONSTRAINT PK_AuditLog PRIMARY KEY (AuditId)
);
GO

CREATE NONCLUSTERED INDEX IX_AuditLog_TableRecord ON Audit.AuditLog(TableName, RecordId);
CREATE NONCLUSTERED INDEX IX_AuditLog_ChangedBy ON Audit.AuditLog(ChangedBy);
GO

-- ============================================================
-- NOTIFICATION SCHEMA
-- ============================================================

CREATE TABLE Notify.NotificationTemplates (
    TemplateId      INT IDENTITY(1,1) NOT NULL,
    TemplateCode    NVARCHAR(100)     NOT NULL,
    Subject         NVARCHAR(300)     NOT NULL,
    BodyHtml        NVARCHAR(MAX)     NOT NULL,
    IsEmailEnabled  BIT               NOT NULL DEFAULT 1,
    IsInAppEnabled  BIT               NOT NULL DEFAULT 1,
    IsActive        BIT               NOT NULL DEFAULT 1,
    CONSTRAINT PK_NotificationTemplates PRIMARY KEY (TemplateId),
    CONSTRAINT UQ_NotificationTemplates UNIQUE (TemplateCode)
);
GO

CREATE TABLE Notify.Notifications (
    NotificationId  BIGINT IDENTITY(1,1) NOT NULL,
    UserId          INT                  NOT NULL,
    TemplateCode    NVARCHAR(100)        NULL,
    Title           NVARCHAR(300)        NOT NULL,
    Message         NVARCHAR(MAX)        NOT NULL,
    EntityType      NVARCHAR(100)        NULL,
    EntityId        INT                  NULL,
    IsRead          BIT                  NOT NULL DEFAULT 0,
    IsEmailSent     BIT                  NOT NULL DEFAULT 0,
    EmailSentAt     DATETIME2            NULL,
    CreatedAt       DATETIME2            NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Notifications PRIMARY KEY (NotificationId),
    CONSTRAINT FK_Notifications_Users FOREIGN KEY (UserId) REFERENCES Auth.Users(UserId)
);
GO

CREATE NONCLUSTERED INDEX IX_Notifications_UserId_IsRead ON Notify.Notifications(UserId, IsRead);
GO

-- ============================================================
-- FILE ATTACHMENTS (shared across modules)
-- ============================================================

CREATE TABLE Auth.FileAttachments (
    FileId          INT IDENTITY(1,1) NOT NULL,
    OriginalName    NVARCHAR(500)     NOT NULL,
    StoredName      NVARCHAR(500)     NOT NULL,
    FilePath        NVARCHAR(1000)    NOT NULL,
    MimeType        NVARCHAR(200)     NOT NULL,
    FileSizeBytes   BIGINT            NOT NULL,
    EntityType      NVARCHAR(100)     NULL,
    EntityId        INT               NULL,
    UploadedBy      INT               NOT NULL,
    UploadedAt      DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted       BIT               NOT NULL DEFAULT 0,
    CONSTRAINT PK_FileAttachments PRIMARY KEY (FileId),
    CONSTRAINT FK_FileAttachments_Users FOREIGN KEY (UploadedBy) REFERENCES Auth.Users(UserId)
);
GO

CREATE NONCLUSTERED INDEX IX_FileAttachments_Entity ON Auth.FileAttachments(EntityType, EntityId);
GO

PRINT 'Core/Auth schema created successfully.';
GO
