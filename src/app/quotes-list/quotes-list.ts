import {
  Component, inject, OnInit, viewChild, ElementRef
} from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { QuotesStore } from '../quotes.store';

@Component({
  selector: 'app-quotes-list',
  standalone: true,
  imports: [],
  templateUrl: './quotes-list.html',
  styleUrl: './quotes-list.css'
})
export class QuotesList implements OnInit {
  // Store holds all state — component just reads and delegates
  store  = inject(QuotesStore);
  auth   = inject(AuthService);
  router = inject(Router);

  searchInputRef = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  ngOnInit() {
    this.store.loadQuotes();     // no-op if cache is fresh
    this.store.loadAllQuotes();  // no-op if already loaded
  }

  onFilterChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.store.setFilter(value);
  }

  clearFilter() {
    this.store.clearFilter();
    const el = this.searchInputRef()?.nativeElement;
    if (el) el.value = '';
  }

  selectQuote(id: number) { this.router.navigate(['/quotes', id]); }

  goToCreate() { this.router.navigate(['/quotes/create']); }

  filterByAuthor(author: string) {
    this.store.filterByAuthor(author);
    const el = this.searchInputRef()?.nativeElement;
    if (el) el.value = author;
  }

  authorColor(author: string): string {
    const palette = ['#6c63ff','#e55a4e','#43b89c','#f5a623','#4a90d9','#9b59b6','#e67e22','#27ae60'];
    const code = (author.charCodeAt(0) ?? 0) + (author.charCodeAt(1) ?? 0);
    return palette[code % palette.length];
  }
}
