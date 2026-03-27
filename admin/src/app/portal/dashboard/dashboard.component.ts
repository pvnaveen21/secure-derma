import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrderAnalyticsGrouping, OrderService } from '@app/services/secura/order.service';
import { UserService } from '@app/services/secura/user.service';
import { forkJoin } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSpinModule } from 'ng-zorro-antd/spin';

interface DashboardSummary {
  total_orders: number;
  total_revenue: number;
  pending_orders: number;
  latest_paid_at: string | null;
}

interface UserSummary {
  total_users: number;
  today_new_users: number;
  google_users: number;
  manual_users: number;
  latest_user_at: string | null;
}

interface DashboardOrder {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  status: string;
  amount_rupees: number;
  item_count: number;
  updated_at: string;
}

interface DashboardUser {
  id: number;
  username: string;
  email: string;
  phone: string | null;
  is_google_login: boolean;
  created_at: string;
}

interface DashboardListResponse<T> {
  count: number;
  results: T[];
}

interface OrderAnalyticsPoint {
  key: string;
  label: string;
  short_label: string;
  count: number;
}

interface OrderAnalyticsResponse {
  grouping: OrderAnalyticsGrouping;
  periods: number;
  range_start: string;
  range_end: string;
  total_orders: number;
  peak_orders: number;
  series: OrderAnalyticsPoint[];
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule, NzButtonModule, NzCardModule, NzEmptyModule, NzPaginationModule, NzSpinModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  providers: []
})
export class DashboardComponent {
  readonly groupingOptions: Array<{ label: string; value: OrderAnalyticsGrouping }> = [
    { label: 'Daily', value: 'day' },
    { label: 'Monthly', value: 'month' }
  ];

  loading = true;
  analyticsLoading = false;
  recentOrdersLoading = false;
  loadError = '';
  selectedGrouping: OrderAnalyticsGrouping = 'day';
  selectedAnchorMonth = this.getCurrentMonthValue();
  recentOrdersPageIndex = 1;
  recentOrdersPageSize = 10;
  recentOrdersTotal = 0;
  readonly recentOrdersPageSizeOptions = [10, 15, 25, 50];

  summary: DashboardSummary = {
    total_orders: 0,
    total_revenue: 0,
    pending_orders: 0,
    latest_paid_at: null
  };
  userSummary: UserSummary = {
    total_users: 0,
    today_new_users: 0,
    google_users: 0,
    manual_users: 0,
    latest_user_at: null
  };
  analytics: OrderAnalyticsResponse = {
    grouping: 'day',
    periods: 14,
    range_start: '',
    range_end: '',
    total_orders: 0,
    peak_orders: 0,
    series: []
  };
  todayOrders: DashboardOrder[] = [];
  todayOrdersCount = 0;
  todayUsers: DashboardUser[] = [];
  todayUsersCount = 0;
  recentOrders: DashboardOrder[] = [];

  constructor(
    private readonly orderService: OrderService,
    private readonly userService: UserService
  ) {}

  ngOnInit() {
    this.loadDashboard();
  }

  get chartPoints(): OrderAnalyticsPoint[] {
    return this.analytics.series;
  }

  get chartPeak(): number {
    return Math.max(this.analytics.peak_orders, 1);
  }

  get todayLabel(): string {
    return this.formatDateLabel(this.getTodayValue(), { day: 'numeric', month: 'short', year: 'numeric' });
  }

