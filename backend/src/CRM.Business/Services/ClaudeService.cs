using System;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using CRM.IDataProvider;
using CRM.Model.Entities;
using CRM.Model.Enums;

namespace CRM.Business.Services;

public class ClaudeService : IClaudeService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _config;

    public ClaudeService(IUnitOfWork unitOfWork, IHttpClientFactory httpClientFactory, IConfiguration config)
    {
        _unitOfWork = unitOfWork;
        _httpClientFactory = httpClientFactory;
        _config = config;
    }

    public async Task<string> SummarizeLeadActivitiesAsync(Guid leadId, Guid orgId)
    {
        var lead = await _unitOfWork.Leads.GetLeadWithActivitiesAsync(leadId, orgId);
        if (lead == null) return "Lead not found.";

        if (!lead.Activities.Any())
        {
            return "No activities recorded for this lead yet.";
        }

        var apiKey = _config["Claude:ApiKey"] ?? _config["ClaudeApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey) || apiKey.Contains("YOUR_CLAUDE_API_KEY"))
        {
            return $"[Claude Mock Summary - API Key Missing]\n\n" +
                   $"Lead: {lead.FirstName} {lead.LastName} ({lead.CompanyName})\n" +
                   $"Status: {lead.Status}\n\n" +
                   $"Recent Activity Summary:\n" +
                   $"- The client was added to the system as a new lead.\n" +
                   $"- There are {lead.Activities.Count} historical interactions recorded.\n" +
                   $"- Estimated value is {lead.EstimatedValue:C}.\n\n" +
                   $"Configure the Claude API Key in appsettings.json to see live AI summaries.";
        }

        var activityDescriptions = string.Join("\n", lead.Activities.Select(a => 
            $"[{a.CreatedAt:yyyy-MM-dd HH:mm}] {a.Type}: {a.Details}"));

        var prompt = $"You are an expert CRM assistant. Summarize the following client activity timeline for the lead '{lead.FirstName} {lead.LastName}' at '{lead.CompanyName}'. " +
                     $"Provide a brief, high-impact bulleted executive summary of their status and recommend the immediate next steps.\n\n" +
                     $"Activity logs:\n{activityDescriptions}";

        try
        {
            return await CallClaudeApiAsync(apiKey, prompt);
        }
        catch (Exception ex)
        {
            return $"Error generating AI summary: {ex.Message}";
        }
    }

    public async Task<string> DraftFollowUpEmailAsync(Guid leadId, Guid orgId)
    {
        var lead = await _unitOfWork.Leads.GetLeadWithActivitiesAsync(leadId, orgId);
        if (lead == null) return "Lead not found.";

        var apiKey = _config["Claude:ApiKey"] ?? _config["ClaudeApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey) || apiKey.Contains("YOUR_CLAUDE_API_KEY"))
        {
            return $"Subject: Continuing our conversation - {lead.CompanyName}\n\n" +
                   $"Dear {lead.FirstName},\n\n" +
                   $"I hope this email finds you well. I wanted to follow up regarding our recent discussions. " +
                   $"We are excited about the possibility of collaborating with {lead.CompanyName}.\n\n" +
                   $"Please let me know if you have 10 minutes for a brief call next week to discuss our next steps.\n\n" +
                   $"Best regards,\n" +
                   $"[Your Name]\n\n" +
                   $"[Claude Mock Email - Configure API Key in appsettings.json for customized drafts]";
        }

        var activityDescriptions = string.Join("\n", lead.Activities.Take(5).Select(a => 
            $"[{a.CreatedAt:yyyy-MM-dd}] {a.Type}: {a.Details}"));

        var prompt = $"Draft a professional, warm follow-up email to '{lead.FirstName} {lead.LastName}' ({lead.Email}) at '{lead.CompanyName}'. " +
                     $"The lead status is currently '{lead.Status}' and estimated value is {lead.EstimatedValue:C}.\n" +
                     $"Reference the context of recent activities if applicable:\n{activityDescriptions}\n\n" +
                     $"Provide ONLY the subject line and email body. Keep it concise, engaging, and professional.";

        try
        {
            return await CallClaudeApiAsync(apiKey, prompt);
        }
        catch (Exception ex)
        {
            return $"Error generating email draft: {ex.Message}";
        }
    }

    private async Task<string> CallClaudeApiAsync(string apiKey, string prompt)
    {
        var client = _httpClientFactory.CreateClient();
        
        var request = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages");
        request.Headers.Add("x-api-key", apiKey);
        request.Headers.Add("anthropic-version", "2023-06-01");
        
        var payload = new ClaudeMessageRequest
        {
            Model = "claude-3-5-sonnet-20241022",
            MaxTokens = 1024,
            Messages = new[]
            {
                new ClaudeMessage { Role = "user", Content = prompt }
            }
        };

        var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        request.Content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await client.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            var errContent = await response.Content.ReadAsStringAsync();
            throw new Exception($"Anthropic API returned status {response.StatusCode}: {errContent}");
        }

        var responseContent = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<ClaudeMessageResponse>(responseContent, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        return result?.Content?.FirstOrDefault()?.Text ?? "No response received from AI model.";
    }

    private class ClaudeMessageRequest
    {
        [JsonPropertyName("model")]
        public string Model { get; set; } = "claude-3-5-sonnet-20241022";
        
        [JsonPropertyName("max_tokens")]
        public int MaxTokens { get; set; } = 1024;
        
        [JsonPropertyName("messages")]
        public ClaudeMessage[] Messages { get; set; } = null!;
    }

    private class ClaudeMessage
    {
        [JsonPropertyName("role")]
        public string Role { get; set; } = "user";
        
        [JsonPropertyName("content")]
        public string Content { get; set; } = string.Empty;
    }

    private class ClaudeMessageResponse
    {
        public ClaudeContent[] Content { get; set; } = null!;
    }

    private class ClaudeContent
    {
        public string Type { get; set; } = string.Empty;
        public string Text { get; set; } = string.Empty;
    }
}
