import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService, User, Role } from '../../services/user.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.css']
})
export class AdminUsersComponent implements OnInit {

  users:    User[] = [];
  filtered: User[] = [];
  isLoading    = false;
  errorMessage = '';

  searchTerm = '';
  sortCol    = 'nom';
  sortAsc    = true;

  pageSize    = 10;
  currentPage = 1;

  showModal = false;
  editUser: User | null = null;
  form: Partial<User> = { nom:'', prenom:'', email:'', role: Role.METIER };

  showPasswordModal = false;
  userToAccept: User | null = null;
  passwordInput = '';

  Role = Role;

  constructor(private userService: UserService) {}

  ngOnInit(): void { this.loadUsers(); }

  loadUsers(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.userService.getUsers().subscribe({
      next: (data) => { this.users = data; this.applyFilter(); this.isLoading = false; },
      error: ()    => { this.errorMessage = 'Erreur de chargement.'; this.isLoading = false; }
    });
  }

  get totalUsers()  { return this.users.length; }
  get countAdmins() { return this.users.filter(u => u.role === Role.ADMIN).length; }
  get countMetier() { return this.users.filter(u => u.role === Role.METIER).length; }
  get countBA()     { return this.users.filter(u => u.role === Role.BUSINESS_ANALYST).length; }

  onSearch(): void { this.currentPage = 1; this.applyFilter(); }

  applyFilter(): void {
    const q = this.searchTerm.toLowerCase();
    let list = this.users.filter(u =>
      [u.nom, u.prenom, u.email].some(v => v?.toLowerCase().includes(q))
    );
    list = list.sort((a, b) => {
      const va = (a as any)[this.sortCol] ?? '';
      const vb = (b as any)[this.sortCol] ?? '';
      return this.sortAsc
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
    this.filtered = list;
  }

  sort(col: string): void {
    if (this.sortCol === col) this.sortAsc = !this.sortAsc;
    else { this.sortCol = col; this.sortAsc = true; }
    this.applyFilter();
  }

  get totalPages() { return Math.ceil(this.filtered.length / this.pageSize) || 1; }
  get pages()      { return Array.from({length: this.totalPages}, (_, i) => i + 1); }
  get paginated()  { const s = (this.currentPage - 1) * this.pageSize; return this.filtered.slice(s, s + this.pageSize); }
  goPage(p: number) { if (p >= 1 && p <= this.totalPages) this.currentPage = p; }

  openModal(u?: User): void {
    this.editUser = u ?? null;
    this.form = u
      ? { nom: u.nom, prenom: u.prenom, email: u.email, role: u.role }
      : { nom: '', prenom: '', email: '', role: Role.METIER };
    this.showModal = true;
  }
  closeModal(): void { this.showModal = false; }

  saveUser(): void {
    if (this.editUser) {
      this.userService.updateUser(this.editUser.id!, this.form as User).subscribe({
        next: () => { this.closeModal(); this.loadUsers(); },
        error: () => alert('Erreur lors de la mise a jour.')
      });
    } else {
      this.userService.createUser(this.form as User).subscribe({
        next: () => { this.closeModal(); this.loadUsers(); },
        error: () => alert('Erreur lors de la creation.')
      });
    }
  }

  deleteUser(u: User): void {
    if (!confirm(`Supprimer ${u.nom} ${u.prenom} ?`)) return;
    this.userService.deleteUser(u.id!).subscribe({
      next: () => this.loadUsers(),
      error: () => alert('Erreur lors de la suppression.')
    });
  }

  accepter(u: User): void {
    this.userToAccept = u;
    this.passwordInput = '';
    this.showPasswordModal = true;
  }

  confirmerAcceptation(): void {
    if (!this.passwordInput || !this.userToAccept?.id) return;
    this.userService.accepterCompte(this.userToAccept.id, this.passwordInput).subscribe({
      next: () => {
        this.showPasswordModal = false;
        this.userToAccept = null;
        this.passwordInput = '';
        this.loadUsers();
      },
      error: () => alert('Erreur lors de l acceptation.')
    });
  }

  refuser(u: User): void {
    if (!confirm(`Refuser le compte de ${u.nom} ${u.prenom} ?`)) return;
    this.userService.refuserCompte(u.id!).subscribe({
      next: () => this.loadUsers(),
      error: () => alert('Erreur lors du refus.')
    });
  }

  initials(u: User): string {
    return ((u.nom?.[0] ?? '') + (u.prenom?.[0] ?? '')).toUpperCase() || '?';
  }

  private readonly PALETTES = [
    { bg: 'rgba(74,144,217,.18)',  color: '#6eaaec' },
    { bg: 'rgba(61,176,122,.18)',  color: '#3db07a' },
    { bg: 'rgba(212,160,23,.18)', color: '#d4a017' },
    { bg: 'rgba(180,100,220,.18)',color: '#b464dc' },
    { bg: 'rgba(224,85,85,.18)',  color: '#e05555' },
  ];
  avatarBg(u: User): string {
    const i = (u.nom?.charCodeAt(0) ?? 0) % this.PALETTES.length;
    return this.PALETTES[i].bg;
  }
  avatarColor(u: User): string {
    const i = (u.nom?.charCodeAt(0) ?? 0) % this.PALETTES.length;
    return this.PALETTES[i].color;
  }

  getRoleClass(role: Role): string {
    if (role === Role.ADMIN)            return 'badge badge-admin';
    if (role === Role.BUSINESS_ANALYST) return 'badge badge-agent';
    return 'badge badge-user';
  }
  getRoleLabel(role: Role): string {
    if (role === Role.ADMIN)            return 'Admin';
    if (role === Role.BUSINESS_ANALYST) return 'Business Analyst';
    return 'Metier';
  }

  getStatutClass(statut?: string): string {
    if (statut === 'ACCEPTE')    return 'badge badge-active';
    if (statut === 'REFUSE')     return 'badge badge-inactive';
    return 'badge badge-todo';
  }
  getStatutLabel(statut?: string): string {
    if (statut === 'ACCEPTE')    return 'Accepte';
    if (statut === 'REFUSE')     return 'Refuse';
    return 'En attente';
  }
}
