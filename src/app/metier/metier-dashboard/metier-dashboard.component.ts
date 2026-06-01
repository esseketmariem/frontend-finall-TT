import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { AddTicketComponent }        from '../../add-ticket/add-ticket.component';
import { ProfileComponent }          from '../../shared/profile/profile.component';
import { ChatComponent }             from '../../shared/chat/chat.component';
import { ListeticketComponent }      from '../listeticket/listeticket.component';
import { NotificationBellComponent } from '../../components/notification-bell/notification-bell.component';
import { NotificationService }       from '../../services/notification.service';



@Component({
  selector: 'app-metier-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AddTicketComponent,
    ListeticketComponent,
    ProfileComponent,
    ChatComponent,
    NotificationBellComponent
  ],
  templateUrl: './metier-dashboard.component.html',
  styleUrls: ['./metier-dashboard.component.css']
})
export class MetierDashboardComponent implements OnInit, OnDestroy {

  view: string = 'create';
  listKey = 0;
  dropdownOpen = false;
  currentUser: any = null;
  defaultAvatar = this.getDefaultAvatar();

  // ── Chat side panel
  chatPanelOpen    = false;
  selectedTicketId: number | null = null;
  selectedTicketTitre = '';
  mesTickets: any[] = [];
  unreadCount = 0;

  // ── Modal détail ticket
  selectedTicket: any      = null;
  modalOpen                = false;
  modalCommentaires: any[] = [];
  modalLoadingComments     = false;

  // ── Nouveau commentaire depuis la modal
  nouveauCommentaire = '';
  sendingCommentaire = false;

  private baseUrl = 'http://localhost:8070';
  private subs    = new Subscription();

  constructor(
    private router: Router,
    private http: HttpClient,
    private notifService: NotificationService
  ) {}

  ngOnInit(): void {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      this.currentUser = JSON.parse(stored);
    } else {
      this.router.navigate(['/login']);
      return;
    }

    this.notifService.connect(this.currentUser.id);

    this.subs.add(
      this.notifService.notification$.subscribe(notif => {
        // ✅ Notification de commentaire → recharge si modal ouverte sur ce ticket
        if (notif.type === 'COMMENT' && notif.ticketId) {
          if (this.modalOpen && this.selectedTicket?.id === notif.ticketId) {
            this.loadCommentaires(notif.ticketId);
          }
        }
        // ✅ Notification de chat → incrémente compteur si panel fermé ou autre ticket
        if (notif.type === 'CHAT' && notif.ticketId) {
          if (!this.chatPanelOpen || this.selectedTicketId !== notif.ticketId) {
            this.unreadCount++;
          }
        }
      })
    );

