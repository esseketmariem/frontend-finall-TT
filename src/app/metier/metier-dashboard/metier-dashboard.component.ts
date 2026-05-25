import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { AddTicketComponent }          from '../../add-ticket/add-ticket.component';
import { ProfileComponent }            from '../../shared/profile/profile.component';
import { ChatComponent }               from '../../shared/chat/chat.component';
import { ListeticketComponent }        from '../listeticket/listeticket.component';
import { NotificationBellComponent }   from '../../components/notification-bell/notification-bell.component';
import { NotificationService }         from '../../services/notification.service';

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
    NotificationBellComponent   // ← NEW
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

  // ── Chat side panel ──────────────────────────
  chatPanelOpen = false;
  selectedTicketId: number | null = null;
  selectedTicketTitre: string = '';
  mesTickets: any[] = [];
  unreadCount = 0;

  private baseUrl = 'http://localhost:8070';
  private subs = new Subscription();

  constructor(
    private router: Router,
    private http: HttpClient,
    private notifService: NotificationService   // ← NEW
  ) {}

  ngOnInit(): void {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      this.currentUser = JSON.parse(stored);
    } else {
      this.router.navigate(['/login']);
      return;
    }

    // ── Connect notification WebSocket once ──────
    this.notifService.connect(this.currentUser.id);   // ← NEW

    this.loadMesTickets();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.notifService.disconnect();   // ← NEW
  }

  get safeTicketId(): number {
    return this.selectedTicketId!;
  }

  loadMesTickets(): void {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.get<any[]>(
      `${this.baseUrl}/api/tickets/user/${this.currentUser.id}`,
      { headers }
    ).subscribe({
      next: (tickets) => {
        this.mesTickets = tickets;
        console.log('✅ mesTickets chargés:', tickets.length);
      },
      error: (err) => console.error('Erreur chargement tickets :', err)
    });
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

  openChat(ticketId: number, ticketTitre: string = ''): void {
    this.selectedTicketId    = ticketId;
    this.selectedTicketTitre = ticketTitre;
    this.chatPanelOpen       = true;
    this.unreadCount         = 0;
    this.notifService.clearChat();   // ← NEW: clear chat badge when opening
  }

  closeChat(): void {
    this.chatPanelOpen = false;
  }

  onTicketSelected(): void {
    this.unreadCount = 0;
    const ticket = this.mesTickets.find(t => t.id === this.selectedTicketId);
    this.selectedTicketTitre = ticket?.titre ?? '';
    this.notifService.clearChat();   // ← NEW
  }

  getCurrentTitle(): string {
    const titles: Record<string, string> = {
      create:  'Nouveau Ticket',
      list:    'Mes Tickets',
      profile: 'Mon Profil'
    };
    return titles[this.view] || '';
  }

  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

  goToProfile(): void {
    this.view = 'profile';
    this.dropdownOpen = false;
  }

  logout(): void {
    this.notifService.disconnect();
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  getDefaultAvatar(): string {
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23533483'/%3E%3Ccircle cx='20' cy='16' r='7' fill='%23fff' opacity='.9'/%3E%3Cellipse cx='20' cy='34' rx='12' ry='8' fill='%23fff' opacity='.9'/%3E%3C/svg%3E`;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.chatPanelOpen) this.closeChat();
    if (this.dropdownOpen)  this.dropdownOpen = false;
  }
  openChatFromNotif(ticketId: number): void {
  this.selectedTicketId    = ticketId;
  const ticket = this.mesTickets.find(t => t.id === ticketId);
  this.selectedTicketTitre = ticket?.titre ?? '';
  this.chatPanelOpen       = true;
  this.notifService.clearChat();
}
}