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
  assigneeNom?: string;
  assigneePrenom?: string;
}

export interface SousTicket {
  id?: number;
  titre: string;
  description?: string;
  statut?: string;
  priorite?: string;
  prioriteEstimee?: string;   // FIX: backend returns prioriteEstimee not priorite
  systeme?: string;           // FIX: backend returns systeme not systemeImpacte
  systemeImpacte?: string;
  resumeTechnique?: string;   // FIX: backend field from AnalyseBAService
  equipeResponsable?: string;
  generePar?: string;
  dateCreation?: string;
  taches?: Tache[];
}