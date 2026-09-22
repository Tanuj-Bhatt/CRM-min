import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LeadService } from '../../../core/services/lead.service';
import { UserService } from '../../../core/services/user.service';
import { ToastService } from '../../../core/services/toast.service';
import { Lead, LeadStatus, User, ImportCsvResult } from '../../../core/models/crm.models';

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
          <p class="text-secondary">Track deals through the enterprise cycle with AI-assisted insights and CSV tools.</p>
        </div>
        <div class="actions pipeline-actions">
          <div class="view-toggles glass-panel">
            <button (click)="viewMode.set('kanban')" [class.active]="viewMode() === 'kanban'" class="toggle-btn">
              📋 Board
            </button>
            <button (click)="viewMode.set('list')" [class.active]="viewMode() === 'list'" class="toggle-btn">
              ☰ List
            </button>
          </div>
          <button (click)="exportCsv()" [disabled]="isExporting()" class="btn btn-outline" title="Export entire pipeline to CSV">
            <span>📥</span> {{ isExporting() ? 'Exporting...' : 'Export' }}
          </button>
          <button (click)="openImportModal()" class="btn btn-secondary" title="Bulk import leads from CSV file">
            <span>📤</span> Import
          </button>
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
            <option value="Imported">Imported</option>
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

                <div class="card-badges flex-between">
                  <span class="score-pill" [ngClass]="getScoreClass(lead.score)" [title]="'AI Deal Score: ' + lead.score + '/100'">
                    {{ getScoreEmoji(lead.score) }} {{ lead.score }} pts
                  </span>
                  <span *ngIf="lead.isStale" class="stale-pill" title="No recent interaction recorded">
                    ⚠️ Stale
                  </span>
                </div>
                
                <h4 class="contact-name">{{ lead.firstName }} {{ lead.lastName }}</h4>
                
                <!-- Close Date indicator if set -->
                <div *ngIf="lead.expectedCloseDate" class="card-date-badge">
                  📅 Target: {{ lead.expectedCloseDate | date:'mediumDate' }}
                </div>

                <!-- Close reason if Won/Lost -->
                <div *ngIf="lead.closeReason" class="card-reason-badge" [title]="lead.closeReason">
                  💬 {{ lead.closeReason | slice:0:30 }}{{ lead.closeReason.length > 30 ? '...' : '' }}
                </div>

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
                    title="Move to previous stage"
                  >◀</button>
                  <span class="move-label">Stage</span>
                  <button 
                    *ngIf="canMoveRight(lead.status)" 
                    (click)="moveLead(lead, 1)" 
                    class="move-btn"
                    title="Move to next stage"
                  >▶</button>
                </div>
              </div>

              <div *ngIf="col.leads.length === 0" class="empty-column-state">
                No active deals
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
                  <th>Target Close</th>
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
                    <div class="table-status-group">
                      <span class="badge" [ngClass]="'badge-' + lead.status.toLowerCase()">
                        {{ lead.status }}
                      </span>
                      <span class="score-pill" [ngClass]="getScoreClass(lead.score)" [title]="'AI Deal Score: ' + lead.score + '/100'">
                        {{ getScoreEmoji(lead.score) }} {{ lead.score }}
                      </span>
                      <span *ngIf="lead.isStale" class="stale-pill" title="Stale deal — no recent activity recorded">
                        ⚠️ Stale
                      </span>
                    </div>
                  </td>
                  <td [routerLink]="['/leads', lead.id]" class="text-success font-semibold">
                    {{ lead.estimatedValue | currency:'USD':'symbol':'1.0-0' }}
                  </td>
                  <td [routerLink]="['/leads', lead.id]">{{ lead.source }}</td>
                  <td [routerLink]="['/leads', lead.id]" class="text-secondary text-sm">
                    {{ lead.expectedCloseDate ? (lead.expectedCloseDate | date:'mediumDate') : '—' }}
                  </td>
                  <td [routerLink]="['/leads', lead.id]">
                    {{ lead.assignedToUserName || 'Unassigned' }}
                  </td>
                  <td>
                    <div class="table-actions flex-center gap-10">
                      <button (click)="openEditModal(lead)" class="btn btn-outline btn-sm">✏️ Edit</button>
                      <button (click)="deleteLead(lead.id)" class="btn btn-outline btn-sm btn-danger-outline" title="Delete lead">🗑️</button>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="filteredLeads().length === 0">
                  <td colspan="8" class="text-center text-muted">No leads match the filters.</td>
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
                <label class="form-label">First Name *</label>
                <input type="text" name="firstName" [(ngModel)]="modalLead.firstName" required class="form-control" placeholder="John" />
              </div>
              <div class="form-group flex-1">
                <label class="form-label">Last Name *</label>
                <input type="text" name="lastName" [(ngModel)]="modalLead.lastName" required class="form-control" placeholder="Doe" />
              </div>
            </div>

            <div class="row-flex">
              <div class="form-group flex-1">
                <label class="form-label">Email Address *</label>
                <input type="email" name="email" [(ngModel)]="modalLead.email" required email class="form-control" placeholder="john.doe@company.com" />
              </div>
              <div class="form-group flex-1">
                <label class="form-label">Phone</label>
                <input type="text" name="phone" [(ngModel)]="modalLead.phone" class="form-control" placeholder="+1 (555) 123-4567" />
              </div>
            </div>

            <div class="row-flex">
              <div class="form-group flex-2">
                <label class="form-label">Company Name *</label>
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
                  <option value="Imported">Imported</option>
                </select>
              </div>
            </div>

            <div class="row-flex">
              <div class="form-group flex-1">
                <label class="form-label">Target Close Date</label>
                <input type="date" name="expectedCloseDate" [(ngModel)]="modalLead.expectedCloseDate" class="form-control" />
              </div>
              <div class="form-group flex-1" *ngIf="modalLead.status === 'Won' || modalLead.status === 'Lost'">
                <label class="form-label">Close Reason / Notes</label>
                <input type="text" name="closeReason" [(ngModel)]="modalLead.closeReason" class="form-control" placeholder="e.g. Budget approved, Competitor chosen" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Assign To Team Representative</label>
              <select name="assignedToUserId" [(ngModel)]="modalLead.assignedToUserId" class="form-control">
                <option [value]="null">Unassigned</option>
                <option *ngFor="let user of users()" [value]="user.id">
                  {{ user.firstName }} {{ user.lastName }} ({{ user.role }})
                </option>
              </select>
            </div>

            <div class="modal-footer flex-between">
              <button type="button" (click)="closeModal()" class="btn btn-outline">Cancel</button>
              <button type="submit" [disabled]="leadForm.invalid || isSaving()" class="btn btn-primary">
                {{ isSaving() ? 'Saving...' : (isEditMode() ? 'Save Changes' : 'Create Lead') }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Import CSV Modal -->
      <div *ngIf="isImportModalOpen()" class="modal-backdrop flex-center">
        <div class="modal-card glass-panel animate-fade-in" style="max-width: 540px;">
          <div class="modal-header flex-between">
            <h2>📥 Bulk Import Leads (CSV)</h2>
            <button (click)="closeImportModal()" class="close-btn">✕</button>
          </div>

          <div class="import-instructions text-secondary text-sm" style="margin-bottom: 18px;">
            <p style="margin-bottom: 6px;">Upload your CSV file to import prospects directly into your pipeline.</p>
            <div style="background: rgba(0,0,0,0.25); padding: 8px 12px; border-radius: 6px; font-family: monospace; font-size: 0.75rem; color: #a5b4fc;">
              First Name, Last Name, Email, Phone, Company, Estimated Value, Status, Source
            </div>
            <div style="margin-top: 10px;">
              <button type="button" (click)="downloadSampleCsv()" class="btn btn-outline btn-sm">
                📄 Download Sample CSV Template
              </button>
            </div>
          </div>

          <div class="drop-zone" (click)="fileInput.click()">
            <input type="file" #fileInput (change)="onFileSelected($event)" accept=".csv" style="display: none;" />
            <div style="font-size: 2rem; margin-bottom: 8px;">📂</div>
            <p *ngIf="!selectedFile">Click or drag & drop a <strong>.csv</strong> file here</p>
            <p *ngIf="selectedFile" class="selected-file-name" style="color: var(--success); font-weight: 600;">
              ✓ Selected: {{ selectedFile.name }} ({{ (selectedFile.size / 1024) | number:'1.1-1' }} KB)
            </p>
          </div>

          <div *ngIf="importResult()" class="import-summary alert" [ngClass]="importResult()!.failedCount > 0 ? 'alert-danger' : 'alert-success'" style="margin-top: 16px;">
            <strong>Result:</strong> {{ importResult()!.importedCount }} leads created successfully out of {{ importResult()!.totalProcessed }} processed.
            <div *ngIf="importResult()!.errors.length" style="margin-top: 6px; max-height: 80px; overflow-y: auto;">
              <div *ngFor="let err of importResult()!.errors" style="font-size: 0.75rem;">• {{ err }}</div>
            </div>
          </div>

          <div class="modal-footer flex-between" style="margin-top: 24px;">
            <button type="button" (click)="closeImportModal()" class="btn btn-outline">Close</button>
            <button type="button" (click)="uploadCsv()" [disabled]="!selectedFile || isImporting()" class="btn btn-primary">
              {{ isImporting() ? 'Importing File...' : 'Start CSV Import' }}
            </button>
          </div>
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
      grid-template-columns: repeat(5, minmax(250px, 1fr));
      gap: 16px;
      overflow-x: auto;
      padding-bottom: 16px;
      align-items: start;
    }

    .kanban-column {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 270px);
      min-height: 520px;
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .column-header {
      padding: 14px 16px;
      background: rgba(255, 255, 255, 0.02);
      border-bottom: 1px solid var(--border-color);
      border-top: 3px solid transparent;
      font-weight: 700;
      font-size: 0.875rem;
    }

    .column-count {
      background-color: rgba(255, 255, 255, 0.06);
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .column-body {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      flex: 1;
      overflow-y: auto;
    }

    .kanban-card {
      padding: 14px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 8px;
      border-color: rgba(255, 255, 255, 0.04);
      transition: transform var(--transition-fast), border-color var(--transition-fast);
    }

    .kanban-card:hover {
      transform: translateY(-2px);
      border-color: var(--primary);
    }

    .card-header {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .company-name {
      font-weight: 600;
      color: #9ca3af;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 140px;
    }

    .lead-value {
      font-weight: 700;
      color: var(--success);
    }

    .contact-name {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .card-date-badge {
      font-size: 0.7rem;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.08);
      padding: 2px 6px;
      border-radius: 4px;
      align-self: flex-start;
    }

    .card-reason-badge {
      font-size: 0.7rem;
      color: #f472b6;
      background: rgba(244, 114, 182, 0.08);
      padding: 2px 6px;
      border-radius: 4px;
    }

    .card-badges {
      align-items: center;
      margin: 2px 0 4px 0;
    }

    .score-pill {
      display: inline-flex;
      align-items: center;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 12px;
    }

    .score-hot {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .score-warm {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .score-cold {
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }

    .stale-pill {
      display: inline-flex;
      align-items: center;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 6px;
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.4);
      animation: pulse-stale 2s infinite ease-in-out;
    }

    @keyframes pulse-stale {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    .table-status-group {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .card-footer {
      font-size: 0.75rem;
      color: var(--text-muted);
      border-top: 1px solid rgba(255, 255, 255, 0.04);
      padding-top: 8px;
      margin-top: 2px;
    }

    .quick-move {
      margin-top: 4px;
      padding-top: 6px;
      border-top: 1px dashed rgba(255, 255, 255, 0.05);
    }

    .move-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-color);
      color: var(--text-secondary);
      border-radius: 4px;
      width: 24px;
      height: 24px;
      font-size: 0.65rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--transition-fast);
    }

    .move-btn:hover {
      background: var(--primary);
      color: white;
    }

    .move-label {
      font-size: 0.65rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .empty-column-state {
      padding: 30px 10px;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.8125rem;
      border: 1px dashed rgba(255, 255, 255, 0.05);
      border-radius: var(--radius-sm);
    }

    /* List View Table */
    .list-view-container {
      padding: 20px;
      border-radius: var(--radius-md);
    }

    .clickable-row {
      cursor: pointer;
    }

    .clickable-row:hover {
      background: rgba(255, 255, 255, 0.02);
    }

    /* Modals & Dropzone */
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

    .row-flex {
      display: flex;
      gap: 16px;
    }

    .flex-1 { flex: 1; }
    .flex-2 { flex: 2; }
    .flex-direction-column { flex-direction: column; }

    .modal-footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
    }

    .drop-zone {
      border: 2px dashed var(--border-color);
      border-radius: var(--radius-md);
      padding: 30px;
      text-align: center;
      cursor: pointer;
      background: rgba(255, 255, 255, 0.01);
      transition: all var(--transition-fast);
    }

    .drop-zone:hover {
      border-color: var(--primary);
      background: rgba(99, 102, 241, 0.03);
    }

    .pipeline-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    /* Responsive Breakpoints for Lead List */
    @media (max-width: 1023px) {
      .kanban-column {
        height: calc(100vh - 250px);
        min-height: 480px;
      }
    }

    @media (max-width: 860px) {
      .kanban-board {
        display: flex;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
        gap: 14px;
        padding-bottom: 16px;
      }

      .kanban-column {
        min-width: 82vw;
        max-width: 85vw;
        scroll-snap-align: start;
        flex-shrink: 0;
        height: calc(100vh - 260px);
        min-height: 420px;
      }

      .pipeline-actions {
        width: 100%;
        justify-content: flex-start;
      }

      .pipeline-actions button {
        flex: 1 1 auto;
      }
    }

    @media (max-width: 639px) {
      .filters-bar {
        padding: 12px;
      }
      .modal-card {
        padding: 16px 12px;
      }
      .modal-footer {
        flex-direction: column-reverse;
        gap: 8px;
      }
      .modal-footer button {
        width: 100%;
      }
    }
  `]
})
export class LeadListComponent implements OnInit {
  private readonly leadService = inject(LeadService);
  private readonly userService = inject(UserService);
  private readonly toastService = inject(ToastService);

  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly isExporting = signal(false);
  readonly isImporting = signal(false);
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

  // Lead Create/Edit Modal
  readonly isModalOpen = signal(false);
  readonly isEditMode = signal(false);
  modalLead: any = this.resetModalLead();

  // CSV Import Modal
  readonly isImportModalOpen = signal(false);
  selectedFile: File | null = null;
  readonly importResult = signal<ImportCsvResult | null>(null);

  getScoreClass(score: number): string {
    if (score >= 70) return 'score-hot';
    if (score >= 40) return 'score-warm';
    return 'score-cold';
  }

  getScoreEmoji(score: number): string {
    if (score >= 70) return '🔥';
    if (score >= 40) return '⚡';
    return '❄️';
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    
    this.userService.getUsers().subscribe({
      next: (data) => this.users.set(data),
      error: () => console.error('Failed to load users')
    });

    this.leadService.getLeads().subscribe({
      next: (data) => {
        this.allLeads.set(data);
        this.applyFilters();
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toastService.error('Error', 'Failed to load pipeline leads.');
      }
    });
  }

  applyFilters(): void {
    let list = [...this.allLeads()];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(l => 
        l.firstName.toLowerCase().includes(q) ||
        l.lastName.toLowerCase().includes(q) ||
        l.companyName.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q)
      );
    }

    if (this.sourceFilter) {
      list = list.filter(l => l.source === this.sourceFilter);
    }

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
    let closeReason = lead.closeReason;

    if (nextStatus === LeadStatus.Won || nextStatus === LeadStatus.Lost) {
      const promptText = nextStatus === LeadStatus.Won ? 'Won Deal Reason / Notes:' : 'Lost Deal Reason / Notes:';
      const reasonInput = prompt(promptText, closeReason || '');
      if (reasonInput !== null) {
        closeReason = reasonInput;
      }
    }
    
    const payload = {
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      companyName: lead.companyName,
      estimatedValue: lead.estimatedValue,
      status: nextStatus,
      source: lead.source,
      assignedToUserId: lead.assignedToUserId || null,
      expectedCloseDate: lead.expectedCloseDate,
      closeReason: closeReason
    };

    this.leadService.updateLead(lead.id, payload).subscribe({
      next: (updated) => {
        const updatedList = this.allLeads().map(l => l.id === lead.id ? updated : l);
        this.allLeads.set(updatedList);
        this.applyFilters();
        this.toastService.info('Pipeline Updated', `${lead.companyName} moved to ${nextStatus}`);
      },
      error: (err) => {
        this.toastService.error('Update Failed', err?.error?.message || 'Could not move lead stage.');
      }
    });
  }

  // Create / Edit Modal
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
      assignedToUserId: lead.assignedToUserId || null,
      expectedCloseDate: lead.expectedCloseDate ? lead.expectedCloseDate.substring(0, 10) : '',
      closeReason: lead.closeReason || ''
    };
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  saveLead(): void {
    this.isSaving.set(true);
    const payload = {
      firstName: this.modalLead.firstName,
      lastName: this.modalLead.lastName,
      email: this.modalLead.email,
      phone: this.modalLead.phone,
      companyName: this.modalLead.companyName,
      estimatedValue: this.modalLead.estimatedValue,
      status: this.modalLead.status,
      source: this.modalLead.source,
      assignedToUserId: this.modalLead.assignedToUserId || null,
      expectedCloseDate: this.modalLead.expectedCloseDate ? new Date(this.modalLead.expectedCloseDate).toISOString() : null,
      closeReason: this.modalLead.closeReason || null
    };

    if (this.isEditMode()) {
      this.leadService.updateLead(this.modalLead.id, payload).subscribe({
        next: (updated) => {
          const list = this.allLeads().map(l => l.id === updated.id ? updated : l);
          this.allLeads.set(list);
          this.applyFilters();
          this.closeModal();
          this.isSaving.set(false);
          this.toastService.success('Lead Updated', `${updated.companyName} details saved.`);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.toastService.error('Error', err?.error?.message || 'Failed to update lead.');
        }
      });
    } else {
      this.leadService.createLead(payload).subscribe({
        next: (created) => {
          const list = [created, ...this.allLeads()];
          this.allLeads.set(list);
          this.applyFilters();
          this.closeModal();
          this.isSaving.set(false);
          this.toastService.success('Lead Created', `Added ${created.firstName} ${created.lastName} to pipeline.`);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.toastService.error('Error', err?.error?.message || 'Failed to create lead.');
        }
      });
    }
  }

  deleteLead(id: string): void {
    if (confirm('Are you sure you want to remove this lead?')) {
      this.leadService.deleteLead(id).subscribe({
        next: () => {
          const list = this.allLeads().filter(l => l.id !== id);
          this.allLeads.set(list);
          this.applyFilters();
          this.toastService.success('Lead Removed', 'Lead was deleted.');
        },
        error: (err) => {
          this.toastService.error('Error', err?.error?.message || 'Failed to delete lead.');
        }
      });
    }
  }

  // CSV Export & Import
  exportCsv(): void {
    this.isExporting.set(true);
    this.leadService.exportCsv().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aerocrm_leads_${new Date().toISOString().substring(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.isExporting.set(false);
        this.toastService.success('Export Ready', 'Pipeline leads exported to CSV.');
      },
      error: () => {
        this.isExporting.set(false);
        this.toastService.error('Export Error', 'Failed to generate CSV export.');
      }
    });
  }

  openImportModal(): void {
    this.selectedFile = null;
    this.importResult.set(null);
    this.isImportModalOpen.set(true);
  }

  closeImportModal(): void {
    this.isImportModalOpen.set(false);
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  uploadCsv(): void {
    if (!this.selectedFile) return;

    this.isImporting.set(true);
    this.leadService.importCsv(this.selectedFile).subscribe({
      next: (result) => {
        this.importResult.set(result);
        this.isImporting.set(false);
        this.toastService.success('CSV Import Completed', `${result.importedCount} leads created.`);
        this.loadData();
      },
      error: (err) => {
        this.isImporting.set(false);
        this.toastService.error('Import Failed', err?.error?.message || 'Error processing CSV file.');
      }
    });
  }

  downloadSampleCsv(): void {
    const sample = "First Name,Last Name,Email,Phone,Company,Estimated Value,Status,Source\n" +
      "Sophia,Turner,sophia@apexcloud.io,+1 555-0192,Apex Cloud Solutions,85000,New,Website\n" +
      "Marcus,Vance,marcus@vancetech.com,+1 555-0144,Vance Global,120000,Qualified,Referral\n";
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "aerocrm_leads_sample.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
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
      assignedToUserId: null,
      expectedCloseDate: '',
      closeReason: ''
    };
  }
}
