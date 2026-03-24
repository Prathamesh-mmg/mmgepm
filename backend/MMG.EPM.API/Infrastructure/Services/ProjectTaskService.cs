using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using MMG.EPM.API.Data;
using MMG.EPM.API.Domain.DTOs;
using MMG.EPM.API.Domain.Entities;

namespace MMG.EPM.API.Infrastructure.Services;

// ─── Interfaces ─────────────────────────────────────────────────────────────

public interface IProjectService
{
    Task<PagedResult<ProjectListItemDto>> GetProjectsAsync(string? search, string? status, Guid userId, int page, int pageSize);
    Task<ProjectDetailDto?>               GetByIdAsync(Guid id, Guid userId);
    Task<ProjectDetailDto>                CreateAsync(CreateProjectRequest req, Guid userId);
    Task<ProjectDetailDto>                UpdateStatusAsync(Guid id, string status, Guid userId);
    Task<List<TaskListItemDto>>           GetTasksAsync(Guid projectId);
    Task<List<object>>                    GetDPRsAsync(Guid projectId);
    Task<List<object>>                    GetAttendanceAsync(Guid projectId, string? date);
    Task<ProjectMemberDto>                AddMemberAsync(Guid projectId, AddProjectMemberRequest req, Guid addedBy);
    Task                                  RemoveMemberAsync(Guid projectId, Guid userId, Guid removedBy);
}

public interface ITaskService
{
    Task<List<TaskListItemDto>>  GetTasksAsync(Guid? projectId, string? status, string? search, Guid? parentId);
    Task<TaskDetailDto?>         GetByIdAsync(Guid id);
    Task<TaskDetailDto>          CreateAsync(CreateTaskRequest req, Guid userId);
    Task<TaskDetailDto>          UpdateStatusAsync(Guid id, string status, Guid userId);
    Task<List<WorkProgressDto>>  GetProgressAsync(Guid taskId);
    Task<WorkProgressDto>        AddProgressAsync(Guid taskId, AddWorkProgressRequest req, List<IFormFile> photos, Guid userId);
    Task<List<TaskListItemDto>>  GetSubtasksAsync(Guid taskId);
    Task<List<object>>           GetAttachmentsAsync(Guid taskId);
    Task<object>                 UploadAttachmentAsync(Guid taskId, IFormFile file, Guid userId);
    Task<int>                    ImportFromExcelAsync(Guid projectId, IFormFile file, Guid userId);
}

public interface IUserManagementService
{
    Task<PagedResult<UserDto>>  GetUsersAsync(string? search, string? role, bool? isActive, int page, int pageSize);
    Task<UserDto?>              GetByIdAsync(Guid id);
    Task<UserDto>               CreateUserAsync(CreateUserRequest req);
    Task<UserDto>               UpdateUserAsync(Guid id, UpdateUserRequest req);
    Task<UserDto>               UpdateRolesAsync(Guid id, List<string> roles);
    Task<UserDto>               ToggleActiveAsync(Guid id);
    Task<List<string>>          GetRolesAsync();
    Task<byte[]>                ExportUsersAsync();
}

public interface IDashboardService
{
    Task<DashboardDto>          GetDashboardAsync(Guid userId);
    Task<List<TaskListItemDto>> GetMyTasksAsync(Guid userId, int limit);
}

// ─── ProjectService ──────────────────────────────────────────────────────────

public class ProjectService : IProjectService
{
    private readonly AppDbContext _db;
    private readonly INotificationService _notifications;

    public ProjectService(AppDbContext db, INotificationService notifications)
    { _db = db; _notifications = notifications; }

