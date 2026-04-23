using Microsoft.EntityFrameworkCore;
using MMG.EPM.API.Data;
using MMG.EPM.API.Domain.DTOs;
using MMG.EPM.API.Domain.Entities;

namespace MMG.EPM.API.Infrastructure.Services;

// ─── Interface declarations ─────────────────────────────────────────────

public interface IRiskService
{
    Task<PagedResult<RiskDto>> GetRisksAsync(Guid? projectId, string? status, string? category, int page, int pageSize);
    Task<RiskDto?> GetByIdAsync(Guid id);
    Task<RiskDto> CreateAsync(CreateRiskRequest request, Guid userId);
    Task<RiskDto> UpdateStatusAsync(Guid id, UpdateRiskStatusRequest request, Guid userId);
    Task<RiskDto> AddUpdateAsync(Guid id, RiskUpdateDto update, Guid userId);
    Task<List<RiskUpdateDto>> GetUpdatesAsync(Guid id);
}

public interface IBudgetService
{
    Task<List<ProjectBudgetDto>> GetProjectBudgetsAsync(Guid projectId);
    Task<ProjectBudgetDto> CreateBudgetAsync(CreateProjectBudgetRequest request, Guid userId);
    Task<List<BudgetWBSDto>> GetWBSItemsAsync(Guid projectId);
    Task<BudgetWBSDto?> GetWBSItemAsync(Guid id);
    Task<List<ExpenditureDto>> GetExpendituresAsync(Guid projectId, Guid? wbsId);
    Task<ExpenditureDto> AddExpenditureAsync(CreateExpenditureRequest request, Guid userId);
    Task RecalculateBudgetAsync(Guid projectId);
}

public interface IProcurementService
{
    Task<PagedResult<MaterialRequestDto>> GetMRsAsync(Guid? projectId, string? status, int page, int pageSize);
    Task<MaterialRequestDto?> GetMRByIdAsync(Guid id);
    Task<MaterialRequestDto> CreateMRAsync(CreateMRRequest request, Guid userId);
    Task<MaterialRequestDto> AdvanceMRAsync(Guid id, string action, Guid userId, string? remark = null);
    Task<List<PurchaseOrderDto>> GetPOsAsync(Guid? projectId);
    Task<List<VendorDto>> GetVendorsAsync();
}

public interface IInventoryService
{
    Task<PagedResult<MaterialDto>> GetMaterialsAsync(string? search, Guid? categoryId, int page, int pageSize);
    Task<List<StockLedgerDto>> GetStockLedgerAsync(Guid? projectId, Guid? materialId);
    Task<List<SiteTransferDto>> GetSiteTransfersAsync(Guid? projectId);
    Task<StockLedgerDto> AddStockEntryAsync(Guid materialId, Guid projectId, string type, decimal qty, decimal? cost, string? notes, Guid userId);
}

public interface IResourceService
{
    Task<PagedResult<ResourceDto>> GetResourcesAsync(string? search, string? status, string? type, int page, int pageSize);
    Task<ResourceDto> CreateResourceAsync(CreateResourceRequest req, Guid userId);
    Task<List<ResourceAllocationDto>> GetAllocationsAsync(Guid? projectId, Guid? resourceId);
    Task<ResourceAllocationDto> AllocateAsync(Guid taskId, Guid resourceId, DateTime start, DateTime end, decimal percent, Guid userId);
}

public interface IDocumentService
{
    Task<List<FolderDto>> GetFoldersAsync(Guid projectId);
    Task<PagedResult<DocumentDto>> GetDocumentsAsync(Guid? projectId, Guid? folderId, string? search, string? type, int page, int pageSize);
    Task<DocumentDto> UploadDocumentAsync(Guid projectId, Guid? folderId, string title, string? description, string? documentType, IFormFile file, Guid userId);
    Task<List<ChangeRequestDto>> GetChangeRequestsAsync(Guid? projectId);
    Task<ChangeRequestDto> CreateChangeRequestAsync(CreateChangeRequestRequest request, Guid userId);
    Task<ChangeRequestDto> UpdateCRStatusAsync(Guid id, string status, string? comments, Guid userId);
}

// ─── Risk Service ───────────────────────────────────────────────────────

public class RiskService : IRiskService
{
    private readonly AppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly INotificationService _notifications;

    public RiskService(AppDbContext db, ICurrentUserService currentUser, INotificationService notifications)
    {
        _db = db; _currentUser = currentUser; _notifications = notifications;
    }

