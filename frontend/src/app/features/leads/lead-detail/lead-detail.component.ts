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
      <div class="detail-header">
        <a routerLink="/leads" class="back-link">◀ Back to Pipeline</a>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
          <div>
            <h1 class="lead-title">{{ lead()?.firstName }} {{ lead()?.lastName }}</h1>
            <span class="company-sub">{{ lead()?.companyName }}</span>
          </div>
          <span class="badge" [ngClass]="'badge-' + lead()?.status?.toLowerCase()">{{ lead()?.status }}</span>
        </div>
      </div>

      <div class="detail-grid">
        <!-- Left column -->
        <div class="col-left">
          <!-- Profile -->
          <div class="glass-panel info-card">
            <h3 class="card-title">Contact Info</h3>
            <div class="info-list">
              <div class="info-item"><span class="info-label">Email</span><span class="info-val">{{ lead()?.email }}</span></div>
              <div class="info-item"><span class="info-label">Phone</span><span class="info-val">{{ lead()?.phone || 'Not provided' }}</span></div>
              <div class="info-item"><span class="info-label">Lead Value</span><span class="info-val text-success font-semibold">{{ lead()?.estimatedValue | currency:'USD':'symbol':'1.0-0' }}</span></div>
              <div class="info-item"><span class="info-label">Source</span><span class="info-val">{{ lead()?.source }}</span></div>
              <div class="info-item"><span class="info-label">Assigned To</span><span class="info-val">👤 {{ lead()?.assignedToUserName || 'Unassigned' }}</span></div>
            </div>
          </div>

          <!-- AI Assistant -->
          <div class="glass-panel ai-card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <h3 class="card-title" style="margin:0">✨ AI Sales Assistant</h3>
              <span class="ai-badge">Anthropic Claude</span>
            </div>
            <p class="text-secondary text-sm" style="margin-bottom:16px">Summarize activity history or draft a follow-up email for this lead.</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button (click)="generateAISummary()" [disabled]="isGeneratingSummary()" class="btn btn-primary btn-sm" style="flex:1;min-width:120px">
                {{ isGeneratingSummary() ? 'Analyzing...' : 'AI Summary' }}
              </button>
              <button (click)="generateDraftEmail()" [disabled]="isGeneratingEmail()" class="btn btn-secondary btn-sm" style="flex:1;min-width:120px">
                {{ isGeneratingEmail() ? 'Drafting...' : 'Draft Email' }}
              </button>
            </div>
            <div *ngIf="aiSummary()" class="ai-result animate-fade-in">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <strong style="font-size:.8rem">Executive Summary</strong>
                <button (click)="aiSummary.set('')" class="clear-btn">✕ Clear</button>
              </div>
              <p class="result-text">{{ aiSummary() }}</p>
            </div>
            <div *ngIf="aiEmail()" class="ai-result animate-fade-in">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <strong style="font-size:.8rem">Email Draft</strong>
                <button (click)="copyEmailToClipboard()" class="clear-btn" style="color:var(--primary)">{{ emailCopied() ? '✓ Copied' : '⎘ Copy' }}</button>
              </div>
              <pre class="result-text email-pre">{{ aiEmail() }}</pre>
            </div>
          </div>
        </div>

        <!-- Right column -->
        <div class="col-right">
          <!-- New Activity Form -->
          <div class="glass-panel info-card">
            <h3 class="card-title">Record Interaction</h3>
            <form (ngSubmit)="submitActivity()" #activityForm="ngForm">
              <div class="form-group">
                <label class="form-label">Type</label>
                <select name="type" [(ngModel)]="newActivity.type" class="form-control">
                  <option value="Note">📝 Note</option>
                  <option value="Email">📧 Email</option>
                  <option value="Phone">📞 Phone Call</option>
                  <option value="Meeting">🤝 Meeting</option>
                </select>
              </div>
              <div class="form-group" style="margin-bottom:12px">
                <label class="form-label">Details</label>
                <textarea name="details" [(ngModel)]="newActivity.details" required class="form-control" placeholder="Record what was discussed..." rows="3" style="resize:vertical;min-height:70px"></textarea>
              </div>
              <div style="display:flex;justify-content:flex-end">
                <button type="submit" [disabled]="activityForm.invalid || isSavingActivity()" class="btn btn-primary btn-sm">
                  {{ isSavingActivity() ? 'Saving...' : 'Record Activity' }}
                </button>
              </div>
            </form>
          </div>

          <!-- Timeline -->
          <div class="timeline-wrap">
            <h3 class="card-title">Activity Timeline</h3>
            <div class="timeline">
              <div *ngFor="let act of activities()" class="timeline-item glass-panel">
                <div class="tl-dot" [ngClass]="'dot-' + act.type.toLowerCase()">{{ getBadgeEmoji(act.type) }}</div>
                <div class="tl-content">
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
                    <span class="tl-type">{{ act.type }} · {{ act.userName }}</span>
                    <span class="tl-time">{{ act.createdAt | date:'MMM d, y, h:mm a' }}</span>
                  </div>
                  <p class="tl-details">{{ act.details }}</p>
                </div>
              </div>
              <div *ngIf="activities().length === 0" class="glass-panel" style="padding:36px 20px;text-align:center">
                <p class="text-muted text-sm">No activity recorded yet. Use the form above to log interactions.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .detail-container{display:flex;flex-direction:column;gap:22px}
    .detail-header{padding-bottom:18px;border-bottom:1px solid var(--border-color)}
    .back-link{display:inline-block;color:var(--text-secondary);text-decoration:none;font-size:.8rem;font-weight:600;margin-bottom:10px;transition:color var(--transition-fast)}
    .back-link:hover{color:var(--primary)}
    .lead-title{font-size:1.65rem;font-weight:800;letter-spacing:-.03em;color:var(--text-primary)}
    .company-sub{color:var(--secondary);font-size:.9rem;font-weight:600}
    .detail-grid{display:grid;grid-template-columns:1fr 1.5fr;gap:20px;align-items:start}
    .col-left,.col-right{display:flex;flex-direction:column;gap:18px}
    .info-card{padding:20px}
    .card-title{font-size:.85rem;font-weight:700;color:var(--text-primary);text-transform:uppercase;letter-spacing:.06em;margin-bottom:16px}
    .info-list{display:flex;flex-direction:column;gap:13px}
    .info-item{display:flex;flex-direction:column;gap:3px}
    .info-label{font-size:.7rem;color:var(--text-muted);text-transform:uppercase;font-weight:600;letter-spacing:.03em}
    .info-val{font-size:.9rem;color:var(--text-primary)}
    .ai-card{padding:20px}
    .ai-badge{background:rgba(217,70,239,.1);color:#f472b6;border:1px solid rgba(217,70,239,.2);font-size:.6rem;font-weight:700;padding:2px 7px;border-radius:4px;letter-spacing:.04em}
    .ai-result{background:var(--input-bg);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:13px;margin-top:13px}
    .clear-btn{background:transparent;border:none;color:var(--text-muted);font-size:.72rem;cursor:pointer;padding:2px 5px;border-radius:3px;transition:color var(--transition-fast)}
    .clear-btn:hover{color:var(--danger)}
    .result-text{font-size:.825rem;color:var(--text-secondary);line-height:1.55;white-space:pre-wrap}
    .email-pre{font-family:monospace;background:var(--bg-tertiary);padding:10px;border-radius:4px;font-size:.78rem;overflow-x:auto}
    .timeline-wrap{display:flex;flex-direction:column;gap:14px}
    .timeline{display:flex;flex-direction:column;gap:12px;padding-left:18px;border-left:2px solid var(--border-color);margin-left:10px}
    .timeline-item{position:relative;padding:14px}
    .tl-dot{position:absolute;left:-29px;top:14px;width:22px;height:22px;background:var(--bg-secondary);border:2px solid var(--border-color);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.7rem}
    .dot-note{border-color:var(--accent);background:rgba(217,70,239,.08)}
    .dot-email{border-color:var(--primary);background:rgba(99,102,241,.08)}
    .dot-phone{border-color:var(--secondary);background:rgba(13,148,136,.08)}
    .dot-meeting{border-color:var(--warning);background:rgba(245,158,11,.08)}
    .dot-aisummary{border-color:#ec4899;background:rgba(236,72,153,.08)}
    .tl-content{display:flex;flex-direction:column;gap:6px}
    .tl-type{font-size:.78rem;font-weight:700;color:var(--text-primary)}
    .tl-time{font-size:.7rem;color:var(--text-muted);white-space:nowrap}
    .tl-details{font-size:.825rem;color:var(--text-secondary);line-height:1.45}
    @media(max-width:900px){.detail-grid{grid-template-columns:1fr}}
    @media(max-width:480px){.lead-title{font-size:1.3rem}}
  `]
})
export class LeadDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly leadService = inject(LeadService);

  readonly lead = signal<Lead | null>(null);
  readonly activities = signal<ActivityLog[]>([]);
  readonly isGeneratingSummary = signal(false);
  readonly isGeneratingEmail = signal(false);
  readonly isSavingActivity = signal(false);
  readonly aiSummary = signal('');
  readonly aiEmail = signal('');
  readonly emailCopied = signal(false);
  newActivity = { type: 'Note', details: '' };

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadLeadDetails(id);
  }

  loadLeadDetails(id: string): void {
    this.leadService.getLeadById(id).subscribe({ next: (d) => this.lead.set(d), error: (e) => console.error(e) });
    this.leadService.getActivities(id).subscribe({
      next: (d) => this.activities.set([...d].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())),
      error: (e) => console.error(e)
    });
  }

  submitActivity(): void {
    const l = this.lead();
    if (!l || !this.newActivity.details.trim()) return;
    this.isSavingActivity.set(true);
    this.leadService.addActivity(l.id, this.newActivity).subscribe({
      next: (c) => { this.activities.update(list => [c, ...list]); this.newActivity.details = ''; this.isSavingActivity.set(false); },
      error: (e) => { console.error(e); this.isSavingActivity.set(false); }
    });
  }

  generateAISummary(): void {
    const l = this.lead();
    if (!l) return;
    this.isGeneratingSummary.set(true);
    this.aiSummary.set('');
    this.leadService.getAISummary(l.id).subscribe({
      next: (res) => {
        this.aiSummary.set(res.summary);
        this.isGeneratingSummary.set(false);
        this.leadService.addActivity(l.id, { type: 'AISummary', details: `Generated Claude AI Summary: "${res.summary.substring(0, 100)}..."` }).subscribe({ next: (c) => this.activities.update(list => [c, ...list]) });
      },
      error: (e) => { this.aiSummary.set('Failed: ' + (e.error?.message || 'Unexpected error.')); this.isGeneratingSummary.set(false); }
    });
  }

  generateDraftEmail(): void {
    const l = this.lead();
    if (!l) return;
    this.isGeneratingEmail.set(true);
    this.aiEmail.set('');
    this.emailCopied.set(false);
    this.leadService.getDraftEmail(l.id).subscribe({
      next: (res) => { this.aiEmail.set(res.email); this.isGeneratingEmail.set(false); },
      error: (e) => { this.aiEmail.set('Failed: ' + (e.error?.message || 'Unexpected error.')); this.isGeneratingEmail.set(false); }
    });
  }

  copyEmailToClipboard(): void {
    if (!this.aiEmail()) return;
    navigator.clipboard.writeText(this.aiEmail()).then(() => { this.emailCopied.set(true); setTimeout(() => this.emailCopied.set(false), 2000); });
  }

  getBadgeEmoji(type: string): string {
    const map: Record<string, string> = { Note: '📝', Email: '📧', Phone: '📞', Meeting: '🤝', AISummary: '✨' };
    return map[type] || '💬';
  }
}