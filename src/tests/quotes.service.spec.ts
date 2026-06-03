import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { QuotesService, Quote, QuoteDetail } from '../app/quotes.service';

/**
 * Characterization tests — pin the real Week-1 API contract.
 * If the backend changes field names or response shape, these tests break first.
 *
 * Real endpoints tested:
 *   GET /api/quotes/summary?page=1&size=10 → Quote[]
 *   GET /api/quotes/{id}                   → QuoteDetail (200) or empty 404
 */
describe('QuotesService — contract characterization', () => {
  let service: QuotesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        QuotesService,
        provideHttpClient(withInterceptors([])),
        provideHttpClientTesting()
      ]
    });

    service  = TestBed.inject(QuotesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  // ── Happy path ──────────────────────────────────────────────────────────

  it('GET /api/quotes/summary returns an array of Quote with real field names', () => {
    const mockResponse: Quote[] = [
      { id: 1, author: 'Seed', authorInitials: 'S', shortText: 'The only way to do great work is to love what you do.' },
      { id: 2, author: 'Seed', authorInitials: 'S', shortText: 'In the middle of every difficulty lies opportunity.' }
    ];

    let result: Quote[] | undefined;
    service.getSummary(1, 10).subscribe(quotes => result = quotes);

    const req = httpMock.expectOne('http://localhost:5150/api/quotes/summary?page=1&size=10');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);

    // Pins the exact field names — if backend renames shortText → text this breaks
    expect(result).toBeDefined();
    expect(result![0].id).toBe(1);
    expect(result![0].author).toBe('Seed');
    expect(result![0].authorInitials).toBe('S');
    expect(result![0].shortText).toContain('great work');
  });

  it('GET /api/quotes/{id} returns QuoteDetail with id, author, text fields', () => {
    const mockDetail: QuoteDetail = {
      id: 1,
      author: 'Seed',
      text: 'The only way to do great work is to love what you do.'
    };

    let result: QuoteDetail | undefined;
    service.getById(1).subscribe(q => result = q);

    const req = httpMock.expectOne('http://localhost:5150/api/quotes/1');
    expect(req.request.method).toBe('GET');
    req.flush(mockDetail);

    // Pins the exact field names — note: detail uses 'text' not 'shortText'
    expect(result!.id).toBe(1);
    expect(result!.author).toBe('Seed');
    expect(result!.text).toContain('great work');
  });

  // ── 4xx contract ────────────────────────────────────────────────────────

  it('GET /api/quotes/99999 returns 404 with empty body', () => {
    let errorStatus: number | undefined;

    service.getById(99999).subscribe({
      next: () => { throw new Error('should have errored'); },
      error: err => errorStatus = err.status
    });

    const req = httpMock.expectOne('http://localhost:5150/api/quotes/99999');
    req.flush('', { status: 404, statusText: 'Not Found' });

    // Backend returns 404 with NO body — just an empty response
    expect(errorStatus).toBe(404);
  });

  it('GET /api/quotes/summary with invalid page returns 500 ProblemDetails shape', () => {
    const problemDetails = {
      title: 'Server Error',
      status: 500,
      detail: 'Failed to bind parameter "int page" from "abc".'
    };

    let errorBody: typeof problemDetails | undefined;

    service.getSummary(NaN, 10).subscribe({
      next: () => { throw new Error('should have errored'); },
      error: err => errorBody = err.error
    });

    const req = httpMock.expectOne(r => r.url.includes('/api/quotes/summary'));
    req.flush(problemDetails, { status: 500, statusText: 'Server Error' });

    expect(errorBody!.title).toBe('Server Error');
    expect(errorBody!.status).toBe(500);
    expect(errorBody!.detail).toContain('bind parameter');
  });
});