    public async Task<PagedResult<RiskDto>> GetRisksAsync(Guid? projectId, string? status, string? category, int page, int pageSize)
    {
        var q = _db.Risks
            .Include(r => r.Project)
            .Include(r => r.RaisedBy)
            .Include(r => r.RiskOwner)
            .Where(r => !r.IsDeleted);

        if (projectId.HasValue) q = q.Where(r => r.ProjectId == projectId.Value);
        if (!string.IsNullOrEmpty(status))   q = q.Where(r => r.Status == status);
        if (!string.IsNullOrEmpty(category)) q = q.Where(r => r.Category == category);

        var total = await q.CountAsync();
        var items = await q
            .OrderByDescending(r => r.RiskScore ?? 0)
            .ThenByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(r => MapRisk(r))
            .ToListAsync();

        return new PagedResult<RiskDto>(items, total, page, pageSize, (int)Math.Ceiling((double)total / pageSize));
    }

    public async Task<RiskDto?> GetByIdAsync(Guid id)
    {
        var r = await _db.Risks
            .Include(r => r.Project).Include(r => r.RaisedBy).Include(r => r.RiskOwner)
            .FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted);
        return r == null ? null : MapRisk(r);
    }

    public async Task<RiskDto> CreateAsync(CreateRiskRequest req, Guid userId)
    {
        // Auto-generate risk number
        var count = await _db.Risks.CountAsync(r => r.ProjectId == req.ProjectId) + 1;
        var project = await _db.Projects.FindAsync(req.ProjectId) ?? throw new KeyNotFoundException("Project not found");

        var risk = new Risk
        {
            ProjectId         = req.ProjectId,
            RiskNumber        = $"RSK-{project.Code}-{count:D3}",
            Title             = req.Title,
            Description       = req.Description,
            Category          = req.Category,
            RiskType          = req.RiskType,
            Probability       = req.Probability,
            Impact            = req.Impact,
            RiskScore         = CalculateRiskScore(req.Probability, req.Impact),
            RiskLevel         = DetermineRiskLevel(CalculateRiskScore(req.Probability, req.Impact)),
            MitigationPlan    = req.MitigationPlan,
            MitigationStrategy = req.MitigationStrategy,
            ContingencyPlan   = req.ContingencyPlan,
            ContingencyBudget = req.ContingencyBudget,
            RiskOwnerId       = req.RiskOwnerId,
            ReviewDate        = req.ReviewDate != null ? DateTime.Parse(req.ReviewDate) : null,
            RaisedById        = userId,
            Status            = "Draft",
        };

        _db.Risks.Add(risk);
        await _db.SaveChangesAsync();

        // Notify risk owner if set
        if (req.RiskOwnerId.HasValue)
            await _notifications.SendAsync(req.RiskOwnerId.Value, "Risk Assigned", $"You have been assigned as owner of risk: {risk.Title}", "Warning", "Risk", risk.Id);

        return (await GetByIdAsync(risk.Id))!;
    }

    public async Task<RiskDto> UpdateStatusAsync(Guid id, UpdateRiskStatusRequest req, Guid userId)
    {
        var risk = await _db.Risks.FindAsync(id) ?? throw new KeyNotFoundException("Risk not found");
        var oldStatus = risk.Status;
        risk.Status = req.Status;
        risk.UpdatedAt = DateTime.UtcNow;
        if (req.Status == "Closed") { risk.ClosedAt = DateTime.UtcNow; }

        if (!string.IsNullOrEmpty(req.Notes))
        {
            _db.RiskUpdates.Add(new RiskUpdate
            {
                RiskId = id, NewStatus = req.Status, Notes = req.Notes, UpdatedById = userId
            });
        }

        await _db.SaveChangesAsync();
        return (await GetByIdAsync(id))!;
    }

    public async Task<RiskDto> AddUpdateAsync(Guid id, RiskUpdateDto update, Guid userId)
    {
        var risk = await _db.Risks.FindAsync(id) ?? throw new KeyNotFoundException("Risk not found");
        _db.RiskUpdates.Add(new RiskUpdate
        {
            RiskId = id, Notes = update.Notes, NewStatus = update.NewStatus,
            NewProbability = update.NewProbability, NewImpact = update.NewImpact,
            NewRiskScore = update.NewRiskScore, MitigationUpdate = update.MitigationUpdate,
            UpdatedById = userId
        });
        if (update.NewStatus != null) risk.Status = update.NewStatus;
        if (update.NewProbability != null) risk.Probability = update.NewProbability;
        if (update.NewImpact != null) risk.Impact = update.NewImpact;
        if (update.NewRiskScore.HasValue) { risk.RiskScore = update.NewRiskScore; risk.RiskLevel = DetermineRiskLevel(update.NewRiskScore.Value); }
        risk.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return (await GetByIdAsync(id))!;
    }

    public async Task<List<RiskUpdateDto>> GetUpdatesAsync(Guid id)
    {
        return await _db.RiskUpdates
            .Include(u => u.UpdatedBy)
            .Where(u => u.RiskId == id)
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new RiskUpdateDto(u.Id, u.Notes, u.NewStatus, u.NewProbability, u.NewImpact,
                u.NewRiskScore, u.MitigationUpdate, u.UpdatedBy.FullName, u.CreatedAt))
            .ToListAsync();
    }

    private static int CalculateRiskScore(string prob, string impact)
    {
        var p = prob switch { "Low" => 1, "Medium" => 2, "High" => 3, "VeryHigh" => 4, _ => 2 };
        var i = impact switch { "Low" => 1, "Medium" => 2, "High" => 3, "VeryHigh" => 4, _ => 2 };
        return p * i;
    }

    private static string DetermineRiskLevel(int score) => score switch
    {
        <= 2  => "Low",
        <= 6  => "Medium",
        <= 12 => "High",
        _     => "Critical"
    };

    private static RiskDto MapRisk(Risk r) => new(
        r.Id, r.RiskNumber, r.Title, r.Description,
        r.Category, r.RiskType, r.Probability, r.Impact,
        r.RiskScore, r.RiskLevel, r.Status,
        r.MitigationPlan, r.MitigationStrategy,
        r.ContingencyPlan, r.ContingencyBudget,
        r.Project?.Name ?? "", r.RaisedBy?.FullName ?? "",
        r.RiskOwner?.FullName, r.ReviewDate, r.ClosedAt, r.CreatedAt);
}

