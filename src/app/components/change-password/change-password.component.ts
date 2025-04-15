import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-change-password',
    imports: [
        CommonModule,
        ReactiveFormsModule
    ],
    templateUrl: './change-password.component.html',
    styleUrl: './change-password.component.scss'
})
export class ChangePasswordComponent {
    form: FormGroup;
    errorMessage: string | null = null;
    successMessage: string | null = null;
    isDialogOpen = signal<boolean>(false);

    constructor (
        private fb: FormBuilder,
        private router: Router,
        private authService: AuthService,
        private route: ActivatedRoute
    ) {
        this.form = this.fb.group({
            currentPassword: ['', [
                Validators.required,
                Validators.pattern(/^[a-zA-Z0-9]+$/),
                Validators.minLength(6),
                Validators.maxLength(50),
                this.notWhitespaceValidator
            ]],
            newPassword: ['', [
                Validators.required,
                Validators.pattern(/^[a-zA-Z0-9]+$/),
                Validators.minLength(6),
                Validators.maxLength(50),
                this.notWhitespaceValidator
            ]]
        });
    }

    notWhitespaceValidator(control: any) {
        const isWhitespace = (control.value || '').trim().length === 0;
        const isValid = !isWhitespace;
        return isValid ? null : { whitespace: true };
    }

    openChangePasswordDialog(): void {
        this.isDialogOpen.set(true);
    }

    closeChangePasswordDialog(): void {
        this.isDialogOpen.set(false);
        this.form.reset();
        this.errorMessage = null;
        this.successMessage = null;
    }

    onInputCurrentPassword(event: any) {
        const input = event.target;
        input.value = input.value.replace(/[^a-zA-Z0-9]/g, '');
        this.form.get('currentPassword')?.setValue(input.value);
    }

    onInputNewPassword(event: any) {
        const input = event.target;
        input.value = input.value.replace(/[^a-zA-Z0-9]/g, '');
        this.form.get('newPassword')?.setValue(input.value);
    }

    onSubmit() {
        if (this.form.valid) {
            const formData = this.form.value;

            this.authService.changePassword(formData).subscribe({
                next: () => {
                    this.errorMessage = null;
                    this.successMessage = 'Password successfully changed';
                    this.form.reset();
                },
                error: (err: HttpErrorResponse) => {
                    this.errorMessage = err.message || 'An error occured. Please try again.';
                    this.successMessage = null;
                    this.form.reset();
                }
            });
        }
    }
}