    public async Task<PagedResult<ProjectListItemDto>> GetProjectsAsync(string? search, string? status, Guid userId, int page, int pageSize)
    {
        var q = _db.Projects
            .Include(p => p.ProjectManager)
            .Where(p => !p.IsDeleted);

        // Non-admin users see only their projects
        var isAdmin = await _db.UserRoles.AnyAsync(ur => ur.UserId == userId && (ur.Role.Name == "Admin" || ur.Role.Name == "Management"));
        if (!isAdmin)
            q = q.Where(p => p.Members.Any(m => m.UserId == userId && m.IsActive)
                           || p.ProjectManagerId == userId || p.ProjectHeadId == userId || p.PlanningEngineerId == userId);

        if (!string.IsNullOrEmpty(search))
        {
            var s = search.ToLower();
            q = q.Where(p =>
                p.Name.ToLower().Contains(s) ||
                p.Code.ToLower().Contains(s) ||
                (p.Country != null && p.Country.ToLower().Contains(s)) ||
                (p.Location != null && p.Location.ToLower().Contains(s)) ||
                (p.ClientName != null && p.ClientName.ToLower().Contains(s)) ||
                (p.Description != null && p.Description.ToLower().Contains(s)));
        }
        if (!string.IsNullOrEmpty(status))
            q = q.Where(p => p.Status == status);

        var total = await q.CountAsync();
        var items = await q.OrderByDescending(p => p.CreatedAt).Skip((page-1)*pageSize).Take(pageSize)
            .Select(p => new ProjectListItemDto(p.Id, p.Name, p.Code, p.Description, p.Status,
                p.Country, p.Location, p.StartDate, p.ExpectedEndDate, p.Budget,
                p.OverallProgress, p.ProjectManager != null ? p.ProjectManager.FirstName + " " + p.ProjectManager.LastName : null,
                p.CreatedAt))
            .ToListAsync();

        return new PagedResult<ProjectListItemDto>(items, total, page, pageSize, (int)Math.Ceiling((double)total/pageSize));
    }

    public async Task<ProjectDetailDto?> GetByIdAsync(Guid id, Guid userId)
    {
        var p = await _db.Projects
            .Include(p => p.ProjectManager).Include(p => p.ProjectHead).Include(p => p.PlanningEngineer)
            .Include(p => p.Members).ThenInclude(m => m.User)
            .Include(p => p.Tasks).Include(p => p.Risks)
            .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);
        if (p == null) return null;

        var members = p.Members.Where(m => m.IsActive).Select(m =>
            new ProjectMemberDto(m.UserId, m.User.FullName, m.User.Email, m.ProjectRole, m.JoinedAt)).ToList();