// ─── Budget Service ─────────────────────────────────────────────────────

public class BudgetService : IBudgetService
{
    private readonly AppDbContext _db;
    public BudgetService(AppDbContext db) => _db = db;

    public async Task<ProjectBudgetDto> CreateBudgetAsync(CreateProjectBudgetRequest req, Guid userId)
    {
        // TC-BUD-002: Only one active budget per project
        var hasActive = await _db.ProjectBudgets
            .AnyAsync(b => b.ProjectId == req.ProjectId && !b.IsDeleted
                       && (b.Status == "Active" || b.Status == "Draft"));
        if (hasActive)
            throw new InvalidOperationException("A budget already exists for this project. Only one budget is allowed per project.");

        var existing = await _db.ProjectBudgets
            .Where(b => b.ProjectId == req.ProjectId && !b.IsDeleted)
            .CountAsync();

        var budget = new ProjectBudget
        {
            ProjectId           = req.ProjectId,
            BudgetVersion       = $"v{existing + 1}",
            TotalApprovedBudget = req.TotalAmount,
            Currency            = req.Currency ?? "USD",
            Notes               = req.Notes,
            Status              = "Draft",
            CreatedById         = userId,
        };
        _db.ProjectBudgets.Add(budget);
        await _db.SaveChangesAsync();
        
        return (await GetProjectBudgetsAsync(req.ProjectId)).First(b => b.Id == budget.Id);
    }

    public async Task<List<ProjectBudgetDto>> GetProjectBudgetsAsync(Guid projectId)
    {
        var budgets = await _db.ProjectBudgets
            .Include(b => b.Project)
            .Include(b => b.ApprovedBy)
            .Where(b => b.ProjectId == projectId && !b.IsDeleted)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();

        return budgets.Select(b => {
            var wbsItems = _db.BudgetWBSItems.Where(w => w.ProjectId == projectId && w.ParentId == null).ToList();
            var totalCommitted = wbsItems.Sum(w => w.CommittedAmount);
            var totalExpended  = wbsItems.Sum(w => w.ExpendedAmount);
            var balance = b.TotalApprovedBudget - totalExpended;
            var burnRate = b.TotalApprovedBudget > 0 ? (totalExpended / b.TotalApprovedBudget) * 100 : 0;
            return new ProjectBudgetDto(b.Id, b.Project.Name, b.BudgetVersion, b.Status,
                b.TotalApprovedBudget, b.RevisedBudget, b.Currency,
                totalCommitted, totalExpended, balance, burnRate,
                b.ApprovedAt, b.ApprovedBy?.FullName);
        }).ToList();
    }

    public async Task<List<BudgetWBSDto>> GetWBSItemsAsync(Guid projectId)
    {
        return await _db.BudgetWBSItems
            .Where(w => w.ProjectId == projectId && !w.IsDeleted)
            .OrderBy(w => w.Level).ThenBy(w => w.WbsCode)
            .Select(w => new BudgetWBSDto(
                w.Id, w.ProjectId, w.ParentId, w.WbsCode,
                w.Description, w.CostCode, w.Level,
                w.BudgetAmount, w.RevisedAmount,
                w.CommittedAmount, w.ExpendedAmount,
                w.BalanceAmount, w.BurnRate, w.Currency))
            .ToListAsync();
    }

