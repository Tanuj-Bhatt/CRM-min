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
      <!-- Page Header -->
      <div class="page-header flex-between">
        <div>
          <h1>Sales Pipeline</h1>
          <p class="text-secondary">Track your leads through multiple stages of the enterprise sales cycle.</p>
        </div>
        <div class="actions flex-center gap-10">
          <div class="view-toggles glass-panel">
            <button (click)="viewMode.set('kanban')" [class.active]="viewMode() === 'kanban'" class="toggle-btn">
              📋 Board
            </button>
            <button (click)="viewMode.set('list')" [class.active]="viewMode() === 'list'" class="toggle-btn">
              ☰ List
            </button>
          </div>
          <button (click)="openCreateModal()" class="btn btn-primary">
            <span>➕</span> New Lead
          </button>
        </div>
      </div>

      <!-- Filters & Search -->
      <div class="filters-bar glass-panel flex-between">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            (ngModelChange)="applyFilters()" 
            placeholder="Search leads, companies, or contact info..." 
            class="search-input"
          />
        </div>
        
        <div class="filter-controls flex-center gap-10">
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

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="loading-state flex-center flex-direction-column">
        <div class="spinner"></div>
        <p>Loading pipeline leads...</p>
      </div>

      <!-- Main Views -->
      <div *ngIf="!isLoading()" class="view-viewport">
        
        <!-- Board View (Kanban) -->
        <div *ngIf="viewMode() === 'kanban'" class="kanban-board">
          <div *ngFor="let col of kanbanColumns" class="kanban-column glass-panel">
            <div class="column-header flex-between" [style.border-top-color]="col.color">
              <span class="column-title">{{ col.title }}</span>
              <span class="column-count">{{ col.leads.length }}</span>
            </div>
            
            <div class="column-body">
              <div 
                *ngFor="let lead of col.leads" 
                [routerLink]="['/leads', lead.id]" 
                class="kanban-card glass-panel"
              >
                <div class="card-header flex-between">
                  <span class="company-name">{{ lead.companyName }}</span>
                  <span class="lead-value">{{ lead.estimatedValue | currency:'USD':'symbol':'1.0-0' }}</span>
                </div>
                
                <h4 class="contact-name">{{ lead.firstName }} {{ lead.lastName }}</h4>
                
                <div class="card-footer flex-between">
                  <span class="lead-source">🌐 {{ lead.source }}</span>
                  <span class="lead-assignee" [title]="lead.assignedToUserName || 'Unassigned'">
                    👤 {{ lead.assignedToUserName ? (lead.assignedToUserName | slice:0:10) : 'None' }}
                  </span>
                </div>

                <!-- Quick Move Buttons -->
                <div class="quick-move flex-between" (click)="$event.stopPropagation()">
                  <button 
                    *ngIf="canMoveLeft(lead.status)" 
                    (click)="moveLead(lead, -1)" 
                    class="move-btn"
                  >◀</button>
                  <span class="move-label">Move stage</span>
                  <button 
                    *ngIf="canMoveRight(lead.status)" 
                    (click)="moveLead(lead, 1)" 
                    class="move-btn"
                  >▶</button>
                </div>
              </div>

              <div *ngIf="col.leads.length === 0" class="empty-column-state">
                Drop leads here
              </div>
            </div>
          </div>
        </div>

        <!-- List View -->
        <div *ngIf="viewMode() === 'list'" class="list-view-container glass-panel">
          <div class="custom-table-container">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Lead Contact</th>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Value</th>
                  <th>Source</th>
                  <th>Assignee</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let lead of filteredLeads()" class="clickable-row">
                  <td [routerLink]="['/leads', lead.id]">
                    <strong>{{ lead.firstName }} {{ lead.lastName }}</strong>
                    <div class="text-muted" style="font-size: 0.75rem;">{{ lead.email }}</div>
                  </td>
                  <td [routerLink]="['/leads', lead.id]">{{ lead.companyName }}</td>
                  <td [routerLink]="['/leads', lead.id]">
                    <span class="badge" [ngClass]="'badge-' + lead.status.toLowerCase()">
                      {{ lead.status }}
                    </span>
                  </td>
                  <td [routerLink]="['/leads', lead.id]" class="text-success font-semibold">
                    {{ lead.estimatedValue | currency:'USD':'symbol':'1.0-0' }}
                  </td>
                  <td [routerLink]="['/leads', lead.id]">{{ lead.source }}</td>
                  <td [routerLink]="['/leads', lead.id]">
                    {{ lead.assignedToUserName || 'Unassigned' }}
                  </td>
                  <td>
                    <div class="table-actions flex-center gap-10">
                      <button (click)="openEditModal(lead)" class="btn btn-outline btn-sm">✏️ Edit</button>
                      <button (click)="deleteLead(lead.id)" class="btn btn-outline btn-sm btn-danger-outline">🗑️</button>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="filteredLeads().length === 0">
                  <td colspan="7" class="text-center text-muted">No leads match the filters.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <!-- Create / Edit Modal -->
      <div *ngIf="isModalOpen()" class="modal-backdrop flex-center">
        <div class="modal-card glass-panel animate-fade-in">
          <div class="modal-header flex-between">
            <h2>{{ isEditMode() ? 'Edit CRM Lead' : 'Create New CRM Lead' }}</h2>
            <button (click)="closeModal()" class="close-btn">✕</button>
          </div>

          <form (ngSubmit)="saveLead()" #leadForm="ngForm" class="modal-form">
            <div class="row-flex">
              <div class="form-group flex-1">
                <label class="form-label">First Name</label>
                <input type="text" name="firstName" [(ngModel)]="modalLead.firstName" required class="form-control" placeholder="John" />
              </div>
              <div class="form-group flex-1">
                <label class="form-label">Last Name</label>
                <input type="text" name="lastName" [(ngModel)]="modalLead.lastName" required class="form-control" placeholder="Doe" />
              </div>
            </div>

            <div class="row-flex">
              <div class="form-group flex-1">
                <label class="form-label">Email</label>
                <input type="email" name="email" [(ngModel)]="modalLead.email" required email class="form-control" placeholder="john.doe@company.com" />
              </div>
              <div class="form-group flex-1">
                <label class="form-label">Phone</label>
                <input type="text" name="phone" [(ngModel)]="modalLead.phone" class="form-control" placeholder="+1 (555) 123-4567" />
              </div>
            </div>

            <div class="row-flex">
              <div class="form-group flex-2">
                <label class="form-label">Company Name</label>
                <input type="text" name="companyName" [(ngModel)]="modalLead.companyName" required class="form-control" placeholder="Acme Corporation" />
              </div>
              <div class="form-group flex-1">
                <label class="form-label">Estimated Value ($)</label>
                <input type="number" name="estimatedValue" [(ngModel)]="modalLead.estimatedValue" required min="0" class="form-control" placeholder="25000" />
              </div>
            </div>

            <div class="row-flex">
              <div class="form-group flex-1">
                <label class="form-label">Lead Status</label>
                <select name="status" [(ngModel)]="modalLead.status" class="form-control">
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Won">Won</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>
              <div class="form-group flex-1">
                <label class="form-label">Lead Source</label>
                <select name="source" [(ngModel)]="modalLead.source" class="form-control">
                  <option value="Website">Website</option>
                  <option value="Referral">Referral</option>
                  <option value="Cold Call">Cold Call</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Event">Event</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Assign To Team User</label>
              <select name="assignedToUserId" [(ngModel)]="modalLead.assignedToUserId" class="form-control">
                <option [value]="null">Unassigned</option>
                <option *ngFor="let user of users()" [value]="user.id">
                  {{ user.firstName }} {{ user.lastName }} ({{ user.role }})
                </option>
              </select>
            </div>

            <div class="modal-footer flex-between">
              <button type="button" (click)="closeModal()" class="btn btn-outline">Cancel</button>
              <button type="submit" [disabled]="leadForm.invalid" class="btn btn-primary">
                {{ isEditMode() ? 'Save Changes' : 'Create Lead' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .leads-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .page-header h1 {
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin-bottom: 6px;
      background: linear-gradient(to right, #ffffff, #9ca3af);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .view-toggles {
      display: flex;
      padding: 4px;
      border-radius: 8px;
    }

    .toggle-btn {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      padding: 6px 12px;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      border-radius: 6px;
      transition: all var(--transition-fast);
    }

    .toggle-btn.active {
      background-color: var(--primary);
      color: white;
    }

    /* Filters Bar */
    .filters-bar {
      padding: 16px 24px;
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 10px;
      background-color: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      padding: 8px 14px;
      flex: 1;
      max-width: 400px;
    }

    .search-input {
      background: transparent;
      border: none;
      color: white;
      outline: none;
      width: 100%;
      font-size: 0.875rem;
    }

    .filter-select {
      background-color: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      padding: 8px 12px;
      font-size: 0.8125rem;
      outline: none;
      cursor: pointer;
    }

    .filter-select:focus {
      border-color: var(--primary);
    }

    /* Loading State */
    .loading-state {
      padding: 100px 0;
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

    /* Kanban Board Layout */
    .kanban-board {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 16px;
      overflow-x: auto;
      align-items: start;
    }

    .kanban-column {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px;
      min-width: 200px;
      background-color: rgba(17, 24, 39, 0.4);
    }

    .column-header {
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-color);
      border-top: 3px solid transparent;
      margin-bottom: 4px;
    }

    .column-title {
      font-weight: 700;
      font-size: 0.875rem;
      color: white;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .column-count {
      background-color: rgba(255, 255, 255, 0.05);
      font-size: 0.75rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 9999px;
      color: var(--text-secondary);
    }

    .column-body {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-height: 400px;
    }

    /* Kanban Card */
    .kanban-card {
      padding: 16px;
      cursor: pointer;
      background-color: var(--bg-secondary);
      border-radius: var(--radius-sm);
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: transform var(--transition-fast), border-color var(--transition-fast);
    }

    .kanban-card:hover {
      transform: translateY(-2px);
      border-color: rgba(255, 255, 255, 0.15);
    }

    .company-name {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .lead-value {
      font-size: 0.8125rem;
      font-weight: 700;
      color: var(--secondary);
    }

    .contact-name {
      font-size: 0.9375rem;
      font-weight: 700;
      color: white;
    }

    .card-footer {
      font-size: 0.75rem;
      color: var(--text-secondary);
      margin-top: 4px;
    }

    .quick-move {
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.04);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .move-btn {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      color: var(--text-secondary);
      font-size: 0.65rem;
      padding: 2px 6px;
      cursor: pointer;
    }

    .move-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }

    .move-label {
      font-size: 0.65rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    .empty-column-state {
      padding: 30px 10px;
      border: 1.5px dashed var(--border-color);
      border-radius: var(--radius-sm);
      text-align: center;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    /* List View Table Styling */
    .btn-danger-outline {
      border-color: rgba(239, 68, 68, 0.2);
      color: #f87171;
    }

    .btn-danger-outline:hover {
      background-color: rgba(239, 68, 68, 0.1);
      border-color: #ef4444;
    }

    /* Modal Backdrop */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      z-index: 100;
    }

    .modal-card {
      width: 100%;
      max-width: 600px;
      padding: 32px;
      border-radius: var(--radius-lg);
      background-color: var(--bg-secondary);
    }

    .modal-header {
      margin-bottom: 24px;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 16px;
    }

    .modal-header h2 {
      font-size: 1.25rem;
      font-weight: 800;
      color: white;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      font-size: 1.15rem;
      cursor: pointer;
    }

    .close-btn:hover {
      color: white;
    }

    .row-flex {
      display: flex;
      gap: 16px;
    }

    .flex-1 { flex: 1; }
    .flex-2 { flex: 2; }
    .flex-direction-column { flex-direction: column; }

    .modal-footer {
      margin-top: 30px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
    }
  `]
})
export class LeadListComponent implements OnInit {
  private readonly leadService = inject(LeadService);
  private readonly userService = inject(UserService);

  readonly isLoading = signal(true);
  readonly viewMode = signal<'kanban' | 'list'>('kanban');
  
  // Lists
  readonly allLeads = signal<Lead[]>([]);
  readonly filteredLeads = signal<Lead[]>([]);
  readonly users = signal<User[]>([]);

  // Filters
  searchQuery = '';
  sourceFilter = '';
  valueFilter = 0;

  // Kanban setup
  kanbanColumns: any[] = [];
  statusStages: LeadStatus[] = [
    LeadStatus.New, 
    LeadStatus.Contacted, 
    LeadStatus.Qualified, 
    LeadStatus.Won, 
    LeadStatus.Lost
  ];

  // Modals
  readonly isModalOpen = signal(false);
  readonly isEditMode = signal(false);
  modalLead: any = this.resetModalLead();

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    
    // Fetch users for assignment dropdown
    this.userService.getUsers().subscribe({
      next: (data) => this.users.set(data),
      error: () => console.error('Failed to load users')
    });

    // Fetch leads
    this.leadService.getLeads().subscribe({
      next: (data) => {
        this.allLeads.set(data);
        this.applyFilters();
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  applyFilters(): void {
    let list = [...this.allLeads()];

    // Search query
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(l => 
        l.firstName.toLowerCase().includes(q) ||
        l.lastName.toLowerCase().includes(q) ||
        l.companyName.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q)
      );
    }

    // Source filter
    if (this.sourceFilter) {
      list = list.filter(l => l.source === this.sourceFilter);
    }

    // Value filter
    if (this.valueFilter > 0) {
      list = list.filter(l => l.estimatedValue >= this.valueFilter);
    }

    this.filteredLeads.set(list);
    this.rebuildKanbanColumns();
  }

  rebuildKanbanColumns(): void {
    const stageTitles = ['New Leads', 'Contacted', 'Qualified', 'Closed Won', 'Closed Lost'];
    const colors = ['#6366f1', '#0ea5e9', '#a855f7', '#10b981', '#ef4444'];
    
    this.kanbanColumns = this.statusStages.map((status, index) => {
      return {
        status: status,
        title: stageTitles[index],
        color: colors[index],
        leads: this.filteredLeads().filter(l => l.status === status)
      };
    });
  }

  // Quick move stages
  canMoveLeft(status: LeadStatus): boolean {
    const idx = this.statusStages.indexOf(status);
    return idx > 0 && status !== LeadStatus.Won && status !== LeadStatus.Lost;
  }

  canMoveRight(status: LeadStatus): boolean {
    const idx = this.statusStages.indexOf(status);
    return idx < this.statusStages.length - 1 && status !== LeadStatus.Won && status !== LeadStatus.Lost;
  }

  moveLead(lead: Lead, step: number): void {
    const currentIdx = this.statusStages.indexOf(lead.status);
    const nextIdx = currentIdx + step;
    if (nextIdx < 0 || nextIdx >= this.statusStages.length) return;

    const nextStatus = this.statusStages[nextIdx];
    
    const payload = {
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      companyName: lead.companyName,
      estimatedValue: lead.estimatedValue,
      status: nextStatus,
      source: lead.source,
      assignedToUserId: lead.assignedToUserId || null
    };

    this.leadService.updateLead(lead.id, payload).subscribe({
      next: (updated) => {
        // Update local list
        const updatedList = this.allLeads().map(l => l.id === lead.id ? updated : l);
        this.allLeads.set(updatedList);
        this.applyFilters();
      },
      error: (err) => console.error('Failed to move lead stage', err)
    });
  }

  // Modal actions
  openCreateModal(): void {
    this.isEditMode.set(false);
    this.modalLead = this.resetModalLead();
    this.isModalOpen.set(true);
  }

  openEditModal(lead: Lead): void {
    this.isEditMode.set(true);
    this.modalLead = {
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      companyName: lead.companyName,
      estimatedValue: lead.estimatedValue,
      status: lead.status,
      source: lead.source,
      assignedToUserId: lead.assignedToUserId || null
    };
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  saveLead(): void {
    const payload = {
      firstName: this.modalLead.firstName,
      lastName: this.modalLead.lastName,
      email: this.modalLead.email,
      phone: this.modalLead.phone,
      companyName: this.modalLead.companyName,
      estimatedValue: this.modalLead.estimatedValue,
      status: this.modalLead.status,
      source: this.modalLead.source,
      assignedToUserId: this.modalLead.assignedToUserId || null
    };

    if (this.isEditMode()) {
      this.leadService.updateLead(this.modalLead.id, payload).subscribe({
        next: (updated) => {
          const list = this.allLeads().map(l => l.id === updated.id ? updated : l);
          this.allLeads.set(list);
          this.applyFilters();
          this.closeModal();
        },
        error: (err) => console.error('Failed to update lead', err)
      });
    } else {
      this.leadService.createLead(payload).subscribe({
        next: (created) => {
          const list = [...this.allLeads(), created];
          this.allLeads.set(list);
          this.applyFilters();
          this.closeModal();
        },
        error: (err) => console.error('Failed to create lead', err)
      });
    }
  }

  deleteLead(id: string): void {
    if (confirm('Are you sure you want to delete this lead from the pipeline?')) {
      this.leadService.deleteLead(id).subscribe({
        next: () => {
          const list = this.allLeads().filter(l => l.id !== id);
          this.allLeads.set(list);
          this.applyFilters();
        },
        error: (err) => console.error('Failed to delete lead', err)
      });
    }
  }

  private resetModalLead() {
    return {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      companyName: '',
      estimatedValue: 0,
      status: 'New',
      source: 'Website',
      assignedToUserId: null
    };
  }
}
