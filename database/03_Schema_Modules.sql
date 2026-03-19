-- ============================================================
-- MMG EPM - Module III: Document Management
-- ============================================================

USE MMGEPM;
GO

CREATE TABLE Document.FolderTemplates (
    FolderId        INT IDENTITY(1,1) NOT NULL,
    ParentFolderId  INT               NULL,
    FolderName      NVARCHAR(300)     NOT NULL,
    FolderLevel     TINYINT           NOT NULL DEFAULT 1,
    SortOrder       INT               NOT NULL DEFAULT 0,
    IsSystem        BIT               NOT NULL DEFAULT 1, -- system-defined vs user-created
    CONSTRAINT PK_FolderTemplates PRIMARY KEY (FolderId),
    CONSTRAINT FK_FolderTemplates_Parent FOREIGN KEY (ParentFolderId) REFERENCES Document.FolderTemplates(FolderId)
);
GO

CREATE TABLE Document.ProjectFolders (
    ProjectFolderId INT IDENTITY(1,1) NOT NULL,
    ProjectId       INT               NOT NULL,
    FolderTemplateId INT              NULL,
    ParentFolderId  INT               NULL,
    FolderName      NVARCHAR(300)     NOT NULL,
    FolderPath      NVARCHAR(1000)    NOT NULL,
    FolderLevel     TINYINT           NOT NULL DEFAULT 1,
    SortOrder       INT               NOT NULL DEFAULT 0,
    CreatedBy       INT               NOT NULL,
    CreatedAt       DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_ProjectFolders PRIMARY KEY (ProjectFolderId),
    CONSTRAINT FK_ProjectFolders_Projects FOREIGN KEY (ProjectId) REFERENCES Project.Projects(ProjectId),
    CONSTRAINT FK_ProjectFolders_Parent FOREIGN KEY (ParentFolderId) REFERENCES Document.ProjectFolders(ProjectFolderId),
    CONSTRAINT FK_ProjectFolders_Template FOREIGN KEY (FolderTemplateId) REFERENCES Document.FolderTemplates(FolderId)
);
GO

CREATE TABLE Document.Documents (
    DocumentId      INT IDENTITY(1,1) NOT NULL,
    ProjectId       INT               NOT NULL,
    FolderId        INT               NOT NULL,
    DocumentTitle   NVARCHAR(500)     NOT NULL,
    DocumentCode    NVARCHAR(100)     NULL,
    DocumentType    NVARCHAR(100)     NULL,
    Revision        NVARCHAR(20)      NULL DEFAULT 'Rev.0',
    StatusId        TINYINT           NOT NULL DEFAULT 1, -- 1=Draft,2=Under Review,3=Approved,4=Superseded
    FileId          INT               NULL,
    Description     NVARCHAR(2000)    NULL,
    Tags            NVARCHAR(500)     NULL,
    ExpiryDate      DATE              NULL,
    UploadedBy      INT               NOT NULL,
    ApprovedBy      INT               NULL,
    ApprovedAt      DATETIME2         NULL,
    CreatedAt       DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Documents PRIMARY KEY (DocumentId),
    CONSTRAINT FK_Documents_Projects FOREIGN KEY (ProjectId) REFERENCES Project.Projects(ProjectId),
    CONSTRAINT FK_Documents_Folders FOREIGN KEY (FolderId) REFERENCES Document.ProjectFolders(ProjectFolderId),
    CONSTRAINT FK_Documents_Files FOREIGN KEY (FileId) REFERENCES Auth.FileAttachments(FileId),
    CONSTRAINT FK_Documents_UploadedBy FOREIGN KEY (UploadedBy) REFERENCES Auth.Users(UserId)
);
GO

