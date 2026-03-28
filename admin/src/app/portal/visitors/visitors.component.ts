import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VisitAnalyticsGrouping, VisitService } from '@app/services/secura/visit.service';
import { forkJoin } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

interface VisitSummary {
  total_visits: number;
  today_visits: number;
  unique_visitors: number;
  today_unique_visitors: number;
  tracked_pages: number;
  logged_in_visits: number;
  guest_visits: number;
  today_logged_in_visits: number;
  today_guest_visits: number;
  mobile_visitors: number;
  today_mobile_visitors: number;
  tablet_visitors: number;
  today_tablet_visitors: number;
  desktop_visitors: number;
  today_desktop_visitors: number;
  other_device_visitors: number;
  today_other_device_visitors: number;
  latest_visit_at: string | null;
}

interface VisitAnalyticsPoint {
  key: string;
  label: string;
  short_label: string;
  visits: number;
  unique_visitors: number;
}

interface VisitAnalyticsResponse {
  grouping: VisitAnalyticsGrouping;
  periods: number;
  range_start: string;
  range_end: string;
  anchor_date: string;
  anchor_month: string;
  total_visits: number;
  range_unique_visitors: number;
  peak_visits: number;
  peak_unique_visitors: number;
  series: VisitAnalyticsPoint[];
}

interface VisitPageSummary {
  path: string;
  visits: number;
  unique_visitors: number;
  latest_visit_at: string;
}

interface AdminVisit {
  id: number;
  path: string;
  visitor_key: string;
  referrer: string;
  user_agent: string;
  created_at: string;
  user_email: string;
  visitor_type: 'logged_in' | 'guest';
  device_type: 'mobile' | 'tablet' | 'desktop' | 'other';
  device_label: string;
}

@Component({
  selector: 'app-visitors',
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
    NzTagModule,
    NzToolTipModule
  ],
  templateUrl: './visitors.component.html',
  styleUrl: './visitors.component.scss'
})
export class VisitorsComponent {
  readonly groupingOptions: Array<{ label: string; value: VisitAnalyticsGrouping }> = [
    { label: 'Daily', value: 'day' },
    { label: 'Monthly', value: 'month' }
  ];

  readonly periodOptions = [14, 30, 60, 90, 180];

  loading = true;
  analyticsLoading = false;
  loadError = '';
  searchText = '';
  selectedDate = '';
  selectedGrouping: VisitAnalyticsGrouping = 'day';
  selectedAnchorMonth = this.getCurrentMonthValue();
  selectedAnchorDate = this.getTodayValue();
  selectedPeriods = 30;
  pageIndex = 1;
  pageSize = 12;
  total = 0;

  summary: VisitSummary = {
    total_visits: 0,
    today_visits: 0,
    unique_visitors: 0,
    today_unique_visitors: 0,
    tracked_pages: 0,
    logged_in_visits: 0,
    guest_visits: 0,
    today_logged_in_visits: 0,
    today_guest_visits: 0,
    mobile_visitors: 0,
    today_mobile_visitors: 0,
    tablet_visitors: 0,
    today_tablet_visitors: 0,
    desktop_visitors: 0,
    today_desktop_visitors: 0,
    other_device_visitors: 0,
    today_other_device_visitors: 0,
    latest_visit_at: null
  };

  analytics: VisitAnalyticsResponse = {
    grouping: 'day',
    periods: 30,
    range_start: '',
    range_end: '',
    anchor_date: this.getTodayValue(),
    anchor_month: this.getCurrentMonthValue(),
    total_visits: 0,
    range_unique_visitors: 0,
    peak_visits: 0,
    peak_unique_visitors: 0,
    series: []
  };

  topPages: VisitPageSummary[] = [];
  visits: AdminVisit[] = [];

  constructor(private readonly visitService: VisitService) {}

  ngOnInit() {
    this.loadWorkspace();
  }

  get chartPoints(): VisitAnalyticsPoint[] {
    return this.analytics.series;
  }

  get chartPeak(): number {
    return Math.max(this.analytics.peak_visits, 1);
  }

  get monthPickerMax(): string {
    return this.getCurrentMonthValue();
  }

  get datePickerMax(): string {
    return this.getTodayValue();
  }

  get chartTotalLabel(): string {
    const unit = this.selectedGrouping === 'day' ? 'days' : 'months';
    return `${this.analytics.total_visits} visits across ${this.analytics.periods} ${unit}`;
  }