        return new ProjectDetailDto(
            p.Id, p.Name, p.Code, p.Description, p.Status, p.ProjectType,
            p.Country, p.Location, p.SBUCode, p.StartDate, p.ExpectedEndDate, p.ActualEndDate,
            p.Budget, p.Currency, p.ClientName, p.ClientContact, p.OverallProgress,
            p.ProjectManagerId, p.ProjectManager?.FullName,
            p.ProjectHeadId,    p.ProjectHead?.FullName,
            p.PlanningEngineerId, p.PlanningEngineer?.FullName,
            p.Tasks.Count(t => !t.IsDeleted),
            p.Tasks.Count(t => !t.IsDeleted && t.Status == "Completed"),
            members.Count, p.Risks.Count(r => !r.IsDeleted && r.Status != "Closed"),
            p.CreatedAt, p.UpdatedAt, members);
    }

    public async Task<ProjectDetailDto> CreateAsync(CreateProjectRequest req, Guid userId)
    {
        var p = new Project
        {
            Name            = req.Name,
            Code            = req.Code.ToUpper(),
            Description     = req.Description,
            ProjectType     = req.ProjectType,
            Country         = req.Country,
            Location        = req.Location,
            StartDate       = DateTime.Parse(req.StartDate),
            ExpectedEndDate = req.ExpectedEndDate != null ? DateTime.Parse(req.ExpectedEndDate) : null,
            Budget          = req.Budget,
            ClientName      = req.ClientName,
            ClientContact   = req.ClientContact,
            Status          = "Planning",
            CreatedById     = userId,
        };
        _db.Projects.Add(p);
        // Auto-add creator as member
        _db.ProjectMembers.Add(new ProjectMember { ProjectId = p.Id, UserId = userId, ProjectRole = "ProjectManager" });
        await _db.SaveChangesAsync();
        return (await GetByIdAsync(p.Id, userId))!;
    }

    public async Task<ProjectDetailDto> UpdateStatusAsync(Guid id, string status, Guid userId)
    {
        var p = await _db.Projects.FindAsync(id) ?? throw new KeyNotFoundException("Project not found");
        p.Status = status; p.UpdatedAt = DateTime.UtcNow; p.UpdatedById = userId;
        if (status == "Completed") p.ActualEndDate = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return (await GetByIdAsync(id, userId))!;
    }

    public async Task<List<TaskListItemDto>> GetTasksAsync(Guid projectId)
    {
        return await _db.Tasks
            .Include(t => t.Assignee).Include(t => t.ParentTask)
            .Where(t => t.ProjectId == projectId && !t.IsDeleted)
            .OrderBy(t => t.WbsCode).ThenBy(t => t.Level).ThenBy(t => t.SortOrder)
            .Select(t => MapTask(t)).ToListAsync();
    }

    public async Task<List<object>> GetDPRsAsync(Guid projectId)
    {
        return await _db.DPRReports
            .Include(d => d.SubmittedBy)
            .Where(d => d.ProjectId == projectId && !d.IsDeleted)
            .OrderByDescending(d => d.ReportDate)
            .Select(d => (object)new {
                d.Id, d.ReportDate, d.Status, d.WorkCompleted,
                SubmittedByName = d.SubmittedBy != null ? d.SubmittedBy.FullName : null,
                d.SubmittedAt
            }).ToListAsync();
    }

    public async Task<List<object>> GetAttendanceAsync(Guid projectId, string? date)
    {
        var targetDate = date != null ? DateTime.Parse(date) : DateTime.Today;
        return await _db.CrewAttendance
            .Include(a => a.Contractor).Include(a => a.LabourCategory)
            .Where(a => a.ProjectId == projectId && a.AttendanceDate.Date == targetDate.Date && !a.IsDeleted)
            .Select(a => (object)new {
                a.Id, a.LabourName, a.Status, a.HoursWorked,
                TradeName = a.LabourCategory != null ? a.LabourCategory.Name : a.TradeName,
                ContractorName = a.Contractor != null ? a.Contractor.Name : null
            }).ToListAsync();
    }

    public async Task<ProjectMemberDto> AddMemberAsync(Guid projectId, AddProjectMemberRequest req, Guid addedBy)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == req.Email && !u.IsDeleted)
            ?? throw new KeyNotFoundException($"User '{req.Email}' not found");

        var existing = await _db.ProjectMembers.FirstOrDefaultAsync(m => m.ProjectId == projectId && m.UserId == user.Id);
        if (existing != null) { existing.IsActive = true; existing.ProjectRole = req.ProjectRole; }
        else _db.ProjectMembers.Add(new ProjectMember { ProjectId = projectId, UserId = user.Id, ProjectRole = req.ProjectRole });

        await _db.SaveChangesAsync();
        await _notifications.SendAsync(user.Id, "Added to Project", "You have been added to a project.", "Info", "Project", projectId);
        return new ProjectMemberDto(user.Id, user.FullName, user.Email, req.ProjectRole, DateTime.UtcNow);
    }

    public async Task RemoveMemberAsync(Guid projectId, Guid userId, Guid removedBy)
    {
        var m = await _db.ProjectMembers.FirstOrDefaultAsync(m => m.ProjectId == projectId && m.UserId == userId);
        if (m != null) { m.IsActive = false; m.LeftAt = DateTime.UtcNow; await _db.SaveChangesAsync(); }
    }

    private static TaskListItemDto MapTask(ProjectTask t) => new(
        t.Id, t.ProjectId, "", t.ParentTaskId,
        t.ParentTask?.Name, t.Name, t.WbsCode, t.Level,
        t.Status, t.Priority, t.ProgressPercentage,
        t.StartDate, t.EndDate, t.EstimatedHours, t.ActualHours,
        t.AssigneeId, t.Assignee?.FullName, t.IsMilestone, t.HasChildren);
}

// ─── TaskService ─────────────────────────────────────────────────────────────

public class TaskService : ITaskService
{
    private readonly AppDbContext _db;
    private readonly IFileStorageService _storage;

    public TaskService(AppDbContext db, IFileStorageService storage) { _db = db; _storage = storage; }

