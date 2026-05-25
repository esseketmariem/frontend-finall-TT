import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export enum Role {
  ADMIN = 'ADMIN',
  METIER = 'METIER',
  BUSINESS_ANALYST = 'BUSINESS_ANALYST'
}

export interface User {
  id?: number;
  nom: string;
  prenom: string;
  email: string;
  password?: string;
  role: Role;
  statut?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private apiUrl = 'http://localhost:8070/api/users';

  constructor(private http: HttpClient) {}

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }

  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  createUser(user: User): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/demande`, user); // ← fix
  }

  updateUser(id: number, user: User): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, user);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getDemandesEnAttente(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/demandes/en-attente`);
  }

  accepterCompte(id: number, password: string): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}/accepter`, { password });
  }

  refuserCompte(id: number): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}/refuser`, {});
  }

  demanderCompte(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/demande`, data);
  }
}