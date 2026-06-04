import {
  ApplicationConfig,
  provideZonelessChangeDetection
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor }         from './interceptors/auth.interceptor';
import { retryInterceptor }        from './interceptors/retry.interceptor';
import { errorMappingInterceptor } from './interceptors/error-mapping.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes, withViewTransitions(), withComponentInputBinding()),
    provideHttpClient(withInterceptors([
      authInterceptor,
      retryInterceptor,
      errorMappingInterceptor
    ]))
  ]
};
