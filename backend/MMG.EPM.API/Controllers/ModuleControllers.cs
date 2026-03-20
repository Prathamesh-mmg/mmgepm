using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MMG.EPM.API.Domain.DTOs;
using MMG.EPM.API.Infrastructure.Services;

namespace MMG.EPM.API.Controllers;

// ─── Risks ─────────────────────────────────────────────────────────────────

[ApiController, Route("api/risks"), Authorize]
public class RisksController : ControllerBase
{
    private readonly IRiskService _risks;
    private readonly ICurrentUserService _cu;
    public RisksController(IRiskService risks, ICurrentUserService cu) { _risks = risks; _cu = cu; }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? projectId, [FromQuery] string? status,
        [FromQuery] string? category, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        => Ok(await _risks.GetRisksAsync(projectId, status, category, page, pageSize));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var r = await _risks.GetByIdAsync(id);
        return r == null ? NotFound() : Ok(r);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRiskRequest req)
        => Ok(await _risks.CreateAsync(req, _cu.UserId));

    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateRiskStatusRequest req)
        => Ok(await _risks.UpdateStatusAsync(id, req, _cu.UserId));

    [HttpPost("{id:guid}/updates")]
    public async Task<IActionResult> AddUpdate(Guid id, [FromBody] RiskUpdateDto update)
        => Ok(await _risks.AddUpdateAsync(id, update, _cu.UserId));

    [HttpGet("{id:guid}/updates")]
    public async Task<IActionResult> GetUpdates(Guid id)
        => Ok(await _risks.GetUpdatesAsync(id));
}

// ─── Budget ────────────────────────────────────────────────────────────────

[ApiController, Route("api/budget"), Authorize]
public class BudgetController : ControllerBase
{
    private readonly IBudgetService _budget;
    private readonly ICurrentUserService _cu;
    private readonly IReportService _reports;
    public BudgetController(IBudgetService budget, ICurrentUserService cu, IReportService reports)
    { _budget = budget; _cu = cu; _reports = reports; }

    [HttpGet("project/{projectId:guid}")]
    public async Task<IActionResult> GetBudgets(Guid projectId)
        => Ok(await _budget.GetProjectBudgetsAsync(projectId));

    [HttpGet("wbs/{projectId:guid}")]
    public async Task<IActionResult> GetWBS(Guid projectId)
        => Ok(await _budget.GetWBSItemsAsync(projectId));

    [HttpGet("wbs/item/{id:guid}")]
    public async Task<IActionResult> GetWBSItem(Guid id)
    {
        var item = await _budget.GetWBSItemAsync(id);
        return item == null ? NotFound() : Ok(item);
    }

    [HttpGet("expenditures/{projectId:guid}")]
    public async Task<IActionResult> GetExpenditures(Guid projectId, [FromQuery] Guid? wbsId)
        => Ok(await _budget.GetExpendituresAsync(projectId, wbsId));

    [HttpPost("expenditures")]
    public async Task<IActionResult> AddExpenditure([FromBody] CreateExpenditureRequest req)
        => Ok(await _budget.AddExpenditureAsync(req, _cu.UserId));

    [HttpPost("recalculate/{projectId:guid}")]
    public async Task<IActionResult> Recalculate(Guid projectId)
    {
        await _budget.RecalculateBudgetAsync(projectId);
        return NoContent();
    }

    [HttpGet("export/{projectId:guid}")]
    public async Task<IActionResult> Export(Guid projectId)
    {
        var bytes = await _reports.ExportBudgetToExcelAsync(projectId);
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "budget.xlsx");
    }
}

// ─── Procurement ───────────────────────────────────────────────────────────

[ApiController, Route("api/procurement"), Authorize]
public class ProcurementController : ControllerBase
{
    private readonly IProcurementService _proc;
    private readonly ICurrentUserService _cu;
    private readonly IReportService _reports;
    public ProcurementController(IProcurementService proc, ICurrentUserService cu, IReportService reports)
    { _proc = proc; _cu = cu; _reports = reports; }

    [HttpGet("material-requests")]
    public async Task<IActionResult> GetMRs(
        [FromQuery] Guid? projectId, [FromQuery] string? status,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        => Ok(await _proc.GetMRsAsync(projectId, status, page, pageSize));

    [HttpGet("material-requests/{id:guid}")]
    public async Task<IActionResult> GetMR(Guid id)
    {
        var mr = await _proc.GetMRByIdAsync(id);
        return mr == null ? NotFound() : Ok(mr);
    }

    [HttpPost("material-requests")]
    public async Task<IActionResult> CreateMR([FromBody] CreateMRRequest req)
        => Ok(await _proc.CreateMRAsync(req, _cu.UserId));

    [HttpPost("material-requests/{id:guid}/advance")]
    public async Task<IActionResult> AdvanceMR(Guid id, [FromBody] AdvanceMRRequest req)
        => Ok(await _proc.AdvanceMRAsync(id, req.Action, _cu.UserId));

    [HttpGet("purchase-orders")]
    public async Task<IActionResult> GetPOs([FromQuery] Guid? projectId)
        => Ok(await _proc.GetPOsAsync(projectId));

    [HttpGet("vendors")]
    public async Task<IActionResult> GetVendors()
        => Ok(await _proc.GetVendorsAsync());

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] Guid? projectId)
    {
        var bytes = await _reports.ExportProcurementToExcelAsync(projectId);
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "procurement.xlsx");
    }
}

// ─── Inventory ─────────────────────────────────────────────────────────────

