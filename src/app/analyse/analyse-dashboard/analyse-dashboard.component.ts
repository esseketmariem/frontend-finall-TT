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

interface Commentaire {
  id: number;
  commentaire?: string;
  contenu?: string;
  auteurNom: string;
  auteurPrenom: string;
  dateCreation: string;
  ticketId?: number;
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
  isLoading         = false;
  errorMessage      = '';
  analyzingId: number | null          = null;
  startingAnalysisId: number | null   = null;
  completingAnalysisId: number | null = null;

  generatingTachesId: number | null = null;
  sousTicketsMap: { [ticketId: number]: SousTicketSimple[] } = {};
  tachesMap: { [sousTicketId: number]: TacheResponse[] }    = {};
  expandedTicketId: number | null   = null;
  loadingSousTicketsIds: Set<number> = new Set();

  chatPanelOpen        = false;
  selectedTicketId: number | null = null;
  selectedTicketTitre  = '';
  unreadCount          = 0;

  showAnalyseModal      = false;
  selectedTicket: Ticket | null = null;
  commentaireBA         = '';
  systemesDisponibles   = [
    'DME', 'DMFI', 'IT', 'DRC', 'DFR', 'DCF',
    'DMM', 'DRT', 'INFO CENTRE', '1200', 'NOC DATA',
    'BOM', 'PORTAIL', 'DCWI'
  ];
  systemesSelectionnes: string[] = [];

  showSousTicketModal      = false;
  selectedSousTicket: SousTicketSimple | null = null;

  sendingToMantisId: number | null = null;
  mantisSuccessMap: { [sousTicketId: number]: string } = {};

  showCommentaireModal           = false;
  selectedTicketForComment: Ticket | null = null;
  commentaires: Commentaire[]    = [];
  loadingCommentaires            = false;
  nouveauCommentaire             = '';
  sendingCommentaire             = false;

  private apiUrl = 'http://localhost:8070/api';
  private subs   = new Subscription();

