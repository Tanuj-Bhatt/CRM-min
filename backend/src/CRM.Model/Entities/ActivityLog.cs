using System;
using CRM.Model.Enums;

namespace CRM.Model.Entities;

public class ActivityLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid? LeadId { get; set; }
    public Lead? Lead { get; set; }
    
    public Guid? ContactId { get; set; }
    public Contact? Contact { get; set; }
    
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    
    public ActivityType Type { get; set; } = ActivityType.Note;
    public string Details { get; set; } = string.Empty;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
