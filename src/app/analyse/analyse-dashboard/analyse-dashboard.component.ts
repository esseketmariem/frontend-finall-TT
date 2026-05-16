import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { TicketService } from '../../services/ticket.service';
import { Ticket } from '../../models/ticket';
import { AnalyseCountPipe } from '../pipes/analyse-count.pipe';

interface SousTicketSimple {
  id: number;
  titre: string;
  equipeResponsable: string;
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
  imports: [CommonModule, AnalyseCountPipe],
  templateUrl: './analyse-dashboard.component.html',
  styleUrls: ['./analyse-dashboard.component.css']
})
export class AnalyseDashboardComponent implements OnInit {

  tickets: Ticket[] = [];
  isLoading = false;
  errorMessage = '';
  analyzingId: number | null = null;

  // Task generation
  generatingTachesId: number | null = null;
  sousTicketsMap: { [ticketId: number]: SousTicketSimple[] } = {};
  tachesMap: { [sousTicketId: number]: TacheResponse[] } = {};
  expandedTicketId: number | null = null;

  private apiUrl = 'http://localhost:8080/api';

  private get headers(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`
    });
  }

  constructor(
    private ticketService: TicketService,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAcceptedTickets();
  }

  loadAcceptedTickets(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.ticketService.getAllTickets().subscribe({
      next: (data) => {
        this.tickets = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur chargement tickets', err);
        this.errorMessage = 'Erreur lors du chargement des tickets';
        this.isLoading = false;
      }
    });
  }

  lancerAnalyse(ticket: Ticket): void {
    if (!ticket.id) return;

    this.analyzingId = ticket.id;

    this.ticketService.analyzeTicket(ticket.id).subscribe({
      next: (updated: Ticket) => {

        const index = this.tickets.findIndex(
          t => t.id === updated.id
        );

        if (index !== -1) {
          this.tickets[index] = {
            ...updated,
            analyseIAEffectuee: true
          };
        }

        this.analyzingId = null;
      },

      error: (err) => {
        console.error('Erreur lors de l’analyse', err);
        this.errorMessage = 'Erreur lors de l’analyse du ticket';
        this.analyzingId = null;
      }
    });
  }

  voirAnalyse(ticket: Ticket): void {
    if (ticket.id) {
      this.router.navigate(['/analyse/ticket', ticket.id]);
    }
  }

  // ─────────────────────────────────────────────
  // Voir sous-tickets
  // ─────────────────────────────────────────────
  voirSousTickets(ticket: Ticket): void {

    if (!ticket.id) return;

    // Toggle open/close
    if (this.expandedTicketId === ticket.id) {
      this.expandedTicketId = null;
      return;
    }

    this.expandedTicketId = ticket.id;

    // Charger sous-tickets + tâches existantes
    this.chargerSousTicketsAvecTaches(ticket.id);
  }

  // ─────────────────────────────────────────────
  // Charger sous-tickets + tâches depuis DB
  // ─────────────────────────────────────────────
  private chargerSousTicketsAvecTaches(
    ticketId: number
  ): void {

    // éviter rechargement inutile
    if (this.sousTicketsMap[ticketId]) {
      return;
    }

    this.http.get<SousTicketSimple[]>(
      `${this.apiUrl}/sous-tickets/ticket/${ticketId}`,
      { headers: this.headers }
    ).subscribe({

      next: (data) => {

        this.sousTicketsMap[ticketId] = data;

        // Charger tâches de chaque sous-ticket
        data.forEach((st) => {

          this.http.get<TacheResponse[]>(
            `${this.apiUrl}/taches/sous-ticket/${st.id}`,
            { headers: this.headers }
          ).subscribe({

            next: (taches) => {

              if (taches && taches.length > 0) {
                this.tachesMap[st.id] = taches;
              }

            },

            error: (err) => {
              console.error(
                `Erreur chargement tâches sous-ticket ${st.id}`,
                err
              );
            }

          });

        });

      },

      error: (err) => {
        console.error(
          'Erreur chargement sous-tickets',
          err
        );

        this.errorMessage =
          'Erreur lors du chargement des sous-tickets.';
      }

    });
  }

  // ─────────────────────────────────────────────
  // Générer tâches
  // ─────────────────────────────────────────────
  genererTaches(sousTicketId: number): void {

    this.generatingTachesId = sousTicketId;

    this.http.post<TacheResponse[]>(
      `${this.apiUrl}/taches/generer/${sousTicketId}`,
      {},
      { headers: this.headers }
    ).subscribe({

      next: (taches) => {

        this.tachesMap[sousTicketId] = taches;

        this.generatingTachesId = null;
      },

      error: (err) => {

        console.error(
          'Erreur génération tâches',
          err
        );

        this.errorMessage =
          'Erreur lors de la génération des tâches.';

        this.generatingTachesId = null;
      }

    });
  }

  getProgress(ticket: Ticket): number {
    return this.ticketService.getTicketProgress(ticket);
  }

  getPrioriteClass(
    priorite: string | undefined
  ): string {

    const p = priorite?.toUpperCase();

    if (p === 'HIGH' || p === 'HAUTE') {
      return 'prio prio-haute';
    }

    if (p === 'MEDIUM' || p === 'MOYENNE') {
      return 'prio prio-moyenne';
    }

    if (p === 'LOW' || p === 'BASSE') {
      return 'prio prio-basse';
    }

    return 'prio';
  }

  getPrioriteLabel(
    priorite: string | undefined
  ): string {

    const p = priorite?.toUpperCase();

    if (p === 'HIGH' || p === 'HAUTE') {
      return 'Haute';
    }

    if (p === 'MEDIUM' || p === 'MOYENNE') {
      return 'Moyenne';
    }

    if (p === 'LOW' || p === 'BASSE') {
      return 'Basse';
    }

    return priorite ?? '—';
  }
}