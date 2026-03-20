-- ============================================================
-- MMG EPM - Schema Patch v2
-- Run this if you already have the database from FRESH_INSTALL.sql
-- Adds new tables for Task Delays, Task Comments
-- ============================================================

USE MMG_EPM;
GO

-- Add TaskDelays if not exists
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='TaskDelays' AND SCHEMA_NAME(schema_id)='Project')
BEGIN
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
    PRINT 'Created Project.TaskDelays';
END
GO

-- Add TaskComments if not exists
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='TaskComments' AND SCHEMA_NAME(schema_id)='Project')
BEGIN
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
    PRINT 'Created Project.TaskComments';
END
GO

PRINT '=== Patch v2 complete ===';
GO
