import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { TicketService }             from '../../services/ticket.service';
import { AuthService }               from '../../services/auth.service';
import { Ticket }                    from '../../models/ticket';
import { ChatComponent }             from '../../shared/chat/chat.component';
import { NotificationBellComponent } from '../../components/notification-bell/notification-bell.component';
import { NotificationService }       from '../../services/notification.service';

interface SousTicketSimple {
  id: number;
  titre: string;
  systeme?: string;
  resumeTechnique?: string;
  description?: string;
  equipeResponsable: string;
  envoyeSurMantis?: boolean;
  mantisUrl?: string;
  ticketParentId?: number;
}

interface TacheResponse {
  id: number;
  titre: string;
  statut: string;
  priorite: string;
  assigneeNom: string;
  assigneePrenom: string;
}

@Component({
  selector: 'app-analyse-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatComponent, NotificationBellComponent],
  templateUrl: './analyse-dashboard.component.html',
  styleUrls: ['./analyse-dashboard.component.css']
})
export class AnalyseDashboardComponent implements OnInit, OnDestroy {

  userMenuOpen = false;
  nom    = localStorage.getItem('nom')    ?? '';
  prenom = localStorage.getItem('prenom') ?? '';

  activeView: 'tickets' | 'analyses' = 'tickets';

  tickets: Ticket[] = [];
  isLoading = false;
  errorMessage = '';
  analyzingId: number | null = null;

  startingAnalysisId:   number | null = null;
  completingAnalysisId: number | null = null;

  generatingTachesId: number | null = null;
  sousTicketsMap: { [ticketId: number]: SousTicketSimple[] } = {};
  tachesMap: { [sousTicketId: number]: TacheResponse[] } = {};
  expandedTicketId: number | null = null;
  loadingSousTicketsIds: Set<number> = new Set();

  chatPanelOpen = false;
  selectedTicketId: number | null = null;
  selectedTicketTitre: string = '';
  unreadCount = 0;

  showAnalyseModal = false;
  selectedTicket: Ticket | null = null;
  commentaireBA = '';
  systemesDisponibles = [
    'DME', 'DMFI', 'IT', 'DRC', 'DFR', 'DCF',
    'DMM', 'DRT', 'INFO CENTRE', '1200', 'NOC DATA',
    'BOM', 'PORTAIL', 'DCWI'
  ];
  systemesSelectionnes: string[] = [];

  // ── Sous-ticket modal ─────────────────────────
  showSousTicketModal = false;
  selectedSousTicket: SousTicketSimple | null = null;

  // ── Mantis ────────────────────────────────────
  sendingToMantisId: number | null = null;
  mantisSuccessMap: { [sousTicketId: number]: string } = {};

  private apiUrl = 'http://localhost:8070/api';
  private subs = new Subscription();

