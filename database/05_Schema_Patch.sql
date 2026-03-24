-- ═══════════════════════════════════════════════════════════════════════════
-- MMG EPM — SCHEMA PATCH (idempotent — safe to run multiple times)
-- Run AFTER FRESH_INSTALL.sql if you already have a working database
-- and only need to add newer tables/columns without losing data.
-- ═══════════════════════════════════════════════════════════════════════════

USE MMG_EPM;
GO

-- ── TaskDelays ─────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE name='TaskDelays' AND schema_id=SCHEMA_ID('Project'))
BEGIN
    CREATE TABLE Project.TaskDelays (
        Id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        TaskId      UNIQUEIDENTIFIER NOT NULL,
        DelayType   NVARCHAR(50)     NOT NULL,
        DelayHours  DECIMAL(10,2)    NOT NULL DEFAULT 0,
        Description NVARCHAR(2000)   NULL,
        LoggedById  UNIQUEIDENTIFIER NOT NULL,
        CreatedAt   DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt   DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        CreatedById UNIQUEIDENTIFIER NULL,
        UpdatedById UNIQUEIDENTIFIER NULL,
        IsDeleted   BIT              NOT NULL DEFAULT 0,
        DeletedAt   DATETIME2        NULL,
        FOREIGN KEY (TaskId)     REFERENCES Project.Tasks(Id),
        FOREIGN KEY (LoggedById) REFERENCES Auth.Users(Id)
    );
    PRINT 'Created Project.TaskDelays';
END
GO

-- ── TaskComments ───────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE name='TaskComments' AND schema_id=SCHEMA_ID('Project'))
BEGIN
    CREATE TABLE Project.TaskComments (
        Id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        TaskId          UNIQUEIDENTIFIER NOT NULL,
        UserId          UNIQUEIDENTIFIER NOT NULL,
        Content         NVARCHAR(2000)   NOT NULL,
        ParentCommentId UNIQUEIDENTIFIER NULL,
        CreatedAt       DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt       DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        CreatedById     UNIQUEIDENTIFIER NULL,
        UpdatedById     UNIQUEIDENTIFIER NULL,
        IsDeleted       BIT              NOT NULL DEFAULT 0,
        DeletedAt       DATETIME2        NULL,
        FOREIGN KEY (TaskId)          REFERENCES Project.Tasks(Id),
        FOREIGN KEY (UserId)          REFERENCES Auth.Users(Id),
        FOREIGN KEY (ParentCommentId) REFERENCES Project.TaskComments(Id)
    );
    PRINT 'Created Project.TaskComments';
END
GO

-- ── TaskDependencies ───────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE name='TaskDependencies' AND schema_id=SCHEMA_ID('Project'))
BEGIN
    CREATE TABLE Project.TaskDependencies (
        Id             UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        TaskId         UNIQUEIDENTIFIER NOT NULL,
        PredecessorId  UNIQUEIDENTIFIER NOT NULL,
        DependencyType NVARCHAR(20)     NOT NULL DEFAULT 'FS',
        LagDays        INT              NOT NULL DEFAULT 0,
        CreatedAt      DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt      DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        CreatedById    UNIQUEIDENTIFIER NULL,
        UpdatedById    UNIQUEIDENTIFIER NULL,
        IsDeleted      BIT              NOT NULL DEFAULT 0,
        DeletedAt      DATETIME2        NULL,
        FOREIGN KEY (TaskId)        REFERENCES Project.Tasks(Id),
        FOREIGN KEY (PredecessorId) REFERENCES Project.Tasks(Id)
    );
    PRINT 'Created Project.TaskDependencies';
END
GO

-- ── DrawingVersions ────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE name='DrawingVersions' AND schema_id=SCHEMA_ID('Document'))
BEGIN
    CREATE TABLE Document.DrawingVersions (
        Id            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        DrawingId     UNIQUEIDENTIFIER NOT NULL,
        VersionNumber INT              NOT NULL DEFAULT 1,
        Revision      NVARCHAR(20)     NOT NULL DEFAULT 'A',
        FilePath      NVARCHAR(1000)   NULL,
        FileUrl       NVARCHAR(500)    NULL,
        Notes         NVARCHAR(500)    NULL,
        Status        NVARCHAR(50)     NOT NULL DEFAULT 'Current',
        RevisedById   UNIQUEIDENTIFIER NOT NULL,
        CreatedAt     DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt     DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        CreatedById   UNIQUEIDENTIFIER NULL,
        UpdatedById   UNIQUEIDENTIFIER NULL,
        IsDeleted     BIT              NOT NULL DEFAULT 0,
        DeletedAt     DATETIME2        NULL,
        FOREIGN KEY (DrawingId)   REFERENCES Document.Drawings(Id),
        FOREIGN KEY (RevisedById) REFERENCES Auth.Users(Id)
    );
    PRINT 'Created Document.DrawingVersions';
END
GO

