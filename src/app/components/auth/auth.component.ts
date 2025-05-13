import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'
import { AuthService } from '../../services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-auth',
    standalone: true,
    templateUrl: './auth.component.html',
    styleUrls: ['./auth.component.scss'],
    imports: [
        ReactiveFormsModule, 
        CommonModule,
        FormsModule,
        MatIconModule
    ]
})
export class AuthComponent implements OnInit { 
    form: FormGroup;
    isRegisterMode = false;
    errorMessage: string | null = null;
    emailSent = false;
    isConfirming = false;
    isForgotPasswordModalOpen = false;
    isRecoveryEmailSent = false;
    forgotPasswordEmail: string = '';
    forgotPasswordError: string | null = null;

    constructor(
        private fb: FormBuilder,
        private router: Router,
        private authService: AuthService,
        private route: ActivatedRoute 
    ) {
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
            ]],
            email: ['', []],
            verificationCode: ['', []]
        });
    }

    ngOnInit(): void {
        this.route.queryParams.subscribe(params => {
            const mode = params['mode'];
            if (mode === 'signup') {
                this.isRegisterMode = true;
                this.updateEmailValidators();
            } else if (mode === 'signin') {
                this.isRegisterMode = false;
                this.updateEmailValidators();
            }
        });
    }

    toggleMode() {
        this.isRegisterMode = !this.isRegisterMode;
        this.errorMessage = null;
        this.emailSent = false;
        this.isConfirming = false;
        this.updateEmailValidators();
        this.form.get('email')?.setValue('');
        this.form.get('verificationCode')?.setValue('');
    }

    updateEmailValidators() {
        const emailControl = this.form.get('email');
        const verificationCodeControl = this.form.get('verificationCode');
        if (this.isRegisterMode) {
            emailControl?.setValidators([
                Validators.required,
                Validators.email,
                Validators.maxLength(100),
                this.noWhitespaceValidator
            ]);
            verificationCodeControl?.setValidators([
                Validators.required,
                Validators.pattern(/^[0-9]{4}$/)
            ]);
        } else {
            emailControl?.clearValidators();
            verificationCodeControl?.clearValidators();
        }
        emailControl?.updateValueAndValidity();
        verificationCodeControl?.updateValueAndValidity();
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

    onInputEmail(event: any) {
        const input = event.target;
        this.form.get('email')?.setValue(input.value);
    }

    onInputVerificationCode(event: any) {
        const input = event.target;
        input.value = input.value.replace(/[^0-9]/g, '');
        this.form.get('verificationCode')?.setValue(input.value);
    }

    noWhitespaceValidator(control: any) {
        const isWhitespace = (control.value || '').trim().length === 0;
        const isValid = !isWhitespace;
        return isValid ? null : { whitespace: true };
    }

    confirmEmail() {
        if (this.form.get('email')?.valid) {
            this.isConfirming = true;
            this.errorMessage = null;
            const email = this.form.get('email')?.value;
            this.authService.confirmEmail(email).subscribe({
                next: () => {
                    this.emailSent = true;
                    this.isConfirming = false;
                    this.errorMessage = 'Verification code sent to your email!';
                },
                error: (err: HttpErrorResponse) => {
                    this.isConfirming = false;
                    this.errorMessage = err.error || 'Failed to send verification code. Please try again.';
                }
            });
        }
    }

    openForgotPasswordModal() {
        console.log("Forgot password clicked")
        this.isForgotPasswordModalOpen = true;
        this.isRecoveryEmailSent = false;
        this.forgotPasswordEmail = '';
        this.forgotPasswordError = null;
    }

    closeForgotPasswordModal() {
        this.isForgotPasswordModalOpen = false;
        this.isRecoveryEmailSent = false;
        this.forgotPasswordEmail = '';
        this.forgotPasswordError = null;
    }

    sendResetPasswordLink() {
        const emailPattern = /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$/;
        if (this.forgotPasswordEmail && emailPattern.test(this.forgotPasswordEmail)) {
            this.forgotPasswordError = null;
            this.authService.recoverPassword(this.forgotPasswordEmail).subscribe({
                next: () => {
                    this.isRecoveryEmailSent = true;
                    this.forgotPasswordError = null;
                },
                error: (err: HttpErrorResponse) => {
                    this.forgotPasswordError = err.error || "Faild to send recovery email. Please try again.";
                }
            });
        } else {
            this.forgotPasswordError = "Please enter a valid email address."
        }
    }

    canSubmit(): boolean {
        if (this.isRegisterMode) {
            return this.form.valid && this.emailSent;
        } else {
            return this.form.valid;
        }
    }

    onSubmit() {
        if (this.canSubmit()) {
            const formData = this.form.value;

            if (this.isRegisterMode) {
                const signUpData = {
                    email: formData.email,
                    verificationCode: parseInt(formData.verificationCode, 10),
                    login: formData.login,
                    password: formData.password
                };
                this.authService.signUp(formData).subscribe({
                    next: () => {
                        this.errorMessage = null;
                        this.toggleMode();
                    },
                    error: (err: HttpErrorResponse) => {
                        if (err.status === 409) {
                            this.errorMessage = err.error;
                        } else if (err.status === 400 && err.error.includes('Invalid verification code')) {
                            this.errorMessage = 'Invalid verification code. Please try again.';
                        } else {
                            this.errorMessage = 'An error occurred during registration. Please try again.';
                        }
                    }
                });
            } else {
                const loginData = {
                    login: formData.login,
                    password: formData.password
                };
                this.authService.signIn(loginData).subscribe({
                    next: (res: { token: string, refreshToken: string, expiresIn: number }) => {
                        this.errorMessage = null;
                        this.router.navigate(['/add-image']);
                    },
                    error: (err: HttpErrorResponse) => {
                        if (err.status === 404) {
                            this.errorMessage = err.error;
                        } else if (err.status === 401) {
                            this.errorMessage = err.error;
                        } else {
                            this.errorMessage = 'An error occurred during login. Please try again.';
                        }
                    }
                });
            }
        }
    }
}