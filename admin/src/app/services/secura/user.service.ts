import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map } from 'rxjs';
import { InterfaceService } from '../core/interface.service';

export type UserAnalyticsGrouping = 'day' | 'month';
export type UserListSegment = 'all' | 'today';

@Injectable({
  providedIn: 'root'
})
export class UserService extends InterfaceService {
  constructor(http: HttpClient) {
    super('/users', http);
  }

  getUserSummary() {
    return this.http.get(
      this.getApiUrl('/users/summary/'),
      this.getHttpOptions()
    ).pipe(
      map((res) => res),
      catchError(this.handleError)
    );
  }

  getUserAnalytics(grouping: UserAnalyticsGrouping = 'day', periods?: number, anchorMonth?: string, anchorDate?: string) {
    return this.http.get(
      this.getApiUrl('/users/analytics/', {
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

  getUsers(limit = 10, offset = 0, searchText = '', segment: UserListSegment = 'all', createdOn = '') {
    return this.http.get(
      this.getApiUrl('/users/', {
        limit,
        offset,
        segment,
        ...(searchText ? { searchText } : {}),
        ...(createdOn ? { created_on: createdOn } : {})
      }),
      this.getHttpOptions()
    ).pipe(
      map((res) => res),
      catchError(this.handleError)
    );
  }
}
