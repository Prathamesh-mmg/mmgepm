using System.Net;
using System.Text.Json;
using Hangfire.Dashboard;
using Microsoft.AspNetCore.Diagnostics;

namespace MMG.EPM.API.Infrastructure.Middleware;

// ─── Global Exception Handler ───────────────────────────────────────────────

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    { _next = next; _logger = logger; }

    public async Task InvokeAsync(HttpContext ctx)
    {
        try
        {
            await _next(ctx);
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "Resource not found");
            ctx.Response.StatusCode  = (int)HttpStatusCode.NotFound;
            ctx.Response.ContentType = "application/json";
            await ctx.Response.WriteAsync(JsonSerializer.Serialize(new { message = ex.Message }));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Invalid operation");
            ctx.Response.StatusCode  = (int)HttpStatusCode.BadRequest;
            ctx.Response.ContentType = "application/json";
            await ctx.Response.WriteAsync(JsonSerializer.Serialize(new { message = ex.Message }));
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Unauthorized access");
            ctx.Response.StatusCode  = (int)HttpStatusCode.Forbidden;
            ctx.Response.ContentType = "application/json";
            await ctx.Response.WriteAsync(JsonSerializer.Serialize(new { message = "Access denied" }));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception");
            ctx.Response.StatusCode  = (int)HttpStatusCode.InternalServerError;
            ctx.Response.ContentType = "application/json";
            await ctx.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                message = "An unexpected error occurred. Please try again.",
                traceId = ctx.TraceIdentifier
            }));
        }
    }
}

// ─── Audit Middleware ───────────────────────────────────────────────────────

public class AuditMiddleware
{
    private readonly RequestDelegate _next;
    private static readonly HashSet<string> _auditMethods = new() { "POST", "PUT", "PATCH", "DELETE" };

    public AuditMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext ctx)
    {
        await _next(ctx);

        // Log state-changing requests after they complete
        if (_auditMethods.Contains(ctx.Request.Method) &&
            ctx.Response.StatusCode is >= 200 and < 300)
        {
            var logger = ctx.RequestServices.GetRequiredService<ILogger<AuditMiddleware>>();
            var user   = ctx.User?.Identity?.Name ?? "anonymous";
            logger.LogInformation("[AUDIT] {Method} {Path} by {User} → {Status}",
                ctx.Request.Method, ctx.Request.Path, user, ctx.Response.StatusCode);
        }
    }
}

// ─── Hangfire Auth Filter ───────────────────────────────────────────────────

public class HangfireAuthFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();
        // Allow only authenticated admins in production
        return httpContext.User.Identity?.IsAuthenticated == true
            && httpContext.User.IsInRole("Admin");
    }
}
