using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MMG.EPM.API.Domain.DTOs;
using MMG.EPM.API.Infrastructure.Services;

namespace MMG.EPM.API.Controllers;

[ApiController, Route("api/projects"), Authorize]
public class ProjectsController : ControllerBase
{
    private readonly IProjectService     _projects;
    private readonly ICurrentUserService _cu;
    private readonly IReportService      _reports;

    public ProjectsController(IProjectService projects, ICurrentUserService cu, IReportService reports)
    { _projects = projects; _cu = cu; _reports = reports; }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search, [FromQuery] string? status,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 12)
        => Ok(await _projects.GetProjectsAsync(search, status, _cu.UserId, page, pageSize));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var p = await _projects.GetByIdAsync(id, _cu.UserId);
        return p == null ? NotFound() : Ok(p);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProjectRequest req)
        => Ok(await _projects.CreateAsync(req, _cu.UserId));

    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateProjectStatusRequest req)
        => Ok(await _projects.UpdateStatusAsync(id, req.Status, _cu.UserId));

    [HttpGet("{id:guid}/tasks")]
    public async Task<IActionResult> GetTasks(Guid id)
        => Ok(await _projects.GetTasksAsync(id));

    [HttpGet("{id:guid}/dprs")]
    public async Task<IActionResult> GetDPRs(Guid id)
        => Ok(await _projects.GetDPRsAsync(id));

    [HttpGet("{id:guid}/attendance")]
    public async Task<IActionResult> GetAttendance(Guid id, [FromQuery] string? date)
        => Ok(await _projects.GetAttendanceAsync(id, date));

    [HttpPost("{id:guid}/members")]
    public async Task<IActionResult> AddMember(Guid id, [FromBody] AddProjectMemberRequest req)
        => Ok(await _projects.AddMemberAsync(id, req, _cu.UserId));

    [HttpDelete("{id:guid}/members/{userId:guid}")]
    public async Task<IActionResult> RemoveMember(Guid id, Guid userId)
    {
        await _projects.RemoveMemberAsync(id, userId, _cu.UserId);
        return NoContent();
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export()
    {
        var bytes = await _reports.ExportProjectsToExcelAsync(_cu.UserId);
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "projects.xlsx");
    }
}
