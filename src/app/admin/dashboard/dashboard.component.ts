import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminUsersComponent } from '../admin-users/admin-users.component';
import { TicketService } from '../../services/ticket.service';
import { Ticket } from '../../models/ticket';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, AdminUsersComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  activeView = 'users';
  tickets: Ticket[] = [];
  isLoading = false;
  errorMessage = '';

  constructor(private ticketService: TicketService) {}

  ngOnInit(): void { this.loadTickets(); }

  loadTickets(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.ticketService.getAllTickets().subscribe({
      next: (data) => { this.tickets = data; this.isLoading = false; },
      error: ()     => { this.errorMessage = 'Erreur de chargement.'; this.isLoading = false; }
    });
  }

  // ── Compteurs ─────────────────────────────────────
  get totalTickets()     { return this.tickets.length; }
  get ticketsAfaire()    { return this.tickets.filter(t => (t.statut as string) === 'A_faire').length; }
  get ticketsApprouves() { return this.tickets.filter(t => (t.statut as string) === 'Approuvé').length; }
  get ticketsRejetes()   { return this.tickets.filter(t => (t.statut as string) === 'Rejeté').length; }
  get ticketsHaute()     { return this.tickets.filter(t => ['HAUTE','HIGH'].includes((t.priorite as string)?.toUpperCase())).length; }
  get ticketsMoyenne()   { return this.tickets.filter(t => ['MOYENNE','MEDIUM'].includes((t.priorite as string)?.toUpperCase())).length; }
  get ticketsBasse()     { return this.tickets.filter(t => ['BASSE','LOW'].includes((t.priorite as string)?.toUpperCase())).length; }

  // ── Courbe SVG ────────────────────────────────────
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

    const max = Math.max(...counts, 1);
    const stepX = (W - PAD * 2) / (days - 1);

    const dots = counts.map((v, i) => ({
      x: PAD + i * stepX,
      y: H - PAD - ((v / max) * (H - PAD * 2))
    }));

    const path = dots.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const area = `${path} L${dots[dots.length-1].x},${H - PAD} L${PAD},${H - PAD} Z`;

    return { path, area, dots };
  }

  get statutChartData() {
    return [
      { label: 'À faire',  value: this.ticketsAfaire,    color: '#d4a017' },
      { label: 'Approuvé', value: this.ticketsApprouves, color: '#3db07a' },
      { label: 'Rejeté',   value: this.ticketsRejetes,   color: '#e05555' },
    ];
  }

  get prioriteChartData() {
    return [
      { label: 'Haute',   value: this.ticketsHaute,   color: '#e05555' },
      { label: 'Moyenne', value: this.ticketsMoyenne, color: '#d4a017' },
      { label: 'Basse',   value: this.ticketsBasse,   color: '#606060' },
    ];
  }

  // ── Donut SVG ─────────────────────────────────────
  getDonutPath(data: {label:string,value:number,color:string}[]): {d:string,color:string,label:string,pct:number}[] {
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    const cx = 80, cy = 80, r = 60, ri = 36;
    let angle = -Math.PI / 2;
    return data.map(item => {
      const pct   = item.value / total;
      const sweep = pct * 2 * Math.PI;
      const x1 = cx + r  * Math.cos(angle);
      const y1 = cy + r  * Math.sin(angle);
      const x2 = cx + ri * Math.cos(angle);
      const y2 = cy + ri * Math.sin(angle);
      angle += sweep;
      const x3 = cx + r  * Math.cos(angle);
      const y3 = cy + r  * Math.sin(angle);
      const x4 = cx + ri * Math.cos(angle);
      const y4 = cy + ri * Math.sin(angle);
      const large = sweep > Math.PI ? 1 : 0;
      const d = `M${x1},${y1} A${r},${r} 0 ${large},1 ${x3},${y3} L${x4},${y4} A${ri},${ri} 0 ${large},0 ${x2},${y2} Z`;
      return { d, color: item.color, label: item.label, pct: Math.round(pct * 100) };
    });
  }

  // ── Ligne courbe 7 jours ──────────────────────────
  get lineChart() { return this.getChartPoints('#4a90d9'); }

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
}