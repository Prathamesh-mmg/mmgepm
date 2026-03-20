-- ============================================================
-- MMG EPM - COMPLETE FRESH INSTALL
-- HOW TO RUN: Open SSMS -> New Query -> paste/open this file
-- Make sure connected to SQL Server (not a specific database)
-- Press F5 to execute
-- After success login: admin@mmgepm.com / Admin@123
-- ============================================================

USE master;
GO

IF EXISTS (SELECT 1 FROM sys.databases WHERE name = 'MMG_EPM')
BEGIN
    ALTER DATABASE MMG_EPM SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE MMG_EPM;
END
GO

CREATE DATABASE MMG_EPM;
GO

USE MMG_EPM;
GO

EXEC('CREATE SCHEMA Auth');
EXEC('CREATE SCHEMA Project');
EXEC('CREATE SCHEMA Document');
EXEC('CREATE SCHEMA Procurement');
EXEC('CREATE SCHEMA Inventory');
EXEC('CREATE SCHEMA [Resource]');
EXEC('CREATE SCHEMA Budget');
EXEC('CREATE SCHEMA Risk');
EXEC('CREATE SCHEMA Audit');
EXEC('CREATE SCHEMA Notify');
GO

-- ============================================================
-- AUTH TABLES
-- ============================================================

CREATE TABLE Auth.Users (
    Id                  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    FirstName           NVARCHAR(100)    NOT NULL,
    LastName            NVARCHAR(100)    NOT NULL,
    Email               NVARCHAR(256)    NOT NULL,
    PasswordHash        NVARCHAR(512)    NOT NULL,
    Phone               NVARCHAR(20)     NULL,
    Department          NVARCHAR(100)    NULL,
    JobTitle            NVARCHAR(100)    NULL,
    IsActive            BIT              NOT NULL DEFAULT 1,
    MustChangePassword  BIT              NOT NULL DEFAULT 0,
    FailedLoginAttempts INT              NOT NULL DEFAULT 0,
    LockedUntil         DATETIME2        NULL,
    LastLoginAt         DATETIME2        NULL,
    RefreshToken        NVARCHAR(512)    NULL,
    RefreshTokenExpiry  DATETIME2        NULL,
    AvatarUrl           NVARCHAR(500)    NULL,
    CreatedAt           DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt           DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById         UNIQUEIDENTIFIER NULL,
    UpdatedById         UNIQUEIDENTIFIER NULL,
    IsDeleted           BIT              NOT NULL DEFAULT 0,
    DeletedAt           DATETIME2        NULL
);
CREATE UNIQUE INDEX UX_Users_Email ON Auth.Users(Email) WHERE IsDeleted=0;
GO

CREATE TABLE Auth.Roles (
    Id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    Name        NVARCHAR(100)    NOT NULL,
    Description NVARCHAR(500)    NULL,
    IsSystem    BIT              NOT NULL DEFAULT 0,
    CreatedAt   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById UNIQUEIDENTIFIER NULL,
    UpdatedById UNIQUEIDENTIFIER NULL,
    IsDeleted   BIT              NOT NULL DEFAULT 0,
    DeletedAt   DATETIME2        NULL
);
CREATE UNIQUE INDEX UX_Roles_Name ON Auth.Roles(Name) WHERE IsDeleted=0;
GO

CREATE TABLE Auth.UserRoles (
    UserId     UNIQUEIDENTIFIER NOT NULL REFERENCES Auth.Users(Id),
    RoleId     UNIQUEIDENTIFIER NOT NULL REFERENCES Auth.Roles(Id),
    AssignedAt DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_UserRoles PRIMARY KEY (UserId, RoleId)
);
GO

CREATE TABLE Auth.Permissions (
    Id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    Name        NVARCHAR(100)    NOT NULL,
    Code        NVARCHAR(100)    NOT NULL,
    Module      NVARCHAR(100)    NULL,
    Description NVARCHAR(500)    NULL,
    CreatedAt   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById UNIQUEIDENTIFIER NULL,
    UpdatedById UNIQUEIDENTIFIER NULL,
    IsDeleted   BIT              NOT NULL DEFAULT 0,
    DeletedAt   DATETIME2        NULL
);
GO

CREATE TABLE Auth.RolePermissions (
    RoleId       UNIQUEIDENTIFIER NOT NULL REFERENCES Auth.Roles(Id),
    PermissionId UNIQUEIDENTIFIER NOT NULL REFERENCES Auth.Permissions(Id),
    CONSTRAINT PK_RolePermissions PRIMARY KEY (RoleId, PermissionId)
);
GO

CREATE TABLE Auth.Countries (
    Id           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    Name         NVARCHAR(100)    NOT NULL,
    Code         NVARCHAR(3)      NULL,
    CurrencyCode NVARCHAR(10)     NULL,
    CreatedAt    DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt    DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById  UNIQUEIDENTIFIER NULL,
    UpdatedById  UNIQUEIDENTIFIER NULL,
    IsDeleted    BIT              NOT NULL DEFAULT 0,
    DeletedAt    DATETIME2        NULL
);
GO

CREATE TABLE Auth.SBUCodes (
    Id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    Code        NVARCHAR(20)     NOT NULL,
    Name        NVARCHAR(200)    NOT NULL,
    Country     NVARCHAR(50)     NULL,
    IsActive    BIT              NOT NULL DEFAULT 1,
    CreatedAt   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById UNIQUEIDENTIFIER NULL,
    UpdatedById UNIQUEIDENTIFIER NULL,
    IsDeleted   BIT              NOT NULL DEFAULT 0,
    DeletedAt   DATETIME2        NULL
);
GO

CREATE TABLE Auth.FileAttachments (
    Id           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    FileName     NVARCHAR(500)    NOT NULL,
    FilePath     NVARCHAR(1000)   NOT NULL,
    FileUrl      NVARCHAR(500)    NULL,
    ContentType  NVARCHAR(100)    NULL,
    FileSize     BIGINT           NOT NULL DEFAULT 0,
    EntityType   NVARCHAR(50)     NULL,
    EntityId     UNIQUEIDENTIFIER NULL,
    UploadedById UNIQUEIDENTIFIER NULL REFERENCES Auth.Users(Id),
    CreatedAt    DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt    DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById  UNIQUEIDENTIFIER NULL,
    UpdatedById  UNIQUEIDENTIFIER NULL,
    IsDeleted    BIT              NOT NULL DEFAULT 0,
    DeletedAt    DATETIME2        NULL
);
GO

CREATE TABLE Audit.AuditLog (
    Id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    Action      NVARCHAR(100)    NOT NULL,
    EntityType  NVARCHAR(100)    NOT NULL,
    EntityId    UNIQUEIDENTIFIER NOT NULL,
    OldValues   NVARCHAR(MAX)    NULL,
    NewValues   NVARCHAR(MAX)    NULL,
    IpAddress   NVARCHAR(50)     NULL,
    UserAgent   NVARCHAR(500)    NULL,
    UserId      UNIQUEIDENTIFIER NULL,
    CreatedAt   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById UNIQUEIDENTIFIER NULL,
    UpdatedById UNIQUEIDENTIFIER NULL,
    IsDeleted   BIT              NOT NULL DEFAULT 0,
    DeletedAt   DATETIME2        NULL
);
GO