    public async Task<List<TaskListItemDto>> GetTasksAsync(Guid? projectId, string? status, string? search, Guid? parentId)
    {
        var q = _db.Tasks.Include(t => t.Assignee).Include(t => t.ParentTask).Where(t => !t.IsDeleted);
        if (projectId.HasValue) q = q.Where(t => t.ProjectId == projectId.Value);
        if (!string.IsNullOrEmpty(status)) q = q.Where(t => t.Status == status);
        if (!string.IsNullOrEmpty(search)) q = q.Where(t => t.Name.Contains(search));
        if (parentId.HasValue) q = q.Where(t => t.ParentTaskId == parentId.Value);
        return await q.OrderBy(t => t.WbsCode).ThenBy(t => t.Level).ThenBy(t => t.SortOrder)
            .Select(t => MapTask(t)).ToListAsync();
    }

    public async Task<TaskDetailDto?> GetByIdAsync(Guid id)
    {
        var t = await _db.Tasks
            .Include(t => t.Assignee).Include(t => t.ParentTask).Include(t => t.Project)
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted);
        if (t == null) return null;
        return new TaskDetailDto(t.Id, t.ProjectId, t.Project.Name, t.SubProjectId,
            t.ParentTaskId, t.ParentTask?.Name, t.Name, t.Description, t.WbsCode, t.Level,
            t.Status, t.Priority, t.ProgressPercentage, t.StartDate, t.EndDate,
            t.EstimatedHours, t.ActualHours, t.EstimatedCost, t.ActualCost,
            t.AssigneeId, t.Assignee?.FullName, t.IsMilestone, t.HasChildren,
            t.CreatedAt, t.UpdatedAt);
    }

    public async Task<TaskDetailDto> CreateAsync(CreateTaskRequest req, Guid userId)
    {
        // Determine level from parent
        int level = 1;
        if (req.ParentTaskId.HasValue)
        {
            var parent = await _db.Tasks.FindAsync(req.ParentTaskId.Value);
            if (parent != null) { level = Math.Min(parent.Level + 1, 7); parent.HasChildren = true; }
        }

        var task = new ProjectTask
        {
            ProjectId     = req.ProjectId,
            SubProjectId  = req.SubProjectId,
            ParentTaskId  = req.ParentTaskId,
            Name          = req.Name,
            Description   = req.Description,
            WbsCode       = req.WbsCode,
            Level         = level,
            Priority      = req.Priority,
            StartDate     = req.StartDate != null ? DateTime.Parse(req.StartDate) : null,
            EndDate       = req.EndDate   != null ? DateTime.Parse(req.EndDate)   : null,
            EstimatedHours = req.EstimatedHours,
            AssigneeId    = req.AssigneeId,
            IsMilestone   = req.IsMilestone,
            Status        = "NotStarted",
            CreatedById   = userId,
        };
        _db.Tasks.Add(task);
        await _db.SaveChangesAsync();
        return (await GetByIdAsync(task.Id))!;
    }

    public async Task<TaskDetailDto> UpdateStatusAsync(Guid id, string status, Guid userId)
    {
        var t = await _db.Tasks.FindAsync(id) ?? throw new KeyNotFoundException();
        t.Status = status; t.UpdatedAt = DateTime.UtcNow; t.UpdatedById = userId;
        if (status == "Completed") t.ProgressPercentage = 100;
        await _db.SaveChangesAsync();
        await PropagateProgressAsync(t);
        return (await GetByIdAsync(id))!;
    }

    public async Task<List<WorkProgressDto>> GetProgressAsync(Guid taskId)
    {
        return await _db.WorkProgress
            .Include(p => p.UpdatedBy).Include(p => p.Photos)
            .Where(p => p.TaskId == taskId)
            .OrderByDescending(p => p.ReportedAt)
            .Select(p => new WorkProgressDto(p.Id, p.TaskId, p.UpdatedBy.FullName,
                p.Notes, p.ProgressPercentage, p.HoursLogged, p.ReportedAt,
                p.Photos.Select(ph => ph.FileUrl ?? ph.FilePath).ToList()))
            .ToListAsync();
    }

    public async Task<WorkProgressDto> AddProgressAsync(Guid taskId, AddWorkProgressRequest req, List<IFormFile> photos, Guid userId)
    {
        var task = await _db.Tasks.FindAsync(taskId) ?? throw new KeyNotFoundException();
        var wp = new WorkProgress
        {
            TaskId = taskId, UpdatedById = userId,
            Notes = req.Notes, ProgressPercentage = req.ProgressPercentage,
            HoursLogged = req.HoursLogged, ReportedAt = DateTime.UtcNow,
        };
        _db.WorkProgress.Add(wp);
        task.ProgressPercentage = req.ProgressPercentage;
        task.UpdatedAt = DateTime.UtcNow;
        if (req.HoursLogged.HasValue) task.ActualHours = (task.ActualHours ?? 0) + req.HoursLogged.Value;
        await _db.SaveChangesAsync();

        // Save photos
        foreach (var photo in photos)
        {
            var (path, url) = await _storage.SaveFileAsync(photo, $"progress/{taskId}");
            _db.WorkProgressPhotos.Add(new WorkProgressPhoto
            {
                WorkProgressId = wp.Id, FileName = photo.FileName,
                FilePath = path, FileUrl = url, FileSize = photo.Length,
            });
        }
        await _db.SaveChangesAsync();
        await PropagateProgressAsync(task);

        return (await GetProgressAsync(taskId)).First(p => p.Id == wp.Id);
    }

    public async Task<List<TaskListItemDto>> GetSubtasksAsync(Guid taskId)
    {
        return await _db.Tasks.Include(t => t.Assignee)
            .Where(t => t.ParentTaskId == taskId && !t.IsDeleted)
            .OrderBy(t => t.SortOrder)
            .Select(t => MapTask(t)).ToListAsync();
    }

    public async Task<List<object>> GetAttachmentsAsync(Guid taskId)
    {
        return await _db.FileAttachments
            .Include(a => a.UploadedBy)
            .Where(a => a.EntityType == "Task" && a.EntityId == taskId && !a.IsDeleted)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => (object)new {
                a.Id, a.FileName, a.FileUrl, a.ContentType, a.FileSize,
                UploadedByName = a.UploadedBy != null ? a.UploadedBy.FullName : null,
                a.CreatedAt
            }).ToListAsync();
    }

    public async Task<object> UploadAttachmentAsync(Guid taskId, IFormFile file, Guid userId)
    {
        var (path, url) = await _storage.SaveFileAsync(file, $"tasks/{taskId}");
        var att = new FileAttachment
        {
            FileName = file.FileName, FilePath = path, FileUrl = url,
            ContentType = file.ContentType, FileSize = file.Length,
            EntityType = "Task", EntityId = taskId, UploadedById = userId,
        };
        _db.FileAttachments.Add(att);
        await _db.SaveChangesAsync();
        return new { att.Id, att.FileName, att.FileUrl, att.ContentType, att.FileSize, att.CreatedAt };
    }

    public async Task<int> ImportFromExcelAsync(Guid projectId, IFormFile file, Guid userId)
    {
        int count = 0;
        using var stream = file.OpenReadStream();
        using var wb = new XLWorkbook(stream);
        var ws = wb.Worksheet(1);
        var rows = ws.RowsUsed().Skip(1).ToList(); // skip header

        foreach (var row in rows)
        {
            var name = row.Cell(2).GetValue<string>();
            if (string.IsNullOrWhiteSpace(name)) continue;

            _db.Tasks.Add(new ProjectTask
            {
                ProjectId    = projectId,
                WbsCode      = row.Cell(1).GetValue<string>(),
                Name         = name,
                Status       = "NotStarted",
                Priority     = row.Cell(5).GetValue<string>() is var p && !string.IsNullOrEmpty(p) ? p : "Medium",
                StartDate    = row.Cell(7).GetValue<string>() is var sd && !string.IsNullOrEmpty(sd) ? DateTime.Parse(sd) : null,
                EndDate      = row.Cell(8).GetValue<string>() is var ed && !string.IsNullOrEmpty(ed) ? DateTime.Parse(ed) : null,
                EstimatedHours = row.Cell(9).GetValue<decimal?>(),
                Level        = 1,
                CreatedById  = userId,
            });
            count++;
        }
        await _db.SaveChangesAsync();
        return count;
    }

    // Propagate progress up the task hierarchy
    private async Task PropagateProgressAsync(ProjectTask task)
    {
        if (task.ParentTaskId == null) return;
        var siblings = await _db.Tasks
            .Where(t => t.ParentTaskId == task.ParentTaskId && !t.IsDeleted)
            .ToListAsync();
        if (!siblings.Any()) return;
        var parent = await _db.Tasks.FindAsync(task.ParentTaskId!.Value);
        if (parent == null) return;
        parent.ProgressPercentage = Math.Round(siblings.Average(s => s.ProgressPercentage), 1);
        parent.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await PropagateProgressAsync(parent);
    }

    private static TaskListItemDto MapTask(ProjectTask t) => new(
        t.Id, t.ProjectId, "", t.ParentTaskId, t.ParentTask?.Name,
        t.Name, t.WbsCode, t.Level, t.Status, t.Priority, t.ProgressPercentage,
        t.StartDate, t.EndDate, t.EstimatedHours, t.ActualHours,
        t.AssigneeId, t.Assignee?.FullName, t.IsMilestone, t.HasChildren);
}

