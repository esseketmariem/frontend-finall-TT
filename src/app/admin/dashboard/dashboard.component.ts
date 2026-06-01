import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AdminUsersComponent } from '../admin-users/admin-users.component';
import { TicketService } from '../../services/ticket.service';
import { AuthService } from '../../services/auth.service';
import { Ticket } from '../../models/ticket';
import { ProfileComponent } from '../../shared/profile/profile.component';
@Component({
  selector: 'app-dashboard',
  standalone: true,
imports: [CommonModule, DecimalPipe, AdminUsersComponent, FormsModule, ProfileComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  activeView   = 'users';
  tickets: Ticket[] = [];
  users: any[] = [];
  isLoading    = false;
  errorMessage = '';
  searchQuery  = '';

  selectedTicket: any = null;
  modalOpen = false;
  modalCommentaires: any[] = [];
  modalLoadingComments = false;

  private baseUrl = 'http://localhost:8070';

  constructor(
    private ticketService: TicketService,
    private authService: AuthService,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadTickets();
    this.loadUsers();
  }

  // ─── Data Loading ──────────────────────────────────────────────────────────

  loadTickets(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.ticketService.getAllTickets().subscribe({
      next: (data) => { this.tickets = data; this.isLoading = false; },
      error: ()    => { this.errorMessage = 'Impossible de charger les tickets.'; this.isLoading = false; }
    });
  }

  loadUsers(): void {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.get<any[]>(`${this.baseUrl}/api/users`, { headers }).subscribe({
      next: (data) => { this.users = data; },
      error: () => {}
    });
  }

  // ─── Modal ─────────────────────────────────────────────────────────────────

  openTicketModal(ticket: any): void {
    this.selectedTicket = ticket;
    this.modalOpen = true;
    this.modalCommentaires = [];
    this.loadCommentaires(ticket.id);
  }

  closeModal(): void {
    this.modalOpen = false;
    this.selectedTicket = null;
    this.modalCommentaires = [];
  }

  loadCommentaires(ticketId: number): void {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.modalLoadingComments = true;
    this.http.get<any[]>(
      `${this.baseUrl}/api/commentaires/ticket/${ticketId}`,
      { headers }
    ).subscribe({
      next: (data) => { this.modalCommentaires = data; this.modalLoadingComments = false; },
      error: ()    => { this.modalLoadingComments = false; }
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.modalOpen) this.closeModal();
  }

  // ─── Filtered tickets ──────────────────────────────────────────────────────

  get filteredTickets(): Ticket[] {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return this.tickets;
    return this.tickets.filter(t =>
      t.titre?.toLowerCase().includes(q) ||
      String(t.id).includes(q) ||
      (t.priorite as string)?.toLowerCase().includes(q) ||
      (t.statut as string)?.toLowerCase().includes(q)
    );
  }

  // ─── Ticket stats ──────────────────────────────────────────────────────────

  get totalTickets()     { return this.tickets.length; }
  get ticketsAfaire()    { return this.tickets.filter(t => (t.statut as string) === 'A_faire').length; }
  get ticketsApprouves() { return this.tickets.filter(t => (t.statut as string) === 'Approuvé').length; }
  get ticketsRejetes()   { return this.tickets.filter(t => (t.statut as string) === 'Rejeté').length; }
  get ticketsEnCours()   { return this.tickets.filter(t => (t.statut as string) === 'EN_COURS').length; }
  get ticketsAnalyses()  { return this.tickets.filter(t => ['IN_ANALYSIS', 'ANALYZED'].includes(t.statut as string)).length; }
  get ticketsHaute()     { return this.tickets.filter(t => ['HAUTE', 'HIGH'].includes((t.priorite as string)?.toUpperCase())).length; }
  get ticketsMoyenne()   { return this.tickets.filter(t => ['MOYENNE', 'MEDIUM'].includes((t.priorite as string)?.toUpperCase())).length; }
  get ticketsBasse()     { return this.tickets.filter(t => ['BASSE', 'LOW'].includes((t.priorite as string)?.toUpperCase())).length; }

  // ─── User stats — FIXED ────────────────────────────────────────────────────
  // Roles from DB: METIER | BUSINESS_ANALYST | ADMIN
  // (kept legacy aliases BA / ANALYST / USER as fallback)

  get totalUsers() { return this.users.length; }

  get usersMetier() {
    return this.users.filter(u =>
      u.role === 'METIER' || u.role === 'USER'
    ).length;
  }

  get usersBA() {
    return this.users.filter(u =>
      u.role === 'BUSINESS_ANALYST' || u.role === 'BA' || u.role === 'ANALYST'
    ).length;
  }

  get usersAdmin() {
    return this.users.filter(u => u.role === 'ADMIN').length;
  }

  // ─── Chart data ────────────────────────────────────────────────────────────

  get roleChartData() {
    return [
      { label: 'Métier',           value: this.usersMetier, color: '#7c3aed' },
      { label: 'Business Analyst', value: this.usersBA,     color: '#3db07a' },
      { label: 'Admin',            value: this.usersAdmin,  color: '#e8a020' },
    ];
  }

  get statutChartData() {
    return [
      { label: 'En cours',  value: this.ticketsEnCours,   color: '#e8a020' },
      { label: 'Analysés',  value: this.ticketsAnalyses,  color: '#818cf8' },
      { label: 'Approuvés', value: this.ticketsApprouves, color: '#34c47c' },
      { label: 'Rejetés',   value: this.ticketsRejetes,   color: '#e05555' },
    ];
  }

  get prioriteChartData() {
    return [
      { label: 'Haute',   value: this.ticketsHaute,   color: '#e05555' },
      { label: 'Moyenne', value: this.ticketsMoyenne, color: '#e8a020' },
      { label: 'Basse',   value: this.ticketsBasse,   color: '#555560' },
    ];
  }

  // ─── Badge helpers ─────────────────────────────────────────────────────────

  getStatutModalClass(s: string): string {
    const map: Record<string, string> = {
      'EN_COURS':    'badge-encours',
      'IN_ANALYSIS': 'badge-analysis',
      'ANALYZED':    'badge-analyzed',
      'APPROUVE':    'badge-approuve',
      'REJETE':      'badge-rejete',
    };
    return map[s] ?? 'badge-encours';
  }

  getStatutModalLabel(s: string): string {
    const map: Record<string, string> = {
      'EN_COURS':    'EN COURS',
      'IN_ANALYSIS': 'EN ANALYSE',
      'ANALYZED':    'ANALYSÉ',
      'APPROUVE':    'APPROUVÉ',
      'REJETE':      'REJETÉ',
    };
    return map[s] ?? s;
  }

  getPrioriteModalLabel(p: string): string {
    const u = p?.toUpperCase();
    if (u === 'HAUTE'   || u === 'HIGH')   return 'Haute';
    if (u === 'MOYENNE' || u === 'MEDIUM') return 'Moyenne';
    if (u === 'BASSE'   || u === 'LOW')    return 'Basse';
    return p ?? '—';
  }

  getStatutClass(s: string | undefined): string {
    if (s === 'A_faire')  return 'badge-todo';
    if (s === 'Approuvé') return 'badge-done';
    if (s === 'Rejeté')   return 'badge-danger';
    return 'badge-todo';
  }

  getStatutLabel(s: string | undefined): string {
    if (s === 'A_faire')  return 'À faire';
    if (s === 'Approuvé') return 'Approuvé';
    if (s === 'Rejeté')   return 'Rejeté';
    return s ?? '';
  }

  getPrioriteClass(p: string | undefined): string {
    const u = p?.toUpperCase();
    if (u === 'HAUTE'   || u === 'HIGH')   return 'prio prio-haute';
    if (u === 'MOYENNE' || u === 'MEDIUM') return 'prio prio-moyenne';
    if (u === 'BASSE'   || u === 'LOW')    return 'prio prio-basse';
    return 'prio';
  }

  getPrioriteLabel(p: string | undefined): string {
    const u = p?.toUpperCase();
    if (u === 'HAUTE'   || u === 'HIGH')   return 'Haute';
    if (u === 'MOYENNE' || u === 'MEDIUM') return 'Moyenne';
    if (u === 'BASSE'   || u === 'LOW')    return 'Basse';
    return p ?? '—';
  }

  // ─── SVG chart helpers ─────────────────────────────────────────────────────

  getChartPoints(color: string): { path: string; area: string; dots: { x: number; y: number }[] } {
    const W = 560, H = 120, PAD = 20;
    const days = 7;
    const counts: number[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      counts.push(this.tickets.filter(t => {
        const c = t.dateCreation as string;
        return c && c.toString().slice(0, 10) === dateStr;
      }).length);
    }
    const max   = Math.max(...counts, 1);
    const stepX = (W - PAD * 2) / (days - 1);
    const dots  = counts.map((v, i) => ({
      x: PAD + i * stepX,
      y: H - PAD - ((v / max) * (H - PAD * 2))
    }));
    const path = dots.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const area = `${path} L${dots[dots.length - 1].x.toFixed(1)},${H - PAD} L${PAD},${H - PAD} Z`;
    return { path, area, dots };
  }

  getDonutPath(data: { label: string; value: number; color: string }[]): { d: string; color: string; label: string; pct: number }[] {
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    const cx = 80, cy = 80, r = 64, ri = 32;
    let angle = -Math.PI / 2;
    const GAP = 0.04;
    return data.map(item => {
      const pct        = item.value / total;
      const sweep      = Math.max(pct * 2 * Math.PI - GAP, 0.001);
      const startAngle = angle + GAP / 2;
      const x1 = cx + r  * Math.cos(startAngle); const y1 = cy + r  * Math.sin(startAngle);
      const x2 = cx + ri * Math.cos(startAngle); const y2 = cy + ri * Math.sin(startAngle);
      const endAngle = startAngle + sweep;
      const x3 = cx + r  * Math.cos(endAngle);   const y3 = cy + r  * Math.sin(endAngle);
      const x4 = cx + ri * Math.cos(endAngle);   const y4 = cy + ri * Math.sin(endAngle);
      angle += pct * 2 * Math.PI;
      const large = sweep > Math.PI ? 1 : 0;
      const d = `M${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large},1 ${x3.toFixed(2)},${y3.toFixed(2)} L${x4.toFixed(2)},${y4.toFixed(2)} A${ri},${ri} 0 ${large},0 ${x2.toFixed(2)},${y2.toFixed(2)} Z`;
      return { d, color: item.color, label: item.label, pct: Math.round(pct * 100) };
    });
  }

  get lineChart() { return this.getChartPoints('#4a8ee8'); }

  getLast7Days(): string[] {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    });
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}