-- ── ChangeRequestLogs ──────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE name='ChangeRequestLogs' AND schema_id=SCHEMA_ID('Document'))
BEGIN
    CREATE TABLE Document.ChangeRequestLogs (
        Id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        ChangeRequestId UNIQUEIDENTIFIER NOT NULL,
        FromState       NVARCHAR(50)     NOT NULL,
        ToState         NVARCHAR(50)     NOT NULL,
        Comments        NVARCHAR(2000)   NULL,
        ChangedById     UNIQUEIDENTIFIER NOT NULL,
        CreatedAt       DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt       DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        CreatedById     UNIQUEIDENTIFIER NULL,
        UpdatedById     UNIQUEIDENTIFIER NULL,
        IsDeleted       BIT              NOT NULL DEFAULT 0,
        DeletedAt       DATETIME2        NULL,
        FOREIGN KEY (ChangeRequestId) REFERENCES Document.ChangeRequests(Id),
        FOREIGN KEY (ChangedById)     REFERENCES Auth.Users(Id)
    );
    PRINT 'Created Document.ChangeRequestLogs';
END
GO

-- ── Reconciliations ────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE name='Reconciliations' AND schema_id=SCHEMA_ID('Inventory'))
BEGIN
    CREATE TABLE Inventory.Reconciliations (
        Id            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        ProjectId     UNIQUEIDENTIFIER NOT NULL,
        Status        NVARCHAR(50)     NOT NULL DEFAULT 'InProgress',
        VersionNumber INT              NOT NULL DEFAULT 1,
        CompletedAt   DATETIME2        NULL,
        OfficerId     UNIQUEIDENTIFIER NULL,
        PdfPath       NVARCHAR(1000)   NULL,
        CreatedAt     DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt     DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        CreatedById   UNIQUEIDENTIFIER NULL,
        UpdatedById   UNIQUEIDENTIFIER NULL,
        IsDeleted     BIT              NOT NULL DEFAULT 0,
        DeletedAt     DATETIME2        NULL,
        FOREIGN KEY (ProjectId) REFERENCES Project.Projects(Id),
        FOREIGN KEY (OfficerId) REFERENCES Auth.Users(Id)
    );
    PRINT 'Created Inventory.Reconciliations';
END
GO

-- ── ReconciliationItems ────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE name='ReconciliationItems' AND schema_id=SCHEMA_ID('Inventory'))
BEGIN
    CREATE TABLE Inventory.ReconciliationItems (
        Id               UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        ReconciliationId UNIQUEIDENTIFIER NOT NULL,
        MaterialId       UNIQUEIDENTIFIER NOT NULL,
        MaterialName     NVARCHAR(300)    NOT NULL DEFAULT '',
        SystemStock      DECIMAL(10,3)    NOT NULL DEFAULT 0,
        PhysicalStock    DECIMAL(10,3)    NULL,
        Variance         DECIMAL(10,3)    NULL,
        CreatedAt        DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt        DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        CreatedById      UNIQUEIDENTIFIER NULL,
        UpdatedById      UNIQUEIDENTIFIER NULL,
        IsDeleted        BIT              NOT NULL DEFAULT 0,
        DeletedAt        DATETIME2        NULL,
        FOREIGN KEY (ReconciliationId) REFERENCES Inventory.Reconciliations(Id),
        FOREIGN KEY (MaterialId)       REFERENCES Inventory.Materials(Id)
    );
    PRINT 'Created Inventory.ReconciliationItems';
END
GO

-- ── Quotations ─────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE name='Quotations' AND schema_id=SCHEMA_ID('Procurement'))
BEGIN
    CREATE TABLE Procurement.Quotations (
        Id                     UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        MaterialRequestId      UNIQUEIDENTIFIER NOT NULL,
        VendorId               UNIQUEIDENTIFIER NOT NULL,
        UnitPrice              DECIMAL(18,2)    NOT NULL DEFAULT 0,
        LeadTimeDays           INT              NULL,
        ValidityDate           DATETIME2        NULL,
        PaymentTerms           NVARCHAR(500)    NULL,
        AttachmentPath         NVARCHAR(500)    NULL,
        IsRecommended          BIT              NOT NULL DEFAULT 0,
        IsSelected             BIT              NOT NULL DEFAULT 0,
        SelectionJustification NVARCHAR(1000)   NULL,
        TechnicalScore         DECIMAL(5,2)     NULL,
        CreatedAt              DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt              DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        CreatedById            UNIQUEIDENTIFIER NULL,
        UpdatedById            UNIQUEIDENTIFIER NULL,
        IsDeleted              BIT              NOT NULL DEFAULT 0,
        DeletedAt              DATETIME2        NULL,
        FOREIGN KEY (MaterialRequestId) REFERENCES Procurement.MaterialRequests(Id),
        FOREIGN KEY (VendorId)          REFERENCES Procurement.Vendors(Id)
    );
    PRINT 'Created Procurement.Quotations';
END
GO

