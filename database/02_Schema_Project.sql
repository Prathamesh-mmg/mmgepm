-- ============================================================
-- MMG EPM - Module I: Project & Task Management
--           Module II: Labour Management
-- ============================================================

USE MMGEPM;
GO

-- ============================================================
-- PROJECT SCHEMA
-- ============================================================

CREATE TABLE Project.Projects (
    ProjectId           INT IDENTITY(1,1) NOT NULL,
    ProjectCode         NVARCHAR(50)      NOT NULL, -- e.g. 33-ZAM-20-2024
    ProjectName         NVARCHAR(300)     NOT NULL,
    Address             NVARCHAR(500)     NULL,
    CountryId           INT               NULL,
    SBUId               INT               NULL,
    YearCode            NVARCHAR(10)      NULL,
    GeoLatitude         DECIMAL(10,8)     NULL,
    GeoLongitude        DECIMAL(11,8)     NULL,
    BaselineStartDate   DATE              NULL,
    BaselineEndDate     DATE              NULL,
    ActualStartDate     DATE              NULL,
    ActualEndDate       DATE              NULL,
    ProjectBudget       DECIMAL(18,2)     NULL,
    StatusId            TINYINT           NOT NULL DEFAULT 1, -- 1=Draft,2=Active,3=OnHold,4=Completed,5=Cancelled
    ProgressPercent     DECIMAL(5,2)      NOT NULL DEFAULT 0,
    ProjectManagerId    INT               NULL,
    PlanningEngineerId  INT               NULL,
    IsActive            BIT               NOT NULL DEFAULT 1,
    CreatedBy           INT               NOT NULL,
    UpdatedBy           INT               NULL,
    CreatedAt           DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt           DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Projects PRIMARY KEY (ProjectId),
    CONSTRAINT UQ_Projects_Code UNIQUE (ProjectCode),
    CONSTRAINT FK_Projects_Countries FOREIGN KEY (CountryId) REFERENCES Auth.Countries(CountryId),
    CONSTRAINT FK_Projects_SBUCodes FOREIGN KEY (SBUId) REFERENCES Auth.SBUCodes(SBUId),
    CONSTRAINT FK_Projects_Manager FOREIGN KEY (ProjectManagerId) REFERENCES Auth.Users(UserId),
    CONSTRAINT FK_Projects_Planner FOREIGN KEY (PlanningEngineerId) REFERENCES Auth.Users(UserId),
    CONSTRAINT FK_Projects_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Auth.Users(UserId)
);
GO

CREATE NONCLUSTERED INDEX IX_Projects_Status ON Project.Projects(StatusId);
CREATE NONCLUSTERED INDEX IX_Projects_Manager ON Project.Projects(ProjectManagerId);
GO

CREATE TABLE Project.SubProjects (
    SubProjectId        INT IDENTITY(1,1) NOT NULL,
    ProjectId           INT               NOT NULL,
    SubProjectName      NVARCHAR(300)     NOT NULL,
    SubProjectType      NVARCHAR(50)      NULL, -- RCC, Structural, PEB, Other
    Description         NVARCHAR(1000)    NULL,
    BaselineStartDate   DATE              NULL,
    BaselineEndDate     DATE              NULL,
    ActualStartDate     DATE              NULL,
    ActualEndDate       DATE              NULL,
    StatusId            TINYINT           NOT NULL DEFAULT 1,
    ProgressPercent     DECIMAL(5,2)      NOT NULL DEFAULT 0,
    SortOrder           INT               NOT NULL DEFAULT 0,
    CreatedBy           INT               NOT NULL,
    UpdatedBy           INT               NULL,
    CreatedAt           DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt           DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_SubProjects PRIMARY KEY (SubProjectId),
    CONSTRAINT FK_SubProjects_Projects FOREIGN KEY (ProjectId) REFERENCES Project.Projects(ProjectId),
    CONSTRAINT FK_SubProjects_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Auth.Users(UserId)
);
GO

CREATE TABLE Project.ProjectMembers (
    MemberId    INT IDENTITY(1,1) NOT NULL,
    ProjectId   INT               NOT NULL,
    UserId      INT               NOT NULL,
    RoleId      INT               NOT NULL,
    AddedAt     DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    AddedBy     INT               NOT NULL,
    IsActive    BIT               NOT NULL DEFAULT 1,
    CONSTRAINT PK_ProjectMembers PRIMARY KEY (MemberId),
    CONSTRAINT UQ_ProjectMembers UNIQUE (ProjectId, UserId),
    CONSTRAINT FK_ProjectMembers_Projects FOREIGN KEY (ProjectId) REFERENCES Project.Projects(ProjectId),
    CONSTRAINT FK_ProjectMembers_Users FOREIGN KEY (UserId) REFERENCES Auth.Users(UserId),
    CONSTRAINT FK_ProjectMembers_Roles FOREIGN KEY (RoleId) REFERENCES Auth.Roles(RoleId)
);
GO

