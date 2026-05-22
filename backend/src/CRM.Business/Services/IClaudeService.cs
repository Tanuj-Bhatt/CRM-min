using System;
using System.Threading.Tasks;

namespace CRM.Business.Services;

public interface IClaudeService
{
    Task<string> SummarizeLeadActivitiesAsync(Guid leadId, Guid orgId);
    Task<string> DraftFollowUpEmailAsync(Guid leadId, Guid orgId);
}