CREATE TABLE Notify.NotificationTemplates (
    Id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    Code        NVARCHAR(100)    NOT NULL,
    Subject     NVARCHAR(200)    NOT NULL,
    Body        NVARCHAR(MAX)    NOT NULL,
    Channel     NVARCHAR(50)     NOT NULL DEFAULT 'InApp',
    IsActive    BIT              NOT NULL DEFAULT 1,
    CreatedAt   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById UNIQUEIDENTIFIER NULL,
    UpdatedById UNIQUEIDENTIFIER NULL,
    IsDeleted   BIT              NOT NULL DEFAULT 0,
    DeletedAt   DATETIME2        NULL
);
GO

CREATE TABLE Notify.Notifications (
    Id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    UserId      UNIQUEIDENTIFIER NOT NULL REFERENCES Auth.Users(Id),
    Title       NVARCHAR(200)    NOT NULL,
    Message     NVARCHAR(MAX)    NOT NULL,
    Type        NVARCHAR(50)     NULL,
    Module      NVARCHAR(50)     NULL,
    EntityId    UNIQUEIDENTIFIER NULL,
    ActionUrl   NVARCHAR(500)    NULL,
    IsRead      BIT              NOT NULL DEFAULT 0,
    ReadAt      DATETIME2        NULL,
    CreatedAt   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById UNIQUEIDENTIFIER NULL,
    UpdatedById UNIQUEIDENTIFIER NULL,
    IsDeleted   BIT              NOT NULL DEFAULT 0,
    DeletedAt   DATETIME2        NULL
);
GO

-- ============================================================
-- PROJECT TABLES
-- ============================================================

CREATE TABLE Project.Projects (
    Id                 UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    Name               NVARCHAR(300)    NOT NULL,
    Code               NVARCHAR(50)     NOT NULL,
    Description        NVARCHAR(2000)   NULL,
    ProjectType        NVARCHAR(100)    NULL,
    Country            NVARCHAR(100)    NULL,
    Location           NVARCHAR(200)    NULL,
    SBUCode            NVARCHAR(20)     NULL,
    StartDate          DATETIME2        NOT NULL,
    ExpectedEndDate    DATETIME2        NULL,
    ActualEndDate      DATETIME2        NULL,
    Budget             DECIMAL(18,2)    NULL,
    Currency           NVARCHAR(10)     NULL DEFAULT 'USD',
    ClientName         NVARCHAR(300)    NULL,
    ClientContact      NVARCHAR(200)    NULL,
    Status             NVARCHAR(50)     NOT NULL DEFAULT 'Planning',
    OverallProgress    DECIMAL(5,2)     NOT NULL DEFAULT 0,
    ProjectManagerId   UNIQUEIDENTIFIER NULL REFERENCES Auth.Users(Id),
    ProjectHeadId      UNIQUEIDENTIFIER NULL REFERENCES Auth.Users(Id),
    PlanningEngineerId UNIQUEIDENTIFIER NULL REFERENCES Auth.Users(Id),
    CreatedAt          DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt          DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById        UNIQUEIDENTIFIER NULL,
    UpdatedById        UNIQUEIDENTIFIER NULL,
    IsDeleted          BIT              NOT NULL DEFAULT 0,
    DeletedAt          DATETIME2        NULL
);
CREATE UNIQUE INDEX UX_Projects_Code ON Project.Projects(Code) WHERE IsDeleted=0;
GO

CREATE TABLE Project.SubProjects (
    Id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    ProjectId   UNIQUEIDENTIFIER NOT NULL REFERENCES Project.Projects(Id),
    Name        NVARCHAR(300)    NOT NULL,
    Code        NVARCHAR(50)     NULL,
    Description NVARCHAR(1000)   NULL,
    Status      NVARCHAR(50)     NOT NULL DEFAULT 'Active',
    CreatedAt   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById UNIQUEIDENTIFIER NULL,
    UpdatedById UNIQUEIDENTIFIER NULL,
    IsDeleted   BIT              NOT NULL DEFAULT 0,
    DeletedAt   DATETIME2        NULL
);
GO

CREATE TABLE Project.ProjectMembers (
    Id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    ProjectId   UNIQUEIDENTIFIER NOT NULL REFERENCES Project.Projects(Id),
    UserId      UNIQUEIDENTIFIER NOT NULL REFERENCES Auth.Users(Id),
    ProjectRole NVARCHAR(100)    NOT NULL DEFAULT 'TeamMember',
    JoinedAt    DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    LeftAt      DATETIME2        NULL,
    IsActive    BIT              NOT NULL DEFAULT 1,
    CreatedAt   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById UNIQUEIDENTIFIER NULL,
    UpdatedById UNIQUEIDENTIFIER NULL,
    IsDeleted   BIT              NOT NULL DEFAULT 0,
    DeletedAt   DATETIME2        NULL
);
GO

CREATE TABLE Project.Tasks (
    Id                 UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    ProjectId          UNIQUEIDENTIFIER NOT NULL REFERENCES Project.Projects(Id),
    SubProjectId       UNIQUEIDENTIFIER NULL REFERENCES Project.SubProjects(Id),
    ParentTaskId       UNIQUEIDENTIFIER NULL,
    Name               NVARCHAR(500)    NOT NULL,
    Description        NVARCHAR(2000)   NULL,
    WbsCode            NVARCHAR(20)     NULL,
    Level              INT              NOT NULL DEFAULT 1,
    StartDate          DATETIME2        NULL,
    EndDate            DATETIME2        NULL,
    EstimatedHours     DECIMAL(10,2)    NULL,
    ActualHours        DECIMAL(10,2)    NULL,
    EstimatedCost      DECIMAL(18,2)    NULL,
    ActualCost         DECIMAL(18,2)    NULL,
    Status             NVARCHAR(50)     NOT NULL DEFAULT 'NotStarted',
    Priority           NVARCHAR(50)     NOT NULL DEFAULT 'Medium',
    ProgressPercentage DECIMAL(5,2)     NOT NULL DEFAULT 0,
    AssigneeId         UNIQUEIDENTIFIER NULL REFERENCES Auth.Users(Id),
    IsMilestone        BIT              NOT NULL DEFAULT 0,
    HasChildren        BIT              NOT NULL DEFAULT 0,
    SortOrder          INT              NOT NULL DEFAULT 0,
    CreatedAt          DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt          DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById        UNIQUEIDENTIFIER NULL,
    UpdatedById        UNIQUEIDENTIFIER NULL,
    IsDeleted          BIT              NOT NULL DEFAULT 0,
    DeletedAt          DATETIME2        NULL,
    CONSTRAINT FK_Tasks_Parent FOREIGN KEY (ParentTaskId) REFERENCES Project.Tasks(Id)
);
GO

