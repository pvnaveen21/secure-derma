import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { OrderService } from '@app/services/secura/order.service';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { LucideAngularModule } from 'lucide-angular';
import { Icons } from '@app/shared/icons';

interface AdminOrderListItem {
  id: number;
  order_number: string;
  status: string;
  amount_rupees: number;
  currency: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  customer_address_line_2: string;
  customer_city: string;
  customer_state: string;
  customer_postal_code: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  item_count: number;
  created_at: string;
  updated_at: string;
}

interface AdminOrderPayment {
  id: number;
  status: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  created_at: string;
  updated_at: string;
}

interface AdminOrderItem {
  id: number;
  product_id: number;
  product_detail_id: number;
  product_name: string;
  thumbnail?: string;
  product_weight?: string;
  weight_type?: string;
  quality_label?: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface AdminOrderDetail extends AdminOrderListItem {
  amount_paise: number;
  items: AdminOrderItem[];
  payments: AdminOrderPayment[];
}

@Component({
  selector: 'app-orders',
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzCardModule,
    NzDividerModule,
    NzEmptyModule,
    NzInputModule,
    NzPaginationModule,
    NzSelectModule,
    NzSpinModule,
    NzTagModule,
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
  selectedOrderId: number | null = null;
  selectedOrder: AdminOrderDetail | null = null;

  summary = {
    total_orders: 0,
    total_revenue: 0,
    average_order_value: 0,
    pending_orders: 0,
    latest_paid_at: ''
  };

  orders: AdminOrderListItem[] = [];

  constructor(
    private readonly orderService: OrderService,
    private readonly message: NzMessageService
  ) { }

  ngOnInit() {
    this.loadSummary();
    this.loadOrders();
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

  get selectedOrderLabel(): string {
    return this.selectedOrder?.order_number || 'Select an order';
  }

  get selectedOrderAddress(): string {
    if (!this.selectedOrder) {
      return 'No address available';
    }

    return [
      this.selectedOrder.customer_address,
      this.selectedOrder.customer_address_line_2,
      this.selectedOrder.customer_city,
      this.selectedOrder.customer_state,
      this.selectedOrder.customer_postal_code
    ].filter(Boolean).join(', ') || 'No address available';
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

        if (!this.orders.length) {
          this.detailVisible = false;
          this.selectedOrderId = null;
          this.selectedOrder = null;
          return;
        }

        const nextSelection = this.selectedOrderId && this.orders.some((order) => order.id === this.selectedOrderId)
          ? this.selectedOrderId
          : this.orders[0].id;

        if (nextSelection) {
          this.openOrder(nextSelection, false);
        }
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

  setStatus(status: string) {
    if (this.selectedStatus === status) {
      return;
    }

    this.selectedStatus = status;
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

  openOrder(orderId: number, scrollIntoView = true) {
    this.detailVisible = true;
    this.selectedOrderId = orderId;
    this.detailLoading = true;

    this.orderService.getOrderDetail(orderId).subscribe({
      next: (response: any) => {
        this.selectedOrder = response;
        this.detailLoading = false;

        if (scrollIntoView && typeof window !== 'undefined' && window.innerWidth < 1100) {
          window.requestAnimationFrame(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          });
        }
      },
      error: (error) => {
        this.loadError = this.formatError(error);
        this.detailLoading = false;
      }
    });
  }

  exportCurrentView() {
    if (!this.orders.length || typeof window === 'undefined') {
      this.message.info('No orders available to export.');
      return;
    }

    const rows = [
      ['Order Number', 'Status', 'Customer', 'Email', 'Phone', 'Amount', 'Items', 'Created At', 'Updated At'],
      ...this.orders.map((order) => ([
        order.order_number,
        order.status,
        order.customer_name || '',
        order.customer_email || '',
        order.customer_phone || '',
        String(order.amount_rupees || 0),
        String(order.item_count || 0),
        order.created_at,
        order.updated_at
      ]))
    ];

    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders-page-${this.pageIndex}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.message.success('Orders exported.');
  }

  copyValue(label: string, value?: string | null) {
    if (!value || typeof navigator === 'undefined' || !navigator.clipboard) {
      this.message.info(`No ${label.toLowerCase()} available to copy.`);
      return;
    }

    navigator.clipboard.writeText(value).then(() => {
      this.message.success(`${label} copied.`);
    }).catch(() => {
      this.message.error(`Unable to copy ${label.toLowerCase()}.`);
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  getStatusLabel(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private formatError(error: unknown): string {
    if (typeof error === 'string') {
      return error;
    }
    return 'Unable to load orders right now.';
  }
}
