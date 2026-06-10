import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LeadService } from '../../../core/services/lead.service';
import { UserService } from '../../../core/services/user.service';
import { Lead, LeadStatus, User } from '../../../core/models/crm.models';

@Component({
  selector: 'app-lead-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="leads-container animate-fade-in">
      <div class="page-header flex-between">
        <div>
          <h1>Sales Pipeline</h1>
          <p class="text-secondary">Track your leads through the enterprise sales cycle.</p>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <div class="view-toggles glass-panel">
            <button (click)="viewMode.set('kanban')" [class.active]="viewMode() === 'kanban'" class="toggle-btn">📋 Board</button>
            <button (click)="viewMode.set('list')" [class.active]="viewMode() === 'list'" class="toggle-btn">☰ List</button>
          </div>
          <button (click)="openCreateModal()" class="btn btn-primary"><span>➕</span> New Lead</button>
        </div>
      </div>

      <div class="filters-bar glass-panel">
        <div class="search-box">
          <span>🔍</span>
          <input type="text" [(ngModel)]="searchQuery" (ngModelChange)="applyFilters()" placeholder="Search leads, companies..." class="search-input"/>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <select [(ngModel)]="sourceFilter" (change)="applyFilters()" class="filter-select">
            <option value="">All Sources</option>
            <option value="Website">Website</option>
            <option value="Referral">Referral</option>
            <option value="Cold Call">Cold Call</option>
            <option value="LinkedIn">LinkedIn</option>
            <option value="Event">Event</option>
          </select>
          <select [(ngModel)]="valueFilter" (change)="applyFilters()" class="filter-select">
            <option value="0">Any Value</option>
            <option value="10000">$10k+</option>
            <option value="50000">$50k+</option>
            <option value="100000">$100k+</option>
          </select>
        </div>
      </div>

      <div *ngIf="isLoading()" class="loading-state">
        <div class="spinner"></div><p class="text-muted">Loading pipeline...</p>
      </div>

      <div *ngIf="!isLoading()">
        <!-- Kanban Board -->
        <div *ngIf="viewMode() === 'kanban'" class="kanban-board">
          <div *ngFor="let col of kanbanColumns" class="kanban-col glass-panel">
            <div class="col-header" [style.border-top]="'3px solid ' + col.color">
              <span class="col-title">{{ col.title }}</span>
              <span class="col-count">{{ col.leads.length }}</span>
            </div>
            <div class="col-body">
              <div *ngFor="let lead of col.leads" [routerLink]="['/leads', lead.id]" class="kanban-card glass-panel">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
                  <span class="k-company">{{ lead.companyName }}</span>
                  <span class="k-value">{{ lead.estimatedValue | currency:'USD':'symbol':'1.0-0' }}</span>
                </div>
                <h4 class="k-name">{{ lead.firstName }} {{ lead.lastName }}</h4>
                <div style="display:flex;justify-content:space-between;font-size:.72rem;color:var(--text-muted);margin-top:6px">
                  <span>🌐 {{ lead.source }}</span>
                  <span>👤 {{ lead.assignedToUserName ? (lead.assignedToUserName | slice:0:10) : 'None' }}</span>
                </div>
                <div class="quick-move" (click)="$event.stopPropagation()">
                  <button *ngIf="canMoveLeft(lead.status)" (click)="moveLead(lead, -1)" class="move-btn">◀</button>
                  <span class="move-label">Move</span>
                  <button *ngIf="canMoveRight(lead.status)" (click)="moveLead(lead, 1)" class="move-btn">▶</button>
                </div>
              </div>
              <div *ngIf="col.leads.length === 0" class="empty-col">Drop leads here</div>
            </div>
          </div>
        </div>

        <!-- List View -->
        <div *ngIf="viewMode() === 'list'" class="glass-panel" style="padding:0;overflow:hidden">
          <div class="custom-table-container">
            <table class="custom-table">
              <thead>
                <tr><th>Lead</th><th>Company</th><th>Status</th><th>Value</th><th>Source</th><th>Assignee</th><th>Actions</th></tr>
              </thead>
              <tbody>
                <tr *ngFor="let lead of filteredLeads()" style="cursor:pointer">
                  <td [routerLink]="['/leads', lead.id]">
                    <strong>{{ lead.firstName }} {{ lead.lastName }}</strong>
                    <div class="text-muted" style="font-size:.72rem">{{ lead.email }}</div>
                  </td>
                  <td [routerLink]="['/leads', lead.id]">{{ lead.companyName }}</td>
                  <td [routerLink]="['/leads', lead.id]"><span class="badge" [ngClass]="'badge-' + lead.status.toLowerCase()">{{ lead.status }}</span></td>
                  <td [routerLink]="['/leads', lead.id]" class="text-success font-semibold">{{ lead.estimatedValue | currency:'USD':'symbol':'1.0-0' }}</td>
                  <td [routerLink]="['/leads', lead.id]">{{ lead.source }}</td>
                  <td [routerLink]="['/leads', lead.id]">{{ lead.assignedToUserName || '—' }}</td>
                  <td>
                    <div style="display:flex;gap:6px">
                      <button (click)="openEditModal(lead)" class="btn btn-outline btn-sm">✏️ Edit</button>
                      <button (click)="deleteLead(lead.id)" class="btn btn-sm btn-del">🗑️</button>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="filteredLeads().length === 0">
                  <td colspan="7" class="text-center text-muted">No leads match filters.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Modal -->
      <div *ngIf="isModalOpen()" class="modal-backdrop">
        <div class="modal-card animate-fade-in">
          <div class="modal-header">
            <h2>{{ isEditMode() ? 'Edit Lead' : 'New Lead' }}</h2>
            <button (click)="closeModal()" class="close-btn">✕</button>
          </div>
          <form (ngSubmit)="saveLead()" #leadForm="ngForm">
            <div class="row-flex">
              <div class="form-group flex-1"><label class="form-label">First Name</label><input type="text" name="firstName" [(ngModel)]="modalLead.firstName" required class="form-control" placeholder="John"/></div>
              <div class="form-group flex-1"><label class="form-label">Last Name</label><input type="text" name="lastName" [(ngModel)]="modalLead.lastName" required class="form-control" placeholder="Doe"/></div>
            </div>
            <div class="row-flex">
              <div class="form-group flex-1"><label class="form-label">Email</label><input type="email" name="email" [(ngModel)]="modalLead.email" required email class="form-control" placeholder="john@company.com"/></div>
              <div class="form-group flex-1"><label class="form-label">Phone</label><input type="text" name="phone" [(ngModel)]="modalLead.phone" class="form-control" placeholder="+1 555 123 4567"/></div>
            </div>
            <div class="row-flex">
              <div class="form-group flex-2"><label class="form-label">Company</label><input type="text" name="companyName" [(ngModel)]="modalLead.companyName" required class="form-control" placeholder="Acme Corp"/></div>
              <div class="form-group flex-1"><label class="form-label">Value ($)</label><input type="number" name="estimatedValue" [(ngModel)]="modalLead.estimatedValue" required min="0" class="form-control" placeholder="25000"/></div>
            </div>
            <div class="row-flex">
              <div class="form-group flex-1">
                <label class="form-label">Status</label>
                <select name="status" [(ngModel)]="modalLead.status" class="form-control">
                  <option value="New">New</option><option value="Contacted">Contacted</option><option value="Qualified">Qualified</option><option value="Won">Won</option><option value="Lost">Lost</option>
                </select>
              </div>
              <div class="form-group flex-1">
                <label class="form-label">Source</label>
                <select name="source" [(ngModel)]="modalLead.source" class="form-control">
                  <option value="Website">Website</option><option value="Referral">Referral</option><option value="Cold Call">Cold Call</option><option value="LinkedIn">LinkedIn</option><option value="Event">Event</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Assign To</label>
              <select name="assignedToUserId" [(ngModel)]="modalLead.assignedToUserId" class="form-control">
                <option [value]="null">Unassigned</option>
                <option *ngFor="let user of users()" [value]="user.id">{{ user.firstName }} {{ user.lastName }} ({{ user.role }})</option>
              </select>
            </div>
            <div class="modal-footer">
              <button type="button" (click)="closeModal()" class="btn btn-outline">Cancel</button>
              <button type="submit" [disabled]="leadForm.invalid" class="btn btn-primary">{{ isEditMode() ? 'Save Changes' : 'Create Lead' }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .leads-container{display:flex;flex-direction:column;gap:20px}
    .view-toggles{display:flex;padding:3px;border-radius:var(--radius-sm);gap:2px}
    .toggle-btn{background:transparent;border:none;color:var(--text-secondary);padding:6px 12px;font-size:.8rem;font-weight:600;cursor:pointer;border-radius:4px;transition:all var(--transition-fast);font-family:var(--font)}
    .toggle-btn.active{background:var(--primary);color:#fff}
    .kanban-board{display:grid;grid-template-columns:repeat(5,minmax(200px,1fr));gap:12px;overflow-x:auto;padding-bottom:4px;align-items:start}
    .kanban-col{display:flex;flex-direction:column;gap:12px;padding:14px;background:var(--bg-secondary)}
    .col-header{display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:1px solid var(--border-color);margin-bottom:2px}
    .col-title{font-weight:700;font-size:.78rem;color:var(--text-primary);text-transform:uppercase;letter-spacing:.04em}
    .col-count{background:var(--input-bg);font-size:.72rem;font-weight:700;padding:2px 7px;border-radius:9999px;color:var(--text-secondary)}
    .col-body{display:flex;flex-direction:column;gap:10px;min-height:200px}
    .kanban-card{padding:14px;cursor:pointer;background:var(--bg-tertiary);border-radius:var(--radius-sm);display:flex;flex-direction:column;gap:0;transition:transform var(--transition-fast)}
    .kanban-card:hover{transform:translateY(-2px)}
    .k-company{font-size:.7rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.02em}
    .k-value{font-size:.78rem;font-weight:700;color:var(--secondary)}
    .k-name{font-size:.875rem;font-weight:700;color:var(--text-primary)}
    .quick-move{display:flex;align-items:center;gap:6px;margin-top:8px;padding-top:7px;border-top:1px solid var(--border-color)}
    .move-btn{background:var(--input-bg);border:1px solid var(--border-color);border-radius:4px;color:var(--text-secondary);font-size:.65rem;padding:2px 7px;cursor:pointer;transition:all var(--transition-fast)}
    .move-btn:hover{background:var(--bg-tertiary);color:var(--text-primary);border-color:var(--primary)}
    .move-label{font-size:.65rem;color:var(--text-muted);flex:1;text-align:center;text-transform:uppercase;letter-spacing:.02em}
    .empty-col{padding:24px 8px;border:1.5px dashed var(--border-color);border-radius:var(--radius-sm);text-align:center;font-size:.75rem;color:var(--text-muted)}
    .btn-del{background:transparent;border:1px solid rgba(239,68,68,.2);color:#f87171}
    .btn-del:hover{background:rgba(239,68,68,.08);border-color:var(--danger)}
    @media(max-width:900px){.kanban-board{grid-template-columns:repeat(3,minmax(180px,1fr))}}
    @media(max-width:600px){.kanban-board{grid-template-columns:repeat(2,minmax(160px,1fr))}}
  `]
})
export class LeadListComponent implements OnInit {
  private readonly leadService = inject(LeadService);
  private readonly userService = inject(UserService);

  readonly isLoading = signal(true);
  readonly viewMode = signal<'kanban' | 'list'>('kanban');
  readonly allLeads = signal<Lead[]>([]);
  readonly filteredLeads = signal<Lead[]>([]);
  readonly users = signal<User[]>([]);
  readonly isModalOpen = signal(false);
  readonly isEditMode = signal(false);

  searchQuery = '';
  sourceFilter = '';
  valueFilter = 0;
  kanbanColumns: any[] = [];
  modalLead: any = this.resetModalLead();

  statusStages: LeadStatus[] = [LeadStatus.New, LeadStatus.Contacted, LeadStatus.Qualified, LeadStatus.Won, LeadStatus.Lost];

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.isLoading.set(true);
    this.userService.getUsers().subscribe({ next: (d) => this.users.set(d), error: () => {} });
    this.leadService.getLeads().subscribe({
      next: (d) => { this.allLeads.set(d); this.applyFilters(); this.isLoading.set(false); },
      error: () => this.isLoading.set(false)
    });
  }

  applyFilters(): void {
    let list = [...this.allLeads()];
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(l => l.firstName.toLowerCase().includes(q) || l.lastName.toLowerCase().includes(q) || l.companyName.toLowerCase().includes(q) || l.email.toLowerCase().includes(q));
    }
    if (this.sourceFilter) list = list.filter(l => l.source === this.sourceFilter);
    if (this.valueFilter > 0) list = list.filter(l => l.estimatedValue >= this.valueFilter);
    this.filteredLeads.set(list);
    this.rebuildKanbanColumns();
  }

  rebuildKanbanColumns(): void {
    const titles = ['New Leads', 'Contacted', 'Qualified', 'Closed Won', 'Closed Lost'];
    const colors = ['#6366f1', '#0ea5e9', '#a855f7', '#10b981', '#ef4444'];
    this.kanbanColumns = this.statusStages.map((s, i) => ({ status: s, title: titles[i], color: colors[i], leads: this.filteredLeads().filter(l => l.status === s) }));
  }

  canMoveLeft(status: LeadStatus): boolean { const i = this.statusStages.indexOf(status); return i > 0 && status !== LeadStatus.Won && status !== LeadStatus.Lost; }
  canMoveRight(status: LeadStatus): boolean { const i = this.statusStages.indexOf(status); return i < this.statusStages.length - 1 && status !== LeadStatus.Won && status !== LeadStatus.Lost; }

  moveLead(lead: Lead, step: number): void {
    const next = this.statusStages[this.statusStages.indexOf(lead.status) + step];
    if (!next) return;
    const p = { ...lead, status: next, assignedToUserId: lead.assignedToUserId || null };
    this.leadService.updateLead(lead.id, p).subscribe({ next: (u) => { this.allLeads.set(this.allLeads().map(l => l.id === lead.id ? u : l)); this.applyFilters(); }, error: (e) => console.error(e) });
  }

  openCreateModal(): void { this.isEditMode.set(false); this.modalLead = this.resetModalLead(); this.isModalOpen.set(true); }
  openEditModal(lead: Lead): void {
    this.isEditMode.set(true);
    this.modalLead = { id: lead.id, firstName: lead.firstName, lastName: lead.lastName, email: lead.email, phone: lead.phone, companyName: lead.companyName, estimatedValue: lead.estimatedValue, status: lead.status, source: lead.source, assignedToUserId: lead.assignedToUserId || null };
    this.isModalOpen.set(true);
  }
  closeModal(): void { this.isModalOpen.set(false); }

  saveLead(): void {
    const p = { firstName: this.modalLead.firstName, lastName: this.modalLead.lastName, email: this.modalLead.email, phone: this.modalLead.phone, companyName: this.modalLead.companyName, estimatedValue: this.modalLead.estimatedValue, status: this.modalLead.status, source: this.modalLead.source, assignedToUserId: this.modalLead.assignedToUserId || null };
    if (this.isEditMode()) {
      this.leadService.updateLead(this.modalLead.id, p).subscribe({ next: (u) => { this.allLeads.set(this.allLeads().map(l => l.id === u.id ? u : l)); this.applyFilters(); this.closeModal(); }, error: (e) => console.error(e) });
    } else {
      this.leadService.createLead(p).subscribe({ next: (c) => { this.allLeads.set([...this.allLeads(), c]); this.applyFilters(); this.closeModal(); }, error: (e) => console.error(e) });
    }
  }

  deleteLead(id: string): void {
    if (confirm('Delete this lead?')) {
      this.leadService.deleteLead(id).subscribe({ next: () => { this.allLeads.set(this.allLeads().filter(l => l.id !== id)); this.applyFilters(); }, error: (e) => console.error(e) });
    }
  }

  private resetModalLead() { return { firstName: '', lastName: '', email: '', phone: '', companyName: '', estimatedValue: 0, status: 'New', source: 'Website', assignedToUserId: null }; }
}