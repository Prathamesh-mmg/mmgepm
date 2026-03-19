    [UpdatedAt]         DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]       UNIQUEIDENTIFIER NULL,
    [UpdatedById]       UNIQUEIDENTIFIER NULL,
    [IsDeleted]         BIT              NOT NULL DEFAULT 0,
    [DeletedAt]         DATETIME2        NULL
);
GO

CREATE TABLE [Procurement].[PurchaseOrders] (
    [Id]                UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [VendorId]          UNIQUEIDENTIFIER NOT NULL REFERENCES [Procurement].[Vendors]([Id]),
    [MaterialRequestId] UNIQUEIDENTIFIER NULL REFERENCES [Procurement].[MaterialRequests]([Id]),
    [ProjectId]         UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Projects]([Id]),
    [PoNumber]          NVARCHAR(30)     NOT NULL,
    [PoDate]            DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [ExpectedDelivery]  DATETIME2        NULL,
    [TotalAmount]       DECIMAL(18,2)    NOT NULL DEFAULT 0,
    [Currency]          NVARCHAR(10)     NOT NULL DEFAULT 'USD',
    [Status]            NVARCHAR(50)     NOT NULL DEFAULT 'Draft',
    [PaymentTerms]      NVARCHAR(50)     NULL,
    [SpecialInstructions] NVARCHAR(2000) NULL,
    [CreatedById]       UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Users]([Id]),
    [CreatedAt]         DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]         DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedById]       UNIQUEIDENTIFIER NULL,
    [IsDeleted]         BIT              NOT NULL DEFAULT 0,
    [DeletedAt]         DATETIME2        NULL
);
CREATE UNIQUE INDEX [UX_PO_Number] ON [Procurement].[PurchaseOrders]([PoNumber]) WHERE [IsDeleted]=0;
GO

CREATE TABLE [Procurement].[POPayments] (
    [Id]             UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [PurchaseOrderId] UNIQUEIDENTIFIER NOT NULL REFERENCES [Procurement].[PurchaseOrders]([Id]),
    [Amount]         DECIMAL(18,2)    NOT NULL,
    [PaymentDate]    DATETIME2        NOT NULL,
    [PaymentMode]    NVARCHAR(50)     NULL,
    [ReferenceNo]    NVARCHAR(100)    NULL,
    [Notes]          NVARCHAR(500)    NULL,
    [RecordedById]   UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Users]([Id]),
    [CreatedAt]      DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]      DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]    UNIQUEIDENTIFIER NULL,
    [UpdatedById]    UNIQUEIDENTIFIER NULL,
    [IsDeleted]      BIT              NOT NULL DEFAULT 0,
    [DeletedAt]      DATETIME2        NULL
);
GO

-- ═══════════════════════════════════════════════════════
-- INVENTORY TABLES
-- ═══════════════════════════════════════════════════════

CREATE TABLE [Inventory].[MaterialCategories] (
    [Id]          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [Name]        NVARCHAR(200)    NOT NULL,
    [Code]        NVARCHAR(20)     NULL,
    [ParentId]    UNIQUEIDENTIFIER NULL,
    [CreatedAt]   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById] UNIQUEIDENTIFIER NULL,
    [UpdatedById] UNIQUEIDENTIFIER NULL,
    [IsDeleted]   BIT              NOT NULL DEFAULT 0,
    [DeletedAt]   DATETIME2        NULL
);
GO

CREATE TABLE [Inventory].[Materials] (
    [Id]           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [Name]         NVARCHAR(300)    NOT NULL,
    [MaterialCode] NVARCHAR(50)     NOT NULL,
    [CategoryId]   UNIQUEIDENTIFIER NULL REFERENCES [Inventory].[MaterialCategories]([Id]),
    [Unit]         NVARCHAR(50)     NOT NULL DEFAULT 'Nos',
    [Description]  NVARCHAR(500)    NULL,
    [Brand]        NVARCHAR(100)    NULL,
    [Specification] NVARCHAR(100)   NULL,
    [CurrentStock] DECIMAL(10,3)    NOT NULL DEFAULT 0,
    [ReorderLevel] DECIMAL(10,3)    NULL,
    [StandardCost] DECIMAL(18,2)    NULL,
    [IsActive]     BIT              NOT NULL DEFAULT 1,
    [CreatedAt]    DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]    DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]  UNIQUEIDENTIFIER NULL,
    [UpdatedById]  UNIQUEIDENTIFIER NULL,
    [IsDeleted]    BIT              NOT NULL DEFAULT 0,
    [DeletedAt]    DATETIME2        NULL
);
CREATE UNIQUE INDEX [UX_Materials_Code] ON [Inventory].[Materials]([MaterialCode]) WHERE [IsDeleted]=0;
GO

