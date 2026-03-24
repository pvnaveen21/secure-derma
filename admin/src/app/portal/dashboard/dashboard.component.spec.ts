import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { OrderService } from '@app/services/secura/order.service';

import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let orderService: jasmine.SpyObj<OrderService>;

  beforeEach(async () => {
    orderService = jasmine.createSpyObj<OrderService>('OrderService', ['getOrderSummary', 'getOrderAnalytics', 'getOrders']);
    orderService.getOrderSummary.and.returnValue(of({
      summary: {
        total_orders: 12,
        total_revenue: 10000,
        pending_orders: 2,
        latest_paid_at: '2026-03-24T10:00:00Z'
      }
    }));
    orderService.getOrderAnalytics.and.returnValue(of({
      grouping: 'day',
      periods: 14,
      range_start: '2026-03-11',
      range_end: '2026-03-24',
      total_orders: 12,
      peak_orders: 3,
      series: [
        { key: '2026-03-23', label: '23 Mar 2026', short_label: '23 Mar', count: 3 },
        { key: '2026-03-24', label: '24 Mar 2026', short_label: '24 Mar', count: 2 }
      ]
    }));
    orderService.getOrders.and.returnValues(
      of({
        count: 1,
        results: [
          {
            id: 1,
            order_number: 'SD-TODAY',
            customer_name: 'Naveen',
            customer_email: 'naveen@example.com',
            status: 'paid',
            amount_rupees: 499,
            item_count: 1,
            updated_at: '2026-03-24T10:00:00Z'
          }
        ]
      }),
      of({
        count: 20,
        results: [
          {
            id: 2,
            order_number: 'SD-RECENT',
            customer_name: 'Naveen',
            customer_email: 'naveen@example.com',
            status: 'paid',
            amount_rupees: 699,
            item_count: 2,
            updated_at: '2026-03-24T09:00:00Z'
          }
        ]
      })
    );

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: OrderService, useValue: orderService }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('passes anchor month when loading monthly analytics', () => {
    orderService.getOrderAnalytics.calls.reset();

    component.selectedAnchorMonth = '2025-12';
    component.setGrouping('month');

    expect(orderService.getOrderAnalytics).toHaveBeenCalledWith('month', undefined, '2025-12');
    expect(orderService.getOrders).not.toHaveBeenCalled();
    expect(orderService.getOrderSummary).not.toHaveBeenCalled();
  });

  it('reloads latest paid orders with a new page size only', () => {
    orderService.getOrders.calls.reset();
    orderService.getOrderSummary.calls.reset();
    orderService.getOrderAnalytics.calls.reset();
    orderService.getOrders.and.returnValue(of({ count: 20, results: [] }));

    component.onRecentOrdersPageSizeChange(25);

    expect(component.recentOrdersPageIndex).toBe(1);
    expect(orderService.getOrders).toHaveBeenCalledOnceWith(25, 0, 'paid');
    expect(orderService.getOrderSummary).not.toHaveBeenCalled();
    expect(orderService.getOrderAnalytics).not.toHaveBeenCalled();
  });

  it('loads only recent orders when dashboard pagination changes', () => {
    orderService.getOrders.calls.reset();
    orderService.getOrderSummary.calls.reset();
    orderService.getOrderAnalytics.calls.reset();
    orderService.getOrders.and.returnValue(of({ count: 20, results: [] }));

    component.onRecentOrdersPageIndexChange(2);

    expect(orderService.getOrders).toHaveBeenCalledOnceWith(8, 8, 'paid');
    expect(orderService.getOrderSummary).not.toHaveBeenCalled();
    expect(orderService.getOrderAnalytics).not.toHaveBeenCalled();
  });
});