  get chartRangeLabel(): string {
    if (!this.analytics.range_start || !this.analytics.range_end) {
      return '';
    }

    const formatOptions: Intl.DateTimeFormatOptions = this.selectedGrouping === 'day'
      ? { day: 'numeric', month: 'short', year: 'numeric' }
      : { month: 'short', year: 'numeric' };

    const uniqueVisitors = `${this.analytics.range_unique_visitors} unique visitor${this.analytics.range_unique_visitors === 1 ? '' : 's'}`;
    return `${this.formatDateLabel(this.analytics.range_start, formatOptions)} to ${this.formatDateLabel(this.analytics.range_end, formatOptions)} • ${uniqueVisitors}`;
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

  loadWorkspace() {
    this.loading = true;
    this.loadError = '';
    const offset = (this.pageIndex - 1) * this.pageSize;

    forkJoin({
      summary: this.visitService.getVisitSummary(),
      analytics: this.visitService.getVisitAnalytics(
        this.selectedGrouping,
        this.selectedPeriods,
        this.selectedGrouping === 'month' ? this.selectedAnchorMonth : undefined,
        this.selectedGrouping === 'day' ? this.selectedAnchorDate : undefined
      ),
      topPages: this.visitService.getTopPages(8, this.searchText.trim(), this.selectedDate),
      visits: this.visitService.getVisits(this.pageSize, offset, this.searchText.trim(), this.selectedDate)
    }).subscribe({
      next: (response: any) => {
        this.summary = response?.summary?.summary || this.summary;
        this.analytics = response?.analytics || this.analytics;
        this.topPages = response?.topPages?.results || [];
        this.visits = response?.visits?.results || [];
        this.total = response?.visits?.count || 0;
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
    this.visitService.getVisitAnalytics(
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
    this.selectedDate = '';
    this.pageIndex = 1;
    this.loadWorkspace();
  }

  setGrouping(grouping: VisitAnalyticsGrouping) {
    if (this.selectedGrouping === grouping || this.analyticsLoading) {
      return;
    }

    this.selectedGrouping = grouping;
    this.selectedPeriods = grouping === 'month' ? 12 : 30;
    this.loadAnalytics();
  }

  onPeriodsChange(periods: number) {
    if (!periods || periods === this.selectedPeriods || this.analyticsLoading) {
      return;
    }

    this.selectedPeriods = periods;
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

  onAnchorDateChange(value: string) {
    if (!value || value === this.selectedAnchorDate || this.analyticsLoading) {
      return;
    }

    this.selectedAnchorDate = value;
    if (this.selectedGrouping === 'day') {
      this.loadAnalytics();
    }
  }

  moveAnchor(direction: -1 | 1) {
    if (this.analyticsLoading) {
      return;
    }

    if (this.selectedGrouping === 'day') {
      const current = new Date(`${this.selectedAnchorDate}T00:00:00`);
      current.setDate(current.getDate() + direction * this.selectedPeriods);
      const nextValue = current.toISOString().slice(0, 10);
      const maxValue = this.datePickerMax;
      this.selectedAnchorDate = nextValue > maxValue ? maxValue : nextValue;
      this.loadAnalytics();
      return;
    }

    const [rawYear, rawMonth] = this.selectedAnchorMonth.split('-').map((value) => Number(value));
    const current = new Date(rawYear, rawMonth - 1, 1);
    current.setMonth(current.getMonth() + direction * this.selectedPeriods);
    const nextValue = `${current.getFullYear()}-${`${current.getMonth() + 1}`.padStart(2, '0')}`;
    const maxValue = this.monthPickerMax;
    this.selectedAnchorMonth = nextValue > maxValue ? maxValue : nextValue;
    this.loadAnalytics();
  }

  onPageIndexChange(index: number) {
    if (index === this.pageIndex) {
      return;
    }

    this.pageIndex = index;
    this.loadWorkspace();
  }

  onPageSizeChange(size: number) {
    if (size === this.pageSize) {
      return;
    }

    this.pageSize = size;
    this.pageIndex = 1;
    this.loadWorkspace();
  }

  getBarHeight(value: number): string {
    return `${Math.max((value / this.chartPeak) * 100, value > 0 ? 12 : 0)}%`;
  }

  formatBarAriaLabel(point: VisitAnalyticsPoint): string {
    return `${point.label}: ${point.visits} visits, ${point.unique_visitors} unique visitors`;
  }

  formatBarTooltip(point: VisitAnalyticsPoint): string {
    return `${point.label}\nVisits: ${point.visits}\nUnique Visitors: ${point.unique_visitors}`;
  }

  formatPath(path: string): string {
    return path === '/' ? 'Home Page' : path;
  }

  formatVisitorKey(visitorKey: string): string {
    return visitorKey.length <= 12 ? visitorKey : `${visitorKey.slice(0, 8)}...${visitorKey.slice(-4)}`;
  }

  formatVisitorType(visit: AdminVisit): string {
    return visit.visitor_type === 'logged_in' ? 'Logged In' : 'Guest';
  }

  private formatDateLabel(value: string, options: Intl.DateTimeFormatOptions) {
    const dateValue = new Date(value);
    if (Number.isNaN(dateValue.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('en-IN', options).format(dateValue);
  }

  private formatError(error: unknown): string {
    if (typeof error === 'string') {
      return error;
    }

    return 'Unable to load visitor insights right now.';
  }

  private getCurrentMonthValue(): string {
    const today = new Date();
    return `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, '0')}`;
  }

  private getTodayValue(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