CREATE TABLE Document.Drawings (
    DrawingId       INT IDENTITY(1,1) NOT NULL,
    ProjectId       INT               NOT NULL,
    DrawingNumber   NVARCHAR(100)     NOT NULL,
    DrawingTitle    NVARCHAR(500)     NOT NULL,
    DrawingType     NVARCHAR(100)     NULL, -- Civil, Mechanical, Electrical, P&ID
    Revision        NVARCHAR(20)      NULL DEFAULT 'Rev.0',
    StatusId        TINYINT           NOT NULL DEFAULT 1, -- 1=IFR,2=IFC,3=Approved,4=AsBuilt
    FileId          INT               NULL,
    Scale           NVARCHAR(50)      NULL,
    DrawnBy         NVARCHAR(200)     NULL,
    CheckedBy       NVARCHAR(200)     NULL,
    ApprovedBy      INT               NULL,
    IssuedDate      DATE              NULL,
    CreatedBy       INT               NOT NULL,
    CreatedAt       DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Drawings PRIMARY KEY (DrawingId),
    CONSTRAINT FK_Drawings_Projects FOREIGN KEY (ProjectId) REFERENCES Project.Projects(ProjectId),
    CONSTRAINT FK_Drawings_Files FOREIGN KEY (FileId) REFERENCES Auth.FileAttachments(FileId),
    CONSTRAINT FK_Drawings_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Auth.Users(UserId)
);
GO

CREATE TABLE Document.ChangeRequests (
    ChangeRequestId INT IDENTITY(1,1) NOT NULL,
    ProjectId       INT               NOT NULL,
    CRNumber        NVARCHAR(50)      NOT NULL,
    Title           NVARCHAR(500)     NOT NULL,
    Description     NVARCHAR(3000)    NOT NULL,
    ImpactScope     NVARCHAR(100)     NULL, -- Timeline, Cost, Scope, Quality
    CostImpact      DECIMAL(18,2)     NULL,
    TimeImpactDays  INT               NULL,
    StatusId        TINYINT           NOT NULL DEFAULT 1, -- 1=Raised,2=Under Review,3=Approved,4=Rejected,5=Implemented
    RaisedBy        INT               NOT NULL,
    AssignedTo      INT               NULL,
    DueDate         DATE              NULL,
    FileId          INT               NULL,
    Remarks         NVARCHAR(1000)    NULL,
    CreatedAt       DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_ChangeRequests PRIMARY KEY (ChangeRequestId),
    CONSTRAINT UQ_ChangeRequests_CRNumber UNIQUE (ProjectId, CRNumber),
    CONSTRAINT FK_ChangeRequests_Projects FOREIGN KEY (ProjectId) REFERENCES Project.Projects(ProjectId),
    CONSTRAINT FK_ChangeRequests_RaisedBy FOREIGN KEY (RaisedBy) REFERENCES Auth.Users(UserId)
);
GO

-- ============================================================
-- MODULE IV: PROCUREMENT TRACKER
-- ============================================================

CREATE TABLE Procurement.MaterialRequests (
    MRId            INT IDENTITY(1,1) NOT NULL,
    MRCode          NVARCHAR(50)      NOT NULL,
    ProjectId       INT               NOT NULL,
    SubProjectId    INT               NULL,
    MRDate          DATE              NOT NULL DEFAULT CAST(SYSUTCDATETIME() AS DATE),
    RequiredDate    DATE              NOT NULL,
    Purpose         NVARCHAR(1000)    NULL,
    StatusId        TINYINT           NOT NULL DEFAULT 1,
    -- Status flow: 1=MR Raised, 2=PM Review, 3=Under Purchase, 4=PO Issued, 5=Under Payment, 6=Doc Compliance, 7=Material Dispatched, 8=On Site, 9=Closed
    MRDocumentFileId INT              NULL,
    PMApprovedAt    DATETIME2         NULL,
    PMApprovedBy    INT               NULL,
    Remarks         NVARCHAR(1000)    NULL,
    RaisedBy        INT               NOT NULL,
    CreatedAt       DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_MaterialRequests PRIMARY KEY (MRId),
    CONSTRAINT UQ_MaterialRequests_Code UNIQUE (MRCode),
    CONSTRAINT FK_MaterialRequests_Projects FOREIGN KEY (ProjectId) REFERENCES Project.Projects(ProjectId),
    CONSTRAINT FK_MaterialRequests_SubProjects FOREIGN KEY (SubProjectId) REFERENCES Project.SubProjects(SubProjectId),
    CONSTRAINT FK_MaterialRequests_RaisedBy FOREIGN KEY (RaisedBy) REFERENCES Auth.Users(UserId)
);
GO

