using System;
using System.Collections.Generic;

namespace CRM.Model.Entities;

public class Organization
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string SubscriptionTier { get; set; } = "Free";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Lead> Leads { get; set; } = new List<Lead>();
    public ICollection<Contact> Contacts { get; set; } = new List<Contact>();
}