// ─── UserManagementService ───────────────────────────────────────────────────

public class UserManagementService : IUserManagementService
{
    private readonly AppDbContext _db;

    public UserManagementService(AppDbContext db) => _db = db;

    public async Task<PagedResult<UserDto>> GetUsersAsync(string? search, string? role, bool? isActive, int page, int pageSize)
    {
        var q = _db.Users.Include(u => u.UserRoles).ThenInclude(ur => ur.Role).Where(u => !u.IsDeleted);
        if (!string.IsNullOrEmpty(search)) q = q.Where(u => u.Email.Contains(search) || u.FirstName.Contains(search) || u.LastName.Contains(search));
        if (!string.IsNullOrEmpty(role))   q = q.Where(u => u.UserRoles.Any(ur => ur.Role.Name == role));
        if (isActive.HasValue)             q = q.Where(u => u.IsActive == isActive.Value);
        var total = await q.CountAsync();
        var items = await q.OrderBy(u => u.FirstName).Skip((page-1)*pageSize).Take(pageSize)
            .Select(u => MapUser(u)).ToListAsync();
        return new PagedResult<UserDto>(items, total, page, pageSize, (int)Math.Ceiling((double)total/pageSize));
    }

    public async Task<UserDto?> GetByIdAsync(Guid id)
    {
        var u = await _db.Users.Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted);
        return u == null ? null : MapUser(u);
    }

    public async Task<UserDto> CreateUserAsync(CreateUserRequest req)
    {
        if (await _db.Users.AnyAsync(u => u.Email == req.Email && !u.IsDeleted))
            throw new InvalidOperationException("Email already exists");

        var user = new User
        {
            FirstName         = req.FirstName,
            LastName          = req.LastName,
            Email             = req.Email,
            PasswordHash      = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Phone             = req.Phone,
            Department        = req.Department,
            JobTitle          = req.JobTitle,
            MustChangePassword = true,
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        await UpdateRolesAsync(user.Id, req.Roles);
        return (await GetByIdAsync(user.Id))!;
    }

    public async Task<UserDto> UpdateUserAsync(Guid id, UpdateUserRequest req)
    {
        var u = await _db.Users.FindAsync(id) ?? throw new KeyNotFoundException();
        u.FirstName = req.FirstName; u.LastName = req.LastName;
        u.Phone = req.Phone; u.Department = req.Department; u.JobTitle = req.JobTitle;
        u.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return (await GetByIdAsync(id))!;
    }

    public async Task<UserDto> UpdateRolesAsync(Guid id, List<string> roles)
    {
        var existing = await _db.UserRoles.Where(ur => ur.UserId == id).ToListAsync();
        _db.UserRoles.RemoveRange(existing);
        foreach (var roleName in roles)
        {
            var role = await _db.Roles.FirstOrDefaultAsync(r => r.Name == roleName);
            if (role != null) _db.UserRoles.Add(new UserRole { UserId = id, RoleId = role.Id });
        }
        await _db.SaveChangesAsync();
        return (await GetByIdAsync(id))!;
    }

    public async Task<UserDto> ToggleActiveAsync(Guid id)
    {
        var u = await _db.Users.FindAsync(id) ?? throw new KeyNotFoundException();
        u.IsActive = !u.IsActive; u.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return (await GetByIdAsync(id))!;
    }

    public async Task<List<string>> GetRolesAsync()
        => await _db.Roles.Where(r => !r.IsDeleted).Select(r => r.Name).OrderBy(r => r).ToListAsync();

    public async Task<byte[]> ExportUsersAsync()
    {
        var users = await _db.Users.Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Where(u => !u.IsDeleted).OrderBy(u => u.FirstName).ToListAsync();

        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Users");
        string[] headers = { "First Name", "Last Name", "Email", "Department", "Job Title", "Roles", "Active", "Last Login", "Created" };
        for (int i = 0; i < headers.Length; i++) { ws.Cell(1, i+1).Value = headers[i]; ws.Cell(1, i+1).Style.Font.Bold = true; }
        for (int r = 0; r < users.Count; r++)
        {
            var u = users[r]; var row = r + 2;
            ws.Cell(row, 1).Value = u.FirstName;
            ws.Cell(row, 2).Value = u.LastName;
            ws.Cell(row, 3).Value = u.Email;
            ws.Cell(row, 4).Value = u.Department ?? "";
            ws.Cell(row, 5).Value = u.JobTitle ?? "";
            ws.Cell(row, 6).Value = string.Join(", ", u.UserRoles.Select(ur => ur.Role.Name));
            ws.Cell(row, 7).Value = u.IsActive ? "Yes" : "No";
            ws.Cell(row, 8).Value = u.LastLoginAt?.ToString("yyyy-MM-dd") ?? "";
            ws.Cell(row, 9).Value = u.CreatedAt.ToString("yyyy-MM-dd");
        }
        ws.Columns().AdjustToContents();
        using var ms = new MemoryStream(); wb.SaveAs(ms); return ms.ToArray();
    }

    private static UserDto MapUser(User u) => new(
        u.Id, u.FirstName, u.LastName, u.Email, u.Phone, u.Department, u.JobTitle,
        u.IsActive, u.LastLoginAt, u.CreatedAt,
        u.UserRoles.Select(ur => ur.Role.Name).ToList(),
        new List<string>());
}

