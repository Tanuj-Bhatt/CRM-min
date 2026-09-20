import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  durationMs?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  readonly toasts = signal<ToastMessage[]>([]);

  show(type: ToastType, title: string, message: string, durationMs = 4000): void {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: ToastMessage = { id, type, title, message, durationMs };

    this.toasts.update(current => [...current, toast]);

    if (durationMs > 0) {
      setTimeout(() => {
        this.remove(id);
      }, durationMs);
    }
  }

  success(title: string, message: string, durationMs = 4000): void {
    this.show('success', title, message, durationMs);
  }

  error(title: string, message: string, durationMs = 5000): void {
    this.show('error', title, message, durationMs);
  }

  info(title: string, message: string, durationMs = 4000): void {
    this.show('info', title, message, durationMs);
  }

  warning(title: string, message: string, durationMs = 4500): void {
    this.show('warning', title, message, durationMs);
  }

  remove(id: string): void {
    this.toasts.update(current => current.filter(t => t.id !== id));
  }
}
