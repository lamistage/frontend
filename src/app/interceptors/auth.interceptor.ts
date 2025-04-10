import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';


const isRefreshing = new BehaviorSubject<boolean>(false);
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const snackBar = inject(MatSnackBar);

  console.log('Intercepting request:', req.url);

  if (req.url.includes('/auth/sign-in') || req.url.includes('/auth/sign-up') || req.url.includes('/auth/refresh')) {
    return next(req);
  }

  const token = authService.getToken();
  let authReq = req;

  if (token) {
    console.log('Adding token to request:', token);
    authReq = addTokenHeader(req, token);
  }

  if (token && (authService.shouldRefreshToken() || !authService.isAuthenticated())) {
    console.log('Token is about to expire or has expired, attempting to refresh');
    return handleTokenExpiration(authReq, next, authService, router, snackBar);
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        console.log('Received 401 error, attempting to refresh token');
        return handleTokenExpiration(authReq, next, authService, router, snackBar);
      }
      return throwError(() => error);
    })
  );
};

const addTokenHeader = (request: HttpRequest<any>, token: string): HttpRequest<any> => {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
};

const handleTokenExpiration = (
  request: HttpRequest<any>,
  next: HttpHandlerFn,
  authService: AuthService,
  router: Router,
  snackBar: MatSnackBar
): Observable<HttpEvent<any>> => {
  if (isRefreshing.value) {
    return refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(token => next(addTokenHeader(request, token!)))
    );
  }

  isRefreshing.next(true);
  refreshTokenSubject.next(null);

  return authService.refreshToken().pipe(
    switchMap((response: { token: string }) => {
      isRefreshing.next(false);
      refreshTokenSubject.next(response.token);
      console.log('Token refreshed successfully, retrying request');
      return next(addTokenHeader(request, response.token));
    }),
    catchError((err) => {
      isRefreshing.next(false);
      console.log('Failed to refresh token, logging out');
      authService.logout().subscribe(() => {
        snackBar.open('Your session has expired. Please sign in again.', 'Close', {
          duration: 5000,
          verticalPosition: 'top'
        });
        router.navigate(['/auth']);
      });
      return throwError(() => err);
    })
  );
};
