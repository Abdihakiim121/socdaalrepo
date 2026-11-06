import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/guards';
import { ShellComponent } from './layout/shell.component';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login.component').then((m) => m.LoginComponent) },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'today' },
      { path: 'today', loadComponent: () => import('./pages/today.component').then((m) => m.TodayComponent) },
      { path: 'queue', loadComponent: () => import('./pages/queue.component').then((m) => m.QueueComponent) },
      {
        path: 'buses/arrival',
        loadComponent: () => import('./pages/register-bus.component').then((m) => m.RegisterBusComponent),
      },
      { path: 'trips/:id', loadComponent: () => import('./pages/trip-detail.component').then((m) => m.TripDetailComponent) },
      { path: 'records', loadComponent: () => import('./pages/records.component').then((m) => m.RecordsComponent) },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () => import('./pages/admin.component').then((m) => m.AdminComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'today' },
];
