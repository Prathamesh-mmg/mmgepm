-- ============================================================
-- MMG EPM — COMPLETE FRESH INSTALL SCRIPT
-- Database: MMG_EPM
-- ============================================================
-- HOW TO RUN:
--   1. Open SQL Server Management Studio (SSMS)
--   2. Connect to your SQL Server (NOT to a specific DB)
--   3. File → Open → select this file
--   4. Press F5 to execute
--   5. Wait for "=== MMG EPM Install Complete ===" at the bottom
-- ============================================================
-- Default Login:  admin@mmgepm.com  /  Admin@123
-- ============================================================

USE master;
GO

-- Drop and recreate the database fresh
IF EXISTS (SELECT 1 FROM sys.databases WHERE name = 'MMG_EPM')
BEGIN
    ALTER DATABASE MMG_EPM SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE MMG_EPM;
    PRINT 'Old MMG_EPM database dropped.';
END
GO

CREATE DATABASE MMG_EPM COLLATE SQL_Latin1_General_CP1_CI_AS;
GO

USE MMG_EPM;
GO

EXEC('CREATE SCHEMA [Auth]');
EXEC('CREATE SCHEMA [Audit]');
EXEC('CREATE SCHEMA [Notify]');
EXEC('CREATE SCHEMA [Project]');
EXEC('CREATE SCHEMA [Document]');
EXEC('CREATE SCHEMA [Procurement]');
EXEC('CREATE SCHEMA [Inventory]');
EXEC('CREATE SCHEMA [Resource]');
EXEC('CREATE SCHEMA [Budget]');
EXEC('CREATE SCHEMA [Risk]');
GO
PRINT '=== Schemas created ===';
GO

-- ============================================================
-- AUTH SCHEMA
-- ============================================================
CREATE TABLE [Auth].[Users] (
    [Id]                  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [FirstName]           NVARCHAR(100) NOT NULL,
    [LastName]            NVARCHAR(100) NOT NULL,
    [Email]               NVARCHAR(256) NOT NULL,
    [PasswordHash]        NVARCHAR(512) NOT NULL,
    [Phone]               NVARCHAR(20) NULL,
    [Department]          NVARCHAR(100) NULL,
    [JobTitle]            NVARCHAR(100) NULL,
    [IsActive]            BIT NOT NULL DEFAULT 1,
    [MustChangePassword]  BIT NOT NULL DEFAULT 0,
    [FailedLoginAttempts] INT NOT NULL DEFAULT 0,
    [LockedUntil]         DATETIME2 NULL,
    [LastLoginAt]         DATETIME2 NULL,
    [RefreshToken]        NVARCHAR(512) NULL,
    [RefreshTokenExpiry]  DATETIME2 NULL,
    [AvatarUrl]           NVARCHAR(500) NULL,
    [CreatedAt]           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]         UNIQUEIDENTIFIER NULL,
    [UpdatedById]         UNIQUEIDENTIFIER NULL,
    [IsDeleted]           BIT NOT NULL DEFAULT 0,
    [DeletedAt]           DATETIME2 NULL
);
CREATE UNIQUE INDEX [UX_Users_Email] ON [Auth].[Users]([Email]) WHERE [IsDeleted]=0;
GO

CREATE TABLE [Auth].[Roles] (
    [Id]          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [Name]        NVARCHAR(100) NOT NULL,
    [Description] NVARCHAR(500) NULL,
    [IsSystem]    BIT NOT NULL DEFAULT 0,
    [CreatedAt]   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById] UNIQUEIDENTIFIER NULL,
    [UpdatedById] UNIQUEIDENTIFIER NULL,
    [IsDeleted]   BIT NOT NULL DEFAULT 0,
    [DeletedAt]   DATETIME2 NULL
);
CREATE UNIQUE INDEX [UX_Roles_Name] ON [Auth].[Roles]([Name]) WHERE [IsDeleted]=0;
GO

CREATE TABLE [Auth].[UserRoles] (
    [UserId]     UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Users]([Id]),
    [RoleId]     UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Roles]([Id]),
    [AssignedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT [PK_UserRoles] PRIMARY KEY ([UserId],[RoleId])
);
GO

CREATE TABLE [Auth].[Permissions] (
    [Id]          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [Name]        NVARCHAR(100) NOT NULL,
    [Code]        NVARCHAR(100) NOT NULL,
    [Module]      NVARCHAR(100) NULL,
    [Description] NVARCHAR(500) NULL,
    [CreatedAt]   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById] UNIQUEIDENTIFIER NULL,
    [UpdatedById] UNIQUEIDENTIFIER NULL,
    [IsDeleted]   BIT NOT NULL DEFAULT 0,
    [DeletedAt]   DATETIME2 NULL
);
GO

CREATE TABLE [Auth].[RolePermissions] (
    [RoleId]       UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Roles]([Id]),
    [PermissionId] UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Permissions]([Id]),
    CONSTRAINT [PK_RolePermissions] PRIMARY KEY ([RoleId],[PermissionId])
);
GO

CREATE TABLE [Auth].[Countries] (
    [Id]           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [Name]         NVARCHAR(100) NOT NULL,
    [Code]         NVARCHAR(10) NULL,
    [CurrencyCode] NVARCHAR(10) NULL,
    [CreatedAt]    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]  UNIQUEIDENTIFIER NULL,
    [UpdatedById]  UNIQUEIDENTIFIER NULL,
    [IsDeleted]    BIT NOT NULL DEFAULT 0,
    [DeletedAt]    DATETIME2 NULL
);
GO

CREATE TABLE [Auth].[SBUCodes] (
    [Id]          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [Code]        NVARCHAR(20) NOT NULL,
    [Name]        NVARCHAR(200) NOT NULL,
    [Country]     NVARCHAR(100) NULL,
    [IsActive]    BIT NOT NULL DEFAULT 1,
    [CreatedAt]   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById] UNIQUEIDENTIFIER NULL,
    [UpdatedById] UNIQUEIDENTIFIER NULL,
    [IsDeleted]   BIT NOT NULL DEFAULT 0,
    [DeletedAt]   DATETIME2 NULL
);
GO

CREATE TABLE [Auth].[FileAttachments] (
    [Id]           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [FileName]     NVARCHAR(500) NOT NULL,
    [FilePath]     NVARCHAR(1000) NOT NULL,
    [FileUrl]      NVARCHAR(500) NULL,
    [ContentType]  NVARCHAR(100) NULL,
    [FileSize]     BIGINT NOT NULL DEFAULT 0,
    [EntityType]   NVARCHAR(100) NULL,
    [EntityId]     UNIQUEIDENTIFIER NULL,
    [UploadedById] UNIQUEIDENTIFIER NULL REFERENCES [Auth].[Users]([Id]),
    [CreatedAt]    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]  UNIQUEIDENTIFIER NULL,
    [UpdatedById]  UNIQUEIDENTIFIER NULL,
    [IsDeleted]    BIT NOT NULL DEFAULT 0,
    [DeletedAt]    DATETIME2 NULL
);
GO
PRINT '=== Auth done ===';
GO

-- ============================================================
-- AUDIT + NOTIFY
-- ============================================================
CREATE TABLE [Audit].[AuditLog] (
    [Id]          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [Action]      NVARCHAR(100) NOT NULL,
    [EntityType]  NVARCHAR(100) NOT NULL,
    [EntityId]    UNIQUEIDENTIFIER NOT NULL,
    [OldValues]   NVARCHAR(MAX) NULL,
    [NewValues]   NVARCHAR(MAX) NULL,
    [IpAddress]   NVARCHAR(50) NULL,
    [UserAgent]   NVARCHAR(500) NULL,
    [UserId]      UNIQUEIDENTIFIER NULL REFERENCES [Auth].[Users]([Id]),
    [CreatedAt]   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById] UNIQUEIDENTIFIER NULL,
    [UpdatedById] UNIQUEIDENTIFIER NULL,
    [IsDeleted]   BIT NOT NULL DEFAULT 0,
    [DeletedAt]   DATETIME2 NULL
);
GO

CREATE TABLE [Notify].[NotificationTemplates] (
    [Id]          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [Code]        NVARCHAR(100) NOT NULL,
    [Subject]     NVARCHAR(200) NOT NULL,
    [Body]        NVARCHAR(MAX) NOT NULL,
    [Channel]     NVARCHAR(50) NOT NULL DEFAULT 'InApp',
    [IsActive]    BIT NOT NULL DEFAULT 1,
    [CreatedAt]   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById] UNIQUEIDENTIFIER NULL,
    [UpdatedById] UNIQUEIDENTIFIER NULL,
    [IsDeleted]   BIT NOT NULL DEFAULT 0,
    [DeletedAt]   DATETIME2 NULL
);
CREATE UNIQUE INDEX [UX_NotifTemplates_Code] ON [Notify].[NotificationTemplates]([Code]) WHERE [IsDeleted]=0;
GO