CREATE TABLE Procurement.MRLineItems (
    LineItemId      INT IDENTITY(1,1) NOT NULL,
    MRId            INT               NOT NULL,
    MaterialName    NVARCHAR(300)     NOT NULL,
    MaterialCode    NVARCHAR(100)     NULL,
    Specification   NVARCHAR(500)     NULL,
    Unit            NVARCHAR(50)      NOT NULL,
    RequiredQty     DECIMAL(14,3)     NOT NULL,
    Remarks         NVARCHAR(500)     NULL,
    CONSTRAINT PK_MRLineItems PRIMARY KEY (LineItemId),
    CONSTRAINT FK_MRLineItems_MR FOREIGN KEY (MRId) REFERENCES Procurement.MaterialRequests(MRId)
);
GO

CREATE TABLE Procurement.PurchaseOrders (
    POId            INT IDENTITY(1,1) NOT NULL,
    PONumber        NVARCHAR(100)     NOT NULL,
    MRId            INT               NULL,
    ProjectId       INT               NOT NULL,
    VendorName      NVARCHAR(300)     NOT NULL,
    PODate          DATE              NOT NULL,
    POAmount        DECIMAL(18,2)     NOT NULL,
    Currency        NVARCHAR(10)      NOT NULL DEFAULT 'USD',
    ExpectedDelivery DATE             NULL,
    StatusId        TINYINT           NOT NULL DEFAULT 1,
    POFileId        INT               NULL,
    Remarks         NVARCHAR(1000)    NULL,
    CreatedBy       INT               NOT NULL,
    CreatedAt       DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_PurchaseOrders PRIMARY KEY (POId),
    CONSTRAINT UQ_PurchaseOrders_Number UNIQUE (PONumber),
    CONSTRAINT FK_PurchaseOrders_Projects FOREIGN KEY (ProjectId) REFERENCES Project.Projects(ProjectId),
    CONSTRAINT FK_PurchaseOrders_MR FOREIGN KEY (MRId) REFERENCES Procurement.MaterialRequests(MRId)
);
GO

CREATE TABLE Procurement.POPayments (
    PaymentId       INT IDENTITY(1,1) NOT NULL,
    POId            INT               NOT NULL,
    PaymentDate     DATE              NOT NULL,
    PaymentPercent  DECIMAL(5,2)      NOT NULL,
    PaymentAmount   DECIMAL(18,2)     NOT NULL,
    PaymentRef      NVARCHAR(200)     NULL,
    Remarks         NVARCHAR(500)     NULL,
    RecordedBy      INT               NOT NULL,
    CreatedAt       DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_POPayments PRIMARY KEY (PaymentId),
    CONSTRAINT FK_POPayments_PO FOREIGN KEY (POId) REFERENCES Procurement.PurchaseOrders(POId),
    CONSTRAINT FK_POPayments_RecordedBy FOREIGN KEY (RecordedBy) REFERENCES Auth.Users(UserId)
);
GO

-- ============================================================
-- MODULE V: INVENTORY MANAGEMENT
-- ============================================================

CREATE TABLE Inventory.MaterialCategories (
    CategoryId      INT IDENTITY(1,1) NOT NULL,
    CategoryName    NVARCHAR(100)     NOT NULL,
    CategoryType    NVARCHAR(50)      NULL, -- Civil, Mechanical, Electrical, Other
    IsActive        BIT               NOT NULL DEFAULT 1,
    CONSTRAINT PK_MaterialCategories PRIMARY KEY (CategoryId)
);
GO

CREATE TABLE Inventory.Materials (
    MaterialId      INT IDENTITY(1,1) NOT NULL,
    MaterialCode    NVARCHAR(100)     NOT NULL,
    MaterialName    NVARCHAR(300)     NOT NULL,
    CategoryId      INT               NOT NULL,
    Specification   NVARCHAR(500)     NULL,
    Unit            NVARCHAR(50)      NOT NULL,
    ReorderLevel    DECIMAL(14,3)     NULL,
    UnitCost        DECIMAL(18,4)     NULL,
    SupplierName    NVARCHAR(300)     NULL,
    IsActive        BIT               NOT NULL DEFAULT 1,
    CreatedBy       INT               NOT NULL,
    CreatedAt       DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Materials PRIMARY KEY (MaterialId),
    CONSTRAINT UQ_Materials_Code UNIQUE (MaterialCode),
    CONSTRAINT FK_Materials_Category FOREIGN KEY (CategoryId) REFERENCES Inventory.MaterialCategories(CategoryId)
);
GO

