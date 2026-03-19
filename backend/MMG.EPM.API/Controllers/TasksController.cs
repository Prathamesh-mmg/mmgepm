using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MMG.EPM.API.Domain.DTOs;
using MMG.EPM.API.Infrastructure.Services;

namespace MMG.EPM.API.Controllers;

[ApiController, Route("api/tasks"), Authorize]
public class TasksController : ControllerBase
{
    private readonly ITaskService        _tasks;
    private readonly ICurrentUserService _cu;
    private readonly IReportService      _reports;

    public TasksController(ITaskService tasks, ICurrentUserService cu, IReportService reports)
    { _tasks = tasks; _cu = cu; _reports = reports; }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? projectId, [FromQuery] string? status,
        [FromQuery] string? search, [FromQuery] Guid? parentId)
        => Ok(await _tasks.GetTasksAsync(projectId, status, search, parentId));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var t = await _tasks.GetByIdAsync(id);
        return t == null ? NotFound() : Ok(t);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTaskRequest req)
        => Ok(await _tasks.CreateAsync(req, _cu.UserId));

    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateTaskStatusRequest req)
        => Ok(await _tasks.UpdateStatusAsync(id, req.Status, _cu.UserId));

    [HttpGet("{id:guid}/progress")]
    public async Task<IActionResult> GetProgress(Guid id)
        => Ok(await _tasks.GetProgressAsync(id));

    [HttpPost("{id:guid}/progress")]
    public async Task<IActionResult> AddProgress(Guid id, [FromForm] AddWorkProgressRequest req, [FromForm] List<IFormFile>? photos)
        => Ok(await _tasks.AddProgressAsync(id, req, photos ?? new(), _cu.UserId));

    [HttpGet("{id:guid}/subtasks")]
    public async Task<IActionResult> GetSubtasks(Guid id)
        => Ok(await _tasks.GetSubtasksAsync(id));

    [HttpGet("{id:guid}/attachments")]
    public async Task<IActionResult> GetAttachments(Guid id)
        => Ok(await _tasks.GetAttachmentsAsync(id));

    [HttpPost("{id:guid}/attachments")]
    public async Task<IActionResult> UploadAttachment(Guid id, IFormFile file)
        => Ok(await _tasks.UploadAttachmentAsync(id, file, _cu.UserId));

    [HttpPost("import")]
    public async Task<IActionResult> ImportFromExcel([FromForm] Guid projectId, IFormFile file)
    {
        var count = await _tasks.ImportFromExcelAsync(projectId, file, _cu.UserId);
        return Ok(new { Imported = count });
    }

    [HttpGet("export")]
    public async Task<IActionResult> ExportToExcel([FromQuery] Guid projectId)
    {
        var bytes = await _reports.ExportTasksToExcelAsync(projectId);
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "tasks.xlsx");
    }
}