  private buildHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('token')}` });
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
    const user   = stored ? JSON.parse(stored) : null;

    if (user?.id) {
      this.notifService.connect(user.id);

      this.subs.add(
        this.notifService.notification$.subscribe(notif => {
          console.log('📨 [Analyse] Notif reçue:', notif); // debug
          // ✅ Notification de chat → incrémente si panel fermé ou autre ticket
          if (notif.type === 'CHAT' && notif.ticketId) {
            if (!this.chatPanelOpen || this.selectedTicketId !== notif.ticketId) {
              this.unreadCount++;
            }
          }
          // ✅ Notification de commentaire → recharge si modal ouverte sur ce ticket
          if (notif.type === 'COMMENT' && notif.ticketId) {
            if (this.showCommentaireModal && this.selectedTicketForComment?.id === notif.ticketId) {
              this.chargerCommentaires(notif.ticketId);
            }
          }
        })
      );

      this.subs.add(
        this.notifService.unreadChat$.subscribe(count => {
          if (!this.chatPanelOpen) this.unreadCount = count;
        })
      );
    }

    this.loadAcceptedTickets();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    // ✅ FIX: NE PAS appeler notifService.disconnect() ici
    // disconnect() est réservé au logout() uniquement
  }

  getCurrentUserId(): number | null {
    const stored = localStorage.getItem('currentUser');
    return stored ? JSON.parse(stored).id ?? null : null;
  }

  @HostListener('document:click')
  onDocumentClick(): void { this.userMenuOpen = false; }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.chatPanelOpen)        this.closeChat();
    if (this.showAnalyseModal)     this.fermerModal();
    if (this.showSousTicketModal)  this.showSousTicketModal = false;
    if (this.showCommentaireModal) this.fermerCommentaireModal();
    if (this.userMenuOpen)         this.userMenuOpen = false;
  }

  toggleUserMenu(event?: Event): void {
    event?.stopPropagation();
    this.userMenuOpen = !this.userMenuOpen;
  }

  getInitials(): string {
    return ((this.prenom?.charAt(0) ?? '') + (this.nom?.charAt(0) ?? '')).toUpperCase() || '??';
  }

  goToProfile(): void { this.userMenuOpen = false; this.router.navigate(['/profile']); }

  logout(): void {
    // ✅ disconnect() appelé UNIQUEMENT ici, au vrai logout
    this.notifService.disconnect();
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  setView(view: 'tickets' | 'analyses'): void { this.activeView = view; }

  // ── Chat ──────────────────────────────────────────────────────────────────

  openChat(ticketId: number, event: Event): void {
    event.stopPropagation();
    const ticket = this.tickets.find(t => t.id === ticketId);
    this.selectedTicketId    = ticketId;
    this.selectedTicketTitre = ticket?.titre ?? '';
    this.chatPanelOpen       = true;
    this.unreadCount         = 0;
    this.notifService.clearChat();
  }

  closeChat(): void { this.chatPanelOpen = false; }

  onTicketSelected(): void {
    const ticket = this.tickets.find(t => t.id === this.selectedTicketId);
    this.selectedTicketTitre = ticket?.titre ?? '';
    this.unreadCount = 0;
    this.notifService.clearChat();
  }

  openChatFromNotif(ticketId: number): void {
    const ticket = this.tickets.find(t => t.id === ticketId);
    if (!ticket) {
      // ticket pas encore dans la liste → recharge puis ouvre
      this.ticketService.getAllTickets().subscribe(data => {
        this.tickets = data;
        const t = data.find((x: Ticket) => x.id === ticketId);
        this.selectedTicketId    = ticketId;
        this.selectedTicketTitre = t?.titre ?? `Ticket #${ticketId}`;
        this.chatPanelOpen       = true;
        this.unreadCount         = 0;
        this.notifService.clearChat();
      });
      return;
    }
    this.selectedTicketId    = ticketId;
    this.selectedTicketTitre = ticket.titre ?? `Ticket #${ticketId}`;
    this.chatPanelOpen       = true;
    this.unreadCount         = 0;
    this.notifService.clearChat();
  }

  ouvrirCommentairesParId(ticketId: number): void {
    const ticket = this.tickets.find(t => t.id === ticketId);
    if (ticket) {
      this.ouvrirCommentaires(ticket, new MouseEvent('click'));
    } else {
      this.ticketService.getAllTickets().subscribe(data => {
        this.tickets = data;
        const t = data.find((x: Ticket) => x.id === ticketId);
        if (t) this.ouvrirCommentaires(t, new MouseEvent('click'));
      });
    }
  }

  // ── Tickets ───────────────────────────────────────────────────────────────

  private isAnalysed(t: Ticket): boolean {
    return t.statut === 'ANALYZED' || t.statut === 'APPROUVE'
        || t.statut === 'REJETE'   || t.analyseIAEffectuee === true;
  }

  get pendingTickets():    Ticket[] { return this.tickets.filter(t => !this.isAnalysed(t)); }
  get analysedTickets():   Ticket[] { return this.tickets.filter(t => this.isAnalysed(t)); }
  get displayedTickets():  Ticket[] { return this.activeView === 'tickets' ? this.pendingTickets : this.analysedTickets; }
  get enCoursTickets():    Ticket[] { return this.tickets.filter(t => t.statut === 'EN_COURS'); }
  get inAnalysisTickets(): Ticket[] { return this.tickets.filter(t => t.statut === 'IN_ANALYSIS'); }
  get analyzedTickets():   Ticket[] { return this.tickets.filter(t => t.statut === 'ANALYZED'); }

  loadAcceptedTickets(): void {
    this.isLoading    = true;
    this.errorMessage = '';
    this.ticketService.getAllTickets().subscribe({
      next:  (data) => { this.tickets = data; this.isLoading = false; },
      error: ()     => { this.errorMessage = 'Erreur chargement tickets'; this.isLoading = false; }
    });
  }

  demarrerAnalyse(ticket: Ticket, event?: Event): void {
    event?.stopPropagation();
    if (!ticket.id) return;
    this.startingAnalysisId = ticket.id;
    this.ticketService.startAnalysis(ticket.id).subscribe({
      next: (updated) => {
        const i = this.tickets.findIndex(t => t.id === updated.id);
        if (i !== -1) {
          this.tickets[i] = { ...this.tickets[i], statut: 'IN_ANALYSIS', analyseIAEffectuee: false };
          this.tickets = [...this.tickets];
        }
        this.startingAnalysisId = null;
      },
      error: (err) => { this.errorMessage = err.error ?? 'Erreur démarrage analyse'; this.startingAnalysisId = null; }
    });
  }

  terminerAnalyse(ticket: Ticket, event?: Event): void {
    event?.stopPropagation();
    if (!ticket.id) return;
    this.completingAnalysisId = ticket.id;
    this.ticketService.completeAnalysis(ticket.id).subscribe({
      next: (updated) => {
        const i = this.tickets.findIndex(t => t.id === updated.id);
        if (i !== -1) {
          this.tickets[i] = { ...this.tickets[i], statut: 'ANALYZED', analyseIAEffectuee: true };
          this.tickets = [...this.tickets];
        }
        this.completingAnalysisId = null;
        this.activeView = 'analyses';
      },
      error: (err) => { this.errorMessage = err.error ?? 'Erreur finalisation analyse'; this.completingAnalysisId = null; }
    });
  }

  lancerAnalyse(ticket: Ticket, event?: Event): void {
    event?.stopPropagation();
    this.selectedTicket        = ticket;
    this.systemesSelectionnes  = [];
    this.commentaireBA         = '';
    this.showAnalyseModal      = true;
  }

  toggleSysteme(sys: string): void {
    const idx = this.systemesSelectionnes.indexOf(sys);
    idx === -1 ? this.systemesSelectionnes.push(sys) : this.systemesSelectionnes.splice(idx, 1);
  }

  isSystemeSelected(sys: string): boolean { return this.systemesSelectionnes.includes(sys); }

  fermerModal(event?: Event): void {
    event?.stopPropagation();
    this.showAnalyseModal     = false;
    this.selectedTicket       = null;
    this.systemesSelectionnes = [];
    this.commentaireBA        = '';
  }

  confirmerAnalyse(event?: Event): void {
    event?.stopPropagation();
    if (!this.selectedTicket?.id) return;
    if (this.systemesSelectionnes.length === 0) {
      alert('Veuillez sélectionner au moins un système impacté.');
      return;
    }

    this.analyzingId      = this.selectedTicket.id;
    this.showAnalyseModal = false;

    const stored   = localStorage.getItem('currentUser');
    const baId     = stored ? JSON.parse(stored).id : null;
    const ticketId = this.selectedTicket.id;

    this.http.post<any>(`${this.apiUrl}/ba/analyser`, {
      ticketId,
      systemesImpactes: this.systemesSelectionnes,
      commentaireBA:    this.commentaireBA,
      baId
    }, { headers: this.buildHeaders() }).subscribe({
      next: (updated: any) => {
        const i = this.tickets.findIndex(t => t.id === ticketId);
        if (i !== -1) {
          this.tickets[i] = {
            ...this.tickets[i],
            analyseIAEffectuee: true,
            statut:             'ANALYZED',
            aiSummary:          updated.syntheseIA ?? updated.aiSummary ?? ''
          };
          this.tickets = [...this.tickets];
        }
        this.analyzingId = null;
        this.activeView  = 'analyses';
      },
      error: () => { this.errorMessage = 'Erreur analyse'; this.analyzingId = null; }
    });
  }

  voirAnalyse(ticket: Ticket, event?: Event): void {
    event?.stopPropagation();
    if (ticket.id) this.router.navigate(['/analyse/ticket', ticket.id]);
  }

  voirSousTickets(ticket: Ticket, event?: Event): void {
    event?.stopPropagation();
    if (!ticket.id) return;
    if (this.expandedTicketId === ticket.id) { this.expandedTicketId = null; return; }
    this.expandedTicketId = ticket.id;
    this.chargerSousTicketsAvecTaches(ticket.id);
  }

  isLoadingSousTickets(ticketId: number): boolean { return this.loadingSousTicketsIds.has(ticketId); }

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
            next:  (taches) => { if (taches?.length > 0) this.tachesMap[st.id] = taches; },
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
      next:  (taches) => { this.tachesMap[sousTicketId] = taches; this.generatingTachesId = null; },
      error: () => { this.errorMessage = 'Erreur génération tâches'; this.generatingTachesId = null; }
    });
  }

  voirSousTicket(sousTicket: SousTicketSimple, event: Event): void {
    event.stopPropagation();
    this.selectedSousTicket  = sousTicket;
    this.showSousTicketModal = true;
  }

  envoyerVersMantis(sousTicketId: number, ticketId: number, event: Event): void {
    event.stopPropagation();
    this.sendingToMantisId = sousTicketId;
    this.http.post<any>(
      `${this.apiUrl}/mantis/sous-tickets/${sousTicketId}/send`,
      {},
      { headers: this.buildHeaders() }
    ).subscribe({
      next: (response) => {
        if (response?.mantisUrl || response?.success) {
          const url = response.mantisUrl ?? '';
          this.mantisSuccessMap[sousTicketId] = url;
          const st = this.sousTicketsMap[ticketId]?.find(s => s.id === sousTicketId);
          if (st) { st.envoyeSurMantis = true; st.mantisUrl = url; }
          if (this.selectedSousTicket?.id === sousTicketId) {
            this.selectedSousTicket = { ...this.selectedSousTicket, envoyeSurMantis: true, mantisUrl: url };
          }
        }
        this.sendingToMantisId = null;
      },
      error: (err) => {
        this.errorMessage     = err?.error?.message ?? 'Erreur envoi vers Mantis';
        this.sendingToMantisId = null;
      }
    });
  }


  // ── Commentaires ──────────────────────────────────────────────────────────

  ouvrirCommentaires(ticket: Ticket, event: Event): void {
    event.stopPropagation();
    this.selectedTicketForComment = ticket;
    this.nouveauCommentaire       = '';
    this.showCommentaireModal     = true;
    this.chargerCommentaires(ticket.id!);
  }

  chargerCommentaires(ticketId: number): void {
    this.loadingCommentaires = true;
    this.commentaires        = [];
    this.http.get<Commentaire[]>(
      `${this.apiUrl}/commentaires/ticket/${ticketId}`,
      { headers: this.buildHeaders() }
    ).subscribe({
      next:  (data) => { this.commentaires = data; this.loadingCommentaires = false; },
      error: ()     => { this.loadingCommentaires = false; }
    });
  }

  envoyerCommentaire(): void {
    const contenu = this.nouveauCommentaire.trim();
    if (!contenu || !this.selectedTicketForComment?.id) return;
    this.sendingCommentaire = true;
    const stored = localStorage.getItem('currentUser');
    const user   = stored ? JSON.parse(stored) : null;

    this.http.post<Commentaire[]>(
      `${this.apiUrl}/commentaires/${this.selectedTicketForComment.id}`,
      { commentaire: contenu, userId: user?.id },
      { headers: this.buildHeaders() }
    ).subscribe({
      next: (list) => {
        this.commentaires       = list;
        this.nouveauCommentaire = '';
        this.sendingCommentaire = false;
      },
      error: () => {
        this.sendingCommentaire = false;
        this.errorMessage       = "Erreur lors de l'envoi du commentaire";
      }
    });
  }

  fermerCommentaireModal(): void {
    this.showCommentaireModal     = false;
    this.selectedTicketForComment = null;
    this.commentaires             = [];
    this.nouveauCommentaire       = '';
    this.sendingCommentaire       = false;
  }

  getInitialesCommentaire(prenom: string, nom: string): string {
    return ((prenom?.charAt(0) ?? '') + (nom?.charAt(0) ?? '')).toUpperCase() || '?';
  }

  // ── Labels / classes ──────────────────────────────────────────────────────

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
  // après get analyzedTickets()
get ticketsHaute():   number { return this.tickets.filter(t => ['HAUTE','HIGH'].includes((t.priorite as string)?.toUpperCase())).length; }
get ticketsMoyenne(): number { return this.tickets.filter(t => ['MOYENNE','MEDIUM'].includes((t.priorite as string)?.toUpperCase())).length; }
get ticketsBasse():   number { return this.tickets.filter(t => ['BASSE','LOW'].includes((t.priorite as string)?.toUpperCase())).length; }
get ticketsInAnalysis(): number { return this.tickets.filter(t => t.statut === 'IN_ANALYSIS').length; }
}