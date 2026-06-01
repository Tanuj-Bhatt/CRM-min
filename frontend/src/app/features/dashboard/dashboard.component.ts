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
      <div class="welcome-section flex-between">
        <div>
          <h1>Executive Dashboard</h1>
          <p class="text-secondary">Overview of your enterprise sales pipeline and performance metrics.</p>
        </div>
        <div class="actions">
          <a routerLink="/leads" class="btn btn-primary">
            <span>➕</span> Add New Lead
          </a>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="loading-state flex-center flex-direction-column">
        <div class="spinner"></div>
        <p>Analyzing CRM metrics...</p>
      </div>

      <!-- Dashboard Grid -->
      <div *ngIf="!isLoading()" class="dashboard-content">
        <!-- KPI Cards -->
        <div class="card-grid">
          <!-- Card 1 -->
          <div class="glass-panel kpi-card">
            <div class="kpi-icon icon-blue">💼</div>
            <div class="kpi-data">
              <span class="kpi-value">{{ totalLeads() }}</span>
              <span class="kpi-label">Active Leads</span>
            </div>
            <div class="kpi-badge badge-blue">Pipeline</div>
          </div>
          <!-- Card 2 -->
          <div class="glass-panel kpi-card">
            <div class="kpi-icon icon-green">💰</div>
            <div class="kpi-data">
              <span class="kpi-value">{{ wonValue() | currency:'USD':'symbol':'1.0-0' }}</span>
              <span class="kpi-label">Closed Won Value</span>
            </div>
            <div class="kpi-badge badge-green">Revenue</div>
          </div>
          <!-- Card 3 -->
          <div class="glass-panel kpi-card">
            <div class="kpi-icon icon-purple">🎯</div>
            <div class="kpi-data">
              <span class="kpi-value">{{ conversionRate() | number:'1.0-1' }}%</span>
              <span class="kpi-label">Conversion Rate</span>
            </div>
            <div class="kpi-badge badge-purple">Success</div>
          </div>
          <!-- Card 4 -->
          <div class="glass-panel kpi-card">
            <div class="kpi-icon icon-teal">👥</div>
            <div class="kpi-data">
              <span class="kpi-value">{{ totalContacts() }}</span>
              <span class="kpi-label">Total Contacts</span>
            </div>
            <div class="kpi-badge badge-teal">Network</div>
          </div>
        </div>

        <!-- Charts and Reports Section -->
        <div class="charts-row">
          <!-- Custom SVG Pipeline Chart -->
          <div class="glass-panel chart-card flex-1">
            <h3>Pipeline Distribution by Status</h3>
            <div class="chart-container">
              <svg viewBox="0 0 400 200" class="pipeline-svg">
                <!-- Status Columns -->
                <g *ngFor="let stage of statusChartData(); let i = index">
                  <!-- Bar Background -->
                  <rect [attr.x]="50 + i * 70" y="20" width="36" height="130" rx="4" fill="rgba(255,255,255,0.02)"></rect>
                  <!-- Bar Foreground (animated height) -->
                  <rect 
                    [attr.x]="50 + i * 70" 
                    [attr.y]="150 - (stage.percentage / 100 * 130)" 
                    width="36" 
                    [attr.height]="(stage.percentage / 100 * 130) || 2" 
                    rx="4" 
                    [attr.fill]="stage.color"
                    class="chart-bar"
                  ></rect>
                  <!-- Label Value -->
                  <text 
                    [attr.x]="68 + i * 70" 
                    [attr.y]="140 - (stage.percentage / 100 * 130)" 
                    text-anchor="middle" 
                    fill="white" 
                    font-size="10" 
                    font-weight="bold"
                  >
                    {{ stage.count }}
                  </text>
                  <!-- Label Status -->
                  <text 
                    [attr.x]="68 + i * 70" 
                    y="170" 
                    text-anchor="middle" 
                    fill="#9ca3af" 
                    font-size="9"
                  >
                    {{ stage.name }}
                  </text>
                </g>
              </svg>
            </div>
          </div>

          <!-- Lead Source Chart (Horizontal bars) -->
          <div class="glass-panel chart-card flex-1">
            <h3>Lead Generation Sources</h3>
            <div class="source-bars">
              <div *ngFor="let source of sourceChartData()" class="source-row">
                <div class="source-info flex-between">
                  <span class="source-name">{{ source.name || 'Unknown' }}</span>
                  <span class="source-count">{{ source.count }} leads</span>
                </div>
                <div class="bar-bg">
                  <div class="bar-fill" [style.width]="source.percentage + '%'" [style.background]="source.color"></div>
                </div>
              </div>
              <div *ngIf="sourceChartData().length === 0" class="empty-state text-muted">
                No sources registered.
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Activities Feed & Recent Leads -->
        <div class="lists-row">
          <div class="glass-panel list-card flex-2">
            <div class="list-header flex-between">
              <h3>High-Value Leads</h3>
              <a routerLink="/leads" class="view-all-link">View All Pipeline</a>
            </div>
            
            <div class="custom-table-container">
              <table class="custom-table">
                <thead>
                  <tr>
                    <th>Lead Name</th>
                    <th>Company</th>
                    <th>Status</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let lead of highValueLeads()" [routerLink]="['/leads', lead.id]" class="clickable-row">
                    <td>
                      <div class="lead-name-cell">
                        <div class="lead-avatar">{{ lead.firstName[0] }}{{ lead.lastName[0] }}</div>
                        <div>
                          <strong>{{ lead.firstName }} {{ lead.lastName }}</strong>
                          <div class="text-muted" style="font-size: 0.75rem;">{{ lead.email }}</div>
                        </div>
                      </div>
                    </td>
                    <td>{{ lead.companyName }}</td>
                    <td>
                      <span class="badge" [ngClass]="'badge-' + lead.status.toLowerCase()">
                        {{ lead.status }}
                      </span>
                    </td>
                    <td class="text-success font-semibold">{{ lead.estimatedValue | currency:'USD':'symbol':'1.0-0' }}</td>
                  </tr>
                  <tr *ngIf="highValueLeads().length === 0">
                    <td colspan="4" class="text-center text-muted">No active leads found. Create some in the pipeline!</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      display: flex;
      flex-direction: column;
      gap: 32px;
    }

    .welcome-section h1 {
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin-bottom: 6px;
      background: linear-gradient(to right, #ffffff, #9ca3af);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .loading-state {
      padding: 80px 0;
      gap: 16px;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(99, 102, 241, 0.1);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 1s infinite linear;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* KPI Card styling */
    .kpi-card {
      display: flex;
      align-items: center;
      padding: 24px;
      gap: 20px;
      position: relative;
      overflow: hidden;
    }

    .kpi-icon {
      font-size: 1.75rem;
      width: 54px;
      height: 54px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-color);
    }

    .icon-blue { color: var(--primary); box-shadow: 0 0 15px rgba(99, 102, 241, 0.15); }
    .icon-green { color: var(--success); box-shadow: 0 0 15px rgba(16, 185, 129, 0.15); }
    .icon-purple { color: var(--accent); box-shadow: 0 0 15px rgba(217, 70, 239, 0.15); }
    .icon-teal { color: var(--secondary); box-shadow: 0 0 15px rgba(13, 148, 136, 0.15); }

    .kpi-data {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .kpi-value {
      font-size: 1.75rem;
      font-weight: 800;
      color: #ffffff;
      line-height: 1;
    }

    .kpi-label {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .kpi-badge {
      position: absolute;
      top: 12px;
      right: 12px;
      font-size: 0.65rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .badge-blue { background-color: rgba(99, 102, 241, 0.1); color: #818cf8; }
    .badge-green { background-color: rgba(16, 185, 129, 0.1); color: #34d399; }
    .badge-purple { background-color: rgba(217, 70, 239, 0.1); color: #f472b6; }
    .badge-teal { background-color: rgba(13, 148, 136, 0.1); color: #2dd4bf; }

    /* Chart row */
    .charts-row {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      margin-bottom: 24px;
    }

    .chart-card {
      padding: 24px;
      min-width: 320px;
    }

    .chart-card h3 {
      font-size: 1.05rem;
      font-weight: 700;
      margin-bottom: 20px;
      color: var(--text-primary);
    }

    .chart-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding-top: 10px;
    }

    .pipeline-svg {
      width: 100%;
      max-height: 180px;
    }

    .chart-bar {
      transition: height 0.6s cubic-bezier(0.4, 0, 0.2, 1), y 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Lead Sources styling */
    .source-bars {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .source-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .source-name {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--text-secondary);
    }

    .source-count {
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    .bar-bg {
      height: 8px;
      background-color: rgba(255, 255, 255, 0.03);
      border-radius: 9999px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      border-radius: 9999px;
      transition: width 0.6s ease-in-out;
    }

    /* Lists row */
    .lists-row {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }

    .list-card {
      padding: 24px;
      min-width: 320px;
    }

    .list-header {
      margin-bottom: 20px;
    }

    .list-header h3 {
      font-size: 1.05rem;
      font-weight: 700;
    }

    .view-all-link {
      font-size: 0.8125rem;
      color: var(--primary);
      text-decoration: none;
      font-weight: 600;
      transition: color var(--transition-fast);
    }

    .view-all-link:hover {
      color: var(--secondary);
    }

    .lead-name-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .lead-avatar {
      width: 32px;
      height: 32px;
      background: rgba(255,255,255,0.05);
      border: 1px solid var(--border-color);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .clickable-row {
      cursor: pointer;
    }

    .clickable-row:hover {
      background-color: rgba(255, 255, 255, 0.03);
    }

    .flex-2 { flex: 2; }
    .flex-direction-column { flex-direction: column; }
  `]
})
export class DashboardComponent implements OnInit {
  private readonly leadService = inject(LeadService);
  private readonly contactService = inject(ContactService);

  readonly isLoading = signal(true);
  
  // KPI signals
  readonly totalLeads = signal(0);
  readonly wonValue = signal(0);
  readonly conversionRate = signal(0);
  readonly totalContacts = signal(0);
  
  // List signals
  readonly highValueLeads = signal<Lead[]>([]);
  readonly statusChartData = signal<any[]>([]);
  readonly sourceChartData = signal<any[]>([]);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);

    forkJoin({
      leads: this.leadService.getLeads(),
      contacts: this.contactService.getContacts()
    }).subscribe({
      next: ({ leads, contacts }) => {
        this.totalLeads.set(leads.length);
        this.totalContacts.set(contacts.length);

        // Calculate Revenue details
        const wonLeads = leads.filter(l => l.status === 'Won');
        const closedLeadsCount = leads.filter(l => l.status === 'Won' || l.status === 'Lost').length;
        
        const totalWonVal = wonLeads.reduce((acc, curr) => acc + (Number(curr.estimatedValue) || 0), 0);
        this.wonValue.set(totalWonVal);

        const convRate = closedLeadsCount > 0 ? (wonLeads.length / closedLeadsCount) * 100 : 0;
        this.conversionRate.set(convRate);

        // Sorting high value leads
        const sortedLeads = [...leads]
          .filter(l => l.status !== 'Won' && l.status !== 'Lost')
          .sort((a, b) => b.estimatedValue - a.estimatedValue)
          .slice(0, 5);
        this.highValueLeads.set(sortedLeads);

        // Process status chart data
        const statuses = ['New', 'Contacted', 'Qualified', 'Won', 'Lost'];
        const colors = ['#6366f1', '#0ea5e9', '#a855f7', '#10b981', '#ef4444'];
        
        const statusCounts = statuses.map((status, index) => {
          const count = leads.filter(l => l.status === status).length;
          return {
            name: status,
            count: count,
            percentage: leads.length > 0 ? (count / leads.length) * 100 : 0,
            color: colors[index]
          };
        });
        this.statusChartData.set(statusCounts);

        // Process source chart data
        const sourceMap = new Map<string, number>();
        leads.forEach(l => {
          const src = l.source || 'Other';
          sourceMap.set(src, (sourceMap.get(src) || 0) + 1);
        });

        const sortedSources = Array.from(sourceMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 4);

        const maxCount = sortedSources.length > 0 ? Math.max(...sortedSources.map(s => s.count)) : 1;
        const sourceChart = sortedSources.map((s, i) => {
          const colorList = ['#6366f1', '#0d9488', '#d946ef', '#0ea5e9'];
          return {
            name: s.name,
            count: s.count,
            percentage: (s.count / maxCount) * 100,
            color: colorList[i % colorList.length]
          };
        });
        this.sourceChartData.set(sourceChart);

        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }
}
