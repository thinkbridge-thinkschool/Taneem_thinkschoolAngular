import {
  ApplicationConfig,
  provideZonelessChangeDetection
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor }         from './interceptors/auth.interceptor';
import { retryInterceptor }        from './interceptors/retry.interceptor';
import { errorMappingInterceptor } from './interceptors/error-mapping.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideHttpClient(withInterceptors([
      authInterceptor,         // 1. attach Bearer token
      retryInterceptor,        // 2. retry idempotent GETs with backoff
      errorMappingInterceptor  // 3. map HTTP errors to typed AppError
    ]))
  ]
};
