// tache.service.ts - ajoutez ces méthodes
@Injectable({ providedIn: 'root' })
export class TacheService {
  private api = 'http://localhost:8080/api/taches';

  constructor(private http: HttpClient) {}

  getMesTaches(employeId: number): Observable<TacheResponse[]> {
    return this.http.get<TacheResponse[]>(`${this.api}/mes-taches/${employeId}`);
  }

  terminerTache(tacheId: number, employeId: number): Observable<TacheResponse> {
    return this.http.put<TacheResponse>(`${this.api}/${tacheId}/terminer/${employeId}`, {});
  }

  envoyerProbleme(tacheId: number, probleme: string): Observable<{reponse: string}> {
    return this.http.post<{reponse: string}>(
      `${this.api}/${tacheId}/probleme?probleme=${encodeURIComponent(probleme)}`, {}
    );
  }

  getProgression(ticketId: number): Observable<ProgressionResponse> {
    return this.http.get<ProgressionResponse>(`${this.api}/progression/ticket/${ticketId}`);
  }
}

export interface TacheResponse {
  id: number;
  titre: string;
  description: string;
  statut: 'A_faire' | 'En_cours' | 'Fait';
  priorite: 'HAUTE' | 'MOYENNE' | 'BASSE';
  dateCreation: string;
  dateLimite: string;
  sousTicketId: number;
  sousTicketTitre: string;
  ticketId: number;
  assigneeId: number;
  assigneeNom: string;
  assigneePrenom: string;
}

export interface ProgressionResponse {
  ticketId: number;
  totalTaches: number;
  tachesFaites: number;
  progression: number;
  progressionPct: string;
  ferme: boolean;
}