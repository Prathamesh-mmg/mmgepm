using ClosedXML.Excel;
using MMG.EPM.API.Data;
using MMG.EPM.API.Domain.DTOs;
using Microsoft.EntityFrameworkCore;

namespace MMG.EPM.API.Infrastructure.Services;

public interface IReportService
{
    Task<byte[]> ExportProjectsToExcelAsync(Guid? userId = null);
    Task<byte[]> ExportTasksToExcelAsync(Guid projectId);
    Task<byte[]> ExportBudgetToExcelAsync(Guid projectId);
    Task<byte[]> ExportRisksToExcelAsync(Guid? projectId = null);
    Task<byte[]> ExportProcurementToExcelAsync(Guid? projectId = null);
    Task<byte[]> ExportInventoryToExcelAsync(Guid? projectId = null);
}

public class ReportService : IReportService
{
    private readonly AppDbContext _db;

    public ReportService(AppDbContext db) => _db = db;

    public async Task<byte[]> ExportProjectsToExcelAsync(Guid? userId = null)
    {
        var projects = await _db.Projects
            .Include(p => p.ProjectManager)
            .Where(p => !p.IsDeleted)
            .OrderBy(p => p.Name)
            .ToListAsync();

        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Projects");

        // Headers
        string[] headers = { "Code", "Name", "Status", "Country", "Location", "Start Date", "End Date", "Budget (USD)", "Progress %", "Project Manager", "Client" };
        for (int i = 0; i < headers.Length; i++)
        {
            var cell = ws.Cell(1, i + 1);
            cell.Value = headers[i];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.FromArgb(0xFF, 0xD7, 0x00); // Yellow
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        }

        // Data rows
        for (int r = 0; r < projects.Count; r++)
        {
            var p = projects[r];
            var row = r + 2;
            ws.Cell(row, 1).Value  = p.Code;
            ws.Cell(row, 2).Value  = p.Name;
            ws.Cell(row, 3).Value  = p.Status;
            ws.Cell(row, 4).Value  = p.Country ?? "";
            ws.Cell(row, 5).Value  = p.Location ?? "";
            ws.Cell(row, 6).Value  = p.StartDate.ToString("yyyy-MM-dd");
            ws.Cell(row, 7).Value  = p.ExpectedEndDate?.ToString("yyyy-MM-dd") ?? "";
            ws.Cell(row, 8).Value  = (double?)p.Budget ?? 0;
            ws.Cell(row, 9).Value  = (double)p.OverallProgress;
            ws.Cell(row, 10).Value = p.ProjectManager?.FullName ?? "";
            ws.Cell(row, 11).Value = p.ClientName ?? "";
        }

        ws.Columns().AdjustToContents();
        ws.Row(1).Height = 20;

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    public async Task<byte[]> ExportTasksToExcelAsync(Guid projectId)
    {
        var tasks = await _db.Tasks
            .Include(t => t.Assignee)
            .Include(t => t.ParentTask)
            .Where(t => t.ProjectId == projectId && !t.IsDeleted)
            .OrderBy(t => t.WbsCode).ThenBy(t => t.Level)
            .ToListAsync();

        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Tasks");

        string[] headers = { "WBS Code", "Task Name", "Level", "Status", "Priority", "Progress %", "Start Date", "End Date", "Est. Hours", "Actual Hours", "Assignee", "Milestone" };
        for (int i = 0; i < headers.Length; i++)
        {
            var cell = ws.Cell(1, i + 1);
            cell.Value = headers[i];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.FromArgb(0x1A, 0x1A, 0x1A);
            cell.Style.Font.FontColor = XLColor.White;
        }

        for (int r = 0; r < tasks.Count; r++)
        {
            var t = tasks[r];
            var row = r + 2;
            ws.Cell(row, 1).Value  = t.WbsCode ?? "";
            ws.Cell(row, 2).Value  = new string(' ', (t.Level - 1) * 2) + t.Name;
            ws.Cell(row, 3).Value  = t.Level;
            ws.Cell(row, 4).Value  = t.Status;
            ws.Cell(row, 5).Value  = t.Priority;
            ws.Cell(row, 6).Value  = (double)t.ProgressPercentage;
            ws.Cell(row, 7).Value  = t.StartDate?.ToString("yyyy-MM-dd") ?? "";
            ws.Cell(row, 8).Value  = t.EndDate?.ToString("yyyy-MM-dd") ?? "";
            ws.Cell(row, 9).Value  = (double?)t.EstimatedHours ?? 0;
            ws.Cell(row, 10).Value = (double?)t.ActualHours ?? 0;
            ws.Cell(row, 11).Value = t.Assignee?.FullName ?? "";
            ws.Cell(row, 12).Value = t.IsMilestone ? "Yes" : "No";
        }

        ws.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    public async Task<byte[]> ExportBudgetToExcelAsync(Guid projectId)
    {
        var project = await _db.Projects.FindAsync(projectId);
        var wbs = await _db.BudgetWBSItems
            .Where(w => w.ProjectId == projectId && !w.IsDeleted)
            .OrderBy(w => w.Level).ThenBy(w => w.WbsCode)
            .ToListAsync();
        var expenditures = await _db.Expenditures
            .Where(e => e.ProjectId == projectId && !e.IsDeleted)
            .ToListAsync();

        using var wb = new XLWorkbook();

        // WBS sheet
        var ws1 = wb.AddWorksheet("Budget WBS");
        string[] wbsHeaders = { "WBS Code", "Cost Code", "Description", "Level", "Budget Amount", "Revised Amount", "Committed", "Expended", "Balance", "Burn Rate %" };
        for (int i = 0; i < wbsHeaders.Length; i++)
        {
            var cell = ws1.Cell(1, i + 1);
            cell.Value = wbsHeaders[i];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.FromArgb(0xFF, 0xD7, 0x00);
        }
        for (int r = 0; r < wbs.Count; r++)
        {
            var w = wbs[r];
            var row = r + 2;
            ws1.Cell(row, 1).Value  = w.WbsCode ?? "";
            ws1.Cell(row, 2).Value  = w.CostCode ?? "";
            ws1.Cell(row, 3).Value  = new string(' ', (w.Level - 1) * 2) + w.Description;
            ws1.Cell(row, 4).Value  = w.Level;
            ws1.Cell(row, 5).Value  = (double)w.BudgetAmount;
            ws1.Cell(row, 6).Value  = (double?)w.RevisedAmount ?? 0;
            ws1.Cell(row, 7).Value  = (double)w.CommittedAmount;
            ws1.Cell(row, 8).Value  = (double)w.ExpendedAmount;
            ws1.Cell(row, 9).Value  = (double)w.BalanceAmount;
            ws1.Cell(row, 10).Value = (double)w.BurnRate;

            if (w.BurnRate > 90)
                ws1.Cell(row, 10).Style.Fill.BackgroundColor = XLColor.LightSalmon;
            else if (w.BurnRate > 75)
                ws1.Cell(row, 10).Style.Fill.BackgroundColor = XLColor.LightYellow;
        }
        ws1.Columns().AdjustToContents();

        // Expenditures sheet
        var ws2 = wb.AddWorksheet("Expenditures");
        string[] expHeaders = { "Date", "Expense Type", "Reference No", "Vendor", "Description", "Amount", "Currency" };
        for (int i = 0; i < expHeaders.Length; i++)
        {
            ws2.Cell(1, i + 1).Value = expHeaders[i];
            ws2.Cell(1, i + 1).Style.Font.Bold = true;
        }
        for (int r = 0; r < expenditures.Count; r++)
        {
            var e = expenditures[r];
            var row = r + 2;
            ws2.Cell(row, 1).Value = e.ExpenseDate.ToString("yyyy-MM-dd");
            ws2.Cell(row, 2).Value = e.ExpenseType;
            ws2.Cell(row, 3).Value = e.ReferenceNo ?? "";
            ws2.Cell(row, 4).Value = e.VendorName ?? "";
            ws2.Cell(row, 5).Value = e.Description ?? "";
            ws2.Cell(row, 6).Value = (double)e.Amount;
            ws2.Cell(row, 7).Value = e.Currency;
        }
        ws2.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    public async Task<byte[]> ExportRisksToExcelAsync(Guid? projectId = null)
    {
        var q = _db.Risks.Include(r => r.Project).Include(r => r.RaisedBy).Include(r => r.RiskOwner)
            .Where(r => !r.IsDeleted);
        if (projectId.HasValue) q = q.Where(r => r.ProjectId == projectId.Value);
        var risks = await q.OrderByDescending(r => r.RiskScore).ToListAsync();

        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Risk Register");
        string[] headers = { "Risk #", "Title", "Category", "Type", "Probability", "Impact", "Score", "Level", "Status", "Project", "Owner", "Raised By", "Review Date" };
        for (int i = 0; i < headers.Length; i++)
        {
            ws.Cell(1, i + 1).Value = headers[i];
            ws.Cell(1, i + 1).Style.Font.Bold = true;
            ws.Cell(1, i + 1).Style.Fill.BackgroundColor = XLColor.FromArgb(0xFF, 0xD7, 0x00);
        }
        for (int r = 0; r < risks.Count; r++)
        {
            var risk = risks[r];
            var row = r + 2;
            ws.Cell(row, 1).Value  = risk.RiskNumber;
            ws.Cell(row, 2).Value  = risk.Title;
            ws.Cell(row, 3).Value  = risk.Category ?? "";
            ws.Cell(row, 4).Value  = risk.RiskType ?? "";
            ws.Cell(row, 5).Value  = risk.Probability;
            ws.Cell(row, 6).Value  = risk.Impact;
            ws.Cell(row, 7).Value  = risk.RiskScore ?? 0;
            ws.Cell(row, 8).Value  = risk.RiskLevel ?? "";
            ws.Cell(row, 9).Value  = risk.Status;
            ws.Cell(row, 10).Value = risk.Project?.Name ?? "";
            ws.Cell(row, 11).Value = risk.RiskOwner?.FullName ?? "";
            ws.Cell(row, 12).Value = risk.RaisedBy?.FullName ?? "";
            ws.Cell(row, 13).Value = risk.ReviewDate?.ToString("yyyy-MM-dd") ?? "";

            if (risk.RiskLevel == "Critical")
                ws.Row(row).Style.Fill.BackgroundColor = XLColor.LightSalmon;
            else if (risk.RiskLevel == "High")
                ws.Row(row).Style.Fill.BackgroundColor = XLColor.LightYellow;
        }
        ws.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    public async Task<byte[]> ExportProcurementToExcelAsync(Guid? projectId = null)
    {
        var q = _db.MaterialRequests.Include(m => m.Project).Include(m => m.RequestedBy).Include(m => m.Items).Where(m => !m.IsDeleted);
        if (projectId.HasValue) q = q.Where(m => m.ProjectId == projectId.Value);
        var mrs = await q.OrderByDescending(m => m.CreatedAt).ToListAsync();

        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Material Requests");
        string[] headers = { "MR #", "Title", "Project", "Priority", "Status", "Required Date", "Requested By", "Items Count", "Total Est. Cost" };
        for (int i = 0; i < headers.Length; i++)
        {
            ws.Cell(1, i + 1).Value = headers[i];
            ws.Cell(1, i + 1).Style.Font.Bold = true;
        }
        for (int r = 0; r < mrs.Count; r++)
        {
            var m = mrs[r];
            var row = r + 2;
            ws.Cell(row, 1).Value = m.MrNumber;
            ws.Cell(row, 2).Value = m.Title;
            ws.Cell(row, 3).Value = m.Project?.Name ?? "";
            ws.Cell(row, 4).Value = m.Priority;
            ws.Cell(row, 5).Value = m.Status;
            ws.Cell(row, 6).Value = m.RequiredDate?.ToString("yyyy-MM-dd") ?? "";
            ws.Cell(row, 7).Value = m.RequestedBy?.FullName ?? "";
            ws.Cell(row, 8).Value = m.Items?.Count ?? 0;
            ws.Cell(row, 9).Value = (double)(m.Items?.Sum(i => i.EstimatedCost ?? 0) ?? 0);
        }
        ws.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    public async Task<byte[]> ExportInventoryToExcelAsync(Guid? projectId = null)
    {
        var q = _db.StockLedger.Include(s => s.Material).Include(s => s.Project).Include(s => s.RecordedBy).Where(s => !s.IsDeleted);
        if (projectId.HasValue) q = q.Where(s => s.ProjectId == projectId.Value);
        var entries = await q.OrderByDescending(s => s.TransactionDate).ToListAsync();

        using var wb = new XLWorkbook();
        var ws = wb.AddWorksheet("Stock Ledger");
        string[] headers = { "Date", "Material", "Project", "Transaction Type", "Quantity", "Unit Cost", "Balance After", "Notes", "Recorded By" };
        for (int i = 0; i < headers.Length; i++)
        {
            ws.Cell(1, i + 1).Value = headers[i];
            ws.Cell(1, i + 1).Style.Font.Bold = true;
        }
        for (int r = 0; r < entries.Count; r++)
        {
            var e = entries[r];
            var row = r + 2;
            ws.Cell(row, 1).Value = e.TransactionDate.ToString("yyyy-MM-dd");
            ws.Cell(row, 2).Value = e.Material?.Name ?? "";
            ws.Cell(row, 3).Value = e.Project?.Name ?? "";
            ws.Cell(row, 4).Value = e.TransactionType;
            ws.Cell(row, 5).Value = (double)e.Quantity;
            ws.Cell(row, 6).Value = (double?)e.UnitCost ?? 0;
            ws.Cell(row, 7).Value = (double?)e.BalanceAfter ?? 0;
            ws.Cell(row, 8).Value = e.Notes ?? "";
            ws.Cell(row, 9).Value = e.RecordedBy?.FullName ?? "";
        }
        ws.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }
}
