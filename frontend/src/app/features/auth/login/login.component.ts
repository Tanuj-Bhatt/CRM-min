import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-container flex-center">
      <div class="glass-panel auth-card animate-fade-in">
        <div class="auth-header">
          <div class="logo-glow flex-center">
            <span class="logo-icon">▲</span>
          </div>
          <h1>AeroCRM</h1>
          <p>Enterprise ERP & Sales Platform</p>
        </div>

        <div *ngIf="errorMessage()" class="alert alert-danger">
          {{ errorMessage() }}
        </div>

        <form (ngSubmit)="onSubmit()" #loginForm="ngForm">
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input 
              type="email" 
              name="email" 
              [(ngModel)]="email" 
              required 
              email 
              class="form-control" 
              placeholder="admin@example.com"
              #emailInput="ngModel"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Password</label>
            <input 
              type="password" 
              name="password" 
              [(ngModel)]="password" 
              required 
              class="form-control" 
              placeholder="••••••••"
              #passwordInput="ngModel"
            />
          </div>

          <button 
            type="submit" 
            [disabled]="loginForm.invalid || isLoading()" 
            class="btn btn-primary btn-block pulse-primary-glow"
          >
            <span *ngIf="isLoading()">Authenticating...</span>
            <span *ngIf="!isLoading()">Sign In to Dashboard</span>
          </button>
        </form>

        <div class="auth-footer">
          <p>New organization? <a routerLink="/auth/register">Create organization</a></p>
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
    }
    
    .auth-card {
      width: 100%;
      max-width: 440px;
      padding: 40px;
      border-radius: var(--radius-lg);
    }

    .auth-header {
      text-align: center;
      margin-bottom: 30px;
    }

    .logo-glow {
      width: 50px;
      height: 50px;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      border-radius: var(--radius-md);
      margin: 0 auto 16px;
      box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
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
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .alert-danger {
      background-color: rgba(239, 68, 68, 0.1);
      color: #f87171;
    }

    .auth-footer {
      margin-top: 24px;
      text-align: center;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .auth-footer a {
      color: var(--primary);
      text-decoration: none;
      font-weight: 600;
      transition: color var(--transition-fast);
    }

    .auth-footer a:hover {
      color: var(--secondary);
    }
  `]
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  onSubmit(): void {
    if (!this.email || !this.password) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Authentication failed. Please verify credentials.');
      }
    });
  }
}
