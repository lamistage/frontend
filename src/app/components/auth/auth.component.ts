import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss'],
  imports: [ReactiveFormsModule, CommonModule]
})
export class AuthComponent {
  form: FormGroup;
  isRegisterMode = false;
  errorMessage: string | null = null; 

  constructor(private fb: FormBuilder, private router: Router, private authService: AuthService) {
    this.form = this.fb.group({
      login: ['', [
        Validators.required,
        Validators.pattern(/^[a-zA-Z0-9]+$/),
        Validators.maxLength(50),
        this.noWhitespaceValidator
      ]],
      password: ['', [
        Validators.required,
        Validators.pattern(/^[a-zA-Z0-9]+$/),
        Validators.minLength(6),
        Validators.maxLength(50),
        this.noWhitespaceValidator
      ]]
    });
  }

  toggleMode() {
    this.isRegisterMode = !this.isRegisterMode;
    this.errorMessage = null; 
  }

  onInputLogin(event: any) {
    const input = event.target;
    input.value = input.value.replace(/[^a-zA-Z0-9]/g, '');
    this.form.get('login')?.setValue(input.value);
  }

  onInputPassword(event: any) {
    const input = event.target;
    input.value = input.value.replace(/[^a-zA-Z0-9]/g, '');
    this.form.get('password')?.setValue(input.value);
  }

  noWhitespaceValidator(control: any) {
    const isWhitespace = (control.value || '').trim().length === 0;
    const isValid = !isWhitespace;
    return isValid ? null : { whitespace: true };
  }

  onSubmit() {
    if (this.form.valid) {
      const formData = this.form.value;

      if (this.isRegisterMode) {
        this.authService.signUp(formData).subscribe({
          next: () => {
            this.errorMessage = null; 
            this.toggleMode();
          },
          error: () => {
            this.errorMessage = 'User with such login already exists';
          }
        });
      } else {
        this.authService.signIn(formData).subscribe({
          next: (res) => {
            localStorage.setItem('token', res.token);
            this.errorMessage = null; 
            this.router.navigate(['/add-image']);
          },
          error: () => {
            this.errorMessage = 'Invalid Login or Password';
          }
        });
      }
    }
  }
}