CREATE TABLE Project.TaskAssignees (
    TaskId     UNIQUEIDENTIFIER NOT NULL REFERENCES Project.Tasks(Id),
    UserId     UNIQUEIDENTIFIER NOT NULL REFERENCES Auth.Users(Id),
    Role       NVARCHAR(100)    NULL,
    AssignedAt DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_TaskAssignees PRIMARY KEY (TaskId, UserId)
);
GO

CREATE TABLE Project.WorkProgress (
    Id                 UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    TaskId             UNIQUEIDENTIFIER NOT NULL REFERENCES Project.Tasks(Id),
    UpdatedById        UNIQUEIDENTIFIER NOT NULL REFERENCES Auth.Users(Id),
    Notes              NVARCHAR(2000)   NULL,
    ProgressPercentage DECIMAL(5,2)     NOT NULL,
    HoursLogged        DECIMAL(10,2)    NULL,
    ReportedAt         DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedAt          DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt          DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById        UNIQUEIDENTIFIER NULL,
    IsDeleted          BIT              NOT NULL DEFAULT 0,
    DeletedAt          DATETIME2        NULL
);
GO

CREATE TABLE Project.WorkProgressPhotos (
    Id             UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    WorkProgressId UNIQUEIDENTIFIER NOT NULL REFERENCES Project.WorkProgress(Id),
    FileName       NVARCHAR(500)    NOT NULL,
    FilePath       NVARCHAR(1000)   NOT NULL,
    FileUrl        NVARCHAR(500)    NULL,
    Caption        NVARCHAR(500)    NULL,
    FileSize       BIGINT           NOT NULL DEFAULT 0,
    CreatedAt      DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt      DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById    UNIQUEIDENTIFIER NULL,
    UpdatedById    UNIQUEIDENTIFIER NULL,
    IsDeleted      BIT              NOT NULL DEFAULT 0,
    DeletedAt      DATETIME2        NULL
);
GO

CREATE TABLE Project.Contractors (
    Id             UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    Name           NVARCHAR(300)    NOT NULL,
    Code           NVARCHAR(50)     NULL,
    ContactPerson  NVARCHAR(200)    NULL,
    Email          NVARCHAR(256)    NULL,
    Phone          NVARCHAR(20)     NULL,
    Country        NVARCHAR(100)    NULL,
    Address        NVARCHAR(500)    NULL,
    ContractorType NVARCHAR(50)     NULL,
    IsActive       BIT              NOT NULL DEFAULT 1,
    CreatedAt      DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt      DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById    UNIQUEIDENTIFIER NULL,
    UpdatedById    UNIQUEIDENTIFIER NULL,
    IsDeleted      BIT              NOT NULL DEFAULT 0,
    DeletedAt      DATETIME2        NULL
);
GO

CREATE TABLE Project.LabourCategories (
    Id               UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    Name             NVARCHAR(100)    NOT NULL,
    TradeCode        NVARCHAR(100)    NULL,
    DefaultDailyRate DECIMAL(10,2)    NULL,
    Currency         NVARCHAR(10)     NULL DEFAULT 'USD',
    IsActive         BIT              NOT NULL DEFAULT 1,
    CreatedAt        DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt        DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById      UNIQUEIDENTIFIER NULL,
    UpdatedById      UNIQUEIDENTIFIER NULL,
    IsDeleted        BIT              NOT NULL DEFAULT 0,
    DeletedAt        DATETIME2        NULL
);
GO

CREATE TABLE Project.CrewAttendance (
    Id               UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    ProjectId        UNIQUEIDENTIFIER NOT NULL REFERENCES Project.Projects(Id),
    ContractorId     UNIQUEIDENTIFIER NULL REFERENCES Project.Contractors(Id),
    LabourCategoryId UNIQUEIDENTIFIER NULL REFERENCES Project.LabourCategories(Id),
    AttendanceDate   DATETIME2        NOT NULL,
    LabourName       NVARCHAR(300)    NOT NULL,
    TradeName        NVARCHAR(100)    NULL,
    Status           NVARCHAR(50)     NOT NULL DEFAULT 'Present',
    HoursWorked      DECIMAL(5,2)     NULL,
    DailyRate        DECIMAL(10,2)    NULL,
    Notes            NVARCHAR(500)    NULL,
    RecordedById     UNIQUEIDENTIFIER NULL REFERENCES Auth.Users(Id),
    CreatedAt        DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt        DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById      UNIQUEIDENTIFIER NULL,
    UpdatedById      UNIQUEIDENTIFIER NULL,
    IsDeleted        BIT              NOT NULL DEFAULT 0,
    DeletedAt        DATETIME2        NULL
);
GO

CREATE TABLE Project.DPRReports (
    Id                 UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    ProjectId          UNIQUEIDENTIFIER NOT NULL REFERENCES Project.Projects(Id),
    ReportDate         DATETIME2        NOT NULL,
    WorkCompleted      NVARCHAR(2000)   NULL,
    PlannedForTomorrow NVARCHAR(2000)   NULL,
    Issues             NVARCHAR(2000)   NULL,
    SafetyObservations NVARCHAR(2000)   NULL,
    LabourCount        INT              NULL,
    EquipmentCount     INT              NULL,
    WeatherTemperature DECIMAL(5,1)     NULL,
    WeatherCondition   NVARCHAR(100)    NULL,
    Status             NVARCHAR(50)     NOT NULL DEFAULT 'Draft',
    SubmittedById      UNIQUEIDENTIFIER NULL REFERENCES Auth.Users(Id),
    SubmittedAt        DATETIME2        NULL,
    ApprovedById       UNIQUEIDENTIFIER NULL REFERENCES Auth.Users(Id),
    ApprovedAt         DATETIME2        NULL,
    RejectionReason    NVARCHAR(500)    NULL,
    CreatedAt          DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt          DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById        UNIQUEIDENTIFIER NULL,
    UpdatedById        UNIQUEIDENTIFIER NULL,
    IsDeleted          BIT              NOT NULL DEFAULT 0,
    DeletedAt          DATETIME2        NULL
);
GO

-- ============================================================
-- DOCUMENT TABLES
-- ============================================================

CREATE TABLE Document.FolderTemplates (
    Id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    Name        NVARCHAR(300)    NOT NULL,
    Description NVARCHAR(500)    NULL,
    ParentId    UNIQUEIDENTIFIER NULL,
    SortOrder   INT              NOT NULL DEFAULT 0,
    IsDefault   BIT              NOT NULL DEFAULT 1,
    CreatedAt   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById UNIQUEIDENTIFIER NULL,
    UpdatedById UNIQUEIDENTIFIER NULL,
    IsDeleted   BIT              NOT NULL DEFAULT 0,
    DeletedAt   DATETIME2        NULL
);
GO