-- ── NegotiationLogs ────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE name='NegotiationLogs' AND schema_id=SCHEMA_ID('Procurement'))
BEGIN
    CREATE TABLE Procurement.NegotiationLogs (
        Id                UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        MaterialRequestId UNIQUEIDENTIFIER NOT NULL,
        VendorId          UNIQUEIDENTIFIER NOT NULL,
        Round             INT              NOT NULL DEFAULT 1,
        NegotiatedPrice   DECIMAL(18,2)    NOT NULL DEFAULT 0,
        InitialPrice      DECIMAL(18,2)    NULL,
        Notes             NVARCHAR(1000)   NULL,
        LoggedById        UNIQUEIDENTIFIER NOT NULL,
        CreatedAt         DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt         DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        CreatedById       UNIQUEIDENTIFIER NULL,
        UpdatedById       UNIQUEIDENTIFIER NULL,
        IsDeleted         BIT              NOT NULL DEFAULT 0,
        DeletedAt         DATETIME2        NULL,
        FOREIGN KEY (MaterialRequestId) REFERENCES Procurement.MaterialRequests(Id),
        FOREIGN KEY (VendorId)          REFERENCES Procurement.Vendors(Id),
        FOREIGN KEY (LoggedById)        REFERENCES Auth.Users(Id)
    );
    PRINT 'Created Procurement.NegotiationLogs';
END
GO

-- ── DPRReports column patches ──────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Project.DPRReports') AND name='LocationOfWork')
BEGIN
    ALTER TABLE Project.DPRReports ADD LocationOfWork NVARCHAR(500) NULL;
    PRINT 'Added Project.DPRReports.LocationOfWork';
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Project.DPRReports') AND name='WeatherType')
BEGIN
    ALTER TABLE Project.DPRReports ADD WeatherType NVARCHAR(50) NULL;
    PRINT 'Added Project.DPRReports.WeatherType';
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Project.DPRReports') AND name='PdfPath')
BEGIN
    ALTER TABLE Project.DPRReports ADD PdfPath NVARCHAR(1000) NULL;
    PRINT 'Added Project.DPRReports.PdfPath';
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Project.DPRReports') AND name='IsAutoGenerated')
BEGIN
    ALTER TABLE Project.DPRReports ADD IsAutoGenerated BIT NOT NULL DEFAULT 0;
    PRINT 'Added Project.DPRReports.IsAutoGenerated';
END
GO

-- ── CrewAttendance column patches ─────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Project.CrewAttendance') AND name='ApprovalStatus')
BEGIN
    ALTER TABLE Project.CrewAttendance ADD ApprovalStatus NVARCHAR(50) NOT NULL DEFAULT 'Pending';
    PRINT 'Added Project.CrewAttendance.ApprovalStatus';
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Project.CrewAttendance') AND name='ApprovedById')
BEGIN
    ALTER TABLE Project.CrewAttendance ADD ApprovedById UNIQUEIDENTIFIER NULL;
    PRINT 'Added Project.CrewAttendance.ApprovedById';
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Project.CrewAttendance') AND name='PlannedCount')
BEGIN
    ALTER TABLE Project.CrewAttendance ADD PlannedCount INT NULL;
    PRINT 'Added Project.CrewAttendance.PlannedCount';
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Project.CrewAttendance') AND name='ActualCount')
BEGIN
    ALTER TABLE Project.CrewAttendance ADD ActualCount INT NULL;
    PRINT 'Added Project.CrewAttendance.ActualCount';
END
GO

-- ── Risk.Risks column patches ──────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Risk.Risks') AND name='RaisedOn')
BEGIN
    ALTER TABLE Risk.Risks ADD RaisedOn DATETIME2 NULL;
    PRINT 'Added Risk.Risks.RaisedOn';
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Risk.Risks') AND name='AcknowledgedOn')
BEGIN
    ALTER TABLE Risk.Risks ADD AcknowledgedOn DATETIME2 NULL;
    PRINT 'Added Risk.Risks.AcknowledgedOn';
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Risk.Risks') AND name='AnalysisCompletedOn')
BEGIN
    ALTER TABLE Risk.Risks ADD AnalysisCompletedOn DATETIME2 NULL;
    PRINT 'Added Risk.Risks.AnalysisCompletedOn';
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Risk.Risks') AND name='ClosedOnTimestamp')
BEGIN
    ALTER TABLE Risk.Risks ADD ClosedOnTimestamp DATETIME2 NULL;
    PRINT 'Added Risk.Risks.ClosedOnTimestamp';
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Risk.Risks') AND name='RejectedOn')
BEGIN
    ALTER TABLE Risk.Risks ADD RejectedOn DATETIME2 NULL;
    PRINT 'Added Risk.Risks.RejectedOn';
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('Risk.Risks') AND name='VoidRemarks')
BEGIN
    ALTER TABLE Risk.Risks ADD VoidRemarks NVARCHAR(1000) NULL;
    PRINT 'Added Risk.Risks.VoidRemarks';
END
GO

PRINT '';
PRINT '=== Patch complete ===';
GO
