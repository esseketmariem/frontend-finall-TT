import { Injectable } from '@angular/core';
import { Client } from '@stomp/stompjs';
import { BehaviorSubject, Subject } from 'rxjs';

export interface NotificationDTO {
  type: 'CHAT' | 'COMMENT';
  ticketId: number;
  ticketTitre: string;
  fromNom: string;
  fromPrenom: string;
  fromRole: string;
  preview: string;
  sentAt: string;
}

const STORAGE_KEY = 'app_notifications';
const MAX_STORED  = 50;

@Injectable({ providedIn: 'root' })
export class NotificationService {

  public notification$       = new Subject<NotificationDTO>();
  public unreadChat$         = new BehaviorSubject<number>(0);
  public unreadComment$      = new BehaviorSubject<number>(0);
  public totalUnread$        = new BehaviorSubject<number>(0);
  public savedNotifications$ = new BehaviorSubject<NotificationDTO[]>([]);

  private client!: Client;
  private connected      = false;
  private currentUserId: number | null = null;

  constructor() {
    this.loadFromStorage();
  }

  // ── Persistance ───────────────────────────────────────────────────────────

  private storageKey(): string {
    return `${STORAGE_KEY}_${this.currentUserId ?? 'unknown'}`;
  }

  private loadFromStorage(): void {
    try {
      const userId = this.getCurrentUserIdFromStorage();
      if (!userId) return;
      const raw = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
      if (!raw) return;
      const notifs: NotificationDTO[] = JSON.parse(raw);
      this.savedNotifications$.next(notifs);
      const unreadChat    = notifs.filter(n => n.type === 'CHAT').length;
      const unreadComment = notifs.filter(n => n.type === 'COMMENT').length;
      this.unreadChat$.next(unreadChat);
      this.unreadComment$.next(unreadComment);
      this.totalUnread$.next(unreadChat + unreadComment);
    } catch (e) {
      console.error('[NotifService] Erreur chargement localStorage:', e);
    }
  }

  public saveToStorage(notifs: NotificationDTO[]): void {
    try {
      const toSave = notifs.slice(-MAX_STORED);
      localStorage.setItem(this.storageKey(), JSON.stringify(toSave));
    } catch (e) {
      console.error('[NotifService] Erreur sauvegarde localStorage:', e);
    }
  }

  private addNotification(notif: NotificationDTO): void {
    const current = this.savedNotifications$.value;
    const updated = [...current, notif].slice(-MAX_STORED);
    this.savedNotifications$.next(updated);
    this.saveToStorage(updated);
  }

  public removeNotification(index: number): void {
    const current = [...this.savedNotifications$.value];
    current.splice(index, 1);
    this.savedNotifications$.next(current);
    this.saveToStorage(current);
    const unreadChat    = current.filter(n => n.type === 'CHAT').length;
    const unreadComment = current.filter(n => n.type === 'COMMENT').length;
    this.unreadChat$.next(unreadChat);
    this.unreadComment$.next(unreadComment);
    this.totalUnread$.next(unreadChat + unreadComment);
  }

  private getCurrentUserIdFromStorage(): number | null {
    try {
      const stored = localStorage.getItem('currentUser');
      if (!stored) return null;
      return JSON.parse(stored).id ?? null;
    } catch { return null; }
  }

  // ── WebSocket ─────────────────────────────────────────────────────────────

  connect(userId: number): void {
    // ✅ FIX: on skip SEULEMENT si déjà connecté ET client encore actif
    if (this.connected && this.currentUserId === userId && this.client?.active) {
      console.log(`🔔 [NotifService] Déjà connecté pour userId=${userId}, skip`);
      return;
    }

    if (this.client?.active) {
      this.client.deactivate();
    }

    this.connected     = false;
    this.currentUserId = userId;
    this.loadFromStorage();

    const token = localStorage.getItem('token') ?? '';
    console.log(`🚀 [NotifService] Connexion WebSocket pour userId=${userId}`);

    this.client = new Client({
      brokerURL:      'ws://localhost:8070/ws-chat',
      reconnectDelay: 5000,
      connectHeaders: { Authorization: `Bearer ${token}` },

      onConnect: () => {
        this.connected = true;
        console.log(`✅ [NotifService] Abonné à /topic/notifications/${userId}`);

        this.client.subscribe(`/topic/notifications/${userId}`, (msg) => {
          try {
            const notif: NotificationDTO = JSON.parse(msg.body);
            console.log(`📨 [NotifService] Notification reçue`, notif);
            this.notification$.next(notif);
            this.addNotification(notif);
            this.incrementUnread(notif.type);
          } catch (e) {
            console.error('[NotifService] Erreur parsing notification:', e);
          }
        });
      },

      onStompError:     (frame) => { console.error('❌ STOMP error:', frame.headers['message']); this.connected = false; },
      onWebSocketError: (event) => { console.error('❌ WebSocket error:', event);                this.connected = false; },
      onDisconnect:     ()      => { console.log(`🔌 Déconnecté (userId=${userId})`);            this.connected = false; }
    });

    this.client.activate();
  }

  // ── Compteurs ─────────────────────────────────────────────────────────────

  private incrementUnread(type: 'CHAT' | 'COMMENT'): void {
    if (type === 'CHAT') {
      this.unreadChat$.next(this.unreadChat$.value + 1);
    } else {
      this.unreadComment$.next(this.unreadComment$.value + 1);
    }
    this.totalUnread$.next(this.unreadChat$.value + this.unreadComment$.value);
  }

  clearChat(): void {
    this.unreadChat$.next(0);
    this.totalUnread$.next(this.unreadComment$.value);
  }

  clearComments(): void {
    this.unreadComment$.next(0);
    this.totalUnread$.next(this.unreadChat$.value);
  }

  clearAll(): void {
    this.unreadChat$.next(0);
    this.unreadComment$.next(0);
    this.totalUnread$.next(0);
  }

  clearSavedNotifications(): void {
    this.savedNotifications$.next([]);
    this.clearAll();
    try { localStorage.removeItem(this.storageKey()); } catch {}
  }

  // ── Déconnexion ───────────────────────────────────────────────────────────

  disconnect(): void {
    if (this.client?.active) {
      this.client.deactivate();
      this.connected     = false;
      this.currentUserId = null;
      console.log(`🔌 [NotifService] Déconnexion manuelle`);
    }
  }
}