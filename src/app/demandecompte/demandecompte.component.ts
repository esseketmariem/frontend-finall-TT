import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-demandecompte',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './demandecompte.component.html',
  styleUrls: ['./demandecompte.component.css']
})
export class DemandecompteComponent {

  // ── UI state ──────────────────────────────────────────────────
  showPassword:   boolean = false;
  isLoading:      boolean = false;
  errorMessage:   string  = '';
  successMessage: string  = '';

  // ── Form model ────────────────────────────────────────────────
  formData = {
    nom:        '',
    prenom:     '',
    email:      '',
    telephone:  '',
    role:       '',       // METIER | BUSINESS_ANALYST
    motDePasse: ''
  };

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  // ── Submit ────────────────────────────────────────────────────
  onSubmit(): void {
    this.isLoading      = true;
    this.errorMessage   = '';
    this.successMessage = '';

    this.authService.demanderCompte(this.formData).subscribe({
      next: () => {
        this.isLoading      = false;
        this.successMessage = 'Votre demande a été envoyée avec succès. Un administrateur va traiter votre demande.';
        this.resetForm();
      },
      error: (err: any) => {
        this.isLoading    = false;
        this.errorMessage = err?.error?.message
          || err?.message
          || 'Une erreur est survenue. Veuillez réessayer.';
      }
    });
  }

  // ── Reset ─────────────────────────────────────────────────────
  resetForm(): void {
    this.formData = {
      nom:        '',
      prenom:     '',
      email:      '',
      telephone:  '',
      role:       '',
      motDePasse: ''
    };
  }

  // ── Navigation ────────────────────────────────────────────────
  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}