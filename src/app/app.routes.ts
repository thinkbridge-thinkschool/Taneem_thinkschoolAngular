import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'quotes', pathMatch: 'full' },

  // Eager — main page, always needed
  {
    path: 'quotes',
    loadComponent: () =>
      import('./quotes-list/quotes-list').then(m => m.QuotesList)
  },

  // Lazy + guarded — must be BEFORE quotes/:id or 'create' gets matched as an id
  {
    path: 'quotes/create',
    loadComponent: () =>
      import('./quote-form-signal/quote-form-signal').then(m => m.QuoteFormSignal),
    canActivate: [authGuard],
    data: { isPage: true }
  },

  // Lazy — only loads when user navigates to a quote detail
  {
    path: 'quotes/:id',
    loadComponent: () =>
      import('./quote-detail/quote-detail').then(m => m.QuoteDetail)
  },

  // Lazy — login page (full screen via isPage data binding)
  {
    path: 'login',
    loadComponent: () => import('./login/login').then(m => m.Login),
    data: { isPage: true }
  },

  // Fallback
  { path: '**', redirectTo: 'quotes' }
];
