import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Client, StompSubscription } from '@stomp/stompjs';
import { Subject, BehaviorSubject, Observable } from 'rxjs';

export interface ChatMessageDTO {
  id: number;
  ticketId: number;
  senderId: number;
  senderNom: string;
  senderPrenom: string;
  senderRole: string;
  content: string;
  sentAt: string;
}

export interface ChatMessageRequest {
  senderId: number;
  senderNom: string;
  senderPrenom: string;
  senderRole: string;
  content: string;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

@Injectable({ providedIn: 'root' })
export class ChatService {

  private client!: Client;
  private baseUrl = 'http://localhost:8070';

  public messages$         = new Subject<ChatMessageDTO>();
  public connectionStatus$ = new BehaviorSubject<ConnectionStatus>('disconnected');
  public typingUsers$      = new BehaviorSubject<string[]>([]);

  private typingTimeout: any;
  private lastTypingSent = 0;

  // ← Souscriptions STOMP du ticket courant (séparées du client global)
  private chatSub?: StompSubscription;
  private typingSub?: StompSubscription;
  private currentTicketId?: number;

  constructor(private http: HttpClient) {}

  // ← Connexion initiale : crée le client STOMP une seule fois
  connect(ticketId: number): void {
    this.currentTicketId = ticketId;

    // Si déjà connecté, juste changer de topic
    if (this.client?.active) {
      this.subscribeToTicket(ticketId);
      return;
    }

    const token = localStorage.getItem('token') ?? '';
    this.connectionStatus$.next('connecting');

    this.client = new Client({
      brokerURL: `ws://localhost:8070/ws-chat`,
      reconnectDelay: 5000,
      connectHeaders: { Authorization: `Bearer ${token}` },

      onConnect: () => {
        console.log('✅ ChatService WebSocket connecté — ticket', ticketId);
        this.connectionStatus$.next('connected');
        this.subscribeToTicket(this.currentTicketId!);
      },

      onDisconnect: () => {
        console.log('ChatService WebSocket déconnecté');
        this.connectionStatus$.next('disconnected');
        this.typingUsers$.next([]);
      },

      onStompError: (frame) => {
        console.error('❌ Erreur STOMP chat :', frame.headers['message']);
        this.connectionStatus$.next('error');
      },

      onWebSocketError: (error) => {
        console.error('❌ Erreur WebSocket chat :', error);
        this.connectionStatus$.next('error');
      }
    });

    this.client.activate();
  }

  // ← Change de ticket sans recréer le client STOMP
  changeTicket(ticketId: number): void {
    this.currentTicketId = ticketId;
    this.typingUsers$.next([]);

    if (this.client?.active && this.connectionStatus$.value === 'connected') {
      this.subscribeToTicket(ticketId);
    }
    // Si pas encore connecté, onConnect appellera subscribeToTicket automatiquement
  }

  // ← Désabonne les anciens topics et souscrit aux nouveaux
  private subscribeToTicket(ticketId: number): void {
    // Désabonner les anciens topics
    try { this.chatSub?.unsubscribe(); } catch {}
    try { this.typingSub?.unsubscribe(); } catch {}

    this.chatSub = this.client.subscribe(`/topic/chat/${ticketId}`, (msg) => {
      try {
        const parsed: ChatMessageDTO = JSON.parse(msg.body);
        this.messages$.next(parsed);
      } catch (e) {
        console.error('Erreur parsing message WebSocket :', e);
      }
    });

    this.typingSub = this.client.subscribe(`/topic/chat/${ticketId}/typing`, (msg) => {
      try {
        const data = JSON.parse(msg.body);
        this.typingUsers$.next(data.users ?? []);
      } catch {}
    });
  }

  sendMessage(ticketId: number, payload: ChatMessageRequest): void {
    if (this.client?.active && this.connectionStatus$.value === 'connected') {
      this.client.publish({
        destination: `/app/chat/${ticketId}`,
        body: JSON.stringify(payload)
      });
    } else {
      console.warn('⚠️ WebSocket non connecté. Status:', this.connectionStatus$.value);
    }
  }

  sendTyping(ticketId: number, userName: string): void {
    const now = Date.now();
    if (now - this.lastTypingSent < 2000) return;
    this.lastTypingSent = now;

    if (this.client?.active && this.connectionStatus$.value === 'connected') {
      this.client.publish({
        destination: `/app/chat/${ticketId}/typing`,
        body: JSON.stringify({ userName })
      });
    }

    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.stopTyping(ticketId, userName);
    }, 3000);
  }

  stopTyping(ticketId: number, userName: string): void {
    if (this.client?.active && this.connectionStatus$.value === 'connected') {
      this.client.publish({
        destination: `/app/chat/${ticketId}/stop-typing`,
        body: JSON.stringify({ userName })
      });
    }
  }

  getHistory(ticketId: number): Observable<ChatMessageDTO[]> {
    const token = localStorage.getItem('token') ?? '';
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<ChatMessageDTO[]>(
      `${this.baseUrl}/api/chat/${ticketId}/messages`,
      { headers }
    );
  }

  // ← Désabonne les topics du ticket seulement, NE PAS tuer le client STOMP
  disconnectTicket(): void {
    clearTimeout(this.typingTimeout);
    try { this.chatSub?.unsubscribe(); } catch {}
    try { this.typingSub?.unsubscribe(); } catch {}
    this.chatSub    = undefined;
    this.typingSub  = undefined;
    this.typingUsers$.next([]);
  }

  // ← Déconnexion totale (appelée uniquement au logout)
  disconnect(): void {
    this.disconnectTicket();
    if (this.client?.active) {
      this.client.deactivate();
    }
    this.connectionStatus$.next('disconnected');
  }

  deleteMessage(messageId: number): Observable<void> {
    const token = localStorage.getItem('token') ?? '';
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.delete<void>(
      `${this.baseUrl}/api/chat/messages/${messageId}`,
      { headers }
    );
  }
}