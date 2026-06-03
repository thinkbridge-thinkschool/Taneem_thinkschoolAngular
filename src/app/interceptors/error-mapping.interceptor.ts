import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../auth.service';

// Typed app error — replaces raw HttpErrorResponse with something the UI can use
export interface AppError {
  status: number;
  message: string;    // friendly message shown to the user
  title:   string;    // short label (e.g. "Not Found", "Server Error")
  detail?: string;    // raw detail from ProblemDetails if present
}

// Maps HTTP errors to typed AppError.
// Backend shapes handled:
//   404/401 empty body  → generic friendly message by status code
//   500 ProblemDetails  → { title, status, detail } from ExceptionMiddleware
export const errorMappingInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError(httpError => {
      const status: number = httpError.status ?? 0;
      const body = httpError.error;
      const detail: string | undefined = body?.detail;
      const title: string = body?.title ?? titleFor(status);

      // 401 while already logged in = token expired mid-session
      if (status === 401 && auth.isLoggedIn()) {
        auth.logout();
        auth.sessionExpired.set(true);
      }

      const appError: AppError = {
        status,
        title,
        detail,
        message: status === 401 && auth.sessionExpired()
          ? 'Your session has expired. Please sign in again.'
          : messageFor(status, detail)
      };

      return throwError(() => appError);
    })
  );
};

function titleFor(status: number): string {
  if (status === 401) return 'Unauthorized';
  if (status === 403) return 'Forbidden';
  if (status === 404) return 'Not Found';
  if (status === 422) return 'Validation Error';
  if (status >= 500) return 'Server Error';
  return 'Request Failed';
}

function messageFor(status: number, detail?: string): string {
  if (detail) return detail;
  if (status === 401) return 'You must be logged in to do this.';
  if (status === 403) return 'You do not have permission to do this.';
  if (status === 404) return 'The requested item was not found.';
  if (status === 422) return 'The request was rejected by the server.';
  if (status === 0)   return 'Cannot reach the server. Check your connection.';
  if (status >= 500)  return 'Something went wrong on the server. Please try again.';
  return 'An unexpected error occurred.';
}
