import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface SousTicket {
  id: number;
  titre: string;
  systeme: string;
  resumeTechnique: string;
  prioriteEstimee: string;
  ticketParentId: number;
}

interface TacheResponse {
  id: number;
  titre: string;
  statut: string;
  priorite: string;
  assigneeNom: string;
  assigneePrenom: string;
}

interface TicketAnalyseDetail {
  id: number;
  titre: string;
  description: string;
  statut: string;
  priorite: string;
  dateCreation: string;
  systemesDetectes: string[];
  systemesImpactes: string[];
  commentaireBA: string;
  aiSummary: string;
  analyseIAEffectuee: boolean;
  nombreSousTickets: number;
}

@Component({
  selector: 'app-ticket-analyse-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ticket-analyse-detail.component.html',
  styleUrls: ['./ticket-analyse-detail.component.css']
})
export class TicketAnalyseDetailComponent implements OnInit {

  ticketId!: number;
  ticket: TicketAnalyseDetail | null = null;
  sousTickets: SousTicket[] = [];
  tachesMap: { [sousTicketId: number]: TacheResponse[] } = {};
  expandedSousTicketId: number | null = null;

  isLoading = false;
  errorMessage = '';

  private apiUrl = 'http://localhost:8070/api';

  private get headers(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`
    });
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.ticketId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadTicketDetail();
    this.loadSousTickets();
  }

  loadTicketDetail(): void {
    this.isLoading = true;
    this.http.get<TicketAnalyseDetail>(
      `${this.apiUrl}/tickets/${this.ticketId}`,
      { headers: this.headers }
    ).subscribe({
      next: (data) => {
        this.ticket = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur chargement ticket', err);
        this.errorMessage = 'Impossible de charger les détails du ticket.';
        this.isLoading = false;
      }
    });
  }

  loadSousTickets(): void {
    this.http.get<SousTicket[]>(
      `${this.apiUrl}/sous-tickets/ticket/${this.ticketId}`,
      { headers: this.headers }
    ).subscribe({
      next: (data) => {
        this.sousTickets = data;
      },
      error: (err) => {
        console.error('Erreur chargement sous-tickets', err);
      }
    });
  }

  toggleSousTicket(st: SousTicket): void {
    if (this.expandedSousTicketId === st.id) {
      this.expandedSousTicketId = null;
      return;
    }
    this.expandedSousTicketId = st.id;
    this.loadTaches(st.id);
  }

  loadTaches(sousTicketId: number): void {
    if (this.tachesMap[sousTicketId]) return;

    this.http.get<TacheResponse[]>(
      `${this.apiUrl}/taches/sous-ticket/${sousTicketId}`,
      { headers: this.headers }
    ).subscribe({
      next: (taches) => {
        this.tachesMap[sousTicketId] = taches;
      },
      error: (err) => {
        console.error('Erreur chargement tâches', err);
        this.tachesMap[sousTicketId] = [];
      }
    });
  }

  retour(): void {
    this.router.navigate(['/analyse']);
  }

  getPrioriteClass(priorite: string | undefined): string {
    const p = priorite?.toUpperCase();
    if (p === 'HIGH'   || p === 'HAUTE')   return 'prio prio-haute';
    if (p === 'MEDIUM' || p === 'MOYENNE') return 'prio prio-moyenne';
    if (p === 'LOW'    || p === 'BASSE')   return 'prio prio-basse';
    return 'prio';
  }

  getPrioriteLabel(priorite: string | undefined): string {
    const p = priorite?.toUpperCase();
    if (p === 'HIGH'   || p === 'HAUTE')   return 'Haute';
    if (p === 'MEDIUM' || p === 'MOYENNE') return 'Moyenne';
    if (p === 'LOW'    || p === 'BASSE')   return 'Basse';
    return priorite ?? '—';
  }

  getStatutClass(statut: string | undefined): string {
    const s = statut?.toUpperCase();
    if (s === 'OUVERT'   || s === 'OPEN')        return 'statut statut-ouvert';
    if (s === 'EN_COURS' || s === 'IN_PROGRESS')  return 'statut statut-encours';
    if (s === 'FERMÉ'    || s === 'CLOSED')       return 'statut statut-ferme';
    return 'statut';
  }

  getPrioriteEstimeeClass(priorite: string | undefined): string {
    return this.getPrioriteClass(priorite);
  }

  getPrioriteEstimeeLabel(priorite: string | undefined): string {
    return this.getPrioriteLabel(priorite);
  }
  
}