CREATE TABLE [Notify].[Notifications] (
    [Id]          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [UserId]      UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Users]([Id]),
    [Title]       NVARCHAR(200) NOT NULL,
    [Message]     NVARCHAR(MAX) NOT NULL,
    [Type]        NVARCHAR(50) NULL,
    [Module]      NVARCHAR(50) NULL,
    [EntityId]    UNIQUEIDENTIFIER NULL,
    [ActionUrl]   NVARCHAR(500) NULL,
    [IsRead]      BIT NOT NULL DEFAULT 0,
    [ReadAt]      DATETIME2 NULL,
    [CreatedAt]   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById] UNIQUEIDENTIFIER NULL,
    [UpdatedById] UNIQUEIDENTIFIER NULL,
    [IsDeleted]   BIT NOT NULL DEFAULT 0,
    [DeletedAt]   DATETIME2 NULL
);
CREATE INDEX [IX_Notifications_User_Read] ON [Notify].[Notifications]([UserId],[IsRead]);
GO
PRINT '=== Audit + Notify done ===';
GO

-- ============================================================
-- PROJECT SCHEMA
-- ============================================================
CREATE TABLE [Project].[Projects] (
    [Id]                 UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [Name]               NVARCHAR(300) NOT NULL,
    [Code]               NVARCHAR(50) NOT NULL,
    [Description]        NVARCHAR(2000) NULL,
    [ProjectType]        NVARCHAR(100) NULL,
    [Country]            NVARCHAR(100) NULL,
    [Location]           NVARCHAR(300) NULL,
    [SBUCode]            NVARCHAR(50) NULL,
    [StartDate]          DATETIME2 NOT NULL,
    [ExpectedEndDate]    DATETIME2 NULL,
    [ActualEndDate]      DATETIME2 NULL,
    [Budget]             DECIMAL(18,2) NULL,
    [Currency]           NVARCHAR(10) NULL DEFAULT 'USD',
    [ClientName]         NVARCHAR(300) NULL,
    [ClientContact]      NVARCHAR(200) NULL,
    [Status]             NVARCHAR(50) NOT NULL DEFAULT 'Planning',
    [OverallProgress]    DECIMAL(5,2) NOT NULL DEFAULT 0,
    [ProjectManagerId]   UNIQUEIDENTIFIER NULL REFERENCES [Auth].[Users]([Id]),
    [ProjectHeadId]      UNIQUEIDENTIFIER NULL REFERENCES [Auth].[Users]([Id]),
    [PlanningEngineerId] UNIQUEIDENTIFIER NULL REFERENCES [Auth].[Users]([Id]),
    [CreatedAt]          DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]          DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]        UNIQUEIDENTIFIER NULL,
    [UpdatedById]        UNIQUEIDENTIFIER NULL,
    [IsDeleted]          BIT NOT NULL DEFAULT 0,
    [DeletedAt]          DATETIME2 NULL
);
CREATE UNIQUE INDEX [UX_Projects_Code] ON [Project].[Projects]([Code]) WHERE [IsDeleted]=0;
CREATE INDEX [IX_Projects_Status] ON [Project].[Projects]([Status]);
GO

CREATE TABLE [Project].[SubProjects] (
    [Id]          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [ProjectId]   UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Projects]([Id]),
    [Name]        NVARCHAR(300) NOT NULL,
    [Code]        NVARCHAR(50) NULL,
    [Description] NVARCHAR(1000) NULL,
    [Status]      NVARCHAR(50) NOT NULL DEFAULT 'Active',
    [CreatedAt]   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById] UNIQUEIDENTIFIER NULL,
    [UpdatedById] UNIQUEIDENTIFIER NULL,
    [IsDeleted]   BIT NOT NULL DEFAULT 0,
    [DeletedAt]   DATETIME2 NULL
);
GO

CREATE TABLE [Project].[ProjectMembers] (
    [Id]          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [ProjectId]   UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Projects]([Id]),
    [UserId]      UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Users]([Id]),
    [ProjectRole] NVARCHAR(100) NOT NULL DEFAULT 'Member',
    [JoinedAt]    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [LeftAt]      DATETIME2 NULL,
    [IsActive]    BIT NOT NULL DEFAULT 1,
    [CreatedAt]   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById] UNIQUEIDENTIFIER NULL,
    [UpdatedById] UNIQUEIDENTIFIER NULL,
    [IsDeleted]   BIT NOT NULL DEFAULT 0,
    [DeletedAt]   DATETIME2 NULL
);
CREATE UNIQUE INDEX [UX_ProjectMembers] ON [Project].[ProjectMembers]([ProjectId],[UserId]) WHERE [IsDeleted]=0;
GO

CREATE TABLE [Project].[Tasks] (
    [Id]                 UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [ProjectId]          UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Projects]([Id]),
    [SubProjectId]       UNIQUEIDENTIFIER NULL REFERENCES [Project].[SubProjects]([Id]),
    [ParentTaskId]       UNIQUEIDENTIFIER NULL REFERENCES [Project].[Tasks]([Id]),
    [Name]               NVARCHAR(500) NOT NULL,
    [Description]        NVARCHAR(2000) NULL,
    [WbsCode]            NVARCHAR(50) NULL,
    [Level]              INT NOT NULL DEFAULT 1,
    [StartDate]          DATETIME2 NULL,
    [EndDate]            DATETIME2 NULL,
    [EstimatedHours]     DECIMAL(10,2) NULL,
    [ActualHours]        DECIMAL(10,2) NULL,
    [EstimatedCost]      DECIMAL(18,2) NULL,
    [ActualCost]         DECIMAL(18,2) NULL,
    [Status]             NVARCHAR(50) NOT NULL DEFAULT 'NotStarted',
    [Priority]           NVARCHAR(20) NOT NULL DEFAULT 'Medium',
    [ProgressPercentage] DECIMAL(5,2) NOT NULL DEFAULT 0,
    [AssigneeId]         UNIQUEIDENTIFIER NULL REFERENCES [Auth].[Users]([Id]),
    [IsMilestone]        BIT NOT NULL DEFAULT 0,
    [HasChildren]        BIT NOT NULL DEFAULT 0,
    [SortOrder]          INT NOT NULL DEFAULT 0,
    [CreatedAt]          DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]          DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]        UNIQUEIDENTIFIER NULL,
    [UpdatedById]        UNIQUEIDENTIFIER NULL,
    [IsDeleted]          BIT NOT NULL DEFAULT 0,
    [DeletedAt]          DATETIME2 NULL
);
CREATE INDEX [IX_Tasks_Project_Status] ON [Project].[Tasks]([ProjectId],[Status]);
CREATE INDEX [IX_Tasks_Parent] ON [Project].[Tasks]([ParentTaskId]);
CREATE INDEX [IX_Tasks_EndDate] ON [Project].[Tasks]([EndDate],[Status]);
GO

CREATE TABLE [Project].[TaskAssignees] (
    [Id]          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [TaskId]      UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Tasks]([Id]),
    [UserId]      UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Users]([Id]),
    [Role]        NVARCHAR(100) NULL,
    [AssignedAt]  DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedAt]   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById] UNIQUEIDENTIFIER NULL,
    [UpdatedById] UNIQUEIDENTIFIER NULL,
    [IsDeleted]   BIT NOT NULL DEFAULT 0,
    [DeletedAt]   DATETIME2 NULL
);
CREATE UNIQUE INDEX [UX_TaskAssignees] ON [Project].[TaskAssignees]([TaskId],[UserId]) WHERE [IsDeleted]=0;
GO

CREATE TABLE [Project].[WorkProgress] (
    [Id]                 UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [TaskId]             UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Tasks]([Id]),
    [Notes]              NVARCHAR(2000) NULL,
    [ProgressPercentage] DECIMAL(5,2) NOT NULL DEFAULT 0,
    [HoursLogged]        DECIMAL(10,2) NULL,
    [ReportedAt]         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedById]        UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Users]([Id]),
    [CreatedAt]          DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]          DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]        UNIQUEIDENTIFIER NULL,
    [IsDeleted]          BIT NOT NULL DEFAULT 0,
    [DeletedAt]          DATETIME2 NULL
);
GO

CREATE TABLE [Project].[WorkProgressPhotos] (
    [Id]             UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [WorkProgressId] UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[WorkProgress]([Id]),
    [FileName]       NVARCHAR(500) NOT NULL,
    [FilePath]       NVARCHAR(1000) NOT NULL,
    [FileUrl]        NVARCHAR(500) NULL,
    [Caption]        NVARCHAR(300) NULL,
    [FileSize]       BIGINT NOT NULL DEFAULT 0,
    [CreatedAt]      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]    UNIQUEIDENTIFIER NULL,
    [UpdatedById]    UNIQUEIDENTIFIER NULL,
    [IsDeleted]      BIT NOT NULL DEFAULT 0,
    [DeletedAt]      DATETIME2 NULL
);
GO

CREATE TABLE [Project].[TaskDelays] (
    [Id]          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [TaskId]      UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Tasks]([Id]),
    [DelayType]   NVARCHAR(50) NOT NULL,
    [DelayHours]  DECIMAL(10,2) NOT NULL,
    [Description] NVARCHAR(2000) NULL,
    [LoggedById]  UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Users]([Id]),
    [CreatedAt]   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById] UNIQUEIDENTIFIER NULL,
    [UpdatedById] UNIQUEIDENTIFIER NULL,
    [IsDeleted]   BIT NOT NULL DEFAULT 0,
    [DeletedAt]   DATETIME2 NULL
);
GO

