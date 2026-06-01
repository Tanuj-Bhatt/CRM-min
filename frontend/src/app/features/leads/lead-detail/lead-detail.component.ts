import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LeadService } from '../../../core/services/lead.service';
import { Lead, ActivityLog, ActivityType } from '../../../core/models/crm.models';

@Component({
  selector: 'app-lead-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="detail-container animate-fade-in" *ngIf="lead()">
      <!-- Page Navigation Header -->
      <div class="detail-header flex-between">
        <div class="breadcrumb">
          <a routerLink="/leads" class="back-link">◀ Back to Pipeline</a>
          <h1 class="lead-title">{{ lead()?.firstName }} {{ lead()?.lastName }}</h1>
          <span class="company-sub">{{ lead()?.companyName }}</span>
        </div>
        <div class="status-indicator">
          <span class="badge" [ngClass]="'badge-' + lead()?.status?.toLowerCase()">
            {{ lead()?.status }}
          </span>
        </div>
      </div>

      <!-- Detail Grid -->
      <div class="detail-grid">
        <!-- Column 1: Info Card and AI Assistant -->
        <div class="col-left">
          
          <!-- Profile Card -->
          <div class="glass-panel profile-card">
            <h3>Contact Credentials</h3>
            <div class="profile-details">
              <div class="detail-item">
                <span class="detail-label">Email Address</span>
                <span class="detail-val">{{ lead()?.email }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Phone Number</span>
                <span class="detail-val">{{ lead()?.phone || 'Not Provided' }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Lead Value</span>
                <span class="detail-val text-success font-semibold">
                  {{ lead()?.estimatedValue | currency:'USD':'symbol':'1.0-0' }}
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Pipeline Source</span>
                <span class="detail-val">{{ lead()?.source }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Assigned Representative</span>
                <span class="detail-val">👤 {{ lead()?.assignedToUserName || 'Unassigned' }}</span>
              </div>
            </div>
          </div>

          <!-- AI Assistant (Claude integration) -->
          <div class="glass-panel ai-card">
            <div class="ai-header flex-between">
              <h3>✨ Claude AI Sales Assistant</h3>
              <span class="ai-badge">Anthropic Claude</span>
            </div>
            <p class="text-secondary text-sm">Use AI models to summarize long activity history or draft custom follow-up emails based on client timeline.</p>

            <div class="ai-actions flex-center gap-10">
              <button 
                (click)="generateAISummary()" 
                [disabled]="isGeneratingSummary()" 
                class="btn btn-primary flex-1 btn-sm"
              >
                {{ isGeneratingSummary() ? 'Analyzing Timeline...' : 'Generate AI Summary' }}
              </button>
              <button 
                (click)="generateDraftEmail()" 
                [disabled]="isGeneratingEmail()" 
                class="btn btn-secondary flex-1 btn-sm"
              >
                {{ isGeneratingEmail() ? 'Drafting Copy...' : 'Draft Client Email' }}
              </button>
            </div>

            <!-- AI Summary Result -->
            <div *ngIf="aiSummary()" class="ai-result-box glass-panel animate-fade-in">
              <div class="result-header flex-between">
                <strong>Executive Summary:</strong>
                <button (click)="aiSummary.set('')" class="clear-result-btn">Clear</button>
              </div>
              <div class="result-text">{{ aiSummary() }}</div>
            </div>

            <!-- AI Email Draft Result -->
            <div *ngIf="aiEmail()" class="ai-result-box glass-panel animate-fade-in">
              <div class="result-header flex-between">
                <strong>Follow-Up Email Draft:</strong>
                <button (click)="copyEmailToClipboard()" class="clear-result-btn text-blue">
                  {{ emailCopied() ? 'Copied!' : 'Copy Text' }}
                </button>
              </div>
              <div class="result-text font-mono">{{ aiEmail() }}</div>
            </div>
          </div>

        </div>

        <!-- Column 2: Activity Timeline -->
        <div class="col-right">
          <!-- Add Activity Form -->
          <div class="glass-panel activity-form-card">
            <h3>Record New Interaction</h3>
            <form (ngSubmit)="submitActivity()" #activityForm="ngForm" class="activity-form">
              <div class="row-flex">
                <div class="form-group flex-1">
                  <label class="form-label">Interaction Type</label>
                  <select name="type" [(ngModel)]="newActivity.type" class="form-control">
                    <option value="Note">📝 Note / Memo</option>
                    <option value="Email">📧 Email Interaction</option>
                    <option value="Phone">📞 Phone Call</option>
                    <option value="Meeting">🤝 Meeting / Video Call</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Details / Call Logs</label>
                <textarea 
                  name="details" 
                  [(ngModel)]="newActivity.details" 
                  required 
                  class="form-control text-area" 
                  placeholder="Record summary of what was discussed, outcomes, or notes..."
                  rows="3"
                ></textarea>
              </div>
              <div class="flex-between">
                <span></span>
                <button type="submit" [disabled]="activityForm.invalid || isSavingActivity()" class="btn btn-primary btn-sm">
                  {{ isSavingActivity() ? 'Saving...' : 'Record Activity' }}
                </button>
              </div>
            </form>
          </div>

          <!-- Activity History Timeline -->
          <div class="timeline-card">
            <h3>Timeline Activities</h3>
            <div class="timeline">
              <div *ngFor="let act of activities()" class="timeline-item glass-panel">
                <div class="timeline-badge" [ngClass]="'timeline-badge-' + act.type.toLowerCase()">
                  {{ getBadgeEmoji(act.type) }}
                </div>
                <div class="timeline-content">
                  <div class="timeline-meta flex-between">
                    <span class="timeline-type">{{ act.type }} by {{ act.userName }}</span>
                    <span class="timeline-time text-muted">{{ act.createdAt | date:'MMM d, y, h:mm a' }}</span>
                  </div>
                  <p class="timeline-details">{{ act.details }}</p>
                </div>
              </div>

              <div *ngIf="activities().length === 0" class="empty-timeline-state glass-panel text-center">
                No activity history recorded for this lead yet. Use the card above to document call logs and emails.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .detail-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .detail-header {
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border-color);
    }

    .back-link {
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.8125rem;
      font-weight: 600;
      transition: color var(--transition-fast);
      display: block;
      margin-bottom: 8px;
    }

    .back-link:hover {
      color: var(--primary);
    }

    .lead-title {
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: white;
    }

    .company-sub {
      color: var(--secondary);
      font-size: 0.9375rem;
      font-weight: 600;
    }

    /* Detail Grid Layout */
    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1.5fr;
      gap: 24px;
      align-items: start;
    }

    @media (max-width: 900px) {
      .detail-grid {
        grid-template-columns: 1fr;
      }
    }

    .col-left, .col-right {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Cards */
    .profile-card, .ai-card, .activity-form-card {
      padding: 24px;
    }

    .profile-card h3, .ai-card h3, .activity-form-card h3, .timeline-card h3 {
      font-size: 1.05rem;
      font-weight: 800;
      margin-bottom: 20px;
      color: white;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .profile-details {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .detail-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .detail-val {
      font-size: 0.9375rem;
      color: var(--text-primary);
    }

    /* AI panel */
    .ai-badge {
      background-color: rgba(217, 70, 239, 0.1);
      color: #f472b6;
      border: 1px solid rgba(217, 70, 239, 0.2);
      font-size: 0.65rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .ai-card p {
      margin-bottom: 20px;
    }

    .ai-actions {
      margin-bottom: 20px;
    }

    .ai-result-box {
      padding: 16px;
      background-color: rgba(0, 0, 0, 0.15);
      border-color: rgba(217, 70, 239, 0.15);
      border-radius: var(--radius-sm);
      margin-bottom: 12px;
    }

    .result-header {
      margin-bottom: 10px;
      font-size: 0.8125rem;
      color: var(--text-primary);
    }

    .clear-result-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 0.75rem;
      cursor: pointer;
    }

    .clear-result-btn:hover {
      color: var(--danger);
    }

    .clear-result-btn.text-blue {
      color: var(--primary);
    }

    .clear-result-btn.text-blue:hover {
      color: var(--secondary);
    }

    .result-text {
      font-size: 0.875rem;
      color: var(--text-secondary);
      line-height: 1.5;
      white-space: pre-wrap;
    }

    .font-mono {
      font-family: monospace;
      background: rgba(0,0,0,0.3);
      padding: 10px;
      border-radius: 4px;
    }

    /* Forms */
    .text-area {
      resize: vertical;
      min-height: 80px;
    }

    .row-flex {
      display: flex;
      gap: 16px;
    }

    .flex-1 { flex: 1; }
    .flex-2 { flex: 2; }

    /* Timeline History */
    .timeline {
      display: flex;
      flex-direction: column;
      gap: 16px;
      position: relative;
      padding-left: 20px;
      border-left: 2px solid var(--border-color);
      margin-left: 10px;
      margin-top: 10px;
    }

    .timeline-item {
      position: relative;
      padding: 16px;
      background-color: var(--bg-secondary);
    }

    .timeline-badge {
      position: absolute;
      left: -32px;
      top: 16px;
      width: 24px;
      height: 24px;
      background-color: var(--bg-secondary);
      border: 2px solid var(--border-color);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      color: white;
    }

    .timeline-badge-note { border-color: var(--accent); background-color: rgba(217, 70, 239, 0.1); }
    .timeline-badge-email { border-color: var(--primary); background-color: rgba(99, 102, 241, 0.1); }
    .timeline-badge-phone { border-color: var(--secondary); background-color: rgba(13, 148, 136, 0.1); }
    .timeline-badge-meeting { border-color: var(--warning); background-color: rgba(245, 158, 11, 0.1); }
    .timeline-badge-aisummary { border-color: #ec4899; background-color: rgba(236, 72, 153, 0.1); }

    .timeline-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .timeline-meta {
      font-size: 0.8125rem;
    }

    .timeline-type {
      font-weight: 700;
      color: white;
    }

    .timeline-time {
      font-size: 0.75rem;
    }

    .timeline-details {
      font-size: 0.875rem;
      color: var(--text-secondary);
      line-height: 1.4;
    }

    .empty-timeline-state {
      padding: 40px 20px;
      color: var(--text-muted);
      font-size: 0.875rem;
    }
  `]
})
export class LeadDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly leadService = inject(LeadService);

  readonly lead = signal<Lead | null>(null);
  readonly activities = signal<ActivityLog[]>([]);
  
  // New Activity form
  newActivity = {
    type: 'Note',
    details: ''
  };

  // AI loading and output
  readonly isGeneratingSummary = signal(false);
  readonly isGeneratingEmail = signal(false);
  readonly isSavingActivity = signal(false);
  readonly aiSummary = signal('');
  readonly aiEmail = signal('');
  readonly emailCopied = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadLeadDetails(id);
    }
  }

  loadLeadDetails(id: string): void {
    this.leadService.getLeadById(id).subscribe({
      next: (data) => this.lead.set(data),
      error: (err) => console.error('Failed to load lead details', err)
    });

    this.leadService.getActivities(id).subscribe({
      next: (data) => {
        // Sort descending by creation date
        const sorted = [...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        this.activities.set(sorted);
      },
      error: (err) => console.error('Failed to load lead activities', err)
    });
  }

  submitActivity(): void {
    const currentLead = this.lead();
    if (!currentLead || !this.newActivity.details.trim()) return;

    this.isSavingActivity.set(true);

    this.leadService.addActivity(currentLead.id, this.newActivity).subscribe({
      next: (created) => {
        // Add to activities timeline list (pre-pend since it is sorted desc)
        this.activities.update(list => [created, ...list]);
        this.newActivity.details = '';
        this.isSavingActivity.set(false);
      },
      error: (err) => {
        console.error('Failed to record activity', err);
        this.isSavingActivity.set(false);
      }
    });
  }

  generateAISummary(): void {
    const currentLead = this.lead();
    if (!currentLead) return;

    this.isGeneratingSummary.set(true);
    this.aiSummary.set('');

    this.leadService.getAISummary(currentLead.id).subscribe({
      next: (res) => {
        this.aiSummary.set(res.summary);
        this.isGeneratingSummary.set(false);
        
        // Also record an activity log indicating that we generated an AI summary!
        const autoLog = {
          type: 'AISummary',
          details: `Generated Claude AI Client Summary: "${res.summary.substring(0, 100)}..."`
        };
        this.leadService.addActivity(currentLead.id, autoLog).subscribe({
          next: (created) => this.activities.update(list => [created, ...list])
        });
      },
      error: (err) => {
        this.aiSummary.set('Failed to generate summary: ' + (err.error?.message || 'Unexpected backend error.'));
        this.isGeneratingSummary.set(false);
      }
    });
  }

  generateDraftEmail(): void {
    const currentLead = this.lead();
    if (!currentLead) return;

    this.isGeneratingEmail.set(true);
    this.aiEmail.set('');
    this.emailCopied.set(false);

    this.leadService.getDraftEmail(currentLead.id).subscribe({
      next: (res) => {
        this.aiEmail.set(res.email);
        this.isGeneratingEmail.set(false);
      },
      error: (err) => {
        this.aiEmail.set('Failed to draft email: ' + (err.error?.message || 'Unexpected backend error.'));
        this.isGeneratingEmail.set(false);
      }
    });
  }

  copyEmailToClipboard(): void {
    const emailText = this.aiEmail();
    if (!emailText) return;

    navigator.clipboard.writeText(emailText).then(() => {
      this.emailCopied.set(true);
      setTimeout(() => this.emailCopied.set(false), 2000);
    });
  }

  getBadgeEmoji(type: string): string {
    switch (type) {
      case 'Note': return '📝';
      case 'Email': return '📧';
      case 'Phone': return '📞';
      case 'Meeting': return '🤝';
      case 'AISummary': return '✨';
      default: return '💬';
    }
  }
}