CREATE TABLE Inventory.StockLedger (
    LedgerId        BIGINT IDENTITY(1,1) NOT NULL,
    ProjectId       INT                  NOT NULL,
    MaterialId      INT                  NOT NULL,
    TransactionDate DATE                 NOT NULL,
    TransactionType NVARCHAR(30)         NOT NULL, -- RECEIPT, ISSUE, RETURN, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT
    Quantity        DECIMAL(14,3)        NOT NULL,
    UnitCost        DECIMAL(18,4)        NULL,
    ReferenceType   NVARCHAR(50)         NULL,  -- PO, MR, TASK, TRANSFER
    ReferenceId     INT                  NULL,
    SubcontractorId INT                  NULL,
    Remarks         NVARCHAR(500)        NULL,
    RecordedBy      INT                  NOT NULL,
    CreatedAt       DATETIME2            NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_StockLedger PRIMARY KEY (LedgerId),
    CONSTRAINT FK_StockLedger_Projects FOREIGN KEY (ProjectId) REFERENCES Project.Projects(ProjectId),
    CONSTRAINT FK_StockLedger_Materials FOREIGN KEY (MaterialId) REFERENCES Inventory.Materials(MaterialId)
);
GO

CREATE NONCLUSTERED INDEX IX_StockLedger_ProjectMaterial ON Inventory.StockLedger(ProjectId, MaterialId, TransactionDate);
GO

CREATE TABLE Inventory.SiteTransfers (
    TransferId          INT IDENTITY(1,1) NOT NULL,
    FromProjectId       INT               NOT NULL,
    ToProjectId         INT               NOT NULL,
    MaterialId          INT               NOT NULL,
    Quantity            DECIMAL(14,3)     NOT NULL,
    TransferDate        DATE              NOT NULL,
    StatusId            TINYINT           NOT NULL DEFAULT 1, -- 1=Requested,2=Approved,3=Dispatched,4=Received
    Remarks             NVARCHAR(500)     NULL,
    RequestedBy         INT               NOT NULL,
    ApprovedBy          INT               NULL,
    CreatedAt           DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_SiteTransfers PRIMARY KEY (TransferId),
    CONSTRAINT FK_SiteTransfers_FromProject FOREIGN KEY (FromProjectId) REFERENCES Project.Projects(ProjectId),
    CONSTRAINT FK_SiteTransfers_ToProject FOREIGN KEY (ToProjectId) REFERENCES Project.Projects(ProjectId),
    CONSTRAINT FK_SiteTransfers_Material FOREIGN KEY (MaterialId) REFERENCES Inventory.Materials(MaterialId)
);
GO

-- ============================================================
-- MODULE VI: RESOURCE MANAGEMENT
-- ============================================================

CREATE TABLE Resource.ResourceTypes (
    ResourceTypeId  INT IDENTITY(1,1) NOT NULL,
    TypeName        NVARCHAR(100)     NOT NULL, -- Work, Material, Cost, Equipment
    CONSTRAINT PK_ResourceTypes PRIMARY KEY (ResourceTypeId)
);
GO

CREATE TABLE Resource.Calendars (
    CalendarId      INT IDENTITY(1,1) NOT NULL,
    CalendarName    NVARCHAR(200)     NOT NULL,
    CalendarType    NVARCHAR(50)      NOT NULL, -- Organization, Project, Resource
    WorkingDays     NVARCHAR(20)      NULL DEFAULT '1111110', -- Mon-Sun bitmask
    WorkStartTime   TIME              NULL DEFAULT '08:00',
    WorkEndTime     TIME              NULL DEFAULT '17:00',
    IsDefault       BIT               NOT NULL DEFAULT 0,
    CreatedBy       INT               NOT NULL,
    CreatedAt       DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Calendars PRIMARY KEY (CalendarId)
);
GO

