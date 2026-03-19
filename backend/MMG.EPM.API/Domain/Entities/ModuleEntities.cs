using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MMG.EPM.API.Domain.Entities;

// ─── Documents ─────────────────────────────────────────────────────────────

public class FolderTemplate : BaseEntity
{
    [Required, MaxLength(300)] public string Name { get; set; } = "";
    [MaxLength(500)] public string? Description { get; set; }
    public Guid? ParentId { get; set; }
    public int SortOrder { get; set; } = 0;
    public bool IsDefault { get; set; } = true;

    [ForeignKey(nameof(ParentId))] public FolderTemplate? Parent { get; set; }
    public ICollection<FolderTemplate> Children { get; set; } = new List<FolderTemplate>();
}

public class ProjectFolder : BaseEntity
{
    public Guid ProjectId { get; set; }
    public Guid? ParentId { get; set; }
    public Guid? TemplateId { get; set; }
    [Required, MaxLength(300)] public string Name { get; set; } = "";
    public int SortOrder { get; set; } = 0;

    public Project Project { get; set; } = null!;
    [ForeignKey(nameof(ParentId))] public ProjectFolder? Parent { get; set; }
    public ICollection<ProjectFolder> Children  { get; set; } = new List<ProjectFolder>();
    public ICollection<Document>      Documents { get; set; } = new List<Document>();
}

public class Document : BaseEntity
{
    public Guid ProjectId { get; set; }
    public Guid? FolderId { get; set; }
    [Required, MaxLength(500)] public string Title { get; set; } = "";
    [MaxLength(500)] public string? Description { get; set; }
    [Required, MaxLength(500)] public string FileName { get; set; } = "";
    [Required, MaxLength(1000)] public string FilePath { get; set; } = "";
    [MaxLength(500)] public string? FileUrl { get; set; }
    [MaxLength(100)] public string? ContentType { get; set; }
    public long FileSize { get; set; }
    [MaxLength(20)]  public string RevisionNumber { get; set; } = "v1";
    [MaxLength(50)]  public string DocumentType { get; set; } = "General";
    // General | Drawing | Specification | Contract | Report | Other
    [MaxLength(50)]  public string Status { get; set; } = "Active";
    public Guid UploadedById { get; set; }
    public DateTime? ExpiryDate { get; set; }

    public Project       Project    { get; set; } = null!;
    public ProjectFolder? Folder    { get; set; }
    [ForeignKey(nameof(UploadedById))] public User UploadedBy { get; set; } = null!;
}

public class Drawing : BaseEntity
{
    public Guid ProjectId { get; set; }
    [Required, MaxLength(100)] public string DrawingNumber { get; set; } = "";
    [Required, MaxLength(500)] public string Title { get; set; } = "";
    [MaxLength(100)] public string? Discipline { get; set; }   // Civil | Electrical | Mechanical | HVAC
    [MaxLength(50)]  public string? Scale { get; set; }
    [MaxLength(20)]  public string Revision { get; set; } = "A";
    [MaxLength(50)]  public string Status { get; set; } = "IFC"; // IFC | IFR | IFA | Superseded
    public Guid? FileAttachmentId { get; set; }
    public Guid UploadedById { get; set; }

    public Project Project { get; set; } = null!;
    [ForeignKey(nameof(UploadedById))] public User UploadedBy { get; set; } = null!;
}

public class ChangeRequest : BaseEntity
{
    public Guid ProjectId { get; set; }
    [Required, MaxLength(30)]  public string CrNumber { get; set; } = "";
    [Required, MaxLength(500)] public string Title { get; set; } = "";
    [MaxLength(2000)] public string? Description { get; set; }
    [MaxLength(2000)] public string? Reason { get; set; }
    [MaxLength(2000)] public string? Impact { get; set; }
    [Column(TypeName = "decimal(18,2)")] public decimal? CostImpact { get; set; }
    public int? ScheduleImpactDays { get; set; }
    [Required, MaxLength(50)] public string Status { get; set; } = "Draft";
    // Draft | UnderReview | Approved | Rejected | Withdrawn
    public Guid SubmittedById { get; set; }
    public Guid? ReviewedById { get; set; }
    public DateTime? ReviewedAt { get; set; }
    [MaxLength(500)] public string? ReviewComments { get; set; }

