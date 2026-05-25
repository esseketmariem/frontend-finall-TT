import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Client } from '@stomp/stompjs';
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

  constructor(private http: HttpClient) {}

  connect(ticketId: number): void {
    if (this.client?.active) {
      this.client.deactivate();
    }

    const token = localStorage.getItem('token') ?? '';

    this.connectionStatus$.next('connecting');

    this.client = new Client({
      // ✅ URL WebSocket natif — sans /websocket à la fin
      brokerURL: `ws://localhost:8070/ws-chat`,
      reconnectDelay: 5000,

      connectHeaders: {
        Authorization: `Bearer ${token}`
      },

      onConnect: () => {
        console.log('✅ WebSocket connecté — ticket', ticketId);
        this.connectionStatus$.next('connected');

        this.client.subscribe(`/topic/chat/${ticketId}`, (msg) => {
          try {
            const parsed: ChatMessageDTO = JSON.parse(msg.body);
            this.messages$.next(parsed);
          } catch (e) {
            console.error('Erreur parsing message WebSocket :', e);
          }
        });

        this.client.subscribe(`/topic/chat/${ticketId}/typing`, (msg) => {
          try {
            const data = JSON.parse(msg.body);
            this.typingUsers$.next(data.users ?? []);
          } catch {}
        });
      },

      onDisconnect: () => {
        console.log('WebSocket déconnecté');
        this.connectionStatus$.next('disconnected');
        this.typingUsers$.next([]);
      },

      onStompError: (frame) => {
        console.error('❌ Erreur STOMP :', frame.headers['message']);
        this.connectionStatus$.next('error');
      },

      onWebSocketError: (error) => {
        console.error('❌ Erreur WebSocket :', error);
        this.connectionStatus$.next('error');
      }
    });

    this.client.activate();
  }

  // ✅ Vérification renforcée avant publish
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

  disconnect(): void {
    clearTimeout(this.typingTimeout);
    if (this.client?.active) {
      this.client.deactivate();
    }
    this.connectionStatus$.next('disconnected');
    this.typingUsers$.next([]);
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