CREATE TABLE Document.ProjectFolders (
    Id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    ProjectId   UNIQUEIDENTIFIER NOT NULL REFERENCES Project.Projects(Id),
    ParentId    UNIQUEIDENTIFIER NULL,
    TemplateId  UNIQUEIDENTIFIER NULL,
    Name        NVARCHAR(300)    NOT NULL,
    SortOrder   INT              NOT NULL DEFAULT 0,
    CreatedAt   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById UNIQUEIDENTIFIER NULL,
    UpdatedById UNIQUEIDENTIFIER NULL,
    IsDeleted   BIT              NOT NULL DEFAULT 0,
    DeletedAt   DATETIME2        NULL
);
GO

CREATE TABLE Document.Documents (
    Id             UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    ProjectId      UNIQUEIDENTIFIER NOT NULL REFERENCES Project.Projects(Id),
    FolderId       UNIQUEIDENTIFIER NULL REFERENCES Document.ProjectFolders(Id),
    Title          NVARCHAR(500)    NOT NULL,
    Description    NVARCHAR(500)    NULL,
    FileName       NVARCHAR(500)    NOT NULL,
    FilePath       NVARCHAR(1000)   NOT NULL,
    FileUrl        NVARCHAR(500)    NULL,
    ContentType    NVARCHAR(100)    NULL,
    FileSize       BIGINT           NOT NULL DEFAULT 0,
    RevisionNumber NVARCHAR(20)     NOT NULL DEFAULT 'v1',
    DocumentType   NVARCHAR(50)     NOT NULL DEFAULT 'General',
    Status         NVARCHAR(50)     NOT NULL DEFAULT 'Active',
    UploadedById   UNIQUEIDENTIFIER NOT NULL REFERENCES Auth.Users(Id),
    ExpiryDate     DATETIME2        NULL,
    CreatedAt      DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt      DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById    UNIQUEIDENTIFIER NULL,
    UpdatedById    UNIQUEIDENTIFIER NULL,
    IsDeleted      BIT              NOT NULL DEFAULT 0,
    DeletedAt      DATETIME2        NULL
);
GO

CREATE TABLE Document.Drawings (
    Id               UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    ProjectId        UNIQUEIDENTIFIER NOT NULL REFERENCES Project.Projects(Id),
    DrawingNumber    NVARCHAR(100)    NOT NULL,
    Title            NVARCHAR(500)    NOT NULL,
    Discipline       NVARCHAR(100)    NULL,
    Scale            NVARCHAR(50)     NULL,
    Revision         NVARCHAR(20)     NOT NULL DEFAULT 'A',
    Status           NVARCHAR(50)     NOT NULL DEFAULT 'IFC',
    FileAttachmentId UNIQUEIDENTIFIER NULL,
    UploadedById     UNIQUEIDENTIFIER NOT NULL REFERENCES Auth.Users(Id),
    CreatedAt        DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt        DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById      UNIQUEIDENTIFIER NULL,
    UpdatedById      UNIQUEIDENTIFIER NULL,
    IsDeleted        BIT              NOT NULL DEFAULT 0,
    DeletedAt        DATETIME2        NULL
);
GO

CREATE TABLE Document.ChangeRequests (
    Id                 UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    ProjectId          UNIQUEIDENTIFIER NOT NULL REFERENCES Project.Projects(Id),
    CrNumber           NVARCHAR(30)     NOT NULL,
    Title              NVARCHAR(500)    NOT NULL,
    Description        NVARCHAR(2000)   NULL,
    Reason             NVARCHAR(2000)   NULL,
    Impact             NVARCHAR(2000)   NULL,
    CostImpact         DECIMAL(18,2)    NULL,
    ScheduleImpactDays INT              NULL,
    Status             NVARCHAR(50)     NOT NULL DEFAULT 'Draft',
    SubmittedById      UNIQUEIDENTIFIER NOT NULL REFERENCES Auth.Users(Id),
    ReviewedById       UNIQUEIDENTIFIER NULL REFERENCES Auth.Users(Id),
    ReviewedAt         DATETIME2        NULL,
    ReviewComments     NVARCHAR(500)    NULL,
    CreatedAt          DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt          DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById        UNIQUEIDENTIFIER NULL,
    UpdatedById        UNIQUEIDENTIFIER NULL,
    IsDeleted          BIT              NOT NULL DEFAULT 0,
    DeletedAt          DATETIME2        NULL
);
GO

-- ============================================================
-- PROCUREMENT TABLES
-- ============================================================

CREATE TABLE Procurement.Vendors (
    Id            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    Name          NVARCHAR(300)    NOT NULL,
    VendorCode    NVARCHAR(50)     NOT NULL,
    ContactPerson NVARCHAR(200)    NULL,
    Email         NVARCHAR(256)    NULL,
    Phone         NVARCHAR(20)     NULL,
    Country       NVARCHAR(100)    NULL,
    Address       NVARCHAR(500)    NULL,
    Category      NVARCHAR(100)    NULL,
    TaxId         NVARCHAR(20)     NULL,
    BankName      NVARCHAR(100)    NULL,
    BankAccount   NVARCHAR(50)     NULL,
    IsApproved    BIT              NOT NULL DEFAULT 0,
    IsActive      BIT              NOT NULL DEFAULT 1,
    CreditDays    INT              NULL,
    CreatedAt     DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt     DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById   UNIQUEIDENTIFIER NULL,
    UpdatedById   UNIQUEIDENTIFIER NULL,
    IsDeleted     BIT              NOT NULL DEFAULT 0,
    DeletedAt     DATETIME2        NULL
);
CREATE UNIQUE INDEX UX_Vendors_Code ON Procurement.Vendors(VendorCode) WHERE IsDeleted=0;
GO

CREATE TABLE Procurement.MaterialRequests (
    Id               UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    ProjectId        UNIQUEIDENTIFIER NOT NULL REFERENCES Project.Projects(Id),
    MrNumber         NVARCHAR(30)     NOT NULL,
    Title            NVARCHAR(500)    NOT NULL,
    Justification    NVARCHAR(2000)   NULL,
    Priority         NVARCHAR(50)     NOT NULL DEFAULT 'Normal',
    RequiredDate     DATETIME2        NULL,
    Status           NVARCHAR(50)     NOT NULL DEFAULT 'Draft',
    RequestedById    UNIQUEIDENTIFIER NOT NULL REFERENCES Auth.Users(Id),
    PMApprovedById   UNIQUEIDENTIFIER NULL REFERENCES Auth.Users(Id),
    PMApprovedAt     DATETIME2        NULL,
    PurchaseDeptById UNIQUEIDENTIFIER NULL REFERENCES Auth.Users(Id),
    SentToPurchaseAt DATETIME2        NULL,
    RejectionReason  NVARCHAR(500)    NULL,
    CreatedAt        DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt        DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById      UNIQUEIDENTIFIER NULL,
    UpdatedById      UNIQUEIDENTIFIER NULL,
    IsDeleted        BIT              NOT NULL DEFAULT 0,
    DeletedAt        DATETIME2        NULL
);
CREATE UNIQUE INDEX UX_MR_Number ON Procurement.MaterialRequests(MrNumber) WHERE IsDeleted=0;
GO

