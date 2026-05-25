import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminUsersComponent } from '../admin-users/admin-users.component';
import { TicketService } from '../../services/ticket.service';
import { AuthService } from '../../services/auth.service';
import { Ticket } from '../../models/ticket';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe, AdminUsersComponent, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  activeView    = 'users';
  tickets: Ticket[] = [];
  isLoading     = false;
  errorMessage  = '';
  searchQuery   = '';
  activeFilter  = 'tous';

  constructor(
    private ticketService: TicketService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void { this.loadTickets(); }

  loadTickets(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.ticketService.getAllTickets().subscribe({
      next: (data) => { this.tickets = data; this.isLoading = false; },
      error: ()    => { this.errorMessage = 'Impossible de charger les tickets. Vérifiez votre connexion.'; this.isLoading = false; }
    });
  }

  // ── Recherche & Filtre ────────────────────────────
  get filteredTickets(): Ticket[] {
    return this.tickets.filter(t => {
      const matchFilter =
        this.activeFilter === 'tous' ||
        (t.statut as string) === this.activeFilter;

      const q = this.searchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        t.titre?.toLowerCase().includes(q) ||
        String(t.id).includes(q) ||
        (t.priorite as string)?.toLowerCase().includes(q) ||
        (t.statut as string)?.toLowerCase().includes(q);

      return matchFilter && matchSearch;
    });
  }

  setFilter(f: string): void { this.activeFilter = f; }

  // ── Compteurs ─────────────────────────────────────
  get totalTickets()     { return this.tickets.length; }
  get ticketsAfaire()    { return this.tickets.filter(t => (t.statut as string) === 'A_faire').length; }
  get ticketsApprouves() { return this.tickets.filter(t => (t.statut as string) === 'Approuvé').length; }
  get ticketsRejetes()   { return this.tickets.filter(t => (t.statut as string) === 'Rejeté').length; }
  get ticketsHaute()     { return this.tickets.filter(t => ['HAUTE','HIGH'].includes((t.priorite as string)?.toUpperCase())).length; }
  get ticketsMoyenne()   { return this.tickets.filter(t => ['MOYENNE','MEDIUM'].includes((t.priorite as string)?.toUpperCase())).length; }
  get ticketsBasse()     { return this.tickets.filter(t => ['BASSE','LOW'].includes((t.priorite as string)?.toUpperCase())).length; }

  // ── Courbe SVG (7 jours) ──────────────────────────
  getChartPoints(color: string): { path: string; area: string; dots: {x:number,y:number}[] } {
    const W = 560, H = 120, PAD = 20;
    const days = 7;
    const counts: number[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      counts.push(
        this.tickets.filter(t => {
          const c = t.dateCreation as string;
          return c && c.toString().slice(0, 10) === dateStr;
        }).length
      );
    }

    const max    = Math.max(...counts, 1);
    const stepX  = (W - PAD * 2) / (days - 1);
    const dots   = counts.map((v, i) => ({
      x: PAD + i * stepX,
      y: H - PAD - ((v / max) * (H - PAD * 2))
    }));
    const path   = dots.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const area   = `${path} L${dots[dots.length-1].x.toFixed(1)},${H - PAD} L${PAD},${H - PAD} Z`;

    return { path, area, dots };
  }

  get statutChartData() {
    return [
      { label: 'À faire',  value: this.ticketsAfaire,    color: '#e8a020' },
      { label: 'Approuvé', value: this.ticketsApprouves, color: '#34c47c' },
      { label: 'Rejeté',   value: this.ticketsRejetes,   color: '#e05555' },
    ];
  }

  get prioriteChartData() {
    return [
      { label: 'Haute',   value: this.ticketsHaute,   color: '#e05555' },
      { label: 'Moyenne', value: this.ticketsMoyenne, color: '#e8a020' },
      { label: 'Basse',   value: this.ticketsBasse,   color: '#555560' },
    ];
  }

  // ── Donut SVG ─────────────────────────────────────
  getDonutPath(data: {label:string,value:number,color:string}[]): {d:string,color:string,label:string,pct:number}[] {
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    const cx = 80, cy = 80, r = 64, ri = 32;
    let angle = -Math.PI / 2;
    const GAP = 0.04;

    return data.map(item => {
      const pct        = item.value / total;
      const sweep      = Math.max(pct * 2 * Math.PI - GAP, 0.001);
      const startAngle = angle + GAP / 2;
      const x1 = cx + r  * Math.cos(startAngle);
      const y1 = cy + r  * Math.sin(startAngle);
      const x2 = cx + ri * Math.cos(startAngle);
      const y2 = cy + ri * Math.sin(startAngle);
      const endAngle = startAngle + sweep;
      const x3 = cx + r  * Math.cos(endAngle);
      const y3 = cy + r  * Math.sin(endAngle);
      const x4 = cx + ri * Math.cos(endAngle);
      const y4 = cy + ri * Math.sin(endAngle);
      angle += pct * 2 * Math.PI;
      const large = sweep > Math.PI ? 1 : 0;
      const d = `M${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large},1 ${x3.toFixed(2)},${y3.toFixed(2)} L${x4.toFixed(2)},${y4.toFixed(2)} A${ri},${ri} 0 ${large},0 ${x2.toFixed(2)},${y2.toFixed(2)} Z`;
      return { d, color: item.color, label: item.label, pct: Math.round(pct * 100) };
    });
  }

  // ── Ligne courbe 7 jours ──────────────────────────
  get lineChart() { return this.getChartPoints('#4a8ee8'); }

  // ── Helpers ───────────────────────────────────────
  getLast7Days(): string[] {
    return Array.from({length: 7}, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toLocaleDateString('fr-FR', {day:'2-digit', month:'2-digit'});
    });
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

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}