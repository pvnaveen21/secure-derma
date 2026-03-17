import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { OrderService } from '@app/services/secura/order.service';
@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, NzCardModule, NzSpinModule, NzEmptyModule, NzButtonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  providers: []
})
export class DashboardComponent {
  loading = true;
  summary = {
    total_orders: 0,
    total_revenue: 0,
    average_order_value: 0,
    pending_orders: 0,
    latest_paid_at: ''
  };
  recentOrders: any[] = [];
  loadError = '';

  constructor(
    private orderService: OrderService
  ) { }

  ngOnInit() {
    this.loadDashboard();
  }

  loadDashboard() {
    this.loading = true;
    this.loadError = '';

    this.orderService.getOrderSummary().subscribe({
      next: (response: any) => {
        this.summary = response?.summary || this.summary;
      },
      error: (error) => {
        this.loadError = this.formatError(error);
        this.loading = false;
      }
    });

    this.orderService.getOrders(8, 0, 'paid').subscribe({
      next: (response: any) => {
        this.recentOrders = response?.results || [];
        this.loading = false;
      },
      error: (error) => {
        this.loadError = this.formatError(error);
        this.loading = false;
      }
    });
  }

  private formatError(error: unknown): string {
    if (typeof error === 'string') {
      return error;
    }
    return 'Unable to load order dashboard data.';
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value || 0);
  }
}
