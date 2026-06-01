import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-container flex-center">
      <div class="glass-panel auth-card animate-fade-in">
        <div class="auth-header">
          <div class="logo-glow flex-center">
            <span class="logo-icon">▲</span>
          </div>
          <h1>Create ERP Tenant</h1>
          <p>Register a new organization and admin account</p>
        </div>

        <div *ngIf="successMessage()" class="alert alert-success">
          {{ successMessage() }}
        </div>
        <div *ngIf="errorMessage()" class="alert alert-danger">
          {{ errorMessage() }}
        </div>

        <form *ngIf="!successMessage()" (ngSubmit)="onSubmit()" #registerForm="ngForm">
          <div class="form-group">
            <label class="form-label">Organization Name</label>
            <input 
              type="text" 
              name="orgName" 
              [(ngModel)]="orgName" 
              required 
              class="form-control" 
              placeholder="Acme Enterprise Ltd."
            />
          </div>

          <div class="row-flex">
            <div class="form-group flex-1">
              <label class="form-label">First Name</label>
              <input 
                type="text" 
                name="firstName" 
                [(ngModel)]="firstName" 
                required 
                class="form-control" 
                placeholder="John"
              />
            </div>
            <div class="form-group flex-1">
              <label class="form-label">Last Name</label>
              <input 
                type="text" 
                name="lastName" 
                [(ngModel)]="lastName" 
                required 
                class="form-control" 
                placeholder="Doe"
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Admin Email Address</label>
            <input 
              type="email" 
              name="email" 
              [(ngModel)]="email" 
              required 
              email 
              class="form-control" 
              placeholder="john.doe@acme.com"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Password</label>
            <input 
              type="password" 
              name="password" 
              [(ngModel)]="password" 
              required 
              minlength="6"
              class="form-control" 
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            [disabled]="registerForm.invalid || isLoading()" 
            class="btn btn-secondary btn-block pulse-primary-glow"
          >
            <span *ngIf="isLoading()">Creating Tenant...</span>
            <span *ngIf="!isLoading()">Register Enterprise</span>
          </button>
        </form>

        <div class="auth-footer">
          <p>Already have an account? <a routerLink="/auth/login">Sign In</a></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      height: 100vh;
      width: 100vw;
      background: radial-gradient(circle at top right, rgba(99, 102, 241, 0.15), transparent),
                  radial-gradient(circle at bottom left, rgba(13, 148, 136, 0.1), transparent),
                  #070a13;
      padding: 20px;
      overflow-y: auto;
    }
    
    .auth-card {
      width: 100%;
      max-width: 500px;
      padding: 40px;
      border-radius: var(--radius-lg);
      margin: auto;
    }

    .auth-header {
      text-align: center;
      margin-bottom: 24px;
    }

    .logo-glow {
      width: 50px;
      height: 50px;
      background: linear-gradient(135deg, var(--accent), var(--secondary));
      border-radius: var(--radius-md);
      margin: 0 auto 16px;
      box-shadow: 0 0 20px rgba(217, 70, 239, 0.4);
    }

    .logo-icon {
      font-size: 1.5rem;
      color: white;
    }

    .auth-header h1 {
      font-size: 1.8rem;
      font-weight: 800;
      letter-spacing: -0.025em;
      margin-bottom: 6px;
      background: linear-gradient(to right, #ffffff, var(--text-secondary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .auth-header p {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }

    .row-flex {
      display: flex;
      gap: 16px;
    }

    .flex-1 {
      flex: 1;
    }

    .btn-block {
      width: 100%;
      padding: 14px;
      font-size: 0.9375rem;
      margin-top: 10px;
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

    .alert-success {
      background-color: rgba(16, 185, 129, 0.1);
      color: #34d399;
      border-color: rgba(16, 185, 129, 0.2);
    }

    .auth-footer {
      margin-top: 24px;
      text-align: center;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .auth-footer a {
      color: var(--secondary);
      text-decoration: none;
      font-weight: 600;
      transition: color var(--transition-fast);
    }

    .auth-footer a:hover {
      color: var(--primary);
    }
  `]
})
export class RegisterComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  orgName = '';
  firstName = '';
  lastName = '';
  email = '';
  password = '';
  
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  onSubmit(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const payload = {
      organizationName: this.orgName,
      adminEmail: this.email,
      adminPassword: this.password,
      adminFirstName: this.firstName,
      adminLastName: this.lastName
    };

    this.authService.register(payload).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set('Organization registered successfully! Redirecting to login...');
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2000);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Registration failed. The email or organization name may already exist.');
      }
    });
  }
}