CREATE TABLE Procurement.MRLineItems (
    Id                UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    MaterialRequestId UNIQUEIDENTIFIER NOT NULL REFERENCES Procurement.MaterialRequests(Id),
    Description       NVARCHAR(500)    NOT NULL,
    Unit              NVARCHAR(50)     NOT NULL DEFAULT 'Nos',
    Quantity          DECIMAL(10,3)    NOT NULL,
    EstimatedCost     DECIMAL(18,2)    NULL,
    DeliveredQuantity DECIMAL(10,3)    NULL,
    Specification     NVARCHAR(200)    NULL,
    MaterialId        UNIQUEIDENTIFIER NULL,
    CreatedAt         DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt         DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById       UNIQUEIDENTIFIER NULL,
    UpdatedById       UNIQUEIDENTIFIER NULL,
    IsDeleted         BIT              NOT NULL DEFAULT 0,
    DeletedAt         DATETIME2        NULL
);
GO

CREATE TABLE Procurement.PurchaseOrders (
    Id                  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    VendorId            UNIQUEIDENTIFIER NOT NULL REFERENCES Procurement.Vendors(Id),
    MaterialRequestId   UNIQUEIDENTIFIER NULL REFERENCES Procurement.MaterialRequests(Id),
    ProjectId           UNIQUEIDENTIFIER NOT NULL REFERENCES Project.Projects(Id),
    PoNumber            NVARCHAR(30)     NOT NULL,
    PoDate              DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    ExpectedDelivery    DATETIME2        NULL,
    TotalAmount         DECIMAL(18,2)    NOT NULL DEFAULT 0,
    Currency            NVARCHAR(10)     NOT NULL DEFAULT 'USD',
    Status              NVARCHAR(50)     NOT NULL DEFAULT 'Draft',
    PaymentTerms        NVARCHAR(50)     NULL,
    SpecialInstructions NVARCHAR(2000)   NULL,
    CreatedById         UNIQUEIDENTIFIER NOT NULL REFERENCES Auth.Users(Id),
    CreatedAt           DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt           DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedById         UNIQUEIDENTIFIER NULL,
    IsDeleted           BIT              NOT NULL DEFAULT 0,
    DeletedAt           DATETIME2        NULL
);
CREATE UNIQUE INDEX UX_PO_Number ON Procurement.PurchaseOrders(PoNumber) WHERE IsDeleted=0;
GO

CREATE TABLE Procurement.POPayments (
    Id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    PurchaseOrderId UNIQUEIDENTIFIER NOT NULL REFERENCES Procurement.PurchaseOrders(Id),
    Amount          DECIMAL(18,2)    NOT NULL,
    PaymentDate     DATETIME2        NOT NULL,
    PaymentMode     NVARCHAR(50)     NULL,
    ReferenceNo     NVARCHAR(100)    NULL,
    Notes           NVARCHAR(500)    NULL,
    RecordedById    UNIQUEIDENTIFIER NOT NULL REFERENCES Auth.Users(Id),
    CreatedAt       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById     UNIQUEIDENTIFIER NULL,
    UpdatedById     UNIQUEIDENTIFIER NULL,
    IsDeleted       BIT              NOT NULL DEFAULT 0,
    DeletedAt       DATETIME2        NULL
);
GO

-- ============================================================
-- INVENTORY TABLES
-- ============================================================

CREATE TABLE Inventory.MaterialCategories (
    Id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    Name        NVARCHAR(200)    NOT NULL,
    Code        NVARCHAR(20)     NULL,
    ParentId    UNIQUEIDENTIFIER NULL,
    CreatedAt   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById UNIQUEIDENTIFIER NULL,
    UpdatedById UNIQUEIDENTIFIER NULL,
    IsDeleted   BIT              NOT NULL DEFAULT 0,
    DeletedAt   DATETIME2        NULL
);
GO

CREATE TABLE Inventory.Materials (
    Id            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    Name          NVARCHAR(300)    NOT NULL,
    MaterialCode  NVARCHAR(50)     NOT NULL,
    CategoryId    UNIQUEIDENTIFIER NULL REFERENCES Inventory.MaterialCategories(Id),
    Unit          NVARCHAR(50)     NOT NULL DEFAULT 'Nos',
    Description   NVARCHAR(500)    NULL,
    Brand         NVARCHAR(100)    NULL,
    Specification NVARCHAR(100)    NULL,
    CurrentStock  DECIMAL(10,3)    NOT NULL DEFAULT 0,
    ReorderLevel  DECIMAL(10,3)    NULL,
    StandardCost  DECIMAL(18,2)    NULL,
    IsActive      BIT              NOT NULL DEFAULT 1,
    CreatedAt     DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt     DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById   UNIQUEIDENTIFIER NULL,
    UpdatedById   UNIQUEIDENTIFIER NULL,
    IsDeleted     BIT              NOT NULL DEFAULT 0,
    DeletedAt     DATETIME2        NULL
);
CREATE UNIQUE INDEX UX_Materials_Code ON Inventory.Materials(MaterialCode) WHERE IsDeleted=0;
GO

CREATE TABLE Inventory.StockLedger (
    Id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    MaterialId      UNIQUEIDENTIFIER NOT NULL REFERENCES Inventory.Materials(Id),
    ProjectId       UNIQUEIDENTIFIER NOT NULL REFERENCES Project.Projects(Id),
    TransactionDate DATETIME2        NOT NULL,
    TransactionType NVARCHAR(50)     NOT NULL,
    Quantity        DECIMAL(10,3)    NOT NULL,
    UnitCost        DECIMAL(18,2)    NULL,
    BalanceAfter    DECIMAL(10,3)    NULL,
    Notes           NVARCHAR(500)    NULL,
    ReferenceId     UNIQUEIDENTIFIER NULL,
    ReferenceType   NVARCHAR(100)    NULL,
    RecordedById    UNIQUEIDENTIFIER NOT NULL REFERENCES Auth.Users(Id),
    CreatedAt       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById     UNIQUEIDENTIFIER NULL,
    UpdatedById     UNIQUEIDENTIFIER NULL,
    IsDeleted       BIT              NOT NULL DEFAULT 0,
    DeletedAt       DATETIME2        NULL
);
GO

CREATE TABLE Inventory.SiteTransfers (
    Id            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    MaterialId    UNIQUEIDENTIFIER NOT NULL REFERENCES Inventory.Materials(Id),
    FromProjectId UNIQUEIDENTIFIER NOT NULL REFERENCES Project.Projects(Id),
    ToProjectId   UNIQUEIDENTIFIER NOT NULL REFERENCES Project.Projects(Id),
    TransferDate  DATETIME2        NOT NULL,
    Quantity      DECIMAL(10,3)    NOT NULL,
    Notes         NVARCHAR(500)    NULL,
    Status        NVARCHAR(50)     NOT NULL DEFAULT 'Pending',
    RequestedById UNIQUEIDENTIFIER NOT NULL REFERENCES Auth.Users(Id),
    ApprovedById  UNIQUEIDENTIFIER NULL REFERENCES Auth.Users(Id),
    CreatedAt     DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt     DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById   UNIQUEIDENTIFIER NULL,
    UpdatedById   UNIQUEIDENTIFIER NULL,
    IsDeleted     BIT              NOT NULL DEFAULT 0,
    DeletedAt     DATETIME2        NULL
);
GO

