-- ============================================================
-- MMG EPM - Core Schema (Auth, Audit, Notifications)
-- Uses UNIQUEIDENTIFIER PKs to match ASP.NET Core entities
-- ============================================================

USE master;
GO

IF NOT EXISTS (SELECT 1 FROM sys.databases WHERE name = 'MMG_EPM')
    CREATE DATABASE MMG_EPM;
GO

USE MMG_EPM;
GO

-- Create schemas
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'Auth')   EXEC('CREATE SCHEMA Auth');
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'Project') EXEC('CREATE SCHEMA Project');
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'Document') EXEC('CREATE SCHEMA Document');
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'Procurement') EXEC('CREATE SCHEMA Procurement');
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'Inventory') EXEC('CREATE SCHEMA Inventory');
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'Resource') EXEC('CREATE SCHEMA Resource');
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'Budget')  EXEC('CREATE SCHEMA Budget');
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'Risk')    EXEC('CREATE SCHEMA Risk');
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'Audit')   EXEC('CREATE SCHEMA Audit');
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'Notify')  EXEC('CREATE SCHEMA Notify');
GO

-- ─── Auth.Users ───────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Users' AND SCHEMA_NAME(schema_id)='Auth')
BEGIN
    CREATE TABLE [Auth].[Users] (
        [Id]                  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
        [FirstName]           NVARCHAR(100)    NOT NULL,
        [LastName]            NVARCHAR(100)    NOT NULL,
        [Email]               NVARCHAR(256)    NOT NULL,
        [PasswordHash]        NVARCHAR(512)    NOT NULL,
        [Phone]               NVARCHAR(20)     NULL,
        [Department]          NVARCHAR(100)    NULL,
        [JobTitle]            NVARCHAR(100)    NULL,
        [IsActive]            BIT              NOT NULL DEFAULT 1,
        [MustChangePassword]  BIT              NOT NULL DEFAULT 0,
        [FailedLoginAttempts] INT              NOT NULL DEFAULT 0,
        [LockedUntil]         DATETIME2        NULL,
        [LastLoginAt]         DATETIME2        NULL,
        [RefreshToken]        NVARCHAR(512)    NULL,
        [RefreshTokenExpiry]  DATETIME2        NULL,
        [AvatarUrl]           NVARCHAR(500)    NULL,
        [CreatedAt]           DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        [UpdatedAt]           DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedById]         UNIQUEIDENTIFIER NULL,
        [UpdatedById]         UNIQUEIDENTIFIER NULL,
        [IsDeleted]           BIT              NOT NULL DEFAULT 0,
        [DeletedAt]           DATETIME2        NULL
    );
    CREATE UNIQUE INDEX [UX_Users_Email] ON [Auth].[Users]([Email]) WHERE [IsDeleted]=0;
    PRINT 'Created Auth.Users';
END
GO

-- ─── Auth.Roles ───────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Roles' AND SCHEMA_NAME(schema_id)='Auth')
BEGIN
    CREATE TABLE [Auth].[Roles] (
        [Id]          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
        [Name]        NVARCHAR(100)    NOT NULL,
        [Description] NVARCHAR(500)    NULL,
        [IsSystem]    BIT              NOT NULL DEFAULT 0,
        [CreatedAt]   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        [UpdatedAt]   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedById] UNIQUEIDENTIFIER NULL,
        [UpdatedById] UNIQUEIDENTIFIER NULL,
        [IsDeleted]   BIT              NOT NULL DEFAULT 0,
        [DeletedAt]   DATETIME2        NULL
    );
    CREATE UNIQUE INDEX [UX_Roles_Name] ON [Auth].[Roles]([Name]) WHERE [IsDeleted]=0;
    PRINT 'Created Auth.Roles';
END
GO

