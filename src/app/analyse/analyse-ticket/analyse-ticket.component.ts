import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { TicketService } from '../../services/ticket.service';
import { Ticket } from '../../models/ticket';
import { SousTicket, Tache } from '../../models/sous-ticket';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-analyse-ticket',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analyse-ticket.component.html',
  styleUrls: ['./analyse-ticket.component.css']
})
export class AnalyseTicketComponent implements OnInit, OnDestroy {
  ticket: Ticket | null = null;
  isLoading = true;
  errorMessage = '';
  progressionBackend = 0;
  ticketFerme = false;
  private refreshSub?: Subscription;
  private ticketId = 0;
  private apiUrl = 'http://localhost:8080/api';

  private get headers(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`
    });
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ticketService: TicketService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.ticketId = +id;
      this.loadTicket(this.ticketId);
      this.loadProgression(this.ticketId);
      this.refreshSub = interval(30000).subscribe(() => {
        this.loadTicket(this.ticketId);
        this.loadProgression(this.ticketId);
      });
    } else {
      this.router.navigate(['/analyse-dashboard']);
    }
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  loadTicket(id: number): void {
    this.ticketService.getTicketById(id).subscribe({
      next: (ticket) => {
        this.ticket = ticket;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = 'Impossible de charger le ticket.';
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  loadProgression(id: number): void {
    this.http.get<any>(
      `${this.apiUrl}/taches/progression/ticket/${id}`,
      { headers: this.headers }
    ).subscribe({
      next: (data) => {
        this.progressionBackend = data.progression ?? 0;
        this.ticketFerme = data.ferme ?? false;
      },
      error: (err) => console.error('Erreur progression', err)
    });
  }

  refreshNow(): void {
    this.loadTicket(this.ticketId);
    this.loadProgression(this.ticketId);
  }

  getProgress(): number {
    return this.progressionBackend;
  }

  getCircleDashoffset(): number {
    const circumference = 2 * Math.PI * 45;
    return circumference - (this.progressionBackend / 100) * circumference;
  }

  getProgressColor(): string {
    if (this.progressionBackend >= 100) return '#22c55e';
    if (this.progressionBackend >= 50)  return '#4f8ef7';
    if (this.progressionBackend >= 25)  return '#f59e0b';
    return '#ef4444';
  }

  getTachesTotal(st: SousTicket): number {
    return st.taches?.length ?? 0;
  }

  getTachesDone(st: SousTicket): number {
    return st.taches?.filter((t: Tache) => t.statut === 'Fait').length ?? 0;
  }

  getSousTicketProgress(st: SousTicket): number {
    const total = this.getTachesTotal(st);
    if (total === 0) return 0;
    return Math.round((this.getTachesDone(st) / total) * 100);
  }

  getTotalTaches(): number {
    return this.ticket?.sousTickets?.reduce(
      (sum, st) => sum + (st.taches?.length ?? 0), 0
    ) ?? 0;
  }

  getTotalDone(): number {
    return this.ticket?.sousTickets?.reduce(
      (sum, st) => sum + (st.taches?.filter(t => t.statut === 'Fait').length ?? 0), 0
    ) ?? 0;
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

  retour(): void {
    this.router.navigate(['/analyse-dashboard']);
  }
}