import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LeadService } from '../../../core/services/lead.service';
import { ToastService } from '../../../core/services/toast.service';
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
        <div class="header-actions flex-center gap-10">
          <button (click)="openEmailStudio(false)" class="btn btn-primary btn-sm">
            <span>✉️</span> Compose Email
          </button>
          <div class="status-indicator">
            <span class="badge" [ngClass]="'badge-' + lead()?.status?.toLowerCase()">
              {{ lead()?.status }}
            </span>
          </div>
        </div>
      </div>

      <!-- Detail Grid -->
      <div class="detail-grid">
        <!-- Column 1: Info Card and AI Assistant -->
        <div class="col-left">
          
          <!-- Profile Card -->
          <div class="glass-panel profile-card">
            <h3>Deal & Contact Overview</h3>
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
                <span class="detail-label">Estimated Deal Value</span>
                <span class="detail-val text-success font-semibold">
                  {{ lead()?.estimatedValue | currency:'USD':'symbol':'1.0-0' }}
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Pipeline Source</span>
                <span class="detail-val">{{ lead()?.source }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Target Close Date</span>
                <span class="detail-val text-info">
                  {{ lead()?.expectedCloseDate ? (lead()?.expectedCloseDate | date:'mediumDate') : 'Not Set' }}
                </span>
              </div>
              <div *ngIf="lead()?.closeReason" class="detail-item">
                <span class="detail-label">Close Reason</span>
                <span class="detail-val" style="color: #f472b6;">{{ lead()?.closeReason }}</span>
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
              <span class="ai-badge">Claude 3.5 Sonnet</span>
            </div>
            <p class="text-secondary text-sm">Use AI models to summarize interaction timelines or generate customized follow-up emails.</p>

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

            <!-- AI Email Draft Result with Email Studio Launcher -->
            <div *ngIf="aiEmail()" class="ai-result-box glass-panel animate-fade-in">
              <div class="result-header flex-between">
                <strong>Generated Follow-Up Email:</strong>
                <div class="draft-actions flex-center gap-10">
                  <button (click)="copyEmailToClipboard()" class="clear-result-btn text-blue">
                    {{ emailCopied() ? 'Copied!' : 'Copy' }}
                  </button>
                  <button (click)="openEmailStudio(true)" class="btn btn-primary btn-sm" style="font-size: 0.75rem; padding: 4px 10px;">
                    🚀 Open in Email Studio
                  </button>
                </div>
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
                  placeholder="Record summary of discussion, deal blockers, commitments..."
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
            <h3>Timeline Activities ({{ activities().length }})</h3>
            <div class="timeline">
              <div *ngFor="let act of activities()" class="timeline-item glass-panel">
                <div class="timeline-badge" [ngClass]="'timeline-badge-' + act.type.toLowerCase()">
                  {{ getBadgeEmoji(act.type) }}
                </div>
                <div class="timeline-content">
                  <div class="timeline-meta flex-between">
                    <span class="timeline-type">{{ act.type }} · {{ act.userName }}</span>
                    <span class="timeline-time text-muted">{{ act.createdAt | date:'MMM d, y, h:mm a' }}</span>
                  </div>
                  <p class="timeline-details">{{ act.details }}</p>
                </div>
              </div>

              <div *ngIf="activities().length === 0" class="empty-timeline-state glass-panel text-center">
                No activity history recorded for this lead yet. Record call logs or compose emails above.
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Email Studio Modal -->
      <div *ngIf="isEmailModalOpen()" class="modal-backdrop flex-center">
        <div class="modal-card glass-panel animate-fade-in" style="max-width: 620px;">
          <div class="modal-header flex-between">
            <h2>✉️ Interactive Email Studio</h2>
            <button (click)="closeEmailStudio()" class="close-btn">✕</button>
          </div>

          <form (ngSubmit)="sendEmailFromStudio()" class="modal-form">
            <div class="form-group">
              <label class="form-label">Recipient Email *</label>
              <input type="email" [(ngModel)]="emailRecipient" name="recipient" required class="form-control" />
            </div>

            <div class="form-group">
              <label class="form-label">Subject Line *</label>
              <input type="text" [(ngModel)]="emailSubject" name="subject" required class="form-control" placeholder="Follow-up on collaboration" />
            </div>

            <div class="form-group">
              <label class="form-label">Email Message Body *</label>
              <textarea 
                [(ngModel)]="emailBody" 
                name="body" 
                required 
                class="form-control text-area font-mono" 
                rows="8"
                placeholder="Write your email message..."
              ></textarea>
            </div>

            <div class="modal-footer flex-between">
              <button type="button" (click)="closeEmailStudio()" class="btn btn-outline">Cancel</button>
              <button type="submit" [disabled]="!emailSubject || !emailBody || isSendingEmail()" class="btn btn-primary">
                {{ isSendingEmail() ? 'Dispatching...' : '🚀 Send Email Now' }}
              </button>
            </div>
          </form>
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
      margin-bottom: 4px;
    }

    .company-sub {
      color: var(--text-secondary);
      font-size: 1.1rem;
      font-weight: 500;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: 380px 1fr;
      gap: 24px;
    }

    @media (max-width: 1024px) {
      .detail-grid {
        grid-template-columns: 1fr;
      }
    }

    .col-left {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .profile-card {
      padding: 24px;
      border-radius: var(--radius-md);
    }

    .profile-card h3 {
      font-size: 1.1rem;
      font-weight: 700;
      margin-bottom: 16px;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 12px;
    }

    .profile-details {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .detail-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      font-weight: 600;
    }

    .detail-val {
      font-size: 0.95rem;
      color: var(--text-primary);
    }

    /* AI Card */
    .ai-card {
      padding: 24px;
      border-radius: var(--radius-md);
      background: linear-gradient(180deg, rgba(99, 102, 241, 0.05) 0%, rgba(17, 24, 39, 0.7) 100%);
      border: 1px solid rgba(99, 102, 241, 0.2);
    }

    .ai-header {
      margin-bottom: 8px;
    }

    .ai-badge {
      font-size: 0.7rem;
      padding: 2px 8px;
      background: rgba(99, 102, 241, 0.2);
      border: 1px solid var(--primary);
      border-radius: 9999px;
      color: #c7d2fe;
      font-weight: 600;
    }

    .ai-actions {
      margin-top: 16px;
    }

    .ai-result-box {
      margin-top: 16px;
      padding: 16px;
      background: rgba(0, 0, 0, 0.4);
      border-radius: var(--radius-sm);
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .result-header {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .clear-result-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 0.75rem;
    }

    .clear-result-btn:hover {
      color: white;
    }

    .result-text {
      font-size: 0.85rem;
      line-height: 1.5;
      white-space: pre-wrap;
      color: #e2e8f0;
    }

    .font-mono {
      font-family: monospace;
      font-size: 0.8rem;
    }

    /* Col Right */
    .col-right {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .activity-form-card {
      padding: 24px;
      border-radius: var(--radius-md);
    }

    .activity-form-card h3 {
      font-size: 1.1rem;
      font-weight: 700;
      margin-bottom: 16px;
    }

    .text-area {
      resize: vertical;
    }

    /* Timeline */
    .timeline-card h3 {
      font-size: 1.1rem;
      font-weight: 700;
      margin-bottom: 16px;
    }

    .timeline {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .timeline-item {
      display: flex;
      gap: 16px;
      padding: 16px;
      border-radius: var(--radius-sm);
    }

    .timeline-badge {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      flex-shrink: 0;
    }

    .timeline-badge-email { border-color: var(--primary); background: rgba(99, 102, 241, 0.1); }
    .timeline-badge-phone { border-color: var(--success); background: rgba(16, 185, 129, 0.1); }
    .timeline-badge-meeting { border-color: var(--accent); background: rgba(217, 70, 239, 0.1); }
    .timeline-badge-aisummary { border-color: #0ea5e9; background: rgba(14, 165, 233, 0.1); }

    .timeline-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .timeline-type {
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--text-primary);
    }

    .timeline-time {
      font-size: 0.75rem;
    }

    .timeline-details {
      font-size: 0.85rem;
      line-height: 1.5;
      color: var(--text-secondary);
      white-space: pre-wrap;
    }

    .empty-timeline-state {
      padding: 40px 20px;
      color: var(--text-muted);
      border-radius: var(--radius-sm);
    }

    /* Modal Backdrop */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      z-index: 1000;
    }

    .modal-card {
      width: 90%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
      padding: 28px;
      border-radius: var(--radius-lg);
    }

    .modal-header h2 {
      font-size: 1.25rem;
      font-weight: 700;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 1.25rem;
      cursor: pointer;
    }

    .close-btn:hover {
      color: white;
    }

    .modal-footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
    }
  `]
})
export class LeadDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly leadService = inject(LeadService);
  private readonly toastService = inject(ToastService);

  readonly lead = signal<Lead | null>(null);
  readonly activities = signal<ActivityLog[]>([]);

  // AI Assistant states
  readonly isGeneratingSummary = signal(false);
  readonly isGeneratingEmail = signal(false);
  readonly aiSummary = signal('');
  readonly aiEmail = signal('');
  readonly emailCopied = signal(false);

  // Email Studio states
  readonly isEmailModalOpen = signal(false);
  readonly isSendingEmail = signal(false);
  emailRecipient = '';
  emailSubject = '';
  emailBody = '';

  // New activity form
  readonly isSavingActivity = signal(false);
  newActivity = {
    type: 'Note' as ActivityType,
    details: ''
  };

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadLeadDetails(id);
    }
  }

  loadLeadDetails(id: string): void {
    this.leadService.getLeadById(id).subscribe({
      next: (data) => this.lead.set(data),
      error: () => this.toastService.error('Error', 'Failed to load lead details.')
    });

    this.leadService.getActivities(id).subscribe({
      next: (data) => {
        const sorted = [...data].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        this.activities.set(sorted);
      },
      error: () => console.error('Failed to load activities')
    });
  }

  submitActivity(): void {
    const currentLead = this.lead();
    if (!currentLead || !this.newActivity.details.trim()) return;

    this.isSavingActivity.set(true);

    this.leadService.addActivity(currentLead.id, this.newActivity).subscribe({
      next: (created) => {
        this.activities.update(list => [created, ...list]);
        this.newActivity.details = '';
        this.isSavingActivity.set(false);
        this.toastService.success('Interaction Logged', `${created.type} recorded.`);
      },
      error: () => {
        this.isSavingActivity.set(false);
        this.toastService.error('Error', 'Failed to log interaction.');
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
        this.toastService.info('AI Summary Generated', 'Timeline synthesized.');
      },
      error: (err) => {
        this.aiSummary.set('Failed to generate summary: ' + (err.error?.message || 'Error occurred.'));
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
        this.toastService.info('Email Drafted', 'Claude composed sales follow-up.');
      },
      error: (err) => {
        this.aiEmail.set('Failed to draft email: ' + (err.error?.message || 'Error occurred.'));
        this.isGeneratingEmail.set(false);
      }
    });
  }

  copyEmailToClipboard(): void {
    const emailText = this.aiEmail();
    if (!emailText) return;

    navigator.clipboard.writeText(emailText).then(() => {
      this.emailCopied.set(true);
      this.toastService.success('Copied', 'Email draft copied to clipboard.');
      setTimeout(() => this.emailCopied.set(false), 2000);
    });
  }

  openEmailStudio(fromDraft = false): void {
    const currentLead = this.lead();
    if (!currentLead) return;

    this.emailRecipient = currentLead.email;

    if (fromDraft && this.aiEmail()) {
      const fullText = this.aiEmail();
      const lines = fullText.split('\n');
      const subjectLine = lines.find(l => l.toLowerCase().startsWith('subject:'));
      if (subjectLine) {
        this.emailSubject = subjectLine.replace(/^subject:\s*/i, '').trim();
        this.emailBody = lines.filter(l => !l.toLowerCase().startsWith('subject:')).join('\n').trim();
      } else {
        this.emailSubject = `Following up with ${currentLead.companyName}`;
        this.emailBody = fullText;
      }
    } else {
      this.emailSubject = `Following up with ${currentLead.companyName}`;
      this.emailBody = `Dear ${currentLead.firstName},\n\nI hope this email finds you well.\n\nBest regards,\n`;
    }

    this.isEmailModalOpen.set(true);
  }

  closeEmailStudio(): void {
    this.isEmailModalOpen.set(false);
  }

  sendEmailFromStudio(): void {
    const currentLead = this.lead();
    if (!currentLead) return;

    this.isSendingEmail.set(true);

    const emailDto = {
      recipientEmail: this.emailRecipient,
      subject: this.emailSubject,
      body: this.emailBody
    };

    this.leadService.sendEmail(currentLead.id, emailDto).subscribe({
      next: (res) => {
        this.activities.update(list => [res.activity, ...list]);
        this.isSendingEmail.set(false);
        this.closeEmailStudio();
        this.toastService.success('Email Sent', `Message dispatched to ${this.emailRecipient}.`);
      },
      error: (err) => {
        this.isSendingEmail.set(false);
        this.toastService.error('Send Failed', err?.error?.message || 'Could not dispatch email.');
      }
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