CREATE TABLE [Inventory].[StockLedger] (
    [Id]              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [MaterialId]      UNIQUEIDENTIFIER NOT NULL REFERENCES [Inventory].[Materials]([Id]),
    [ProjectId]       UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Projects]([Id]),
    [TransactionDate] DATETIME2        NOT NULL,
    [TransactionType] NVARCHAR(50)     NOT NULL,
    [Quantity]        DECIMAL(10,3)    NOT NULL,
    [UnitCost]        DECIMAL(18,2)    NULL,
    [BalanceAfter]    DECIMAL(10,3)    NULL,
    [Notes]           NVARCHAR(500)    NULL,
    [ReferenceId]     UNIQUEIDENTIFIER NULL,
    [ReferenceType]   NVARCHAR(100)    NULL,
    [RecordedById]    UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Users]([Id]),
    [CreatedAt]       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]     UNIQUEIDENTIFIER NULL,
    [UpdatedById]     UNIQUEIDENTIFIER NULL,
    [IsDeleted]       BIT              NOT NULL DEFAULT 0,
    [DeletedAt]       DATETIME2        NULL
);
GO

CREATE TABLE [Inventory].[SiteTransfers] (
    [Id]            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [MaterialId]    UNIQUEIDENTIFIER NOT NULL REFERENCES [Inventory].[Materials]([Id]),
    [FromProjectId] UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Projects]([Id]),
    [ToProjectId]   UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Projects]([Id]),
    [TransferDate]  DATETIME2        NOT NULL,
    [Quantity]      DECIMAL(10,3)    NOT NULL,
    [Notes]         NVARCHAR(500)    NULL,
    [Status]        NVARCHAR(50)     NOT NULL DEFAULT 'Pending',
    [RequestedById] UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Users]([Id]),
    [ApprovedById]  UNIQUEIDENTIFIER NULL REFERENCES [Auth].[Users]([Id]),
    [CreatedAt]     DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]     DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]   UNIQUEIDENTIFIER NULL,
    [UpdatedById]   UNIQUEIDENTIFIER NULL,
    [IsDeleted]     BIT              NOT NULL DEFAULT 0,
    [DeletedAt]     DATETIME2        NULL
);
GO

-- ═══════════════════════════════════════════════════════
-- RESOURCE TABLES
-- ═══════════════════════════════════════════════════════

CREATE TABLE [Resource].[ResourceTypes] (
    [Id]          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [Name]        NVARCHAR(100)    NOT NULL,
    [Category]    NVARCHAR(50)     NULL,
    [IsActive]    BIT              NOT NULL DEFAULT 1,
    [CreatedAt]   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById] UNIQUEIDENTIFIER NULL,
    [UpdatedById] UNIQUEIDENTIFIER NULL,
    [IsDeleted]   BIT              NOT NULL DEFAULT 0,
    [DeletedAt]   DATETIME2        NULL
);
GO

CREATE TABLE [Resource].[Calendars] (
    [Id]             UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [Name]           NVARCHAR(200)    NOT NULL,
    [Type]           NVARCHAR(50)     NOT NULL DEFAULT 'Standard',
    [WorkHoursPerDay] INT             NULL DEFAULT 8,
    [WorkDays]       NVARCHAR(100)    NULL DEFAULT 'Mon,Tue,Wed,Thu,Fri',
    [IsDefault]      BIT              NOT NULL DEFAULT 0,
    [CreatedAt]      DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]      DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]    UNIQUEIDENTIFIER NULL,
    [UpdatedById]    UNIQUEIDENTIFIER NULL,
    [IsDeleted]      BIT              NOT NULL DEFAULT 0,
    [DeletedAt]      DATETIME2        NULL
);
GO