    public Project Project { get; set; } = null!;
    [ForeignKey(nameof(SubmittedById))] public User SubmittedBy { get; set; } = null!;
    [ForeignKey(nameof(ReviewedById))]  public User? ReviewedBy { get; set; }
}

// ─── Procurement ───────────────────────────────────────────────────────────

public class Vendor : BaseEntity
{
    [Required, MaxLength(300)] public string Name { get; set; } = "";
    [Required, MaxLength(50)]  public string VendorCode { get; set; } = "";
    [MaxLength(200)] public string? ContactPerson { get; set; }
    [MaxLength(256)] public string? Email { get; set; }
    [MaxLength(20)]  public string? Phone { get; set; }
    [MaxLength(100)] public string? Country { get; set; }
    [MaxLength(500)] public string? Address { get; set; }
    [MaxLength(100)] public string? Category { get; set; }
    [MaxLength(20)]  public string? TaxId { get; set; }
    [MaxLength(100)] public string? BankName { get; set; }
    [MaxLength(50)]  public string? BankAccount { get; set; }
    public bool IsApproved { get; set; } = false;
    public bool IsActive   { get; set; } = true;
    public int? CreditDays { get; set; }

    public ICollection<PurchaseOrder> PurchaseOrders { get; set; } = new List<PurchaseOrder>();
}

public class MaterialRequest : BaseEntity
{
    public Guid ProjectId { get; set; }
    [Required, MaxLength(30)]  public string MrNumber { get; set; } = "";
    [Required, MaxLength(500)] public string Title { get; set; } = "";
    [MaxLength(2000)] public string? Justification { get; set; }
    [MaxLength(50)] public string Priority { get; set; } = "Normal";  // Low | Normal | High | Urgent
    public DateTime? RequiredDate { get; set; }
    [Required, MaxLength(50)] public string Status { get; set; } = "Draft";
    // Draft | Submitted | PMApproved | SentToPurchase | QuotationReceived | POGenerated | PartDelivered | Delivered | Closed
    public Guid RequestedById { get; set; }
    public Guid? PMApprovedById { get; set; }
    public DateTime? PMApprovedAt { get; set; }
    public Guid? PurchaseDeptById { get; set; }
    public DateTime? SentToPurchaseAt { get; set; }
    [MaxLength(500)] public string? RejectionReason { get; set; }

    public Project Project { get; set; } = null!;
    [ForeignKey(nameof(RequestedById))]  public User RequestedBy   { get; set; } = null!;
    [ForeignKey(nameof(PMApprovedById))] public User? PMApprovedBy { get; set; }
    public ICollection<MRLineItem>   Items          { get; set; } = new List<MRLineItem>();
    public ICollection<PurchaseOrder> PurchaseOrders { get; set; } = new List<PurchaseOrder>();
}

public class MRLineItem : BaseEntity
{
    public Guid MaterialRequestId { get; set; }
    [Required, MaxLength(500)] public string Description { get; set; } = "";
    [MaxLength(50)] public string Unit { get; set; } = "Nos";
    [Column(TypeName = "decimal(10,3)")] public decimal Quantity { get; set; }
    [Column(TypeName = "decimal(18,2)")] public decimal? EstimatedCost { get; set; }
    [Column(TypeName = "decimal(10,3)")] public decimal? DeliveredQuantity { get; set; }
    [MaxLength(200)] public string? Specification { get; set; }
    public Guid? MaterialId { get; set; }

    public MaterialRequest MaterialRequest { get; set; } = null!;
}

public class PurchaseOrder : BaseEntity
{
    public Guid VendorId { get; set; }
    public Guid? MaterialRequestId { get; set; }
    public Guid ProjectId { get; set; }
    [Required, MaxLength(30)]  public string PoNumber { get; set; } = "";
    public DateTime PoDate { get; set; }
    public DateTime? ExpectedDelivery { get; set; }
    [Column(TypeName = "decimal(18,2)")] public decimal TotalAmount { get; set; }
    [MaxLength(10)] public string Currency { get; set; } = "USD";
    [MaxLength(50)] public string Status { get; set; } = "Draft";
    // Draft | Sent | Acknowledged | PartialDelivery | FullDelivery | Closed
    [MaxLength(50)] public string? PaymentTerms { get; set; }
    [MaxLength(2000)] public string? SpecialInstructions { get; set; }
    public new Guid CreatedById { get; set; }