-- ============================================================
-- RESOURCE TABLES
-- ============================================================

CREATE TABLE [Resource].ResourceTypes (
    Id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    Name        NVARCHAR(100)    NOT NULL,
    Category    NVARCHAR(50)     NULL,
    IsActive    BIT              NOT NULL DEFAULT 1,
    CreatedAt   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById UNIQUEIDENTIFIER NULL,
    UpdatedById UNIQUEIDENTIFIER NULL,
    IsDeleted   BIT              NOT NULL DEFAULT 0,
    DeletedAt   DATETIME2        NULL
);
GO

CREATE TABLE [Resource].Calendars (
    Id             UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    Name           NVARCHAR(200)    NOT NULL,
    Type           NVARCHAR(50)     NOT NULL DEFAULT 'Standard',
    WorkHoursPerDay INT             NULL DEFAULT 8,
    WorkDays       NVARCHAR(100)    NULL DEFAULT 'Mon,Tue,Wed,Thu,Fri',
    IsDefault      BIT              NOT NULL DEFAULT 0,
    CreatedAt      DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt      DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById    UNIQUEIDENTIFIER NULL,
    UpdatedById    UNIQUEIDENTIFIER NULL,
    IsDeleted      BIT              NOT NULL DEFAULT 0,
    DeletedAt      DATETIME2        NULL
);
GO

CREATE TABLE [Resource].CalendarExceptions (
    Id            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    CalendarId    UNIQUEIDENTIFIER NOT NULL REFERENCES [Resource].Calendars(Id),
    ExceptionDate DATETIME2        NOT NULL,
    ExceptionType NVARCHAR(50)     NOT NULL DEFAULT 'Holiday',
    Name          NVARCHAR(200)    NULL,
    WorkHours     INT              NULL,
    CreatedAt     DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt     DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById   UNIQUEIDENTIFIER NULL,
    UpdatedById   UNIQUEIDENTIFIER NULL,
    IsDeleted     BIT              NOT NULL DEFAULT 0,
    DeletedAt     DATETIME2        NULL
);
GO

CREATE TABLE [Resource].Resources (
    Id             UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    Name           NVARCHAR(300)    NOT NULL,
    Code           NVARCHAR(50)     NULL,
    ResourceTypeId UNIQUEIDENTIFIER NULL REFERENCES [Resource].ResourceTypes(Id),
    CalendarId     UNIQUEIDENTIFIER NULL REFERENCES [Resource].Calendars(Id),
    Location       NVARCHAR(100)    NULL,
    Availability   NVARCHAR(100)    NULL,
    CostPerHour    DECIMAL(18,2)    NULL,
    CostPerDay     DECIMAL(18,2)    NULL,
    Currency       NVARCHAR(10)     NOT NULL DEFAULT 'USD',
    Status         NVARCHAR(50)     NOT NULL DEFAULT 'Available',
    Notes          NVARCHAR(500)    NULL,
    Make           NVARCHAR(100)    NULL,
    Model          NVARCHAR(100)    NULL,
    SerialNumber   NVARCHAR(50)     NULL,
    UserId         UNIQUEIDENTIFIER NULL REFERENCES Auth.Users(Id),
    CreatedAt      DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt      DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById    UNIQUEIDENTIFIER NULL,
    UpdatedById    UNIQUEIDENTIFIER NULL,
    IsDeleted      BIT              NOT NULL DEFAULT 0,
    DeletedAt      DATETIME2        NULL
);
GO

CREATE TABLE [Resource].TaskResourceAllocations (
    Id                UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    TaskId            UNIQUEIDENTIFIER NOT NULL REFERENCES Project.Tasks(Id),
    ResourceId        UNIQUEIDENTIFIER NOT NULL REFERENCES [Resource].Resources(Id),
    StartDate         DATETIME2        NOT NULL,
    EndDate           DATETIME2        NOT NULL,
    AllocationPercent DECIMAL(5,2)     NOT NULL DEFAULT 100,
    PlannedHours      DECIMAL(10,2)    NULL,
    ActualHours       DECIMAL(10,2)    NULL,
    Status            NVARCHAR(50)     NOT NULL DEFAULT 'Planned',
    CreatedAt         DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt         DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById       UNIQUEIDENTIFIER NULL,
    UpdatedById       UNIQUEIDENTIFIER NULL,
    IsDeleted         BIT              NOT NULL DEFAULT 0,
    DeletedAt         DATETIME2        NULL
);
GO

CREATE TABLE [Resource].EquipmentDeployment (
    Id           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    ResourceId   UNIQUEIDENTIFIER NOT NULL REFERENCES [Resource].Resources(Id),
    ProjectId    UNIQUEIDENTIFIER NOT NULL REFERENCES Project.Projects(Id),
    DeployedFrom DATETIME2        NOT NULL,
    DeployedTo   DATETIME2        NULL,
    Status       NVARCHAR(50)     NOT NULL DEFAULT 'Deployed',
    Notes        NVARCHAR(500)    NULL,
    DeployedById UNIQUEIDENTIFIER NULL REFERENCES Auth.Users(Id),
    CreatedAt    DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt    DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById  UNIQUEIDENTIFIER NULL,
    UpdatedById  UNIQUEIDENTIFIER NULL,
    IsDeleted    BIT              NOT NULL DEFAULT 0,
    DeletedAt    DATETIME2        NULL
);
GO

-- ============================================================
-- BUDGET TABLES
-- ============================================================

CREATE TABLE Budget.ProjectBudgets (
    Id                  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    ProjectId           UNIQUEIDENTIFIER NOT NULL REFERENCES Project.Projects(Id),
    BudgetVersion       NVARCHAR(100)    NOT NULL DEFAULT 'v1',
    Status              NVARCHAR(50)     NOT NULL DEFAULT 'Draft',
    TotalApprovedBudget DECIMAL(18,2)    NOT NULL DEFAULT 0,
    RevisedBudget       DECIMAL(18,2)    NULL,
    Currency            NVARCHAR(10)     NOT NULL DEFAULT 'USD',
    ApprovedAt          DATETIME2        NULL,
    ApprovedById        UNIQUEIDENTIFIER NULL REFERENCES Auth.Users(Id),
    Notes               NVARCHAR(2000)   NULL,
    CreatedAt           DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt           DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById         UNIQUEIDENTIFIER NULL,
    UpdatedById         UNIQUEIDENTIFIER NULL,
    IsDeleted           BIT              NOT NULL DEFAULT 0,
    DeletedAt           DATETIME2        NULL
);
GO

