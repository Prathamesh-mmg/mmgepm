using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MMG.EPM.API.Data;
using MMG.EPM.API.Domain.Entities;
using MMG.EPM.API.Infrastructure.Services;

namespace MMG.EPM.API.Controllers;

// ─── MPP Import ────────────────────────────────────────────────────────────────
// Accepts a Microsoft Project (.mpp) file and imports tasks, resources, and
// resource assignments into the EPM database.

[ApiController, Route("api/mpp"), Authorize]
public class MppImportController : ControllerBase
{
    private readonly AppDbContext        _db;
    private readonly ICurrentUserService _cu;
    private readonly ILogger<MppImportController> _log;

    public MppImportController(AppDbContext db, ICurrentUserService cu, ILogger<MppImportController> log)
    { _db = db; _cu = cu; _log = log; }

    // ── List past imports ──────────────────────────────────────────────────────

    [HttpGet("projects/{projectId:guid}/imports")]
    public async Task<IActionResult> GetImports(Guid projectId)
    {
        var logs = await _db.MppImportLogs
            .Where(l => l.ProjectId == projectId)
            .OrderByDescending(l => l.CreatedAt)
            .Select(l => new
            {
                l.Id, l.FileName, l.FileSize,
                l.TasksImported, l.ResourcesImported, l.AssignmentsImported,
                l.Status, l.ErrorMessage, l.ImportMode,
                ImportedBy = l.ImportedBy == null ? null : $"{l.ImportedBy.FirstName} {l.ImportedBy.LastName}",
                l.CreatedAt
            })
            .ToListAsync();
        return Ok(logs);
    }

    // ── Import MPP ─────────────────────────────────────────────────────────────