[ApiController, Route("api/inventory"), Authorize]
public class InventoryController : ControllerBase
{
    private readonly IInventoryService _inv;
    private readonly ICurrentUserService _cu;
    private readonly IReportService _reports;
    public InventoryController(IInventoryService inv, ICurrentUserService cu, IReportService reports)
    { _inv = inv; _cu = cu; _reports = reports; }

    [HttpGet("materials")]
    public async Task<IActionResult> GetMaterials(
        [FromQuery] string? search, [FromQuery] Guid? categoryId,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 30)
        => Ok(await _inv.GetMaterialsAsync(search, categoryId, page, pageSize));

    [HttpGet("stock-ledger")]
    public async Task<IActionResult> GetLedger([FromQuery] Guid? projectId, [FromQuery] Guid? materialId)
        => Ok(await _inv.GetStockLedgerAsync(projectId, materialId));

    [HttpGet("site-transfers")]
    public async Task<IActionResult> GetTransfers([FromQuery] Guid? projectId)
        => Ok(await _inv.GetSiteTransfersAsync(projectId));

    [HttpPost("stock-entry")]
    public async Task<IActionResult> AddEntry(
        [FromQuery] Guid materialId, [FromQuery] Guid projectId,
        [FromQuery] string type, [FromQuery] decimal qty,
        [FromQuery] decimal? cost, [FromQuery] string? notes)
        => Ok(await _inv.AddStockEntryAsync(materialId, projectId, type, qty, cost, notes, _cu.UserId));

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] Guid? projectId)
    {
        var bytes = await _reports.ExportInventoryToExcelAsync(projectId);
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "inventory.xlsx");
    }
}

// ─── Resources ─────────────────────────────────────────────────────────────

[ApiController, Route("api/resources"), Authorize]
public class ResourcesController : ControllerBase
{
    private readonly IResourceService _res;
    private readonly ICurrentUserService _cu;
    public ResourcesController(IResourceService res, ICurrentUserService cu) { _res = res; _cu = cu; }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search, [FromQuery] string? status, [FromQuery] string? type,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 30)
        => Ok(await _res.GetResourcesAsync(search, status, type, page, pageSize));

    [HttpGet("allocations")]
    public async Task<IActionResult> GetAllocations([FromQuery] Guid? projectId, [FromQuery] Guid? resourceId)
        => Ok(await _res.GetAllocationsAsync(projectId, resourceId));

    [HttpPost("allocations")]
    public async Task<IActionResult> Allocate(
        [FromQuery] Guid taskId, [FromQuery] Guid resourceId,
        [FromQuery] DateTime start, [FromQuery] DateTime end, [FromQuery] decimal percent = 100)
        => Ok(await _res.AllocateAsync(taskId, resourceId, start, end, percent, _cu.UserId));
}

// ─── Documents ─────────────────────────────────────────────────────────────

[ApiController, Route("api/documents"), Authorize]
public class DocumentsController : ControllerBase
{
    private readonly IDocumentService _docs;
    private readonly ICurrentUserService _cu;
    public DocumentsController(IDocumentService docs, ICurrentUserService cu) { _docs = docs; _cu = cu; }

    [HttpGet("folders")]
    public async Task<IActionResult> GetFolders([FromQuery] Guid projectId)
        => Ok(await _docs.GetFoldersAsync(projectId));

    [HttpGet]
    public async Task<IActionResult> GetDocs(
        [FromQuery] Guid? projectId, [FromQuery] Guid? folderId,
        [FromQuery] string? search, [FromQuery] string? type,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        => Ok(await _docs.GetDocumentsAsync(projectId, folderId, search, type, page, pageSize));

    [HttpPost("upload")]
    public async Task<IActionResult> Upload(
        [FromForm] Guid projectId, [FromForm] Guid? folderId,
        [FromForm] string title, [FromForm] string? description,
        [FromForm] string? documentType, IFormFile file)
        => Ok(await _docs.UploadDocumentAsync(projectId, folderId, title, description, documentType, file, _cu.UserId));

    [HttpGet("change-requests")]
    public async Task<IActionResult> GetCRs([FromQuery] Guid? projectId)
        => Ok(await _docs.GetChangeRequestsAsync(projectId));

    [HttpPost("change-requests")]
    public async Task<IActionResult> CreateCR([FromBody] CreateChangeRequestRequest req)
        => Ok(await _docs.CreateChangeRequestAsync(req, _cu.UserId));

    [HttpPatch("change-requests/{id:guid}/status")]
    public async Task<IActionResult> UpdateCRStatus(Guid id, [FromBody] UpdateCRStatusRequest req)
        => Ok(await _docs.UpdateCRStatusAsync(id, req.Status, req.Comments, _cu.UserId));
}

// ─── Dashboard ─────────────────────────────────────────────────────────────

[ApiController, Route("api/dashboard"), Authorize]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dash;
    private readonly ICurrentUserService _cu;
    public DashboardController(IDashboardService dash, ICurrentUserService cu) { _dash = dash; _cu = cu; }

    [HttpGet]
    public async Task<IActionResult> Get()
        => Ok(await _dash.GetDashboardAsync(_cu.UserId));

    [HttpGet("my-tasks")]
    public async Task<IActionResult> MyTasks([FromQuery] int limit = 10)
        => Ok(await _dash.GetMyTasksAsync(_cu.UserId, limit));
}

// ─── Files ─────────────────────────────────────────────────────────────────

[ApiController, Route("api/files"), Authorize]
public class FilesController : ControllerBase
{
    private readonly IFileStorageService _storage;
    public FilesController(IFileStorageService storage) => _storage = storage;

