import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const role = localStorage.getItem('role');
  if (role === 'ADMIN') return true;
  router.navigate(['/login']);
  return false;
};

export const metierGuard: CanActivateFn = () => {
  const router = inject(Router);
  const role = localStorage.getItem('role');
  if (role === 'METIER' || role === 'ADMIN') return true;
  router.navigate(['/login']);
  return false;
};

export const baGuard: CanActivateFn = () => {
  const router = inject(Router);
  const role = localStorage.getItem('role');
  if (role === 'BUSINESS_ANALYST' || role === 'ADMIN') return true;
  router.navigate(['/login']);
  return false;
};

export const techniqueGuard: CanActivateFn = () => {
  const router = inject(Router);
  const role = localStorage.getItem('role');
  if (role === 'TECHNIQUE' || role === 'ADMIN') return true;
  router.navigate(['/login']);
  return false;
};