CREATE TABLE Resource.CalendarExceptions (
    ExceptionId     INT IDENTITY(1,1) NOT NULL,
    CalendarId      INT               NOT NULL,
    ExceptionDate   DATE              NOT NULL,
    IsWorkingDay    BIT               NOT NULL DEFAULT 0,
    Description     NVARCHAR(200)     NULL,
    CONSTRAINT PK_CalendarExceptions PRIMARY KEY (ExceptionId),
    CONSTRAINT FK_CalendarExceptions_Calendars FOREIGN KEY (CalendarId) REFERENCES Resource.Calendars(CalendarId)
);
GO

CREATE TABLE Resource.Resources (
    ResourceId      INT IDENTITY(1,1) NOT NULL,
    ResourceName    NVARCHAR(300)     NOT NULL,
    ResourceTypeId  INT               NOT NULL,
    UserId          INT               NULL, -- link to actual user if Work type
    MaxUnits        DECIMAL(5,2)      NOT NULL DEFAULT 100, -- 100 = 100%
    StandardRate    DECIMAL(18,4)     NULL,
    OvertimeRate    DECIMAL(18,4)     NULL,
    CalendarId      INT               NULL,
    IsActive        BIT               NOT NULL DEFAULT 1,
    CreatedBy       INT               NOT NULL,
    CreatedAt       DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Resources PRIMARY KEY (ResourceId),
    CONSTRAINT FK_Resources_Type FOREIGN KEY (ResourceTypeId) REFERENCES Resource.ResourceTypes(ResourceTypeId),
    CONSTRAINT FK_Resources_User FOREIGN KEY (UserId) REFERENCES Auth.Users(UserId),
    CONSTRAINT FK_Resources_Calendar FOREIGN KEY (CalendarId) REFERENCES Resource.Calendars(CalendarId)
);
GO

CREATE TABLE Resource.TaskResourceAllocations (
    AllocationId    INT IDENTITY(1,1) NOT NULL,
    TaskId          INT               NOT NULL,
    ResourceId      INT               NOT NULL,
    ProjectId       INT               NOT NULL,
    PlannedUnits    DECIMAL(14,3)     NOT NULL DEFAULT 0,
    ActualUnits     DECIMAL(14,3)     NOT NULL DEFAULT 0,
    PlannedHours    DECIMAL(10,2)     NULL,
    ActualHours     DECIMAL(10,2)     NULL,
    AllocationDate  DATE              NULL,
    Notes           NVARCHAR(500)     NULL,
    CreatedBy       INT               NOT NULL,
    CreatedAt       DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_TaskResourceAllocations PRIMARY KEY (AllocationId),
    CONSTRAINT FK_TRA_Tasks FOREIGN KEY (TaskId) REFERENCES Project.Tasks(TaskId),
    CONSTRAINT FK_TRA_Resources FOREIGN KEY (ResourceId) REFERENCES Resource.Resources(ResourceId),
    CONSTRAINT FK_TRA_Projects FOREIGN KEY (ProjectId) REFERENCES Project.Projects(ProjectId)
);
GO

CREATE TABLE Resource.EquipmentDeployment (
    DeploymentId    INT IDENTITY(1,1) NOT NULL,
    ProjectId       INT               NOT NULL,
    SubProjectId    INT               NULL,
    EquipmentName   NVARCHAR(300)     NOT NULL,
    EquipmentType   NVARCHAR(100)     NULL,
    DeploymentDate  DATE              NOT NULL,
    HoursUtilized   DECIMAL(10,2)     NULL,
    TaskId          INT               NULL,
    Notes           NVARCHAR(500)     NULL,
    RecordedBy      INT               NOT NULL,
    CreatedAt       DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_EquipmentDeployment PRIMARY KEY (DeploymentId),
    CONSTRAINT FK_EquipmentDeployment_Projects FOREIGN KEY (ProjectId) REFERENCES Project.Projects(ProjectId)
);
GO

-- ============================================================
-- MODULE VII: BUDGET & EXPENSE TRACKING
-- ============================================================

