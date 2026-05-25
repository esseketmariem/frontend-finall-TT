import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { TicketService } from '../../services/ticket.service';
import { Ticket } from '../../models/ticket';
import { SousTicket } from '../../models/sous-ticket';
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
  sousTickets: SousTicket[] = [];
  syntheseIA: string = '';
  isLoading = true;
  isLoadingSousTickets = false;
  errorMessage = '';

  analyseEnCours = false;
  ticketFerme = false;

  private refreshSub?: Subscription;
  private ticketId = 0;
  private sousTicketsLoaded = false;
  private apiUrl = 'http://localhost:8070/api';

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
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.ticketId = +id;
      this.loadTicket(this.ticketId);

      this.refreshSub = interval(5000).subscribe(() => {
        if (!this.sousTicketsLoaded) {
          this.loadTicket(this.ticketId);
        }
      });
    } else {
      this.router.navigate(['/analyse-dashboard']);
    }
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  // ── Load ticket de base ───────────────────────
  loadTicket(id: number): void {
    this.ticketService.getTicketById(id).subscribe({
      next: (ticket) => {
        this.ticket = ticket;
        this.isLoading = false;

        if (!this.sousTicketsLoaded) {
          this.loadAnalyse(id);
        }
      },
      error: (err) => {
        this.errorMessage = 'Impossible de charger le ticket.';
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  // ── Load analyse IA + sous-tickets ────────────
  loadAnalyse(ticketId: number): void {
    if (this.isLoadingSousTickets || this.sousTicketsLoaded) return;

    this.isLoadingSousTickets = true;
    this.errorMessage = '';

    this.http.get<any>(
      `${this.apiUrl}/ba/analyser/${ticketId}`,
      { headers: this.headers }
    ).subscribe({
      next: (analyse) => {
        // ── Synthèse IA ──
        this.syntheseIA = analyse.syntheseIA ?? '';

        // ── Sous-tickets ──
        this.sousTickets = (analyse.sousTickets || []).map((st: any) => ({
          id:              st.id,
          titre:           st.titre,
          resumeTechnique: st.resumeTechnique,
          prioriteEstimee: st.prioriteEstimee,
          systeme:         st.systeme,
          taches:          []
        }));

        this.sousTicketsLoaded = true;
        this.isLoadingSousTickets = false;
        this.analyseEnCours = false;
      },
      error: (err: HttpErrorResponse) => {
        this.isLoadingSousTickets = false;

        if (err.status === 400 || err.status === 0) {
          this.analyseEnCours = true;
          this.errorMessage = '';
        } else {
          this.analyseEnCours = false;
          this.errorMessage = 'Erreur lors du chargement de l\'analyse.';
          console.error('Erreur chargement analyse', err);
        }
      }
    });
  }

  // ── Manual refresh ────────────────────────────
  refreshNow(): void {
    this.sousTicketsLoaded = false;
    this.isLoadingSousTickets = false;
    this.analyseEnCours = false;
    this.errorMessage = '';
    this.syntheseIA = '';
    this.sousTickets = [];
    this.loadTicket(this.ticketId);
  }

  // ── Helpers priorité ──────────────────────────
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