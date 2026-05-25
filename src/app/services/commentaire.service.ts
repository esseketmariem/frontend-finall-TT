import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CommentaireService {

  private commentUrl = 'http://localhost:8070/api/commentaires';

  constructor(private http: HttpClient) {}

  // ✅ GET — /api/commentaires/ticket/{ticketId}
  getByTicket(ticketId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.commentUrl}/ticket/${ticketId}`);
  }

  // ✅ GET ALL — /api/commentaires
  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.commentUrl);
  }

  // ✅ POST — /api/commentaires/{ticketId}  → retourne la liste à jour
  addComment(ticketId: number, body: { commentaire: string; userId: number }): Observable<any[]> {
    return this.http.post<any[]>(`${this.commentUrl}/${ticketId}`, body);
  }

  // ✅ DELETE — /api/commentaires/{id}
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.commentUrl}/${id}`);
  }

  // ✅ PUT — /api/commentaires/{id}
  update(id: number, body: { commentaire: string }): Observable<any> {
    return this.http.put<any>(`${this.commentUrl}/${id}`, body);
  }
}