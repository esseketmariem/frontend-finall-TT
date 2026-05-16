import { Component, ViewEncapsulation } from '@angular/core';
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
  encapsulation: ViewEncapsulation.None
})
export class LoginComponent {
  email:        string = '';
  password:     string = '';
  errorMessage: string = '';
  isDark:       boolean = false;
  totalTickets: number = 0;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  login(): void {
    this.errorMessage = '';
    this.authService.login({
      email:    this.email,
      password: this.password
    }).subscribe({
      next: (response: LoginResponse) => {
        console.log('==============================');
        console.log('Utilisateur connecté :', response.email);
        console.log('Role :', response.role);
        console.log('JWT Token :', response.token);
        console.log('==============================');

        if (response.role === 'ADMIN') {
          this.router.navigate(['/admin-dashboard']);
        } else if (response.role === 'BUSINESS_ANALYST') {
          this.router.navigate(['/analyse-dashboard']);
        } else if (response.role === 'METIER') {
          this.router.navigate(['/metier']);
        } else if (response.role === 'TECHNIQUE') {
          this.router.navigate(['/technique']);
        } else {
          this.router.navigate(['/login']);
        }
      },
      error: (err) => {
        console.error('Erreur login :', err);
        console.error('Message backend :', JSON.stringify(err.error));
        this.errorMessage = 'Email ou mot de passe incorrect';
      }
    });
  }
}