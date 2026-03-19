-- ============================================================
-- MMG EPM - Seed Data: Roles, Permissions, Lookups
-- ============================================================

USE MMGEPM;
GO

-- ============================================================
-- ROLES (from Role Matrix document)
-- ============================================================
INSERT INTO Auth.Roles (RoleName, RoleCode, Description) VALUES
('System Administrator',    'ADMIN',        'Full system access'),
('Planning Engineer',       'PLAN_ENG',     'Full edit on all project modules'),
('Project Manager',         'PROJ_MGR',     'Manages project execution, approvals'),
('SME Civil',               'SME_CIVIL',    'Civil Subject Matter Expert'),
('SME Electrical',          'SME_ELEC',     'Electrical Subject Matter Expert'),
('SME Mechanical',          'SME_MECH',     'Mechanical Subject Matter Expert'),
('SME',                     'SME',          'General SME with document access'),
('Site Engineer',           'SITE_ENG',     'Site-level operations and reporting'),
('Procurement Head',        'PROC_HEAD',    'Heads procurement department'),
('Purchase Manager',        'PURCH_MGR',    'Manages purchase orders and payments'),
('Business Development',    'BD_TEAM',      'View-only access for BD purposes'),
('Management',              'MGMT',         'Senior management with view access'),
('Project Head',            'PROJ_HEAD',    'Oversees projects with selective edit'),
('Labour Manager',          'LAB_MGR',      'Manages labour and attendance');
GO

-- ============================================================
-- PERMISSIONS
-- ============================================================
INSERT INTO Auth.Permissions (Module, SubModule, Action) VALUES
-- Project Management
('Project', 'Project',         'View'),
('Project', 'Project',         'Create'),
('Project', 'Project',         'Edit'),
('Project', 'Project',         'Delete'),
('Project', 'SubProject',      'View'),
('Project', 'SubProject',      'Create'),
('Project', 'SubProject',      'Edit'),
('Project', 'Task',            'View'),
('Project', 'Task',            'Create'),
('Project', 'Task',            'Edit'),
('Project', 'WorkProgress',    'View'),
('Project', 'WorkProgress',    'Create'),
('Project', 'WorkProgress',    'Edit'),
('Project', 'CrewAttendance',  'View'),
('Project', 'CrewAttendance',  'Create'),
('Project', 'CrewAttendance',  'Edit'),
('Project', 'DPR',             'View'),
('Project', 'DPR',             'Create'),
('Project', 'DPR',             'Approve'),
('Project', 'Contractor',      'View'),
('Project', 'Contractor',      'Create'),
('Project', 'Contractor',      'Edit'),
-- Document Management
('Document', 'DocumentCenter', 'View'),
('Document', 'DocumentCenter', 'Create'),
('Document', 'DocumentCenter', 'Edit'),
('Document', 'Drawings',       'View'),
('Document', 'Drawings',       'Create'),
('Document', 'Drawings',       'Edit'),
('Document', 'ChangeRequest',  'View'),
('Document', 'ChangeRequest',  'Create'),
('Document', 'ChangeRequest',  'Edit'),
('Document', 'ChangeRequest',  'Approve'),
-- Procurement
('Procurement', 'MaterialRequest', 'View'),
('Procurement', 'MaterialRequest', 'Create'),
('Procurement', 'MaterialRequest', 'Edit'),
('Procurement', 'MaterialRequest', 'Approve'),
('Procurement', 'PurchaseOrder',   'View'),
('Procurement', 'PurchaseOrder',   'Create'),
('Procurement', 'PurchaseOrder',   'Edit'),
('Procurement', 'Payment',         'View'),
('Procurement', 'Payment',         'Create'),
-- Inventory
('Inventory', 'Material',    'View'),
('Inventory', 'Material',    'Create'),
('Inventory', 'Material',    'Edit'),
('Inventory', 'StockLedger', 'View'),
('Inventory', 'StockLedger', 'Create'),
('Inventory', 'Transfer',    'View'),
('Inventory', 'Transfer',    'Create'),
('Inventory', 'Transfer',    'Approve'),
-- Resource
('Resource', 'Resource',    'View'),
('Resource', 'Resource',    'Create'),
('Resource', 'Resource',    'Edit'),
('Resource', 'Calendar',    'View'),
('Resource', 'Calendar',    'Edit'),
('Resource', 'Allocation',  'View'),
('Resource', 'Allocation',  'Edit'),
-- Budget
('Budget', 'Budget',      'View'),
('Budget', 'Budget',      'Create'),
('Budget', 'Budget',      'Edit'),
('Budget', 'Budget',      'Approve'),
('Budget', 'Commitment',  'View'),
('Budget', 'Commitment',  'Create'),
('Budget', 'Expenditure', 'View'),
('Budget', 'Expenditure', 'Create'),
-- Risk
('Risk', 'Risk', 'View'),
('Risk', 'Risk', 'Create'),
('Risk', 'Risk', 'Edit'),
('Risk', 'Risk', 'Approve'),
-- Admin
('Admin', 'Users',       'View'),
('Admin', 'Users',       'Create'),
('Admin', 'Users',       'Edit'),
('Admin', 'Users',       'Delete'),
('Admin', 'Roles',       'Manage'),
('Admin', 'Settings',    'Manage');
GO