    public Vendor           Vendor          { get; set; } = null!;
    public Project          Project         { get; set; } = null!;
    public MaterialRequest? MaterialRequest { get; set; }
    [ForeignKey(nameof(CreatedById))] public User CreatedBy { get; set; } = null!;
    public ICollection<POPayment> Payments { get; set; } = new List<POPayment>();
}

public class POPayment : BaseEntity
{
    public Guid PurchaseOrderId { get; set; }
    [Column(TypeName = "decimal(18,2)")] public decimal Amount { get; set; }
    public DateTime PaymentDate { get; set; }
    [MaxLength(50)]  public string? PaymentMode { get; set; }  // Bank | Cash | Cheque
    [MaxLength(100)] public string? ReferenceNo { get; set; }
    [MaxLength(500)] public string? Notes { get; set; }
    public Guid RecordedById { get; set; }

    public PurchaseOrder PurchaseOrder { get; set; } = null!;
    [ForeignKey(nameof(RecordedById))] public User RecordedBy { get; set; } = null!;
}

// ─── Inventory ─────────────────────────────────────────────────────────────

public class MaterialCategory : BaseEntity
{
    [Required, MaxLength(200)] public string Name { get; set; } = "";
    [MaxLength(20)] public string? Code { get; set; }
    public Guid? ParentId { get; set; }
    [ForeignKey(nameof(ParentId))] public MaterialCategory? Parent { get; set; }
}

public class Material : BaseEntity
{
    [Required, MaxLength(300)] public string Name { get; set; } = "";
    [Required, MaxLength(50)]  public string MaterialCode { get; set; } = "";
    public Guid? CategoryId { get; set; }
    [MaxLength(50)]  public string Unit { get; set; } = "Nos";
    [MaxLength(500)] public string? Description { get; set; }
    [MaxLength(100)] public string? Brand { get; set; }
    [MaxLength(100)] public string? Specification { get; set; }
    [Column(TypeName = "decimal(10,3)")] public decimal CurrentStock { get; set; } = 0;
    [Column(TypeName = "decimal(10,3)")] public decimal? ReorderLevel { get; set; }
    [Column(TypeName = "decimal(18,2)")] public decimal? StandardCost { get; set; }
    public bool IsActive { get; set; } = true;

    public MaterialCategory? Category { get; set; }
    public ICollection<StockLedgerEntry> LedgerEntries { get; set; } = new List<StockLedgerEntry>();
}

public class StockLedgerEntry : BaseEntity
{
    public Guid MaterialId { get; set; }
    public Guid ProjectId  { get; set; }
    public DateTime TransactionDate { get; set; }
    [Required, MaxLength(50)] public string TransactionType { get; set; } = "";
    // PO_Receipt | Task_Issue | Return | Transfer_In | Transfer_Out | Adjustment | Opening
    [Column(TypeName = "decimal(10,3)")] public decimal Quantity { get; set; }
    [Column(TypeName = "decimal(18,2)")] public decimal? UnitCost { get; set; }
    [Column(TypeName = "decimal(10,3)")] public decimal? BalanceAfter { get; set; }
    [MaxLength(500)] public string? Notes { get; set; }
    public Guid? ReferenceId { get; set; }          // PO Id or Task Id
    [MaxLength(100)] public string? ReferenceType { get; set; }
    public Guid RecordedById { get; set; }

    public Material Material { get; set; } = null!;
    public Project  Project  { get; set; } = null!;
    [ForeignKey(nameof(RecordedById))] public User RecordedBy { get; set; } = null!;
}

public class SiteTransfer : BaseEntity
{
    public Guid MaterialId { get; set; }
    public Guid FromProjectId { get; set; }
    public Guid ToProjectId   { get; set; }
    public DateTime TransferDate { get; set; }
    [Column(TypeName = "decimal(10,3)")] public decimal Quantity { get; set; }
    [MaxLength(500)] public string? Notes { get; set; }
    [Required, MaxLength(50)] public string Status { get; set; } = "Pending";
    // Pending | Approved | Dispatched | Received | Rejected
    public Guid RequestedById { get; set; }
    public Guid? ApprovedById { get; set; }

