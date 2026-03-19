namespace MMG.EPM.API.Domain.DTOs;

// ─── Auth ──────────────────────────────────────────────────────────────────

public record LoginRequest(string Email, string Password);
public record LoginResponse(string AccessToken, string RefreshToken, int ExpiresIn, UserDto User);
public record RefreshRequest(string RefreshToken);
public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public record UserDto(
    Guid Id, string FirstName, string LastName, string Email,
    string? Phone, string? Department, string? JobTitle,
    bool IsActive, DateTime? LastLoginAt, DateTime CreatedAt,
    List<string> Roles, List<string> Permissions);

public record CreateUserRequest(
    string FirstName, string LastName, string Email, string Password,
    string? Phone, string? Department, string? JobTitle, List<string> Roles);

public record UpdateUserRequest(string FirstName, string LastName, string? Phone, string? Department, string? JobTitle);
public record UpdateUserRolesRequest(List<string> Roles);

// ─── Projects ──────────────────────────────────────────────────────────────

public record ProjectListItemDto(
    Guid Id, string Name, string Code, string? Description,
    string Status, string? Country, string? Location,
    DateTime StartDate, DateTime? ExpectedEndDate,
    decimal? Budget, decimal OverallProgress,
    string? ProjectManagerName, DateTime CreatedAt);

public record ProjectDetailDto(
    Guid Id, string Name, string Code, string? Description,
    string Status, string? ProjectType, string? Country, string? Location, string? SBUCode,
    DateTime StartDate, DateTime? ExpectedEndDate, DateTime? ActualEndDate,
    decimal? Budget, string? Currency, string? ClientName, string? ClientContact,
    decimal OverallProgress,
    Guid? ProjectManagerId, string? ProjectManagerName,
    Guid? ProjectHeadId, string? ProjectHeadName,
    Guid? PlanningEngineerId, string? PlanningEngineerName,
    int TotalTasks, int CompletedTasks, int MemberCount, int OpenRisks,
    DateTime CreatedAt, DateTime UpdatedAt,
    List<ProjectMemberDto> Members);

public record ProjectMemberDto(Guid UserId, string UserName, string Email, string ProjectRole, DateTime JoinedAt);

public record CreateProjectRequest(
    string Name, string Code, string? Description,
    string? ProjectType, string? Country, string? Location,
    string StartDate, string? ExpectedEndDate,
    decimal? Budget, string? ClientName, string? ClientContact);

public record AddProjectMemberRequest(string Email, string ProjectRole);
public record UpdateProjectStatusRequest(string Status);

// ─── Tasks ─────────────────────────────────────────────────────────────────

public record TaskListItemDto(
    Guid Id, Guid ProjectId, string ProjectName,
    Guid? ParentTaskId, string? ParentTaskName,
    string Name, string? WbsCode, int Level,
    string Status, string Priority, decimal ProgressPercentage,
    DateTime? StartDate, DateTime? EndDate,
    decimal? EstimatedHours, decimal? ActualHours,
    Guid? AssigneeId, string? AssigneeName,
    bool IsMilestone, bool HasChildren);

public record TaskDetailDto(
    Guid Id, Guid ProjectId, string ProjectName,
    Guid? SubProjectId, Guid? ParentTaskId, string? ParentTaskName,
    string Name, string? Description, string? WbsCode, int Level,
    string Status, string Priority, decimal ProgressPercentage,
    DateTime? StartDate, DateTime? EndDate,
    decimal? EstimatedHours, decimal? ActualHours,
    decimal? EstimatedCost, decimal? ActualCost,
    Guid? AssigneeId, string? AssigneeName,
    bool IsMilestone, bool HasChildren,
    DateTime CreatedAt, DateTime UpdatedAt);

public record CreateTaskRequest(
    Guid ProjectId, Guid? ParentTaskId, Guid? SubProjectId,
    string Name, string? Description, string? WbsCode,
    string? StartDate, string? EndDate,
    string Priority, decimal? EstimatedHours,
    Guid? AssigneeId, bool IsMilestone = false);