-- ─── Auth.UserRoles ───────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='UserRoles' AND SCHEMA_NAME(schema_id)='Auth')
BEGIN
    CREATE TABLE [Auth].[UserRoles] (
        [UserId]     UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Users]([Id]),
        [RoleId]     UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Roles]([Id]),
        [AssignedAt] DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_UserRoles PRIMARY KEY ([UserId],[RoleId])
    );
    PRINT 'Created Auth.UserRoles';
END
GO

-- ─── Auth.Permissions ────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Permissions' AND SCHEMA_NAME(schema_id)='Auth')
BEGIN
    CREATE TABLE [Auth].[Permissions] (
        [Id]          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
        [Name]        NVARCHAR(100)    NOT NULL,
        [Code]        NVARCHAR(100)    NOT NULL,
        [Module]      NVARCHAR(100)    NULL,
        [Description] NVARCHAR(500)    NULL,
        [CreatedAt]   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        [UpdatedAt]   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedById] UNIQUEIDENTIFIER NULL,
        [UpdatedById] UNIQUEIDENTIFIER NULL,
        [IsDeleted]   BIT              NOT NULL DEFAULT 0,
        [DeletedAt]   DATETIME2        NULL
    );
    PRINT 'Created Auth.Permissions';
END
GO

-- ─── Auth.RolePermissions ─────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='RolePermissions' AND SCHEMA_NAME(schema_id)='Auth')
BEGIN
    CREATE TABLE [Auth].[RolePermissions] (
        [RoleId]       UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Roles]([Id]),
        [PermissionId] UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Permissions]([Id]),
        CONSTRAINT PK_RolePermissions PRIMARY KEY ([RoleId],[PermissionId])
    );
    PRINT 'Created Auth.RolePermissions';
END
GO

-- ─── Auth.Countries ───────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Countries' AND SCHEMA_NAME(schema_id)='Auth')
BEGIN
    CREATE TABLE [Auth].[Countries] (
        [Id]           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
        [Name]         NVARCHAR(100)    NOT NULL,
        [Code]         NVARCHAR(3)      NULL,
        [CurrencyCode] NVARCHAR(10)     NULL,
        [CreatedAt]    DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        [UpdatedAt]    DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedById]  UNIQUEIDENTIFIER NULL,
        [UpdatedById]  UNIQUEIDENTIFIER NULL,
        [IsDeleted]    BIT              NOT NULL DEFAULT 0,
        [DeletedAt]    DATETIME2        NULL
    );
    PRINT 'Created Auth.Countries';
END
GO

-- ─── Auth.SBUCodes ────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='SBUCodes' AND SCHEMA_NAME(schema_id)='Auth')
BEGIN
    CREATE TABLE [Auth].[SBUCodes] (
        [Id]          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
        [Code]        NVARCHAR(20)     NOT NULL,
        [Name]        NVARCHAR(200)    NOT NULL,
        [Country]     NVARCHAR(50)     NULL,
        [IsActive]    BIT              NOT NULL DEFAULT 1,
        [CreatedAt]   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        [UpdatedAt]   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedById] UNIQUEIDENTIFIER NULL,
        [UpdatedById] UNIQUEIDENTIFIER NULL,
        [IsDeleted]   BIT              NOT NULL DEFAULT 0,
        [DeletedAt]   DATETIME2        NULL
    );
    PRINT 'Created Auth.SBUCodes';
END
GO

-- ─── Auth.FileAttachments ─────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='FileAttachments' AND SCHEMA_NAME(schema_id)='Auth')
BEGIN
    CREATE TABLE [Auth].[FileAttachments] (
        [Id]           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
        [FileName]     NVARCHAR(500)    NOT NULL,
        [FilePath]     NVARCHAR(1000)   NOT NULL,
        [FileUrl]      NVARCHAR(500)    NULL,
        [ContentType]  NVARCHAR(100)    NULL,
        [FileSize]     BIGINT           NOT NULL DEFAULT 0,
        [EntityType]   NVARCHAR(50)     NULL,
        [EntityId]     UNIQUEIDENTIFIER NULL,
        [UploadedById] UNIQUEIDENTIFIER NULL REFERENCES [Auth].[Users]([Id]),
        [CreatedAt]    DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        [UpdatedAt]    DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedById]  UNIQUEIDENTIFIER NULL,
        [UpdatedById]  UNIQUEIDENTIFIER NULL,
        [IsDeleted]    BIT              NOT NULL DEFAULT 0,
        [DeletedAt]    DATETIME2        NULL
    );
    PRINT 'Created Auth.FileAttachments';
