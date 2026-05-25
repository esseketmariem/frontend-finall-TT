import { SousTicket } from './sous-ticket';

// ── Type statut ───────────────────────────────────────────────────────────────
export type StatutTicket =
  | 'A_FAIRE'
  | 'EN_COURS'
  | 'IN_ANALYSIS'
  | 'ANALYZED'
  | 'FAIT'
  | 'APPROUVE'
  | 'REJETE';

export interface Ticket {
  id?: number;
  userId?: number;
  titre: string;
  description?: string;
  statut?: StatutTicket;
  priorite?: string;
  dateCreation?: string;
  dateLimite?: string;
  dateSouhaite?: string;
  dateMiseAJour?: string;

  analyseIAEffectuee?: boolean;
  aiSummary?: string;

  demandeurId?: number;
  demandeurNom?: string;
  demandeurPrenom?: string;
  assigneeId?: number;
  assigneeNom?: string;
  assigneePrenom?: string;
  projetId?: number;
  projetNom?: string;

  sousTickets?: SousTicket[];
  nombreCommentaires?: number;
  userNomComplet?: string;
}

export const STATUT_LABELS: Record<StatutTicket, string> = {
  A_FAIRE:     'À faire',
  EN_COURS:    'En cours',
  IN_ANALYSIS: 'En analyse',
  ANALYZED:    'Analysé',
  FAIT:        'Résolu',      // ← ajouté
  APPROUVE:    'Approuvé',
  REJETE:      'Rejeté',
};

export const STATUT_COLORS: Record<StatutTicket, string> = {
  A_FAIRE:     '#888780',   // gris
  EN_COURS:    '#3B8BD4',   // bleu
  IN_ANALYSIS: '#EF9F27',   // orange
  ANALYZED:    '#1D9E75',   // vert
  FAIT:        '#2CB67D',   // vert menthe  ← ajouté
  APPROUVE:    '#639922',   // vert foncé
  REJETE:      '#E24B4A',   // rouge
};