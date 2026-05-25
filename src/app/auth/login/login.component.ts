import { Component, OnInit } from '@angular/core';
import { AuthService, LoginResponse } from '../../services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, NgIf, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  email:        string = '';
  password:     string = '';
  errorMessage: string = '';
  isDark:       boolean = false;
  totalTickets: number = 0;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      const role = this.authService.getRole();
      if (role === 'ADMIN')                this.router.navigate(['/admin-dashboard']);
      else if (role === 'BUSINESS_ANALYST') this.router.navigate(['/analyse-dashboard']);
      else if (role === 'METIER')           this.router.navigate(['/metier']);
      else if (role === 'TECHNIQUE')        this.router.navigate(['/technique']);
    }
  }

  login(): void {
    this.errorMessage = '';

    if (!this.email || !this.password) {
      this.errorMessage = 'Veuillez renseigner votre email et mot de passe.';
      return;
    }

    this.authService.login({
      email:    this.email,
      password: this.password
    }).subscribe({
      next: (response: LoginResponse) => {
        const role = response.role;
        if (role === 'ADMIN') {
          this.router.navigate(['/admin-dashboard']);
        } else if (role === 'BUSINESS_ANALYST') {
          this.router.navigate(['/analyse-dashboard']);
        } else if (role === 'METIER') {
          this.router.navigate(['/metier']);
        } else if (role === 'TECHNIQUE') {
          this.router.navigate(['/technique']);
        } else {
          this.router.navigate(['/login']);
        }
      },
      error: (err) => {
        console.error('Erreur login :', err);
        if (err.status === 0) {
          this.errorMessage = 'Serveur inaccessible — vérifiez que le backend est démarré.';
        } else if (err.status === 400) {
          // Message exact du backend (Email introuvable, Mot de passe incorrect, etc.)
          this.errorMessage = err.error?.error || 'Email ou mot de passe incorrect.';
        } else if (err.status === 403) {
          this.errorMessage = 'Accès refusé. Contactez votre administrateur.';
        } else if (err.status === 401) {
          this.errorMessage = 'Session expirée. Veuillez vous reconnecter.';
        } else {
          this.errorMessage = 'Une erreur est survenue. Réessayez.';
        }
      }
    });
  }
}