CREATE TABLE [Project].[TaskComments] (
    [Id]              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [TaskId]          UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Tasks]([Id]),
    [UserId]          UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Users]([Id]),
    [Content]         NVARCHAR(MAX) NOT NULL,
    [ParentCommentId] UNIQUEIDENTIFIER NULL REFERENCES [Project].[TaskComments]([Id]),
    [CreatedAt]       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]     UNIQUEIDENTIFIER NULL,
    [UpdatedById]     UNIQUEIDENTIFIER NULL,
    [IsDeleted]       BIT NOT NULL DEFAULT 0,
    [DeletedAt]       DATETIME2 NULL
);
GO

CREATE TABLE [Project].[TaskDependencies] (
    [Id]             UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [TaskId]         UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Tasks]([Id]),
    [PredecessorId]  UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Tasks]([Id]),
    [DependencyType] NVARCHAR(10) NOT NULL DEFAULT 'FS',
    [LagDays]        INT NOT NULL DEFAULT 0,
    [CreatedAt]      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]    UNIQUEIDENTIFIER NULL,
    [UpdatedById]    UNIQUEIDENTIFIER NULL,
    [IsDeleted]      BIT NOT NULL DEFAULT 0,
    [DeletedAt]      DATETIME2 NULL
);
CREATE UNIQUE INDEX [UX_TaskDependencies] ON [Project].[TaskDependencies]([TaskId],[PredecessorId]) WHERE [IsDeleted]=0;
GO

CREATE TABLE [Project].[Contractors] (
    [Id]             UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [Name]           NVARCHAR(300) NOT NULL,
    [Code]           NVARCHAR(50) NULL,
    [ContactPerson]  NVARCHAR(200) NULL,
    [Email]          NVARCHAR(256) NULL,
    [Phone]          NVARCHAR(30) NULL,
    [Country]        NVARCHAR(100) NULL,
    [Address]        NVARCHAR(500) NULL,
    [ContractorType] NVARCHAR(100) NULL,
    [IsActive]       BIT NOT NULL DEFAULT 1,
    [CreatedAt]      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]    UNIQUEIDENTIFIER NULL,
    [UpdatedById]    UNIQUEIDENTIFIER NULL,
    [IsDeleted]      BIT NOT NULL DEFAULT 0,
    [DeletedAt]      DATETIME2 NULL
);
GO

CREATE TABLE [Project].[LabourCategories] (
    [Id]               UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [Name]             NVARCHAR(100) NOT NULL,
    [TradeCode]        NVARCHAR(50) NULL,
    [DefaultDailyRate] DECIMAL(18,2) NULL,
    [Currency]         NVARCHAR(10) NULL DEFAULT 'USD',
    [IsActive]         BIT NOT NULL DEFAULT 1,
    [CreatedAt]        DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]        DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]      UNIQUEIDENTIFIER NULL,
    [UpdatedById]      UNIQUEIDENTIFIER NULL,
    [IsDeleted]        BIT NOT NULL DEFAULT 0,
    [DeletedAt]        DATETIME2 NULL
);
GO

CREATE TABLE [Project].[CrewAttendance] (
    [Id]               UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [ProjectId]        UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Projects]([Id]),
    [ContractorId]     UNIQUEIDENTIFIER NULL REFERENCES [Project].[Contractors]([Id]),
    [LabourCategoryId] UNIQUEIDENTIFIER NULL REFERENCES [Project].[LabourCategories]([Id]),
    [AttendanceDate]   DATETIME2 NOT NULL,
    [LabourName]       NVARCHAR(300) NOT NULL,
    [TradeName]        NVARCHAR(100) NULL,
    [Status]           NVARCHAR(30) NOT NULL DEFAULT 'Present',
    [HoursWorked]      DECIMAL(10,2) NULL,
    [DailyRate]        DECIMAL(18,2) NULL,
    [Notes]            NVARCHAR(500) NULL,
    [RecordedById]     UNIQUEIDENTIFIER NULL REFERENCES [Auth].[Users]([Id]),
    [ApprovalStatus]   NVARCHAR(50) NOT NULL DEFAULT 'Pending',
    [ApprovedById]     UNIQUEIDENTIFIER NULL REFERENCES [Auth].[Users]([Id]),
    [ApprovedAt]       DATETIME2 NULL,
    [RejectionRemarks] NVARCHAR(500) NULL,
    [TradeCode]        NVARCHAR(100) NULL,
    [PlannedCount]     INT NULL,
    [ActualCount]      INT NULL,
    [CreatedAt]        DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]        DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]      UNIQUEIDENTIFIER NULL,
    [UpdatedById]      UNIQUEIDENTIFIER NULL,
    [IsDeleted]        BIT NOT NULL DEFAULT 0,
    [DeletedAt]        DATETIME2 NULL
);
CREATE INDEX [IX_CrewAttendance_ProjectDate] ON [Project].[CrewAttendance]([ProjectId],[AttendanceDate]);
GO

CREATE TABLE [Project].[DPRReports] (
    [Id]                 UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [ProjectId]          UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Projects]([Id]),
    [ReportDate]         DATETIME2 NOT NULL,
    [WorkCompleted]      NVARCHAR(MAX) NULL,
    [PlannedForTomorrow] NVARCHAR(MAX) NULL,
    [Issues]             NVARCHAR(MAX) NULL,
    [SafetyObservations] NVARCHAR(MAX) NULL,
    [LabourCount]        INT NULL,
    [EquipmentCount]     INT NULL,
    [WeatherTemperature] DECIMAL(5,2) NULL,
    [WeatherCondition]   NVARCHAR(100) NULL,
    [Status]             NVARCHAR(50) NOT NULL DEFAULT 'Draft',
    [SubmittedById]      UNIQUEIDENTIFIER NULL REFERENCES [Auth].[Users]([Id]),
    [SubmittedAt]        DATETIME2 NULL,
    [ApprovedById]       UNIQUEIDENTIFIER NULL REFERENCES [Auth].[Users]([Id]),
    [ApprovedAt]         DATETIME2 NULL,
    [RejectionReason]    NVARCHAR(500) NULL,
    [LocationOfWork]     NVARCHAR(500) NULL,
    [WeatherType]        NVARCHAR(50) NULL,
    [PdfPath]            NVARCHAR(1000) NULL,
    [IsAutoGenerated]    BIT NOT NULL DEFAULT 0,
    [CreatedAt]          DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]          DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]        UNIQUEIDENTIFIER NULL,
    [UpdatedById]        UNIQUEIDENTIFIER NULL,
    [IsDeleted]          BIT NOT NULL DEFAULT 0,
    [DeletedAt]          DATETIME2 NULL
);
CREATE INDEX [IX_DPRReports_ProjectDate] ON [Project].[DPRReports]([ProjectId],[ReportDate]);
GO
PRINT '=== Project schema done ===';
GO

-- ============================================================
-- DOCUMENT SCHEMA
-- ============================================================
CREATE TABLE [Document].[FolderTemplates] (
    [Id]          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [Name]        NVARCHAR(300) NOT NULL,
    [Description] NVARCHAR(500) NULL,
    [ParentId]    UNIQUEIDENTIFIER NULL REFERENCES [Document].[FolderTemplates]([Id]),
    [SortOrder]   INT NOT NULL DEFAULT 0,
    [IsDefault]   BIT NOT NULL DEFAULT 0,
    [CreatedAt]   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById] UNIQUEIDENTIFIER NULL,
    [UpdatedById] UNIQUEIDENTIFIER NULL,
    [IsDeleted]   BIT NOT NULL DEFAULT 0,
    [DeletedAt]   DATETIME2 NULL
);
GO

CREATE TABLE [Document].[ProjectFolders] (
    [Id]          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [ProjectId]   UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Projects]([Id]),
    [ParentId]    UNIQUEIDENTIFIER NULL REFERENCES [Document].[ProjectFolders]([Id]),
    [TemplateId]  UNIQUEIDENTIFIER NULL REFERENCES [Document].[FolderTemplates]([Id]),
    [Name]        NVARCHAR(300) NOT NULL,
    [SortOrder]   INT NOT NULL DEFAULT 0,
    [CreatedAt]   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById] UNIQUEIDENTIFIER NULL,
    [UpdatedById] UNIQUEIDENTIFIER NULL,
    [IsDeleted]   BIT NOT NULL DEFAULT 0,
    [DeletedAt]   DATETIME2 NULL
);
GO

CREATE TABLE [Document].[Documents] (
    [Id]             UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [ProjectId]      UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Projects]([Id]),
    [FolderId]       UNIQUEIDENTIFIER NULL REFERENCES [Document].[ProjectFolders]([Id]),
    [Title]          NVARCHAR(500) NOT NULL,
    [Description]    NVARCHAR(2000) NULL,
    [FileName]       NVARCHAR(500) NOT NULL DEFAULT '',
    [FilePath]       NVARCHAR(1000) NOT NULL DEFAULT '',
    [FileUrl]        NVARCHAR(500) NULL,
    [ContentType]    NVARCHAR(100) NULL,
    [FileSize]       BIGINT NOT NULL DEFAULT 0,
    [RevisionNumber] NVARCHAR(20) NOT NULL DEFAULT 'Rev.0',
    [DocumentType]   NVARCHAR(100) NOT NULL DEFAULT 'General',
    [Status]         NVARCHAR(50) NOT NULL DEFAULT 'Draft',
    [UploadedById]   UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Users]([Id]),
    [ExpiryDate]     DATETIME2 NULL,
    [CreatedAt]      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]    UNIQUEIDENTIFIER NULL,
    [UpdatedById]    UNIQUEIDENTIFIER NULL,
    [IsDeleted]      BIT NOT NULL DEFAULT 0,
    [DeletedAt]      DATETIME2 NULL
);
GO