// ─── DashboardService ────────────────────────────────────────────────────────

public class DashboardService : IDashboardService
{
    private readonly AppDbContext _db;

    public DashboardService(AppDbContext db) => _db = db;

    public async Task<DashboardDto> GetDashboardAsync(Guid userId)
    {
        var now = DateTime.UtcNow;

        var projects       = await _db.Projects.Where(p => !p.IsDeleted).ToListAsync();
        var totalProjects   = projects.Count;
        var activeProjects  = projects.Count(p => p.Status == "Active");
        var completedProj   = projects.Count(p => p.Status == "Completed");

        var tasks      = await _db.Tasks.Where(t => !t.IsDeleted).ToListAsync();
        var totalTasks  = tasks.Count;
        var dueToday    = tasks.Count(t => t.EndDate.HasValue && t.EndDate.Value.Date == now.Date && t.Status != "Completed");
        var overdue     = tasks.Count(t => t.EndDate.HasValue && t.EndDate.Value.Date < now.Date && t.Status != "Completed" && t.Status != "Cancelled");

        var risks        = await _db.Risks.Where(r => !r.IsDeleted).ToListAsync();
        var openRisks    = risks.Count(r => r.Status != "Closed");
        var criticalRisks = risks.Count(r => r.RiskLevel == "Critical" && r.Status != "Closed");

        var pendingMRs  = await _db.MaterialRequests.CountAsync(m => m.Status == "Submitted" && !m.IsDeleted);
        var pendingDPRs = await _db.DPRReports.CountAsync(d => d.Status == "Submitted" && !d.IsDeleted);

        var totalBudget   = projects.Sum(p => p.Budget ?? 0);
        var totalExpended = await _db.Expenditures.Where(e => !e.IsDeleted).SumAsync(e => e.Amount);
        var burnRate      = totalBudget > 0 ? Math.Round((totalExpended / totalBudget) * 100, 1) : 0;

        var byStatus = projects.GroupBy(p => p.Status)
            .Select(g => new ProjectStatusCount(g.Key, g.Count())).ToList();

        // Monthly tasks for last 6 months
        var monthlyTasks = Enumerable.Range(0, 6).Select(i => {
            var m = now.AddMonths(-i);
            var created   = tasks.Count(t => t.CreatedAt.Year == m.Year && t.CreatedAt.Month == m.Month);
            var completed = tasks.Count(t => t.Status == "Completed" && t.UpdatedAt.Year == m.Year && t.UpdatedAt.Month == m.Month);
            return new MonthlyTaskCount(m.ToString("MMM"), completed, created);
        }).Reverse().ToList();

        // My tasks
        var myTasks = await _db.Tasks.Include(t => t.Assignee).Include(t => t.Project)
            .Where(t => t.AssigneeId == userId && t.Status != "Completed" && !t.IsDeleted)
            .OrderBy(t => t.EndDate).Take(10)
            .Select(t => new TaskListItemDto(t.Id, t.ProjectId, t.Project.Name, t.ParentTaskId, null,
                t.Name, t.WbsCode, t.Level, t.Status, t.Priority, t.ProgressPercentage,
                t.StartDate, t.EndDate, t.EstimatedHours, t.ActualHours,
                t.AssigneeId, t.Assignee != null ? t.Assignee.FullName : null, t.IsMilestone, t.HasChildren))
            .ToListAsync();

        var recentProjects = await _db.Projects.Include(p => p.ProjectManager)
            .Where(p => !p.IsDeleted).OrderByDescending(p => p.UpdatedAt).Take(5)
            .Select(p => new ProjectListItemDto(p.Id, p.Name, p.Code, p.Description, p.Status,
                p.Country, p.Location, p.StartDate, p.ExpectedEndDate, p.Budget,
                p.OverallProgress, p.ProjectManager != null ? p.ProjectManager.FullName : null, p.CreatedAt))
            .ToListAsync();

        var topRisks = await _db.Risks.Include(r => r.Project).Include(r => r.RaisedBy).Include(r => r.RiskOwner)
            .Where(r => !r.IsDeleted && r.Status != "Closed")
            .OrderByDescending(r => r.RiskScore).Take(5)
            .Select(r => new RiskDto(r.Id, r.RiskNumber, r.Title, r.Description, r.Category, r.RiskType,
                r.Probability, r.Impact, r.RiskScore, r.RiskLevel, r.Status, r.MitigationPlan,
                r.MitigationStrategy, r.ContingencyPlan, r.ContingencyBudget,
                r.Project.Name, r.RaisedBy.FullName, r.RiskOwner != null ? r.RiskOwner.FullName : null,
                r.ReviewDate, r.ClosedAt, r.CreatedAt))
            .ToListAsync();

        var budgetSummary = projects.Take(5).Select(p => new BudgetSummaryItem(
            p.Name, p.Budget ?? 0,
            _db.Expenditures.Where(e => e.ProjectId == p.Id && !e.IsDeleted).Sum(e => e.Amount),
            0)).ToList();

        return new DashboardDto(
            totalProjects, activeProjects, completedProj,
            totalTasks, dueToday, overdue,
            openRisks, criticalRisks, pendingMRs, pendingDPRs,
            (decimal)burnRate, byStatus, monthlyTasks,
            myTasks, recentProjects, topRisks, budgetSummary);
    }

    public async Task<List<TaskListItemDto>> GetMyTasksAsync(Guid userId, int limit)
    {
        return await _db.Tasks.Include(t => t.Assignee).Include(t => t.Project)
            .Where(t => t.AssigneeId == userId && t.Status != "Completed" && !t.IsDeleted)
            .OrderBy(t => t.EndDate).Take(limit)
            .Select(t => new TaskListItemDto(t.Id, t.ProjectId, t.Project.Name, t.ParentTaskId, null,
                t.Name, t.WbsCode, t.Level, t.Status, t.Priority, t.ProgressPercentage,
                t.StartDate, t.EndDate, t.EstimatedHours, t.ActualHours,
                t.AssigneeId, t.Assignee != null ? t.Assignee.FullName : null, t.IsMilestone, t.HasChildren))
            .ToListAsync();
    }
}
