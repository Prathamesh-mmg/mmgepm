-- ============================================================
-- MMG EPM - Supplemental Schema Patch
-- Run this AFTER the main 01_Schema_Core.sql ... 04_SeedData.sql
-- ============================================================

USE MMG_EPM;
GO

-- ─── Vendors table (referenced in Procurement module) ─────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Vendors' AND SCHEMA_NAME(schema_id) = 'Procurement')
BEGIN
    CREATE TABLE [Procurement].[Vendors] (
        [Id]            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
        [Name]          NVARCHAR(300)    NOT NULL,
        [VendorCode]    NVARCHAR(50)     NOT NULL,
        [ContactPerson] NVARCHAR(200)    NULL,
        [Email]         NVARCHAR(256)    NULL,
        [Phone]         NVARCHAR(20)     NULL,
        [Country]       NVARCHAR(100)    NULL,
        [Address]       NVARCHAR(500)    NULL,
        [Category]      NVARCHAR(100)    NULL,
        [TaxId]         NVARCHAR(20)     NULL,
        [BankName]      NVARCHAR(100)    NULL,
        [BankAccount]   NVARCHAR(50)     NULL,
        [IsApproved]    BIT              NOT NULL DEFAULT 0,
        [IsActive]      BIT              NOT NULL DEFAULT 1,
        [CreditDays]    INT              NULL,
        [CreatedAt]     DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        [UpdatedAt]     DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedById]   UNIQUEIDENTIFIER NULL,
        [UpdatedById]   UNIQUEIDENTIFIER NULL,
        [IsDeleted]     BIT              NOT NULL DEFAULT 0,
        [DeletedAt]     DATETIME2        NULL
    );
    CREATE UNIQUE INDEX [UX_Vendors_Code] ON [Procurement].[Vendors] ([VendorCode]) WHERE [IsDeleted] = 0;
    PRINT 'Created Procurement.Vendors table';
END
GO

-- Add VendorId FK to PurchaseOrders if not already present
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('[Procurement].[PurchaseOrders]') AND name = 'VendorId'
)
BEGIN
    ALTER TABLE [Procurement].[PurchaseOrders]
        ADD [VendorId] UNIQUEIDENTIFIER NULL
        CONSTRAINT [FK_PurchaseOrders_Vendors] FOREIGN KEY REFERENCES [Procurement].[Vendors]([Id]);
    PRINT 'Added VendorId FK to PurchaseOrders';
END
GO

-- ─── Ensure Drawings table has all required columns ───────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Drawings' AND SCHEMA_NAME(schema_id) = 'Document')
BEGIN
    CREATE TABLE [Document].[Drawings] (
        [Id]             UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
        [ProjectId]      UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Projects]([Id]),
        [DrawingNumber]  NVARCHAR(100)    NOT NULL,
        [Title]          NVARCHAR(500)    NOT NULL,
        [Discipline]     NVARCHAR(100)    NULL,
        [Scale]          NVARCHAR(50)     NULL,
        [Revision]       NVARCHAR(20)     NOT NULL DEFAULT 'A',
        [Status]         NVARCHAR(50)     NOT NULL DEFAULT 'IFC',
        [FileAttachmentId] UNIQUEIDENTIFIER NULL,
        [UploadedById]   UNIQUEIDENTIFIER NOT NULL REFERENCES [Auth].[Users]([Id]),
        [CreatedAt]      DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        [UpdatedAt]      DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedById]    UNIQUEIDENTIFIER NULL,
        [UpdatedById]    UNIQUEIDENTIFIER NULL,
        [IsDeleted]      BIT              NOT NULL DEFAULT 0,
        [DeletedAt]      DATETIME2        NULL
    );
    PRINT 'Created Document.Drawings table';
END
GO