    [HttpGet("{*path}")]
    public IActionResult Download(string path)
    {
        var (stream, contentType, fileName) = _storage.GetFile(path);
        if (stream == null) return NotFound();
        return File(stream, contentType ?? "application/octet-stream", fileName);
    }
}

// ─── Users (Admin) ─────────────────────────────────────────────────────────

[ApiController, Route("api/users"), Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserManagementService _users;
    private readonly ICurrentUserService _cu;
    public UsersController(IUserManagementService users, ICurrentUserService cu) { _users = users; _cu = cu; }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search, [FromQuery] string? role,
        [FromQuery] bool? isActive, [FromQuery] int page = 1, [FromQuery] int pageSize = 30)
        => Ok(await _users.GetUsersAsync(search, role, isActive, page, pageSize));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var u = await _users.GetByIdAsync(id);
        return u == null ? NotFound() : Ok(u);
    }

    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var u = await _users.GetByIdAsync(_cu.UserId);
        return u == null ? NotFound() : Ok(u);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest req)
        => Ok(await _users.CreateUserAsync(req));

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUserRequest req)
        => Ok(await _users.UpdateUserAsync(id, req));

    [HttpPut("{id:guid}/roles")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateRoles(Guid id, [FromBody] UpdateUserRolesRequest req)
        => Ok(await _users.UpdateRolesAsync(id, req.Roles));

    [HttpPatch("{id:guid}/toggle-active")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ToggleActive(Guid id)
        => Ok(await _users.ToggleActiveAsync(id));

    [HttpGet("roles")]
    public async Task<IActionResult> GetRoles()
        => Ok(await _users.GetRolesAsync());

    [HttpGet("export")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Export()
    {
        var bytes = await _users.ExportUsersAsync();
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "users.xlsx");
    }
}

// ─── Reports ───────────────────────────────────────────────────────────────

[ApiController, Route("api/reports"), Authorize]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reports;
    public ReportsController(IReportService reports) => _reports = reports;

    [HttpGet("projects")]
    public async Task<IActionResult> Projects()
    {
        var bytes = await _reports.ExportProjectsToExcelAsync();
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "projects.xlsx");
    }

    [HttpGet("tasks/{projectId:guid}")]
    public async Task<IActionResult> Tasks(Guid projectId)
    {
        var bytes = await _reports.ExportTasksToExcelAsync(projectId);
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "tasks.xlsx");
    }

    [HttpGet("risks")]
    public async Task<IActionResult> Risks([FromQuery] Guid? projectId)
    {
        var bytes = await _reports.ExportRisksToExcelAsync(projectId);
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "risks.xlsx");
    }
}

// ─── Additional DTOs for new endpoints ─────────────────────────────────────
public record UpdateCRStatusRequest(string Status, string? Comments);

// ─── Task Delays ────────────────────────────────────────────────

[ApiController, Route("api/tasks/{taskId:guid}/delays"), Authorize]
public class TaskDelaysController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _cu;
    public TaskDelaysController(AppDbContext db, ICurrentUserService cu) { _db = db; _cu = cu; }

    [HttpGet]
    public async Task<IActionResult> GetDelays(Guid taskId)
    {
        var delays = await _db.TaskDelays
            .Include(d => d.LoggedBy)
            .Where(d => d.TaskId == taskId && !d.IsDeleted)
            .OrderByDescending(d => d.CreatedAt)
            .Select(d => new TaskDelayDto(d.Id, d.TaskId, "", d.DelayType,
                d.DelayHours, d.Description, d.LoggedBy.FullName, d.CreatedAt))
            .ToListAsync();
        return Ok(delays);
    }

    [HttpPost]
    public async Task<IActionResult> LogDelay(Guid taskId, [FromBody] CreateTaskDelayRequest req)
    {
        var delay = new TaskDelay
        {
            TaskId = taskId, DelayType = req.DelayType,
            DelayHours = req.DelayHours, Description = req.Description,
            LoggedById = _cu.UserId
        };
        _db.TaskDelays.Add(delay);

        // Update task status to indicate delay
        var task = await _db.Tasks.FindAsync(taskId);
        if (task != null && task.Status == "InProgress")
            task.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        var user = await _db.Users.FindAsync(_cu.UserId);
        var task2 = await _db.Tasks.FindAsync(taskId);
        return Ok(new TaskDelayDto(delay.Id, taskId, task2?.Name ?? "",
            delay.DelayType, delay.DelayHours, delay.Description,
            user?.FullName ?? "", delay.CreatedAt));
    }
}

// ─── Task Comments ───────────────────────────────────────────────

