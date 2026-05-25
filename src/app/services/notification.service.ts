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

@Injectable({ providedIn: 'root' })
export class NotificationService {

  // All incoming notifications stream
  public notification$ = new Subject<NotificationDTO>();

  // Unread counts
  public unreadChat$    = new BehaviorSubject<number>(0);
  public unreadComment$ = new BehaviorSubject<number>(0);

  // Total badge
  public totalUnread$ = new BehaviorSubject<number>(0);

  private client!: Client;
  private connected = false;
connect(userId: number): void {
  // Always disconnect first to avoid stale connections
  if (this.client?.active) {
    this.client.deactivate();
  }
  this.connected = false;

  const token = localStorage.getItem('token') ?? '';

  this.client = new Client({
    brokerURL: 'ws://localhost:8070/ws-chat',
    reconnectDelay: 5000,
    connectHeaders: { Authorization: `Bearer ${token}` },

    onConnect: () => {
      this.connected = true;
      console.log('🔔 Notification WebSocket connecté — userId', userId);

      this.client.subscribe(`/topic/notifications/${userId}`, (msg) => {
        try {
          const notif: NotificationDTO = JSON.parse(msg.body);
          this.notification$.next(notif);
          this.incrementUnread(notif.type);
        } catch (e) {
          console.error('Erreur parsing notification:', e);
        }
      });
    },

    onStompError: (frame) => {
      console.error('❌ Notification STOMP error:', frame.headers['message']);
      this.connected = false;
    },

    onDisconnect: () => {
      this.connected = false;
    }
  });

  this.client.activate();
}

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

  disconnect(): void {
    if (this.client?.active) {
      this.client.deactivate();
      this.connected = false;
    }
  }
}