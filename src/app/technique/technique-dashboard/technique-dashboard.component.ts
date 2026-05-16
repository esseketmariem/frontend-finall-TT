import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface Tache {
  id: number;
  titre: string;
  description: string;
  statut: string;
  priorite: string;
  dateCreation: string;
  dateLimite: string | null;
  sousTicketId: number;
  sousTicketTitre: string;
  ticketId: number;
  assigneeId: number;
  assigneeNom: string;
  assigneePrenom: string;
}

@Component({
  selector: 'app-technique-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './technique-dashboard.component.html',
  styleUrls: ['./technique-dashboard.component.css']
})
export class TechniqueDashboardComponent implements OnInit {

  taches: Tache[] = [];
  isLoading = false;
  errorMessage = '';
  view = 'taches';
  problemeText = '';
  problemeReponse = '';
  selectedTache: Tache | null = null;
  sendingProbleme = false;

  private apiUrl = 'http://localhost:8080/api';

  get employeId(): number {
    return parseInt(localStorage.getItem('userId') || '0');
  }

  get nomEmploye(): string {
    return localStorage.getItem('nom') || 'Employé';
  }

  get initiales(): string {
    const nom = localStorage.getItem('nom') || '';
    const prenom = localStorage.getItem('prenom') || '';
    return (prenom[0] || '') + (nom[0] || '');
  }

  private get headers(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`
    });
  }

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadMesTaches();
  }

  loadMesTaches(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.http.get<Tache[]>(
      `${this.apiUrl}/taches/mes-taches/${this.employeId}`,
      { headers: this.headers }
    ).subscribe({
      next: (data) => {
        this.taches = data;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Erreur lors du chargement des tâches.';
        this.isLoading = false;
      }
    });
  }

  terminerTache(tache: Tache): void {
    this.http.put<Tache>(
      `${this.apiUrl}/taches/${tache.id}/terminer/${this.employeId}`,
      {},
      { headers: this.headers }
    ).subscribe({
      next: (updated) => {
        const idx = this.taches.findIndex(t => t.id === tache.id);
        if (idx !== -1) this.taches[idx] = updated;
      },
      error: () => {
        this.errorMessage = 'Erreur lors de la mise à jour de la tâche.';
      }
    });
  }

  ouvrirProbleme(tache: Tache): void {
    this.selectedTache = tache;
    this.problemeText = '';
    this.problemeReponse = '';
    this.view = 'probleme';
  }

  envoyerProbleme(): void {
    if (!this.selectedTache || !this.problemeText.trim()) return;
    this.sendingProbleme = true;
    this.http.post<{ reponse: string }>(
      `${this.apiUrl}/taches/${this.selectedTache.id}/probleme?probleme=${encodeURIComponent(this.problemeText)}`,
      {},
      { headers: this.headers }
    ).subscribe({
      next: (res) => {
        this.problemeReponse = res.reponse;
        this.sendingProbleme = false;
      },
      error: () => {
        this.problemeReponse = "Erreur lors de la communication avec l'IA.";
        this.sendingProbleme = false;
      }
    });
  }

  getPrioriteClass(p: string): string {
    switch (p?.toUpperCase()) {
      case 'HAUTE':    return 'prio-haute';
      case 'MOYENNE':  return 'prio-moyenne';
      case 'BASSE':    return 'prio-basse';
      case 'CRITIQUE': return 'prio-critique';
      default:         return 'prio-moyenne';
    }
  }

  getStatutClass(s: string): string {
    switch (s) {
      case 'Fait':     return 'statut-fait';
      case 'En_cours': return 'statut-encours';
      default:         return 'statut-afaire';
    }
  }

  get tachesFaites(): number {
    return this.taches.filter(t => t.statut === 'Fait').length;
  }

  get tachesEnCours(): number {
    return this.taches.filter(t => t.statut === 'En_cours').length;
  }

  get tachesAFaire(): number {
    return this.taches.filter(t => t.statut === 'A_faire').length;
  }
}