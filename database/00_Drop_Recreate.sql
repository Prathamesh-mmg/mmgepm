-- ============================================================
-- MMG EPM - FORCE DROP AND RECREATE (Clean Install)
-- Run this FIRST before any other scripts
-- ============================================================

USE master;
GO

-- Kill all connections and drop the database
IF EXISTS (SELECT 1 FROM sys.databases WHERE name = 'MMG_EPM')
BEGIN
    ALTER DATABASE MMG_EPM SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE MMG_EPM;
    PRINT '✓ Dropped MMG_EPM database';
END
ELSE
    PRINT 'MMG_EPM did not exist - creating fresh';
GO

-- Create fresh
CREATE DATABASE MMG_EPM;
GO

PRINT '✓ Created fresh MMG_EPM database';
PRINT 'Now run 01_Schema_Core.sql, then 02, 03, 04, 05 in order';
GO
