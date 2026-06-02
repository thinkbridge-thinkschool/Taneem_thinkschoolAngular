import { Component, inject, signal, output, ElementRef, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { QuotesService } from '../quotes.service';

@Component({
  selector: 'app-quote-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './quote-form.html',
  styleUrl: './quote-form.css'
})
export class QuoteForm {
  private quotesService = inject(QuotesService);

  // Refs to first field — for focus-on-error
  authorInputRef = viewChild<ElementRef<HTMLInputElement>>('authorInput');
  textInputRef   = viewChild<ElementRef<HTMLTextAreaElement>>('textInput');

  // Outputs — parent listens for these
  created   = output<void>();
  cancelled = output<void>();

  // UI state signals
  submitting  = signal(false);
  serverError = signal<string | null>(null);
  success     = signal(false);

  // Reactive form — validators match Quote.Create() constraints exactly:
  // author: required, max 200 chars
  // text:   required, max 1000 chars
  form = new FormGroup({
    author: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(200)]
    }),
    text: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(1000)]
    })
  });

  get author() { return this.form.controls.author; }
  get text()   { return this.form.controls.text; }

  onSubmit() {
    this.form.markAllAsTouched();
    this.serverError.set(null);

    if (this.form.invalid) {
      // Move focus to the first invalid field for keyboard and screen-reader users
      if (this.author.invalid) {
        this.authorInputRef()?.nativeElement.focus();
      } else {
        this.textInputRef()?.nativeElement.focus();
      }
      return;
    }

    this.submitting.set(true);
    const { author, text } = this.form.getRawValue();

    this.quotesService.createQuote(author, text).subscribe({
      next: () => {
        this.submitting.set(false);
        this.success.set(true);
        this.form.reset();
        setTimeout(() => {
          this.success.set(false);
          this.created.emit();
        }, 1500);
      },
      error: err => {
        this.submitting.set(false);
        if (err.status === 401) {
          this.serverError.set('You must be logged in to create a quote.');
        } else if (err.status === 422) {
          this.serverError.set('The server rejected this quote — check author and text.');
        } else {
          this.serverError.set('Something went wrong. Please try again.');
        }
      }
    });
  }

  onCancel() {
    this.form.reset();
    this.serverError.set(null);
    this.success.set(false);
    this.cancelled.emit();
  }
}