    public async Task<BudgetWBSDto?> GetWBSItemAsync(Guid id)
    {
        var w = await _db.BudgetWBSItems.FindAsync(id);
        if (w == null) return null;
        return new BudgetWBSDto(w.Id, w.ProjectId, w.ParentId, w.WbsCode, w.Description,
            w.CostCode, w.Level, w.BudgetAmount, w.RevisedAmount,
            w.CommittedAmount, w.ExpendedAmount, w.BalanceAmount, w.BurnRate, w.Currency);
    }

    public async Task<List<ExpenditureDto>> GetExpendituresAsync(Guid projectId, Guid? wbsId)
    {
        var q = _db.Expenditures
            .Include(e => e.BudgetWBS)
            .Include(e => e.Project)
            .Include(e => e.RecordedBy)
            .Where(e => e.ProjectId == projectId && !e.IsDeleted);
        if (wbsId.HasValue) q = q.Where(e => e.BudgetWBSId == wbsId.Value);
        return await q.OrderByDescending(e => e.ExpenseDate)
            .Select(e => new ExpenditureDto(e.Id, e.BudgetWBS.Description, e.Project.Name,
                e.ExpenseType, e.ReferenceNo, e.Amount, e.Currency, e.ExpenseDate,
                e.VendorName, e.Description, e.RecordedBy.FullName))
            .ToListAsync();
    }

    public async Task<ExpenditureDto> AddExpenditureAsync(CreateExpenditureRequest req, Guid userId)
    {
        var exp = new Expenditure
        {
            BudgetWBSId  = req.BudgetWBSId,
            ProjectId    = req.ProjectId,
            ExpenseType  = req.ExpenseType,
            ReferenceNo  = req.ReferenceNo,
            Amount       = req.Amount,
            ExpenseDate  = req.ExpenseDate != null ? DateTime.Parse(req.ExpenseDate) : DateTime.Today,
            VendorName   = req.VendorName,
            Description  = req.Description,
            RecordedById = userId,
        };
        _db.Expenditures.Add(exp);
        await _db.SaveChangesAsync();
        await RecalculateBudgetAsync(req.ProjectId);
        return (await GetExpendituresAsync(req.ProjectId, req.BudgetWBSId)).First(e => e.Id == exp.Id);
    }

    public async Task RecalculateBudgetAsync(Guid projectId)
    {
        var wbsItems = await _db.BudgetWBSItems
            .Include(w => w.Expenditures)
            .Include(w => w.CommittedAmounts)
            .Where(w => w.ProjectId == projectId && !w.IsDeleted)
            .ToListAsync();

        foreach (var item in wbsItems)
        {
            item.CommittedAmount = item.CommittedAmounts.Where(c => c.Status == "Active").Sum(c => c.Amount);
            item.ExpendedAmount  = item.Expenditures.Sum(e => e.Amount);
            item.BalanceAmount   = (item.RevisedAmount ?? item.BudgetAmount) - item.ExpendedAmount;
            item.BurnRate        = item.BudgetAmount > 0 ? Math.Round((item.ExpendedAmount / item.BudgetAmount) * 100, 2) : 0;
            item.UpdatedAt       = DateTime.UtcNow;
        }
        await _db.SaveChangesAsync();
    }
}

// ─── Procurement Service ────────────────────────────────────────────────

public class ProcurementService : IProcurementService
{
    private readonly AppDbContext _db;
    private readonly INotificationService _notifications;

    public ProcurementService(AppDbContext db, INotificationService notifications)
    {
        _db = db; _notifications = notifications;
    }

    public async Task<PagedResult<MaterialRequestDto>> GetMRsAsync(Guid? projectId, string? status, int page, int pageSize)
    {
        var q = _db.MaterialRequests
            .Include(m => m.Project).Include(m => m.RequestedBy)
            .Include(m => m.Items)
            .Where(m => !m.IsDeleted);
        if (projectId.HasValue)            q = q.Where(m => m.ProjectId == projectId.Value);
        if (!string.IsNullOrEmpty(status)) q = q.Where(m => m.Status == status);
        var total = await q.CountAsync();
        var items = await q.OrderByDescending(m => m.CreatedAt).Skip((page-1)*pageSize).Take(pageSize)
            .Select(m => MapMR(m)).ToListAsync();
        return new PagedResult<MaterialRequestDto>(items, total, page, pageSize, (int)Math.Ceiling((double)total/pageSize));
    }

