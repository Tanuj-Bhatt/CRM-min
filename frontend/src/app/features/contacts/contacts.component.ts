import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactService } from '../../core/services/contact.service';
import { ToastService } from '../../core/services/toast.service';
import { Contact, ImportCsvResult } from '../../core/models/crm.models';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="contacts-container animate-fade-in">
      <!-- Page Header -->
      <div class="page-header flex-between">
        <div>
          <h1>Contacts Directory</h1>
          <p class="text-secondary">Manage enterprise client relationships, contact cards, and CSV integrations.</p>
        </div>
        <div class="actions contact-actions">
          <button (click)="exportCsv()" [disabled]="isExporting()" class="btn btn-outline" title="Export contacts to CSV">
            <span>📥</span> {{ isExporting() ? 'Exporting...' : 'Export' }}
          </button>
          <button (click)="openImportModal()" class="btn btn-secondary" title="Bulk import contacts from CSV">
            <span>📤</span> Import
          </button>
          <button (click)="openCreateModal()" class="btn btn-primary">
            <span>➕</span> New Contact
          </button>
        </div>
      </div>

      <!-- Search & Filters -->
      <div class="filters-bar glass-panel flex-between">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="applyFilter()"
            placeholder="Search by name, email, company, or job title..."
            class="search-input"
          />
        </div>
        <div class="stats-pill">
          <span class="stat-val">{{ filteredContacts().length }}</span> of {{ allContacts().length }} contacts
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="loading-state flex-center flex-col">
        <div class="spinner"></div>
        <p>Loading contacts...</p>
      </div>

      <!-- Contacts Grid -->
      <div *ngIf="!isLoading()" class="contacts-grid">
        <div
          *ngFor="let contact of filteredContacts()"
          class="glass-panel contact-card"
        >
          <div class="card-top flex-between">
            <div class="contact-avatar">
              {{ contact.firstName[0] }}{{ contact.lastName[0] }}
            </div>
            <div class="card-actions">
              <button (click)="openEditModal(contact)" class="icon-btn" title="Edit Contact">✏️</button>
              <button (click)="deleteContact(contact.id)" class="icon-btn icon-btn-danger" title="Delete Contact">🗑️</button>
            </div>
          </div>

          <h4 class="contact-name">{{ contact.firstName }} {{ contact.lastName }}</h4>
          <p class="contact-title">{{ contact.jobTitle || 'Representative' }}</p>
          <p class="contact-company">🏢 {{ contact.companyName || 'N/A' }}</p>

          <div class="contact-meta">
            <div class="meta-row">
              <span class="meta-icon">📧</span>
              <span class="meta-val">{{ contact.email }}</span>
            </div>
            <div class="meta-row">
              <span class="meta-icon">📞</span>
              <span class="meta-val">{{ contact.phone || 'Not provided' }}</span>
            </div>
          </div>

          <div class="card-footer-date text-muted">
            Added {{ contact.createdAt | date:'mediumDate' }}
          </div>
        </div>

        <div *ngIf="filteredContacts().length === 0 && !isLoading()" class="empty-state glass-panel flex-center flex-col">
          <p class="text-muted">No contacts match your criteria.</p>
          <button (click)="openCreateModal()" class="btn btn-outline btn-sm" style="margin-top: 12px;">
            Create First Contact
          </button>
        </div>
      </div>

      <!-- Create / Edit Modal -->
      <div *ngIf="isModalOpen()" class="modal-backdrop flex-center">
        <div class="modal-card glass-panel animate-fade-in">
          <div class="modal-header flex-between">
            <h2>{{ isEditMode() ? 'Edit Contact' : 'Create New Contact' }}</h2>
            <button (click)="closeModal()" class="close-btn">✕</button>
          </div>

          <form (ngSubmit)="saveContact()" #contactForm="ngForm" class="modal-form">
            <div class="row-flex">
              <div class="form-group flex-1">
                <label class="form-label">First Name *</label>
                <input type="text" name="firstName" [(ngModel)]="modalContact.firstName" required class="form-control" placeholder="Jane" />
              </div>
              <div class="form-group flex-1">
                <label class="form-label">Last Name *</label>
                <input type="text" name="lastName" [(ngModel)]="modalContact.lastName" required class="form-control" placeholder="Smith" />
              </div>
            </div>

            <div class="row-flex">
              <div class="form-group flex-1">
                <label class="form-label">Email Address *</label>
                <input type="email" name="email" [(ngModel)]="modalContact.email" required email class="form-control" placeholder="jane@company.com" />
              </div>
              <div class="form-group flex-1">
                <label class="form-label">Phone Number</label>
                <input type="text" name="phone" [(ngModel)]="modalContact.phone" class="form-control" placeholder="+1 (555) 987-6543" />
              </div>
            </div>

            <div class="row-flex">
              <div class="form-group flex-1">
                <label class="form-label">Job Title</label>
                <input type="text" name="jobTitle" [(ngModel)]="modalContact.jobTitle" class="form-control" placeholder="VP of Procurement" />
              </div>
              <div class="form-group flex-1">
                <label class="form-label">Company Name</label>
                <input type="text" name="companyName" [(ngModel)]="modalContact.companyName" class="form-control" placeholder="Starlight Logistics" />
              </div>
            </div>

            <div class="modal-footer flex-between">
              <button type="button" (click)="closeModal()" class="btn btn-outline">Cancel</button>
              <button type="submit" [disabled]="contactForm.invalid || isSaving()" class="btn btn-primary">
                {{ isSaving() ? 'Saving...' : (isEditMode() ? 'Save Changes' : 'Create Contact') }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Import CSV Modal -->
      <div *ngIf="isImportModalOpen()" class="modal-backdrop flex-center">
        <div class="modal-card glass-panel animate-fade-in" style="max-width: 540px;">
          <div class="modal-header flex-between">
            <h2>📥 Import Contacts (CSV)</h2>
            <button (click)="closeImportModal()" class="close-btn">✕</button>
          </div>

          <div class="import-instructions text-secondary text-sm" style="margin-bottom: 18px;">
            <p style="margin-bottom: 6px;">Upload a CSV file containing your client contacts.</p>
            <div style="background: rgba(0,0,0,0.25); padding: 8px 12px; border-radius: 6px; font-family: monospace; font-size: 0.75rem; color: #a5b4fc;">
              First Name, Last Name, Email, Phone, Job Title, Company Name
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
            <p *ngIf="selectedFile" style="color: var(--success); font-weight: 600;">
              ✓ Selected: {{ selectedFile.name }} ({{ (selectedFile.size / 1024) | number:'1.1-1' }} KB)
            </p>
          </div>

          <div *ngIf="importResult()" class="import-summary alert" [ngClass]="importResult()!.failedCount > 0 ? 'alert-danger' : 'alert-success'" style="margin-top: 16px;">
            <strong>Result:</strong> {{ importResult()!.importedCount }} contacts created out of {{ importResult()!.totalProcessed }} processed.
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
    .contacts-container {
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

    .filters-bar {
      padding: 16px 24px;
      display: flex;
      gap: 16px;
      align-items: center;
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
      max-width: 440px;
    }

    .search-input {
      background: transparent;
      border: none;
      color: white;
      outline: none;
      width: 100%;
      font-size: 0.875rem;
    }

    .stats-pill {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-color);
      padding: 6px 14px;
      border-radius: 9999px;
    }

    .stat-val {
      color: #ffffff;
      font-weight: 700;
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

    /* Contacts Grid */
    .contacts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }

    .contact-card {
      padding: 24px;
      border-radius: var(--radius-md);
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: transform var(--transition-fast), border-color var(--transition-fast);
      position: relative;
    }

    .contact-card:hover {
      transform: translateY(-2px);
      border-color: var(--primary);
    }

    .card-top {
      margin-bottom: 6px;
    }

    .contact-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(13, 148, 136, 0.2));
      border: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      color: var(--primary);
      font-size: 1rem;
    }

    .card-actions {
      display: flex;
      gap: 6px;
    }

    .icon-btn {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 6px 8px;
      cursor: pointer;
      font-size: 0.8rem;
      color: var(--text-secondary);
      transition: all var(--transition-fast);
    }

    .icon-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }

    .icon-btn-danger:hover {
      background: rgba(239, 68, 68, 0.2);
      border-color: var(--danger);
    }

    .contact-name {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .contact-title {
      font-size: 0.8125rem;
      color: var(--primary);
      font-weight: 600;
    }

    .contact-company {
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }

    .contact-meta {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid rgba(255, 255, 255, 0.04);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .meta-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8125rem;
    }

    .meta-val {
      color: var(--text-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .card-footer-date {
      font-size: 0.7rem;
      margin-top: 8px;
    }

    .empty-state {
      grid-column: 1 / -1;
      padding: 60px 20px;
      text-align: center;
      border-radius: var(--radius-md);
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      z-index: 1000;
    }

    .modal-card {
      width: 90%;
      max-width: 580px;
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
    .flex-col { flex-direction: column; }

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

    .contact-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    /* Responsive Contact Styles */
    @media (max-width: 767px) {
      .contact-actions {
        width: 100%;
        justify-content: flex-start;
      }
      .contact-actions button {
        flex: 1 1 auto;
      }
      .contacts-grid {
        grid-template-columns: 1fr;
        gap: 14px;
      }
    }

    @media (max-width: 639px) {
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
      .contact-card {
        padding: 16px;
      }
    }
  `]
})
export class ContactsComponent implements OnInit {
  private readonly contactService = inject(ContactService);
  private readonly toastService = inject(ToastService);

  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly isExporting = signal(false);
  readonly isImporting = signal(false);

  readonly allContacts = signal<Contact[]>([]);
  readonly filteredContacts = signal<Contact[]>([]);

  searchQuery = '';

  // Modal state
  readonly isModalOpen = signal(false);
  readonly isEditMode = signal(false);
  modalContact: any = this.resetModal();

  // CSV Import state
  readonly isImportModalOpen = signal(false);
  selectedFile: File | null = null;
  readonly importResult = signal<ImportCsvResult | null>(null);

  ngOnInit(): void {
    this.loadContacts();
  }

  loadContacts(): void {
    this.isLoading.set(true);
    this.contactService.getContacts().subscribe({
      next: (data) => {
        this.allContacts.set(data);
        this.applyFilter();
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toastService.error('Error', 'Failed to load contacts directory.');
      }
    });
  }

  applyFilter(): void {
    let list = [...this.allContacts()];
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(c =>
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.companyName || '').toLowerCase().includes(q) ||
        (c.jobTitle || '').toLowerCase().includes(q)
      );
    }
    this.filteredContacts.set(list);
  }

  openCreateModal(): void {
    this.isEditMode.set(false);
    this.modalContact = this.resetModal();
    this.isModalOpen.set(true);
  }

  openEditModal(contact: Contact): void {
    this.isEditMode.set(true);
    this.modalContact = {
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      jobTitle: contact.jobTitle,
      companyName: contact.companyName
    };
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  saveContact(): void {
    this.isSaving.set(true);
    const payload = {
      firstName: this.modalContact.firstName,
      lastName: this.modalContact.lastName,
      email: this.modalContact.email,
      phone: this.modalContact.phone,
      jobTitle: this.modalContact.jobTitle,
      companyName: this.modalContact.companyName
    };

    if (this.isEditMode()) {
      this.contactService.updateContact(this.modalContact.id, payload).subscribe({
        next: (updated) => {
          const list = this.allContacts().map(c => c.id === updated.id ? updated : c);
          this.allContacts.set(list);
          this.applyFilter();
          this.closeModal();
          this.isSaving.set(false);
          this.toastService.success('Contact Saved', `${updated.firstName} ${updated.lastName} updated.`);
        },
        error: () => {
          this.isSaving.set(false);
          this.toastService.error('Error', 'Failed to update contact.');
        }
      });
    } else {
      this.contactService.createContact(payload).subscribe({
        next: (created) => {
          this.allContacts.update(list => [created, ...list]);
          this.applyFilter();
          this.closeModal();
          this.isSaving.set(false);
          this.toastService.success('Contact Created', `Added ${created.firstName} ${created.lastName}.`);
        },
        error: () => {
          this.isSaving.set(false);
          this.toastService.error('Error', 'Failed to create contact.');
        }
      });
    }
  }

  deleteContact(id: string): void {
    if (confirm('Are you sure you want to remove this contact from the directory?')) {
      this.contactService.deleteContact(id).subscribe({
        next: () => {
          this.allContacts.update(list => list.filter(c => c.id !== id));
          this.applyFilter();
          this.toastService.success('Contact Removed', 'Contact was removed.');
        },
        error: () => this.toastService.error('Error', 'Failed to delete contact.')
      });
    }
  }

  exportCsv(): void {
    this.isExporting.set(true);
    this.contactService.exportCsv().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aerocrm_contacts_${new Date().toISOString().substring(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.isExporting.set(false);
        this.toastService.success('Export Ready', 'Contacts exported to CSV.');
      },
      error: () => {
        this.isExporting.set(false);
        this.toastService.error('Export Failed', 'Could not export contacts.');
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
    this.contactService.importCsv(this.selectedFile).subscribe({
      next: (result) => {
        this.importResult.set(result);
        this.isImporting.set(false);
        this.toastService.success('CSV Import Completed', `${result.importedCount} contacts imported.`);
        this.loadContacts();
      },
      error: () => {
        this.isImporting.set(false);
        this.toastService.error('Import Failed', 'Failed to process CSV file.');
      }
    });
  }

  downloadSampleCsv(): void {
    const sample = "First Name,Last Name,Email,Phone,Job Title,Company Name\n" +
      "Diana,Prince,diana@themyscira.org,+1 555-0188,VP of Relations,Themyscira Global\n" +
      "Clark,Kent,clark@dailyplanet.com,+1 555-0199,Senior Journalist,Daily Planet Corp\n";
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "aerocrm_contacts_sample.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  private resetModal() {
    return {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      jobTitle: '',
      companyName: ''
    };
  }
}