-- Tasks support up to 7 levels via ParentTaskId self-join
CREATE TABLE Project.Tasks (
    TaskId              INT IDENTITY(1,1) NOT NULL,
    ProjectId           INT               NOT NULL,
    SubProjectId        INT               NULL,
    ParentTaskId        INT               NULL,          -- Self-referencing for hierarchy
    TaskLevel           TINYINT           NOT NULL DEFAULT 1, -- 1-7
    WBSCode             NVARCHAR(50)      NULL,          -- e.g. 1.2.3
    TaskName            NVARCHAR(500)     NOT NULL,
    Description         NVARCHAR(2000)    NULL,
    BaselineStartDate   DATE              NULL,
    BaselineEndDate     DATE              NULL,
    ActualStartDate     DATE              NULL,
    ActualEndDate       DATE              NULL,
    DurationDays        INT               NULL,
    PredecessorTaskIds  NVARCHAR(500)     NULL,          -- comma-separated TaskIds
    DependencyType      NVARCHAR(10)      NULL,          -- FS, SS, FF, SF
    ProgressPercent     DECIMAL(5,2)      NOT NULL DEFAULT 0,
    StatusId            TINYINT           NOT NULL DEFAULT 1, -- 1=NotStarted,2=InProgress,3=Completed,4=Delayed,5=OnHold
    PlannedLabourQty    DECIMAL(10,2)     NULL,
    PlannedMaterialQty  DECIMAL(10,2)     NULL,
    PlannedMachineryQty DECIMAL(10,2)     NULL,
    SortOrder           INT               NOT NULL DEFAULT 0,
    IsMilestone         BIT               NOT NULL DEFAULT 0,
    IsImported          BIT               NOT NULL DEFAULT 0,
    CreatedBy           INT               NOT NULL,
    UpdatedBy           INT               NULL,
    CreatedAt           DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt           DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Tasks PRIMARY KEY (TaskId),
    CONSTRAINT FK_Tasks_Projects FOREIGN KEY (ProjectId) REFERENCES Project.Projects(ProjectId),
    CONSTRAINT FK_Tasks_SubProjects FOREIGN KEY (SubProjectId) REFERENCES Project.SubProjects(SubProjectId),
    CONSTRAINT FK_Tasks_Parent FOREIGN KEY (ParentTaskId) REFERENCES Project.Tasks(TaskId),
    CONSTRAINT FK_Tasks_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Auth.Users(UserId),
    CONSTRAINT CK_Tasks_Level CHECK (TaskLevel BETWEEN 1 AND 7)
);
GO

CREATE NONCLUSTERED INDEX IX_Tasks_Project ON Project.Tasks(ProjectId, StatusId);
CREATE NONCLUSTERED INDEX IX_Tasks_Parent ON Project.Tasks(ParentTaskId);
CREATE NONCLUSTERED INDEX IX_Tasks_BaselineDates ON Project.Tasks(BaselineEndDate, StatusId);
GO

CREATE TABLE Project.TaskAssignees (
    AssigneeId  INT IDENTITY(1,1) NOT NULL,
    TaskId      INT               NOT NULL,
    UserId      INT               NOT NULL,
    AssignedBy  INT               NOT NULL,
    AssignedAt  DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    IsActive    BIT               NOT NULL DEFAULT 1,
    CONSTRAINT PK_TaskAssignees PRIMARY KEY (AssigneeId),
    CONSTRAINT UQ_TaskAssignees UNIQUE (TaskId, UserId),
    CONSTRAINT FK_TaskAssignees_Tasks FOREIGN KEY (TaskId) REFERENCES Project.Tasks(TaskId),
    CONSTRAINT FK_TaskAssignees_Users FOREIGN KEY (UserId) REFERENCES Auth.Users(UserId)
);
GO

CREATE TABLE Project.WorkProgress (
    WorkProgressId      INT IDENTITY(1,1) NOT NULL,
    TaskId              INT               NOT NULL,
    ReportDate          DATE              NOT NULL DEFAULT CAST(SYSUTCDATETIME() AS DATE),
    ProgressPercent     DECIMAL(5,2)      NOT NULL DEFAULT 0,
    WorkDoneDescription NVARCHAR(2000)    NULL,
    LabourCount         INT               NULL,
    MachineryDeployed   NVARCHAR(500)     NULL,
    WeatherCondition    NVARCHAR(100)     NULL,
    Remarks             NVARCHAR(1000)    NULL,
    ReportedBy          INT               NOT NULL,
    CreatedAt           DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_WorkProgress PRIMARY KEY (WorkProgressId),
    CONSTRAINT FK_WorkProgress_Tasks FOREIGN KEY (TaskId) REFERENCES Project.Tasks(TaskId),
    CONSTRAINT FK_WorkProgress_Users FOREIGN KEY (ReportedBy) REFERENCES Auth.Users(UserId)
);
GO