CREATE TABLE [Resource].[CalendarExceptions] (
    [Id]            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [CalendarId]    UNIQUEIDENTIFIER NOT NULL REFERENCES [Resource].[Calendars]([Id]),
    [ExceptionDate] DATETIME2        NOT NULL,
    [ExceptionType] NVARCHAR(50)     NOT NULL DEFAULT 'Holiday',
    [Name]          NVARCHAR(200)    NULL,
    [WorkHours]     INT              NULL,
    [CreatedAt]     DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]     DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]   UNIQUEIDENTIFIER NULL,
    [UpdatedById]   UNIQUEIDENTIFIER NULL,
    [IsDeleted]     BIT              NOT NULL DEFAULT 0,
    [DeletedAt]     DATETIME2        NULL
);
GO

CREATE TABLE [Resource].[Resources] (
    [Id]             UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [Name]           NVARCHAR(300)    NOT NULL,
    [Code]           NVARCHAR(50)     NULL,
    [ResourceTypeId] UNIQUEIDENTIFIER NULL REFERENCES [Resource].[ResourceTypes]([Id]),
    [CalendarId]     UNIQUEIDENTIFIER NULL REFERENCES [Resource].[Calendars]([Id]),
    [Location]       NVARCHAR(100)    NULL,
    [Availability]   NVARCHAR(100)    NULL,
    [CostPerHour]    DECIMAL(18,2)    NULL,
    [CostPerDay]     DECIMAL(18,2)    NULL,
    [Currency]       NVARCHAR(10)     NOT NULL DEFAULT 'USD',
    [Status]         NVARCHAR(50)     NOT NULL DEFAULT 'Available',
    [Notes]          NVARCHAR(500)    NULL,
    [Make]           NVARCHAR(100)    NULL,
    [Model]          NVARCHAR(100)    NULL,
    [SerialNumber]   NVARCHAR(50)     NULL,
    [UserId]         UNIQUEIDENTIFIER NULL REFERENCES [Auth].[Users]([Id]),
    [CreatedAt]      DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]      DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]    UNIQUEIDENTIFIER NULL,
    [UpdatedById]    UNIQUEIDENTIFIER NULL,
    [IsDeleted]      BIT              NOT NULL DEFAULT 0,
    [DeletedAt]      DATETIME2        NULL
);
GO

CREATE TABLE [Resource].[TaskResourceAllocations] (
    [Id]                UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [TaskId]            UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Tasks]([Id]),
    [ResourceId]        UNIQUEIDENTIFIER NOT NULL REFERENCES [Resource].[Resources]([Id]),
    [StartDate]         DATETIME2        NOT NULL,
    [EndDate]           DATETIME2        NOT NULL,
    [AllocationPercent] DECIMAL(5,2)     NOT NULL DEFAULT 100,
    [PlannedHours]      DECIMAL(10,2)    NULL,
    [ActualHours]       DECIMAL(10,2)    NULL,
    [Status]            NVARCHAR(50)     NOT NULL DEFAULT 'Planned',
    [CreatedAt]         DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]         DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]       UNIQUEIDENTIFIER NULL,
    [UpdatedById]       UNIQUEIDENTIFIER NULL,
    [IsDeleted]         BIT              NOT NULL DEFAULT 0,
    [DeletedAt]         DATETIME2        NULL
);
GO

CREATE TABLE [Resource].[EquipmentDeployment] (
    [Id]           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [ResourceId]   UNIQUEIDENTIFIER NOT NULL REFERENCES [Resource].[Resources]([Id]),
    [ProjectId]    UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Projects]([Id]),
    [DeployedFrom] DATETIME2        NOT NULL,
    [DeployedTo]   DATETIME2        NULL,
    [Status]       NVARCHAR(50)     NOT NULL DEFAULT 'Deployed',
    [Notes]        NVARCHAR(500)    NULL,
    [DeployedById] UNIQUEIDENTIFIER NULL REFERENCES [Auth].[Users]([Id]),
    [CreatedAt]    DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]    DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]  UNIQUEIDENTIFIER NULL,
    [UpdatedById]  UNIQUEIDENTIFIER NULL,
    [IsDeleted]    BIT              NOT NULL DEFAULT 0,
    [DeletedAt]    DATETIME2        NULL
);
GO

