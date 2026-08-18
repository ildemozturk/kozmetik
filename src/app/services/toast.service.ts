import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  toasts = signal<ToastMessage[]>([]);

  show(text: string, type: 'success' | 'error' | 'info' = 'error', durationMs: number = 4000): void {
    const id = Date.now();
    const newToast: ToastMessage = { id, text, type };

    this.toasts.update(current => [...current, newToast]);

    setTimeout(() => {
      this.remove(id);
    }, durationMs);
  }

  error(text: string): void {
    this.show(text, 'error');
  }

  success(text: string): void {
    this.show(text, 'success');
  }

  remove(id: number): void {
    this.toasts.update(current => current.filter(t => t.id !== id));
  }
}