-- ============================================================
-- ROLE-PERMISSION MAPPING (from Role Matrix)
-- ============================================================
-- Planning Engineer - full edit everything
INSERT INTO Auth.RolePermissions (RoleId, PermissionId)
SELECT r.RoleId, p.PermissionId
FROM Auth.Roles r
CROSS JOIN Auth.Permissions p
WHERE r.RoleCode = 'PLAN_ENG'
  AND p.Module NOT IN ('Admin');
GO

-- Admin - everything
INSERT INTO Auth.RolePermissions (RoleId, PermissionId)
SELECT r.RoleId, p.PermissionId
FROM Auth.Roles r
CROSS JOIN Auth.Permissions p
WHERE r.RoleCode = 'ADMIN';
GO

-- Project Manager - view project/task, edit work progress/DPR/contractor/procurement
INSERT INTO Auth.RolePermissions (RoleId, PermissionId)
SELECT r.RoleId, p.PermissionId
FROM Auth.Roles r, Auth.Permissions p
WHERE r.RoleCode = 'PROJ_MGR'
AND (
    (p.Module = 'Project' AND p.Action = 'View')
    OR (p.Module = 'Project' AND p.SubModule IN ('WorkProgress','CrewAttendance','DPR','Contractor') AND p.Action IN ('Create','Edit','Approve'))
    OR (p.Module = 'Document' AND p.Action IN ('View','Create','Edit','Approve'))
    OR (p.Module = 'Procurement' AND p.Action IN ('View','Create','Edit','Approve'))
    OR (p.Module = 'Budget' AND p.Action IN ('View','Create','Edit'))
    OR (p.Module = 'Risk' AND p.Action IN ('View','Create','Edit','Approve'))
    OR (p.Module = 'Inventory' AND p.Action = 'View')
    OR (p.Module = 'Resource' AND p.Action IN ('View','Edit'))
);
GO

-- SME Civil/Elec/Mech - view project, edit drawings/change requests/document center
INSERT INTO Auth.RolePermissions (RoleId, PermissionId)
SELECT r.RoleId, p.PermissionId
FROM Auth.Roles r, Auth.Permissions p
WHERE r.RoleCode IN ('SME_CIVIL', 'SME_ELEC', 'SME_MECH')
AND (
    (p.Module = 'Project' AND p.Action = 'View')
    OR (p.Module = 'Document' AND p.Action IN ('View','Create','Edit','Approve'))
    OR (p.Module = 'Procurement' AND p.Action = 'View')
    OR (p.Module = 'Budget' AND p.Action IN ('View','Create'))
    OR (p.Module = 'Risk' AND p.Action IN ('View','Create','Edit'))
);
GO

-- Site Engineer - view projects, edit work progress, crew attendance, procurement view+create
INSERT INTO Auth.RolePermissions (RoleId, PermissionId)
SELECT r.RoleId, p.PermissionId
FROM Auth.Roles r, Auth.Permissions p
WHERE r.RoleCode = 'SITE_ENG'
AND (
    (p.Module = 'Project' AND p.Action = 'View')
    OR (p.Module = 'Project' AND p.SubModule IN ('WorkProgress','CrewAttendance') AND p.Action IN ('Create','Edit'))
    OR (p.Module = 'Procurement' AND p.Action IN ('View','Create'))
    OR (p.Module = 'Inventory' AND p.Action IN ('View','Create'))
);
GO

-- Purchase Manager - view projects, full procurement
INSERT INTO Auth.RolePermissions (RoleId, PermissionId)
SELECT r.RoleId, p.PermissionId
FROM Auth.Roles r, Auth.Permissions p
WHERE r.RoleCode = 'PURCH_MGR'
AND (
    (p.Module = 'Project' AND p.Action = 'View')
    OR (p.Module = 'Procurement')
    OR (p.Module = 'Document' AND p.SubModule = 'DocumentCenter' AND p.Action IN ('View','Create','Edit'))
);
GO

-- Management - view only (selective)
INSERT INTO Auth.RolePermissions (RoleId, PermissionId)
SELECT r.RoleId, p.PermissionId
FROM Auth.Roles r, Auth.Permissions p
WHERE r.RoleCode = 'MGMT'
AND p.Action = 'View';
GO

-- ============================================================
-- LOOKUP DATA
-- ============================================================
INSERT INTO Auth.Countries (CountryName, CountryCode) VALUES
('Zambia',      'ZAM'),
('Kenya',       'KEN'),
('Tanzania',    'TZA'),
('Uganda',      'UGA'),
('Ethiopia',    'ETH'),
('Rwanda',      'RWA'),
('South Africa','ZAF'),
('Nigeria',     'NGA'),
('Ghana',       'GHA'),
('Egypt',       'EGY');
GO

