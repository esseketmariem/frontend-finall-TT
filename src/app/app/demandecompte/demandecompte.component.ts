import { Component, ViewEncapsulation } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-demandecompte',
  imports: [NgIf, FormsModule, RouterModule],
  templateUrl: './demandecompte.component.html',
  styleUrl: './demandecompte.component.css',
  encapsulation: ViewEncapsulation.None
})
export class DemandecompteComponent {
  nom: string = '';
  prenom: string = '';
  email: string = '';
  role: string = 'METIER';
  successMessage: string = '';
  errorMessage: string = '';
  isDark: boolean = false;

  constructor(private authService: AuthService, private router: Router) {}

  goToLogin() {
    this.router.navigate(['/login']);
  }

  register() {
    // Validation basique
    if (!this.nom || !this.prenom || !this.email) {
      this.errorMessage = 'Veuillez remplir tous les champs.';
      return;
    }

    const demande = {
      nom: this.nom,
      prenom: this.prenom,
      email: this.email,
      role: this.role
      // pas de password : c'est l'admin qui le définit
    };

    this.authService.demanderCompte(demande).subscribe({
      next: () => {
        this.successMessage =
          '✅ Votre demande a été envoyée. Ladministrateur vous contactera par email.';
        this.errorMessage = '';
        setTimeout(() => this.router.navigate(['/login']), 3000);
      },
      error: (err) => {
        this.errorMessage =
          err?.error?.message || '❌ Erreur lors de l\'envoi de la demande.';
        this.successMessage = '';
      }
    });
  }
}