CREATE TABLE [Document].[Drawings] (
    [Id]               UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [ProjectId]        UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Projects]([Id]),
    [DrawingNumber]    NVARCHAR(100) NOT NULL,
    [Title]            NVARCHAR(500) NOT NULL,
    [Discipline]       NVARCHAR(100) NULL,
    [Scale]            NVARCHAR(50) NULL,
    [Revision]         NVARCHAR(20) NOT NULL DEFAULT 'Rev.0',
    [Status]           NVARCHAR(50) NOT NULL DEFAULT 'IFR',
    [FileAttachmentId] UNIQUEIDENTIFIER NULL REFERENCES [Auth].[FileAttachments]([Id]),
    [UploadedById]     UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Users]([Id]),
    [CreatedAt]        DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]        DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]      UNIQUEIDENTIFIER NULL,
    [UpdatedById]      UNIQUEIDENTIFIER NULL,
    [IsDeleted]        BIT NOT NULL DEFAULT 0,
    [DeletedAt]        DATETIME2 NULL
);
GO

CREATE TABLE [Document].[DrawingVersions] (
    [Id]            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [DrawingId]     UNIQUEIDENTIFIER NOT NULL REFERENCES [Document].[Drawings]([Id]),
    [VersionNumber] INT NOT NULL DEFAULT 1,
    [Revision]      NVARCHAR(20) NOT NULL,
    [FilePath]      NVARCHAR(1000) NULL,
    [FileUrl]       NVARCHAR(500) NULL,
    [Notes]         NVARCHAR(1000) NULL,
    [Status]        NVARCHAR(50) NOT NULL DEFAULT 'IFR',
    [RevisedById]   UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Users]([Id]),
    [CreatedAt]     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]   UNIQUEIDENTIFIER NULL,
    [UpdatedById]   UNIQUEIDENTIFIER NULL,
    [IsDeleted]     BIT NOT NULL DEFAULT 0,
    [DeletedAt]     DATETIME2 NULL
);
GO

CREATE TABLE [Document].[ChangeRequests] (
    [Id]                 UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [ProjectId]          UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Projects]([Id]),
    [CrNumber]           NVARCHAR(50) NOT NULL,
    [Title]              NVARCHAR(500) NOT NULL,
    [Description]        NVARCHAR(3000) NULL,
    [Reason]             NVARCHAR(1000) NULL,
    [Impact]             NVARCHAR(1000) NULL,
    [CostImpact]         DECIMAL(18,2) NULL,
    [ScheduleImpactDays] INT NULL,
    [Status]             NVARCHAR(50) NOT NULL DEFAULT 'Draft',
    [SubmittedById]      UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Users]([Id]),
    [ReviewedById]       UNIQUEIDENTIFIER NULL REFERENCES [Auth].[Users]([Id]),
    [ReviewedAt]         DATETIME2 NULL,
    [ReviewComments]     NVARCHAR(2000) NULL,
    [CreatedAt]          DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]          DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]        UNIQUEIDENTIFIER NULL,
    [UpdatedById]        UNIQUEIDENTIFIER NULL,
    [IsDeleted]          BIT NOT NULL DEFAULT 0,
    [DeletedAt]          DATETIME2 NULL
);
CREATE UNIQUE INDEX [UX_CR_Number] ON [Document].[ChangeRequests]([ProjectId],[CrNumber]) WHERE [IsDeleted]=0;
GO

CREATE TABLE [Document].[ChangeRequestLogs] (
    [Id]              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [ChangeRequestId] UNIQUEIDENTIFIER NOT NULL REFERENCES [Document].[ChangeRequests]([Id]),
    [FromState]       NVARCHAR(50) NOT NULL,
    [ToState]         NVARCHAR(50) NOT NULL,
    [Comments]        NVARCHAR(2000) NULL,
    [ChangedById]     UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Users]([Id]),
    [CreatedAt]       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]     UNIQUEIDENTIFIER NULL,
    [UpdatedById]     UNIQUEIDENTIFIER NULL,
    [IsDeleted]       BIT NOT NULL DEFAULT 0,
    [DeletedAt]       DATETIME2 NULL
);
GO
PRINT '=== Document schema done ===';
GO

-- ============================================================
-- PROCUREMENT SCHEMA
-- ============================================================
CREATE TABLE [Procurement].[Vendors] (
    [Id]            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [Name]          NVARCHAR(300) NOT NULL,
    [VendorCode]    NVARCHAR(50) NOT NULL,
    [ContactPerson] NVARCHAR(200) NULL,
    [Email]         NVARCHAR(256) NULL,
    [Phone]         NVARCHAR(30) NULL,
    [Country]       NVARCHAR(100) NULL,
    [Address]       NVARCHAR(500) NULL,
    [Category]      NVARCHAR(100) NULL,
    [TaxId]         NVARCHAR(100) NULL,
    [BankName]      NVARCHAR(200) NULL,
    [BankAccount]   NVARCHAR(100) NULL,
    [IsApproved]    BIT NOT NULL DEFAULT 0,
    [IsActive]      BIT NOT NULL DEFAULT 1,
    [CreditDays]    INT NULL,
    [CreatedAt]     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]   UNIQUEIDENTIFIER NULL,
    [UpdatedById]   UNIQUEIDENTIFIER NULL,
    [IsDeleted]     BIT NOT NULL DEFAULT 0,
    [DeletedAt]     DATETIME2 NULL
);
CREATE UNIQUE INDEX [UX_Vendors_Code] ON [Procurement].[Vendors]([VendorCode]) WHERE [IsDeleted]=0;
GO

CREATE TABLE [Procurement].[MaterialRequests] (
    [Id]               UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [ProjectId]        UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Projects]([Id]),
    [MrNumber]         NVARCHAR(50) NOT NULL,
    [Title]            NVARCHAR(500) NOT NULL,
    [Justification]    NVARCHAR(2000) NULL,
    [Priority]         NVARCHAR(20) NOT NULL DEFAULT 'Medium',
    [RequiredDate]     DATETIME2 NULL,
    [Status]           NVARCHAR(50) NOT NULL DEFAULT 'Draft',
    [RequestedById]    UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Users]([Id]),
    [PMApprovedById]   UNIQUEIDENTIFIER NULL REFERENCES [Auth].[Users]([Id]),
    [PMApprovedAt]     DATETIME2 NULL,
    [PurchaseDeptById] UNIQUEIDENTIFIER NULL REFERENCES [Auth].[Users]([Id]),
    [SentToPurchaseAt] DATETIME2 NULL,
    [RejectionReason]  NVARCHAR(500) NULL,
    [CreatedAt]        DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]        DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]      UNIQUEIDENTIFIER NULL,
    [UpdatedById]      UNIQUEIDENTIFIER NULL,
    [IsDeleted]        BIT NOT NULL DEFAULT 0,
    [DeletedAt]        DATETIME2 NULL
);
CREATE UNIQUE INDEX [UX_MR_Number] ON [Procurement].[MaterialRequests]([MrNumber]) WHERE [IsDeleted]=0;
GO

CREATE TABLE [Procurement].[MRLineItems] (
    [Id]                UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [MaterialRequestId] UNIQUEIDENTIFIER NOT NULL REFERENCES [Procurement].[MaterialRequests]([Id]),
    [Description]       NVARCHAR(500) NOT NULL,
    [Unit]              NVARCHAR(50) NOT NULL,
    [Quantity]          DECIMAL(14,3) NOT NULL,
    [EstimatedCost]     DECIMAL(18,2) NULL,
    [DeliveredQuantity] DECIMAL(14,3) NULL,
    [Specification]     NVARCHAR(500) NULL,
    [MaterialId]        UNIQUEIDENTIFIER NULL,
    [CreatedAt]         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]       UNIQUEIDENTIFIER NULL,
    [UpdatedById]       UNIQUEIDENTIFIER NULL,
    [IsDeleted]         BIT NOT NULL DEFAULT 0,
    [DeletedAt]         DATETIME2 NULL
);
GO

CREATE TABLE [Procurement].[PurchaseOrders] (
    [Id]                  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [VendorId]            UNIQUEIDENTIFIER NOT NULL REFERENCES [Procurement].[Vendors]([Id]),
    [MaterialRequestId]   UNIQUEIDENTIFIER NULL REFERENCES [Procurement].[MaterialRequests]([Id]),
    [ProjectId]           UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Projects]([Id]),
    [PoNumber]            NVARCHAR(100) NOT NULL,
    [PoDate]              DATETIME2 NOT NULL,
    [ExpectedDelivery]    DATETIME2 NULL,
    [TotalAmount]         DECIMAL(18,2) NOT NULL DEFAULT 0,
    [Currency]            NVARCHAR(10) NOT NULL DEFAULT 'USD',
    [Status]              NVARCHAR(50) NOT NULL DEFAULT 'Draft',
    [PaymentTerms]        NVARCHAR(200) NULL,
    [SpecialInstructions] NVARCHAR(1000) NULL,
    [CreatedAt]           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]         UNIQUEIDENTIFIER NULL REFERENCES [Auth].[Users]([Id]),
    [UpdatedById]         UNIQUEIDENTIFIER NULL,
    [IsDeleted]           BIT NOT NULL DEFAULT 0,
    [DeletedAt]           DATETIME2 NULL
);
CREATE UNIQUE INDEX [UX_PO_Number] ON [Procurement].[PurchaseOrders]([PoNumber]) WHERE [IsDeleted]=0;
GO