    public async Task<MaterialRequestDto?> GetMRByIdAsync(Guid id)
    {
        var m = await _db.MaterialRequests
            .Include(m => m.Project).Include(m => m.RequestedBy).Include(m => m.Items)
            .FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted);
        return m == null ? null : MapMR(m);
    }

    public async Task<MaterialRequestDto> CreateMRAsync(CreateMRRequest req, Guid userId)
    {
        var count = await _db.MaterialRequests.CountAsync(m => m.ProjectId == req.ProjectId) + 1;
        var project = await _db.Projects.FindAsync(req.ProjectId) ?? throw new KeyNotFoundException("Project not found");
        var mr = new MaterialRequest
        {
            ProjectId     = req.ProjectId,
            MrNumber      = $"MR-{project.Code}-{count:D4}",
            Title         = req.Title,
            Justification = req.Justification,
            Priority      = req.Priority,
            RequiredDate  = req.RequiredDate != null ? DateTime.Parse(req.RequiredDate) : null,
            Status        = "Draft",
            RequestedById = userId,
        };
        _db.MaterialRequests.Add(mr);
        await _db.SaveChangesAsync();

        foreach (var item in req.Items)
        {
            _db.MRLineItems.Add(new MRLineItem
            {
                MaterialRequestId = mr.Id, Description = item.Description,
                Unit = item.Unit, Quantity = item.Quantity, EstimatedCost = item.EstimatedCost,
            });
        }
        await _db.SaveChangesAsync();
        return (await GetMRByIdAsync(mr.Id))!;
    }

    public async Task<MaterialRequestDto> AdvanceMRAsync(Guid id, string action, Guid userId, string? remark = null)
    {
        var mr = await _db.MaterialRequests.FindAsync(id) ?? throw new KeyNotFoundException("MR not found");
        switch (action)
        {
            case "Submit":        mr.Status = "Submitted"; break;
            case "PMApprove":     mr.Status = "PMApproved"; mr.PMApprovedById = userId; mr.PMApprovedAt = DateTime.UtcNow; break;
            case "SendToPurchase": mr.Status = "SentToPurchase"; mr.PurchaseDeptById = userId; mr.SentToPurchaseAt = DateTime.UtcNow; break;
            case "QuotationReceived": mr.Status = "QuotationReceived"; break;
            case "GeneratePO":    mr.Status = "POGenerated"; break;
            case "PartDelivery":  mr.Status = "PartDelivered"; break;
            case "FullDelivery":  mr.Status = "Delivered"; break;
            case "Close":         mr.Status = "Closed"; break;
            case "Reject":        mr.Status = "Draft"; mr.RejectionReason = remark ?? "Rejected by approver"; break;
        }
        // Store the remark (repurposing RejectionReason as general last-action remark field)
        if (!string.IsNullOrWhiteSpace(remark) && action != "Reject")
            mr.RejectionReason = remark;
        mr.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return (await GetMRByIdAsync(id))!;
    }

    public async Task<List<PurchaseOrderDto>> GetPOsAsync(Guid? projectId)
    {
        var q = _db.PurchaseOrders.Include(p => p.Vendor).Include(p => p.Project).Where(p => !p.IsDeleted);
        if (projectId.HasValue) q = q.Where(p => p.ProjectId == projectId.Value);
        return await q.OrderByDescending(p => p.PoDate)
            .Select(p => new PurchaseOrderDto(p.Id, p.PoNumber, p.Vendor.Name, p.Project.Name,
                p.TotalAmount, p.Currency, p.Status, p.PoDate, p.ExpectedDelivery))
            .ToListAsync();
    }

    public async Task<List<VendorDto>> GetVendorsAsync()
    {
        return await _db.Set<Vendor>().Where(v => !v.IsDeleted && v.IsActive)
            .Select(v => new VendorDto(v.Id, v.Name, v.VendorCode, v.ContactPerson,
                v.Email, v.Phone, v.Country, v.Category, v.IsApproved, v.IsActive))
            .ToListAsync();
    }

    private static MaterialRequestDto MapMR(MaterialRequest m) => new(
        m.Id, m.MrNumber, m.Title, m.Justification, m.Priority, m.RequiredDate, m.Status,
        m.ProjectId, m.Project?.Name ?? "", m.RequestedBy?.FullName ?? "", m.CreatedAt,
        m.Items?.Select(i => new MRLineItemDto(i.Id, i.Description, i.Unit, i.Quantity, i.EstimatedCost, i.DeliveredQuantity)).ToList() ?? new(),
        m.RejectionReason);
}