END
GO

-- ─── Audit.AuditLog ───────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='AuditLog' AND SCHEMA_NAME(schema_id)='Audit')
BEGIN
    CREATE TABLE [Audit].[AuditLog] (
        [Id]          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
        [Action]      NVARCHAR(100)    NOT NULL,
        [EntityType]  NVARCHAR(100)    NOT NULL,
        [EntityId]    UNIQUEIDENTIFIER NOT NULL,
        [OldValues]   NVARCHAR(MAX)    NULL,
        [NewValues]   NVARCHAR(MAX)    NULL,
        [IpAddress]   NVARCHAR(50)     NULL,
        [UserAgent]   NVARCHAR(500)    NULL,
        [UserId]      UNIQUEIDENTIFIER NULL,
        [CreatedAt]   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        [UpdatedAt]   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedById] UNIQUEIDENTIFIER NULL,
        [UpdatedById] UNIQUEIDENTIFIER NULL,
        [IsDeleted]   BIT              NOT NULL DEFAULT 0,
        [DeletedAt]   DATETIME2        NULL
    );
    PRINT 'Created Audit.AuditLog';
END
GO

-- ─── Notify.NotificationTemplates ────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='NotificationTemplates' AND SCHEMA_NAME(schema_id)='Notify')
BEGIN
    CREATE TABLE [Notify].[NotificationTemplates] (
        [Id]          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
        [Code]        NVARCHAR(100)    NOT NULL,
        [Subject]     NVARCHAR(200)    NOT NULL,
        [Body]        NVARCHAR(MAX)    NOT NULL,
        [Channel]     NVARCHAR(50)     NOT NULL DEFAULT 'InApp',
        [IsActive]    BIT              NOT NULL DEFAULT 1,
        [CreatedAt]   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        [UpdatedAt]   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedById] UNIQUEIDENTIFIER NULL,
        [UpdatedById] UNIQUEIDENTIFIER NULL,
        [IsDeleted]   BIT              NOT NULL DEFAULT 0,
        [DeletedAt]   DATETIME2        NULL
    );
    PRINT 'Created Notify.NotificationTemplates';
END
GO

-- ─── Notify.Notifications ─────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Notifications' AND SCHEMA_NAME(schema_id)='Notify')
BEGIN
    CREATE TABLE [Notify].[Notifications] (
        [Id]          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
        [UserId]      UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Users]([Id]),
        [Title]       NVARCHAR(200)    NOT NULL,
        [Message]     NVARCHAR(MAX)    NOT NULL,
        [Type]        NVARCHAR(50)     NULL,
        [Module]      NVARCHAR(50)     NULL,
        [EntityId]    UNIQUEIDENTIFIER NULL,
        [ActionUrl]   NVARCHAR(500)    NULL,
        [IsRead]      BIT              NOT NULL DEFAULT 0,
        [ReadAt]      DATETIME2        NULL,
        [CreatedAt]   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        [UpdatedAt]   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedById] UNIQUEIDENTIFIER NULL,
        [UpdatedById] UNIQUEIDENTIFIER NULL,
        [IsDeleted]   BIT              NOT NULL DEFAULT 0,
        [DeletedAt]   DATETIME2        NULL
    );
    CREATE INDEX [IX_Notifications_UserId_IsRead] ON [Notify].[Notifications]([UserId],[IsRead]);
    PRINT 'Created Notify.Notifications';
END
GO

PRINT '=== 01_Schema_Core complete ===';
GO