CREATE TABLE [Procurement].[POPayments] (
    [Id]              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [PurchaseOrderId] UNIQUEIDENTIFIER NOT NULL REFERENCES [Procurement].[PurchaseOrders]([Id]),
    [Amount]          DECIMAL(18,2) NOT NULL,
    [PaymentDate]     DATETIME2 NOT NULL,
    [PaymentMode]     NVARCHAR(50) NULL,
    [ReferenceNo]     NVARCHAR(200) NULL,
    [Notes]           NVARCHAR(500) NULL,
    [RecordedById]    UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Users]([Id]),
    [CreatedAt]       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]     UNIQUEIDENTIFIER NULL,
    [UpdatedById]     UNIQUEIDENTIFIER NULL,
    [IsDeleted]       BIT NOT NULL DEFAULT 0,
    [DeletedAt]       DATETIME2 NULL
);
GO

CREATE TABLE [Procurement].[Quotations] (
    [Id]                     UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [MaterialRequestId]      UNIQUEIDENTIFIER NOT NULL REFERENCES [Procurement].[MaterialRequests]([Id]),
    [VendorId]               UNIQUEIDENTIFIER NOT NULL REFERENCES [Procurement].[Vendors]([Id]),
    [UnitPrice]              DECIMAL(18,2) NOT NULL,
    [LeadTimeDays]           INT NULL,
    [ValidityDate]           DATETIME2 NULL,
    [PaymentTerms]           NVARCHAR(200) NULL,
    [AttachmentPath]         NVARCHAR(1000) NULL,
    [IsRecommended]          BIT NOT NULL DEFAULT 0,
    [IsSelected]             BIT NOT NULL DEFAULT 0,
    [SelectionJustification] NVARCHAR(2000) NULL,
    [TechnicalScore]         DECIMAL(5,2) NULL,
    [CreatedAt]              DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]              DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]            UNIQUEIDENTIFIER NULL,
    [UpdatedById]            UNIQUEIDENTIFIER NULL,
    [IsDeleted]              BIT NOT NULL DEFAULT 0,
    [DeletedAt]              DATETIME2 NULL
);
GO

CREATE TABLE [Procurement].[NegotiationLogs] (
    [Id]                UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [MaterialRequestId] UNIQUEIDENTIFIER NOT NULL REFERENCES [Procurement].[MaterialRequests]([Id]),
    [VendorId]          UNIQUEIDENTIFIER NOT NULL REFERENCES [Procurement].[Vendors]([Id]),
    [Round]             INT NOT NULL DEFAULT 1,
    [NegotiatedPrice]   DECIMAL(18,2) NOT NULL,
    [InitialPrice]      DECIMAL(18,2) NULL,
    [Notes]             NVARCHAR(2000) NULL,
    [LoggedById]        UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Users]([Id]),
    [CreatedAt]         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]       UNIQUEIDENTIFIER NULL,
    [UpdatedById]       UNIQUEIDENTIFIER NULL,
    [IsDeleted]         BIT NOT NULL DEFAULT 0,
    [DeletedAt]         DATETIME2 NULL
);
GO
PRINT '=== Procurement schema done ===';
GO

-- ============================================================
-- INVENTORY SCHEMA
-- ============================================================
CREATE TABLE [Inventory].[MaterialCategories] (
    [Id]          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [Name]        NVARCHAR(100) NOT NULL,
    [Code]        NVARCHAR(20) NULL,
    [ParentId]    UNIQUEIDENTIFIER NULL REFERENCES [Inventory].[MaterialCategories]([Id]),
    [CreatedAt]   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById] UNIQUEIDENTIFIER NULL,
    [UpdatedById] UNIQUEIDENTIFIER NULL,
    [IsDeleted]   BIT NOT NULL DEFAULT 0,
    [DeletedAt]   DATETIME2 NULL
);
GO

CREATE TABLE [Inventory].[Materials] (
    [Id]               UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [ProjectId]        UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Projects]([Id]),
    [MrNumber]         NVARCHAR(50) NOT NULL DEFAULT '',
    [Title]            NVARCHAR(500) NOT NULL,
    [Justification]    NVARCHAR(2000) NULL,
    [Priority]         NVARCHAR(20) NOT NULL DEFAULT 'Medium',
    [RequiredDate]     DATETIME2 NULL,
    [Status]           NVARCHAR(50) NOT NULL DEFAULT 'Draft',
    [RequestedById]    UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Users]([Id]),
    [PMApprovedById]   UNIQUEIDENTIFIER NULL REFERENCES [Auth].[Users]([Id]),
    [PMApprovedAt]     DATETIME2 NULL,
    [PurchaseDeptById] UNIQUEIDENTIFIER NULL REFERENCES [Auth].[Users]([Id]),
    [SentToPurchaseAt] DATETIME2 NULL,
    [RejectionReason]  NVARCHAR(500) NULL,
    [CurrentStock]     DECIMAL(14,3) NOT NULL DEFAULT 0,
    [Unit]             NVARCHAR(50) NULL,
    [CreatedAt]        DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]        DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]      UNIQUEIDENTIFIER NULL,
    [UpdatedById]      UNIQUEIDENTIFIER NULL,
    [IsDeleted]        BIT NOT NULL DEFAULT 0,
    [DeletedAt]        DATETIME2 NULL
);
GO

CREATE TABLE [Inventory].[StockLedger] (
    [Id]              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [MaterialId]      UNIQUEIDENTIFIER NOT NULL REFERENCES [Inventory].[Materials]([Id]),
    [ProjectId]       UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Projects]([Id]),
    [TransactionDate] DATETIME2 NOT NULL,
    [TransactionType] NVARCHAR(30) NOT NULL,
    [Quantity]        DECIMAL(14,3) NOT NULL,
    [UnitCost]        DECIMAL(18,4) NULL,
    [BalanceAfter]    DECIMAL(14,3) NULL,
    [Notes]           NVARCHAR(500) NULL,
    [ReferenceId]     UNIQUEIDENTIFIER NULL,
    [ReferenceType]   NVARCHAR(50) NULL,
    [RecordedById]    UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Users]([Id]),
    [CreatedAt]       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]     UNIQUEIDENTIFIER NULL,
    [UpdatedById]     UNIQUEIDENTIFIER NULL,
    [IsDeleted]       BIT NOT NULL DEFAULT 0,
    [DeletedAt]       DATETIME2 NULL
);
CREATE INDEX [IX_StockLedger_MaterialProject] ON [Inventory].[StockLedger]([MaterialId],[ProjectId],[TransactionDate]);
GO

CREATE TABLE [Inventory].[SiteTransfers] (
    [Id]             UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [MaterialId]     UNIQUEIDENTIFIER NOT NULL REFERENCES [Inventory].[Materials]([Id]),
    [FromProjectId]  UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Projects]([Id]),
    [ToProjectId]    UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Projects]([Id]),
    [TransferDate]   DATETIME2 NOT NULL,
    [Quantity]       DECIMAL(14,3) NOT NULL,
    [Notes]          NVARCHAR(500) NULL,
    [Status]         NVARCHAR(50) NOT NULL DEFAULT 'Pending',
    [RequestedById]  UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Users]([Id]),
    [ApprovedById]   UNIQUEIDENTIFIER NULL REFERENCES [Auth].[Users]([Id]),
    [CreatedAt]      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]    UNIQUEIDENTIFIER NULL,
    [UpdatedById]    UNIQUEIDENTIFIER NULL,
    [IsDeleted]      BIT NOT NULL DEFAULT 0,
    [DeletedAt]      DATETIME2 NULL
);
GO

CREATE TABLE [Inventory].[Reconciliations] (
    [Id]            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [ProjectId]     UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Projects]([Id]),
    [Status]        NVARCHAR(50) NOT NULL DEFAULT 'InProgress',
    [VersionNumber] INT NOT NULL DEFAULT 1,
    [CompletedAt]   DATETIME2 NULL,
    [OfficerId]     UNIQUEIDENTIFIER NULL REFERENCES [Auth].[Users]([Id]),
    [PdfPath]       NVARCHAR(1000) NULL,
    [CreatedAt]     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]   UNIQUEIDENTIFIER NULL,
    [UpdatedById]   UNIQUEIDENTIFIER NULL,
    [IsDeleted]     BIT NOT NULL DEFAULT 0,
    [DeletedAt]     DATETIME2 NULL
);
GO

CREATE TABLE [Inventory].[ReconciliationItems] (
    [Id]               UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [ReconciliationId] UNIQUEIDENTIFIER NOT NULL REFERENCES [Inventory].[Reconciliations]([Id]),
    [MaterialId]       UNIQUEIDENTIFIER NOT NULL REFERENCES [Inventory].[Materials]([Id]),
    [MaterialName]     NVARCHAR(300) NOT NULL,
    [SystemStock]      DECIMAL(14,3) NOT NULL DEFAULT 0,
    [PhysicalStock]    DECIMAL(14,3) NULL,
    [Variance]         DECIMAL(14,3) NULL,
    [CreatedAt]        DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]        DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]      UNIQUEIDENTIFIER NULL,
    [UpdatedById]      UNIQUEIDENTIFIER NULL,
    [IsDeleted]        BIT NOT NULL DEFAULT 0,
    [DeletedAt]        DATETIME2 NULL
);
GO
PRINT '=== Inventory schema done ===';
GO