// ─── Inventory Service ──────────────────────────────────────────────────

public class InventoryService : IInventoryService
{
    private readonly AppDbContext _db;
    public InventoryService(AppDbContext db) => _db = db;

    public async Task<PagedResult<MaterialDto>> GetMaterialsAsync(string? search, Guid? categoryId, int page, int pageSize)
    {
        var q = _db.Materials.Include(m => m.Category).Where(m => !m.IsDeleted && m.IsActive);
        if (!string.IsNullOrEmpty(search)) q = q.Where(m => m.Name.Contains(search) || m.MaterialCode.Contains(search));
        if (categoryId.HasValue) q = q.Where(m => m.CategoryId == categoryId.Value);
        var total = await q.CountAsync();
        var items = await q.OrderBy(m => m.Name).Skip((page-1)*pageSize).Take(pageSize)
            .Select(m => new MaterialDto(m.Id, m.Name, m.MaterialCode, m.Category != null ? m.Category.Name : null,
                m.Unit, m.Description, m.Brand, m.CurrentStock, m.ReorderLevel, m.StandardCost,
                m.ReorderLevel.HasValue && m.CurrentStock <= m.ReorderLevel.Value))
            .ToListAsync();
        return new PagedResult<MaterialDto>(items, total, page, pageSize, (int)Math.Ceiling((double)total/pageSize));
    }

    public async Task<List<StockLedgerDto>> GetStockLedgerAsync(Guid? projectId, Guid? materialId)
    {
        var q = _db.StockLedger.Include(s => s.Material).Include(s => s.Project).Include(s => s.RecordedBy).Where(s => !s.IsDeleted);
        if (projectId.HasValue)  q = q.Where(s => s.ProjectId == projectId.Value);
        if (materialId.HasValue) q = q.Where(s => s.MaterialId == materialId.Value);
        return await q.OrderByDescending(s => s.TransactionDate)
            .Select(s => new StockLedgerDto(s.Id, s.Material.Name, s.Project.Name, s.TransactionDate,
                s.TransactionType, s.Quantity, s.UnitCost, s.BalanceAfter, s.Notes, s.RecordedBy.FullName))
            .ToListAsync();
    }

    public async Task<List<SiteTransferDto>> GetSiteTransfersAsync(Guid? projectId)
    {
        var q = _db.SiteTransfers.Include(t => t.Material).Include(t => t.RequestedBy).Where(t => !t.IsDeleted);
        if (projectId.HasValue) q = q.Where(t => t.FromProjectId == projectId.Value || t.ToProjectId == projectId.Value);
        var fromProjects = await _db.Projects.ToDictionaryAsync(p => p.Id, p => p.Name);
        return await q.OrderByDescending(t => t.TransferDate)
            .Select(t => new SiteTransferDto(t.Id, t.Material.Name,
                fromProjects.ContainsKey(t.FromProjectId) ? fromProjects[t.FromProjectId] : t.FromProjectId.ToString(),
                fromProjects.ContainsKey(t.ToProjectId) ? fromProjects[t.ToProjectId] : t.ToProjectId.ToString(),
                t.Quantity, t.Status, t.TransferDate, t.RequestedBy.FullName))
            .ToListAsync();
    }

    public async Task<StockLedgerDto> AddStockEntryAsync(Guid materialId, Guid projectId, string type, decimal qty, decimal? cost, string? notes, Guid userId)
    {
        var material = await _db.Materials.FindAsync(materialId) ?? throw new KeyNotFoundException("Material not found");
        if (type.Contains("Issue") || type == "Transfer_Out") material.CurrentStock -= qty;
        else material.CurrentStock += qty;
        material.UpdatedAt = DateTime.UtcNow;

        var entry = new StockLedgerEntry
        {
            MaterialId = materialId, ProjectId = projectId,
            TransactionDate = DateTime.Today, TransactionType = type,
            Quantity = qty, UnitCost = cost, BalanceAfter = material.CurrentStock,
            Notes = notes, RecordedById = userId,
        };
        _db.StockLedger.Add(entry);
        await _db.SaveChangesAsync();

        var project = await _db.Projects.FindAsync(projectId);
        var user    = await _db.Users.FindAsync(userId);
        return new StockLedgerDto(entry.Id, material.Name, project?.Name ?? "", entry.TransactionDate,
            type, qty, cost, entry.BalanceAfter, notes, user?.FullName ?? "");
    }
}

// ─── Resource Service ───────────────────────────────────────────────────

public class ResourceService : IResourceService
{
    private readonly AppDbContext _db;
    public ResourceService(AppDbContext db) => _db = db;