-- ═══════════════════════════════════════════════════════
-- BUDGET TABLES
-- ═══════════════════════════════════════════════════════

CREATE TABLE [Budget].[ProjectBudgets] (
    [Id]                  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [ProjectId]           UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Projects]([Id]),
    [BudgetVersion]       NVARCHAR(100)    NOT NULL DEFAULT 'v1',
    [Status]              NVARCHAR(50)     NOT NULL DEFAULT 'Draft',
    [TotalApprovedBudget] DECIMAL(18,2)    NOT NULL DEFAULT 0,
    [RevisedBudget]       DECIMAL(18,2)    NULL,
    [Currency]            NVARCHAR(10)     NOT NULL DEFAULT 'USD',
    [ApprovedAt]          DATETIME2        NULL,
    [ApprovedById]        UNIQUEIDENTIFIER NULL REFERENCES [Auth].[Users]([Id]),
    [Notes]               NVARCHAR(2000)   NULL,
    [CreatedAt]           DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]           DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]         UNIQUEIDENTIFIER NULL,
    [UpdatedById]         UNIQUEIDENTIFIER NULL,
    [IsDeleted]           BIT              NOT NULL DEFAULT 0,
    [DeletedAt]           DATETIME2        NULL
);
GO

CREATE TABLE [Budget].[BudgetWBS] (
    [Id]              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [ProjectId]       UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Projects]([Id]),
    [ProjectBudgetId] UNIQUEIDENTIFIER NULL REFERENCES [Budget].[ProjectBudgets]([Id]),
    [ParentId]        UNIQUEIDENTIFIER NULL,
    [Description]     NVARCHAR(500)    NOT NULL,
    [WbsCode]         NVARCHAR(20)     NULL,
    [CostCode]        NVARCHAR(100)    NULL,
    [Level]           INT              NOT NULL DEFAULT 1,
    [BudgetAmount]    DECIMAL(18,2)    NOT NULL DEFAULT 0,
    [RevisedAmount]   DECIMAL(18,2)    NULL,
    [CommittedAmount] DECIMAL(18,2)    NOT NULL DEFAULT 0,
    [ExpendedAmount]  DECIMAL(18,2)    NOT NULL DEFAULT 0,
    [BalanceAmount]   DECIMAL(18,2)    NOT NULL DEFAULT 0,
    [BurnRate]        DECIMAL(5,2)     NOT NULL DEFAULT 0,
    [Currency]        NVARCHAR(10)     NOT NULL DEFAULT 'USD',
    [CreatedAt]       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]     UNIQUEIDENTIFIER NULL,
    [UpdatedById]     UNIQUEIDENTIFIER NULL,
    [IsDeleted]       BIT              NOT NULL DEFAULT 0,
    [DeletedAt]       DATETIME2        NULL,
    CONSTRAINT FK_BudgetWBS_Parent FOREIGN KEY ([ParentId]) REFERENCES [Budget].[BudgetWBS]([Id])
);
GO

CREATE TABLE [Budget].[CommittedAmounts] (
    [Id]             UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [BudgetWBSId]    UNIQUEIDENTIFIER NOT NULL REFERENCES [Budget].[BudgetWBS]([Id]),
    [ProjectId]      UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Projects]([Id]),
    [CommitmentType] NVARCHAR(100)    NOT NULL,
    [ReferenceNo]    NVARCHAR(100)    NULL,
    [ReferenceId]    UNIQUEIDENTIFIER NULL,
    [Amount]         DECIMAL(18,2)    NOT NULL,
    [Currency]       NVARCHAR(10)     NOT NULL DEFAULT 'USD',
    [CommitmentDate] DATETIME2        NOT NULL,
    [Description]    NVARCHAR(500)    NULL,
    [Status]         NVARCHAR(50)     NOT NULL DEFAULT 'Active',
    [RecordedById]   UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Users]([Id]),
    [CreatedAt]      DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]      DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]    UNIQUEIDENTIFIER NULL,
    [UpdatedById]    UNIQUEIDENTIFIER NULL,
    [IsDeleted]      BIT              NOT NULL DEFAULT 0,
    [DeletedAt]      DATETIME2        NULL
);
GO

