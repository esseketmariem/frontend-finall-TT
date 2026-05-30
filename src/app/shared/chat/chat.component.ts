import {
  Component, Input, OnInit, OnDestroy, Output, EventEmitter,
  ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef,
  OnChanges, SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatService, ChatMessageDTO, ConnectionStatus } from '../../services/Chat.service';

interface MessageGroup {
  date: string;
  messages: ChatMessageDTO[];
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnChanges, OnDestroy, AfterViewChecked {

  @Input()  ticketId!: number;
  @Input()  currentUserId!: number;
  @Input()  isVisible = true;
  @Output() unreadChange = new EventEmitter<number>();

  @ViewChild('scrollContainer') scrollContainer!: ElementRef;
  @ViewChild('messageInput')    messageInput!: ElementRef;

  messages: ChatMessageDTO[]    = [];
  messageGroups: MessageGroup[] = [];
  newMessage    = '';
  currentUser: any;
  isLoading     = true;
  shouldScroll  = true;
  showScrollBtn = false;

  connectionStatus: ConnectionStatus = 'disconnected';
  typingUsers: string[] = [];

  unreadCount  = 0;
  toastMessage = '';
  toastVisible = false;
  private toastTimer: any;

  private subs: Subscription[] = [];

  constructor(
    private chatService: ChatService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const stored = localStorage.getItem('currentUser');
    if (stored) this.currentUser = JSON.parse(stored);

    this.setupSubscriptions();
    this.chatService.connect(this.ticketId);
    this.loadHistory(this.ticketId);
  }

  private loadHistory(ticketId: number): void {
    this.isLoading = true;
    this.chatService.getHistory(ticketId).subscribe({
      next: (msgs) => {
        this.messages = msgs;
        this.rebuildGroups();
        this.isLoading    = false;
        this.shouldScroll = true;
        this.cdr.detectChanges();
        console.log(`📜 [Chat] Historique chargé : ${msgs.length} messages pour ticket ${ticketId}`);
      },
      error: (err) => {
        console.error('Erreur chargement historique :', err);
        this.isLoading = false;
      }
    });
  }

  private setupSubscriptions(): void {

    this.subs.push(
      this.chatService.messages$.subscribe((msg: ChatMessageDTO) => {

        const tempIndex = this.messages.findIndex(
          m => m.id < 0 &&
               Number(m.senderId) === Number(msg.senderId) &&
               m.content  === msg.content
        );

        if (tempIndex !== -1) {
          this.messages[tempIndex] = msg;
        } else if (!this.messages.some(m => m.id === msg.id)) {
          this.messages.push(msg);
          this.shouldScroll = true;

          if (!this.isMine(msg) && !this.isVisible) {
            this.unreadCount++;
            this.unreadChange.emit(this.unreadCount);
            this.playNotificationSound();
            this.showToast(msg);
          }
        }

        this.rebuildGroups();
        this.cdr.detectChanges();
      })
    );

    this.subs.push(
      this.chatService.connectionStatus$.subscribe(status => {
        this.connectionStatus = status;
        if (status === 'connected' && this.ticketId) {
          this.loadHistory(this.ticketId);
        }
        this.cdr.detectChanges();
      })
    );

    this.subs.push(
      this.chatService.typingUsers$.subscribe(users => {
        this.typingUsers = users.filter(u => u !== this.getFullName());
        this.cdr.detectChanges();
      })
    );
  }

  ngOnChanges(changes: SimpleChanges): void {

    if (changes['ticketId'] && !changes['ticketId'].firstChange) {
      this.messages      = [];
      this.messageGroups = [];
      this.isLoading     = true;
      this.shouldScroll  = true;
      this.showScrollBtn = false;
      this.typingUsers   = [];
      this.unreadCount   = 0;
      this.toastVisible  = false;

      this.chatService.changeTicket(this.ticketId);
      this.loadHistory(this.ticketId);
    }

    if (changes['isVisible'] && this.isVisible) {
      this.markAsRead();
    }
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    clearTimeout(this.toastTimer);
    this.chatService.disconnectTicket();
  }

  send(): void {
    if (!this.newMessage.trim()) return;

    const content   = this.newMessage.trim();
    this.newMessage = '';

    // ✅ Use currentUserId input (reliable) with currentUser as fallback
    const myId = this.currentUserId ?? this.currentUser?.id;

    const localMsg: ChatMessageDTO = {
      id:           -Date.now(),
      ticketId:     this.ticketId,
      senderId:     myId,
      senderNom:    this.currentUser?.nom,
      senderPrenom: this.currentUser?.prenom,
      senderRole:   this.currentUser?.role,
      content,
      sentAt:       new Date().toISOString()
    };

    this.messages.push(localMsg);
    this.rebuildGroups();
    this.shouldScroll = true;

    this.chatService.sendMessage(this.ticketId, {
      senderId:     myId,
      senderNom:    this.currentUser?.nom,
      senderPrenom: this.currentUser?.prenom,
      senderRole:   this.currentUser?.role,
      content
    });

    this.chatService.stopTyping(this.ticketId, this.getFullName());
  }

  deleteMessage(msg: ChatMessageDTO): void {
    if (!this.isMine(msg) || msg.id < 0) return;
    this.chatService.deleteMessage(msg.id).subscribe({
      next: () => {
        this.messages = this.messages.filter(m => m.id !== msg.id);
        this.rebuildGroups();
      },
      error: (err) => console.error('Erreur suppression :', err)
    });
  }

  onScroll(): void {
    const el = this.scrollContainer?.nativeElement;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    this.showScrollBtn = distanceFromBottom > 100;
  }

  scrollToBottom(): void {
    const el = this.scrollContainer?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
    this.showScrollBtn = false;
  }

  onInput(): void {
    if (this.newMessage.trim()) {
      this.chatService.sendTyping(this.ticketId, this.getFullName());
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  // ✅ BUG FIX: use currentUserId input + Number() to avoid string vs number mismatch
  isMine(msg: ChatMessageDTO): boolean {
    const myId = this.currentUserId ?? this.currentUser?.id;
    if (myId == null || msg.senderId == null) return false;
    return Number(msg.senderId) === Number(myId);
  }

  isPending(msg: ChatMessageDTO): boolean {
    return msg.id < 0;
  }

  getInitiales(msg: ChatMessageDTO): string {
    const p = msg.senderPrenom?.[0] ?? '';
    const n = msg.senderNom?.[0]    ?? '';
    return (p + n).toUpperCase();
  }

  getFullName(): string {
    return `${this.currentUser?.prenom ?? ''} ${this.currentUser?.nom ?? ''}`.trim();
  }

  formatTime(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('fr-FR', {
      hour: '2-digit', minute: '2-digit'
    });
  }

  formatDate(dateStr: string): string {
    const d         = new Date(dateStr);
    const today     = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString())     return "Aujourd'hui";
    if (d.toDateString() === yesterday.toDateString()) return 'Hier';
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  getStatusLabel(): string {
    const labels: Record<ConnectionStatus, string> = {
      connecting:   'Connexion…',
      connected:    'Connecté',
      disconnected: 'Déconnecté',
      error:        'Erreur de connexion'
    };
    return labels[this.connectionStatus];
  }

  getTypingText(): string {
    if (this.typingUsers.length === 0) return '';
    if (this.typingUsers.length === 1) return `${this.typingUsers[0]} écrit…`;
    if (this.typingUsers.length === 2) return `${this.typingUsers[0]} et ${this.typingUsers[1]} écrivent…`;
    return 'Plusieurs personnes écrivent…';
  }

  markAsRead(): void {
    this.unreadCount = 0;
    this.unreadChange.emit(0);
  }

  playNotificationSound(): void {
    try {
      const ctx  = new AudioContext();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  }

  showToast(msg: ChatMessageDTO): void {
    this.toastMessage = `${msg.senderPrenom} ${msg.senderNom} : ${msg.content.slice(0, 50)}${msg.content.length > 50 ? '…' : ''}`;
    this.toastVisible = true;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastVisible = false;
      this.cdr.detectChanges();
    }, 4000);
  }

  private rebuildGroups(): void {
    const map = new Map<string, ChatMessageDTO[]>();
    for (const msg of this.messages) {
      const key = new Date(msg.sentAt).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(msg);
    }
    this.messageGroups = Array.from(map.entries()).map(([, msgs]) => ({
      date:     msgs[0].sentAt,
      messages: msgs
    }));
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      try {
        const el = this.scrollContainer?.nativeElement;
        if (el) {
          el.scrollTop      = el.scrollHeight;
          this.shouldScroll = false;
        }
      } catch {}
    }
  }
}