    public async Task<ResourceDto> CreateResourceAsync(CreateResourceRequest req, Guid userId)
    {
        var resource = new Resource
        {
            Name           = req.Name,
            Code           = req.Code,
            ResourceTypeId = req.ResourceTypeId,
            CostPerDay     = req.CostPerDay,
            CostPerHour    = req.CostPerHour,
            Currency       = req.Currency ?? "USD",
            Status         = "Available",
            Notes          = req.Notes,
            Make           = req.Make,
            Model          = req.Model,
            SerialNumber   = req.SerialNumber,
            CreatedById    = userId,
        };
        _db.Resources.Add(resource);
        await _db.SaveChangesAsync();
        var result = await GetResourcesAsync(null, null, null, 1, 1);
        return (await GetResourcesAsync(req.Name, null, null, 1, 5)).Items.FirstOrDefault()
            ?? new ResourceDto(resource.Id, resource.Name, resource.Code, null, null,
               null, resource.Status, resource.CostPerHour, resource.CostPerDay,
               resource.Currency, null, resource.Make, resource.Model);
    }

    public async Task<PagedResult<ResourceDto>> GetResourcesAsync(string? search, string? status, string? type, int page, int pageSize)
    {
        var q = _db.Resources.Include(r => r.ResourceType).Include(r => r.Calendar).Include(r => r.User).Where(r => !r.IsDeleted);
        if (!string.IsNullOrEmpty(search)) q = q.Where(r => r.Name.Contains(search) || (r.Code != null && r.Code.Contains(search)));
        if (!string.IsNullOrEmpty(status)) q = q.Where(r => r.Status == status);
        var total = await q.CountAsync();
        var items = await q.OrderBy(r => r.Name).Skip((page-1)*pageSize).Take(pageSize)
            .Select(r => new ResourceDto(r.Id, r.Name, r.Code, r.ResourceType != null ? r.ResourceType.Name : null,
                r.Calendar != null ? r.Calendar.Name : null, r.Location, r.Status,
                r.CostPerHour, r.CostPerDay, r.Currency,
                r.User != null ? r.User.FullName : null, r.Make, r.Model))
            .ToListAsync();
        return new PagedResult<ResourceDto>(items, total, page, pageSize, (int)Math.Ceiling((double)total/pageSize));
    }

    public async Task<List<ResourceAllocationDto>> GetAllocationsAsync(Guid? projectId, Guid? resourceId)
    {
        var q = _db.TaskResourceAllocations
            .Include(a => a.Resource).Include(a => a.Task).ThenInclude(t => t.Project)
            .Where(a => !a.IsDeleted);
        if (resourceId.HasValue) q = q.Where(a => a.ResourceId == resourceId.Value);
        if (projectId.HasValue)  q = q.Where(a => a.Task.ProjectId == projectId.Value);
        return await q.OrderByDescending(a => a.StartDate)
            .Select(a => new ResourceAllocationDto(a.Id, a.Resource.Name, a.Task.Name, a.Task.Project.Name,
                a.StartDate, a.EndDate, a.AllocationPercent, a.PlannedHours, a.ActualHours, a.Status))
            .ToListAsync();
    }

    public async Task<ResourceAllocationDto> AllocateAsync(Guid taskId, Guid resourceId, DateTime start, DateTime end, decimal percent, Guid userId)
    {
        var alloc = new TaskResourceAllocation
        {
            TaskId = taskId, ResourceId = resourceId,
            StartDate = start, EndDate = end,
            AllocationPercent = percent, Status = "Planned",
        };
        _db.TaskResourceAllocations.Add(alloc);

        // Update resource status
        var resource = await _db.Resources.FindAsync(resourceId);
        if (resource != null && resource.Status == "Available") { resource.Status = "Allocated"; resource.UpdatedAt = DateTime.UtcNow; }

        await _db.SaveChangesAsync();
        return (await GetAllocationsAsync(null, resourceId)).First(a => a.Id == alloc.Id);
    }
}

// ─── Document Service ───────────────────────────────────────────────────

public class DocumentService : IDocumentService
{
    private readonly AppDbContext _db;
    private readonly IFileStorageService _storage;

    public DocumentService(AppDbContext db, IFileStorageService storage)
    {
        _db = db; _storage = storage;
    }

    public async Task<List<FolderDto>> GetFoldersAsync(Guid projectId)
    {
        return await _db.ProjectFolders
            .Where(f => f.ProjectId == projectId && !f.IsDeleted)
            .OrderBy(f => f.SortOrder).ThenBy(f => f.Name)
            .Select(f => new FolderDto(f.Id, f.Name, f.ParentId, f.SortOrder,
                f.Documents.Count(d => !d.IsDeleted)))
            .ToListAsync();
    }

