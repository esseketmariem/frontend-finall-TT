import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');

  const isLoginRequest = req.url.includes('/users/login');

  const authReq = (token && !isLoginRequest)
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // ← Seulement 401 (token expiré) — PAS 403 (accès refusé)
      if (err.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('email');
        localStorage.removeItem('userId');
        localStorage.removeItem('nom');
        localStorage.removeItem('prenom');

        Object.keys(localStorage)
          .filter(k => k.startsWith('analyse_ticket_'))
          .forEach(k => localStorage.removeItem(k));

        if (!router.url.includes('/login')) {
          router.navigate(['/login']);
        }
      }
      return throwError(() => err);
    })
  );
};