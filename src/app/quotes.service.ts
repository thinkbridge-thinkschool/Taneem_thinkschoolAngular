import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Quote {
  id: number;
  author: string;
  authorInitials: string;
  shortText: string;
}

// Detail model — matches GET /api/quotes/{id} response fields exactly
export interface QuoteDetail {
  id: number;
  author: string;
  text: string; // full text — different from shortText in the summary
}

@Injectable({ providedIn: 'root' })
export class QuotesService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:5150';

  getSummary(page: number, size: number) {
    return this.http.get<Quote[]>(
      `${this.baseUrl}/api/quotes/summary?page=${page}&size=${size}`
    );
  }

  getById(id: number) {
    return this.http.get<QuoteDetail>(`${this.baseUrl}/api/quotes/${id}`);
  }
}