-- ============================================================
-- RESOURCE SCHEMA
-- ============================================================
CREATE TABLE [Resource].[ResourceTypes] (
    [Id]          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [Name]        NVARCHAR(100) NOT NULL,
    [Category]    NVARCHAR(100) NULL,
    [IsActive]    BIT NOT NULL DEFAULT 1,
    [CreatedAt]   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById] UNIQUEIDENTIFIER NULL,
    [UpdatedById] UNIQUEIDENTIFIER NULL,
    [IsDeleted]   BIT NOT NULL DEFAULT 0,
    [DeletedAt]   DATETIME2 NULL
);
GO

CREATE TABLE [Resource].[Calendars] (
    [Id]               UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [Name]             NVARCHAR(200) NOT NULL,
    [Type]             NVARCHAR(50) NOT NULL DEFAULT 'Standard',
    [WorkHoursPerDay]  INT NULL DEFAULT 8,
    [WorkDays]         NVARCHAR(20) NULL DEFAULT '1111100',
    [IsDefault]        BIT NOT NULL DEFAULT 0,
    [CreatedAt]        DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]        DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]      UNIQUEIDENTIFIER NULL,
    [UpdatedById]      UNIQUEIDENTIFIER NULL,
    [IsDeleted]        BIT NOT NULL DEFAULT 0,
    [DeletedAt]        DATETIME2 NULL
);
GO

CREATE TABLE [Resource].[CalendarExceptions] (
    [Id]            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [CalendarId]    UNIQUEIDENTIFIER NOT NULL REFERENCES [Resource].[Calendars]([Id]),
    [ExceptionDate] DATETIME2 NOT NULL,
    [ExceptionType] NVARCHAR(50) NOT NULL DEFAULT 'Holiday',
    [Name]          NVARCHAR(200) NULL,
    [WorkHours]     INT NULL DEFAULT 0,
    [CreatedAt]     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]   UNIQUEIDENTIFIER NULL,
    [UpdatedById]   UNIQUEIDENTIFIER NULL,
    [IsDeleted]     BIT NOT NULL DEFAULT 0,
    [DeletedAt]     DATETIME2 NULL
);
GO

CREATE TABLE [Resource].[Resources] (
    [Id]          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [Name]        NVARCHAR(300) NOT NULL,
    [Category]    NVARCHAR(100) NULL,
    [IsActive]    BIT NOT NULL DEFAULT 1,
    [CreatedAt]   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById] UNIQUEIDENTIFIER NULL,
    [UpdatedById] UNIQUEIDENTIFIER NULL,
    [IsDeleted]   BIT NOT NULL DEFAULT 0,
    [DeletedAt]   DATETIME2 NULL
);
GO

CREATE TABLE [Resource].[TaskResourceAllocations] (
    [Id]                UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [TaskId]            UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Tasks]([Id]),
    [ResourceId]        UNIQUEIDENTIFIER NOT NULL REFERENCES [Resource].[Resources]([Id]),
    [StartDate]         DATETIME2 NOT NULL,
    [EndDate]           DATETIME2 NOT NULL,
    [AllocationPercent] DECIMAL(5,2) NOT NULL DEFAULT 100,
    [PlannedHours]      DECIMAL(10,2) NULL,
    [ActualHours]       DECIMAL(10,2) NULL,
    [Status]            NVARCHAR(50) NOT NULL DEFAULT 'Active',
    [CreatedAt]         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]       UNIQUEIDENTIFIER NULL,
    [UpdatedById]       UNIQUEIDENTIFIER NULL,
    [IsDeleted]         BIT NOT NULL DEFAULT 0,
    [DeletedAt]         DATETIME2 NULL
);
GO

CREATE TABLE [Resource].[EquipmentDeployment] (
    [Id]           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [ResourceId]   UNIQUEIDENTIFIER NOT NULL REFERENCES [Resource].[Resources]([Id]),
    [ProjectId]    UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Projects]([Id]),
    [DeployedFrom] DATETIME2 NOT NULL,
    [DeployedTo]   DATETIME2 NULL,
    [Status]       NVARCHAR(50) NOT NULL DEFAULT 'Active',
    [Notes]        NVARCHAR(500) NULL,
    [DeployedById] UNIQUEIDENTIFIER NULL REFERENCES [Auth].[Users]([Id]),
    [CreatedAt]    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]  UNIQUEIDENTIFIER NULL,
    [UpdatedById]  UNIQUEIDENTIFIER NULL,
    [IsDeleted]    BIT NOT NULL DEFAULT 0,
    [DeletedAt]    DATETIME2 NULL
);
GO
PRINT '=== Resource schema done ===';
GO

-- ============================================================
-- BUDGET SCHEMA
-- ============================================================
CREATE TABLE [Budget].[ProjectBudgets] (
    [Id]                  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [ProjectId]           UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Projects]([Id]),
    [BudgetVersion]       NVARCHAR(20) NOT NULL DEFAULT 'v1.0',
    [Status]              NVARCHAR(50) NOT NULL DEFAULT 'Draft',
    [TotalApprovedBudget] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [RevisedBudget]       DECIMAL(18,2) NULL,
    [Currency]            NVARCHAR(10) NOT NULL DEFAULT 'USD',
    [ApprovedAt]          DATETIME2 NULL,
    [ApprovedById]        UNIQUEIDENTIFIER NULL REFERENCES [Auth].[Users]([Id]),
    [Notes]               NVARCHAR(2000) NULL,
    [CreatedAt]           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]         UNIQUEIDENTIFIER NULL,
    [UpdatedById]         UNIQUEIDENTIFIER NULL,
    [IsDeleted]           BIT NOT NULL DEFAULT 0,
    [DeletedAt]           DATETIME2 NULL
);
GO

CREATE TABLE [Budget].[BudgetWBS] (
    [Id]              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [ProjectId]       UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Projects]([Id]),
    [ProjectBudgetId] UNIQUEIDENTIFIER NULL REFERENCES [Budget].[ProjectBudgets]([Id]),
    [ParentId]        UNIQUEIDENTIFIER NULL REFERENCES [Budget].[BudgetWBS]([Id]),
    [Description]     NVARCHAR(500) NOT NULL,
    [WbsCode]         NVARCHAR(20) NULL,
    [CostCode]        NVARCHAR(100) NULL,
    [Level]           INT NOT NULL DEFAULT 1,
    [BudgetAmount]    DECIMAL(18,2) NOT NULL DEFAULT 0,
    [RevisedAmount]   DECIMAL(18,2) NULL,
    [CommittedAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
    [ExpendedAmount]  DECIMAL(18,2) NOT NULL DEFAULT 0,
    [BalanceAmount]   DECIMAL(18,2) NOT NULL DEFAULT 0,
    [BurnRate]        DECIMAL(5,2) NOT NULL DEFAULT 0,
    [Currency]        NVARCHAR(10) NOT NULL DEFAULT 'USD',
    [CreatedAt]       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]     UNIQUEIDENTIFIER NULL,
    [UpdatedById]     UNIQUEIDENTIFIER NULL,
    [IsDeleted]       BIT NOT NULL DEFAULT 0,
    [DeletedAt]       DATETIME2 NULL
);
CREATE INDEX [IX_BudgetWBS_Project] ON [Budget].[BudgetWBS]([ProjectId],[ProjectBudgetId]);
GO

CREATE TABLE [Budget].[CommittedAmounts] (
    [Id]             UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [BudgetWBSId]    UNIQUEIDENTIFIER NOT NULL REFERENCES [Budget].[BudgetWBS]([Id]),
    [ProjectId]      UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Projects]([Id]),
    [CommitmentType] NVARCHAR(100) NOT NULL DEFAULT 'Manual',
    [ReferenceNo]    NVARCHAR(100) NULL,
    [ReferenceId]    UNIQUEIDENTIFIER NULL,
    [Amount]         DECIMAL(18,2) NOT NULL,
    [Currency]       NVARCHAR(10) NOT NULL DEFAULT 'USD',
    [CommitmentDate] DATETIME2 NOT NULL,
    [Description]    NVARCHAR(500) NULL,
    [Status]         NVARCHAR(50) NOT NULL DEFAULT 'Active',
    [RecordedById]   UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Users]([Id]),
    [CreatedAt]      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]    UNIQUEIDENTIFIER NULL,
    [UpdatedById]    UNIQUEIDENTIFIER NULL,
    [IsDeleted]      BIT NOT NULL DEFAULT 0,
    [DeletedAt]      DATETIME2 NULL
);
GO