[ApiController, Route("api/tasks/{taskId:guid}/comments"), Authorize]
public class TaskCommentsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _cu;
    public TaskCommentsController(AppDbContext db, ICurrentUserService cu) { _db = db; _cu = cu; }

    [HttpGet]
    public async Task<IActionResult> GetComments(Guid taskId)
    {
        var comments = await _db.TaskComments
            .Include(c => c.User)
            .Include(c => c.Replies).ThenInclude(r => r.User)
            .Where(c => c.TaskId == taskId && c.ParentCommentId == null && !c.IsDeleted)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();

        return Ok(comments.Select(c => MapComment(c)));
    }

    [HttpPost]
    public async Task<IActionResult> AddComment(Guid taskId, [FromBody] CreateCommentRequest req)
    {
        var comment = new TaskComment
        {
            TaskId = taskId, UserId = _cu.UserId,
            Content = req.Content, ParentCommentId = req.ParentCommentId
        };
        _db.TaskComments.Add(comment);
        await _db.SaveChangesAsync();
        var user = await _db.Users.FindAsync(_cu.UserId);
        return Ok(new TaskCommentDto(comment.Id, taskId, _cu.UserId,
            user?.FullName ?? "", null, comment.Content,
            comment.ParentCommentId, comment.CreatedAt, comment.UpdatedAt, null));
    }

    [HttpDelete("{commentId:guid}")]
    public async Task<IActionResult> Delete(Guid taskId, Guid commentId)
    {
        var c = await _db.TaskComments.FirstOrDefaultAsync(
            x => x.Id == commentId && x.UserId == _cu.UserId);
        if (c == null) return NotFound();
        c.IsDeleted = true; c.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static TaskCommentDto MapComment(TaskComment c) => new(
        c.Id, c.TaskId, c.UserId, c.User?.FullName ?? "", null,
        c.Content, c.ParentCommentId, c.CreatedAt, c.UpdatedAt,
        c.Replies?.Where(r => !r.IsDeleted).Select(r => MapComment(r)).ToList());
}

// ─── Notifications ───────────────────────────────────────────────