  get chartTotalLabel(): string {
    const unit = this.selectedGrouping === 'day' ? 'days' : 'months';
    return `${this.analytics.total_orders} paid orders across the last ${this.analytics.periods} ${unit}`;
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

  get monthPickerMax(): string {
    return this.getCurrentMonthValue();
  }

  get recentOrdersRangeStart(): number {
    if (!this.recentOrdersTotal) {
      return 0;
    }

    return (this.recentOrdersPageIndex - 1) * this.recentOrdersPageSize + 1;
  }

  get recentOrdersRangeEnd(): number {
    return Math.min(this.recentOrdersPageIndex * this.recentOrdersPageSize, this.recentOrdersTotal);
  }

  loadDashboard() {
    this.loading = true;
    this.loadError = '';
    const recentOffset = (this.recentOrdersPageIndex - 1) * this.recentOrdersPageSize;

    forkJoin({
      summary: this.orderService.getOrderSummary(),
      userSummary: this.userService.getUserSummary(),
      analytics: this.orderService.getOrderAnalytics(
        this.selectedGrouping,
        undefined,
        this.selectedGrouping === 'month' ? this.selectedAnchorMonth : undefined
      ),
      todayOrders: this.orderService.getOrders(25, 0, 'paid', '', this.getTodayValue()),
      todayUsers: this.userService.getUsers(8, 0, '', 'today', this.getTodayValue()),
      recentOrders: this.orderService.getOrders(this.recentOrdersPageSize, recentOffset, 'paid')
    }).subscribe({
      next: (response: any) => {
        this.summary = response?.summary?.summary || this.summary;
        this.userSummary = response?.userSummary?.summary || this.userSummary;
        this.analytics = response?.analytics || this.analytics;
        this.todayOrders = response?.todayOrders?.results || [];
        this.todayOrdersCount = response?.todayOrders?.count || 0;
        this.todayUsers = response?.todayUsers?.results || [];
        this.todayUsersCount = response?.todayUsers?.count || 0;
        this.recentOrders = response?.recentOrders?.results || [];
        this.recentOrdersTotal = response?.recentOrders?.count || 0;
        this.loading = false;
        this.analyticsLoading = false;
        this.recentOrdersLoading = false;
      },
      error: (error) => {
        this.loadError = this.formatError(error);
        this.loading = false;
        this.analyticsLoading = false;
        this.recentOrdersLoading = false;
      }
    });
  }

  loadAnalytics() {
    this.analyticsLoading = true;
    this.loadError = '';

    this.orderService.getOrderAnalytics(
      this.selectedGrouping,
      undefined,
      this.selectedGrouping === 'month' ? this.selectedAnchorMonth : undefined
    ).subscribe({
      next: (response: any) => {
        this.analytics = response || this.analytics;
        this.analyticsLoading = false;
      },
      error: (error) => {
        this.loadError = this.formatError(error);
        this.analyticsLoading = false;
      }
    });
  }

  loadRecentOrders() {
    this.recentOrdersLoading = true;
    this.loadError = '';
    const recentOffset = (this.recentOrdersPageIndex - 1) * this.recentOrdersPageSize;

    this.orderService.getOrders(this.recentOrdersPageSize, recentOffset, 'paid').subscribe({
      next: (response: any) => {
        this.recentOrders = response?.results || [];
        this.recentOrdersTotal = response?.count || 0;
        this.recentOrdersLoading = false;
      },
      error: (error) => {
        this.loadError = this.formatError(error);
        this.recentOrdersLoading = false;
      }
    });
  }

  setGrouping(grouping: OrderAnalyticsGrouping) {
    if (this.selectedGrouping === grouping || this.loading || this.analyticsLoading) {
      return;
    }

    this.selectedGrouping = grouping;
    if (grouping === 'month' && !this.selectedAnchorMonth) {
      this.selectedAnchorMonth = this.getCurrentMonthValue();
    }
    this.loadAnalytics();
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

  moveAnchorMonth(offset: number) {
    if (this.analyticsLoading) {
      return;
    }

    const current = this.parseMonthValue(this.selectedAnchorMonth) ?? this.parseMonthValue(this.getCurrentMonthValue());
    if (!current) {
      return;
    }

    const shifted = new Date(current.getFullYear(), current.getMonth() + offset, 1);
    const maxMonth = this.parseMonthValue(this.getCurrentMonthValue());
    if (maxMonth && shifted > maxMonth) {
      this.selectedAnchorMonth = this.getCurrentMonthValue();
    } else {
      this.selectedAnchorMonth = this.toMonthInputValue(shifted);
    }

    if (this.selectedGrouping === 'month') {
      this.loadAnalytics();
    }
  }

  onRecentOrdersPageIndexChange(page: number) {
    if (page === this.recentOrdersPageIndex || this.loading || this.recentOrdersLoading) {
      return;
    }

    this.recentOrdersPageIndex = page;
    this.loadRecentOrders();
  }

  onRecentOrdersPageSizeChange(size: number) {
    if (size === this.recentOrdersPageSize || this.loading || this.recentOrdersLoading) {
      return;
    }

    this.recentOrdersPageSize = size;
    this.recentOrdersPageIndex = 1;
    this.loadRecentOrders();
  }

  getBarHeight(count: number): string {
    const height = (count / this.chartPeak) * 100;
    return `${Math.max(height, count > 0 ? 12 : 6)}%`;
  }

  formatBarAriaLabel(point: OrderAnalyticsPoint): string {
    const suffix = this.selectedGrouping === 'day' ? 'orders that day' : 'orders that month';
    return `${point.label}: ${point.count} ${suffix}`;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  formatUserSource(user: DashboardUser): string {
    return user.is_google_login ? 'Google' : 'Email or phone';
  }

  private getTodayValue(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = `${today.getMonth() + 1}`.padStart(2, '0');
    const day = `${today.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getCurrentMonthValue(): string {
    return this.toMonthInputValue(new Date());
  }

  private toMonthInputValue(value: Date): string {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    return `${year}-${month}`;
  }

  private parseMonthValue(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})$/.exec(value);
    if (!match) {
      return null;
    }

    const [, year, month] = match;
    return new Date(Number(year), Number(month) - 1, 1);
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

    return 'Unable to load admin dashboard data.';
  }
}