CREATE TABLE [Budget].[Expenditures] (
    [Id]           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [BudgetWBSId]  UNIQUEIDENTIFIER NOT NULL REFERENCES [Budget].[BudgetWBS]([Id]),
    [ProjectId]    UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Projects]([Id]),
    [ExpenseType]  NVARCHAR(100) NOT NULL DEFAULT 'Payment',
    [ReferenceNo]  NVARCHAR(100) NULL,
    [ReferenceId]  UNIQUEIDENTIFIER NULL,
    [Amount]       DECIMAL(18,2) NOT NULL,
    [Currency]     NVARCHAR(10) NOT NULL DEFAULT 'USD',
    [ExpenseDate]  DATETIME2 NOT NULL,
    [VendorName]   NVARCHAR(300) NULL,
    [Description]  NVARCHAR(1000) NULL,
    [ReceiptPath]  NVARCHAR(500) NULL,
    [ApprovedById] UNIQUEIDENTIFIER NULL REFERENCES [Auth].[Users]([Id]),
    [RecordedById] UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Users]([Id]),
    [CreatedAt]    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]  UNIQUEIDENTIFIER NULL,
    [UpdatedById]  UNIQUEIDENTIFIER NULL,
    [IsDeleted]    BIT NOT NULL DEFAULT 0,
    [DeletedAt]    DATETIME2 NULL
);
CREATE INDEX [IX_Expenditures_ProjectDate] ON [Budget].[Expenditures]([ProjectId],[ExpenseDate]);
GO
PRINT '=== Budget schema done ===';
GO

-- ============================================================
-- RISK SCHEMA
-- ============================================================
CREATE TABLE [Risk].[Risks] (
    [Id]                  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [ProjectId]           UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Projects]([Id]),
    [RiskNumber]          NVARCHAR(30) NOT NULL,
    [Title]               NVARCHAR(500) NOT NULL,
    [Description]         NVARCHAR(2000) NULL,
    [Category]            NVARCHAR(100) NULL,
    [RiskType]            NVARCHAR(100) NULL,
    [Probability]         NVARCHAR(20) NOT NULL DEFAULT 'Medium',
    [Impact]              NVARCHAR(20) NOT NULL DEFAULT 'Medium',
    [RiskScore]           INT NULL,
    [RiskLevel]           NVARCHAR(20) NULL,
    [Status]              NVARCHAR(50) NOT NULL DEFAULT 'Open',
    [RaisedOn]            DATETIME2 NULL,
    [AcknowledgedOn]      DATETIME2 NULL,
    [AnalysisCompletedOn] DATETIME2 NULL,
    [ClosedOnTimestamp]   DATETIME2 NULL,
    [RejectedOn]          DATETIME2 NULL,
    [VoidRemarks]         NVARCHAR(1000) NULL,
    [MitigationPlan]      NVARCHAR(3000) NULL,
    [MitigationStrategy]  NVARCHAR(1000) NULL,
    [ContingencyPlan]     NVARCHAR(2000) NULL,
    [ContingencyBudget]   DECIMAL(18,2) NULL,
    [RiskOwnerId]         UNIQUEIDENTIFIER NULL REFERENCES [Auth].[Users]([Id]),
    [ReviewDate]          DATETIME2 NULL,
    [ClosedAt]            DATETIME2 NULL,
    [ClosureReason]       NVARCHAR(1000) NULL,
    [RaisedById]          UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Users]([Id]),
    [CreatedAt]           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]         UNIQUEIDENTIFIER NULL,
    [UpdatedById]         UNIQUEIDENTIFIER NULL,
    [IsDeleted]           BIT NOT NULL DEFAULT 0,
    [DeletedAt]           DATETIME2 NULL
);
CREATE INDEX [IX_Risks_Project_Status] ON [Risk].[Risks]([ProjectId],[Status]);
GO

CREATE TABLE [Risk].[RiskStakeholders] (
    [Id]          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [RiskId]      UNIQUEIDENTIFIER NOT NULL REFERENCES [Risk].[Risks]([Id]),
    [UserId]      UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Users]([Id]),
    [Role]        NVARCHAR(100) NULL,
    [AddedAt]     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedAt]   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById] UNIQUEIDENTIFIER NULL,
    [UpdatedById] UNIQUEIDENTIFIER NULL,
    [IsDeleted]   BIT NOT NULL DEFAULT 0,
    [DeletedAt]   DATETIME2 NULL
);
CREATE UNIQUE INDEX [UX_RiskStakeholders] ON [Risk].[RiskStakeholders]([RiskId],[UserId]) WHERE [IsDeleted]=0;
GO

CREATE TABLE [Risk].[RiskUpdates] (
    [Id]                UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [RiskId]            UNIQUEIDENTIFIER NOT NULL REFERENCES [Risk].[Risks]([Id]),
    [Notes]             NVARCHAR(3000) NULL,
    [NewStatus]         NVARCHAR(50) NULL,
    [NewProbability]    NVARCHAR(20) NULL,
    [NewImpact]         NVARCHAR(20) NULL,
    [NewRiskScore]      INT NULL,
    [MitigationUpdate]  NVARCHAR(2000) NULL,
    [UpdatedById]       UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Users]([Id]),
    [CreatedAt]         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]       UNIQUEIDENTIFIER NULL,
    [IsDeleted]         BIT NOT NULL DEFAULT 0,
    [DeletedAt]         DATETIME2 NULL
);
GO
PRINT '=== Risk schema done ===';
GO

-- ============================================================
-- SEED DATA
-- ============================================================

-- Roles
INSERT INTO [Auth].[Roles] ([Id],[Name],[Description],[IsSystem],[CreatedAt],[UpdatedAt],[IsDeleted]) VALUES
(NEWID(),'Admin',               'Full system access',                    1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'Project Manager',     'Manage assigned projects',              1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'Planning Engineer',   'Project planning and scheduling',       1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'Project Head',        'Head of projects division',             1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'Site Engineer',       'On-site engineering work',              1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'Labour Manager',      'Manage labour and attendance',          1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'Procurement Manager', 'Manage procurement and purchasing',     1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'Store Manager',       'Manage inventory and materials',        1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'Finance',             'Finance and budget management',         1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'Risk Manager',        'Risk identification and mitigation',    1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'Document Controller', 'Manage documents and drawings',        1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'Management',          'Senior management access',              1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'Viewer',              'Read-only access to all modules',       1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0);
GO
PRINT 'Roles created';
GO

-- Admin user (Password: Admin@123 — BCrypt hash)
DECLARE @AdminId   UNIQUEIDENTIFIER = NEWID();
DECLARE @AdminRole UNIQUEIDENTIFIER;
SELECT @AdminRole = [Id] FROM [Auth].[Roles] WHERE [Name] = 'Admin';

INSERT INTO [Auth].[Users] (
    [Id],[FirstName],[LastName],[Email],[PasswordHash],
    [IsActive],[MustChangePassword],[FailedLoginAttempts],
    [Department],[JobTitle],[CreatedAt],[UpdatedAt],[IsDeleted]
) VALUES (
    @AdminId,
    'System','Administrator','admin@mmgepm.com',
    '$2b$11$2WAL7cgMHWjqVh4fh4CE5eSiISVeSFnGfpD1bEVk255Ak2GdcNeUu',
    1, 0, 0,
    'IT','System Administrator',
    SYSUTCDATETIME(), SYSUTCDATETIME(), 0
);

INSERT INTO [Auth].[UserRoles] ([UserId],[RoleId],[AssignedAt])
VALUES (@AdminId, @AdminRole, SYSUTCDATETIME());
GO
PRINT 'Admin user created: admin@mmgepm.com / Admin@123';
GO

-- Countries
INSERT INTO [Auth].[Countries] ([Id],[Name],[Code],[CurrencyCode],[CreatedAt],[UpdatedAt],[IsDeleted]) VALUES
(NEWID(),'Tanzania',             'TZA','TZS', SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'Kenya',                'KEN','KES', SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'Uganda',               'UGA','UGX', SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'Rwanda',               'RWA','RWF', SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'Zambia',               'ZMB','ZMW', SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'Malawi',               'MWI','MWK', SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'Ethiopia',             'ETH','ETB', SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'Ghana',                'GHA','GHS', SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'South Africa',         'ZAF','ZAR', SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'United Arab Emirates', 'UAE','AED', SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'India',                'IND','INR', SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'United States',        'USA','USD', SYSUTCDATETIME(), SYSUTCDATETIME(), 0);
GO
PRINT 'Countries seeded';
GO

-- SBU Codes
INSERT INTO [Auth].[SBUCodes] ([Id],[Code],[Name],[Country],[IsActive],[CreatedAt],[UpdatedAt],[IsDeleted]) VALUES
(NEWID(),'MMG-TZ',  'MMG Tanzania',      'Tanzania',           1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'MMG-KE',  'MMG Kenya',         'Kenya',              1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'MMG-UG',  'MMG Uganda',        'Uganda',             1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'MMG-RW',  'MMG Rwanda',        'Rwanda',             1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'MMG-ZM',  'MMG Zambia',        'Zambia',             1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'MMG-ETH', 'MMG Ethiopia',      'Ethiopia',           1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'MMG-GH',  'MMG Ghana',         'Ghana',              1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'MMG-UAE', 'MMG Middle East',   'United Arab Emirates', 1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'MMG-IND', 'MMG India',         'India',              1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0);
GO
PRINT 'SBU Codes seeded';
GO