[ApiController, Route("api/notifications"), Authorize]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _cu;
    private readonly INotificationService _notif;
    public NotificationsController(AppDbContext db, ICurrentUserService cu, INotificationService notif)
    { _db = db; _cu = cu; _notif = notif; }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool unreadOnly = false, [FromQuery] int take = 20)
    {
        var q = _db.Notifications.Where(n => n.UserId == _cu.UserId && !n.IsDeleted);
        if (unreadOnly) q = q.Where(n => !n.IsRead);
        var items = await q.OrderByDescending(n => n.CreatedAt).Take(take)
            .Select(n => new NotificationDto(n.Id, n.Title, n.Message, n.Type,
                n.Module, n.EntityId, n.ActionUrl, n.IsRead, n.ReadAt, n.CreatedAt))
            .ToListAsync();
        return Ok(items);
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> UnreadCount()
    {
        var count = await _db.Notifications.CountAsync(n => n.UserId == _cu.UserId && !n.IsRead && !n.IsDeleted);
        return Ok(new UnreadCountDto(count));
    }

    [HttpPatch("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id)
    {
        await _notif.MarkAsReadAsync(id, _cu.UserId);
        return NoContent();
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        await _notif.MarkAllAsReadAsync(_cu.UserId);
        return NoContent();
    }
}

// ─── Enhanced Dashboard ───────────────────────────────────────────

[ApiController, Route("api/dashboard/stats"), Authorize]
public class DashboardStatsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _cu;
    public DashboardStatsController(AppDbContext db, ICurrentUserService cu) { _db = db; _cu = cu; }

    [HttpGet]
    public async Task<IActionResult> GetStats()
    {
        var isAdmin = await _db.UserRoles.AnyAsync(ur => ur.UserId == _cu.UserId &&
            (ur.Role.Name == "Admin" || ur.Role.Name == "Management"));

        var projectsQ = _db.Projects.Where(p => !p.IsDeleted);
        if (!isAdmin) projectsQ = projectsQ.Where(p =>
            p.Members.Any(m => m.UserId == _cu.UserId && m.IsActive) ||
            p.ProjectManagerId == _cu.UserId);

        var projects = await projectsQ.ToListAsync();
        var projectIds = projects.Select(p => p.Id).ToList();

        var tasks = await _db.Tasks.Where(t => projectIds.Contains(t.ProjectId) && !t.IsDeleted).ToListAsync();
        var risks = await _db.Risks.Where(r => projectIds.Contains(r.ProjectId) && !r.IsDeleted).ToListAsync();
        var mrs = await _db.MaterialRequests.Where(m => projectIds.Contains(m.ProjectId) && !m.IsDeleted).ToListAsync();
        var budgets = await _db.Expenditures.Where(e => projectIds.Contains(e.ProjectId) && !e.IsDeleted).ToListAsync();
        var wbs = await _db.BudgetWBSItems.Where(w => projectIds.Contains(w.ProjectId) && !w.IsDeleted).ToListAsync();

        var today = DateTime.UtcNow.Date;
        var delayedTasks = tasks.Where(t => t.EndDate.HasValue && t.EndDate.Value.Date < today && t.Status != "Completed").Count();

        var totalBudget = wbs.Where(w => w.ParentId == null).Sum(w => w.BudgetAmount);
        var totalExpended = budgets.Sum(e => e.Amount);
        var burnRate = totalBudget > 0 ? Math.Round(totalExpended / totalBudget * 100, 1) : 0;

        // Monthly progress last 6 months
        var monthly = new List<MonthlyDataPoint>();
        for (int i = 5; i >= 0; i--)
        {
            var month = DateTime.UtcNow.AddMonths(-i);
            var label = month.ToString("MMM");
            monthly.Add(new MonthlyDataPoint(label,
                tasks.Count(t => t.Status == "Completed" && t.UpdatedAt.Month == month.Month && t.UpdatedAt.Year == month.Year),
                tasks.Count(t => t.CreatedAt.Month == month.Month && t.CreatedAt.Year == month.Year),
                tasks.Count(t => t.EndDate.HasValue && t.EndDate.Value.Month == month.Month && t.Status != "Completed")));
        }

        var stats = new DashboardStatsDto(
            projects.Count, projects.Count(p => p.Status == "Active"),
            projects.Count(p => p.Status == "Completed"), projects.Count(p => p.Status == "OnHold"),
            tasks.Count, tasks.Count(t => t.Status == "Completed"),
            tasks.Count(t => t.Status == "InProgress"), delayedTasks,
            risks.Count(r => r.Status != "Closed"), risks.Count(r => r.RiskLevel == "Critical"),
            risks.Count(r => r.RiskLevel == "High"),
            mrs.Count(m => m.Status == "Draft" || m.Status == "Submitted"),
            0, totalBudget, totalExpended, burnRate,
            new[] { "Planning","Active","OnHold","Completed","Cancelled" }
                .Select(s => new ChartDataPoint(s, projects.Count(p => p.Status == s), null)).ToList(),
            new[] { "NotStarted","InProgress","Completed","OnHold","Cancelled" }
                .Select(s => new ChartDataPoint(s, tasks.Count(t => t.Status == s), null)).ToList(),
            new[] { "Low","Medium","High","Critical" }
                .Select(s => new ChartDataPoint(s, risks.Count(r => r.RiskLevel == s && r.Status != "Closed"), null)).ToList(),
            monthly,
            new List<RecentActivityDto>()
        );

        return Ok(stats);
    }
}

// ─── Task Dependencies ──────────────────────────────────────────

[ApiController, Route("api/tasks/{taskId:guid}/dependencies"), Authorize]
public class TaskDependenciesController : ControllerBase
{
    private readonly AppDbContext _db;
    public TaskDependenciesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> Get(Guid taskId)
    {
        var deps = await _db.TaskDependencies
            .Include(d => d.Task).Include(d => d.Predecessor)
            .Where(d => d.TaskId == taskId && !d.IsDeleted)
            .Select(d => new TaskDependencyDto(
                d.Id, d.TaskId, d.Task.Name,
                d.PredecessorId, d.Predecessor.Name,
                d.DependencyType, d.LagDays))
            .ToListAsync();
        return Ok(deps);
    }

    [HttpPost]
    public async Task<IActionResult> Add(Guid taskId, [FromBody] CreateDependencyRequest req)
    {
        // Circular dependency check
        if (req.PredecessorId == taskId)
            return BadRequest(new { message = "A task cannot depend on itself" });

        // Check for circular: if taskId is already a predecessor of req.PredecessorId
        if (await HasCircularDependency(_db, taskId, req.PredecessorId))
            return BadRequest(new { message = "This would create a circular dependency" });

        var exists = await _db.TaskDependencies.AnyAsync(d =>
            d.TaskId == taskId && d.PredecessorId == req.PredecessorId && !d.IsDeleted);
        if (exists)
            return BadRequest(new { message = "Dependency already exists" });

        var dep = new TaskDependency
        {
            TaskId = taskId, PredecessorId = req.PredecessorId,
            DependencyType = req.DependencyType, LagDays = req.LagDays,
        };
        _db.TaskDependencies.Add(dep);
        await _db.SaveChangesAsync();

        var t = await _db.Tasks.FindAsync(taskId);
        var p = await _db.Tasks.FindAsync(req.PredecessorId);
        return Ok(new TaskDependencyDto(dep.Id, taskId, t?.Name ?? "",
            req.PredecessorId, p?.Name ?? "", dep.DependencyType, dep.LagDays));
    }

    [HttpDelete("{depId:guid}")]
    public async Task<IActionResult> Remove(Guid taskId, Guid depId)
    {
        var dep = await _db.TaskDependencies.FirstOrDefaultAsync(
            d => d.Id == depId && d.TaskId == taskId);
        if (dep == null) return NotFound();
        dep.IsDeleted = true; dep.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static async Task<bool> HasCircularDependency(
        AppDbContext db, Guid taskId, Guid predecessorId)
    {
        // BFS: check if taskId is reachable from predecessorId
        var visited = new HashSet<Guid>();
        var queue = new Queue<Guid>();
        queue.Enqueue(taskId);

        while (queue.Count > 0)
        {
            var current = queue.Dequeue();
            if (current == predecessorId) return true;
            if (visited.Contains(current)) continue;
            visited.Add(current);

            var successors = await db.TaskDependencies
                .Where(d => d.PredecessorId == current && !d.IsDeleted)
                .Select(d => d.TaskId).ToListAsync();

            foreach (var s in successors) queue.Enqueue(s);
        }
        return false;
    }
}

// ─── Gantt Data ──────────────────────────────────────────────────

[ApiController, Route("api/projects/{projectId:guid}/gantt"), Authorize]
public class GanttController : ControllerBase
{
    private readonly AppDbContext _db;
    public GanttController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetGanttData(Guid projectId)
    {
        var tasks = await _db.Tasks
            .Include(t => t.Assignee)
            .Where(t => t.ProjectId == projectId && !t.IsDeleted)
            .OrderBy(t => t.Level).ThenBy(t => t.SortOrder).ThenBy(t => t.WbsCode)
            .ToListAsync();

        var deps = await _db.TaskDependencies
            .Where(d => tasks.Select(t => t.Id).Contains(d.TaskId) && !d.IsDeleted)
            .ToListAsync();

        // Simple critical path: tasks with no slack (end date = project end)
        var projectEnd = tasks.Where(t => t.EndDate.HasValue)
            .Select(t => t.EndDate!.Value).DefaultIfEmpty(DateTime.Today.AddMonths(1)).Max();
        var projectStart = tasks.Where(t => t.StartDate.HasValue)
            .Select(t => t.StartDate!.Value).DefaultIfEmpty(DateTime.Today).Min();

        // Identify critical tasks (tasks on the longest path)
        var criticalPath = ComputeCriticalPath(tasks, deps);

        var ganttTasks = tasks.Select(t => new GanttTaskDto(
            t.Id, t.ParentTaskId, t.Name, t.WbsCode,
            t.Level, t.Status, t.Priority,
            t.StartDate, t.EndDate,
            t.ProgressPercentage, t.IsMilestone, t.HasChildren,
            t.Assignee?.FullName, t.SortOrder,
            deps.Where(d => d.TaskId == t.Id)
                .Select(d => new GanttDependencyDto(d.PredecessorId, d.DependencyType, d.LagDays))
                .ToList(),
            criticalPath.Contains(t.Id)
        )).ToList();

        return Ok(new GanttDataDto(ganttTasks, projectStart, projectEnd, criticalPath.ToList()));
    }

    private static HashSet<Guid> ComputeCriticalPath(
        List<ProjectTask> tasks, List<TaskDependency> deps)
    {
        var critical = new HashSet<Guid>();
        // Mark tasks as critical if they have no float (simplistic)
        var projectEnd = tasks.Where(t => t.EndDate.HasValue)
            .Select(t => t.EndDate!.Value).DefaultIfEmpty(DateTime.Today).Max();

        foreach (var t in tasks)
        {
            if (t.EndDate.HasValue && t.EndDate.Value.Date == projectEnd.Date)
                critical.Add(t.Id);
        }
        return critical;
    }
}

// ─── Labour Controller ─────────────────────────────────────────

[ApiController, Route("api/labour"), Authorize]
public class LabourController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _cu;
    private readonly INotificationService _notif;

    public LabourController(AppDbContext db, ICurrentUserService cu, INotificationService notif)
    { _db = db; _cu = cu; _notif = notif; }

    // GET all attendance for a project/date
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? projectId, [FromQuery] string? date,
        [FromQuery] string? approvalStatus, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var q = _db.CrewAttendance
            .Include(a => a.Contractor).Include(a => a.LabourCategory)
            .Include(a => a.RecordedBy).Include(a => a.ApprovedBy)
            .Where(a => !a.IsDeleted);

        if (projectId.HasValue) q = q.Where(a => a.ProjectId == projectId.Value);
        if (!string.IsNullOrEmpty(date) && DateTime.TryParse(date, out var d))
            q = q.Where(a => a.AttendanceDate.Date == d.Date);
        if (!string.IsNullOrEmpty(approvalStatus))
            q = q.Where(a => a.ApprovalStatus == approvalStatus);

        var total = await q.CountAsync();
        var items = await q.OrderByDescending(a => a.AttendanceDate)
            .ThenBy(a => a.TradeName)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(a => MapEntry(a)).ToListAsync();

        return Ok(new PagedResult<LabourEntryDto>(items, total, page, pageSize,
            (int)Math.Ceiling((double)total / pageSize)));
    }

    // GET pending approvals
    [HttpGet("pending-approvals")]
    public async Task<IActionResult> PendingApprovals([FromQuery] Guid? projectId)
    {
        var q = _db.CrewAttendance
            .Include(a => a.RecordedBy).Include(a => a.Contractor)
            .Where(a => a.ApprovalStatus == "Pending" && !a.IsDeleted);
        if (projectId.HasValue) q = q.Where(a => a.ProjectId == projectId.Value);
        var items = await q.OrderBy(a => a.AttendanceDate)
            .Select(a => MapEntry(a)).ToListAsync();
        return Ok(items);
    }

    // POST single entry
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateLabourEntryRequest req)
    {
        var entry = new CrewAttendance
        {
            ProjectId          = req.ProjectId,
            ContractorId       = req.ContractorId.HasValue ? req.ContractorId : null,
            LabourCategoryId   = req.LabourCategoryId.HasValue ? req.LabourCategoryId : null,
            LabourName         = req.LabourName,
            TradeName          = req.TradeName,
            TradeCode          = req.TradeCode,
            AttendanceDate     = req.AttendanceDate.Date,
            Status             = req.Status,
            PlannedCount       = req.PlannedCount,
            ActualCount        = req.ActualCount,
            HoursWorked        = req.HoursWorked,
            DailyRate          = req.DailyRate,
            Notes              = req.Notes,
            RecordedById       = _cu.UserId,
            ApprovalStatus     = "Pending",
        };
        _db.CrewAttendance.Add(entry);
        await _db.SaveChangesAsync();

        // Notify supervisors for approval
        await NotifySupervisors(req.ProjectId, entry.Id);
        return Ok(MapEntry(entry));
    }

    // POST bulk entry (trade-wise table M2-1)
    [HttpPost("bulk")]
    public async Task<IActionResult> BulkCreate([FromBody] BulkLabourEntryRequest req)
    {
        var entries = req.Entries.Select(e => new CrewAttendance
        {
            ProjectId      = req.ProjectId,
            LabourName     = e.TradeName,
            TradeName      = e.TradeName,
            AttendanceDate = req.AttendanceDate.Date,
            Status         = "Present",
            PlannedCount   = e.PlannedCount,
            ActualCount    = e.ActualCount,
            ContractorId   = e.ContractorId.HasValue ? e.ContractorId : null,
            RecordedById   = _cu.UserId,
            ApprovalStatus = "Pending",
        }).ToList();

        _db.CrewAttendance.AddRange(entries);
        await _db.SaveChangesAsync();
        await NotifySupervisors(req.ProjectId, null);
        return Ok(new { count = entries.Count, message = $"{entries.Count} entries recorded" });
    }

    // PATCH approve/reject
    [HttpPatch("{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid id, [FromBody] ApproveLabourRequest req)
    {
        var entry = await _db.CrewAttendance.FindAsync(id)
            ?? throw new KeyNotFoundException("Entry not found");

        entry.ApprovalStatus    = req.Approve ? "Approved" : "Rejected";
        entry.ApprovedById      = _cu.UserId;
        entry.ApprovedAt        = DateTime.UtcNow;
        entry.RejectionRemarks  = req.Approve ? null : req.Remarks;
        entry.UpdatedAt         = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        if (entry.RecordedById.HasValue)
        {
            var msg = req.Approve
                ? $"Your labour entry for {entry.AttendanceDate:dd MMM} has been approved."
                : $"Your labour entry for {entry.AttendanceDate:dd MMM} was rejected: {req.Remarks}";
            await _notif.SendAsync(entry.RecordedById.Value,
                req.Approve ? "Labour Entry Approved" : "Labour Entry Rejected",
                msg, req.Approve ? "Success" : "Warning", "Labour");
        }

        await _db.Entry(entry).Reference(e => e.RecordedBy).LoadAsync();
        await _db.Entry(entry).Reference(e => e.ApprovedBy).LoadAsync();
        return Ok(MapEntry(entry));
    }

    // GET dashboard summary
    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard([FromQuery] Guid? projectId)
    {
        var today = DateTime.Today;
        var weekAgo = today.AddDays(-7);

        var q = _db.CrewAttendance.Where(a => !a.IsDeleted);
        if (projectId.HasValue) q = q.Where(a => a.ProjectId == projectId.Value);

        var todayEntries = await q.Where(a => a.AttendanceDate.Date == today).ToListAsync();
        var weekEntries  = await q.Where(a => a.AttendanceDate.Date >= weekAgo).ToListAsync();
        var pendingCount = await q.CountAsync(a => a.ApprovalStatus == "Pending");

        // Today summary by trade
        var todaySummary = todayEntries
            .Where(a => a.ApprovalStatus != "Rejected")
            .GroupBy(a => a.TradeName ?? "Other")
            .Select(g => new LabourSummaryDto(
                g.Key,
                g.Sum(a => a.PlannedCount ?? 0),
                g.Sum(a => a.ActualCount ?? 0),
                g.Sum(a => (a.ActualCount ?? 0) - (a.PlannedCount ?? 0)),
                g.Sum(a => a.PlannedCount ?? 0) > 0
                    ? Math.Round((decimal)g.Sum(a => a.ActualCount ?? 0) / g.Sum(a => a.PlannedCount ?? 0) * 100, 1)
                    : 0,
                today.ToString("dd MMM")
            )).ToList();

        // Weekly trend
        var weeklyTrend = Enumerable.Range(0, 7).Select(i =>
        {
            var day = today.AddDays(-6 + i);
            var dayEntries = weekEntries.Where(a => a.AttendanceDate.Date == day.Date
                && a.ApprovalStatus != "Rejected").ToList();
            return new LabourChartPoint(
                day.ToString("EEE"),
                dayEntries.Sum(a => a.PlannedCount ?? 0),
                dayEntries.Sum(a => a.ActualCount ?? 0)
            );
        }).ToList();

        // Trade distribution today
        var tradeDistrib = todaySummary
            .Select(s => new LabourChartPoint(s.TradeName, s.TotalPlanned, s.TotalActual))
            .ToList();

        return Ok(new LabourDashboardDto(
            todayEntries.Where(a => a.ApprovalStatus != "Rejected").Sum(a => a.ActualCount ?? 0),
            todayEntries.Sum(a => a.PlannedCount ?? 0),
            pendingCount,
            todaySummary, weeklyTrend, tradeDistrib
        ));
    }

    // GET labour categories
    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var cats = await _db.LabourCategories
            .Where(c => !c.IsDeleted && c.IsActive)
            .OrderBy(c => c.Name)
            .Select(c => new { c.Id, c.Name, c.TradeCode, c.DefaultDailyRate })
            .ToListAsync();
        return Ok(cats);
    }

    private async Task NotifySupervisors(Guid projectId, Guid? entryId)
    {
        var supervisorIds = await _db.ProjectMembers
            .Where(m => m.ProjectId == projectId && m.IsActive &&
                (m.ProjectRole == "ProjectManager" || m.ProjectRole == "LabourManager"))
            .Select(m => m.UserId).Distinct().ToListAsync();

        foreach (var uid in supervisorIds)
            await _notif.SendAsync(uid, "Labour Entry Pending Approval",
                "A new labour attendance entry requires your approval.", "Info", "Labour");
    }

    private static LabourEntryDto MapEntry(CrewAttendance a) => new(
        a.Id, a.ProjectId,
        a.Contractor?.Name, a.TradeName ?? a.LabourCategory?.Name, a.TradeCode,
        a.LabourName, a.AttendanceDate, a.Status,
        a.PlannedCount, a.ActualCount, a.HoursWorked, a.DailyRate, a.Notes,
        a.ApprovalStatus, a.RecordedBy?.FullName, a.ApprovedBy?.FullName,
        a.ApprovedAt, a.RejectionRemarks);
}