    public async Task<PagedResult<DocumentDto>> GetDocumentsAsync(Guid? projectId, Guid? folderId, string? search, string? type, int page, int pageSize)
    {
        var q = _db.Documents.Include(d => d.Project).Include(d => d.UploadedBy).Where(d => !d.IsDeleted);
        if (projectId.HasValue)            q = q.Where(d => d.ProjectId == projectId.Value);
        if (folderId.HasValue)             q = q.Where(d => d.FolderId == folderId.Value);
        if (!string.IsNullOrEmpty(search)) q = q.Where(d => d.Title.Contains(search) || d.FileName.Contains(search));
        if (!string.IsNullOrEmpty(type))   q = q.Where(d => d.DocumentType == type);
        var total = await q.CountAsync();
        var items = await q.OrderByDescending(d => d.CreatedAt).Skip((page-1)*pageSize).Take(pageSize)
            .Select(d => new DocumentDto(d.Id, d.ProjectId, d.Project.Name, d.FolderId, d.Title,
                d.Description, d.FileName, d.FileUrl, d.ContentType, d.FileSize,
                d.RevisionNumber, d.DocumentType, d.Status, d.UploadedBy.FullName, d.CreatedAt))
            .ToListAsync();
        return new PagedResult<DocumentDto>(items, total, page, pageSize, (int)Math.Ceiling((double)total/pageSize));
    }

    public async Task<DocumentDto> UploadDocumentAsync(Guid projectId, Guid? folderId, string title, string? description, string? documentType, IFormFile file, Guid userId)
    {
        var (path, url) = await _storage.SaveFileAsync(file, $"documents/{projectId}");
        var doc = new Document
        {
            ProjectId    = projectId, FolderId = folderId,
            Title        = title, Description = description,
            FileName     = file.FileName, FilePath = path, FileUrl = url,
            ContentType  = file.ContentType, FileSize = file.Length,
            DocumentType = documentType ?? "General",
            UploadedById = userId, Status = "Active",
        };
        _db.Documents.Add(doc);
        await _db.SaveChangesAsync();
        return (await GetDocumentsAsync(projectId, folderId, null, null, 1, 1)).Items.First();
    }

    public async Task<List<ChangeRequestDto>> GetChangeRequestsAsync(Guid? projectId)
    {
        var q = _db.ChangeRequests.Include(c => c.Project).Include(c => c.SubmittedBy).Where(c => !c.IsDeleted);
        if (projectId.HasValue) q = q.Where(c => c.ProjectId == projectId.Value);
        return await q.OrderByDescending(c => c.CreatedAt)
            .Select(c => new ChangeRequestDto(c.Id, c.CrNumber, c.Title, c.Description, c.Reason,
                c.Impact, c.CostImpact, c.ScheduleImpactDays, c.Status,
                c.Project.Name, c.SubmittedBy.FullName, c.CreatedAt, c.ReviewedAt, c.ReviewComments))
            .ToListAsync();
    }

    public async Task<ChangeRequestDto> CreateChangeRequestAsync(CreateChangeRequestRequest req, Guid userId)
    {
        if (!req.ProjectId.HasValue) throw new ArgumentException("ProjectId is required");
        var count = await _db.ChangeRequests.CountAsync(c => c.ProjectId == req.ProjectId.Value) + 1;
        var project = await _db.Projects.FindAsync(req.ProjectId.Value) ?? throw new KeyNotFoundException();
        var cr = new ChangeRequest
        {
            ProjectId     = req.ProjectId.Value,
            CrNumber      = $"CR-{project.Code}-{count:D3}",
            Title         = req.Title,
            Description   = req.Description,
            Reason        = req.Reason,
            Impact        = req.Impact,
            CostImpact    = req.CostImpact,
            ScheduleImpactDays = req.ScheduleImpactDays,
            SubmittedById = userId,
            Status        = "Draft",
        };
        _db.ChangeRequests.Add(cr);
        await _db.SaveChangesAsync();
        return (await GetChangeRequestsAsync(req.ProjectId.Value)).First(c => c.Id == cr.Id);
    }

    public async Task<ChangeRequestDto> UpdateCRStatusAsync(Guid id, string status, string? comments, Guid userId)
    {
        var cr = await _db.ChangeRequests.FindAsync(id) ?? throw new KeyNotFoundException();
        cr.Status = status; cr.ReviewComments = comments;
        cr.ReviewedById = userId; cr.ReviewedAt = DateTime.UtcNow;
        cr.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return (await GetChangeRequestsAsync(cr.ProjectId)).First(c => c.Id == id);
    }
}
