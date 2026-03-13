import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrderService } from '@app/services/secura/order.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { LucideAngularModule } from 'lucide-angular';
import { Icons } from '@app/shared/icons';

@Component({
  selector: 'app-orders',
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzCardModule,
    NzEmptyModule,
    NzInputModule,
    NzModalModule,
    NzSelectModule,
    NzSpinModule,
    NzTableModule,
    LucideAngularModule
  ],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss'
})
export class OrdersComponent {
  icons = Icons;
  readonly statusOptions = [
    { label: 'All Statuses', value: '' },
    { label: 'Paid', value: 'paid' },
    { label: 'Payment Pending', value: 'payment_pending' },
    { label: 'Payment Failed', value: 'payment_failed' },
    { label: 'Created', value: 'created' }
  ];

  loading = true;
  summaryLoading = true;
  loadError = '';
  searchText = '';
  selectedStatus = '';
  pageIndex = 1;
  pageSize = 10;
  total = 0;
  detailLoading = false;
  detailVisible = false;
  selectedOrder: any = null;

  summary = {
    total_orders: 0,
    total_revenue: 0,
    average_order_value: 0,
    pending_orders: 0,
    latest_paid_at: ''
  };

  orders: any[] = [];

  constructor(
    private orderService: OrderService
  ) { }

  ngOnInit() {
    this.loadSummary();
    this.loadOrders();
  }

  loadSummary() {
    this.summaryLoading = true;
    this.orderService.getOrderSummary().subscribe({
      next: (response: any) => {
        this.summary = response?.summary || this.summary;
        this.summaryLoading = false;
      },
      error: (error) => {
        this.loadError = this.formatError(error);
        this.summaryLoading = false;
      }
    });
  }

  loadOrders() {
    this.loading = true;
    this.loadError = '';
    const offset = (this.pageIndex - 1) * this.pageSize;

    this.orderService.getOrders(this.pageSize, offset, this.selectedStatus, this.searchText.trim()).subscribe({
      next: (response: any) => {
        this.orders = response?.results || [];
        this.total = response?.count || 0;
        this.loading = false;
      },
      error: (error) => {
        this.loadError = this.formatError(error);
        this.loading = false;
      }
    });
  }

  applyFilters() {
    this.pageIndex = 1;
    this.loadOrders();
  }

  resetFilters() {
    this.searchText = '';
    this.selectedStatus = '';
    this.pageIndex = 1;
    this.loadOrders();
  }

  onPageIndexChange(page: number) {
    this.pageIndex = page;
    this.loadOrders();
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.pageIndex = 1;
    this.loadOrders();
  }

  refreshAll() {
    this.loadSummary();
    this.loadOrders();
  }

  viewOrder(orderId: number) {
    this.detailLoading = true;
    this.detailVisible = true;
    this.selectedOrder = null;

    this.orderService.getOrderDetail(orderId).subscribe({
      next: (response: any) => {
        this.selectedOrder = response;
        this.detailLoading = false;
      },
      error: (error) => {
        this.loadError = this.formatError(error);
        this.detailLoading = false;
        this.detailVisible = false;
      }
    });
  }

  closeDetailModal() {
    this.detailVisible = false;
    this.selectedOrder = null;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  private formatError(error: unknown): string {
    if (typeof error === 'string') {
      return error;
    }
    return 'Unable to load orders right now.';
  }
}
