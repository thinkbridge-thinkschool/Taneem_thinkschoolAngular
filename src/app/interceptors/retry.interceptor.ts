import { HttpInterceptorFn } from '@angular/common/http';
import { timer } from 'rxjs';
import { retry } from 'rxjs/operators';

const MAX_RETRIES = 3;

// Retries idempotent GETs up to 3 times with exponential backoff (1s, 2s, 4s).
// Never retries POST/PUT/DELETE — those are not safe to repeat.
// Only retries on network errors (status 0) or server errors (5xx).
export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET') return next(req);

  return next(req).pipe(
    retry({
      count: MAX_RETRIES,
      delay: (error, retryCount) => {
        const isRetryable = error.status === 0 || error.status >= 500;
        if (!isRetryable) throw error;
        return timer(Math.pow(2, retryCount - 1) * 1000); // 1s, 2s, 4s
      }
    })
  );
};
