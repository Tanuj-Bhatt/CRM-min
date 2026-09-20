import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AutomationService } from '../../core/services/automation.service';
import { ToastService } from '../../core/services/toast.service';
import { AutomationSettings, WebhookLeadPayload } from '../../core/models/crm.models';

@Component({
  selector: 'app-automations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="automations-container animate-fade-in">
      <!-- Header -->
      <div class="page-header flex-between">
        <div>
          <div class="header-badge flex-center">
            <span>⚡ Autonomous Growth Engine</span>
          </div>
          <h1>Automations Hub</h1>
          <p class="text-secondary">
            Streamline pipeline operations with autonomous webhook lead capture, round-robin distribution, AI deal scoring, and lifecycle sync.
          </p>
        </div>
        <div class="actions flex-center gap-10">
          <button (click)="openTestModal()" class="btn btn-secondary">
            <span>🧪</span> Test Webhook
          </button>
          <button (click)="saveSettings()" [disabled]="isSaving()" class="btn btn-primary">
            <span>💾</span> {{ isSaving() ? 'Saving...' : 'Save Configuration' }}
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="loading-state flex-center flex-col">
        <div class="spinner"></div>
        <p>Loading automation parameters...</p>
      </div>

      <!-- Automation Grid -->
      <div *ngIf="!isLoading()" class="automations-grid">
        
        <!-- Card 1: Inbound Webhook Lead Capture -->
        <div class="glass-panel automation-card">
          <div class="card-header flex-between">
            <div class="icon-wrap webhook-icon">🌐</div>
            <span class="status-pill active">REST API Active</span>
          </div>
          <h3>Inbound Webhook Capture</h3>
          <p class="card-desc">
            Directly funnel leads from marketing landing pages, forms (Typeform, HubSpot, Webflow), or custom apps into AeroCRM without middleware.
          </p>

          <div class="field-group">
            <label>Organization Inbound Endpoint URL</label>
            <div class="copy-input-group">
              <input type="text" [value]="settings()?.webhookEndpointUrl || 'http://localhost:5247/api/automations/capture'" readonly />
              <button (click)="copyToClipboard(settings()?.webhookEndpointUrl || 'http://localhost:5247/api/automations/capture', 'Endpoint URL copied!')" class="btn-copy">📋</button>
            </div>
          </div>

          <div class="field-group">
            <label class="flex-between">
              <span>Webhook API Key (X-API-Key Header)</span>
              <button (click)="toggleKeyVisibility()" class="btn-text">
                {{ showApiKey() ? 'Hide' : 'Reveal' }}
              </button>
            </label>
            <div class="copy-input-group">
              <input [type]="showApiKey() ? 'text' : 'password'" [value]="settings()?.webhookApiKey || ''" readonly />
              <button (click)="copyToClipboard(settings()?.webhookApiKey || '', 'API Key copied!')" class="btn-copy">📋</button>
              <button (click)="regenerateKey()" class="btn-rotate" title="Regenerate API Key">🔄</button>
            </div>
          </div>

          <div class="code-snippet-box">
            <div class="snippet-header flex-between">
              <span>cURL Integration Sample</span>
              <button (click)="copyCurl()" class="btn-copy-code">Copy cURL</button>
            </div>
            <pre><code>{{ curlSnippet }}</code></pre>
          </div>
        </div>

        <!-- Card 2: Round-Robin Lead Distribution -->
        <div class="glass-panel automation-card">
          <div class="card-header flex-between">
            <div class="icon-wrap roundrobin-icon">🔀</div>
            <span class="status-pill" [class.active]="autoAssignRoundRobin" [class.inactive]="!autoAssignRoundRobin">
              {{ autoAssignRoundRobin ? 'Enabled' : 'Disabled' }}
            </span>
          </div>
          <h3>Round-Robin Assignment</h3>
          <p class="card-desc">
            Automatically distributes incoming leads evenly among all active team members (Agents & Managers), eliminating manual assignment bottlenecks.
          </p>

          <div class="toggle-control-box">
            <div class="toggle-text">
              <strong>Autonomous Team Load Balancing</strong>
              <p>When turned on, unassigned leads from webhooks, CSV imports, and rapid-entry forms are allocated to the next rep in the cycle.</p>
            </div>
            <label class="switch">
              <input type="checkbox" [(ngModel)]="autoAssignRoundRobin" />
              <span class="slider"></span>
            </label>
          </div>

          <div class="info-banner flex-center">
            <span>⚖️ Ensures 100% fair lead distribution across sales reps with zero manual oversight required.</span>
          </div>
        </div>

        <!-- Card 3: Stale Deal & Inactivity Sentry -->
        <div class="glass-panel automation-card">
          <div class="card-header flex-between">
            <div class="icon-wrap sentry-icon">⏱️</div>
            <span class="status-pill active">{{ staleDealThresholdDays }}d Inactivity Sentry</span>
          </div>
          <h3>Stale Deal Auto-Detection</h3>
          <p class="card-desc">
            Monitors customer interactions (emails, phone calls, meetings, notes) and highlights inactive deals across pipelines before they churn.
          </p>

          <div class="field-group">
            <label class="flex-between">
              <span>Inactivity Alert Threshold (Days)</span>
              <span class="threshold-badge">{{ staleDealThresholdDays }} Days</span>
            </label>
            <input 
              type="range" 
              min="3" 
              max="60" 
              step="1" 
              [(ngModel)]="staleDealThresholdDays" 
              class="range-slider" 
            />
            <div class="range-marks flex-between">
              <span>3d (Aggressive)</span>
              <span>14d (Standard)</span>
              <span>30d</span>
              <span>60d (Enterprise)</span>
            </div>
          </div>

          <div class="stale-preview-card">
            <div class="preview-badge">Preview in Pipeline:</div>
            <div class="mock-lead-row flex-between">
              <div>
                <strong>Apex Horizon Tech</strong>
                <span class="text-secondary">$45,000 &bull; Proposal</span>
              </div>
              <span class="badge-stale">⚠️ Stale Deal (&gt;{{ staleDealThresholdDays }}d idle)</span>
            </div>
          </div>
        </div>

        <!-- Card 4: AI Lead & Deal Scoring Matrix -->
        <div class="glass-panel automation-card">
          <div class="card-header flex-between">
            <div class="icon-wrap ai-icon">🧠</div>
            <span class="status-pill active">Real-Time Scoring</span>
          </div>
          <h3>AI Deal Health & Priority Scoring</h3>
          <p class="card-desc">
            AeroCRM dynamically calculates a 0–100 health score for every deal based on value scale, pipeline stage, and communication velocity.
          </p>

          <div class="score-tiers-grid">
            <div class="score-tier hot">
              <div class="tier-top flex-between">
                <span class="tier-emoji">🔥</span>
                <span class="tier-score">70 - 100</span>
              </div>
              <h4>Hot Deal</h4>
              <p>High velocity, contact within 3 days, value &gt; $10k, qualified stage.</p>
            </div>

            <div class="score-tier warm">
              <div class="tier-top flex-between">
                <span class="tier-emoji">⚡</span>
                <span class="tier-score">40 - 69</span>
              </div>
              <h4>Warm Deal</h4>
              <p>Active discussion, moderate deal size, contacted within standard window.</p>
            </div>

            <div class="score-tier cold">
              <div class="tier-top flex-between">
                <span class="tier-emoji">❄️</span>
                <span class="tier-score">0 - 39</span>
              </div>
              <h4>Cold / Stale</h4>
              <p>Zero recent engagement (&gt;14 days), uncontacted, or stalled lead.</p>
            </div>
          </div>

          <div class="auto-badge-note">
            <span>✨ Automatically recalculates upon every logged email, call, meeting, or status change.</span>
          </div>
        </div>

        <!-- Card 5: Won Deal Auto-Contact Sync -->
        <div class="glass-panel automation-card">
          <div class="card-header flex-between">
            <div class="icon-wrap sync-icon">🤝</div>
            <span class="status-pill active">Autonomous</span>
          </div>
          <h3>Won Deal &rarr; Contact Directory Sync</h3>
          <p class="card-desc">
            Eliminates duplicate entry by automatically provisioning a permanent enterprise Contact card whenever a deal moves to "Won".
          </p>

          <div class="sync-flow-diagram flex-between">
            <div class="flow-step">
              <span class="step-num">1</span>
              <span class="step-text">Lead Closed as Won</span>
            </div>
            <div class="flow-arrow">&rarr;</div>
            <div class="flow-step">
              <span class="step-num">2</span>
              <span class="step-text">Contact Auto-Checked</span>
            </div>
            <div class="flow-arrow">&rarr;</div>
            <div class="flow-step">
              <span class="step-num">3</span>
              <span class="step-text">Client Saved</span>
            </div>
          </div>

          <div class="sync-guarantee flex-center">
            <span>✅ Preserves company name, email, phone, and associates full deal history.</span>
          </div>
        </div>

      </div>

      <!-- Test Webhook Modal -->
      <div *ngIf="showTestModal()" class="modal-overlay flex-center animate-fade-in" (click)="closeTestModal()">
        <div class="modal-card glass-panel" (click)="$event.stopPropagation()">
          <div class="modal-header flex-between">
            <h2>🧪 Dispatch Inbound Webhook Test</h2>
            <button (click)="closeTestModal()" class="btn-close">&times;</button>
          </div>
          <p class="modal-sub">
            Simulate a live submission from an external landing page, web form, or third-party CRM using your organization's API Key.
          </p>

          <form (ngSubmit)="sendTestLead()">
            <div class="form-row">
              <div class="form-group">
                <label>First Name *</label>
                <input type="text" [(ngModel)]="testLead.firstName" name="firstName" required />
              </div>
              <div class="form-group">
                <label>Last Name *</label>
                <input type="text" [(ngModel)]="testLead.lastName" name="lastName" required />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Business Email *</label>
                <input type="email" [(ngModel)]="testLead.email" name="email" required />
              </div>
              <div class="form-group">
                <label>Phone Number</label>
                <input type="text" [(ngModel)]="testLead.phone" name="phone" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Company Name</label>
                <input type="text" [(ngModel)]="testLead.companyName" name="companyName" />
              </div>
              <div class="form-group">
                <label>Estimated Value ($)</label>
                <input type="number" [(ngModel)]="testLead.estimatedValue" name="estimatedValue" />
              </div>
            </div>

            <div class="form-group">
              <label>Lead Source</label>
              <input type="text" [(ngModel)]="testLead.source" name="source" />
            </div>

            <div class="form-group">
              <label>Initial Inquiry / Notes</label>
              <textarea [(ngModel)]="testLead.notes" name="notes" rows="2"></textarea>
            </div>

            <div class="modal-actions flex-between">
              <button type="button" (click)="fillSampleData()" class="btn btn-text">
                🎲 Fill Sample Lead
              </button>
              <div class="flex-center gap-10">
                <button type="button" (click)="closeTestModal()" class="btn btn-outline">Cancel</button>
                <button type="submit" [disabled]="isTesting()" class="btn btn-primary">
                  <span>🚀</span> {{ isTesting() ? 'Transmitting...' : 'Dispatch Webhook Payload' }}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .automations-container {
      max-width: 1200px;
      margin: 0 auto;
      padding-bottom: 50px;
    }
    .header-badge {
      display: inline-flex;
      padding: 4px 12px;
      border-radius: 20px;
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.3);
      color: #818cf8;
      font-size: 0.8rem;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .page-header h1 {
      font-size: 2.2rem;
      font-weight: 700;
      margin-bottom: 6px;
      background: linear-gradient(135deg, #fff 40%, #94a3b8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .loading-state {
      padding: 80px;
      gap: 16px;
      color: var(--text-secondary);
    }
    .automations-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(480px, 1fr));
      gap: 24px;
      margin-top: 24px;
    }
    .automation-card {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-color);
      transition: var(--transition-normal);
    }
    .automation-card:hover {
      border-color: var(--border-color-hover);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
      transform: translateY(-2px);
    }
    .card-header {
      align-items: center;
    }
    .icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
    }
    .webhook-icon { background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); }
    .roundrobin-icon { background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.3); }
    .sentry-icon { background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); }
    .ai-icon { background: rgba(217, 70, 239, 0.15); border: 1px solid rgba(217, 70, 239, 0.3); }
    .sync-icon { background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); }
    
    .status-pill {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 20px;
      background: var(--bg-tertiary);
      color: var(--text-secondary);
    }
    .status-pill.active {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
    }
    .status-pill.inactive {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
    }
    .card-desc {
      font-size: 0.9rem;
      color: var(--text-secondary);
      line-height: 1.5;
    }
    .field-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .field-group label {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .copy-input-group {
      display: flex;
      gap: 8px;
    }
    .copy-input-group input {
      flex: 1;
      padding: 9px 12px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      font-family: monospace;
      font-size: 0.85rem;
    }
    .btn-copy, .btn-rotate {
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      padding: 0 12px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: var(--transition-fast);
    }
    .btn-copy:hover, .btn-rotate:hover {
      background: var(--bg-glass-hover);
      border-color: var(--primary);
    }
    .btn-text {
      background: none;
      border: none;
      color: var(--primary);
      font-size: 0.8rem;
      cursor: pointer;
      font-weight: 600;
    }
    .btn-text:hover { text-decoration: underline; }
    
    .code-snippet-box {
      background: #0d1117;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--radius-sm);
      overflow: hidden;
      margin-top: 4px;
    }
    .snippet-header {
      padding: 6px 12px;
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 0.75rem;
      color: var(--text-muted);
      font-family: monospace;
    }
    .btn-copy-code {
      background: none;
      border: none;
      color: var(--primary);
      font-size: 0.72rem;
      cursor: pointer;
      font-weight: 600;
    }
    .code-snippet-box pre {
      padding: 10px 12px;
      margin: 0;
      font-size: 0.75rem;
      color: #93c5fd;
      overflow-x: auto;
      line-height: 1.4;
    }
    
    .toggle-control-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 14px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
    }
    .toggle-text strong {
      display: block;
      font-size: 0.95rem;
      margin-bottom: 2px;
    }
    .toggle-text p {
      font-size: 0.8rem;
      color: var(--text-secondary);
      line-height: 1.3;
    }
    .switch {
      position: relative;
      display: inline-block;
      width: 50px;
      height: 26px;
      flex-shrink: 0;
    }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      transition: .3s;
      border-radius: 26px;
    }
    .slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .3s;
      border-radius: 50%;
    }
    input:checked + .slider {
      background-color: var(--primary);
      border-color: var(--primary);
    }
    input:checked + .slider:before {
      transform: translateX(24px);
    }
    .info-banner {
      padding: 10px 14px;
      background: rgba(168, 85, 247, 0.08);
      border: 1px solid rgba(168, 85, 247, 0.2);
      border-radius: var(--radius-sm);
      font-size: 0.8rem;
      color: #c084fc;
    }

    .threshold-badge {
      background: rgba(245, 158, 11, 0.2);
      color: #fbbf24;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
    }
    .range-slider {
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: var(--bg-tertiary);
      accent-color: var(--warning);
      outline: none;
      cursor: pointer;
    }
    .range-marks {
      font-size: 0.7rem;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .stale-preview-card {
      padding: 12px;
      background: rgba(0, 0, 0, 0.25);
      border: 1px dashed var(--border-color);
      border-radius: var(--radius-sm);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .preview-badge {
      font-size: 0.72rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .mock-lead-row {
      font-size: 0.85rem;
      align-items: center;
    }
    .mock-lead-row strong {
      display: block;
    }
    .badge-stale {
      font-size: 0.75rem;
      font-weight: 600;
      color: #f87171;
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      padding: 3px 8px;
      border-radius: 6px;
    }

    .score-tiers-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    .score-tier {
      padding: 12px;
      border-radius: var(--radius-sm);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .score-tier.hot {
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.2);
    }
    .score-tier.warm {
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.2);
    }
    .score-tier.cold {
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.2);
    }
    .tier-top {
      align-items: center;
      font-weight: 700;
      font-size: 0.85rem;
    }
    .score-tier h4 {
      font-size: 0.85rem;
      margin-top: 2px;
    }
    .score-tier p {
      font-size: 0.72rem;
      color: var(--text-secondary);
      line-height: 1.3;
    }
    .auto-badge-note {
      font-size: 0.8rem;
      color: #f472b6;
      padding: 8px 12px;
      background: rgba(217, 70, 239, 0.08);
      border-radius: var(--radius-sm);
    }

    .sync-flow-diagram {
      align-items: center;
      background: rgba(16, 185, 129, 0.05);
      border: 1px solid rgba(16, 185, 129, 0.2);
      border-radius: var(--radius-md);
      padding: 14px;
    }
    .flow-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 4px;
    }
    .step-num {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--success);
      color: #fff;
      font-weight: 700;
      font-size: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .step-text {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-primary);
    }
    .flow-arrow {
      font-size: 1.2rem;
      color: var(--success);
    }
    .sync-guarantee {
      font-size: 0.8rem;
      color: #34d399;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      z-index: 1000;
      padding: 20px;
    }
    .modal-card {
      width: 100%;
      max-width: 600px;
      padding: 30px;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-color-hover);
    }
    .modal-header h2 {
      font-size: 1.4rem;
      margin: 0;
    }
    .btn-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      color: var(--text-muted);
      cursor: pointer;
    }
    .modal-sub {
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin: 8px 0 20px 0;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 14px;
    }
    .form-group label {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-secondary);
    }
    .form-group input, .form-group textarea {
      padding: 10px 14px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      font-family: inherit;
    }
    .form-group input:focus, .form-group textarea:focus {
      outline: none;
      border-color: var(--primary);
    }
    .modal-actions {
      margin-top: 24px;
    }

    @media (max-width: 768px) {
      .automations-grid { grid-template-columns: 1fr; }
      .score-tiers-grid { grid-template-columns: 1fr; }
      .form-row { grid-template-columns: 1fr; }
    }
  `]
})
export class AutomationsComponent implements OnInit {
  private readonly automationService = inject(AutomationService);
  private readonly toast = inject(ToastService);

  isLoading = signal(true);
  isSaving = signal(false);
  isTesting = signal(false);
  showApiKey = signal(false);
  showTestModal = signal(false);

  settings = signal<AutomationSettings | null>(null);

  autoAssignRoundRobin = true;
  staleDealThresholdDays = 14;

  testLead: WebhookLeadPayload = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    companyName: '',
    estimatedValue: 50000,
    source: 'Website Webhook',
    notes: 'Inquiry via Landing Page form'
  };

  get curlSnippet(): string {
    const key = this.settings()?.webhookApiKey || '{YOUR_API_KEY}';
    const url = this.settings()?.webhookEndpointUrl || 'http://localhost:5247/api/automations/capture';
    return `curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${key}" \\
  -d '{
    "firstName": "Sarah",
    "lastName": "Connor",
    "email": "sarah.connor@cyberdyne.com",
    "phone": "+1-555-0199",
    "companyName": "Cyberdyne Systems",
    "estimatedValue": 75000,
    "source": "Website Form",
    "notes": "Interested in Enterprise CRM deployment"
  }'`;
  }

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.isLoading.set(true);
    this.automationService.getSettings().subscribe({
      next: (data) => {
        this.settings.set(data);
        this.autoAssignRoundRobin = data.autoAssignRoundRobin;
        this.staleDealThresholdDays = data.staleDealThresholdDays;
        this.isLoading.set(false);
      },
      error: (err) => {
        this.toast.error('Failed to load automation settings', err.message);
        this.isLoading.set(false);
      }
    });
  }

  toggleKeyVisibility(): void {
    this.showApiKey.update(v => !v);
  }

  saveSettings(): void {
    this.isSaving.set(true);
    this.automationService.updateSettings({
      autoAssignRoundRobin: this.autoAssignRoundRobin,
      staleDealThresholdDays: this.staleDealThresholdDays
    }).subscribe({
      next: (updated) => {
        this.settings.set(updated);
        this.isSaving.set(false);
        this.toast.success('Automations Updated', 'Workflow settings saved successfully.');
      },
      error: (err) => {
        this.isSaving.set(false);
        this.toast.error('Save Failed', err.message);
      }
    });
  }

  regenerateKey(): void {
    if (!confirm('Are you sure you want to regenerate your Webhook API Key? Any external landing page or integration using the current key will stop working until updated.')) {
      return;
    }

    this.automationService.regenerateApiKey().subscribe({
      next: (res) => {
        const cur = this.settings();
        if (cur) {
          this.settings.set({ ...cur, webhookApiKey: res.webhookApiKey });
        }
        this.toast.success('Key Regenerated', 'New Webhook API Key generated successfully.');
      },
      error: (err) => {
        this.toast.error('Failed to regenerate key', err.message);
      }
    });
  }

  copyToClipboard(text: string, successMsg: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.toast.info('Copied!', successMsg);
    });
  }

  copyCurl(): void {
    this.copyToClipboard(this.curlSnippet, 'cURL command copied to clipboard!');
  }

  openTestModal(): void {
    this.fillSampleData();
    this.showTestModal.set(true);
  }

  closeTestModal(): void {
    this.showTestModal.set(false);
  }

  fillSampleData(): void {
    const randomId = Math.floor(100 + Math.random() * 900);
    this.testLead = {
      firstName: 'Elena',
      lastName: `Rostova-${randomId}`,
      email: `elena.r${randomId}@vanguard-ai.io`,
      phone: '+1 (555) 782-9901',
      companyName: 'Vanguard AI Dynamics',
      estimatedValue: 65000,
      source: 'Landing Page Webhook',
      notes: 'Requested an enterprise demo and custom security evaluation.'
    };
  }

  sendTestLead(): void {
    const key = this.settings()?.webhookApiKey;
    if (!key) {
      this.toast.error('Missing API Key', 'Organization Webhook API Key is not loaded.');
      return;
    }

    this.isTesting.set(true);
    this.automationService.sendTestLead(key, this.testLead).subscribe({
      next: (res) => {
        this.isTesting.set(false);
        this.closeTestModal();
        this.toast.success(
          'Inbound Lead Captured! 🚀',
          `Lead "${this.testLead.firstName} ${this.testLead.lastName}" was ingested autonomously via Webhook.`
        );
      },
      error: (err) => {
        this.isTesting.set(false);
        this.toast.error('Webhook Transmission Failed', err.message || 'Check your API Key and payload.');
      }
    });
  }
}