CREATE TABLE Budget.BudgetWBS (
    Id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    ProjectId       UNIQUEIDENTIFIER NOT NULL REFERENCES Project.Projects(Id),
    ProjectBudgetId UNIQUEIDENTIFIER NULL REFERENCES Budget.ProjectBudgets(Id),
    ParentId        UNIQUEIDENTIFIER NULL,
    Description     NVARCHAR(500)    NOT NULL,
    WbsCode         NVARCHAR(20)     NULL,
    CostCode        NVARCHAR(100)    NULL,
    Level           INT              NOT NULL DEFAULT 1,
    BudgetAmount    DECIMAL(18,2)    NOT NULL DEFAULT 0,
    RevisedAmount   DECIMAL(18,2)    NULL,
    CommittedAmount DECIMAL(18,2)    NOT NULL DEFAULT 0,
    ExpendedAmount  DECIMAL(18,2)    NOT NULL DEFAULT 0,
    BalanceAmount   DECIMAL(18,2)    NOT NULL DEFAULT 0,
    BurnRate        DECIMAL(5,2)     NOT NULL DEFAULT 0,
    Currency        NVARCHAR(10)     NOT NULL DEFAULT 'USD',
    CreatedAt       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById     UNIQUEIDENTIFIER NULL,
    UpdatedById     UNIQUEIDENTIFIER NULL,
    IsDeleted       BIT              NOT NULL DEFAULT 0,
    DeletedAt       DATETIME2        NULL,
    CONSTRAINT FK_BudgetWBS_Parent FOREIGN KEY (ParentId) REFERENCES Budget.BudgetWBS(Id)
);
GO

CREATE TABLE Budget.CommittedAmounts (
    Id             UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    BudgetWBSId    UNIQUEIDENTIFIER NOT NULL REFERENCES Budget.BudgetWBS(Id),
    ProjectId      UNIQUEIDENTIFIER NOT NULL REFERENCES Project.Projects(Id),
    CommitmentType NVARCHAR(100)    NOT NULL,
    ReferenceNo    NVARCHAR(100)    NULL,
    ReferenceId    UNIQUEIDENTIFIER NULL,
    Amount         DECIMAL(18,2)    NOT NULL,
    Currency       NVARCHAR(10)     NOT NULL DEFAULT 'USD',
    CommitmentDate DATETIME2        NOT NULL,
    Description    NVARCHAR(500)    NULL,
    Status         NVARCHAR(50)     NOT NULL DEFAULT 'Active',
    RecordedById   UNIQUEIDENTIFIER NOT NULL REFERENCES Auth.Users(Id),
    CreatedAt      DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt      DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById    UNIQUEIDENTIFIER NULL,
    UpdatedById    UNIQUEIDENTIFIER NULL,
    IsDeleted      BIT              NOT NULL DEFAULT 0,
    DeletedAt      DATETIME2        NULL
);
GO

CREATE TABLE Budget.Expenditures (
    Id            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    BudgetWBSId   UNIQUEIDENTIFIER NOT NULL REFERENCES Budget.BudgetWBS(Id),
    ProjectId     UNIQUEIDENTIFIER NOT NULL REFERENCES Project.Projects(Id),
    ExpenseType   NVARCHAR(100)    NOT NULL,
    ReferenceNo   NVARCHAR(100)    NULL,
    ReferenceId   UNIQUEIDENTIFIER NULL,
    Amount        DECIMAL(18,2)    NOT NULL,
    PaymentAmount DECIMAL(18,2)    NULL,
    Currency      NVARCHAR(10)     NOT NULL DEFAULT 'USD',
    ExpenseDate   DATETIME2        NOT NULL,
    VendorName    NVARCHAR(300)    NULL,
    Description   NVARCHAR(1000)   NULL,
    ReceiptPath   NVARCHAR(500)    NULL,
    ApprovedById  UNIQUEIDENTIFIER NULL REFERENCES Auth.Users(Id),
    RecordedById  UNIQUEIDENTIFIER NOT NULL REFERENCES Auth.Users(Id),
    CreatedAt     DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt     DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById   UNIQUEIDENTIFIER NULL,
    UpdatedById   UNIQUEIDENTIFIER NULL,
    IsDeleted     BIT              NOT NULL DEFAULT 0,
    DeletedAt     DATETIME2        NULL
);
GO

-- ============================================================
-- RISK TABLES
-- ============================================================

CREATE TABLE Risk.Risks (
    Id                 UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    ProjectId          UNIQUEIDENTIFIER NOT NULL REFERENCES Project.Projects(Id),
    RiskNumber         NVARCHAR(30)     NOT NULL,
    Title              NVARCHAR(500)    NOT NULL,
    Description        NVARCHAR(2000)   NULL,
    Category           NVARCHAR(100)    NULL,
    RiskType           NVARCHAR(50)     NULL,
    Probability        NVARCHAR(50)     NOT NULL DEFAULT 'Medium',
    Impact             NVARCHAR(50)     NOT NULL DEFAULT 'Medium',
    RiskScore          INT              NULL,
    RiskLevel          NVARCHAR(50)     NULL,
    Status             NVARCHAR(50)     NOT NULL DEFAULT 'Draft',
    MitigationPlan     NVARCHAR(2000)   NULL,
    MitigationStrategy NVARCHAR(50)     NULL,
    ContingencyPlan    NVARCHAR(2000)   NULL,
    ContingencyBudget  DECIMAL(18,2)    NULL,
    RiskOwnerId        UNIQUEIDENTIFIER NULL REFERENCES Auth.Users(Id),
    ReviewDate         DATETIME2        NULL,
    ClosedAt           DATETIME2        NULL,
    ClosureReason      NVARCHAR(500)    NULL,
    RaisedById         UNIQUEIDENTIFIER NOT NULL REFERENCES Auth.Users(Id),
    CreatedAt          DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt          DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById        UNIQUEIDENTIFIER NULL,
    UpdatedById        UNIQUEIDENTIFIER NULL,
    IsDeleted          BIT              NOT NULL DEFAULT 0,
    DeletedAt          DATETIME2        NULL
);
GO

CREATE TABLE Risk.RiskStakeholders (
    RiskId   UNIQUEIDENTIFIER NOT NULL REFERENCES Risk.Risks(Id),
    UserId   UNIQUEIDENTIFIER NOT NULL REFERENCES Auth.Users(Id),
    Role     NVARCHAR(100)    NULL,
    AddedAt  DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_RiskStakeholders PRIMARY KEY (RiskId, UserId)
);
GO

