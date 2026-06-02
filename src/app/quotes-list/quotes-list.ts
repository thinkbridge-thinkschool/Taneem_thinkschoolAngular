import {
  Component, computed, effect, inject, signal, OnInit, viewChild, ElementRef
} from '@angular/core';
import { Quote, QuoteDetail, QuotesService } from '../quotes.service';

@Component({
  selector: 'app-quotes-list',
  standalone: true,
  imports: [],
  templateUrl: './quotes-list.html',
  styleUrl: './quotes-list.css'
})
export class QuotesList implements OnInit {
  private quotesService = inject(QuotesService);

  // Template ref for the search input — used to clear value imperatively
  searchInputRef = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  readonly pageSize = 10;

  // Signal 1 — paginated quotes for browse mode
  browseQuotes = signal<Quote[]>([]);

  // Signal 2 — all quotes loaded once for search mode (lazy, fetched on first search)
  allQuotes = signal<Quote[]>([]);

  // Signal 3 — user's filter input
  filterText = signal('');

  // Signal 4 — current page number
  page = signal(1);

  // Signal 5 — loading state (browse)
  loading = signal(false);

  // Signal 6 — loading state (first-time search load)
  searchLoading = signal(false);

  // Signal 7 — true when browse page returned fewer items than pageSize → no more pages
  isLastPage = signal(false);

  // Signal — set when the initial browse fetch fails (backend down)
  browseError = signal<string | null>(null);

  // Signal 8 — current page within search results (client-side)
  searchPage = signal(1);

  // Detail signals
  selectedId    = signal<number | null>(null);
  detail        = signal<QuoteDetail | null>(null);
  detailLoading = signal(false);
  detailError   = signal<string | null>(null);

  // Race condition guard — incremented on every selectQuote() call
  private detailRequestId = 0;

  // Computed — are we in search mode?
  isSearchMode = computed(() => this.filterText().trim().length > 0);

  // Computed — all quotes matching the filter (full unsliced list)
  filteredQuotes = computed(() => {
    if (this.isSearchMode()) {
      const text = this.filterText().toLowerCase();
      return this.allQuotes().filter(q =>
        q.author.toLowerCase().includes(text) ||
        q.shortText.toLowerCase().includes(text)
      );
    }
    return this.browseQuotes();
  });

  // Computed — total search result count (before pagination)
  totalFilteredCount = computed(() => this.filteredQuotes().length);

  // Computed — total pages in search mode
  totalSearchPages = computed(() =>
    Math.ceil(this.totalFilteredCount() / this.pageSize) || 1
  );

  // Computed — total pages in browse mode (known once allQuotes is loaded)
  totalBrowsePages = computed(() =>
    this.allQuotes().length > 0
      ? Math.ceil(this.allQuotes().length / this.pageSize)
      : null
  );

  // Computed — the slice shown on the current search page
  visibleQuotes = computed(() => {
    if (!this.isSearchMode()) return this.filteredQuotes();
    const start = (this.searchPage() - 1) * this.pageSize;
    return this.filteredQuotes().slice(start, start + this.pageSize);
  });

  // Computed — count shown on current page
  displayCount = computed(() => this.visibleQuotes().length);

  // Computed — true when nothing to show (not mid-load)
  isEmpty = computed(() =>
    !this.loading() && !this.searchLoading() && this.filteredQuotes().length === 0
  );

  // Computed — per-author breakdown across ALL filtered results (not just current page)
  authorStats = computed(() => {
    if (!this.isSearchMode() || this.filteredQuotes().length === 0) return [];
    const map = new Map<string, number>();
    this.filteredQuotes().forEach(q => map.set(q.author, (map.get(q.author) ?? 0) + 1));
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([author, count]) => ({ author, count }));
  });

  constructor() {
    // Reset search page whenever the filter text changes
    effect(() => {
      this.filterText();
      this.searchPage.set(1);
    });

    effect(() => {
      console.log(
        `Filter: "${this.filterText()}" → showing ${this.totalFilteredCount()} of ` +
        `${this.isSearchMode() ? this.allQuotes().length : this.browseQuotes().length} quotes`
      );
    });
  }

  ngOnInit() {
    this.loadQuotes();
    this.loadAllQuotes(); // background fetch for total count + search
  }

  loadQuotes() {
    this.loading.set(true);
    this.browseError.set(null);
    this.quotesService.getSummary(this.page(), this.pageSize).subscribe({
      next: quotes => {
        this.browseQuotes.set(quotes);
        this.isLastPage.set(quotes.length < this.pageSize);
        this.loading.set(false);
      },
      error: () => {
        this.browseError.set('Could not reach the server. Is the backend running?');
        this.loading.set(false);
      }
    });
  }

  // Fetches all quotes once — used for total page count and search filtering
  loadAllQuotes() {
    if (this.allQuotes().length > 0) return;
    this.searchLoading.set(true);
    this.quotesService.getSummary(1, 500).subscribe({
      next: quotes => { this.allQuotes.set(quotes); this.searchLoading.set(false); },
      error: ()    => { this.searchLoading.set(false); }
    });
  }

  onFilterChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.filterText.set(value);
    if (value.trim()) this.loadAllQuotes();
  }

  clearFilter() {
    this.filterText.set('');
    const el = this.searchInputRef()?.nativeElement;
    if (el) el.value = '';
  }

  // Browse mode pagination (API-driven)
  nextPage() {
    if (!this.isLastPage()) { this.page.update(p => p + 1); this.loadQuotes(); }
  }

  prevPage() {
    if (this.page() > 1) { this.page.update(p => p - 1); this.loadQuotes(); }
  }

  // Search mode pagination (client-side slice)
  nextSearchPage() {
    if (this.searchPage() < this.totalSearchPages()) this.searchPage.update(p => p + 1);
  }

  prevSearchPage() {
    if (this.searchPage() > 1) this.searchPage.update(p => p - 1);
  }

  selectQuote(id: number) {
    this.selectedId.set(id);
    this.detail.set(null);
    this.detailError.set(null);

    const requestId = ++this.detailRequestId;
    this.detailLoading.set(true);

    this.quotesService.getById(id).subscribe({
      next: quote => {
        if (requestId !== this.detailRequestId) return; // stale — a newer click already fired
        this.detail.set(quote);
        this.detailLoading.set(false);
      },
      error: () => {
        if (requestId !== this.detailRequestId) return;
        this.detailError.set('Could not load quote. Check your connection and try again.');
        this.detailLoading.set(false);
      }
    });
  }

  closeDetail() {
    this.selectedId.set(null);
    this.detail.set(null);
    this.detailError.set(null);
    this.detailLoading.set(false);
  }

  // Deterministic color per author — same author always gets the same color
  authorColor(author: string): string {
    const palette = [
      '#6c63ff', '#e55a4e', '#43b89c', '#f5a623',
      '#4a90d9', '#9b59b6', '#e67e22', '#27ae60'
    ];
    const code = (author.charCodeAt(0) ?? 0) + (author.charCodeAt(1) ?? 0);
    return palette[code % palette.length];
  }
}
