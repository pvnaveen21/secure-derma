import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map } from 'rxjs';
import { InterfaceService } from '../core/interface.service';

export type VisitAnalyticsGrouping = 'day' | 'month';

@Injectable({
  providedIn: 'root'
})
export class VisitService extends InterfaceService {

  constructor(http: HttpClient) {
    super('/visits', http);
  }

  getVisitSummary() {
    return this.http.get(
      this.getApiUrl('/visits/summary/'),
      this.getHttpOptions()
    ).pipe(
      map((res) => res),
      catchError(this.handleError)
    );
  }

  getVisitAnalytics(grouping: VisitAnalyticsGrouping = 'day', periods?: number, anchorMonth?: string, anchorDate?: string) {
    return this.http.get(
      this.getApiUrl('/visits/analytics/', {
        grouping,
        ...(periods ? { periods } : {}),
        ...(anchorMonth ? { anchor_month: anchorMonth } : {}),
        ...(anchorDate ? { anchor_date: anchorDate } : {})
      }),
      this.getHttpOptions()
    ).pipe(
      map((res) => res),
      catchError(this.handleError)
    );
  }

  getTopPages(limit = 8, searchText = '', visitedOn = '') {
    return this.http.get(
      this.getApiUrl('/visits/pages/', {
        limit,
        ...(searchText ? { searchText } : {}),
        ...(visitedOn ? { visited_on: visitedOn } : {})
      }),
      this.getHttpOptions()
    ).pipe(
      map((res) => res),
      catchError(this.handleError)
    );
  }

  getVisits(limit = 12, offset = 0, searchText = '', visitedOn = '') {
    return this.http.get(
      this.getApiUrl('/visits/', {
        limit,
        offset,
        ...(searchText ? { searchText } : {}),
        ...(visitedOn ? { visited_on: visitedOn } : {})
      }),
      this.getHttpOptions()
    ).pipe(
      map((res) => res),
      catchError(this.handleError)
    );
  }
}