public record UpdateTaskStatusRequest(string Status);

public record WorkProgressDto(
    Guid Id, Guid TaskId, string UpdatedByName,
    string? Notes, decimal ProgressPercentage, decimal? HoursLogged,
    DateTime ReportedAt, List<string> Photos);

public record AddWorkProgressRequest(string? Notes, decimal ProgressPercentage, decimal? HoursLogged);

// ─── Documents ─────────────────────────────────────────────────────────────

public record FolderDto(Guid Id, string Name, Guid? ParentId, int SortOrder, int DocumentCount);

public record DocumentDto(
    Guid Id, Guid ProjectId, string? ProjectName,
    Guid? FolderId, string Title, string? Description,
    string FileName, string? FileUrl, string? ContentType,
    long FileSize, string RevisionNumber, string DocumentType,
    string Status, string UploadedByName, DateTime CreatedAt);

public record ChangeRequestDto(
    Guid Id, string CrNumber, string Title, string? Description,
    string? Reason, string? Impact, decimal? CostImpact, int? ScheduleImpactDays,
    string Status, string ProjectName, string SubmittedByName,
    DateTime CreatedAt, DateTime? ReviewedAt, string? ReviewComments);

public record CreateChangeRequestRequest(
    string Title, string? Description, string? Reason, string? Impact,
    Guid? ProjectId, decimal? CostImpact, int? ScheduleImpactDays);

// ─── Procurement ───────────────────────────────────────────────────────────

public record MaterialRequestDto(
    Guid Id, string MrNumber, string Title, string? Justification,
    string Priority, DateTime? RequiredDate, string Status,
    Guid ProjectId, string ProjectName,
    string RequestedByName, DateTime CreatedAt,
    List<MRLineItemDto> Items);

public record MRLineItemDto(
    Guid Id, string Description, string Unit,
    decimal Quantity, decimal? EstimatedCost, decimal? DeliveredQuantity);

public record CreateMRRequest(
    Guid ProjectId, string Title, string? Justification,
    string Priority, string? RequiredDate,
    List<CreateMRItemRequest> Items);

public record CreateMRItemRequest(
    string Description, string Unit, decimal Quantity, decimal? EstimatedCost);

public record AdvanceMRRequest(string Action);

public record PurchaseOrderDto(
    Guid Id, string PoNumber, string VendorName, string ProjectName,
    decimal TotalAmount, string Currency, string Status,
    DateTime PoDate, DateTime? ExpectedDelivery);

public record VendorDto(
    Guid Id, string Name, string VendorCode, string? ContactPerson,
    string? Email, string? Phone, string? Country, string? Category,
    bool IsApproved, bool IsActive);

// ─── Inventory ─────────────────────────────────────────────────────────────

public record MaterialDto(
    Guid Id, string Name, string MaterialCode, string? CategoryName,
    string Unit, string? Description, string? Brand,
    decimal CurrentStock, decimal? ReorderLevel, decimal? StandardCost,
    bool IsLowStock);

public record StockLedgerDto(
    Guid Id, string MaterialName, string ProjectName,
    DateTime TransactionDate, string TransactionType,
    decimal Quantity, decimal? UnitCost, decimal? BalanceAfter,
    string? Notes, string RecordedByName);

public record SiteTransferDto(
    Guid Id, string MaterialName,
    string FromProjectName, string ToProjectName,
    decimal Quantity, string Status, DateTime TransferDate,
    string RequestedByName);

// ─── Resource ──────────────────────────────────────────────────────────────

public record ResourceDto(
    Guid Id, string Name, string? Code, string? ResourceTypeName,
    string? CalendarName, string? Location, string Status,
    decimal? CostPerHour, decimal? CostPerDay, string Currency,
    string? UserName, string? Make, string? Model);

