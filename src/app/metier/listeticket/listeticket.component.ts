import { Component, OnInit } from '@angular/core';
import { Ticket } from '../../models/ticket';
import { TicketService } from '../../services/ticket.service';
import { CommentaireService } from '../../services/commentaire.service';
import { NgFor, NgIf, NgClass, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-listeticket',
  imports: [NgFor, NgIf, NgClass, FormsModule, CommonModule],
  templateUrl: './listeticket.component.html',
  styleUrl: './listeticket.component.css'
})
export class ListeticketComponent implements OnInit {

  tickets: Ticket[] = [];
  filteredTickets: Ticket[] = [];
  selectedStatut = 'ALL';
  selectedPriorite = 'ALL';
  searchText = '';

  activeCommentTicketId!: number;
  commentText = '';
  commentaires: any[] = [];

  editingTicket: any = null;
  showEditModal = false;
  showCommentModal = false;

  constructor(
    private ticketService: TicketService,
    private commentaireService: CommentaireService
  ) {}

  ngOnInit() {
    this.loadTickets();
  }

  // ─── TICKETS ────────────────────────────────────────────

  loadTickets() {
    this.ticketService.getAllTickets().subscribe({
      next: (data) => {
        this.tickets = data;
        this.filterTickets();
      },
      error: (err) => console.error('Erreur chargement tickets', err)
    });
  }

  filterTickets() {
    this.filteredTickets = this.tickets.filter(t => {
      const matchStatut = this.selectedStatut === 'ALL' || (t.statut as string) === this.selectedStatut;
      const matchPrio   = this.selectedPriorite === 'ALL' || (t.priorite as string) === this.selectedPriorite;
      const matchSearch =
        t.titre.toLowerCase().includes(this.searchText.toLowerCase()) ||
        t.description?.toLowerCase().includes(this.searchText.toLowerCase());  // ← optional chaining fix
      return matchStatut && matchPrio && matchSearch;
    });
  }

  quickFilter(statut: string) {
    this.selectedStatut = statut;
    this.filterTickets();
  }

  get countTodo()       { return this.tickets.filter(t => (t.statut as string) === 'A_faire').length; }
  get countInProgress() { return this.tickets.filter(t => (t.statut as string) === 'En_cours').length; }
  get countDone()       { return this.tickets.filter(t => (t.statut as string) === 'Fait').length; }

  deleteTicket(id: number) {
    if (!confirm('Confirmer la suppression du ticket ?')) return;
    this.ticketService.deleteTicket(id).subscribe({
      next: () => this.loadTickets(),
      error: (err) => console.error('Erreur suppression ticket', err)
    });
  }

  // ─── MODAL EDIT ─────────────────────────────────────────

  openEditModal(ticket: any) {
    if ((ticket.statut as string) !== 'A_faire') return;
    this.editingTicket = {
      ...ticket,
      dateSouhaite: ticket.dateSouhaite ?? null
    };
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editingTicket = null;
  }

  saveEdit() {
    if (!this.editingTicket) return;

    this.ticketService.updateTicket(this.editingTicket.id, {
      titre:        this.editingTicket.titre,
      description:  this.editingTicket.description,
      statut:       'A_faire',
      priorite:     this.editingTicket.priorite,
      dateSouhaite: this.editingTicket.dateSouhaite || null
    }).subscribe({
      next: () => {
        this.closeEditModal();
        this.loadTickets();
      },
      error: (err) => {
        const msg = err.error?.message || err.error || 'Erreur lors de la modification';
        alert('❌ ' + msg);
      }
    });
  }

  // ─── MODAL COMMENTAIRES ──────────────────────────────────

  openCommentBox(ticketId: number) {
    this.activeCommentTicketId = ticketId;
    this.commentText = '';
    this.commentaires = [];
    this.loadComments(ticketId);
    this.showCommentModal = true;
  }

  closeCommentBox() {
    this.showCommentModal = false;
    this.activeCommentTicketId = null!;
    this.commentText = '';
    this.commentaires = [];
  }

  loadComments(ticketId: number) {
    this.commentaireService.getByTicket(ticketId).subscribe({
      next: (data) => {
        this.commentaires = data;
        const ticket = this.tickets.find(t => t.id === ticketId);
        if (ticket) ticket.nombreCommentaires = data.length;
      },
      error: (err) => console.error('Erreur chargement commentaires', err)
    });
  }

  addComment() {
    if (!this.commentText.trim()) return;
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user?.id) { alert('⚠️ Utilisateur non connecté'); return; }

    this.commentaireService.addComment(this.activeCommentTicketId, {
      commentaire: this.commentText.trim(),
      userId: user.id
    }).subscribe({
      next: (updatedList) => {
        this.commentaires = Array.isArray(updatedList) ? updatedList : [...this.commentaires, updatedList];
        this.commentText = '';
        const ticket = this.tickets.find(t => t.id === this.activeCommentTicketId);
        if (ticket) ticket.nombreCommentaires = this.commentaires.length;
      },
      error: (err) => console.error('Erreur ajout commentaire', err)
    });
  }

  deleteComment(commentId: number) {
    this.commentaireService.delete(commentId).subscribe({
      next: () => this.loadComments(this.activeCommentTicketId),
      error: (err) => console.error('Erreur suppression commentaire', err)
    });
  }

  // ─── UTILITAIRES ────────────────────────────────────────

  getTicketById(id: number): Ticket | undefined {
    return this.tickets.find(t => t.id === id);
  }

  formatTicketId(id: number): string {
    return '#TKT-' + String(id).padStart(4, '0');
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }
}