-- ─── Ensure Resource table columns ────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Resources' AND SCHEMA_NAME(schema_id) = 'Resource')
BEGIN
    CREATE TABLE [Resource].[Resources] (
        [Id]           UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
        [Name]         NVARCHAR(300)    NOT NULL,
        [Code]         NVARCHAR(50)     NULL,
        [ResourceTypeId] UNIQUEIDENTIFIER NULL,
        [CalendarId]   UNIQUEIDENTIFIER NULL,
        [Location]     NVARCHAR(100)    NULL,
        [Availability] NVARCHAR(100)    NULL,
        [CostPerHour]  DECIMAL(18,2)    NULL,
        [CostPerDay]   DECIMAL(18,2)    NULL,
        [Currency]     NVARCHAR(10)     NOT NULL DEFAULT 'USD',
        [Status]       NVARCHAR(50)     NOT NULL DEFAULT 'Available',
        [Notes]        NVARCHAR(500)    NULL,
        [Make]         NVARCHAR(100)    NULL,
        [Model]        NVARCHAR(100)    NULL,
        [SerialNumber] NVARCHAR(50)     NULL,
        [UserId]       UNIQUEIDENTIFIER NULL,
        [CreatedAt]    DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        [UpdatedAt]    DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedById]  UNIQUEIDENTIFIER NULL,
        [UpdatedById]  UNIQUEIDENTIFIER NULL,
        [IsDeleted]    BIT              NOT NULL DEFAULT 0,
        [DeletedAt]    DATETIME2        NULL
    );
    PRINT 'Created Resource.Resources table';
END
GO

-- ─── ProjectBudgets table ─────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ProjectBudgets' AND SCHEMA_NAME(schema_id) = 'Budget')
BEGIN
    CREATE TABLE [Budget].[ProjectBudgets] (
        [Id]                   UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
        [ProjectId]            UNIQUEIDENTIFIER NOT NULL REFERENCES [Project].[Projects]([Id]),
        [BudgetVersion]        NVARCHAR(100)    NOT NULL DEFAULT 'v1',
        [Status]               NVARCHAR(50)     NOT NULL DEFAULT 'Draft',
        [TotalApprovedBudget]  DECIMAL(18,2)    NOT NULL DEFAULT 0,
        [RevisedBudget]        DECIMAL(18,2)    NULL,
        [Currency]             NVARCHAR(10)     NOT NULL DEFAULT 'USD',
        [ApprovedAt]           DATETIME2        NULL,
        [ApprovedById]         UNIQUEIDENTIFIER NULL,
        [Notes]                NVARCHAR(2000)   NULL,
        [CreatedAt]            DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        [UpdatedAt]            DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedById]          UNIQUEIDENTIFIER NULL,
        [UpdatedById]          UNIQUEIDENTIFIER NULL,
        [IsDeleted]            BIT              NOT NULL DEFAULT 0,
        [DeletedAt]            DATETIME2        NULL
    );
    PRINT 'Created Budget.ProjectBudgets table';
END
GO

-- ─── Seed sample vendors ──────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM [Procurement].[Vendors] WHERE [VendorCode] = 'VEN-001')
BEGIN
    INSERT INTO [Procurement].[Vendors] ([Id],[Name],[VendorCode],[ContactPerson],[Email],[Country],[Category],[IsApproved],[IsActive]) VALUES
    (NEWID(),'Simba Cement Ltd',      'VEN-001','John Doe',   'john@simbacements.co.tz',  'Tanzania', 'Construction Materials', 1, 1),
    (NEWID(),'East Africa Steel',     'VEN-002','Jane Smith', 'jane@eastafsteel.com',     'Kenya',    'Steel & Metal',          1, 1),
    (NEWID(),'Kilimo Power Solutions','VEN-003','Ali Hassan', 'ali@kilimopwr.com',        'Tanzania', 'Electrical',             1, 1),
    (NEWID(),'Hydraulic Systems Ltd', 'VEN-004','Mary Osei',  'mary@hydraulics.com.gh',   'Ghana',    'Mechanical',             0, 1),
    (NEWID(),'ProBuild Kenya',        'VEN-005','Paul Ngugi', 'paul@probuild.co.ke',      'Kenya',    'General Construction',   1, 1);
    PRINT 'Seeded sample vendors';
END
GO

PRINT '=== MMG EPM Supplemental Schema Patch COMPLETE ===';
GO
