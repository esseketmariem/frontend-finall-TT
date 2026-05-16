export interface User {
  id?:           number;
  nom:           string;
  prenom:        string;
  email:         string;
  motDePasse?:   string;
  role:          'ADMIN' | 'AGENT' | 'USER' | string;
  actif?:        boolean;
  dateCreation?: string | Date;
}
