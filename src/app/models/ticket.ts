import { SousTicket } from './sous-ticket';

export interface Ticket {
  id?: number;
  titre: string;
  description?: string;
  statut?: string;
  priorite?: string;
  dateCreation?: string;
  dateModification?: string;
  dateSouhaite?: string;
  dateMiseAJour?: string;
  createdBy?: string;
  assignedTo?: string;

  // UI-only runtime fields
  nombreCommentaires?: number;
  analyseIAEffectuee?: boolean;

  // Analysis fields
  systemesDetectes?: string[];
  causeRacine?: string;
  aiSummary?: string;
  nombreSousTickets?: number;

  // Relations
  sousTickets?: SousTicket[];
}