CREATE TABLE Risk.RiskUpdates (
    Id               UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    RiskId           UNIQUEIDENTIFIER NOT NULL REFERENCES Risk.Risks(Id),
    Notes            NVARCHAR(2000)   NULL,
    NewStatus        NVARCHAR(50)     NULL,
    NewProbability   NVARCHAR(50)     NULL,
    NewImpact        NVARCHAR(50)     NULL,
    NewRiskScore     INT              NULL,
    MitigationUpdate NVARCHAR(2000)   NULL,
    UpdatedById      UNIQUEIDENTIFIER NOT NULL REFERENCES Auth.Users(Id),
    CreatedAt        DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt        DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById      UNIQUEIDENTIFIER NULL,
    IsDeleted        BIT              NOT NULL DEFAULT 0,
    DeletedAt        DATETIME2        NULL
);
GO

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO Auth.Roles (Id, Name, Description, IsSystem, CreatedAt, UpdatedAt, IsDeleted) VALUES
(NEWID(),'Admin',               'Full system access',                 1,SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'Planning Engineer',   'Project planning and scheduling',    1,SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'Project Manager',     'Manage assigned projects',           1,SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'Project Head',        'Head of projects division',          1,SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'Site Engineer',       'On-site engineering work',           1,SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'SME Civil',           'Subject Matter Expert - Civil',      1,SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'SME Electrical',      'Subject Matter Expert - Electrical', 1,SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'SME Mechanical',      'Subject Matter Expert - Mechanical', 1,SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'Labour Manager',      'Manage labour and attendance',       1,SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'Procurement Head',    'Head of procurement',                1,SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'Purchase Manager',    'Manage purchase orders',             1,SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'Business Development','Business development activities',    1,SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'Management',          'Senior management access',           1,SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'Viewer',              'Read-only access',                   1,SYSUTCDATETIME(),SYSUTCDATETIME(),0);
GO

DECLARE @AdminId     UNIQUEIDENTIFIER = NEWID();
DECLARE @AdminRoleId UNIQUEIDENTIFIER = (SELECT Id FROM Auth.Roles WHERE Name = 'Admin');

INSERT INTO Auth.Users (Id, FirstName, LastName, Email, PasswordHash, IsActive,
    MustChangePassword, FailedLoginAttempts, Department, JobTitle, CreatedAt, UpdatedAt, IsDeleted)
VALUES (@AdminId, 'System', 'Administrator', 'admin@mmgepm.com',
    '$2b$11$2WAL7cgMHWjqVh4fh4CE5eSiISVeSFnGfpD1bEVk255Ak2GdcNeUu',
    1, 0, 0, 'IT', 'System Administrator', SYSUTCDATETIME(), SYSUTCDATETIME(), 0);

INSERT INTO Auth.UserRoles (UserId, RoleId, AssignedAt)
VALUES (@AdminId, @AdminRoleId, SYSUTCDATETIME());
GO

INSERT INTO Auth.Countries (Id, Name, Code, CurrencyCode, CreatedAt, UpdatedAt, IsDeleted) VALUES
(NEWID(),'Tanzania',            'TZA','TZS',SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'Kenya',               'KEN','KES',SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'Uganda',              'UGA','UGX',SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'Ethiopia',            'ETH','ETB',SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'Ghana',               'GHA','GHS',SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'United Arab Emirates','UAE','AED',SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'India',               'IND','INR',SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'United States',       'USA','USD',SYSUTCDATETIME(),SYSUTCDATETIME(),0);
GO

INSERT INTO Auth.SBUCodes (Id, Code, Name, Country, IsActive, CreatedAt, UpdatedAt, IsDeleted) VALUES
(NEWID(),'MMG-TZ', 'MMG Tanzania',   'Tanzania',1,SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'MMG-KE', 'MMG Kenya',      'Kenya',   1,SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'MMG-UG', 'MMG Uganda',     'Uganda',  1,SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'MMG-ETH','MMG Ethiopia',   'Ethiopia',1,SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'MMG-UAE','MMG Middle East','UAE',     1,SYSUTCDATETIME(),SYSUTCDATETIME(),0);
GO

INSERT INTO Notify.NotificationTemplates (Id, Code, Subject, Body, Channel, IsActive, CreatedAt, UpdatedAt, IsDeleted) VALUES
(NEWID(),'TASK_ASSIGNED','Task Assigned','Task assigned to you: {{TaskName}}',   'Both',1,SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'TASK_DUE',     'Task Due',     'Task due soon: {{TaskName}}',           'Both',1,SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'RISK_RAISED',  'New Risk',     'New risk raised: {{RiskTitle}}',        'Both',1,SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'MR_APPROVAL',  'MR Approval',  'MR {{MRNumber}} needs your approval',  'Both',1,SYSUTCDATETIME(),SYSUTCDATETIME(),0);
GO

PRINT '=============================================';
PRINT ' MMG EPM installed successfully!';
PRINT ' Login: admin@mmgepm.com / Admin@123';
PRINT '=============================================';
GO

-- ============================================================
-- TASK DELAYS & COMMENTS (missing from initial schema)
-- ============================================================

CREATE TABLE Project.TaskDelays (
    Id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    TaskId      UNIQUEIDENTIFIER NOT NULL REFERENCES Project.Tasks(Id),
    DelayType   NVARCHAR(50)     NOT NULL,
    DelayHours  DECIMAL(10,2)    NOT NULL,
    Description NVARCHAR(2000)   NULL,
    LoggedById  UNIQUEIDENTIFIER NOT NULL REFERENCES Auth.Users(Id),
    CreatedAt   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById UNIQUEIDENTIFIER NULL,
    UpdatedById UNIQUEIDENTIFIER NULL,
    IsDeleted   BIT              NOT NULL DEFAULT 0,
    DeletedAt   DATETIME2        NULL
);
GO

CREATE TABLE Project.TaskComments (
    Id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    TaskId          UNIQUEIDENTIFIER NOT NULL REFERENCES Project.Tasks(Id),
    UserId          UNIQUEIDENTIFIER NOT NULL REFERENCES Auth.Users(Id),
    Content         NVARCHAR(2000)   NOT NULL,
    ParentCommentId UNIQUEIDENTIFIER NULL,
    CreatedAt       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById     UNIQUEIDENTIFIER NULL,
    UpdatedById     UNIQUEIDENTIFIER NULL,
    IsDeleted       BIT              NOT NULL DEFAULT 0,
    DeletedAt       DATETIME2        NULL,
    CONSTRAINT FK_TaskComments_Parent FOREIGN KEY (ParentCommentId) REFERENCES Project.TaskComments(Id)
);
GO

PRINT 'Task Delays and Comments tables added';
GO

-- ============================================================
-- TASK DEPENDENCIES
-- ============================================================

CREATE TABLE Project.TaskDependencies (
    Id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    TaskId          UNIQUEIDENTIFIER NOT NULL REFERENCES Project.Tasks(Id),
    PredecessorId   UNIQUEIDENTIFIER NOT NULL REFERENCES Project.Tasks(Id),
    DependencyType  NVARCHAR(20)     NOT NULL DEFAULT 'FS',
    -- FS=Finish-to-Start, SS=Start-to-Start, FF=Finish-to-Finish, SF=Start-to-Finish
    LagDays         INT              NOT NULL DEFAULT 0,
    CreatedAt       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedById     UNIQUEIDENTIFIER NULL,
    UpdatedById     UNIQUEIDENTIFIER NULL,
    IsDeleted       BIT              NOT NULL DEFAULT 0,
    DeletedAt       DATETIME2        NULL,
    CONSTRAINT UQ_TaskDependency UNIQUE (TaskId, PredecessorId)
);
GO
PRINT 'Task Dependencies table added';
GO