// ─── DPR Controller ───────────────────────────────────────────

[ApiController, Route("api/dpr"), Authorize]
public class DprController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _cu;
    private readonly IDprService _dprService;

    public DprController(AppDbContext db, ICurrentUserService cu, IDprService dprService)
    { _db = db; _cu = cu; _dprService = dprService; }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? projectId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var q = _db.DPRReports.Include(d => d.Project)
            .Include(d => d.SubmittedBy).Include(d => d.ApprovedBy)
            .Where(d => !d.IsDeleted);
        if (projectId.HasValue) q = q.Where(d => d.ProjectId == projectId.Value);
        var total = await q.CountAsync();
        var items = await q.OrderByDescending(d => d.ReportDate)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(d => MapDpr(d, null, null, null, null)).ToListAsync();
        return Ok(new PagedResult<DprDto>(items, total, page, pageSize,
            (int)Math.Ceiling((double)total / pageSize)));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var dpr = await _db.DPRReports.Include(d => d.Project)
            .Include(d => d.SubmittedBy).Include(d => d.ApprovedBy)
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);
        if (dpr == null) return NotFound();

        var compiled = await _dprService.CompileDprSectionsAsync(dpr.ProjectId, dpr.ReportDate);
        return Ok(MapDpr(dpr,
            compiled.WorkProgress, compiled.Delays,
            compiled.Labour, compiled.Risks));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDprRequest req)
    {
        // Check if DPR already exists for this date/project
        var existing = await _db.DPRReports.FirstOrDefaultAsync(d =>
            d.ProjectId == req.ProjectId &&
            d.ReportDate.Date == DateTime.Today.Date && !d.IsDeleted);
        if (existing != null)
            return BadRequest(new { message = "A DPR already exists for today" });

        var dpr = new DPRReport
        {
            ProjectId          = req.ProjectId,
            ReportDate         = DateTime.Today,
            LocationOfWork     = req.LocationOfWork,
            WeatherCondition   = req.WeatherCondition,
            WeatherType        = req.WeatherType ?? "Normal",
            WorkCompleted      = req.WorkCompleted,
            PlannedForTomorrow = req.PlannedForTomorrow,
            Issues             = req.Issues,
            SafetyObservations = req.SafetyObservations,
            Status             = "Draft",
            CreatedById        = _cu.UserId,
        };
        _db.DPRReports.Add(dpr);
        await _db.SaveChangesAsync();
        return Ok(MapDpr(dpr, null, null, null, null));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateDprRequest req)
    {
        var dpr = await _db.DPRReports.FindAsync(id) ?? throw new KeyNotFoundException();
        dpr.LocationOfWork     = req.LocationOfWork;
        dpr.WeatherCondition   = req.WeatherCondition;
        dpr.WeatherType        = req.WeatherType;
        dpr.WorkCompleted      = req.WorkCompleted;
        dpr.PlannedForTomorrow = req.PlannedForTomorrow;
        dpr.Issues             = req.Issues;
        dpr.SafetyObservations = req.SafetyObservations;
        dpr.UpdatedAt          = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(MapDpr(dpr, null, null, null, null));
    }

    [HttpPost("{id:guid}/generate")]
    public async Task<IActionResult> Generate(Guid id)
    {
        var dpr = await _db.DPRReports.Include(d => d.Project)
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted)
            ?? throw new KeyNotFoundException();

        var compiled = await _dprService.CompileDprSectionsAsync(dpr.ProjectId, dpr.ReportDate);

        // Update counts from compiled data
        dpr.LabourCount    = compiled.Labour?.Sum(l => l.Actual) ?? 0;
        dpr.Status         = "Submitted";
        dpr.SubmittedById  = _cu.UserId;
        dpr.SubmittedAt    = DateTime.UtcNow;
        dpr.UpdatedAt      = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(MapDpr(dpr, compiled.WorkProgress, compiled.Delays, compiled.Labour, compiled.Risks));
    }

    [HttpPatch("{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid id, [FromBody] ApproveDprRequest req)
    {
        var dpr = await _db.DPRReports.FindAsync(id) ?? throw new KeyNotFoundException();
        dpr.Status          = req.Approve ? "Approved" : "Rejected";
        dpr.ApprovedById    = _cu.UserId;
        dpr.ApprovedAt      = DateTime.UtcNow;
        dpr.RejectionReason = req.Approve ? null : req.Reason;
        dpr.UpdatedAt       = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(MapDpr(dpr, null, null, null, null));
    }

    [HttpGet("{id:guid}/export")]
    public async Task<IActionResult> ExportHtml(Guid id)
    {
        var dpr = await _db.DPRReports.Include(d => d.Project)
            .Include(d => d.SubmittedBy)
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted)
            ?? throw new KeyNotFoundException();

        var compiled = await _dprService.CompileDprSectionsAsync(dpr.ProjectId, dpr.ReportDate);
        var html = _dprService.GenerateDprHtml(dpr, compiled);
        return Content(html, "text/html");
    }

    private static DprDto MapDpr(DPRReport d,
        List<DprTaskSection>? work, List<DprDelaySection>? delays,
        List<DprLabourSection>? labour, List<DprRiskSection>? risks) => new(
        d.Id, d.ProjectId, d.Project?.Name ?? "",
        d.ReportDate, d.WorkCompleted, d.PlannedForTomorrow,
        d.Issues, d.SafetyObservations, d.LocationOfWork,
        d.WeatherCondition, d.WeatherType,
        d.LabourCount, d.EquipmentCount, d.Status, d.IsAutoGenerated,
        d.SubmittedBy?.FullName, d.SubmittedAt,
        d.ApprovedBy?.FullName, d.ApprovedAt,
        d.RejectionReason, d.PdfPath,
        work, delays, labour, risks);
}

