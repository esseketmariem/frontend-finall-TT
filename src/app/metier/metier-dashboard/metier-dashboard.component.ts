import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileService } from '../../services/profile.service';
import { AddTicketComponent } from '../../add-ticket/add-ticket.component';
import { ListeticketComponent } from '../listeticket/listeticket.component';
import { ProfileComponent } from '../../shared/profile/profile.component';

@Component({
  selector: 'app-metier-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    AddTicketComponent,
    ListeticketComponent,
    ProfileComponent
  ],
  templateUrl: './metier-dashboard.component.html',
  styleUrls: ['./metier-dashboard.component.css']
})
export class MetierDashboardComponent implements OnInit {

  view: string = 'list';
  currentUser: any = null;

  defaultAvatar = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='50' fill='%232d3548'/><circle cx='50' cy='38' r='18' fill='%2394a3b8'/><ellipse cx='50' cy='85' rx='30' ry='22' fill='%2394a3b8'/></svg>`;

  constructor(private profileService: ProfileService) {}

  ngOnInit(): void {
    this.loadUser();
  }

  loadUser(): void {
    this.currentUser = {
      nom: localStorage.getItem('nom') || '',
      prenom: localStorage.getItem('prenom') || '',
      email: localStorage.getItem('email') || '',
      avatarUrl: localStorage.getItem('avatarUrl') || null
    };

    this.profileService.getProfile().subscribe({
      next: (user: any) => {
        this.currentUser = user;
        if (user.avatarUrl) {
          localStorage.setItem('avatarUrl', user.avatarUrl);
        } else {
          localStorage.removeItem('avatarUrl');
        }
      },
      error: (err: any) => console.error('Erreur profil', err)
    });
  }

  getCurrentTitle(): string {
    switch (this.view) {
      case 'create': return 'Nouveau Ticket';
      case 'list': return 'Mes Tickets';
      case 'profile': return 'Mon Profil';
      default: return '';
    }
  }

  goToProfile(): void {
    this.view = 'profile';
  }
}