CREATE TABLE Budget.BudgetWBS (
    WBSId           INT IDENTITY(1,1) NOT NULL,
    WBSCode         NVARCHAR(50)      NOT NULL,
    WBSName         NVARCHAR(300)     NOT NULL,
    ParentWBSId     INT               NULL,
    WBSLevel        TINYINT           NOT NULL DEFAULT 1,
    IsActive        BIT               NOT NULL DEFAULT 1,
    CONSTRAINT PK_BudgetWBS PRIMARY KEY (WBSId),
    CONSTRAINT FK_BudgetWBS_Parent FOREIGN KEY (ParentWBSId) REFERENCES Budget.BudgetWBS(WBSId)
);
GO

CREATE TABLE Budget.ProjectBudgets (
    BudgetId        INT IDENTITY(1,1) NOT NULL,
    ProjectId       INT               NOT NULL,
    WBSId           INT               NOT NULL,
    Category        NVARCHAR(100)     NOT NULL,   -- Material, Labour, Equipment Hire, etc.
    SubCategory     NVARCHAR(100)     NULL,
    Area            NVARCHAR(200)     NULL,        -- Area 1: Civil, Area 2: Refinery
    Details         NVARCHAR(500)     NULL,
    BudgetedAmount  DECIMAL(18,2)     NOT NULL DEFAULT 0,
    StatusId        TINYINT           NOT NULL DEFAULT 1, -- 1=Draft,2=Locked,3=Revised
    IsLocked        BIT               NOT NULL DEFAULT 0,
    ApprovedBy      INT               NULL,
    ApprovedAt      DATETIME2         NULL,
    CreatedBy       INT               NOT NULL,
    CreatedAt       DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_ProjectBudgets PRIMARY KEY (BudgetId),
    CONSTRAINT FK_ProjectBudgets_Projects FOREIGN KEY (ProjectId) REFERENCES Project.Projects(ProjectId),
    CONSTRAINT FK_ProjectBudgets_WBS FOREIGN KEY (WBSId) REFERENCES Budget.BudgetWBS(WBSId)
);
GO

CREATE TABLE Budget.CommittedAmounts (
    CommitmentId        INT IDENTITY(1,1) NOT NULL,
    ProjectId           INT               NOT NULL,
    BudgetId            INT               NOT NULL,
    CommitmentName      NVARCHAR(300)     NOT NULL,
    CommitmentDate      DATE              NOT NULL,
    CommittedAmount     DECIMAL(18,2)     NOT NULL,
    DocumentType        NVARCHAR(50)      NULL, -- PO, WO, BOQ, Bill
    DocumentRef         NVARCHAR(200)     NULL,
    FileId              INT               NULL,
    Notes               NVARCHAR(500)     NULL,
    CreatedBy           INT               NOT NULL,
    CreatedAt           DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_CommittedAmounts PRIMARY KEY (CommitmentId),
    CONSTRAINT FK_CommittedAmounts_Projects FOREIGN KEY (ProjectId) REFERENCES Project.Projects(ProjectId),
    CONSTRAINT FK_CommittedAmounts_Budget FOREIGN KEY (BudgetId) REFERENCES Budget.ProjectBudgets(BudgetId)
);
GO

CREATE TABLE Budget.Expenditures (
    ExpenditureId       INT IDENTITY(1,1) NOT NULL,
    ProjectId           INT               NOT NULL,
    CommitmentId        INT               NOT NULL,
    BudgetId            INT               NOT NULL,
    PaymentDate         DATE              NOT NULL,
    PaymentAmount       DECIMAL(18,2)     NOT NULL,
    PaymentRef          NVARCHAR(200)     NULL,
    InvoiceNumber       NVARCHAR(200)     NULL,
    FileId              INT               NULL,
    Notes               NVARCHAR(500)     NULL,
    RecordedBy          INT               NOT NULL,
    CreatedAt           DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Expenditures PRIMARY KEY (ExpenditureId),
    CONSTRAINT FK_Expenditures_Projects FOREIGN KEY (ProjectId) REFERENCES Project.Projects(ProjectId),
    CONSTRAINT FK_Expenditures_Commitment FOREIGN KEY (CommitmentId) REFERENCES Budget.CommittedAmounts(CommitmentId),
    CONSTRAINT FK_Expenditures_Budget FOREIGN KEY (BudgetId) REFERENCES Budget.ProjectBudgets(BudgetId)
);
GO

