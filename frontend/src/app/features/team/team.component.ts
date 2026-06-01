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
      <!-- Page Header -->
      <div class="page-header flex-between">
        <div>
          <h1>Team &amp; Security</h1>
          <p class="text-secondary">Manage users, roles, and access control for your organization.</p>
        </div>
        <button (click)="openCreateModal()" class="btn btn-primary">
          <span>➕</span> Invite User
        </button>
      </div>

      <!-- Team Stats Row -->
      <div class="card-grid">
        <div class="glass-panel stat-card">
          <div class="stat-icon icon-purple">🛡️</div>
          <div class="stat-data">
            <span class="stat-value">{{ adminCount() }}</span>
            <span class="stat-label">Administrators</span>
          </div>
        </div>
        <div class="glass-panel stat-card">
          <div class="stat-icon icon-teal">👔</div>
          <div class="stat-data">
            <span class="stat-value">{{ managerCount() }}</span>
            <span class="stat-label">Managers</span>
          </div>
        </div>
        <div class="glass-panel stat-card">
          <div class="stat-icon icon-blue">👤</div>
          <div class="stat-data">
            <span class="stat-value">{{ agentCount() }}</span>
            <span class="stat-label">Agents</span>
          </div>
        </div>
        <div class="glass-panel stat-card">
          <div class="stat-icon icon-green">👥</div>
          <div class="stat-data">
            <span class="stat-value">{{ users().length }}</span>
            <span class="stat-label">Total Users</span>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading()" class="loading-state flex-center flex-col">
        <div class="spinner"></div>
        <p>Loading team roster...</p>
      </div>

      <!-- Users Table -->
      <div *ngIf="!isLoading()" class="glass-panel table-wrapper">
        <div class="custom-table-container">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Team Member</th>
                <th>Email Address</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of users()">
                <td>
                  <div class="user-cell">
                    <div class="user-avatar" [ngClass]="'avatar-' + user.role.toLowerCase()">
                      {{ user.firstName[0] }}{{ user.lastName[0] }}
                    </div>
                    <strong>{{ user.firstName }} {{ user.lastName }}</strong>
                  </div>
                </td>
                <td>{{ user.email }}</td>
                <td>
                  <span class="badge" [ngClass]="'badge-' + user.role.toLowerCase()">
                    {{ user.role }}
                  </span>
                </td>
                <td class="text-muted">{{ user.createdAt | date:'mediumDate' }}</td>
                <td>
                  <button
                    *ngIf="user.id !== currentUserId()"
                    (click)="deleteUser(user.id, user.firstName + ' ' + user.lastName)"
                    class="btn btn-outline btn-sm btn-danger-outline"
                  >
                    Remove
                  </button>
                  <span *ngIf="user.id === currentUserId()" class="you-badge">You</span>
                </td>
              </tr>
              <tr *ngIf="users().length === 0">
                <td colspan="5" class="text-center text-muted">No team members found.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Create User Modal -->
      <div *ngIf="isModalOpen()" class="modal-backdrop flex-center">
        <div class="modal-card glass-panel animate-fade-in">
          <div class="modal-header flex-between">
            <h2>Invite New Team Member</h2>
            <button (click)="closeModal()" class="close-btn">✕</button>
          </div>

          <div *ngIf="errorMessage()" class="alert alert-danger">{{ errorMessage() }}</div>

          <form (ngSubmit)="createUser()" #userForm="ngForm" class="modal-form">
            <div class="row-flex">
              <div class="form-group flex-1">
                <label class="form-label">First Name</label>
                <input type="text" name="firstName" [(ngModel)]="newUser.firstName" required class="form-control" placeholder="John" />
              </div>
              <div class="form-group flex-1">
                <label class="form-label">Last Name</label>
                <input type="text" name="lastName" [(ngModel)]="newUser.lastName" required class="form-control" placeholder="Doe" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input type="email" name="email" [(ngModel)]="newUser.email" required class="form-control" placeholder="john@organization.com" />
            </div>

            <div class="row-flex">
              <div class="form-group flex-1">
                <label class="form-label">Temporary Password</label>
                <input type="password" name="password" [(ngModel)]="newUser.password" required minlength="6" class="form-control" placeholder="••••••••" />
              </div>
              <div class="form-group flex-1">
                <label class="form-label">Assign Role</label>
                <select name="role" [(ngModel)]="newUser.role" class="form-control">
                  <option value="Agent">Agent</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            </div>

            <div class="modal-footer flex-between">
              <button type="button" (click)="closeModal()" class="btn btn-outline">Cancel</button>
              <button type="submit" [disabled]="userForm.invalid || isSaving()" class="btn btn-primary">
                {{ isSaving() ? 'Creating...' : 'Create User Account' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .team-container {
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

    /* Stat Cards */
    .stat-card {
      display: flex;
      align-items: center;
      padding: 24px;
      gap: 18px;
    }

    .stat-icon {
      font-size: 1.5rem;
      width: 50px;
      height: 50px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-color);
    }

    .icon-purple { box-shadow: 0 0 12px rgba(217, 70, 239, 0.15); }
    .icon-teal { box-shadow: 0 0 12px rgba(13, 148, 136, 0.15); }
    .icon-blue { box-shadow: 0 0 12px rgba(99, 102, 241, 0.15); }
    .icon-green { box-shadow: 0 0 12px rgba(16, 185, 129, 0.15); }

    .stat-data {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .stat-value {
      font-size: 1.75rem;
      font-weight: 800;
      color: white;
      line-height: 1;
    }

    .stat-label {
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }

    /* Loading */
    .loading-state {
      padding: 60px 0;
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

    /* Table */
    .table-wrapper {
      padding: 0;
      overflow: hidden;
    }

    .user-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: white;
      font-size: 0.8rem;
    }

    .avatar-admin {
      background: linear-gradient(135deg, #d946ef, #a855f7);
    }

    .avatar-manager {
      background: linear-gradient(135deg, #0d9488, #14b8a6);
    }

    .avatar-agent {
      background: linear-gradient(135deg, #6b7280, #9ca3af);
    }

    .you-badge {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      background-color: rgba(255, 255, 255, 0.03);
      padding: 4px 10px;
      border-radius: 9999px;
      border: 1px solid var(--border-color);
    }

    .btn-danger-outline {
      border-color: rgba(239, 68, 68, 0.2);
      color: #f87171;
    }

    .btn-danger-outline:hover {
      background-color: rgba(239, 68, 68, 0.1);
      border-color: #ef4444;
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
      max-width: 520px;
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

    .alert {
      padding: 12px 16px;
      border-radius: var(--radius-sm);
      font-size: 0.8125rem;
      margin-bottom: 20px;
      border: 1px solid transparent;
    }

    .alert-danger {
      background-color: rgba(239, 68, 68, 0.1);
      color: #f87171;
      border-color: rgba(239, 68, 68, 0.2);
    }
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

  // Modal state
  readonly isModalOpen = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  newUser = this.resetNewUser();

  ngOnInit(): void {
    const currentUser = this.authService.currentUser();
    if (currentUser) {
      this.currentUserId.set(currentUser.userId);
    }
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.userService.getUsers().subscribe({
      next: (data) => {
        this.users.set(data);
        this.adminCount.set(data.filter(u => u.role === 'Admin').length);
        this.managerCount.set(data.filter(u => u.role === 'Manager').length);
        this.agentCount.set(data.filter(u => u.role === 'Agent').length);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  openCreateModal(): void {
    this.newUser = this.resetNewUser();
    this.errorMessage.set('');
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  createUser(): void {
    this.isSaving.set(true);
    this.errorMessage.set('');

    const payload = {
      email: this.newUser.email,
      password: this.newUser.password,
      firstName: this.newUser.firstName,
      lastName: this.newUser.lastName,
      role: this.newUser.role
    };

    this.userService.createUser(payload).subscribe({
      next: (created) => {
        this.users.update(list => [...list, created]);
        this.recalculateCounts();
        this.isSaving.set(false);
        this.closeModal();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to create user. Email may already be in use.');
      }
    });
  }

  deleteUser(id: string, name: string): void {
    if (confirm(`Are you sure you want to remove ${name} from the organization?`)) {
      this.userService.deleteUser(id).subscribe({
        next: () => {
          this.users.update(list => list.filter(u => u.id !== id));
          this.recalculateCounts();
        },
        error: (err) => console.error('Failed to delete user', err)
      });
    }
  }

  private recalculateCounts(): void {
    const data = this.users();
    this.adminCount.set(data.filter(u => u.role === 'Admin').length);
    this.managerCount.set(data.filter(u => u.role === 'Manager').length);
    this.agentCount.set(data.filter(u => u.role === 'Agent').length);
  }

  private resetNewUser() {
    return {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'Agent'
    };
  }
}