public record ResourceAllocationDto(
    Guid Id, string ResourceName, string TaskName, string ProjectName,
    DateTime StartDate, DateTime EndDate,
    decimal AllocationPercent, decimal? PlannedHours, decimal? ActualHours,
    string Status);

// ─── Budget ────────────────────────────────────────────────────────────────

public record ProjectBudgetDto(
    Guid Id, string ProjectName, string BudgetVersion, string Status,
    decimal TotalApprovedBudget, decimal? RevisedBudget, string Currency,
    decimal TotalCommitted, decimal TotalExpended, decimal Balance,
    decimal BurnRate, DateTime? ApprovedAt, string? ApprovedByName);

public record BudgetWBSDto(
    Guid Id, Guid ProjectId, Guid? ParentId, string? WbsCode,
    string Description, string? CostCode, int Level,
    decimal BudgetAmount, decimal? RevisedAmount,
    decimal CommittedAmount, decimal ExpendedAmount,
    decimal BalanceAmount, decimal BurnRate, string Currency);

public record ExpenditureDto(
    Guid Id, string BudgetWbsDescription, string ProjectName,
    string ExpenseType, string? ReferenceNo, decimal Amount,
    string Currency, DateTime ExpenseDate,
    string? VendorName, string? Description, string RecordedByName);

public record CreateExpenditureRequest(
    Guid BudgetWBSId, Guid ProjectId, string ExpenseType,
    string? ReferenceNo, decimal Amount, string? ExpenseDate,
    string? VendorName, string? Description);

// ─── Risk ──────────────────────────────────────────────────────────────────

public record RiskDto(
    Guid Id, string RiskNumber, string Title, string? Description,
    string? Category, string? RiskType,
    string Probability, string Impact, int? RiskScore, string? RiskLevel,
    string Status, string? MitigationPlan, string? MitigationStrategy,
    string? ContingencyPlan, decimal? ContingencyBudget,
    string ProjectName, string RaisedByName, string? RiskOwnerName,
    DateTime? ReviewDate, DateTime? ClosedAt, DateTime CreatedAt);

public record CreateRiskRequest(
    Guid ProjectId, string Title, string? Description,
    string? Category, string? RiskType,
    string Probability, string Impact,
    string? MitigationPlan, string? MitigationStrategy,
    string? ContingencyPlan, decimal? ContingencyBudget,
    Guid? RiskOwnerId, string? ReviewDate);

public record UpdateRiskStatusRequest(string Status, string? Notes);

public record RiskUpdateDto(
    Guid Id, string? Notes, string? NewStatus,
    string? NewProbability, string? NewImpact, int? NewRiskScore,
    string? MitigationUpdate, string UpdatedByName, DateTime CreatedAt);

// ─── Dashboard ─────────────────────────────────────────────────────────────

public record DashboardDto(
    int TotalProjects, int ActiveProjects, int CompletedProjects,
    int TotalTasks, int TasksDueToday, int OverdueTasks,
    int OpenRisks, int CriticalRisks,
    int PendingMRs, int PendingDPRs,
    decimal BudgetUtilizationPercent,
    List<ProjectStatusCount> ProjectsByStatus,
    List<MonthlyTaskCount>   MonthlyTasks,
    List<TaskListItemDto>    MyTasks,
    List<ProjectListItemDto> RecentProjects,
    List<RiskDto>            TopRisks,
    List<BudgetSummaryItem>  BudgetSummary);

public record ProjectStatusCount(string Status, int Count);
public record MonthlyTaskCount(string Month, int Completed, int Created);
public record BudgetSummaryItem(string ProjectName, decimal Budget, decimal Expended, decimal BurnRate);

// ─── Common ────────────────────────────────────────────────────────────────

public record PagedResult<T>(List<T> Items, int TotalCount, int Page, int PageSize, int TotalPages);

public record ApiResponse<T>(bool Success, T? Data, string? Message, List<string>? Errors = null);

public record ApiError(string Message, string? Code = null, Dictionary<string, string[]>? ValidationErrors = null);