    public Material Material    { get; set; } = null!;
    [ForeignKey(nameof(RequestedById))] public User RequestedBy { get; set; } = null!;
    [ForeignKey(nameof(ApprovedById))]  public User? ApprovedBy { get; set; }
}

// ─── Resource Management ───────────────────────────────────────────────────

public class ResourceType : BaseEntity
{
    [Required, MaxLength(100)] public string Name { get; set; } = "";
    [MaxLength(50)] public string? Category { get; set; }  // Human | Equipment | Material
    public bool IsActive { get; set; } = true;
}

public class Calendar : BaseEntity
{
    [Required, MaxLength(200)] public string Name { get; set; } = "";
    [MaxLength(50)] public string Type { get; set; } = "Standard";
    // Standard | Night | Continuous24x7 | Custom
    public int? WorkHoursPerDay { get; set; } = 8;
    public string? WorkDays { get; set; } = "Mon,Tue,Wed,Thu,Fri";   // Comma-separated
    public bool IsDefault { get; set; } = false;

    public ICollection<CalendarException> Exceptions { get; set; } = new List<CalendarException>();
    public ICollection<Resource> Resources { get; set; } = new List<Resource>();
}

public class CalendarException : BaseEntity
{
    public Guid CalendarId { get; set; }
    public DateTime ExceptionDate { get; set; }
    [MaxLength(50)] public string ExceptionType { get; set; } = "Holiday";  // Holiday | HalfDay | WorkingDay
    [MaxLength(200)] public string? Name { get; set; }
    public int? WorkHours { get; set; }

    public Calendar Calendar { get; set; } = null!;
}

public class Resource : BaseEntity
{
    [Required, MaxLength(300)] public string Name { get; set; } = "";
    [MaxLength(50)] public string? Code { get; set; }
    public Guid? ResourceTypeId { get; set; }
    public Guid? CalendarId { get; set; }
    [MaxLength(100)] public string? Location { get; set; }
    [MaxLength(100)] public string? Availability { get; set; }
    [Column(TypeName = "decimal(18,2)")] public decimal? CostPerHour { get; set; }
    [Column(TypeName = "decimal(18,2)")] public decimal? CostPerDay  { get; set; }
    [MaxLength(10)] public string Currency { get; set; } = "USD";
    [MaxLength(50)] public string Status { get; set; } = "Available";
    // Available | Allocated | OnLeave | Inactive
    [MaxLength(500)] public string? Notes { get; set; }
    // For equipment
    [MaxLength(100)] public string? Make { get; set; }
    [MaxLength(100)] public string? Model { get; set; }
    [MaxLength(50)]  public string? SerialNumber { get; set; }
    // Link to user if human resource
    public Guid? UserId { get; set; }

    public ResourceType? ResourceType { get; set; }
    public Calendar?     Calendar     { get; set; }
    [ForeignKey(nameof(UserId))] public User? User { get; set; }
    public ICollection<TaskResourceAllocation> Allocations        { get; set; } = new List<TaskResourceAllocation>();
    public ICollection<EquipmentDeployment>    EquipDeployments   { get; set; } = new List<EquipmentDeployment>();
}

public class TaskResourceAllocation : BaseEntity
{
    public Guid TaskId     { get; set; }
    public Guid ResourceId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate   { get; set; }
    [Column(TypeName = "decimal(5,2)")] public decimal AllocationPercent { get; set; } = 100;
    [Column(TypeName = "decimal(10,2)")] public decimal? PlannedHours { get; set; }
    [Column(TypeName = "decimal(10,2)")] public decimal? ActualHours  { get; set; }
    [MaxLength(50)] public string Status { get; set; } = "Planned";
    // Planned | Active | Completed | Cancelled

    public ProjectTask Task     { get; set; } = null!;
    public Resource    Resource { get; set; } = null!;
}

public class EquipmentDeployment : BaseEntity
{
    public Guid ResourceId { get; set; }
    public Guid ProjectId  { get; set; }
    public DateTime DeployedFrom { get; set; }
    public DateTime? DeployedTo  { get; set; }
    [MaxLength(50)] public string Status { get; set; } = "Deployed";
    [MaxLength(500)] public string? Notes { get; set; }
    public Guid? DeployedById { get; set; }

