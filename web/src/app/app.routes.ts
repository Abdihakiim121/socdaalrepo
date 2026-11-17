import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/guards';
import { PageData, ShellComponent } from './layout/shell.component';

const page = (data: PageData) => data;

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login.component').then((m) => m.LoginComponent) },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        data: page({ title: 'dashboard' }),
        loadComponent: () => import('./pages/today.component').then((m) => m.TodayComponent),
      },

      // Boosteejo: the bus station's daily work
      {
        path: 'boosteejo',
        data: page({ section: 'boosteejo' }),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'queue' },
          {
            path: 'queue',
            data: page({ title: 'queue' }),
            loadComponent: () => import('./pages/queue.component').then((m) => m.QueueComponent),
          },
          {
            path: 'arrival',
            data: page({ title: 'registerArrival' }),
            loadComponent: () => import('./pages/register-bus.component').then((m) => m.RegisterBusComponent),
          },
          {
            path: 'trips',
            data: page({ title: 'trips' }),
            loadComponent: () => import('./pages/trips.component').then((m) => m.TripsComponent),
          },
          {
            path: 'trips/:id',
            data: page({ parent: { label: 'trips', link: '/boosteejo/trips' }, title: 'tripDetails' }),
            loadComponent: () => import('./pages/trip-detail.component').then((m) => m.TripDetailComponent),
          },
          {
            path: 'passengers',
            data: page({ title: 'passengers' }),
            loadComponent: () => import('./pages/passengers.component').then((m) => m.PassengersComponent),
          },
          {
            path: 'buses',
            data: page({ title: 'buses' }),
            loadComponent: () => import('./pages/buses.component').then((m) => m.BusesComponent),
          },
        ],
      },

      // Dalmar: tourism, not built yet
      {
        path: 'dalmar',
        data: page({ section: 'dalmar' }),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'tours' },
          ...(['tours', 'hotels', 'guides'] as const).map((feature) => ({
            path: feature,
            data: page({ title: feature }),
            loadComponent: () => import('./pages/dalmar.component').then((m) => m.DalmarComponent),
          })),
        ],
      },

      // Administration
      {
        path: 'users',
        canActivate: [adminGuard],
        data: page({ section: 'administration', title: 'userManagement' }),
        loadComponent: () => import('./pages/users.component').then((m) => m.UsersComponent),
      },
      {
        path: 'settings',
        canActivate: [adminGuard],
        data: page({ section: 'settings' }),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'boosteejos' },
          {
            path: 'boosteejos',
            data: page({ title: 'boosteejos' }),
            loadComponent: () => import('./pages/settings-stations.component').then((m) => m.SettingsStationsComponent),
          },
          {
            path: 'routes',
            data: page({ title: 'routes' }),
            loadComponent: () => import('./pages/settings-routes.component').then((m) => m.SettingsRoutesComponent),
          },
          {
            path: 'cities',
            data: page({ title: 'cities' }),
            loadComponent: () => import('./pages/settings-cities.component').then((m) => m.SettingsCitiesComponent),
          },
        ],
      },

      // Older addresses, kept so saved links still work
      { path: 'today', redirectTo: 'dashboard' },
      { path: 'queue', redirectTo: 'boosteejo/queue' },
      { path: 'buses/arrival', redirectTo: 'boosteejo/arrival' },
      { path: 'records', redirectTo: 'boosteejo/trips' },
      { path: 'trips/:id', redirectTo: 'boosteejo/trips/:id' },
      { path: 'admin', redirectTo: 'settings/boosteejos' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
