-- ============================================================
-- MMG EPM - DROP and RECREATE database (CLEAN INSTALL)
-- WARNING: This deletes ALL existing data in MMG_EPM
-- Only run this if you want to start fresh
-- ============================================================

USE master;
GO

-- Drop existing database if it exists
IF EXISTS (SELECT 1 FROM sys.databases WHERE name = 'MMG_EPM')
BEGIN
    ALTER DATABASE MMG_EPM SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE MMG_EPM;
    PRINT 'Dropped existing MMG_EPM database';
END
GO

PRINT 'Now run scripts 01 through 05 in order';
GO