    public Resource Resource { get; set; } = null!;
    public Project  Project  { get; set; } = null!;
    [ForeignKey(nameof(DeployedById))] public User? DeployedBy { get; set; }
}

// ─── Budget & Expense ──────────────────────────────────────────────────────

public class ProjectBudget : BaseEntity
{
    public Guid ProjectId { get; set; }
    [Required, MaxLength(100)] public string BudgetVersion { get; set; } = "v1";
    [MaxLength(50)] public string Status { get; set; } = "Draft";
    // Draft | Active | Revised | Closed
    [Column(TypeName = "decimal(18,2)")] public decimal TotalApprovedBudget { get; set; }
    [Column(TypeName = "decimal(18,2)")] public decimal? RevisedBudget { get; set; }
    [MaxLength(10)] public string Currency { get; set; } = "USD";
    public DateTime? ApprovedAt { get; set; }
    public Guid? ApprovedById { get; set; }
    [MaxLength(2000)] public string? Notes { get; set; }

    public Project Project { get; set; } = null!;
    [ForeignKey(nameof(ApprovedById))] public User? ApprovedBy { get; set; }
    public ICollection<BudgetWBS> WBSItems { get; set; } = new List<BudgetWBS>();
}

public class BudgetWBS : BaseEntity
{
    public Guid ProjectId { get; set; }
    public Guid? ProjectBudgetId { get; set; }
    public Guid? ParentId { get; set; }
    [Required, MaxLength(500)] public string Description { get; set; } = "";
    [MaxLength(20)] public string? WbsCode { get; set; }
    [MaxLength(100)] public string? CostCode { get; set; }
    public int Level { get; set; } = 1;

    // Budget values
    [Column(TypeName = "decimal(18,2)")] public decimal BudgetAmount   { get; set; }
    [Column(TypeName = "decimal(18,2)")] public decimal? RevisedAmount  { get; set; }
    // Auto-calculated
    [Column(TypeName = "decimal(18,2)")] public decimal CommittedAmount { get; set; } = 0;
    [Column(TypeName = "decimal(18,2)")] public decimal ExpendedAmount  { get; set; } = 0;
    [Column(TypeName = "decimal(18,2)")] public decimal BalanceAmount   { get; set; } = 0;
    [Column(TypeName = "decimal(5,2)")]  public decimal BurnRate        { get; set; } = 0;

    [MaxLength(10)] public string Currency { get; set; } = "USD";

    public Project        Project       { get; set; } = null!;
    public ProjectBudget? ProjectBudget { get; set; }
    [ForeignKey(nameof(ParentId))] public BudgetWBS? Parent   { get; set; }
    public ICollection<BudgetWBS>      Children     { get; set; } = new List<BudgetWBS>();
    public ICollection<CommittedAmount> CommittedAmounts { get; set; } = new List<CommittedAmount>();
    public ICollection<Expenditure>     Expenditures     { get; set; } = new List<Expenditure>();
}

public class CommittedAmount : BaseEntity
{
    public Guid BudgetWBSId { get; set; }
    public Guid ProjectId   { get; set; }
    [Required, MaxLength(100)] public string CommitmentType { get; set; } = "";
    // PO | Contract | SubContract
    [MaxLength(100)] public string? ReferenceNo { get; set; }
    public Guid? ReferenceId { get; set; }
    [Column(TypeName = "decimal(18,2)")] public decimal Amount { get; set; }
    [MaxLength(10)] public string Currency { get; set; } = "USD";
    public DateTime CommitmentDate { get; set; }
    [MaxLength(500)] public string? Description { get; set; }
    [MaxLength(50)] public string Status { get; set; } = "Active";
    public Guid RecordedById { get; set; }

    public BudgetWBS BudgetWBS { get; set; } = null!;
    public Project   Project   { get; set; } = null!;
    [ForeignKey(nameof(RecordedById))] public User RecordedBy { get; set; } = null!;
}

