import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-wrapper">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast-bubble" [ngClass]="toast.type">
          <div class="toast-icon">
            @if (toast.type === 'error') {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            } @else {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 6L9 17l-5-5"></path>
              </svg>
            }
          </div>
          <div class="toast-text">{{ toast.text }}</div>
          <button type="button" class="toast-btn-close" (click)="toastService.remove(toast.id)">✕</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-wrapper {
      position: fixed !important;
      top: 30px !important;
      right: 30px !important;
      z-index: 999999 !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 12px !important;
      pointer-events: none !important;
    }

    .toast-bubble {
      pointer-events: auto !important;
      min-width: 300px;
      max-width: 420px;
      padding: 14px 18px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 16px 32px rgba(201, 102, 126, 0.25), 0 4px 12px rgba(0, 0, 0, 0.08);
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 0.9rem;
      border: 1px solid transparent;
      animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .toast-bubble.error {
      background-color: #fff1f4;
      color: #a82e49;
      border-color: #fecdd6;
    }

    .toast-bubble.success {
      background-color: #f0fdf4;
      color: #166534;
      border-color: #bbf7d0;
    }

    .toast-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    .toast-icon svg {
      width: 100%;
      height: 100%;
    }

    .toast-text {
      flex: 1;
      font-weight: 600;
      line-height: 1.4;
    }

    .toast-btn-close {
      background: transparent;
      border: none;
      font-size: 1rem;
      color: inherit;
      opacity: 0.6;
      cursor: pointer;
      padding: 0 4px;
      transition: opacity 0.2s;
    }

    .toast-btn-close:hover {
      opacity: 1;
    }

    @keyframes popIn {
      from {
        transform: translateY(-20px) scale(0.9);
        opacity: 0;
      }
      to {
        transform: translateY(0) scale(1);
        opacity: 1;
      }
    }
  `]
})
export class ToastComponent {
  constructor(public toastService: ToastService) {}
}