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
      <div class="page-header flex-between">
        <div>
          <h1>Contacts Directory</h1>
          <p class="text-secondary">Manage your enterprise-wide contacts and client relationships.</p>
        </div>
        <button (click)="openCreateModal()" class="btn btn-primary"><span>➕</span> New Contact</button>
      </div>

      <div class="filters-bar glass-panel">
        <div class="search-box">
          <span>🔍</span>
          <input type="text" [(ngModel)]="searchQuery" (ngModelChange)="applyFilter()" placeholder="Search by name, email, company..." class="search-input"/>
        </div>
        <div class="stats-pill">
          <span style="font-weight:700;color:var(--primary)">{{ filteredContacts().length }}</span>
          <span class="text-muted"> / {{ allContacts().length }} contacts</span>
        </div>
      </div>

      <div *ngIf="isLoading()" class="loading-state">
        <div class="spinner"></div><p class="text-muted">Loading contacts...</p>
      </div>

      <div *ngIf="!isLoading()" class="contacts-grid">
        <div *ngFor="let contact of filteredContacts()" class="glass-panel contact-card">
          <div class="card-top">
            <div class="contact-avatar">{{ contact.firstName[0] }}{{ contact.lastName[0] }}</div>
            <div class="card-actions">
              <button (click)="openEditModal(contact)" class="icon-btn" title="Edit">✏️</button>
              <button (click)="deleteContact(contact.id)" class="icon-btn icon-btn-danger" title="Delete">🗑️</button>
            </div>
          </div>
          <h4 class="contact-name">{{ contact.firstName }} {{ contact.lastName }}</h4>
          <p class="contact-title">{{ contact.jobTitle || '—' }}</p>
          <p class="contact-company">🏢 {{ contact.companyName || 'N/A' }}</p>
          <div class="contact-meta">
            <div class="meta-row"><span>📧</span><span class="meta-val">{{ contact.email }}</span></div>
            <div class="meta-row"><span>📞</span><span class="meta-val">{{ contact.phone || 'Not provided' }}</span></div>
          </div>
          <div class="card-date">Added {{ contact.createdAt | date:'mediumDate' }}</div>
        </div>

        <div *ngIf="filteredContacts().length === 0 && !isLoading()" class="empty-state glass-panel flex-center" style="flex-direction:column;gap:12px;padding:60px 24px;grid-column:1/-1">
          <p class="text-muted">No contacts match your search.</p>
          <button (click)="openCreateModal()" class="btn btn-outline btn-sm">Create First Contact</button>
        </div>
      </div>

      <!-- Modal -->
      <div *ngIf="isModalOpen()" class="modal-backdrop">
        <div class="modal-card animate-fade-in">
          <div class="modal-header">
            <h2>{{ isEditMode() ? 'Edit Contact' : 'New Contact' }}</h2>
            <button (click)="closeModal()" class="close-btn">✕</button>
          </div>
          <form (ngSubmit)="saveContact()" #contactForm="ngForm">
            <div class="row-flex">
              <div class="form-group flex-1">
                <label class="form-label">First Name</label>
                <input type="text" name="firstName" [(ngModel)]="modalContact.firstName" required class="form-control" placeholder="Jane"/>
              </div>
              <div class="form-group flex-1">
                <label class="form-label">Last Name</label>
                <input type="text" name="lastName" [(ngModel)]="modalContact.lastName" required class="form-control" placeholder="Smith"/>
              </div>
            </div>
            <div class="row-flex">
              <div class="form-group flex-1">
                <label class="form-label">Email</label>
                <input type="email" name="email" [(ngModel)]="modalContact.email" required class="form-control" placeholder="jane@company.com"/>
              </div>
              <div class="form-group flex-1">
                <label class="form-label">Phone</label>
                <input type="text" name="phone" [(ngModel)]="modalContact.phone" class="form-control" placeholder="+1 (555) 987-6543"/>
              </div>
            </div>
            <div class="row-flex">
              <div class="form-group flex-1">
                <label class="form-label">Job Title</label>
                <input type="text" name="jobTitle" [(ngModel)]="modalContact.jobTitle" class="form-control" placeholder="VP of Engineering"/>
              </div>
              <div class="form-group flex-1">
                <label class="form-label">Company</label>
                <input type="text" name="companyName" [(ngModel)]="modalContact.companyName" class="form-control" placeholder="Acme Corp"/>
              </div>
            </div>
            <div class="modal-footer">
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
    .contacts-container{display:flex;flex-direction:column;gap:20px}
    .stats-pill{font-size:.8rem;white-space:nowrap}
    .contacts-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
    .contact-card{padding:20px;display:flex;flex-direction:column;gap:7px;transition:transform var(--transition-fast)}
    .contact-card:hover{transform:translateY(-2px)}
    .card-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px}
    .contact-avatar{width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--secondary));display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:.95rem}
    .card-actions{display:flex;gap:5px}
    .contact-name{font-size:1rem;font-weight:700;color:var(--text-primary)}
    .contact-title{font-size:.825rem;color:var(--secondary);font-weight:600}
    .contact-company{font-size:.78rem;color:var(--text-secondary)}
    .contact-meta{display:flex;flex-direction:column;gap:5px;margin-top:8px;padding-top:10px;border-top:1px solid var(--border-color)}
    .meta-row{display:flex;align-items:center;gap:7px;font-size:.78rem;color:var(--text-secondary)}
    .meta-val{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .card-date{font-size:.65rem;color:var(--text-muted);margin-top:6px;text-transform:uppercase;letter-spacing:.04em}
    @media(max-width:480px){.contacts-grid{grid-template-columns:1fr}}
  `]
})
export class ContactsComponent implements OnInit {
  private readonly contactService = inject(ContactService);

  readonly isLoading = signal(true);
  readonly allContacts = signal<Contact[]>([]);
  readonly filteredContacts = signal<Contact[]>([]);
  readonly isModalOpen = signal(false);
  readonly isEditMode = signal(false);
  searchQuery = '';
  modalContact: any = this.resetModal();

  ngOnInit(): void { this.loadContacts(); }

  loadContacts(): void {
    this.isLoading.set(true);
    this.contactService.getContacts().subscribe({
      next: (data) => { this.allContacts.set(data); this.applyFilter(); this.isLoading.set(false); },
      error: () => this.isLoading.set(false)
    });
  }

  applyFilter(): void {
    let list = [...this.allContacts()];
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(c => c.firstName.toLowerCase().includes(q) || c.lastName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.companyName || '').toLowerCase().includes(q) || (c.jobTitle || '').toLowerCase().includes(q));
    }
    this.filteredContacts.set(list);
  }

  openCreateModal(): void { this.isEditMode.set(false); this.modalContact = this.resetModal(); this.isModalOpen.set(true); }
  openEditModal(contact: Contact): void {
    this.isEditMode.set(true);
    this.modalContact = { id: contact.id, firstName: contact.firstName, lastName: contact.lastName, email: contact.email, phone: contact.phone, jobTitle: contact.jobTitle, companyName: contact.companyName };
    this.isModalOpen.set(true);
  }
  closeModal(): void { this.isModalOpen.set(false); }

  saveContact(): void {
    const payload = { firstName: this.modalContact.firstName, lastName: this.modalContact.lastName, email: this.modalContact.email, phone: this.modalContact.phone, jobTitle: this.modalContact.jobTitle, companyName: this.modalContact.companyName };
    if (this.isEditMode()) {
      this.contactService.updateContact(this.modalContact.id, payload).subscribe({ next: (u) => { this.allContacts.set(this.allContacts().map(c => c.id === u.id ? u : c)); this.applyFilter(); this.closeModal(); }, error: (e) => console.error(e) });
    } else {
      this.contactService.createContact(payload).subscribe({ next: (c) => { this.allContacts.update(l => [...l, c]); this.applyFilter(); this.closeModal(); }, error: (e) => console.error(e) });
    }
  }

  deleteContact(id: string): void {
    if (confirm('Remove this contact?')) {
      this.contactService.deleteContact(id).subscribe({ next: () => { this.allContacts.update(l => l.filter(c => c.id !== id)); this.applyFilter(); }, error: (e) => console.error(e) });
    }
  }

  private resetModal() { return { firstName: '', lastName: '', email: '', phone: '', jobTitle: '', companyName: '' }; }
}