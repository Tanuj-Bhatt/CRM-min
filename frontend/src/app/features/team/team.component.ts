import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/crm.models';

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="team-container animate-fade-in">
      <div class="page-header flex-between">
        <div>
          <h1>Team &amp; Security</h1>
          <p class="text-secondary">Manage users, roles, and access control.</p>
        </div>
        <button (click)="openCreateModal()" class="btn btn-primary"><span>➕</span> Invite User</button>
      </div>

      <!-- Stats -->
      <div class="card-grid">
        <div class="glass-panel stat-card">
          <div class="stat-icon">🛡️</div>
          <div><div class="stat-value">{{ adminCount() }}</div><div class="stat-label">Admins</div></div>
        </div>
        <div class="glass-panel stat-card">
          <div class="stat-icon">👔</div>
          <div><div class="stat-value">{{ managerCount() }}</div><div class="stat-label">Managers</div></div>
        </div>
        <div class="glass-panel stat-card">
          <div class="stat-icon">👤</div>
          <div><div class="stat-value">{{ agentCount() }}</div><div class="stat-label">Agents</div></div>
        </div>
        <div class="glass-panel stat-card">
          <div class="stat-icon">👥</div>
          <div><div class="stat-value">{{ users().length }}</div><div class="stat-label">Total Users</div></div>
        </div>
      </div>

      <div *ngIf="isLoading()" class="loading-state">
        <div class="spinner"></div><p class="text-muted">Loading team...</p>
      </div>

      <div *ngIf="!isLoading()" class="glass-panel" style="overflow:hidden;padding:0">
        <div class="custom-table-container">
          <table class="custom-table">
            <thead>
              <tr><th>Member</th><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of users()">
                <td>
                  <div class="user-cell">
                    <div class="user-av" [ngClass]="'av-' + user.role.toLowerCase()">{{ user.firstName[0] }}{{ user.lastName[0] }}</div>
                    <strong>{{ user.firstName }} {{ user.lastName }}</strong>
                  </div>
                </td>
                <td class="text-secondary">{{ user.email }}</td>
                <td><span class="badge" [ngClass]="'badge-' + user.role.toLowerCase()">{{ user.role }}</span></td>
                <td class="text-muted">{{ user.createdAt | date:'mediumDate' }}</td>
                <td>
                  <button *ngIf="user.id !== currentUserId()" (click)="deleteUser(user.id, user.firstName + ' ' + user.lastName)" class="btn btn-sm btn-del">Remove</button>
                  <span *ngIf="user.id === currentUserId()" class="you-tag">You</span>
                </td>
              </tr>
              <tr *ngIf="users().length === 0">
                <td colspan="5" class="text-center text-muted">No team members found.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal -->
      <div *ngIf="isModalOpen()" class="modal-backdrop">
        <div class="modal-card animate-fade-in">
          <div class="modal-header">
            <h2>Invite Team Member</h2>
            <button (click)="closeModal()" class="close-btn">✕</button>
          </div>
          <div *ngIf="errorMessage()" class="alert alert-danger">{{ errorMessage() }}</div>
          <form (ngSubmit)="createUser()" #userForm="ngForm">
            <div class="row-flex">
              <div class="form-group flex-1"><label class="form-label">First Name</label><input type="text" name="firstName" [(ngModel)]="newUser.firstName" required class="form-control" placeholder="John"/></div>
              <div class="form-group flex-1"><label class="form-label">Last Name</label><input type="text" name="lastName" [(ngModel)]="newUser.lastName" required class="form-control" placeholder="Doe"/></div>
            </div>
            <div class="form-group"><label class="form-label">Email</label><input type="email" name="email" [(ngModel)]="newUser.email" required class="form-control" placeholder="john@org.com"/></div>
            <div class="row-flex">
              <div class="form-group flex-1"><label class="form-label">Password</label><input type="password" name="password" [(ngModel)]="newUser.password" required minlength="6" class="form-control" placeholder="••••••••"/></div>
              <div class="form-group flex-1">
                <label class="form-label">Role</label>
                <select name="role" [(ngModel)]="newUser.role" class="form-control">
                  <option value="Agent">Agent</option><option value="Manager">Manager</option><option value="Admin">Admin</option>
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" (click)="closeModal()" class="btn btn-outline">Cancel</button>
              <button type="submit" [disabled]="userForm.invalid || isSaving()" class="btn btn-primary">{{ isSaving() ? 'Creating...' : 'Create Account' }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .team-container{display:flex;flex-direction:column;gap:20px}
    .stat-card{display:flex;align-items:center;padding:18px 20px;gap:14px}
    .stat-icon{font-size:1.5rem;width:46px;height:46px;min-width:46px;border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;background:var(--input-bg);border:1px solid var(--border-color)}
    .stat-value{font-size:1.6rem;font-weight:800;color:var(--text-primary);line-height:1}
    .stat-label{font-size:.78rem;color:var(--text-secondary);margin-top:2px}
    .user-cell{display:flex;align-items:center;gap:10px}
    .user-av{width:34px;height:34px;min-width:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:.75rem}
    .av-admin{background:linear-gradient(135deg,#d946ef,#a855f7)}
    .av-manager{background:linear-gradient(135deg,#0d9488,#14b8a6)}
    .av-agent{background:linear-gradient(135deg,#6b7280,#9ca3af)}
    .you-tag{font-size:.72rem;font-weight:700;color:var(--text-muted);background:var(--input-bg);padding:3px 9px;border-radius:9999px;border:1px solid var(--border-color)}
    .btn-del{background:transparent;border:1px solid rgba(239,68,68,.2);color:#f87171}
    .btn-del:hover{background:rgba(239,68,68,.08);border-color:var(--danger)}
    @media(max-width:640px){.custom-table th:nth-child(4),.custom-table td:nth-child(4){display:none}}
  `]
})
export class TeamComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);

  readonly isLoading = signal(true);
  readonly users = signal<User[]>([]);
  readonly currentUserId = signal('');
  readonly adminCount = signal(0);
  readonly managerCount = signal(0);
  readonly agentCount = signal(0);
  readonly isModalOpen = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  newUser = this.resetNewUser();

  ngOnInit(): void {
    const u = this.authService.currentUser();
    if (u) this.currentUserId.set(u.userId);
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.userService.getUsers().subscribe({
      next: (d) => { this.users.set(d); this.recalc(d); this.isLoading.set(false); },
      error: () => this.isLoading.set(false)
    });
  }

  openCreateModal(): void { this.newUser = this.resetNewUser(); this.errorMessage.set(''); this.isModalOpen.set(true); }
  closeModal(): void { this.isModalOpen.set(false); }

  createUser(): void {
    this.isSaving.set(true);
    this.errorMessage.set('');
    this.userService.createUser({ email: this.newUser.email, password: this.newUser.password, firstName: this.newUser.firstName, lastName: this.newUser.lastName, role: this.newUser.role }).subscribe({
      next: (c) => { this.users.update(l => [...l, c]); this.recalc(this.users()); this.isSaving.set(false); this.closeModal(); },
      error: (e) => { this.isSaving.set(false); this.errorMessage.set(e.error?.message || 'Failed. Email may already exist.'); }
    });
  }

  deleteUser(id: string, name: string): void {
    if (confirm(`Remove ${name}?`)) {
      this.userService.deleteUser(id).subscribe({ next: () => { this.users.update(l => l.filter(u => u.id !== id)); this.recalc(this.users()); }, error: (e) => console.error(e) });
    }
  }

  private recalc(d: User[]): void {
    this.adminCount.set(d.filter(u => u.role === 'Admin').length);
    this.managerCount.set(d.filter(u => u.role === 'Manager').length);
    this.agentCount.set(d.filter(u => u.role === 'Agent').length);
  }

  private resetNewUser() { return { firstName: '', lastName: '', email: '', password: '', role: 'Agent' }; }
}