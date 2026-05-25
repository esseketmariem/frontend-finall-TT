import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Ticket } from '../models/ticket';
import { SousTicket, Tache } from '../models/sous-ticket';

@Injectable({
  providedIn: 'root'
})
export class TicketService {

  private apiUrl = 'http://localhost:8070/api/tickets';

  private ticketCreatedSubject = new Subject<Ticket>();
  public ticketCreated$ = this.ticketCreatedSubject.asObservable();

  // ← AJOUTER
  private ticketUpdatedSubject = new Subject<void>();
  public ticketUpdated$ = this.ticketUpdatedSubject.asObservable();

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    console.log('🔑 Token:', token ? token.substring(0, 40) + '...' : '❌ NULL');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getMesTickets(): Observable<Ticket[]> {
    const stored = localStorage.getItem('currentUser');
    const user   = stored ? JSON.parse(stored) : null;
    const url    = `${this.apiUrl}/user/${user?.id}`;

    console.log('📡 getMesTickets → URL:', url);
    console.log('👤 userId:', user?.id);

    if (!user?.id) {
      console.error('❌ userId manquant');
      return throwError(() => new Error('userId manquant'));
    }

    return this.http.get<Ticket[]>(url, { headers: this.getAuthHeaders() }).pipe(
      tap(data  => console.log('✅ getMesTickets OK:', data.length, 'tickets', data)),
      catchError(err => {
        console.error('❌ getMesTickets HTTP error:');
        console.error('   status :', err.status);
        console.error('   message:', err.message);
        console.error('   body   :', err.error);
        return throwError(() => err);
      })
    );
  }

  getAllTickets(): Observable<Ticket[]> {
    console.log('📡 getAllTickets → URL:', this.apiUrl);
    return this.http.get<Ticket[]>(this.apiUrl, { headers: this.getAuthHeaders() }).pipe(
      tap(data  => console.log('✅ getAllTickets OK:', data.length, 'tickets')),
      catchError(err => {
        console.error('❌ getAllTickets HTTP error:', err.status, err.error);
        return throwError(() => err);
      })
    );
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
    }).pipe(
      tap(newTicket => this.ticketCreatedSubject.next(newTicket))
    );
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
    }).pipe(
      tap(() => this.ticketUpdatedSubject.next())  // ← notifier la liste
    );
  }

  rejectTicket(id: number): Observable<Ticket> {
    return this.http.put<Ticket>(`${this.apiUrl}/${id}/reject`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(() => this.ticketUpdatedSubject.next())  // ← notifier la liste
    );
  }

  // ── START ANALYSIS ─────────────────────────────────────────────────────────
  startAnalysis(id: number): Observable<Ticket> {
    return this.http.put<Ticket>(`${this.apiUrl}/${id}/start-analysis`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(() => {
        console.log(`✅ startAnalysis OK - ticket #${id} → IN_ANALYSIS`);
        this.ticketUpdatedSubject.next();  // ← notifier listeticket
      }),
      catchError(err => {
        console.error(`❌ startAnalysis error:`, err.error);
        return throwError(() => err);
      })
    );
  }

  // ── COMPLETE ANALYSIS ──────────────────────────────────────────────────────
  completeAnalysis(id: number): Observable<Ticket> {
    return this.http.put<Ticket>(`${this.apiUrl}/${id}/complete-analysis`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(() => {
        console.log(`✅ completeAnalysis OK - ticket #${id} → ANALYZED`);
        this.ticketUpdatedSubject.next();  // ← notifier listeticket
      }),
      catchError(err => {
        console.error(`❌ completeAnalysis error:`, err.error);
        return throwError(() => err);
      })
    );
  }

  analyzeTicket(ticketId: number, systemesImpactes: string[] = [], commentaireBA: string = ''): Observable<any> {
    return this.http.post<any>(
      'http://localhost:8070/api/ba/analyser',
      { ticketId, systemesImpactes, commentaireBA },
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(() => this.ticketUpdatedSubject.next())  // ← notifier après analyse IA aussi
    );
  }

  getTicketProgress(ticket: Ticket): number {
    if (!ticket.sousTickets || ticket.sousTickets.length === 0) return 0;
    const totalTaches = ticket.sousTickets.reduce(
      (sum: number, st: SousTicket) => sum + (st.taches?.length ?? 0), 0
    );
    if (totalTaches === 0) return 0;
    const completedTaches = ticket.sousTickets.reduce(
      (sum: number, st: SousTicket) =>
        sum + (st.taches?.filter((t: Tache) => t.statut === 'Fait').length ?? 0), 0
    );
    return Math.round((completedTaches / totalTaches) * 100);
  }
}