CREATE TABLE [Budget].[Expenditures] (
    [Id]           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [BudgetWBSId]  UNIQUEIDENTIFIER NOT NULL REFERENCES [Budget].[BudgetWBS]([Id]),
    [ProjectId]    UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Projects]([Id]),
    [ExpenseType]  NVARCHAR(100)    NOT NULL,
    [ReferenceNo]  NVARCHAR(100)    NULL,
    [ReferenceId]  UNIQUEIDENTIFIER NULL,
    [Amount]       DECIMAL(18,2)    NOT NULL,
    [PaymentAmount] DECIMAL(18,2)   NULL,
    [Currency]     NVARCHAR(10)     NOT NULL DEFAULT 'USD',
    [ExpenseDate]  DATETIME2        NOT NULL,
    [VendorName]   NVARCHAR(300)    NULL,
    [Description]  NVARCHAR(1000)   NULL,
    [ReceiptPath]  NVARCHAR(500)    NULL,
    [ApprovedById] UNIQUEIDENTIFIER NULL REFERENCES [Auth].[Users]([Id]),
    [RecordedById] UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Users]([Id]),
    [CreatedAt]    DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]    DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]  UNIQUEIDENTIFIER NULL,
    [UpdatedById]  UNIQUEIDENTIFIER NULL,
    [IsDeleted]    BIT              NOT NULL DEFAULT 0,
    [DeletedAt]    DATETIME2        NULL
);
GO

-- ═══════════════════════════════════════════════════════
-- RISK TABLES
-- ═══════════════════════════════════════════════════════

CREATE TABLE [Risk].[Risks] (
    [Id]                 UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [ProjectId]          UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Projects]([Id]),
    [RiskNumber]         NVARCHAR(30)     NOT NULL,
    [Title]              NVARCHAR(500)    NOT NULL,
    [Description]        NVARCHAR(2000)   NULL,
    [Category]           NVARCHAR(100)    NULL,
    [RiskType]           NVARCHAR(50)     NULL,
    [Probability]        NVARCHAR(50)     NOT NULL DEFAULT 'Medium',
    [Impact]             NVARCHAR(50)     NOT NULL DEFAULT 'Medium',
    [RiskScore]          INT              NULL,
    [RiskLevel]          NVARCHAR(50)     NULL,
    [Status]             NVARCHAR(50)     NOT NULL DEFAULT 'Draft',
    [MitigationPlan]     NVARCHAR(2000)   NULL,
    [MitigationStrategy] NVARCHAR(50)     NULL,
    [ContingencyPlan]    NVARCHAR(2000)   NULL,
    [ContingencyBudget]  DECIMAL(18,2)    NULL,
    [RiskOwnerId]        UNIQUEIDENTIFIER NULL REFERENCES [Auth].[Users]([Id]),
    [ReviewDate]         DATETIME2        NULL,
    [ClosedAt]           DATETIME2        NULL,
    [ClosureReason]      NVARCHAR(500)    NULL,
    [RaisedById]         UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Users]([Id]),
    [CreatedAt]          DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]          DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]        UNIQUEIDENTIFIER NULL,
    [UpdatedById]        UNIQUEIDENTIFIER NULL,
    [IsDeleted]          BIT              NOT NULL DEFAULT 0,
    [DeletedAt]          DATETIME2        NULL
);
GO

CREATE TABLE [Risk].[RiskStakeholders] (
    [RiskId]   UNIQUEIDENTIFIER NOT NULL REFERENCES [Risk].[Risks]([Id]),
    [UserId]   UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Users]([Id]),
    [Role]     NVARCHAR(100)    NULL,
    [AddedAt]  DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_RiskStakeholders PRIMARY KEY ([RiskId],[UserId])
);
GO

CREATE TABLE [Risk].[RiskUpdates] (
    [Id]               UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
    [RiskId]           UNIQUEIDENTIFIER NOT NULL REFERENCES [Risk].[Risks]([Id]),
    [Notes]            NVARCHAR(2000)   NULL,
    [NewStatus]        NVARCHAR(50)     NULL,
    [NewProbability]   NVARCHAR(50)     NULL,
    [NewImpact]        NVARCHAR(50)     NULL,
    [NewRiskScore]     INT              NULL,
    [MitigationUpdate] NVARCHAR(2000)  NULL,
    [UpdatedById]      UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Users]([Id]),
    [CreatedAt]        DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]        DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    [CreatedById]      UNIQUEIDENTIFIER NULL,
    [IsDeleted]        BIT              NOT NULL DEFAULT 0,
    [DeletedAt]        DATETIME2        NULL
);
GO