INSERT INTO Project.LabourCategories (CategoryName, TradeType) VALUES
('Mason',           'Civil'),
('Carpenter',       'Civil'),
('Steel Fixer',     'Civil'),
('Welder',          'Mechanical'),
('Pipefitter',      'Mechanical'),
('Electrician',     'Electrical'),
('Plumber',         'MEP'),
('Helper (Skilled)','General'),
('Helper (Unskilled)','General'),
('Supervisor',      'Management'),
('Safety Officer',  'HSE'),
('Surveyor',        'Civil');
GO

INSERT INTO Inventory.MaterialCategories (CategoryName, CategoryType) VALUES
('Cement & Concrete',   'Civil'),
('Steel & Rebar',       'Civil'),
('Bricks & Blocks',     'Civil'),
('Pipes & Fittings',    'Mechanical'),
('Structural Steel',    'Mechanical'),
('Pumps & Valves',      'Mechanical'),
('Cables & Wires',      'Electrical'),
('Switchgear',          'Electrical'),
('Lighting',            'Electrical'),
('Consumables',         'General'),
('Tools & Tackles',     'General'),
('Safety Equipment',    'HSE');
GO

INSERT INTO Budget.BudgetWBS (WBSCode, WBSName, WBSLevel) VALUES
('01', 'Approvals',                 1),
('02', 'Engineering & Design Cost', 1),
('03', 'Material Budget',           1),
('04', 'Labour Budget',             1),
('05', 'Equipment Hire',            1),
('06', 'Equipment Purchase',        1),
('07', 'On Site Expenses',          1);
GO

INSERT INTO Resource.ResourceTypes (TypeName) VALUES
('Work'), ('Material'), ('Cost'), ('Equipment');
GO

INSERT INTO Resource.Calendars (CalendarName, CalendarType, WorkingDays, WorkStartTime, WorkEndTime, IsDefault, CreatedBy) VALUES
('Standard 5-day', 'Organization', '1111100', '08:00', '17:00', 1, 1),
('Standard 6-day', 'Organization', '1111110', '08:00', '17:00', 0, 1),
('24-Hour Shift',  'Organization', '1111111', '00:00', '23:59', 0, 1),
('Night Shift',    'Organization', '1111110', '20:00', '06:00', 0, 1);
GO

-- Notification templates
INSERT INTO Notify.NotificationTemplates (TemplateCode, Subject, BodyHtml) VALUES
('TASK_ASSIGNED',       'Task Assigned: {{TaskName}}',
 '<p>Dear {{UserName}},</p><p>A task <strong>{{TaskName}}</strong> in project <strong>{{ProjectName}}</strong> has been assigned to you.</p><p>Due Date: {{DueDate}}</p>'),
('MR_PM_REVIEW',        'Material Request Awaiting Your Approval: {{MRCode}}',
 '<p>Dear {{UserName}},</p><p>Material Request <strong>{{MRCode}}</strong> for project <strong>{{ProjectName}}</strong> requires your approval.</p>'),
('RISK_REGISTERED',     'New Risk Registered: {{RiskTitle}}',
 '<p>A new risk <strong>{{RiskTitle}}</strong> (Severity: {{Severity}}) has been registered for project <strong>{{ProjectName}}</strong>.</p>'),
('DPR_SUBMITTED',       'DPR Submitted for {{Date}} - {{ProjectName}}',
 '<p>Daily Progress Report for <strong>{{ProjectName}}</strong> on <strong>{{Date}}</strong> has been submitted and awaits your approval.</p>'),
('TASK_DELAYED',        'Delayed Task Alert: {{TaskName}}',
 '<p>Task <strong>{{TaskName}}</strong> in project <strong>{{ProjectName}}</strong> is past its due date.</p>'),
('BUDGET_OVERRUN',      'Budget Alert: {{BudgetCategory}} - {{ProjectName}}',
 '<p>The budget for <strong>{{BudgetCategory}}</strong> in project <strong>{{ProjectName}}</strong> has exceeded 90% utilization.</p>'),
('CR_APPROVED',         'Change Request Approved: {{CRNumber}}',
 '<p>Change Request <strong>{{CRNumber}}</strong> for project <strong>{{ProjectName}}</strong> has been approved.</p>'),
('STOCK_REORDER',       'Low Stock Alert: {{MaterialName}} - {{ProjectName}}',
 '<p>Material <strong>{{MaterialName}}</strong> in project <strong>{{ProjectName}}</strong> has fallen below reorder level.</p>');
GO

-- Default admin user (password: Admin@123 - bcrypt hash placeholder)
INSERT INTO Auth.Users (FirstName, LastName, Email, PasswordHash, IsActive, IsEmailVerified, CreatedBy) VALUES
('System', 'Administrator', 'admin@mmgepm.com',
 '$2a$11$placeholder_bcrypt_hash_change_before_production',
 1, 1, 1);
GO

DECLARE @AdminUserId INT = SCOPE_IDENTITY();
DECLARE @AdminRoleId INT = (SELECT RoleId FROM Auth.Roles WHERE RoleCode = 'ADMIN');
INSERT INTO Auth.UserRoles (UserId, RoleId, AssignedBy) VALUES (@AdminUserId, @AdminRoleId, @AdminUserId);
GO

PRINT 'Seed data inserted successfully.';
GO
