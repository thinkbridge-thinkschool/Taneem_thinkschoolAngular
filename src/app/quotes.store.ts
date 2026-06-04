import { computed, inject, Injectable, signal } from '@angular/core';
import { EMPTY, expand, reduce } from 'rxjs';
import { Quote, QuotesService } from './quotes.service';

/**
 * QuotesStore — signal-based state service.
 *
 * Lives at root scope (providedIn: 'root') so state survives navigation.
 * QuotesList reads from here instead of managing its own signals — navigating
 * away and back does not trigger a re-fetch if data is already loaded.
 */
@Injectable({ providedIn: 'root' })
export class QuotesStore {
  private quotesService = inject(QuotesService);

  readonly pageSize = 10;

  // ── Raw signals ────────────────────────────────────────────────────────────
  browseQuotes  = signal<Quote[]>([]);
  allQuotes     = signal<Quote[]>([]);
  filterText    = signal('');
  page          = signal(1);
  loading       = signal(false);
  searchLoading = signal(false);
  isLastPage    = signal(false);
  browseError   = signal<string | null>(null);
  searchPage    = signal(1);

  // Cache flag — true after first successful browse fetch
  private browseLoaded = false;

  // ── Computeds ──────────────────────────────────────────────────────────────
  isSearchMode = computed(() => this.filterText().trim().length > 0);

  filteredQuotes = computed(() => {
    if (this.isSearchMode()) {
      const text = this.filterText().toLowerCase();
      return this.allQuotes()
        .filter(q => q.author.toLowerCase().startsWith(text))
        .sort((a, b) => a.author.localeCompare(b.author));
    }
    return this.browseQuotes();
  });

  totalFilteredCount = computed(() => this.filteredQuotes().length);

  totalSearchPages = computed(() =>
    Math.ceil(this.totalFilteredCount() / this.pageSize) || 1
  );

  totalBrowsePages = computed(() =>
    this.allQuotes().length > 0
      ? Math.ceil(this.allQuotes().length / this.pageSize)
      : null
  );

  visibleQuotes = computed(() => {
    if (!this.isSearchMode()) return this.filteredQuotes();
    const start = (this.searchPage() - 1) * this.pageSize;
    return this.filteredQuotes().slice(start, start + this.pageSize);
  });

  displayCount = computed(() => this.visibleQuotes().length);

  isEmpty = computed(() =>
    !this.loading() && !this.searchLoading() && this.filteredQuotes().length === 0
  );

  authorStats = computed(() => {
    if (!this.isSearchMode() || this.filteredQuotes().length === 0) return [];
    const map = new Map<string, number>();
    this.filteredQuotes().forEach(q => map.set(q.author, (map.get(q.author) ?? 0) + 1));
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([author, count]) => ({ author, count }));
  });

  // ── Methods ────────────────────────────────────────────────────────────────

  loadQuotes(force = false) {
    // Skip re-fetch if data is cached and caller didn't force a refresh
    if (this.browseLoaded && !force) return;

    this.loading.set(true);
    this.browseError.set(null);

    this.quotesService.getSummary(this.page(), this.pageSize).subscribe({
      next: quotes => {
        this.browseQuotes.set(quotes);
        this.isLastPage.set(quotes.length < this.pageSize);
        this.loading.set(false);
        this.browseLoaded = true;
      },
      error: err => {
        this.browseError.set(err?.message ?? 'Could not reach the server.');
        this.loading.set(false);
      }
    });
  }

  loadAllQuotes() {
    if (this.allQuotes().length > 0) return;
    this.searchLoading.set(true);

    const fetchSize = 100;
    let currentPage = 1;

    this.quotesService.getSummary(currentPage, fetchSize).pipe(
      expand(quotes => {
        if (quotes.length < fetchSize) return EMPTY;
        currentPage++;
        return this.quotesService.getSummary(currentPage, fetchSize);
      }),
      reduce((acc, quotes) => [...acc, ...quotes], [] as Quote[])
    ).subscribe({
      next: quotes => { this.allQuotes.set(quotes); this.searchLoading.set(false); },
      error: ()    => { this.searchLoading.set(false); }
    });
  }

  // Bust cache after creating a quote so the list refreshes
  bustCache() {
    this.browseLoaded = false;
    this.allQuotes.set([]);
    this.page.set(1);
  }

  nextPage() {
    if (!this.isLastPage()) {
      this.page.update(p => p + 1);
      this.browseLoaded = false;
      this.loadQuotes(true);
    }
  }

  prevPage() {
    if (this.page() > 1) {
      this.page.update(p => p - 1);
      this.browseLoaded = false;
      this.loadQuotes(true);
    }
  }

  nextSearchPage() {
    if (this.searchPage() < this.totalSearchPages()) this.searchPage.update(p => p + 1);
  }

  prevSearchPage() {
    if (this.searchPage() > 1) this.searchPage.update(p => p - 1);
  }

  setFilter(value: string) {
    this.filterText.set(value);
    this.searchPage.set(1);
    if (value.trim()) this.loadAllQuotes();
  }

  clearFilter() { this.filterText.set(''); }

  filterByAuthor(author: string) { this.filterText.set(author); }
}
