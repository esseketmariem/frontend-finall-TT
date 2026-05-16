import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { AdminUsersComponent } from './admin/admin-users/admin-users.component';
import { DashboardComponent } from './admin/dashboard/dashboard.component';
import { AddTicketComponent } from './add-ticket/add-ticket.component';
import { MetierDashboardComponent } from './metier/metier-dashboard/metier-dashboard.component';
import { AnalyseDashboardComponent } from './analyse/analyse-dashboard/analyse-dashboard.component';
import { AnalyseTicketComponent } from './analyse/analyse-ticket/analyse-ticket.component';
import { DemandecompteComponent } from './app/demandecompte/demandecompte.component';
import { TechniqueDashboardComponent } from './technique/technique-dashboard/technique-dashboard.component';
import { ProfileComponent } from './shared/profile/profile.component';

import { authGuard } from './guards/auth.guard';
import { adminGuard, metierGuard, baGuard, techniqueGuard } from './guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: DemandecompteComponent },

  // ==================== PROFIL ====================
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [authGuard]
  },

  // ==================== DASHBOARDS ====================
  {
    path: 'admin-dashboard',
    component: DashboardComponent,
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'admin-users',
    component: AdminUsersComponent,
    canActivate: [authGuard, adminGuard]
  },

  {
    path: 'metier',
    component: MetierDashboardComponent,
    canActivate: [authGuard, metierGuard]
  },
  {
    path: 'add-ticket',
    component: AddTicketComponent,
    canActivate: [authGuard, metierGuard]
  },

  {
    path: 'analyse-dashboard',
    component: AnalyseDashboardComponent,
    canActivate: [authGuard, baGuard]
  },
  {
    path: 'analyse-tickets',
    component: AnalyseTicketComponent,
    canActivate: [authGuard, baGuard]
  },

  {
    path: 'technique',
    component: TechniqueDashboardComponent,
    canActivate: [authGuard, techniqueGuard]
  },

  { path: '**', redirectTo: 'login' }
];