    this.loadMesTickets();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    // ✅ FIX: NE PAS appeler notifService.disconnect() ici
    // Le service est singleton — disconnect() couperait la connexion pour tous les composants.
    // disconnect() est appelé uniquement dans logout().
  }

  get safeTicketId(): number {
    return this.selectedTicketId!;
  }

  private buildHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('token')}` });
  }

  loadMesTickets(): void {
    this.http.get<any[]>(
      `${this.baseUrl}/api/tickets/user/${this.currentUser.id}`,
      { headers: this.buildHeaders() }
    ).subscribe({
      next:  (tickets) => { this.mesTickets = tickets; },
      error: (err)     => console.error('Erreur chargement tickets :', err)
    });
  }

  // ── Modal détail ticket ───────────────────────────────────────────────────

  openTicketModal(ticket: any): void {
    this.selectedTicket     = ticket;
    this.modalOpen          = true;
    this.modalCommentaires  = [];
    this.nouveauCommentaire = '';
    this.sendingCommentaire = false;
    this.loadCommentaires(ticket.id);
  }

  closeModal(): void {
    this.modalOpen          = false;
    this.selectedTicket     = null;
    this.modalCommentaires  = [];
    this.nouveauCommentaire = '';
    this.sendingCommentaire = false;
  }

  // ── Commentaires ──────────────────────────────────────────────────────────

  loadCommentaires(ticketId: number): void {
    this.modalLoadingComments = true;
    this.http.get<any[]>(
      `${this.baseUrl}/api/commentaires/ticket/${ticketId}`,
      { headers: this.buildHeaders() }
    ).subscribe({
      next: (data) => {
        this.modalCommentaires    = data;
        this.modalLoadingComments = false;
        this.syncCommentCount(ticketId, data.length);
      },
      error: () => { this.modalLoadingComments = false; }
    });
  }

  envoyerCommentaire(): void {
    const contenu = this.nouveauCommentaire.trim();
    if (!contenu || !this.selectedTicket?.id) return;

    this.sendingCommentaire = true;

    this.http.post<any[]>(
      `${this.baseUrl}/api/commentaires/${this.selectedTicket.id}`,
      { commentaire: contenu, userId: this.currentUser?.id },
      { headers: this.buildHeaders() }
    ).subscribe({
      next: (list) => {
        this.modalCommentaires  = list;
        this.nouveauCommentaire = '';
        this.sendingCommentaire = false;
        this.syncCommentCount(this.selectedTicket.id, list.length);
      },
      error: () => { this.sendingCommentaire = false; }
    });
  }

  private syncCommentCount(ticketId: number, count: number): void {
    const ticket = this.mesTickets.find(t => t.id === ticketId);
    if (ticket) ticket.nombreCommentaires = count;
    if (this.selectedTicket?.id === ticketId) {
      this.selectedTicket.nombreCommentaires = count;
    }
  }

  getInitialesCommentaire(prenom: string, nom: string): string {
    return ((prenom?.charAt(0) ?? '') + (nom?.charAt(0) ?? '')).toUpperCase() || '?';
  }

  // ── Notification → ouvre modal commentaires ───────────────────────────────

  openTicketCommentaires(ticketId: number): void {
    const ticket = this.mesTickets.find(t => t.id === ticketId);
    if (ticket) {
      this.openTicketModal(ticket);
    } else {
      // ticket pas encore chargé → recharge la liste puis ouvre
      this.http.get<any[]>(
        `${this.baseUrl}/api/tickets/user/${this.currentUser.id}`,
        { headers: this.buildHeaders() }
      ).subscribe({
        next: (tickets) => {
          this.mesTickets = tickets;
          const t = tickets.find(x => x.id === ticketId);
          if (t) this.openTicketModal(t);
        }
      });
    }
  }

  // ── Chat ──────────────────────────────────────────────────────────────────

  openChatFromModal(ticketId: number, ticketTitre: string): void {
    this.closeModal();
    this.openChat(ticketId, ticketTitre);
  }

  openChat(ticketId: number, ticketTitre: string = ''): void {
    this.selectedTicketId    = ticketId;
    this.selectedTicketTitre = ticketTitre;
    this.chatPanelOpen       = true;
    this.unreadCount         = 0;
    this.notifService.clearChat();
  }

  toggleChat(): void {
    if (this.chatPanelOpen) {
      this.closeChat();
    } else {
      this.openFirstTicketChat();
    }
  }

  openFirstTicketChat(): void {
    if (this.mesTickets.length > 0) {
      const first = this.mesTickets[0];
      this.openChat(first.id, first.titre);
    } else {
      this.chatPanelOpen = true;
    }
  }

  closeChat(): void {
    this.chatPanelOpen = false;
  }

  onTicketSelected(): void {
    this.unreadCount = 0;
    const ticket = this.mesTickets.find(t => t.id === this.selectedTicketId);
    this.selectedTicketTitre = ticket?.titre ?? '';
    this.notifService.clearChat();
  }

  openChatFromNotif(ticketId: number): void {
    const ticket = this.mesTickets.find(t => t.id === ticketId);
    if (!ticket) {
      // ticket pas encore chargé → recharge puis ouvre
      this.http.get<any[]>(
        `${this.baseUrl}/api/tickets/user/${this.currentUser.id}`,
        { headers: this.buildHeaders() }
      ).subscribe({
        next: (tickets) => {
          this.mesTickets = tickets;
          const t = tickets.find(x => x.id === ticketId);
          this.openChat(ticketId, t?.titre ?? '');
        }
      });
      return;
    }
    this.openChat(ticketId, ticket.titre);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  getStatutClass(s: string): string {
    const map: Record<string, string> = {
      'EN_COURS':    'badge-encours',
      'IN_ANALYSIS': 'badge-analysis',
      'ANALYZED':    'badge-analyzed',
      'APPROUVE':    'badge-approuve',
      'REJETE':      'badge-rejete',
    };
    return map[s] ?? 'badge-encours';
  }

  getStatutLabel(s: string): string {
    const map: Record<string, string> = {
      'EN_COURS':    'EN COURS',
      'IN_ANALYSIS': 'EN ANALYSE',
      'ANALYZED':    'ANALYSÉ',
      'APPROUVE':    'APPROUVÉ',
      'REJETE':      'REJETÉ',
    };
    return map[s] ?? s;
  }

  getPrioriteLabel(p: string): string {
    const u = p?.toUpperCase();
    if (u === 'HAUTE'   || u === 'HIGH')   return 'Haute';
    if (u === 'MOYENNE' || u === 'MEDIUM') return 'Moyenne';
    if (u === 'BASSE'   || u === 'LOW')    return 'Basse';
    return p ?? '—';
  }

  onTicketCreated(): void {
    this.loadMesTickets();
    this.listKey++;
    this.view = 'list';
  }

  goToList(): void {
    this.listKey++;
    this.view = 'list';
  }

  getCurrentTitle(): string {
    const titles: Record<string, string> = {
      create:  'Nouveau Ticket',
      list:    'Mes Tickets',
      profile: 'Mon Profil'
    };
    return titles[this.view] || '';
  }

  toggleDropdown(): void { this.dropdownOpen = !this.dropdownOpen; }

  goToProfile(): void {
    this.view = 'profile';
    this.dropdownOpen = false;
  }

  logout(): void {
    // ✅ disconnect() appelé UNIQUEMENT ici, au vrai logout
    this.notifService.disconnect();
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  getDefaultAvatar(): string {
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23533483'/%3E%3Ccircle cx='20' cy='16' r='7' fill='%23fff' opacity='.9'/%3E%3Cellipse cx='20' cy='34' rx='12' ry='8' fill='%23fff' opacity='.9'/%3E%3C/svg%3E`;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.modalOpen)     this.closeModal();
    if (this.chatPanelOpen) this.closeChat();
    if (this.dropdownOpen)  this.dropdownOpen = false;
  }
}