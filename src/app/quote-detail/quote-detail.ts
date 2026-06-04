import { Component, inject, input, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { QuoteDetail as QuoteDetailModel, QuotesService } from '../quotes.service';

@Component({
  selector: 'app-quote-detail',
  standalone: true,
  imports: [],
  templateUrl: './quote-detail.html',
  styleUrl: './quote-detail.css'
})
export class QuoteDetail implements OnInit {
  private quotesService = inject(QuotesService);
  private router        = inject(Router);

  // withComponentInputBinding() binds :id from the URL directly to this input
  id = input<string>('');

  detail  = signal<QuoteDetailModel | null>(null);
  loading = signal(true);
  error   = signal<string | null>(null);

  ngOnInit() {
    const idParam = this.id();

    if (!idParam || !/^\d+$/.test(idParam)) {
      this.error.set('Invalid quote ID in the URL.');
      this.loading.set(false);
      return;
    }

    this.quotesService.getById(Number(idParam)).subscribe({
      next: quote => {
        this.detail.set(quote);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err?.message ?? 'Could not load quote.');
        this.loading.set(false);
      }
    });
  }

  goBack() { this.router.navigate(['/quotes']); }

  authorColor(author: string): string {
    const palette = ['#6c63ff','#e55a4e','#43b89c','#f5a623','#4a90d9','#9b59b6','#e67e22','#27ae60'];
    const code = (author.charCodeAt(0) ?? 0) + (author.charCodeAt(1) ?? 0);
    return palette[code % palette.length];
  }
}