CREATE TABLE Project.WorkProgressPhotos (
    PhotoId         INT IDENTITY(1,1) NOT NULL,
    WorkProgressId  INT               NOT NULL,
    FileId          INT               NOT NULL,
    Caption         NVARCHAR(300)     NULL,
    UploadedAt      DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_WorkProgressPhotos PRIMARY KEY (PhotoId),
    CONSTRAINT FK_WorkProgressPhotos_WP FOREIGN KEY (WorkProgressId) REFERENCES Project.WorkProgress(WorkProgressId),
    CONSTRAINT FK_WorkProgressPhotos_File FOREIGN KEY (FileId) REFERENCES Auth.FileAttachments(FileId)
);
GO

-- ============================================================
-- MODULE II: LABOUR MANAGEMENT
-- ============================================================

CREATE TABLE Project.Contractors (
    ContractorId    INT IDENTITY(1,1) NOT NULL,
    ProjectId       INT               NOT NULL,
    ContractorName  NVARCHAR(300)     NOT NULL,
    ContactPerson   NVARCHAR(200)     NULL,
    Phone           NVARCHAR(30)      NULL,
    Email           NVARCHAR(256)     NULL,
    WorkType        NVARCHAR(200)     NULL,
    ContractValue   DECIMAL(18,2)     NULL,
    IsActive        BIT               NOT NULL DEFAULT 1,
    CreatedBy       INT               NOT NULL,
    CreatedAt       DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Contractors PRIMARY KEY (ContractorId),
    CONSTRAINT FK_Contractors_Projects FOREIGN KEY (ProjectId) REFERENCES Project.Projects(ProjectId),
    CONSTRAINT FK_Contractors_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES Auth.Users(UserId)
);
GO

CREATE TABLE Project.LabourCategories (
    CategoryId      INT IDENTITY(1,1) NOT NULL,
    CategoryName    NVARCHAR(100)     NOT NULL,
    TradeType       NVARCHAR(100)     NULL,  -- Mason, Carpenter, Welder, etc.
    IsActive        BIT               NOT NULL DEFAULT 1,
    CONSTRAINT PK_LabourCategories PRIMARY KEY (CategoryId)
);
GO

CREATE TABLE Project.CrewAttendance (
    AttendanceId        INT IDENTITY(1,1) NOT NULL,
    ProjectId           INT               NOT NULL,
    SubProjectId        INT               NULL,
    ContractorId        INT               NULL,
    AttendanceDate      DATE              NOT NULL,
    LabourCategoryId    INT               NOT NULL,
    PresentCount        INT               NOT NULL DEFAULT 0,
    AbsentCount         INT               NOT NULL DEFAULT 0,
    OvertimeHours       DECIMAL(5,2)      NULL,
    Remarks             NVARCHAR(500)     NULL,
    RecordedBy          INT               NOT NULL,
    CreatedAt           DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_CrewAttendance PRIMARY KEY (AttendanceId),
    CONSTRAINT FK_CrewAttendance_Projects FOREIGN KEY (ProjectId) REFERENCES Project.Projects(ProjectId),
    CONSTRAINT FK_CrewAttendance_Contractors FOREIGN KEY (ContractorId) REFERENCES Project.Contractors(ContractorId),
    CONSTRAINT FK_CrewAttendance_Category FOREIGN KEY (LabourCategoryId) REFERENCES Project.LabourCategories(CategoryId),
    CONSTRAINT FK_CrewAttendance_RecordedBy FOREIGN KEY (RecordedBy) REFERENCES Auth.Users(UserId)
);
GO

CREATE NONCLUSTERED INDEX IX_CrewAttendance_ProjectDate ON Project.CrewAttendance(ProjectId, AttendanceDate);
GO

-- Daily Progress Report
CREATE TABLE Project.DPRReports (
    DPRId           INT IDENTITY(1,1) NOT NULL,
    ProjectId       INT               NOT NULL,
    ReportDate      DATE              NOT NULL,
    WeatherAM       NVARCHAR(50)      NULL,
    WeatherPM       NVARCHAR(50)      NULL,
    OverallProgress NVARCHAR(2000)    NULL,
    PlannedActivity NVARCHAR(2000)    NULL,
    Hindrance       NVARCHAR(2000)    NULL,
    SafetyRemarks   NVARCHAR(1000)    NULL,
    StatusId        TINYINT           NOT NULL DEFAULT 1, -- 1=Draft,2=Submitted,3=Approved
    PreparedBy      INT               NOT NULL,
    ApprovedBy      INT               NULL,
    ApprovedAt      DATETIME2         NULL,
    CreatedAt       DATETIME2         NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_DPRReports PRIMARY KEY (DPRId),
    CONSTRAINT UQ_DPRReports UNIQUE (ProjectId, ReportDate),
    CONSTRAINT FK_DPRReports_Projects FOREIGN KEY (ProjectId) REFERENCES Project.Projects(ProjectId),
    CONSTRAINT FK_DPRReports_PreparedBy FOREIGN KEY (PreparedBy) REFERENCES Auth.Users(UserId),
    CONSTRAINT FK_DPRReports_ApprovedBy FOREIGN KEY (ApprovedBy) REFERENCES Auth.Users(UserId)
);
GO

PRINT 'Project & Labour Management schema created successfully.';
GO
