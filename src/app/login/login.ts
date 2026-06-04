import { Component, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private authService = inject(AuthService);
  router      = inject(Router);
  private route       = inject(ActivatedRoute);

  isPage   = input(false);
  loggedIn = output<void>();

  submitting   = signal(false);
  error        = signal<string | null>(null);
  showPassword = signal(false);

  form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    })
  });

  get email()    { return this.form.controls.email; }
  get password() { return this.form.controls.password; }

  onSubmit() {
    this.form.markAllAsTouched();
    this.error.set(null);

    if (this.form.invalid) return;

    this.submitting.set(true);
    const { email, password } = this.form.getRawValue();

    this.authService.login(email, password).subscribe({
      next: () => {
        this.submitting.set(false);
        this.loggedIn.emit();
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/quotes';
        this.router.navigateByUrl(returnUrl);
      },
      error: err => {
        this.submitting.set(false);
        if (err.status === 401) {
          this.error.set('Invalid email or password.');
        } else {
          this.error.set('Could not connect to the server. Try again.');
        }
      }
    });
  }
}
