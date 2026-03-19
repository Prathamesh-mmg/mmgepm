-- ============================================================
-- MMG EPM - Seed Data
-- Run AFTER 01, 02, 03 scripts
-- Creates admin user, roles, permissions
-- Admin login: admin@mmgepm.com / Admin@123
-- ============================================================

USE MMG_EPM;
GO

-- ─── Roles ───────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM [Auth].[Roles] WHERE [Name] = 'Admin')
BEGIN
    INSERT INTO [Auth].[Roles] ([Id],[Name],[Description],[IsSystem],[CreatedAt],[UpdatedAt],[IsDeleted]) VALUES
    (NEWID(),'Admin',               'Full system access',                    1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
    (NEWID(),'Planning Engineer',   'Project planning and scheduling',       1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
    (NEWID(),'Project Manager',     'Manage assigned projects',              1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
    (NEWID(),'Project Head',        'Head of projects division',             1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
    (NEWID(),'Site Engineer',       'On-site engineering work',              1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
    (NEWID(),'SME Civil',           'Subject Matter Expert - Civil',         1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
    (NEWID(),'SME Electrical',      'Subject Matter Expert - Electrical',    1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
    (NEWID(),'SME Mechanical',      'Subject Matter Expert - Mechanical',    1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
    (NEWID(),'Labour Manager',      'Manage labour and attendance',          1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
    (NEWID(),'Procurement Head',    'Head of procurement',                   1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
    (NEWID(),'Purchase Manager',    'Manage purchase orders',                1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
    (NEWID(),'Business Development','Business development activities',       1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
    (NEWID(),'Management',          'Senior management access',              1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
    (NEWID(),'Viewer',              'Read-only access',                      1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0);
    PRINT 'Roles created';
END
GO

-- ─── Admin User ───────────────────────────────────────────────
-- Password: Admin@123 (BCrypt hash)
DECLARE @AdminId UNIQUEIDENTIFIER = NEWID();
DECLARE @AdminRoleId UNIQUEIDENTIFIER;

SELECT @AdminRoleId = [Id] FROM [Auth].[Roles] WHERE [Name] = 'Admin';

IF NOT EXISTS (SELECT 1 FROM [Auth].[Users] WHERE [Email] = 'admin@mmgepm.com')
BEGIN
    INSERT INTO [Auth].[Users] (
        [Id],[FirstName],[LastName],[Email],[PasswordHash],
        [IsActive],[MustChangePassword],[FailedLoginAttempts],
        [Department],[JobTitle],
        [CreatedAt],[UpdatedAt],[IsDeleted]
    ) VALUES (
        @AdminId,
        'System','Administrator','admin@mmgepm.com',
        '$2b$11$2WAL7cgMHWjqVh4fh4CE5eSiISVeSFnGfpD1bEVk255Ak2GdcNeUu',
        1, 0, 0,
        'IT','System Administrator',
        SYSUTCDATETIME(), SYSUTCDATETIME(), 0
    );

    INSERT INTO [Auth].[UserRoles] ([UserId],[RoleId],[AssignedAt])
    VALUES (@AdminId, @AdminRoleId, SYSUTCDATETIME());

    PRINT 'Admin user created: admin@mmgepm.com / Admin@123';
END
ELSE
BEGIN
    -- Update hash if user exists but has placeholder hash
    UPDATE [Auth].[Users]
    SET [PasswordHash] = '$2b$11$2WAL7cgMHWjqVh4fh4CE5eSiISVeSFnGfpD1bEVk255Ak2GdcNeUu',
        [UpdatedAt] = SYSUTCDATETIME()
    WHERE [Email] = 'admin@mmgepm.com'
      AND [PasswordHash] LIKE '%placeholder%';
    PRINT 'Admin password hash updated';
END
GO

-- ─── Sample Countries ─────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM [Auth].[Countries] WHERE [Code] = 'TZA')
BEGIN
    INSERT INTO [Auth].[Countries] ([Id],[Name],[Code],[CurrencyCode],[CreatedAt],[UpdatedAt],[IsDeleted]) VALUES
    (NEWID(),'Tanzania',       'TZA','TZS', SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
    (NEWID(),'Kenya',          'KEN','KES', SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
    (NEWID(),'Uganda',         'UGA','UGX', SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
    (NEWID(),'Rwanda',         'RWA','RWF', SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
    (NEWID(),'Ethiopia',       'ETH','ETB', SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
    (NEWID(),'Ghana',          'GHA','GHS', SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
    (NEWID(),'South Africa',   'ZAF','ZAR', SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
    (NEWID(),'United Arab Emirates','UAE','AED', SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
    (NEWID(),'India',          'IND','INR', SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
    (NEWID(),'United States',  'USA','USD', SYSUTCDATETIME(), SYSUTCDATETIME(), 0);
    PRINT 'Countries seeded';
END
GO

-- ─── Sample SBU Codes ─────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM [Auth].[SBUCodes] WHERE [Code] = 'MMG-TZ')
BEGIN
    INSERT INTO [Auth].[SBUCodes] ([Id],[Code],[Name],[Country],[IsActive],[CreatedAt],[UpdatedAt],[IsDeleted]) VALUES
    (NEWID(),'MMG-TZ',  'MMG Tanzania',        'Tanzania',     1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
    (NEWID(),'MMG-KE',  'MMG Kenya',           'Kenya',        1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
    (NEWID(),'MMG-UG',  'MMG Uganda',          'Uganda',       1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
    (NEWID(),'MMG-ETH', 'MMG Ethiopia',        'Ethiopia',     1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
    (NEWID(),'MMG-GH',  'MMG Ghana',           'Ghana',        1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
    (NEWID(),'MMG-UAE', 'MMG Middle East',     'UAE',          1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0);
    PRINT 'SBU Codes seeded';
END
GO

-- ─── Notification Templates ───────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM [Notify].[NotificationTemplates] WHERE [Code] = 'TASK_ASSIGNED')
BEGIN
    INSERT INTO [Notify].[NotificationTemplates] ([Id],[Code],[Subject],[Body],[Channel],[IsActive],[CreatedAt],[UpdatedAt],[IsDeleted]) VALUES
    (NEWID(),'TASK_ASSIGNED',   'Task Assigned to You',      'A task has been assigned to you: {{TaskName}}',        'Both',  1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
    (NEWID(),'TASK_DUE',        'Task Due Reminder',         'Task {{TaskName}} is due on {{DueDate}}',              'Both',  1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
    (NEWID(),'RISK_RAISED',     'New Risk Registered',       'A new risk has been raised: {{RiskTitle}}',            'Both',  1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
    (NEWID(),'MR_APPROVAL',     'Material Request Approval', 'MR {{MRNumber}} requires your approval',              'Both',  1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
    (NEWID(),'DPR_SUBMITTED',   'DPR Submitted',             'Daily Progress Report submitted for {{ProjectName}}', 'InApp', 1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0),
    (NEWID(),'BUDGET_ALERT',    'Budget Alert',              'Budget utilization for {{ProjectName}} exceeded 80%', 'Both',  1, SYSUTCDATETIME(), SYSUTCDATETIME(), 0);
    PRINT 'Notification templates seeded';
END
GO

PRINT '=== MMG EPM Seed Data Complete ===';
PRINT 'Login: admin@mmgepm.com / Admin@123';
GO
