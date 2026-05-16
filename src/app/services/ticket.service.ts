import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Ticket } from '../models/ticket';
import { SousTicket, Tache } from '../models/sous-ticket';

@Injectable({
  providedIn: 'root'
})
export class TicketService {

  private apiUrl = 'http://localhost:8080/api/tickets';

  constructor(private http: HttpClient) {}

  // Méthode privée pour obtenir les headers avec token
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getAllTickets(): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(this.apiUrl, { 
      headers: this.getAuthHeaders() 
    });
  }

  getTodoTickets(): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.apiUrl}/todo`, { 
      headers: this.getAuthHeaders() 
    });
  }

  getById(id: number): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.apiUrl}/${id}`, { 
      headers: this.getAuthHeaders() 
    });
  }

  getTicketById(id: number): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.apiUrl}/${id}`, { 
      headers: this.getAuthHeaders() 
    });
  }

  createTicket(ticket: Partial<Ticket>): Observable<Ticket> {
    return this.http.post<Ticket>(this.apiUrl, ticket, { 
      headers: this.getAuthHeaders() 
    });
  }

  updateTicket(id: number, ticket: Partial<Ticket>): Observable<Ticket> {
    return this.http.put<Ticket>(`${this.apiUrl}/${id}`, ticket, { 
      headers: this.getAuthHeaders() 
    });
  }

  deleteTicket(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { 
      headers: this.getAuthHeaders() 
    });
  }

  approveTicket(id: number): Observable<Ticket> {
    return this.http.put<Ticket>(`${this.apiUrl}/${id}/approve`, {}, { 
      headers: this.getAuthHeaders() 
    });
  }

  rejectTicket(id: number): Observable<Ticket> {
    return this.http.put<Ticket>(`${this.apiUrl}/${id}/reject`, {}, { 
      headers: this.getAuthHeaders() 
    });
  }

  analyzeTicket(ticketId: number): Observable<Ticket> {
    return this.http.post<Ticket>(`${this.apiUrl}/${ticketId}/analyze`, {}, { 
      headers: this.getAuthHeaders() 
    });
  }

  getTicketProgress(ticket: Ticket): number {
    if (!ticket.sousTickets || ticket.sousTickets.length === 0) {
      return 0;
    }

    const totalTaches = ticket.sousTickets.reduce((sum: number, st: SousTicket) =>
      sum + (st.taches?.length ?? 0), 0
    );

    if (totalTaches === 0) return 0;

    const completedTaches = ticket.sousTickets.reduce((sum: number, st: SousTicket) =>
      sum + (st.taches?.filter((t: Tache) => t.statut === 'Fait').length ?? 0), 0
    );

    return Math.round((completedTaches / totalTaches) * 100);
  }
}