import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TicketService } from '../../services/ticket.service';
import { Ticket } from '../../models/ticket';
import { Subscription, Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface Commentaire {
  id: number;
  commentaire: string;
  nomAuteur?: string;
  username?: string;
  utilisateur?: { nom: string };
}

@Component({
  selector: 'app-listeticket',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './listeticket.component.html',
  styleUrls: ['./listeticket.component.css']
})
export class ListeticketComponent implements OnInit, OnDestroy {
  @Input() reloadKey: number = 0;

  tickets: Ticket[] = [];
  filteredTickets: Ticket[] = [];
  loading = false;
  error: string | null = null;

  searchText = '';
  selectedStatut = 'ALL';
  selectedPriorite = 'ALL';

  get countTodo():       number { return this.tickets.filter(t => t.statut === 'A_FAIRE').length; }
  get countInProgress(): number { return this.tickets.filter(t => t.statut === 'EN_COURS').length; }
  get countInAnalysis(): number { return this.tickets.filter(t => t.statut === 'IN_ANALYSIS').length; }
  get countAnalyzed():   number { return this.tickets.filter(t => t.statut === 'ANALYZED').length; }
  get countDone():       number { return this.tickets.filter(t => t.statut === 'FAIT').length; }

  showCommentModal = false;
  activeCommentTicketId: number = 0;
  commentaires: Commentaire[] = [];
  commentText = '';

  showEditModal = false;
  editingTicket: Ticket | null = null;

  // ← NOUVEAU
  showViewModal = false;
  viewingTicket: Ticket | null = null;

  private subscriptions = new Subscription();
  private apiUrl = 'http://localhost:8070/api';

  constructor(
    private ticketService: TicketService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadTickets();

    this.subscriptions.add(
      this.ticketService.ticketCreated$.subscribe({
        next: () => this.loadTickets(),
        error: (err: unknown) => console.error('Erreur notification création:', err)
      })
    );

    this.subscriptions.add(
      this.ticketService.ticketUpdated$.subscribe({
        next: () => this.loadTickets(),
        error: (err: unknown) => console.error('Erreur notification mise à jour:', err)
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private getCurrentUser(): any {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      try { return JSON.parse(stored); } catch { return null; }
    }
    return null;
  }

  private getRole(): string {
    const user = this.getCurrentUser();
    if (user) return user.role || user.roles?.[0] || '';
    return localStorage.getItem('role') || '';
  }

  isMetier(): boolean { return this.getRole() === 'METIER'; }
  isAdmin():  boolean { return this.getRole() === 'ADMIN'; }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  loadTickets(): void {
    const metier = this.isMetier();
    this.loading = true;
    this.error = null;

    if (metier) {
      const user = this.getCurrentUser();
      if (!user?.id) {
        this.error = 'Utilisateur non identifié. Veuillez vous reconnecter.';
        this.loading = false;
        return;
      }
    }

    const obs: Observable<Ticket[]> = metier
      ? this.ticketService.getMesTickets()
      : this.ticketService.getAllTickets();

    this.subscriptions.add(
      obs.subscribe({
        next: (data: Ticket[]) => {
          this.tickets = data;
          this.filterTickets();
          this.loading = false;
        },
        error: (err: unknown) => {
          console.error('❌ Erreur chargement:', err);
          this.error = 'Erreur lors du chargement des tickets';
          this.loading = false;
        }
      })
    );
  }

  filterTickets(): void {
    const search = this.searchText.toLowerCase();
    this.filteredTickets = this.tickets.filter(t => {
      const matchSearch = !search ||
        t.titre?.toLowerCase().includes(search) ||
        t.description?.toLowerCase().includes(search);
      const matchStatut   = this.selectedStatut   === 'ALL' || t.statut   === this.selectedStatut;
      const matchPriorite = this.selectedPriorite === 'ALL' || t.priorite === this.selectedPriorite;
      return matchSearch && matchStatut && matchPriorite;
    });
  }

  quickFilter(statut: string): void {
    this.selectedStatut = statut;
    this.filterTickets();
  }

  formatTicketId(id: number | undefined): string {
    if (!id) return '—';
    return `#TK-${String(id).padStart(4, '0')}`;
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getStatutLabel(statut: string | undefined): string {
    switch (statut) {
      case 'A_FAIRE':     return 'À traiter';
      case 'EN_COURS':    return 'En cours';
      case 'IN_ANALYSIS': return 'En analyse';
      case 'ANALYZED':    return 'Analysé';
      case 'FAIT':        return 'Résolu';
      case 'APPROUVE':    return 'Approuvé';
      case 'REJETE':      return 'Rejeté';
      default:            return statut ?? '—';
    }
  }

  isTicketLocked(ticket: Ticket): boolean {
    return ticket.statut !== 'EN_COURS' && ticket.statut !== 'A_FAIRE';
  }

  deleteTicket(id: number): void {
    if (!confirm('Supprimer ce ticket ?')) return;
    this.subscriptions.add(
      this.ticketService.deleteTicket(id).subscribe({
        next: () => {
          this.tickets = this.tickets.filter(t => t.id !== id);
          this.filterTickets();
        },
        error: (err: unknown) => console.error('Erreur suppression:', err)
      })
    );
  }

  openCommentBox(ticketId: number): void {
    this.activeCommentTicketId = ticketId;
    this.showCommentModal = true;
    this.commentaires = [];
    this.commentText = '';
    this.http.get<Commentaire[]>(
      `${this.apiUrl}/commentaires/ticket/${ticketId}`,
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next: (data: Commentaire[]) => this.commentaires = data,
      error: (err: unknown) => console.error('Erreur chargement commentaires:', err)
    });
  }

  closeCommentBox(): void {
    this.showCommentModal = false;
    this.commentaires = [];
    this.commentText = '';
  }

  addComment(): void {
    if (!this.commentText.trim()) return;
    const user = this.getCurrentUser();
    if (!user?.id) { console.error('Utilisateur non identifié'); return; }
    this.http.post<Commentaire>(
      `${this.apiUrl}/commentaires/${this.activeCommentTicketId}`,
      { commentaire: this.commentText, userId: user.id },
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next: (c: any) => {
        if (Array.isArray(c)) {
          this.commentaires = c;
        } else {
          this.commentaires.push(c);
        }
        this.commentText = '';
        const t = this.tickets.find(x => x.id === this.activeCommentTicketId);
        if (t) t.nombreCommentaires = (t.nombreCommentaires || 0) + 1;
      },
      error: (err: unknown) => console.error('Erreur ajout commentaire:', err)
    });
  }

  deleteComment(commentId: number): void {
    this.http.delete(
      `${this.apiUrl}/commentaires/${commentId}`,
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next: () => {
        this.commentaires = this.commentaires.filter(c => c.id !== commentId);
        const t = this.tickets.find(x => x.id === this.activeCommentTicketId);
        if (t && t.nombreCommentaires) t.nombreCommentaires--;
      },
      error: (err: unknown) => console.error('Erreur suppression commentaire:', err)
    });
  }

  get isAnalyseDone(): boolean {
    return this.isTicketLocked(this.editingTicket!);
  }

  openEditModal(ticket: Ticket): void {
    this.editingTicket = { ...ticket };
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingTicket = null;
  }

  saveEdit(): void {
    if (!this.editingTicket?.id) return;
    if (this.isTicketLocked(this.editingTicket)) {
      console.warn('Ticket verrouillé');
      return;
    }

    const payload = {
      titre:        this.editingTicket.titre,
      description:  this.editingTicket.description,
      statut:       this.editingTicket.statut,
      priorite:     this.editingTicket.priorite,
      dateSouhaite: this.editingTicket.dateSouhaite,
      userId:       this.editingTicket.userId
    };

    this.subscriptions.add(
      this.ticketService.updateTicket(this.editingTicket.id, payload).subscribe({
        next: (updated: Ticket) => {
          const idx = this.tickets.findIndex(t => t.id === updated.id);
          if (idx !== -1) this.tickets[idx] = updated;
          this.filterTickets();
          this.closeEditModal();
        },
        error: (err: any) => {
          console.error('Erreur modification:', err.status, err.error);
        }
      })
    );
  }

  // ← NOUVELLES MÉTHODES VOIR TICKET
  openViewModal(ticket: Ticket): void {
    this.viewingTicket = { ...ticket };
    this.showViewModal = true;
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.viewingTicket = null;
  }

  switchToEdit(): void {
    if (!this.viewingTicket) return;
    const ticket = { ...this.viewingTicket };
    this.closeViewModal();
    this.openEditModal(ticket);
  }
}