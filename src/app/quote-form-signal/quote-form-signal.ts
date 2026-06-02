import { Component, computed, inject, output, signal } from '@angular/core';
import { QuotesService } from '../quotes.service';

@Component({
  selector: 'app-quote-form-signal',
  standalone: true,
  imports: [],
  templateUrl: './quote-form-signal.html',
  styleUrl: './quote-form-signal.css'
})
export class QuoteFormSignal {
  private quotesService = inject(QuotesService);

  created   = output<void>();
  cancelled = output<void>();

  // Field value signals — replace FormControl
  authorValue = signal('');
  textValue   = signal('');

  // Touched signals — set on blur, used to show errors only after interaction
  authorTouched = signal(false);
  textTouched   = signal(false);

  // UI state signals
  submitting  = signal(false);
  serverError = signal<string | null>(null);
  success     = signal(false);
  // true after user clicks Submit — shows all errors even if not touched
  submitAttempted = signal(false);

  // Computed validators — replace Validators.required + Validators.maxLength
  // Constraints match Quote.Create() in the backend exactly
  authorErrors = computed(() => {
    const v = this.authorValue().trim();
    if (!v) return 'Author is required.';
    if (v.length > 200) return `Author must be 200 characters or fewer (${v.length}/200).`;
    return null;
  });

  textErrors = computed(() => {
    const v = this.textValue().trim();
    if (!v) return 'Quote text is required.';
    if (v.length > 1000) return `Quote text must be 1000 characters or fewer (${v.length}/1000).`;
    return null;
  });

  // Computed — show error only when touched or submit was attempted
  showAuthorError = computed(() =>
    (this.authorTouched() || this.submitAttempted()) && !!this.authorErrors()
  );

  showTextError = computed(() =>
    (this.textTouched() || this.submitAttempted()) && !!this.textErrors()
  );

  // Computed — form is valid when both fields have no errors
  isValid = computed(() => !this.authorErrors() && !this.textErrors());

  // Computed — character counts for hints
  authorCount = computed(() => this.authorValue().length);
  textCount   = computed(() => this.textValue().length);

  onAuthorInput(event: Event) {
    this.authorValue.set((event.target as HTMLInputElement).value);
  }

  onTextInput(event: Event) {
    this.textValue.set((event.target as HTMLTextAreaElement).value);
  }

  onAuthorBlur() { this.authorTouched.set(true); }
  onTextBlur()   { this.textTouched.set(true); }

  onSubmit() {
    this.submitAttempted.set(true);
    this.serverError.set(null);

    if (!this.isValid()) {
      // Focus first invalid field
      const firstError = document.querySelector('[aria-invalid="true"]') as HTMLElement;
      firstError?.focus();
      return;
    }

    this.submitting.set(true);

    this.quotesService.createQuote(
      this.authorValue().trim(),
      this.textValue().trim()
    ).subscribe({
      next: () => {
        this.submitting.set(false);
        this.success.set(true);
        this.authorValue.set('');
        this.textValue.set('');
        this.authorTouched.set(false);
        this.textTouched.set(false);
        this.submitAttempted.set(false);
        setTimeout(() => { this.success.set(false); this.created.emit(); }, 1500);
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
    this.authorValue.set('');
    this.textValue.set('');
    this.authorTouched.set(false);
    this.textTouched.set(false);
    this.submitAttempted.set(false);
    this.serverError.set(null);
    this.success.set(false);
    this.cancelled.emit();
  }
}
