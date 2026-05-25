import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token:  string;
  email:  string;
  role:   string;
  id:     number;
  nom:    string;
  prenom: string;
}

export interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://localhost:8070/api/users';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${this.apiUrl}/login`,
      data
    ).pipe(
      tap((response) => {
        localStorage.setItem('token',  response.token);
        localStorage.setItem('email',  response.email);
        localStorage.setItem('role',   response.role);
        localStorage.setItem('userId', String(response.id));
        localStorage.setItem('nom',    response.nom);
        localStorage.setItem('prenom', response.prenom);

        // ✅ Save currentUser object — required by MetierDashboard, ChatComponent, etc.
        localStorage.setItem('currentUser', JSON.stringify({
          id:     response.id,
          nom:    response.nom,
          prenom: response.prenom,
          email:  response.email,
          role:   response.role
        }));

        console.log('==============================');
        console.log('Utilisateur connecté :', response.email);
        console.log('Role :', response.role);
        console.log('UserId :', response.id);
        console.log('Nom :', response.nom, response.prenom);
        console.log('JWT Token :', response.token);
        console.log('==============================');
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    localStorage.removeItem('nom');
    localStorage.removeItem('prenom');
    localStorage.removeItem('avatarUrl');
    localStorage.removeItem('currentUser'); // ✅ also clear currentUser

    Object.keys(localStorage)
      .filter(k => k.startsWith('analyse_ticket_'))
      .forEach(k => localStorage.removeItem(k));

    this.router.navigate(['/login']);
  }

  getCurrentUser(): string | null {
    return localStorage.getItem('email');
  }

  getRole(): string | null {
    return localStorage.getItem('role');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  register(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/demande`, data);
  }

  demanderCompte(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/demande`, data);
  }

  accepterCompte(id: number, password: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/accepter`, { password });
  }

  refuserCompte(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/refuser`, {});
  }

  getDemandesEnAttente(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/demandes/en-attente`);
  }
}