import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserAnalyticsGrouping, UserListSegment, UserService } from '@app/services/secura/user.service';
import { forkJoin } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';

interface UserSummary {
  total_users: number;
  today_new_users: number;
  google_users: number;
  mobile_users: number;
  email_users: number;
  latest_user_at: string | null;
}

interface AdminUser {
  id: number;
  username: string;
  email: string;
  phone: string | null;
  is_google_login: boolean;
  created_at: string;
  auth_source: 'google' | 'phone' | 'email';
}

interface UserAnalyticsPoint {
  key: string;
  label: string;
  short_label: string;
  count: number;
}

interface UserAnalyticsResponse {
  grouping: UserAnalyticsGrouping;
  periods: number;
  range_start: string;
  range_end: string;
  anchor_date: string;
  anchor_month: string;
  total_users: number;
  peak_users: number;
  series: UserAnalyticsPoint[];
}

@Component({
  selector: 'app-users',
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzCardModule,
    NzEmptyModule,
    NzInputModule,
    NzPaginationModule,
    NzSelectModule,
    NzSpinModule,
    NzTagModule
  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent {
  readonly groupingOptions: Array<{ label: string; value: UserAnalyticsGrouping }> = [
    { label: 'Daily', value: 'day' },
    { label: 'Monthly', value: 'month' }
  ];

  readonly segmentOptions: Array<{ label: string; value: UserListSegment }> = [
    { label: 'All Users', value: 'all' },
    { label: 'Today New Users', value: 'today' }
  ];

  readonly periodOptions = [14, 30, 60, 90, 180];

  loading = true;
  analyticsLoading = false;
  loadError = '';
  searchText = '';
  selectedDate = '';
  selectedGrouping: UserAnalyticsGrouping = 'day';
  selectedAnchorMonth = this.getCurrentMonthValue();
  selectedAnchorDate = this.getTodayValue();
  selectedPeriods = 30;
  pageIndex = 1;
  pageSize = 12;
  total = 0;
  segment: UserListSegment = 'all';

  summary: UserSummary = {
    total_users: 0,
    today_new_users: 0,
    google_users: 0,
    mobile_users: 0,
    email_users: 0,
    latest_user_at: null
  };

  analytics: UserAnalyticsResponse = {
    grouping: 'day',
    periods: 30,
    range_start: '',
    range_end: '',
    anchor_date: this.getTodayValue(),
    anchor_month: this.getCurrentMonthValue(),
    total_users: 0,
    peak_users: 0,
    series: []
  };

  users: AdminUser[] = [];

  constructor(
    private readonly userService: UserService,
    private readonly router: Router
  ) {}

  ngOnInit() {
    this.loadWorkspace();
  }

  get chartPoints(): UserAnalyticsPoint[] {
    return this.analytics.series;
  }

  get chartPeak(): number {
    return Math.max(this.analytics.peak_users, 1);
  }

  get monthPickerMax(): string {
    return this.getCurrentMonthValue();
  }

  get datePickerMax(): string {
    return this.getTodayValue();
  }

  get pageTitle(): string {
    return this.segment === 'today' ? 'Today New Users' : 'Users';
  }

  get chartTotalLabel(): string {
    const unit = this.selectedGrouping === 'day' ? 'days' : 'months';
    return `${this.analytics.total_users} users across ${this.analytics.periods} ${unit}`;
  }

  get chartRangeLabel(): string {
    if (!this.analytics.range_start || !this.analytics.range_end) {
      return '';
    }

    const formatOptions: Intl.DateTimeFormatOptions = this.selectedGrouping === 'day'
      ? { day: 'numeric', month: 'short', year: 'numeric' }
      : { month: 'short', year: 'numeric' };

    return `${this.formatDateLabel(this.analytics.range_start, formatOptions)} to ${this.formatDateLabel(this.analytics.range_end, formatOptions)}`;
  }

  get rangeStart(): number {
    if (!this.total) {
      return 0;
    }

    return (this.pageIndex - 1) * this.pageSize + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.pageIndex * this.pageSize, this.total);
  }

  get groupedUsers(): Array<{ monthLabel: string; users: AdminUser[] }> {
    const groups = new Map<string, { monthLabel: string; users: AdminUser[] }>();

    for (const user of this.users) {
      const date = new Date(user.created_at);
      const monthLabel = Number.isNaN(date.getTime())
        ? 'Unknown Month'
        : new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(date);

      if (!groups.has(monthLabel)) {
        groups.set(monthLabel, { monthLabel, users: [] });
      }

      groups.get(monthLabel)?.users.push(user);
    }

    return Array.from(groups.values());
  }

  loadWorkspace() {
    this.loading = true;
    this.loadError = '';
    const offset = (this.pageIndex - 1) * this.pageSize;

    forkJoin({
      summary: this.userService.getUserSummary(),
      analytics: this.userService.getUserAnalytics(
        this.selectedGrouping,
        this.selectedPeriods,
        this.selectedGrouping === 'month' ? this.selectedAnchorMonth : undefined,
        this.selectedGrouping === 'day' ? this.selectedAnchorDate : undefined
      ),
      users: this.userService.getUsers(this.pageSize, offset, this.searchText.trim(), this.segment, this.selectedDate)
    }).subscribe({
      next: (response: any) => {
        this.summary = response?.summary?.summary || this.summary;
        this.analytics = response?.analytics || this.analytics;
        this.users = response?.users?.results || [];
        this.total = response?.users?.count || 0;
        this.selectedAnchorDate = this.analytics.anchor_date || this.selectedAnchorDate;
        this.selectedAnchorMonth = this.analytics.anchor_month || this.selectedAnchorMonth;
        this.loading = false;
        this.analyticsLoading = false;
      },
      error: (error) => {
        this.loadError = this.formatError(error);
        this.loading = false;
        this.analyticsLoading = false;
      }
    });
  }

  loadAnalytics() {
    this.analyticsLoading = true;
    this.userService.getUserAnalytics(
      this.selectedGrouping,
      this.selectedPeriods,
      this.selectedGrouping === 'month' ? this.selectedAnchorMonth : undefined,
      this.selectedGrouping === 'day' ? this.selectedAnchorDate : undefined
    ).subscribe({
      next: (response: any) => {
        this.analytics = response || this.analytics;
        this.selectedAnchorDate = this.analytics.anchor_date || this.selectedAnchorDate;
        this.selectedAnchorMonth = this.analytics.anchor_month || this.selectedAnchorMonth;
        this.analyticsLoading = false;
      },
      error: (error) => {
        this.loadError = this.formatError(error);
        this.analyticsLoading = false;
      }
    });
  }

  applyFilters() {
    this.pageIndex = 1;
    this.loadWorkspace();
  }

  resetFilters() {
    this.searchText = '';
    this.segment = 'all';
    this.selectedDate = '';
    this.selectedGrouping = 'day';
    this.selectedPeriods = 30;
    this.selectedAnchorDate = this.getTodayValue();
    this.selectedAnchorMonth = this.getCurrentMonthValue();
    this.pageIndex = 1;
    this.loadWorkspace();
  }

  setSegment(segment: UserListSegment) {
    if (segment === this.segment) {
      return;
    }

    this.segment = segment;
    this.selectedDate = segment === 'today' ? this.getTodayValue() : '';
    this.pageIndex = 1;
    this.loadWorkspace();
  }

  openUserDashboard() {
    void this.router.navigate(['/users-insights']);
  }

  onPeriodsChange(value: number) {
    if (!value || value === this.selectedPeriods || this.analyticsLoading) {
      return;
    }

    this.selectedPeriods = value;
    this.loadAnalytics();
  }

  onAnchorDateChange(value: string) {
    if (!value || value === this.selectedAnchorDate || this.analyticsLoading) {
      return;
    }

    this.selectedAnchorDate = value;
    if (this.selectedGrouping === 'day') {
      this.loadAnalytics();
    }
  }

  onAnchorMonthChange(value: string) {
    if (!value || value === this.selectedAnchorMonth || this.analyticsLoading) {
      return;
    }

    this.selectedAnchorMonth = value;
    if (this.selectedGrouping === 'month') {
      this.loadAnalytics();
    }
  }

  moveAnchor(offset: number) {
    if (this.analyticsLoading) {
      return;
    }

    if (this.selectedGrouping === 'day') {
      const current = this.parseDateValue(this.selectedAnchorDate) ?? this.parseDateValue(this.getTodayValue());
      if (!current) {
        return;
      }
      const shifted = new Date(current.getFullYear(), current.getMonth(), current.getDate() + offset * this.selectedPeriods);
      const maxDate = this.parseDateValue(this.getTodayValue());
      if (maxDate && shifted > maxDate) {
        this.selectedAnchorDate = this.getTodayValue();
      } else {
        this.selectedAnchorDate = this.toDateInputValue(shifted);
      }
    } else {
      const current = this.parseMonthValue(this.selectedAnchorMonth) ?? this.parseMonthValue(this.getCurrentMonthValue());
      if (!current) {
        return;
      }
      const shifted = new Date(current.getFullYear(), current.getMonth() + offset * this.selectedPeriods, 1);
      const maxMonth = this.parseMonthValue(this.getCurrentMonthValue());
      if (maxMonth && shifted > maxMonth) {
        this.selectedAnchorMonth = this.getCurrentMonthValue();
      } else {
        this.selectedAnchorMonth = this.toMonthInputValue(shifted);
      }
    }

    this.loadAnalytics();
  }

  setGrouping(grouping: UserAnalyticsGrouping) {
    if (grouping === this.selectedGrouping || this.analyticsLoading) {
      return;
    }

    this.selectedGrouping = grouping;
    if (grouping === 'day') {
      this.selectedAnchorDate = this.analytics.anchor_date || this.getTodayValue();
    } else {
      this.selectedAnchorMonth = this.analytics.anchor_month || this.getCurrentMonthValue();
    }
    this.loadAnalytics();
  }

  onPageIndexChange(page: number) {
    if (page === this.pageIndex || this.loading) {
      return;
    }

    this.pageIndex = page;
    this.loadWorkspace();
  }

  onPageSizeChange(size: number) {
    if (size === this.pageSize || this.loading) {
      return;
    }

    this.pageSize = size;
    this.pageIndex = 1;
    this.loadWorkspace();
  }

  getBarHeight(count: number): string {
    const height = (count / this.chartPeak) * 100;
    return `${Math.max(height, count > 0 ? 12 : 6)}%`;
  }

  formatBarAriaLabel(point: UserAnalyticsPoint): string {
    const suffix = this.selectedGrouping === 'day' ? 'users that day' : 'users that month';
    return `${point.label}: ${point.count} ${suffix}`;
  }

  formatUserSource(user: AdminUser): string {
    if (user.auth_source === 'google') {
      return 'Google';
    }
    if (user.auth_source === 'phone') {
      return 'Mobile';
    }
    return 'Email';
  }

  private getTodayValue(): string {
    return this.toDateInputValue(new Date());
  }

  private getCurrentMonthValue(): string {
    return this.toMonthInputValue(new Date());
  }

  private toMonthInputValue(value: Date): string {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    return `${year}-${month}`;
  }

  private toDateInputValue(value: Date): string {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseMonthValue(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})$/.exec(value);
    if (!match) {
      return null;
    }

    const [, year, month] = match;
    return new Date(Number(year), Number(month) - 1, 1);
  }

  private parseDateValue(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
      return null;
    }

    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  private formatDateLabel(value: string, options: Intl.DateTimeFormatOptions): string {
    const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value;
    const date = new Date(normalizedValue);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-IN', options).format(date);
  }

  private formatError(error: unknown): string {
    if (typeof error === 'string') {
      return error;
    }

    return 'Unable to load user workspace data.';
  }
}