-- Notification Templates
INSERT INTO [Notify].[NotificationTemplates] ([Id],[Code],[Subject],[Body],[Channel],[IsActive],[CreatedAt],[UpdatedAt],[IsDeleted]) VALUES
(NEWID(),'TASK_ASSIGNED',   'Task Assigned to You',       'Task {{TaskName}} has been assigned to you on project {{ProjectName}}',    'Both',  1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'TASK_DUE',        'Task Due Soon',              'Task {{TaskName}} is due on {{DueDate}}. Please update the progress.',     'Both',  1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'TASK_OVERDUE',    'Task Overdue',               'Task {{TaskName}} is overdue. Immediate action required.',                 'Both',  1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'RISK_RAISED',     'New Risk Registered',        'A new risk has been raised: {{RiskTitle}} on {{ProjectName}}',             'Both',  1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'RISK_HIGH',       'High Risk Alert',            'HIGH risk identified: {{RiskTitle}} requires immediate attention',         'Both',  1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'MR_APPROVAL',     'Material Request Approval',  'MR {{MRNumber}} requires your approval on {{ProjectName}}',               'Both',  1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'PO_CREATED',      'Purchase Order Created',     'PO {{PONumber}} has been created for {{ProjectName}}',                    'InApp', 1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'DPR_GENERATED',   'DPR Auto-Generated',         'Daily Progress Report for {{ProjectName}} on {{Date}} has been created',  'InApp', 1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'BUDGET_ALERT',    'Budget Alert 80%',           'Budget utilisation for {{ProjectName}} has exceeded 80%',                 'Both',  1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'LABOUR_APPROVED', 'Labour Entry Approved',      'Your labour attendance entry for {{Date}} has been approved',             'InApp', 1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0);
GO
PRINT 'Notification templates seeded';
GO

-- Default Calendar
INSERT INTO [Resource].[Calendars] ([Id],[Name],[Type],[WorkHoursPerDay],[WorkDays],[IsDefault],[CreatedAt],[UpdatedAt],[IsDeleted]) VALUES
(NEWID(), 'Standard 5-Day', 'Standard', 8, '1111100', 1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(), 'Standard 6-Day', 'Standard', 8, '1111110', 0, SYSUTCDATETIME(), SYSUTCDATETIME(), 0);
GO
PRINT 'Default calendars seeded';
GO

-- Labour Categories seed
INSERT INTO [Project].[LabourCategories] ([Id],[Name],[TradeCode],[DefaultDailyRate],[Currency],[IsActive],[CreatedAt],[UpdatedAt],[IsDeleted]) VALUES
(NEWID(),'Mason',           'MAS', 25.00, 'USD', 1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'Carpenter',       'CAR', 22.00, 'USD', 1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'Steel Fixer',     'STF', 24.00, 'USD', 1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'Electrician',     'ELE', 28.00, 'USD', 1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'Plumber',         'PLM', 26.00, 'USD', 1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'Welder',          'WLD', 30.00, 'USD', 1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'Unskilled Labour','USK', 12.00, 'USD', 1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'Supervisor',      'SUP', 45.00, 'USD', 1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'Operator',        'OPR', 35.00, 'USD', 1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0);
GO
PRINT 'Labour categories seeded';
GO

-- Resource Types seed
INSERT INTO [Resource].[ResourceTypes] ([Id],[Name],[Category],[IsActive],[CreatedAt],[UpdatedAt],[IsDeleted]) VALUES
(NEWID(),'Excavator',       'Heavy Equipment', 1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'Crane',           'Heavy Equipment', 1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'Concrete Mixer',  'Equipment',       1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'Generator',       'Equipment',       1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'Scaffolding',     'Material',        1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
(NEWID(),'Dump Truck',      'Heavy Equipment', 1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0);
GO
PRINT 'Resource types seeded';
GO

-- ============================================================
-- HANGFIRE TABLES (for background jobs / DPR auto-generation)
-- ============================================================
EXEC('CREATE SCHEMA [HangFire]');
GO

CREATE TABLE [HangFire].[Schema]
    (  [Identifier] [nvarchar](100) NOT NULL,
       CONSTRAINT [PK_HangFire_Schema] PRIMARY KEY CLUSTERED ([Identifier] ASC)
    );
GO

-- Hangfire core tables
CREATE TABLE [HangFire].[Counter](
    [Id]         [bigint]       IDENTITY(1,1) NOT NULL,
    [Key]        [nvarchar](100) NOT NULL,
    [Value]      [smallint]     NOT NULL,
    [ExpireAt]   [datetime]     NULL,
    CONSTRAINT [PK_HangFire_Counter] PRIMARY KEY CLUSTERED ([Id] ASC)
);
CREATE NONCLUSTERED INDEX [IX_HangFire_Counter_Key] ON [HangFire].[Counter]([Key] ASC);
GO

CREATE TABLE [HangFire].[Hash](
    [Id]       [bigint]        IDENTITY(1,1) NOT NULL,
    [Key]      [nvarchar](100) NOT NULL,
    [Name]     [nvarchar](40)  NOT NULL,
    [Value]    [nvarchar](max) NULL,
    [ExpireAt] [datetime2](7)  NULL,
    CONSTRAINT [PK_HangFire_Hash] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [UX_HangFire_Hash_Key_Name] UNIQUE NONCLUSTERED ([Key] ASC, [Name] ASC)
);
GO

CREATE TABLE [HangFire].[Job](
    [Id]             [bigint]        IDENTITY(1,1) NOT NULL,
    [StateId]        [bigint]        NULL,
    [StateName]      [nvarchar](20)  NULL,
    [InvocationData] [nvarchar](max) NOT NULL,
    [Arguments]      [nvarchar](max) NOT NULL,
    [CreatedAt]      [datetime2](7)  NOT NULL,
    [ExpireAt]       [datetime2](7)  NULL,
    CONSTRAINT [PK_HangFire_Job] PRIMARY KEY CLUSTERED ([Id] ASC)
);
CREATE NONCLUSTERED INDEX [IX_HangFire_Job_StateName] ON [HangFire].[Job]([StateName] ASC);
GO

CREATE TABLE [HangFire].[State](
    [Id]        [bigint]        IDENTITY(1,1) NOT NULL,
    [JobId]     [bigint]        NOT NULL,
    [Name]      [nvarchar](20)  NOT NULL,
    [Reason]    [nvarchar](100) NULL,
    [CreatedAt] [datetime2](7)  NOT NULL,
    [Data]      [nvarchar](max) NULL,
    CONSTRAINT [PK_HangFire_State] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_HangFire_State_Job] FOREIGN KEY([JobId]) REFERENCES [HangFire].[Job]([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [HangFire].[JobQueue](
    [Id]       [bigint]       IDENTITY(1,1) NOT NULL,
    [JobId]    [bigint]       NOT NULL,
    [Queue]    [nvarchar](50) NOT NULL,
    [FetchedAt][datetime]     NULL,
    CONSTRAINT [PK_HangFire_JobQueue] PRIMARY KEY CLUSTERED ([Id] ASC)
);
CREATE NONCLUSTERED INDEX [IX_HangFire_JobQueue_Queue_FetchedAt] ON [HangFire].[JobQueue]([Queue] ASC, [FetchedAt] ASC);
GO

CREATE TABLE [HangFire].[List](
    [Id]       [bigint]        IDENTITY(1,1) NOT NULL,
    [Key]      [nvarchar](100) NOT NULL,
    [Value]    [nvarchar](max) NULL,
    [ExpireAt] [datetime2](7)  NULL,
    CONSTRAINT [PK_HangFire_List] PRIMARY KEY CLUSTERED ([Id] ASC)
);
GO

CREATE TABLE [HangFire].[Set](
    [Id]       [bigint]        IDENTITY(1,1) NOT NULL,
    [Key]      [nvarchar](100) NOT NULL,
    [Score]    [float]         NOT NULL,
    [Value]    [nvarchar](256) NOT NULL,
    [ExpireAt] [datetime2](7)  NULL,
    CONSTRAINT [PK_HangFire_Set] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [UX_HangFire_Set_Key_Value] UNIQUE NONCLUSTERED ([Key] ASC, [Value] ASC)
);
GO

CREATE TABLE [HangFire].[Server](
    [Id]           [nvarchar](200) NOT NULL,
    [Data]         [nvarchar](max) NULL,
    [LastHeartbeat][datetime]      NULL,
    CONSTRAINT [PK_HangFire_Server] PRIMARY KEY CLUSTERED ([Id] ASC)
);
GO

CREATE TABLE [HangFire].[AggregatedCounter](
    [Id]       [bigint]        IDENTITY(1,1) NOT NULL,
    [Key]      [nvarchar](100) NOT NULL,
    [Value]    [bigint]        NOT NULL,
    [ExpireAt] [datetime]      NULL,
    CONSTRAINT [PK_HangFire_AggregatedCounter] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [UX_HangFire_AggregatedCounter_Key] UNIQUE NONCLUSTERED ([Key] ASC)
);
GO

INSERT INTO [HangFire].[Schema] ([Identifier]) VALUES ('7');
GO
PRINT '=== Hangfire tables created ===';
GO

-- ============================================================
-- FINAL VERIFICATION
-- ============================================================
DECLARE @tbl_count INT;
SELECT @tbl_count = COUNT(*) FROM sys.tables WHERE is_ms_shipped = 0;
PRINT '';
PRINT '============================================================';
PRINT '=== MMG EPM Install Complete ===';
PRINT '============================================================';
PRINT 'Total tables created: ' + CAST(@tbl_count AS NVARCHAR);
PRINT '';
PRINT 'Login URL:  http://localhost:5173';
PRINT 'Email:      admin@mmgepm.com';
PRINT 'Password:   Admin@123';
PRINT '============================================================';
GO
