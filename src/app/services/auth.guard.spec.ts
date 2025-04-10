import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs'; 
import { map } from 'rxjs/operators'; 
import { AuthGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';


class MockAuthService {
  isAuthenticated() {
    return false; 
  }

  refreshToken() {
    return of(true); 
  }
}

class MockRouter {
  navigate(path: string[]): Promise<boolean> {
    return Promise.resolve(true); 
  }
}

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authService: MockAuthService;
  let router: MockRouter;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: AuthService, useClass: MockAuthService },
        { provide: Router, useClass: MockRouter }
      ]
    });

    guard = TestBed.inject(AuthGuard);
    authService = TestBed.inject(AuthService) as MockAuthService;
    router = TestBed.inject(Router) as MockRouter;
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should allow access if user is authenticated', () => {
    spyOn(authService, 'isAuthenticated').and.returnValue(true);

    const result = guard.canActivate();
    expect(result).toBe(true); 
  });

  it('should allow access if token is successfully refreshed', (done) => {
    spyOn(authService, 'isAuthenticated').and.returnValue(false);
    spyOn(authService, 'refreshToken').and.returnValue(of(true));

    const result = guard.canActivate();
    (result as Observable<boolean>).subscribe((allowed: boolean) => {
      expect(allowed).toBe(true);
      done();
    });
  });

  it('should redirect to /auth if token refresh fails', (done) => {
    spyOn(authService, 'isAuthenticated').and.returnValue(false);
    spyOn(authService, 'refreshToken').and.returnValue(
      of(false).pipe(
        map(() => { throw new Error('Token refresh failed'); })
      )
    );
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

    const result = guard.canActivate();
    (result as Observable<boolean>).subscribe((allowed: boolean) => { 
      expect(allowed).toBe(false); 
      expect(router.navigate).toHaveBeenCalledWith(['/auth']);
      done();
    });
  });
});