    [HttpPost("projects/{projectId:guid}/import")]
    [RequestSizeLimit(50 * 1024 * 1024)] // 50 MB
    public async Task<IActionResult> Import(
        Guid projectId,
        IFormFile file,
        [FromQuery] string mode = "replace")   // replace | append
    {
        // Validate project
        var project = await _db.Projects.FindAsync(projectId);
        if (project == null || project.IsDeleted)
            return NotFound(new { message = "Project not found." });

        // Validate file
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file uploaded." });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext != ".mpp" && ext != ".xml" && ext != ".mspdi")
            return BadRequest(new { message = "Only .mpp, .xml, or .mspdi files are supported." });

        // Save to temp file (MPXJ requires a real file path)
        var tempPath = Path.Combine(Path.GetTempPath(), $"mpp_{Guid.NewGuid()}{ext}");
        net.sf.mpxj.ProjectFile? mpxjProject = null;

        var importLog = new MppImportLog
        {
            ProjectId    = projectId,
            FileName     = file.FileName,
            FileSize     = file.Length,
            ImportMode   = mode,
            ImportedById = _cu.UserId,
            Status       = "Processing"
        };
        _db.MppImportLogs.Add(importLog);
        await _db.SaveChangesAsync();

        try
        {
            // Write to temp file
            await using (var fs = System.IO.File.Create(tempPath))
                await file.CopyToAsync(fs);

            // Parse with MPXJ
            var reader = new net.sf.mpxj.reader.UniversalProjectReader();
            mpxjProject = reader.read(tempPath);

            if (mpxjProject == null)
                return BadRequest(new { message = "Could not parse the project file. Please ensure it is a valid MS Project file." });

            // ── Replace mode: remove existing tasks & allocations ────────────
            if (mode == "replace")
            {
                var taskIds = await _db.Tasks
                    .Where(t => t.ProjectId == projectId)
                    .Select(t => t.Id)
                    .ToListAsync();

                if (taskIds.Count > 0)
                {
                    await _db.TaskResourceAllocations
                        .Where(a => taskIds.Contains(a.TaskId))
                        .ExecuteDeleteAsync();
                    await _db.TaskDependencies
                        .Where(d => taskIds.Contains(d.TaskId) || taskIds.Contains(d.PredecessorId))
                        .ExecuteDeleteAsync();
                    await _db.Tasks
                        .Where(t => t.ProjectId == projectId)
                        .ExecuteDeleteAsync();
                }
            }

            // ── Import Tasks ─────────────────────────────────────────────────
            // Map from MPXJ unique ID → new DB Guid
            var taskIdMap  = new Dictionary<int, Guid>();
            int tasksImported = 0;

            // Collect tasks from MPXJ (Java List - iterate via index)
            var mpxjTaskList = mpxjProject.getTasks();
            var mpxjTasks = new List<net.sf.mpxj.Task>();
            for (int i = 0; i < mpxjTaskList.size(); i++)
            {
                var t = (net.sf.mpxj.Task)mpxjTaskList.get(i);
                var uid  = t.getUniqueID()?.intValue();
                if (uid == null || uid == 0) continue;   // skip project summary task (id=0)
                var name = t.getName();
                if (string.IsNullOrWhiteSpace(name)) continue;
                mpxjTasks.Add(t);
            }

            // Insert tasks in document order (parents come before children in MPP)
            foreach (var mpxjTask in mpxjTasks)
            {
                var uid     = mpxjTask.getUniqueID()!.intValue();
                var name    = mpxjTask.getName() ?? "(Unnamed)";
                var wbs     = mpxjTask.getWBS() ?? "";
                var level   = mpxjTask.getOutlineLevel()?.intValue() ?? 1;
                var pct     = mpxjTask.getPercentageComplete()?.doubleValue() ?? 0.0;
                var isMile  = mpxjTask.getMilestone();   // bool in IKVM bridge

                // Resolve parent
                Guid? parentDbId = null;
                var parentMpxj = mpxjTask.getParentTask();
                if (parentMpxj != null)
                {
                    var parentUid = parentMpxj.getUniqueID()?.intValue();
                    if (parentUid != null && parentUid != 0 && taskIdMap.ContainsKey(parentUid.Value))
                        parentDbId = taskIdMap[parentUid.Value];
                }

                string status = pct >= 100 ? "Completed"
                              : pct > 0    ? "InProgress"
                              : "NotStarted";

                var dbTask = new ProjectTask
                {
                    ProjectId           = projectId,
                    ParentTaskId        = parentDbId,
                    Name                = name.Length > 500 ? name[..500] : name,
                    WbsCode             = wbs.Length > 20   ? wbs[..20]   : wbs,
                    Level               = Math.Clamp(level, 1, 7),
                    ProgressPercentage  = (decimal)Math.Clamp(pct, 0, 100),
                    Status              = status,
                    Priority            = "Medium",
                    IsMilestone         = isMile,
                    StartDate           = ToLocalDateTime(mpxjTask.getStart()),
                    EndDate             = ToLocalDateTime(mpxjTask.getFinish()),
                    BaselineStartDate   = ToLocalDateTime(mpxjTask.getBaselineStart()),
                    BaselineEndDate     = ToLocalDateTime(mpxjTask.getBaselineFinish()),
                    ActualStartDate     = ToLocalDateTime(mpxjTask.getActualStart()),
                    ActualEndDate       = ToLocalDateTime(mpxjTask.getActualFinish()),
                    EstimatedHours      = ToDurationHours(mpxjTask.getDuration(), mpxjProject),
                    ActualHours         = ToDurationHours(mpxjTask.getActualDuration(), mpxjProject),
                    HasChildren         = false,
                    SortOrder           = mpxjTask.getID()?.intValue() ?? 0,
                    CreatedById         = _cu.UserId,
                    UpdatedById         = _cu.UserId
                };

                _db.Tasks.Add(dbTask);
                taskIdMap[uid] = dbTask.Id;
                tasksImported++;

                // Mark parent as having children
                if (parentDbId.HasValue)
                {
                    var parentEntity = await _db.Tasks.FindAsync(parentDbId.Value);
                    if (parentEntity != null) parentEntity.HasChildren = true;
                }
            }
            await _db.SaveChangesAsync();

            // ── Import Dependencies ───────────────────────────────────────────
            foreach (var mpxjTask in mpxjTasks)
            {
                var uid = mpxjTask.getUniqueID()!.intValue();
                if (!taskIdMap.ContainsKey(uid)) continue;
                var taskDbId = taskIdMap[uid];

                var predecessors = mpxjTask.getPredecessors();
                if (predecessors == null) continue;

                for (int pi = 0; pi < predecessors.size(); pi++)
                {
                    var rel = (net.sf.mpxj.Relation)predecessors.get(pi);
                    var predTask = rel.getPredecessorTask();
                    if (predTask == null) continue;
                    var predUid = predTask.getUniqueID()?.intValue();
                    if (predUid == null || !taskIdMap.ContainsKey(predUid.Value)) continue;
                    var predDbId = taskIdMap[predUid.Value];

                    var alreadyExists = await _db.TaskDependencies
                        .AnyAsync(d => d.TaskId == taskDbId && d.PredecessorId == predDbId);
                    if (alreadyExists) continue;

                    var depTypeObj = rel.getType();
                    var depType = depTypeObj?.toString() ?? "FS";

                    double lagDays = 0;
                    try
                    {
                        var lag = rel.getLag();
                        if (lag != null)
                        {
                            var converted = lag.convertUnits(net.sf.mpxj.TimeUnit.DAYS, mpxjProject.getProjectProperties());
                            lagDays = converted?.getDuration() ?? 0.0;
                        }
                    }
                    catch { /* ignore lag conversion errors */ }

                    var dep = new TaskDependency
                    {
                        TaskId         = taskDbId,
                        PredecessorId  = predDbId,
                        DependencyType = depType.Length > 20 ? depType[..20] : depType,
                        LagDays        = (int)Math.Round(lagDays),
                        CreatedById    = _cu.UserId,
                        UpdatedById    = _cu.UserId
                    };
                    _db.TaskDependencies.Add(dep);
                }
            }
            await _db.SaveChangesAsync();

            // ── Import Resources ─────────────────────────────────────────────
            var resourceIdMap = new Dictionary<int, Guid>();
            int resourcesImported = 0;

            var mpxjResList = mpxjProject.getResources();
            for (int ri = 0; ri < mpxjResList.size(); ri++)
            {
                var mpxjRes = (net.sf.mpxj.Resource)mpxjResList.get(ri);
                if (mpxjRes.getID() == null) continue;
                var resName = mpxjRes.getName();
                if (string.IsNullOrWhiteSpace(resName)) continue;

                var resUid   = mpxjRes.getUniqueID()?.intValue() ?? 0;
                var resType  = mpxjRes.getType()?.toString() ?? "WORK";
                bool isMat   = resType == "MATERIAL";

                if (isMat)
                {
                    // Import as Inventory Material
                    var mat = new Material
                    {
                        Name        = resName.Length > 300 ? resName[..300] : resName,
                        MaterialCode = $"MPP-{resUid}",
                        Unit         = "Nos",
                        CurrentStock = 0,
                        IsActive     = true,
                        CreatedById  = _cu.UserId,
                        UpdatedById  = _cu.UserId
                    };
                    _db.Materials.Add(mat);
                    // Note: material not added to resourceIdMap (can't be allocated as a work resource)
                }
                else
                {
                    // Import as work Resource
                    double? stdRate = null;
                    try { stdRate = mpxjRes.getStandardRate()?.getAmount(); } catch { }

                    var dbRes = new Resource
                    {
                        Name        = resName.Length > 300 ? resName[..300] : resName,
                        Code        = $"MPP-{resUid}",
                        Status      = "Available",
                        Currency    = "USD",
                        CostPerHour = ToDecimal(stdRate),
                        CreatedById = _cu.UserId,
                        UpdatedById = _cu.UserId
                    };
                    _db.Resources.Add(dbRes);
                    resourceIdMap[resUid] = dbRes.Id;
                }
                resourcesImported++;
            }
            await _db.SaveChangesAsync();

            // ── Import Resource Assignments ───────────────────────────────────
            int assignmentsImported = 0;
            var asgnList = mpxjProject.getResourceAssignments();
            for (int ai = 0; ai < asgnList.size(); ai++)
            {
                var asgn   = (net.sf.mpxj.ResourceAssignment)asgnList.get(ai);
                var taskUid = asgn.getTaskUniqueID()?.intValue();
                var resUid  = asgn.getResourceUniqueID()?.intValue();
                if (taskUid == null || resUid == null) continue;
                if (!taskIdMap.ContainsKey(taskUid.Value)) continue;
                if (!resourceIdMap.ContainsKey(resUid.Value)) continue;

                var taskDbId = taskIdMap[taskUid.Value];
                var resDbId  = resourceIdMap[resUid.Value];

                var mpxjTaskRef = mpxjTasks.FirstOrDefault(t => t.getUniqueID()?.intValue() == taskUid.Value);
                var start  = (mpxjTaskRef != null ? ToLocalDateTime(mpxjTaskRef.getStart())  : null) ?? DateTime.UtcNow;
                var finish = (mpxjTaskRef != null ? ToLocalDateTime(mpxjTaskRef.getFinish()) : null) ?? start.AddDays(1);

                var alloc = new TaskResourceAllocation
                {
                    TaskId       = taskDbId,
                    ResourceId   = resDbId,
                    StartDate    = start,
                    EndDate      = finish,
                    PlannedHours = ToDurationHours(asgn.getWork(), mpxjProject),
                    Status       = "Planned",
                    CreatedById  = _cu.UserId,
                    UpdatedById  = _cu.UserId
                };
                _db.TaskResourceAllocations.Add(alloc);
                assignmentsImported++;
            }
            await _db.SaveChangesAsync();

            // ── Update import log ─────────────────────────────────────────────
            importLog.TasksImported        = tasksImported;
            importLog.ResourcesImported    = resourcesImported;
            importLog.AssignmentsImported  = assignmentsImported;
            importLog.Status               = "Completed";
            await _db.SaveChangesAsync();

            _log.LogInformation("MPP Import complete for project {ProjectId}: {Tasks} tasks, {Resources} resources, {Assignments} assignments",
                projectId, tasksImported, resourcesImported, assignmentsImported);

            return Ok(new
            {
                importId           = importLog.Id,
                tasksImported,
                resourcesImported,
                assignmentsImported,
                message = $"Successfully imported {tasksImported} tasks, {resourcesImported} resources, and {assignmentsImported} assignments."
            });
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "MPP Import failed for project {ProjectId}", projectId);
            importLog.Status       = "Failed";
            importLog.ErrorMessage = ex.Message.Length > 1000 ? ex.Message[..1000] : ex.Message;
            await _db.SaveChangesAsync();
            return StatusCode(500, new { message = "Failed to process the MPP file.", detail = ex.Message });
        }
        finally
        {
            if (System.IO.File.Exists(tempPath))
                System.IO.File.Delete(tempPath);
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    // MPXJ v13+ returns java.time.LocalDateTime for date fields
    private static DateTime? ToLocalDateTime(java.time.LocalDateTime? d)
    {
        if (d == null) return null;
        try
        {
            return new DateTime(d.getYear(), d.getMonthValue(), d.getDayOfMonth(),
                d.getHour(), d.getMinute(), d.getSecond(), DateTimeKind.Utc);
        }
        catch { return null; }
    }

    private static decimal? ToDurationHours(net.sf.mpxj.Duration? duration, net.sf.mpxj.ProjectFile project)
    {
        if (duration == null) return null;
        try
        {
            var converted = duration.convertUnits(net.sf.mpxj.TimeUnit.HOURS, project.getProjectProperties());
            var hours = converted?.getDuration() ?? 0.0;
            return hours <= 0 ? null : (decimal)hours;
        }
        catch { return null; }
    }

    private static decimal? ToDecimal(double? value)
    {
        if (value == null || double.IsNaN(value.Value) || double.IsInfinity(value.Value)) return null;
        return (decimal)value.Value;
    }
}
