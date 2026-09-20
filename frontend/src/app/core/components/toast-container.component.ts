import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastType } from '../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-wrapper" *ngIf="toastService.toasts().length > 0">
      <div 
        *ngFor="let toast of toastService.toasts()" 
        class="toast-card glass-panel animate-slide-in"
        [ngClass]="'toast-' + toast.type"
      >
        <div class="toast-icon">
          {{ getIcon(toast.type) }}
        </div>
        <div class="toast-content">
          <div class="toast-title">{{ toast.title }}</div>
          <div class="toast-message">{{ toast.message }}</div>
        </div>
        <button (click)="toastService.remove(toast.id)" class="toast-close" title="Dismiss">✕</button>
      </div>
    </div>
  `,
  styles: [`
    .toast-wrapper {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: none;
      max-width: 420px;
      width: calc(100vw - 48px);
    }

    .toast-card {
      pointer-events: auto;
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 14px 18px;
      border-radius: var(--radius-md);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      transition: all 0.2s ease;
    }

    .toast-success {
      border-left: 4px solid var(--success);
      background: rgba(16, 185, 129, 0.08);
    }
    .toast-error {
      border-left: 4px solid var(--danger);
      background: rgba(239, 68, 68, 0.08);
    }
    .toast-info {
      border-left: 4px solid var(--primary);
      background: rgba(99, 102, 241, 0.08);
    }
    .toast-warning {
      border-left: 4px solid var(--warning);
      background: rgba(245, 158, 11, 0.08);
    }

    .toast-icon {
      font-size: 1.25rem;
      line-height: 1;
      padding-top: 2px;
    }

    .toast-content {
      flex: 1;
    }

    .toast-title {
      font-weight: 700;
      font-size: 0.875rem;
      color: #ffffff;
      margin-bottom: 2px;
    }

    .toast-message {
      font-size: 0.8125rem;
      color: var(--text-secondary);
      line-height: 1.4;
      word-break: break-word;
    }

    .toast-close {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 0.9rem;
      cursor: pointer;
      padding: 0 4px;
      transition: color 0.15s ease;
    }

    .toast-close:hover {
      color: #ffffff;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(40px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateX(0) scale(1);
      }
    }

    .animate-slide-in {
      animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  `]
})
export class ToastContainerComponent {
  readonly toastService = inject(ToastService);

  getIcon(type: ToastType): string {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
    }
  }
}
