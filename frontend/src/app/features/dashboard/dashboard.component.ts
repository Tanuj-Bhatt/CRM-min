import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LeadService } from '../../core/services/lead.service';
import { ContactService } from '../../core/services/contact.service';
import { Lead, Contact } from '../../core/models/crm.models';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard-container animate-fade-in">
      <div class="page-header flex-between">
        <div>
          <h1>Executive Dashboard</h1>
          <p class="text-secondary">Overview of your enterprise sales pipeline and performance metrics.</p>
        </div>
        <a routerLink="/leads" class="btn btn-primary"><span>➕</span> Add Lead</a>
      </div>

      <div *ngIf="isLoading()" class="loading-state">
        <div class="spinner"></div><p class="text-muted">Analyzing metrics...</p>
      </div>

      <div *ngIf="!isLoading()" class="dashboard-content">
        <!-- KPI Cards -->
        <div class="card-grid">
          <div class="glass-panel kpi-card">
            <div class="kpi-icon" style="color:var(--primary)">💼</div>
            <div class="kpi-data">
              <span class="kpi-value">{{ totalLeads() }}</span>
              <span class="kpi-label">Active Leads</span>
            </div>
            <span class="kpi-tag tag-blue">Pipeline</span>
          </div>
          <div class="glass-panel kpi-card">
            <div class="kpi-icon" style="color:var(--success)">💰</div>
            <div class="kpi-data">
              <span class="kpi-value">{{ wonValue() | currency:'USD':'symbol':'1.0-0' }}</span>
              <span class="kpi-label">Closed Won Value</span>
            </div>
            <span class="kpi-tag tag-green">Revenue</span>
          </div>
          <div class="glass-panel kpi-card">
            <div class="kpi-icon" style="color:var(--accent)">🎯</div>
            <div class="kpi-data">
              <span class="kpi-value">{{ conversionRate() | number:'1.0-1' }}%</span>
              <span class="kpi-label">Conversion Rate</span>
            </div>
            <span class="kpi-tag tag-purple">Success</span>
          </div>
          <div class="glass-panel kpi-card">
            <div class="kpi-icon" style="color:var(--secondary)">👥</div>
            <div class="kpi-data">
              <span class="kpi-value">{{ totalContacts() }}</span>
              <span class="kpi-label">Total Contacts</span>
            </div>
            <span class="kpi-tag tag-teal">Network</span>
          </div>
        </div>

        <!-- Charts Row -->
        <div class="charts-row">
          <div class="glass-panel chart-card">
            <h3 class="chart-title">Pipeline by Status</h3>
            <div class="chart-wrap">
              <svg viewBox="0 0 400 190" class="pipeline-svg">
                <g *ngFor="let stage of statusChartData(); let i = index">
                  <rect [attr.x]="40 + i * 68" y="20" width="38" height="130" rx="4" fill="var(--input-bg)"></rect>
                  <rect
                    [attr.x]="40 + i * 68"
                    [attr.y]="150 - (stage.percentage / 100 * 130)"
                    width="38"
                    [attr.height]="(stage.percentage / 100 * 130) || 2"
                    rx="4"
                    [attr.fill]="stage.color">
                  </rect>
                  <text [attr.x]="59 + i * 68" [attr.y]="142 - (stage.percentage / 100 * 130)" text-anchor="middle" class="svg-val">{{ stage.count }}</text>
                  <text [attr.x]="59 + i * 68" y="172" text-anchor="middle" class="svg-label">{{ stage.name }}</text>
                </g>
              </svg>
            </div>
          </div>

          <div class="glass-panel chart-card">
            <h3 class="chart-title">Lead Sources</h3>
            <div class="source-bars">
              <div *ngFor="let source of sourceChartData()" class="source-row">
                <div class="flex-between" style="margin-bottom:5px">
                  <span class="source-name">{{ source.name || 'Unknown' }}</span>
                  <span class="source-count">{{ source.count }}</span>
                </div>
                <div class="bar-bg">
                  <div class="bar-fill" [style.width.%]="source.percentage" [style.background]="source.color"></div>
                </div>
              </div>
              <div *ngIf="sourceChartData().length === 0" class="text-muted text-sm">No sources yet.</div>
            </div>
          </div>
        </div>

        <!-- High Value Leads Table -->
        <div class="glass-panel table-card">
          <div class="flex-between" style="margin-bottom:18px">
            <h3 class="chart-title" style="margin:0">High-Value Leads</h3>
            <a routerLink="/leads" class="view-all">View Pipeline →</a>
          </div>
          <div class="custom-table-container">
            <table class="custom-table">
              <thead>
                <tr><th>Lead</th><th>Company</th><th>Status</th><th>Value</th></tr>
              </thead>
              <tbody>
                <tr *ngFor="let lead of highValueLeads()" [routerLink]="['/leads', lead.id]" style="cursor:pointer">
                  <td>
                    <div class="lead-cell">
                      <div class="lead-av">{{ lead.firstName[0] }}{{ lead.lastName[0] }}</div>
                      <div>
                        <strong>{{ lead.firstName }} {{ lead.lastName }}</strong>
                        <div class="text-muted" style="font-size:.72rem">{{ lead.email }}</div>
                      </div>
                    </div>
                  </td>
                  <td>{{ lead.companyName }}</td>
                  <td><span class="badge" [ngClass]="'badge-' + lead.status.toLowerCase()">{{ lead.status }}</span></td>
                  <td class="text-success font-semibold">{{ lead.estimatedValue | currency:'USD':'symbol':'1.0-0' }}</td>
                </tr>
                <tr *ngIf="highValueLeads().length === 0">
                  <td colspan="4" class="text-center text-muted">No active leads. Create some in the pipeline!</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container{display:flex;flex-direction:column;gap:22px}
    .kpi-card{display:flex;align-items:center;padding:20px;gap:16px;position:relative;overflow:hidden}
    .kpi-icon{font-size:1.6rem;width:50px;height:50px;min-width:50px;border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;background:var(--input-bg);border:1px solid var(--border-color)}
    .kpi-data{display:flex;flex-direction:column;gap:3px;flex:1;min-width:0}
    .kpi-value{font-size:1.6rem;font-weight:800;color:var(--text-primary);line-height:1}
    .kpi-label{font-size:.78rem;color:var(--text-secondary);font-weight:500}
    .kpi-tag{position:absolute;top:10px;right:10px;font-size:.6rem;font-weight:700;padding:2px 7px;border-radius:4px;text-transform:uppercase;letter-spacing:.05em}
    .tag-blue{background:rgba(99,102,241,.1);color:#818cf8}
    .tag-green{background:rgba(16,185,129,.1);color:#34d399}
    .tag-purple{background:rgba(217,70,239,.1);color:#f472b6}
    .tag-teal{background:rgba(13,148,136,.1);color:#2dd4bf}

    .charts-row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .chart-card{padding:20px}
    .chart-title{font-size:.95rem;font-weight:700;color:var(--text-primary);margin-bottom:16px}
    .chart-wrap{display:flex;justify-content:center}
    .pipeline-svg{width:100%;max-height:190px}
    .svg-val{fill:var(--text-primary);font-size:10px;font-weight:700}
    .svg-label{fill:var(--text-secondary);font-size:9px}

    .source-bars{display:flex;flex-direction:column;gap:14px}
    .source-row{display:flex;flex-direction:column}
    .source-name{font-size:.8rem;color:var(--text-secondary);font-weight:500}
    .source-count{font-size:.8rem;color:var(--text-muted);font-weight:600}
    .bar-bg{height:7px;background:var(--input-bg);border-radius:9999px;overflow:hidden}
    .bar-fill{height:100%;border-radius:9999px;transition:width .6s ease}

    .table-card{padding:20px}
    .view-all{font-size:.8rem;color:var(--primary);text-decoration:none;font-weight:600}
    .view-all:hover{color:var(--secondary)}
    .lead-cell{display:flex;align-items:center;gap:10px}
    .lead-av{width:30px;height:30px;min-width:30px;background:var(--bg-tertiary);border:1px solid var(--border-color);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.7rem;color:var(--text-secondary)}

    @media(max-width:900px){.charts-row{grid-template-columns:1fr}}
    @media(max-width:480px){.kpi-value{font-size:1.3rem}.kpi-card{padding:15px;gap:12px}}
  `]
})
export class DashboardComponent implements OnInit {
  private readonly leadService = inject(LeadService);
  private readonly contactService = inject(ContactService);

  readonly isLoading = signal(true);
  readonly totalLeads = signal(0);
  readonly wonValue = signal(0);
  readonly conversionRate = signal(0);
  readonly totalContacts = signal(0);
  readonly highValueLeads = signal<Lead[]>([]);
  readonly statusChartData = signal<any[]>([]);
  readonly sourceChartData = signal<any[]>([]);

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.isLoading.set(true);
    forkJoin({ leads: this.leadService.getLeads(), contacts: this.contactService.getContacts() }).subscribe({
      next: ({ leads, contacts }) => {
        this.totalLeads.set(leads.length);
        this.totalContacts.set(contacts.length);
        const wonLeads = leads.filter(l => l.status === 'Won');
        const closedCount = leads.filter(l => l.status === 'Won' || l.status === 'Lost').length;
        this.wonValue.set(wonLeads.reduce((a, c) => a + (Number(c.estimatedValue) || 0), 0));
        this.conversionRate.set(closedCount > 0 ? (wonLeads.length / closedCount) * 100 : 0);
        this.highValueLeads.set([...leads].filter(l => l.status !== 'Won' && l.status !== 'Lost').sort((a, b) => b.estimatedValue - a.estimatedValue).slice(0, 5));

        const statuses = ['New', 'Contacted', 'Qualified', 'Won', 'Lost'];
        const colors = ['#6366f1', '#0ea5e9', '#a855f7', '#10b981', '#ef4444'];
        this.statusChartData.set(statuses.map((s, i) => {
          const count = leads.filter(l => l.status === s).length;
          return { name: s, count, percentage: leads.length > 0 ? (count / leads.length) * 100 : 0, color: colors[i] };
        }));

        const sourceMap = new Map<string, number>();
        leads.forEach(l => { const s = l.source || 'Other'; sourceMap.set(s, (sourceMap.get(s) || 0) + 1); });
        const sorted = Array.from(sourceMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 4);
        const maxC = sorted.length > 0 ? Math.max(...sorted.map(s => s.count)) : 1;
        this.sourceChartData.set(sorted.map((s, i) => ({ ...s, percentage: (s.count / maxC) * 100, color: ['#6366f1','#0d9488','#d946ef','#0ea5e9'][i % 4] })));
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }
}