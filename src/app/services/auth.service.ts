import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token:  string;
  email:  string;
  role:   string;
  id:     number;   // ← AJOUTÉ
  nom:    string;   // ← AJOUTÉ
  prenom: string;   // ← AJOUTÉ
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

  private apiUrl = 'http://localhost:8080/api/users';

  constructor(private http: HttpClient) {}

  // ─────────────────────────────────────────────
  // LOGIN AVEC JWT
  // ─────────────────────────────────────────────
  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${this.apiUrl}/login`,
      data
    ).pipe(
      tap((response) => {
        localStorage.setItem('token',  response.token);
        localStorage.setItem('email',  response.email);
        localStorage.setItem('role',   response.role);
        localStorage.setItem('userId', String(response.id));    // ← AJOUTÉ
        localStorage.setItem('nom',    response.nom);           // ← AJOUTÉ
        localStorage.setItem('prenom', response.prenom);        // ← AJOUTÉ

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

  // ─────────────────────────────────────────────
  // LOGOUT
  // ─────────────────────────────────────────────
logout(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('email');
  localStorage.removeItem('role');
  localStorage.removeItem('userId');
  localStorage.removeItem('nom');
  localStorage.removeItem('prenom');
  localStorage.removeItem('avatarUrl'); // ← ADD THIS
}

  // ─────────────────────────────────────────────
  // GET CURRENT USER
  // ─────────────────────────────────────────────
  getCurrentUser(): string | null {
    return localStorage.getItem('email');
  }

  // ─────────────────────────────────────────────
  // GET ROLE
  // ─────────────────────────────────────────────
  getRole(): string | null {
    return localStorage.getItem('role');
  }

  // ─────────────────────────────────────────────
  // GET TOKEN
  // ─────────────────────────────────────────────
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // ─────────────────────────────────────────────
  // CHECK LOGIN
  // ─────────────────────────────────────────────
  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  // ─────────────────────────────────────────────
  // REGISTER / DEMANDE DE COMPTE
  // ─────────────────────────────────────────────
  register(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/demande`, data);
  }

  demanderCompte(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/demande`, data);
  }

  // ─────────────────────────────────────────────
  // ADMIN : ACCEPTER COMPTE
  // ─────────────────────────────────────────────
  accepterCompte(id: number, password: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/accepter`, { password });
  }

  // ─────────────────────────────────────────────
  // ADMIN : REFUSER COMPTE
  // ─────────────────────────────────────────────
  refuserCompte(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/refuser`, {});
  }

  // ─────────────────────────────────────────────
  // ADMIN : DEMANDES EN ATTENTE
  // ─────────────────────────────────────────────
  getDemandesEnAttente(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/demandes/en-attente`);
  }
}