-- ═══════════════════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════════════════

-- Roles
INSERT INTO [Auth].[Roles] ([Id],[Name],[Description],[IsSystem],[CreatedAt],[UpdatedAt],[IsDeleted]) VALUES
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

-- Admin user  (password: Admin@123)
DECLARE @AdminId   UNIQUEIDENTIFIER = NEWID();
DECLARE @AdminRoleId UNIQUEIDENTIFIER = (SELECT [Id] FROM [Auth].[Roles] WHERE [Name]='Admin');

INSERT INTO [Auth].[Users]
    ([Id],[FirstName],[LastName],[Email],[PasswordHash],[IsActive],[MustChangePassword],
     [FailedLoginAttempts],[Department],[JobTitle],[CreatedAt],[UpdatedAt],[IsDeleted])
VALUES
    (@AdminId,'System','Administrator','admin@mmgepm.com',
     '$2b$11$2WAL7cgMHWjqVh4fh4CE5eSiISVeSFnGfpD1bEVk255Ak2GdcNeUu',
     1,0,0,'IT','System Administrator',SYSUTCDATETIME(),SYSUTCDATETIME(),0);

INSERT INTO [Auth].[UserRoles]([UserId],[RoleId],[AssignedAt])
VALUES(@AdminId,@AdminRoleId,SYSUTCDATETIME());
GO

-- Countries
INSERT INTO [Auth].[Countries]([Id],[Name],[Code],[CurrencyCode],[CreatedAt],[UpdatedAt],[IsDeleted]) VALUES
(NEWID(),'Tanzania',            'TZA','TZS',SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'Kenya',               'KEN','KES',SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'Uganda',              'UGA','UGX',SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'Rwanda',              'RWA','RWF',SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'Ethiopia',            'ETH','ETB',SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'Ghana',               'GHA','GHS',SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'South Africa',        'ZAF','ZAR',SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'United Arab Emirates','UAE','AED',SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'India',               'IND','INR',SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'United States',       'USA','USD',SYSUTCDATETIME(),SYSUTCDATETIME(),0);
GO

-- SBU Codes
INSERT INTO [Auth].[SBUCodes]([Id],[Code],[Name],[Country],[IsActive],[CreatedAt],[UpdatedAt],[IsDeleted]) VALUES
(NEWID(),'MMG-TZ', 'MMG Tanzania',    'Tanzania',1,SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'MMG-KE', 'MMG Kenya',       'Kenya',   1,SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'MMG-UG', 'MMG Uganda',      'Uganda',  1,SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'MMG-ETH','MMG Ethiopia',    'Ethiopia',1,SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'MMG-GH', 'MMG Ghana',       'Ghana',   1,SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'MMG-UAE','MMG Middle East', 'UAE',     1,SYSUTCDATETIME(),SYSUTCDATETIME(),0);
GO

-- Notification Templates
INSERT INTO [Notify].[NotificationTemplates]([Id],[Code],[Subject],[Body],[Channel],[IsActive],[CreatedAt],[UpdatedAt],[IsDeleted]) VALUES
(NEWID(),'TASK_ASSIGNED','Task Assigned','Task {{TaskName}} assigned to you','Both',1,SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'TASK_DUE',     'Task Due',     'Task {{TaskName}} is due soon',    'Both',1,SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'RISK_RAISED',  'New Risk',     'New risk raised: {{RiskTitle}}',   'Both',1,SYSUTCDATETIME(),SYSUTCDATETIME(),0),
(NEWID(),'MR_APPROVAL',  'MR Approval',  'MR {{MRNumber}} needs approval',   'Both',1,SYSUTCDATETIME(),SYSUTCDATETIME(),0);
GO

PRINT '=============================================';
PRINT ' MMG EPM Database installed successfully!';
PRINT ' Login: admin@mmgepm.com / Admin@123';
PRINT '=============================================';
GO
