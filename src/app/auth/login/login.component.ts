import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService, LoginResponse } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  email:        string  = '';
  password:     string  = '';
  errorMessage: string  = '';
  isLoading:    boolean = false;
  isDark:       boolean = false;
  showPassword: boolean = false;

  constructor(
    private authService: AuthService,
    private router:      Router
  ) {}

  toggleTheme(): void {
    this.isDark = !this.isDark;
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  login(): void {
    if (!this.email.trim() || !this.password.trim()) {
      this.errorMessage = 'Veuillez remplir tous les champs.';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email.trim())) {
      this.errorMessage = "Format d'email invalide.";
      return;
    }

    this.errorMessage = '';
    this.isLoading    = true;

    this.authService.login({
      email:    this.email.trim(),
      password: this.password
    }).subscribe({
      next: (response: LoginResponse) => {
        this.isLoading = false;
        console.log('✅ Connecté :', response.email, '| Rôle :', response.role);
        this.redirectByRole(response.role);
      },
      error: (err: any) => {
        this.isLoading = false;
        console.error('❌ Erreur login — status:', err.status);

        if (err.status === 0) {
          this.errorMessage =
            'Serveur inaccessible. ' +
            'Vérifiez que Spring Boot tourne sur le port 8070.';
        } else if (err.status === 400) {
          const msg = err.error?.message ?? '';
          if (
            msg.toLowerCase().includes('activé') ||
            msg.toLowerCase().includes('refusé')
          ) {
            this.errorMessage =
              'Compte non activé ou refusé. ' +
              'Contactez votre administrateur.';
          } else {
            this.errorMessage = msg || 'Email ou mot de passe incorrect.';
          }
        } else if (err.status === 401 || err.status === 403) {
          this.errorMessage = 'Accès refusé. Vérifiez vos identifiants.';
        } else if (err.status === 404) {
          this.errorMessage =
            'Endpoint introuvable — vérifiez la configuration backend.';
        } else {
          this.errorMessage =
            err.error?.message || `Erreur serveur (${err.status}).`;
        }
      }
    });
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !this.isLoading) {
      this.login();
    }
  }

  private redirectByRole(role: string): void {
    const routeMap: Record<string, string> = {
      ADMIN:            '/admin-dashboard',
      BUSINESS_ANALYST: '/analyse-dashboard',
      TECHNICIEN:       '/technique-dashboard',
      TECHNIQUE:        '/technique-dashboard',
      METIER:           '/metier-dashboard'
    };

    const target = routeMap[role] ?? '/login';
    console.log('→ Redirection vers:', target);
    this.router.navigate([target]);
  }
}