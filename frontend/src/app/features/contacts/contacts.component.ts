import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactService } from '../../core/services/contact.service';
import { Contact } from '../../core/models/crm.models';

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
          <p class="text-secondary">Manage your enterprise-wide contacts and client relationships.</p>
        </div>
        <button (click)="openCreateModal()" class="btn btn-primary">
          <span>➕</span> New Contact
        </button>
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
          <p class="contact-title">{{ contact.jobTitle || 'No Title' }}</p>
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
          <p class="text-muted">No contacts match your search criteria.</p>
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
                <label class="form-label">First Name</label>
                <input type="text" name="firstName" [(ngModel)]="modalContact.firstName" required class="form-control" placeholder="Jane" />
              </div>
              <div class="form-group flex-1">
                <label class="form-label">Last Name</label>
                <input type="text" name="lastName" [(ngModel)]="modalContact.lastName" required class="form-control" placeholder="Smith" />
              </div>
            </div>

            <div class="row-flex">
              <div class="form-group flex-1">
                <label class="form-label">Email</label>
                <input type="email" name="email" [(ngModel)]="modalContact.email" required class="form-control" placeholder="jane@company.com" />
              </div>
              <div class="form-group flex-1">
                <label class="form-label">Phone</label>
                <input type="text" name="phone" [(ngModel)]="modalContact.phone" class="form-control" placeholder="+1 (555) 987-6543" />
              </div>
            </div>

            <div class="row-flex">
              <div class="form-group flex-1">
                <label class="form-label">Job Title</label>
                <input type="text" name="jobTitle" [(ngModel)]="modalContact.jobTitle" class="form-control" placeholder="VP of Engineering" />
              </div>
              <div class="form-group flex-1">
                <label class="form-label">Company Name</label>
                <input type="text" name="companyName" [(ngModel)]="modalContact.companyName" class="form-control" placeholder="Acme Corp" />
              </div>
            </div>

            <div class="modal-footer flex-between">
              <button type="button" (click)="closeModal()" class="btn btn-outline">Cancel</button>
              <button type="submit" [disabled]="contactForm.invalid" class="btn btn-primary">
                {{ isEditMode() ? 'Save Changes' : 'Create Contact' }}
              </button>
            </div>
          </form>
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

    /* Search */
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
      max-width: 420px;
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
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .stat-val {
      font-weight: 700;
      color: var(--primary);
    }

    /* Loading */
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

    .flex-col { flex-direction: column; }

    /* Contact Grid */
    .contacts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }

    .contact-card {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: transform var(--transition-fast), border-color var(--transition-fast);
    }

    .contact-card:hover {
      transform: translateY(-2px);
      border-color: rgba(255, 255, 255, 0.15);
    }

    .card-top {
      margin-bottom: 10px;
    }

    .contact-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: white;
      font-size: 1rem;
      box-shadow: 0 0 12px rgba(99, 102, 241, 0.2);
    }

    .card-actions {
      display: flex;
      gap: 6px;
    }

    .icon-btn {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .icon-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: var(--primary);
    }

    .icon-btn-danger:hover {
      border-color: var(--danger);
      background: rgba(239, 68, 68, 0.1);
    }

    .contact-name {
      font-size: 1.1rem;
      font-weight: 700;
      color: white;
    }

    .contact-title {
      font-size: 0.875rem;
      color: var(--secondary);
      font-weight: 600;
    }

    .contact-company {
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }

    .contact-meta {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 10px;
      padding-top: 12px;
      border-top: 1px solid var(--border-color);
    }

    .meta-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }

    .card-footer-date {
      font-size: 0.6875rem;
      margin-top: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .empty-state {
      grid-column: 1 / -1;
      padding: 60px 24px;
    }

    /* Modal */
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
      max-width: 560px;
      padding: 32px;
      border-radius: var(--radius-lg);
      background-color: var(--bg-secondary);
    }

    .modal-header {
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-color);
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

    .modal-footer {
      margin-top: 30px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
    }
  `]
})
export class ContactsComponent implements OnInit {
  private readonly contactService = inject(ContactService);

  readonly isLoading = signal(true);
  readonly allContacts = signal<Contact[]>([]);
  readonly filteredContacts = signal<Contact[]>([]);

  searchQuery = '';

  // Modal state
  readonly isModalOpen = signal(false);
  readonly isEditMode = signal(false);
  modalContact: any = this.resetModal();

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
      error: () => this.isLoading.set(false)
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
        },
        error: (err) => console.error('Failed to update contact', err)
      });
    } else {
      this.contactService.createContact(payload).subscribe({
        next: (created) => {
          this.allContacts.update(list => [...list, created]);
          this.applyFilter();
          this.closeModal();
        },
        error: (err) => console.error('Failed to create contact', err)
      });
    }
  }

  deleteContact(id: string): void {
    if (confirm('Are you sure you want to remove this contact from the directory?')) {
      this.contactService.deleteContact(id).subscribe({
        next: () => {
          this.allContacts.update(list => list.filter(c => c.id !== id));
          this.applyFilter();
        },
        error: (err) => console.error('Failed to delete contact', err)
      });
    }
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