CREATE NONCLUSTERED INDEX IX_Expenditures_ProjectDate ON Budget.Expenditures(ProjectId, PaymentDate);
GO

-- ============================================================
-- MODULE VIII: RISK MANAGEMENT
-- ============================================================

CREATE TABLE Risk.Risks (
    RiskId              INT IDENTITY(1,1) NOT NULL,
    ProjectId           INT               NOT NULL,
    RiskTitle           NVARCHAR(300)     NOT NULL,
    RiskDescription     NVARCHAR(3000)    NOT NULL,
    RiskSeverity        NVARCHAR(10)      NOT NULL DEFAULT 'Low', -- Low, Medium, High
    ImpactArea          NVARCHAR(200)     NULL, -- Timeline, Budget, Quality, Compliance
    StatusId            TINYINT           NOT NULL DEFAULT 1,
    -- 1=Draft, 2=Department Review, 3=Analysis, 4=Mitigation, 5=Closed, 6=Rejected
    InitialMitigation   NVARCHAR(2000)    NULL,
    MitigationPlan      NVARCHAR(3000)    NULL,
    MitigationOwnerId   INT               NULL,
    ExpectedClosureDate DATE              NULL,
    ActualClosureDate   DATE              NULL,
    FileId              INT               NULL,
    RaisedBy            INT               NOT NULL,
    RaisedAt            DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedAt           DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt           DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Risks PRIMARY KEY (RiskId),
    CONSTRAINT FK_Risks_Projects FOREIGN KEY (ProjectId) REFERENCES Project.Projects(ProjectId),
    CONSTRAINT FK_Risks_RaisedBy FOREIGN KEY (RaisedBy) REFERENCES Auth.Users(UserId),
    CONSTRAINT FK_Risks_Owner FOREIGN KEY (MitigationOwnerId) REFERENCES Auth.Users(UserId),
    CONSTRAINT CK_Risks_Severity CHECK (RiskSeverity IN ('Low', 'Medium', 'High'))
);
GO

CREATE TABLE Risk.RiskStakeholders (
    StakeholderId   INT IDENTITY(1,1) NOT NULL,
    RiskId          INT               NOT NULL,
    UserId          INT               NOT NULL,
    CONSTRAINT PK_RiskStakeholders PRIMARY KEY (StakeholderId),
    CONSTRAINT UQ_RiskStakeholders UNIQUE (RiskId, UserId),
    CONSTRAINT FK_RiskStakeholders_Risks FOREIGN KEY (RiskId) REFERENCES Risk.Risks(RiskId),
    CONSTRAINT FK_RiskStakeholders_Users FOREIGN KEY (UserId) REFERENCES Auth.Users(UserId)
);
GO

CREATE TABLE Risk.RiskUpdates (
    UpdateId        INT IDENTITY(1,1) NOT NULL,
    RiskId          INT               NOT NULL,
    UpdateNote      NVARCHAR(3000)    NOT NULL,
    UpdateType      NVARCHAR(50)      NULL, -- REVIEW, MITIGATION_UPDATE, STATUS_CHANGE, CLOSURE
    FromStatusId    TINYINT           NULL,
    ToStatusId      TINYINT           NULL,
    FileId          INT               NULL,
    UpdatedBy       INT               NOT NULL,
    UpdatedAt       DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_RiskUpdates PRIMARY KEY (UpdateId),
    CONSTRAINT FK_RiskUpdates_Risks FOREIGN KEY (RiskId) REFERENCES Risk.Risks(RiskId),
    CONSTRAINT FK_RiskUpdates_Users FOREIGN KEY (UpdatedBy) REFERENCES Auth.Users(UserId)
);
GO

CREATE NONCLUSTERED INDEX IX_Risks_Project_Severity ON Risk.Risks(ProjectId, RiskSeverity, StatusId);
GO

PRINT 'All module schemas created successfully.';
GO
