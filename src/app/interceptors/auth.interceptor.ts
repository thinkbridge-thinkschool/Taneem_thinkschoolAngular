import { HttpInterceptorFn } from '@angular/common/http';

// Reads JWT from localStorage and attaches it to every outgoing request.
// To set the token: localStorage.setItem('token', 'your-jwt-here')
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');
  if (!token) return next(req);
  return next(req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  }));
};
