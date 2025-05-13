import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
  imports: [
    ReactiveFormsModule
  ]
})
export class ResetPasswordComponent implements OnInit {
  resetForm: FormGroup;
  errorMessage: string | null = null;
  code: string | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    this.resetForm = this.fb.group({
      email: ['', Validators.required, Validators.email],
      newPassword: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.code = params['code'] || null;
      if (!this.code) {
        this.errorMessage = 'Invalid or missing reset code';
      }
    });
  }

  onInputEmail(event: Event): void {
    this.errorMessage = null;
    const input = event.target as HTMLInputElement;
    this.resetForm.get('email')?.setValue(input.value);
  }

  onInputNewPassword(event: Event): void {
    this.errorMessage = null;
    const input = event.target as HTMLInputElement;
    this.resetForm.get('newPassword')?.setValue(input.value);
  }

  onSubmit(): void {
    if (this.resetForm.invalid || !this.code) {
      this.errorMessage = 'Please fill in all fields correctly';
      return;
    }

    const { email, newPassword } = this.resetForm.value;

    this.authService.resetPassword({ email, code: this.code, newPassword }).subscribe({
      next: (response: string) => {
        if (response === 'Password reset successfully') {
          this.router.navigate(['/auth'], { queryParams: { mode: 'signin' } });
        } else {
          this.errorMessage = 'Unexpected response from server';
        }
      },
      error: (error) => {
        this.errorMessage = error.message || 'An error occurred';
      }
    });
  }
}