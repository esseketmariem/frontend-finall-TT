import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TicketService } from '../services/ticket.service';
import { Ticket } from '../models/ticket';

@Component({
  selector: 'app-ticket-create',
  templateUrl: './add-Ticket.Component.html',
  styleUrls: ['./add-Ticket.Component.css']
})
export class TicketCreateComponent implements OnInit {

  ticket: Partial<Ticket> = {
    titre: '',
    description: '',
    priorite: 'MOYENNE',
    statut: 'A_faire'
  };

  userId: number | null = null;
  submitting = false;
  error: string | null = null;

  constructor(
    private ticketService: TicketService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Récupérer l'userId depuis localStorage si disponible
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      this.userId = user.id;
    }
  }

  onSubmit(): void {
    if (!this.ticket.titre || !this.ticket.description) {
      this.error = 'Veuillez remplir tous les champs obligatoires';
      return;
    }

    this.submitting = true;
    this.error = null;

    // ✅ Ajouter l'userId si disponible
    const ticketData = {
      ...this.ticket,
      userId: this.userId
    };

    this.ticketService.createTicket(ticketData).subscribe({
      next: (created) => {
        console.log('✅ Ticket créé avec succès:', created);
        this.submitting = false;
        
        // ✅ Rediriger vers la liste
        // La liste se mettra à jour automatiquement grâce à l'Observable
        this.router.navigate(['/tickets']);
      },
      error: (err) => {
        console.error('❌ Erreur création:', err);
        this.error = 'Erreur lors de la création du ticket';
        this.submitting = false;
      }
    });
  }
}