  private buildHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`
    });
  }

  constructor(
    private ticketService: TicketService,
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    private notifService: NotificationService
  ) {}

  ngOnInit(): void {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      const user = JSON.parse(stored);
      this.notifService.connect(user.id);
    }
    this.loadAcceptedTickets();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.notifService.disconnect();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.userMenuOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.chatPanelOpen)       this.closeChat();
    if (this.showAnalyseModal)    this.fermerModal();
    if (this.showSousTicketModal) this.showSousTicketModal = false;
    if (this.userMenuOpen)        this.userMenuOpen = false;
  }

  toggleUserMenu(event?: Event): void {
    event?.stopPropagation();
    this.userMenuOpen = !this.userMenuOpen;
  }

  getInitials(): string {
    return ((this.prenom?.charAt(0) ?? '') + (this.nom?.charAt(0) ?? '')).toUpperCase() || '??';
  }

  goToProfile(): void {
    this.userMenuOpen = false;
    this.router.navigate(['/profile']);
  }

  logout(): void {
    this.notifService.disconnect();
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  setView(view: 'tickets' | 'analyses'): void {
    this.activeView = view;
  }

  // ── Chat panel ────────────────────────────────
  openChat(ticketId: number, event: Event): void {
    event.stopPropagation();
    const ticket = this.tickets.find(t => t.id === ticketId);
    this.selectedTicketId    = ticketId;
    this.selectedTicketTitre = ticket?.titre ?? '';
    this.chatPanelOpen       = true;
    this.unreadCount         = 0;
    this.notifService.clearChat();
  }

  closeChat(): void {
    this.chatPanelOpen = false;
  }

  onTicketSelected(): void {
    const ticket = this.tickets.find(t => t.id === this.selectedTicketId);
    this.selectedTicketTitre = ticket?.titre ?? '';
    this.unreadCount = 0;
    this.notifService.clearChat();
  }

  openChatFromNotif(ticketId: number): void {
    const ticket = this.tickets.find(t => t.id === ticketId);
    this.selectedTicketId    = ticketId;
    this.selectedTicketTitre = ticket?.titre ?? '';
    this.chatPanelOpen       = true;
    this.notifService.clearChat();
  }

  // ── Ticket getters ────────────────────────────
  private isAnalysed(t: Ticket): boolean {
    return t.statut === 'ANALYZED'
        || t.statut === 'APPROUVE'
        || t.statut === 'REJETE'
        || t.analyseIAEffectuee === true;
  }

  get pendingTickets(): Ticket[] {
    return this.tickets.filter(t => !this.isAnalysed(t));
  }

  get analysedTickets(): Ticket[] {
    return this.tickets.filter(t => this.isAnalysed(t));
  }

  get displayedTickets(): Ticket[] {
    return this.activeView === 'tickets' ? this.pendingTickets : this.analysedTickets;
  }

  get enCoursTickets(): Ticket[] {
    return this.tickets.filter(t => t.statut === 'EN_COURS');
  }

  get inAnalysisTickets(): Ticket[] {
    return this.tickets.filter(t => t.statut === 'IN_ANALYSIS');
  }

  get analyzedTickets(): Ticket[] {
    return this.tickets.filter(t => t.statut === 'ANALYZED');
  }

  // ── Load tickets ──────────────────────────────
  loadAcceptedTickets(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.ticketService.getAllTickets().subscribe({
      next: (data) => {
        this.tickets = data;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Erreur chargement tickets';
        this.isLoading = false;
      }
    });
  }

  // ── Start analysis ────────────────────────────
  demarrerAnalyse(ticket: Ticket, event?: Event): void {
    event?.stopPropagation();
    if (!ticket.id) return;

    this.startingAnalysisId = ticket.id;
    this.ticketService.startAnalysis(ticket.id).subscribe({
      next: (updated) => {
        const index = this.tickets.findIndex(t => t.id === updated.id);
        if (index !== -1) {
          this.tickets[index] = {
            ...this.tickets[index],
            statut: 'IN_ANALYSIS',
            analyseIAEffectuee: false
          };
          this.tickets = [...this.tickets];
        }
        this.startingAnalysisId = null;
      },
      error: (err) => {
        this.errorMessage = err.error ?? 'Erreur démarrage analyse';
        this.startingAnalysisId = null;
      }
    });
  }

  // ── Complete analysis ─────────────────────────
  terminerAnalyse(ticket: Ticket, event?: Event): void {
    event?.stopPropagation();
    if (!ticket.id) return;

    this.completingAnalysisId = ticket.id;
    this.ticketService.completeAnalysis(ticket.id).subscribe({
      next: (updated) => {
        const index = this.tickets.findIndex(t => t.id === updated.id);
        if (index !== -1) {
          this.tickets[index] = {
            ...this.tickets[index],
            statut: 'ANALYZED',
            analyseIAEffectuee: true
          };
          this.tickets = [...this.tickets];
        }
        this.completingAnalysisId = null;
        this.activeView = 'analyses';
      },
      error: (err) => {
        this.errorMessage = err.error ?? 'Erreur finalisation analyse';
        this.completingAnalysisId = null;
      }
    });
  }

  // ── Modal IA ──────────────────────────────────
  lancerAnalyse(ticket: Ticket, event?: Event): void {
    event?.stopPropagation();
    this.selectedTicket = ticket;
    this.systemesSelectionnes = [];
    this.commentaireBA = '';
    this.showAnalyseModal = true;
  }

  toggleSysteme(sys: string): void {
    const idx = this.systemesSelectionnes.indexOf(sys);
    idx === -1 ? this.systemesSelectionnes.push(sys) : this.systemesSelectionnes.splice(idx, 1);
  }

  isSystemeSelected(sys: string): boolean {
    return this.systemesSelectionnes.includes(sys);
  }

  fermerModal(event?: Event): void {
    event?.stopPropagation();
    this.showAnalyseModal = false;
    this.selectedTicket = null;
    this.systemesSelectionnes = [];
    this.commentaireBA = '';
  }

  confirmerAnalyse(event?: Event): void {
    event?.stopPropagation();
    if (!this.selectedTicket?.id) return;
    if (this.systemesSelectionnes.length === 0) {
      alert('Veuillez sélectionner au moins un système impacté.');
      return;
    }

    this.analyzingId = this.selectedTicket.id;
    this.showAnalyseModal = false;

    const stored = localStorage.getItem('currentUser');
    const baId = stored ? JSON.parse(stored).id : null;
    const ticketId = this.selectedTicket.id;

    this.http.post<any>(`${this.apiUrl}/ba/analyser`, {
      ticketId,
      systemesImpactes: this.systemesSelectionnes,
      commentaireBA:    this.commentaireBA,
      baId
    }, { headers: this.buildHeaders() }).subscribe({
      next: (updated: any) => {
        const index = this.tickets.findIndex(t => t.id === ticketId);
        if (index !== -1) {
          this.tickets[index] = {
            ...this.tickets[index],
            analyseIAEffectuee: true,
            statut:    'ANALYZED',
            aiSummary: updated.syntheseIA ?? updated.aiSummary ?? ''
          };
          this.tickets = [...this.tickets];
        }
        this.analyzingId = null;
        this.activeView = 'analyses';
      },
      error: () => {
        this.errorMessage = 'Erreur analyse';
        this.analyzingId = null;
      }
    });
  }

  voirAnalyse(ticket: Ticket, event?: Event): void {
    event?.stopPropagation();
    if (ticket.id) this.router.navigate(['/analyse/ticket', ticket.id]);
  }

  // ── Sous-tickets ──────────────────────────────
  voirSousTickets(ticket: Ticket, event?: Event): void {
    event?.stopPropagation();
    if (!ticket.id) return;
    if (this.expandedTicketId === ticket.id) {
      this.expandedTicketId = null;
      return;
    }
    this.expandedTicketId = ticket.id;
    this.chargerSousTicketsAvecTaches(ticket.id);
  }

  isLoadingSousTickets(ticketId: number): boolean {
    return this.loadingSousTicketsIds.has(ticketId);
  }

  private chargerSousTicketsAvecTaches(ticketId: number): void {
    if (this.sousTicketsMap[ticketId]) return;
    this.loadingSousTicketsIds.add(ticketId);

    this.http.get<SousTicketSimple[]>(
      `${this.apiUrl}/sous-tickets/ticket/${ticketId}`,
      { headers: this.buildHeaders() }
    ).subscribe({
      next: (data) => {
        this.sousTicketsMap[ticketId] = data;
        this.loadingSousTicketsIds.delete(ticketId);
        data.forEach(st => {
          this.http.get<TacheResponse[]>(
            `${this.apiUrl}/taches/sous-ticket/${st.id}`,
            { headers: this.buildHeaders() }
          ).subscribe({
            next: (taches) => {
              if (taches?.length > 0) this.tachesMap[st.id] = taches;
            },
            error: () => {}
          });
        });
      },
      error: () => {
        this.errorMessage = 'Erreur chargement sous-tickets';
        this.loadingSousTicketsIds.delete(ticketId);
      }
    });
  }

  genererTaches(sousTicketId: number, event?: Event): void {
    event?.stopPropagation();
    this.generatingTachesId = sousTicketId;
    this.http.post<TacheResponse[]>(
      `${this.apiUrl}/taches/generer/${sousTicketId}`,
      {},
      { headers: this.buildHeaders() }
    ).subscribe({
      next: (taches) => {
        this.tachesMap[sousTicketId] = taches;
        this.generatingTachesId = null;
      },
      error: () => {
        this.errorMessage = 'Erreur génération tâches';
        this.generatingTachesId = null;
      }
    });
  }

  // ── Sous-ticket modal ─────────────────────────
  voirSousTicket(sousTicket: SousTicketSimple, event: Event): void {
    event.stopPropagation();
    this.selectedSousTicket = sousTicket;
    this.showSousTicketModal = true;
  }

  // ── Mantis — envoie le sous-ticket spécifique ─
  envoyerVersMantis(sousTicketId: number, ticketId: number, event: Event): void {
    event.stopPropagation();
    this.sendingToMantisId = sousTicketId;

    // ✅ URL corrigée : on cible le sous-ticket précis, pas "last"
    this.http.post<any>(
      `${this.apiUrl}/mantis/sous-tickets/${sousTicketId}/send`,
      {},
      { headers: this.buildHeaders() }
    ).subscribe({
      next: (response) => {
        if (response?.mantisUrl || response?.success) {
          const url = response.mantisUrl ?? '';
          this.mantisSuccessMap[sousTicketId] = url;

          // Mettre à jour dans la map des sous-tickets
          const sousTickets = this.sousTicketsMap[ticketId];
          if (sousTickets) {
            const st = sousTickets.find(s => s.id === sousTicketId);
            if (st) {
              st.envoyeSurMantis = true;
              st.mantisUrl = url;
            }
          }

          // Mettre à jour la modal si elle affiche ce sous-ticket
          if (this.selectedSousTicket?.id === sousTicketId) {
            this.selectedSousTicket = {
              ...this.selectedSousTicket,
              envoyeSurMantis: true,
              mantisUrl: url
            };
          }
        }
        this.sendingToMantisId = null;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message ?? 'Erreur envoi vers Mantis';
        this.sendingToMantisId = null;
      }
    });
  }

  // ── Helpers ───────────────────────────────────
  getStatutLabel(statut: string | undefined): string {
    switch (statut) {
      case 'EN_COURS':    return 'En cours';
      case 'IN_ANALYSIS': return 'En analyse';
      case 'ANALYZED':    return 'Analysé';
      case 'APPROUVE':    return 'Approuvé';
      case 'REJETE':      return 'Rejeté';
      default:            return statut ?? '—';
    }
  }

  getStatutClass(statut: string | undefined): string {
    switch (statut) {
      case 'EN_COURS':    return 'badge-en-cours';
      case 'IN_ANALYSIS': return 'badge-in-analysis';
      case 'ANALYZED':    return 'badge-analyzed';
      case 'APPROUVE':    return 'badge-approuve';
      case 'REJETE':      return 'badge-rejete';
      default:            return '';
    }
  }

  getPrioriteClass(priorite: string | undefined): string {
    const p = priorite?.toUpperCase();
    if (p === 'HIGH'   || p === 'HAUTE')   return 'badge-haute';
    if (p === 'MEDIUM' || p === 'MOYENNE') return 'badge-moyenne';
    if (p === 'LOW'    || p === 'BASSE')   return 'badge-basse';
    return '';
  }

  getPrioriteLabel(priorite: string | undefined): string {
    const p = priorite?.toUpperCase();
    if (p === 'HIGH'   || p === 'HAUTE')   return 'Haute';
    if (p === 'MEDIUM' || p === 'MOYENNE') return 'Moyenne';
    if (p === 'LOW'    || p === 'BASSE')   return 'Basse';
    return priorite ?? '—';
  }
}