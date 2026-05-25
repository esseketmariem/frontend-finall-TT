import {
  Component, OnInit, OnDestroy, ChangeDetectorRef,
  HostListener, Output, EventEmitter
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, NotificationDTO } from '../../services/notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notif-wrap" (click)="toggleDropdown($event)">

      <!-- Bell button -->
      <button class="bell-btn" [class.has-unread]="total > 0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <span class="badge" *ngIf="total > 0">{{ total > 99 ? '99+' : total }}</span>
      </button>

      <!-- Dropdown -->
      <div class="notif-dropdown" *ngIf="open" (click)="$event.stopPropagation()">
        <div class="notif-header">
          <span>Notifications</span>
          <button class="clear-btn" *ngIf="notifications.length > 0" (click)="clearAll()">
            Tout effacer
          </button>
        </div>

        <div class="notif-empty" *ngIf="notifications.length === 0">
          <span>Aucune notification</span>
        </div>

        <div class="notif-list">
          <div
            class="notif-item"
            *ngFor="let n of notifications; let i = index"
            [class.notif-chat]="n.type === 'CHAT'"
            [class.notif-comment]="n.type === 'COMMENT'"
            (click)="onNotifClick(n)">

            <div class="notif-icon">
              {{ n.type === 'CHAT' ? '💬' : '📝' }}
            </div>

            <div class="notif-body">
              <div class="notif-title">
                <strong>{{ n.fromPrenom }} {{ n.fromNom }}</strong>
                <span class="notif-tag">{{ n.type === 'CHAT' ? 'Chat' : 'Commentaire' }}</span>
              </div>
              <div class="notif-ticket">Ticket : {{ n.ticketTitre }}</div>
              <div class="notif-preview">{{ n.preview }}</div>
              <div class="notif-time">{{ formatTime(n.sentAt) }}</div>
            </div>

            <button class="notif-dismiss" (click)="dismiss(i, $event)">✕</button>
          </div>
        </div>
      </div>

    </div>

    <!-- Toast -->
    <div class="notif-toast" *ngIf="toastVisible" [class.notif-toast-chat]="toastNotif?.type === 'CHAT'">
      <span class="toast-icon">{{ toastNotif?.type === 'CHAT' ? '💬' : '📝' }}</span>
      <div class="toast-body">
        <div class="toast-title">
          {{ toastNotif?.fromPrenom }} {{ toastNotif?.fromNom }}
          <span class="toast-tag">{{ toastNotif?.type === 'CHAT' ? 'Chat' : 'Commentaire' }}</span>
        </div>
        <div class="toast-preview">{{ toastNotif?.preview }}</div>
      </div>
    </div>
  `,
  styles: [`
    .notif-wrap { position: relative; display: inline-block; }

    .bell-btn {
      position: relative;
      width: 34px; height: 34px;
      display: flex; align-items: center; justify-content: center;
      background: transparent;
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 7px;
      color: #a0a0a0;
      cursor: pointer;
      transition: all 0.15s;
    }
    .bell-btn:hover { background: #2e2e2e; color: #f0f0f0; border-color: rgba(255,255,255,0.12); }
    .bell-btn.has-unread { color: #f0f0f0; border-color: rgba(255,255,255,0.15); }

    .badge {
      position: absolute;
      top: -5px; right: -5px;
      background: #e05555;
      color: #fff;
      font-size: 9px; font-weight: 700;
      min-width: 16px; height: 16px;
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      padding: 0 3px;
      border: 1.5px solid #0a0a0a;
      animation: popIn 0.2s ease;
    }
    @keyframes popIn {
      from { transform: scale(0.5); opacity: 0; }
      to   { transform: scale(1);   opacity: 1; }
    }

    .notif-dropdown {
      position: absolute;
      top: calc(100% + 8px); right: 0;
      width: 320px;
      background: #1a1a1a;
      border: 1px solid rgba(255,255,255,0.10);
      border-radius: 10px;
      box-shadow: 0 16px 48px rgba(0,0,0,0.6);
      z-index: 999;
      overflow: hidden;
    }
    .notif-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 14px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
      font-size: 12px; font-weight: 600; color: #f0f0f0;
      text-transform: uppercase; letter-spacing: 0.07em;
    }
    .clear-btn {
      background: none; border: none; cursor: pointer;
      font-size: 11px; color: #606060;
      transition: color 0.12s;
    }
    .clear-btn:hover { color: #e05555; }

    .notif-empty {
      padding: 28px; text-align: center;
      font-size: 12px; color: #606060;
    }
    .notif-list { max-height: 360px; overflow-y: auto; }

    .notif-item {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 11px 14px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      transition: background 0.12s;
      cursor: pointer;
    }
    .notif-item:last-child { border-bottom: none; }
    .notif-item:hover { background: rgba(255,255,255,0.03); }

    .notif-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }

    .notif-body { flex: 1; min-width: 0; }
    .notif-title {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; color: #f0f0f0; margin-bottom: 2px;
    }
    .notif-tag {
      font-size: 9px; font-weight: 600; text-transform: uppercase;
      padding: 1px 5px; border-radius: 3px; letter-spacing: 0.05em;
    }
    .notif-chat    .notif-tag { background: rgba(74,144,217,0.15); color: #4a90d9; }
    .notif-comment .notif-tag { background: rgba(212,160,23,0.15);  color: #d4a017; }
    .notif-ticket  { font-size: 11px; color: #606060; margin-bottom: 2px; }
    .notif-preview { font-size: 12px; color: #a0a0a0; line-height: 1.4;
                     white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .notif-time    { font-size: 10px; color: #505050; margin-top: 3px; }

    .notif-dismiss {
      background: none; border: none; cursor: pointer;
      color: #505050; font-size: 11px; padding: 2px; flex-shrink: 0;
      transition: color 0.12s; line-height: 1;
    }
    .notif-dismiss:hover { color: #e05555; }

    .notif-toast {
      position: fixed;
      bottom: 24px; right: 24px;
      background: #1a1a1a;
      border: 1px solid rgba(255,255,255,0.10);
      border-left: 3px solid #d4a017;
      border-radius: 8px;
      padding: 12px 14px;
      display: flex; align-items: flex-start; gap: 10px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      z-index: 1000;
      max-width: 300px;
      animation: slideIn 0.25s ease;
    }
    .notif-toast-chat { border-left-color: #4a90d9; }
    @keyframes slideIn {
      from { transform: translateX(120%); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }
    .toast-icon { font-size: 18px; flex-shrink: 0; }
    .toast-body { min-width: 0; }
    .toast-title {
      display: flex; align-items: center; gap: 6px;
      font-size: 12px; font-weight: 600; color: #f0f0f0; margin-bottom: 3px;
    }
    .toast-tag {
      font-size: 9px; font-weight: 600; text-transform: uppercase;
      padding: 1px 5px; border-radius: 3px;
      background: rgba(255,255,255,0.08); color: #a0a0a0;
    }
    .toast-preview { font-size: 12px; color: #a0a0a0; line-height: 1.4; }
  `]
})
export class NotificationBellComponent implements OnInit, OnDestroy {

  @Output() openChat = new EventEmitter<number>();

  open = false;
  total = 0;
  notifications: NotificationDTO[] = [];

  toastVisible = false;
  toastNotif: NotificationDTO | null = null;
  private toastTimer: any;

  private subs: Subscription[] = [];

  constructor(
    private notifService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.notifService.totalUnread$.subscribe(n => {
        this.total = n;
        this.cdr.detectChanges();
      })
    );

    this.subs.push(
      this.notifService.notification$.subscribe(notif => {
        this.notifications.unshift(notif);
        this.showToast(notif);
        this.playSound(notif.type);
        this.cdr.detectChanges();
      })
    );
  }

  toggleDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.open = !this.open;
    if (this.open) this.notifService.clearAll();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.open = false;
  }

  onNotifClick(notif: NotificationDTO): void {
    if (notif.ticketId) {
      this.open = false;
      this.openChat.emit(notif.ticketId);
    }
  }

  dismiss(index: number, event: MouseEvent): void {
    event.stopPropagation();
    this.notifications.splice(index, 1);
  }

  clearAll(): void {
    this.notifications = [];
    this.notifService.clearAll();
  }

  formatTime(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1)  return 'À l\'instant';
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  showToast(notif: NotificationDTO): void {
    this.toastNotif   = notif;
    this.toastVisible = true;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastVisible = false;
      this.cdr.detectChanges();
    }, 4500);
  }

  playSound(type: 'CHAT' | 'COMMENT'): void {
    try {
      const ctx  = new AudioContext();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = type === 'CHAT' ? 880 : 660;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    clearTimeout(this.toastTimer);
  }
}