public class Expenditure : BaseEntity
{
    public Guid BudgetWBSId { get; set; }
    public Guid ProjectId   { get; set; }
    [Required, MaxLength(100)] public string ExpenseType { get; set; } = "";
    // Invoice | Payment | Petty Cash | Salary | Equipment
    [MaxLength(100)] public string? ReferenceNo { get; set; }
    public Guid? ReferenceId { get; set; }
    [Column(TypeName = "decimal(18,2)")] public decimal Amount { get; set; }
    [MaxLength(10)] public string Currency { get; set; } = "USD";
    public DateTime ExpenseDate { get; set; }
    [MaxLength(300)] public string? VendorName { get; set; }
    [MaxLength(1000)] public string? Description { get; set; }
    [MaxLength(500)] public string? ReceiptPath { get; set; }
    public Guid? ApprovedById { get; set; }
    public Guid RecordedById  { get; set; }

    public BudgetWBS BudgetWBS { get; set; } = null!;
    public Project   Project   { get; set; } = null!;
    [ForeignKey(nameof(ApprovedById))] public User? ApprovedBy { get; set; }
    [ForeignKey(nameof(RecordedById))] public User  RecordedBy { get; set; } = null!;
}

// ─── Risk Management ───────────────────────────────────────────────────────

public class Risk : BaseEntity
{
    public Guid ProjectId { get; set; }
    [Required, MaxLength(30)]  public string RiskNumber { get; set; } = "";
    [Required, MaxLength(500)] public string Title { get; set; } = "";
    [MaxLength(2000)] public string? Description { get; set; }
    [MaxLength(100)]  public string? Category { get; set; }
    // Technical | Commercial | Environmental | Safety | Schedule | Resource | External
    [MaxLength(50)]   public string? RiskType { get; set; }  // Threat | Opportunity

    // Assessment
    [MaxLength(50)] public string Probability { get; set; } = "Medium";  // Low | Medium | High | VeryHigh
    [MaxLength(50)] public string Impact      { get; set; } = "Medium";
    public int? RiskScore { get; set; }   // Probability × Impact (1–25)
    [MaxLength(50)] public string? RiskLevel { get; set; }  // Low | Medium | High | Critical

    // Status lifecycle
    [Required, MaxLength(50)] public string Status { get; set; } = "Draft";
    // Draft | DeptReview | Analysis | MitigationPlanning | MitigationInProgress | Closed | Accepted

    // Mitigation
    [MaxLength(2000)] public string? MitigationPlan { get; set; }
    [MaxLength(50)]   public string? MitigationStrategy { get; set; }  // Avoid | Mitigate | Transfer | Accept
    [MaxLength(2000)] public string? ContingencyPlan { get; set; }
    [Column(TypeName = "decimal(18,2)")] public decimal? ContingencyBudget { get; set; }
    public Guid? RiskOwnerId { get; set; }
    public DateTime? ReviewDate { get; set; }
    public DateTime? ClosedAt { get; set; }
    [MaxLength(500)] public string? ClosureReason { get; set; }
    public Guid RaisedById { get; set; }

    public Project Project { get; set; } = null!;
    [ForeignKey(nameof(RaisedById))]  public User  RaisedBy  { get; set; } = null!;
    [ForeignKey(nameof(RiskOwnerId))] public User? RiskOwner { get; set; }
    public ICollection<RiskStakeholder> Stakeholders { get; set; } = new List<RiskStakeholder>();
    public ICollection<RiskUpdate>      Updates      { get; set; } = new List<RiskUpdate>();
}

public class RiskStakeholder
{
    public Guid RiskId { get; set; }
    public Guid UserId { get; set; }
    [MaxLength(100)] public string? Role { get; set; }
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;

    public Risk Risk { get; set; } = null!;
    public User User { get; set; } = null!;
}

public class RiskUpdate : BaseEntity
{
    public Guid RiskId { get; set; }
    [MaxLength(2000)] public string? Notes { get; set; }
    [MaxLength(50)] public string? NewStatus { get; set; }
    [MaxLength(50)] public string? NewProbability { get; set; }
    [MaxLength(50)] public string? NewImpact { get; set; }
    public int? NewRiskScore { get; set; }
    [MaxLength(2000)] public string? MitigationUpdate { get; set; }
    public new Guid UpdatedById { get; set; }

    public Risk Risk { get; set; } = null!;
    [ForeignKey(nameof(UpdatedById))] public User UpdatedBy { get; set; } = null!;
}
