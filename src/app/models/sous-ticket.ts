export interface Tache {
  id?: number;
  titre: string;
  statut: 'A_faire' | 'En_cours' | 'Fait';
  description?: string;
  priorite?: string;
  dateCreation?: string;
  dateLimite?: string;
  sousTicketId?: number;
  sousTicketTitre?: string;
  ticketId?: number;
  assigneeId?: number;
  assigneeNom?: string;    // ✅ AJOUTÉ
  assigneePrenom?: string; // ✅ AJOUTÉ
}

export interface SousTicket {
  id?: number;
  titre: string;
  description?: string;
  statut?: string;
  priorite?: string;
  systemeImpacte?: string;
  equipeResponsable?: string;
  generePar?: string;
  dateCreation?: string;
  taches?: Tache[]; // ✅ déjà présent — maintenant rempli par l'API
}