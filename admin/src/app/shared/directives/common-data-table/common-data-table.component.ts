import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild } from '@angular/core';

import { CustomDataTableAction, CustomDataTableColumn, CustomDataTableConfig, CustomDataTableResponse } from '@app/interfaces/custom-data-table.interface';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTableModule } from 'ng-zorro-antd/table';

import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonService } from '@app/services/common/common.service';
import { Icons } from '@app/shared/icons';
import { LucideAngularModule } from 'lucide-angular';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { debounceTime, distinctUntilChanged, Observable, Subject, Subscription } from 'rxjs';
import { NormalColumn } from "./custom-table.pipes";
import { MultiSelectDropdownComponent } from '../multi-select-dropdown/multi-select-dropdown.component';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { Router } from '@angular/router';


interface Zone {
  id: number;
  zone_name: string;
}

@Component({
  selector: 'app-common-data-table',
  imports: [CommonModule,
    FormsModule,
    NzTableModule,
    NzInputModule,
    NzButtonModule,
    NzDropDownModule,
    NzMenuModule,
    NzIconModule,
    NzSpaceModule,
    LucideAngularModule, NormalColumn,
    NzDatePickerModule,
    MultiSelectDropdownComponent,
    NzPaginationModule,
  ],
  standalone: true,
  templateUrl: './common-data-table.component.html',
  styleUrl: './common-data-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [DatePipe]
})
export class CommonDataTableComponent {
  @ViewChild('virtualTable', { static: false }) nzTableComponent?: ElementRef<any>;
  @ViewChild('zoneList') zoneList!: MultiSelectDropdownComponent;
  private destroy$ = new Subject<void>();
  listOfData: any = [];
  scrollHeight = '700px';
  Math = Math;

  // private _tableConfig!: CustomDataTableConfig;
  @Input() tableConfig!: CustomDataTableConfig;

  // @Input() set tableConfig(value: CustomDataTableConfig) {
  //   this._tableConfig = {
  //     ...value,
  //     searchOption: value?.searchOption ?? true
  //   };
  // }
  // get tableConfig(): CustomDataTableConfig {
  //   return this._tableConfig;
  // }
  @Input() tableColumns: CustomDataTableColumn[] = [];
  @Input() tableActions: CustomDataTableAction[] = [];
  @Input() searchPlaceholder='Search'
  @Input() tableResponse: CustomDataTableResponse = { data: [], total: 0 };
  @Output() modelAction = new EventEmitter<{ actionKey: string, rowData: any }>();
  private searchSubject = new Subject<string>();
  private searchSub!: Subscription;

  pageSize = 10;
  pageIndex = 1;
  total = 1;
  dataTableValues: any = [];
  pageLoading = true;
  zones = [];
  status = ['Verified', 'Pending', 'Rejected'];
  sortOptions = ['Name', 'Date', 'Zone'];
  searchText: string | null = null;
  sortBy: string | null = null;
  sortOrder: 'ascend' | 'descend' | null = null;
  backend: HttpDataBase;
  fetchDataSub!: Subscription;
  icons = Icons
  selectedZone: string = 'Zone';
  selectedStatus: string = 'Status';
  selectedSort: string = 'Sort By';
  private lastQueryParams: any = {};
  exportBtnLoader: any = false
  selectedZones: any = []
  zoneIcon = this.icons.common.mapPin;



  constructor(
    private commonService: CommonService,
    private cdr: ChangeDetectorRef,
    private datePipe: DatePipe,
    private router: Router
  ) {
    this.backend = new HttpDataBase(this.commonService);
  }

  ngOnInit(): void {
    if(this.tableConfig.searchOption == null){
      this.tableConfig['searchOption']= true
    }
    // this.fetchData();

    this.searchSub = this.searchSubject
      .pipe(
        debounceTime(500),
        distinctUntilChanged()
      )
      .subscribe(value => {
        this.callSearchApi(value);
      });
    if (this.tableConfig.viewZoneOption) {
      this.getZone();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.exportBtnLoader = false
    if (this.searchSub) {
      this.searchSub.unsubscribe();
    }
  }


  @ViewChild('virtualTable', { static: false }) virtualTable!: ElementRef;

  tableScroll = { y: '400px' }; // default fallback



  @HostListener('window:resize')
  onResize() {
    // Recalculate on window resize
    this.updateTableScrollHeight();
  }

  updateTableScrollHeight() {
    if (this.virtualTable && this.virtualTable.nativeElement) {
      const tableHeight = this.virtualTable.nativeElement.offsetHeight;
      // Adjust any header/toolbars you want to subtract
      const offset = 200; // e.g., toolbar height or margin space
      const availableHeight = tableHeight - offset;

      this.tableScroll = { y: `${availableHeight}px` };
    }
  }


  callSearchApi(query: string, type?: any) {

    // here update your tableConfig.remoteParams and call API
    if (this.tableConfig.remoteParams && type == 'reset') {
      delete this.tableConfig.remoteParams['filter'];
      delete this.tableConfig.remoteParams['searchText'];
      delete this.tableConfig.remoteParams['sort'];
      delete this.tableConfig.remoteParams['zone'];
      this.selectedZone = 'Zone';
      this.selectedStatus = 'Status';
      this.selectedSort = 'Sort By';
    }

    this.tableConfig.remoteParams = {
      ...this.tableConfig.remoteParams,
      searchText: query
    };

    this.refreshTable(); // existing method that fetches data
  }

  ngAfterViewInit(): void {
    if (this.nzTableComponent) {
      this.scrollHeight = (this.nzTableComponent.nativeElement.clientHeight - 50) + 'px';
    }
    this.updateTableScrollHeight();

  }

  onSearchChange(value: string) {
    this.searchSubject.next(value);
  }



  fetchData() {
    this.pageLoading = true;
    this.dataTableValues = [];
    if (this.fetchDataSub) {
      this.fetchDataSub?.unsubscribe();
    }
    this.fetchDataSub = this.backend.getData(this.tableConfig.remoteParams, this.tableConfig.remoteUrl).subscribe({
      next: (data: any) => {
        this.listOfData = data.results;
        this.total = data.count;
        this.pageLoading = false;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.dataTableValues = [];
        this.pageLoading = false;
      }
    })
  }

  onQueryParamsChange(params: any): void {
    // Only fetch if params actually changed
    if (
      this.lastQueryParams.pageIndex === params.pageIndex &&
      this.lastQueryParams.pageSize === params.pageSize
    ) {
      return;
    }
    this.lastQueryParams = { ...params };

    const { pageIndex, pageSize } = params;
    this.pageIndex = pageIndex;
    this.pageSize = pageSize;

    const offset = (this.pageIndex - 1) * this.pageSize;

    this.tableConfig.remoteParams = {
      ...this.tableConfig.remoteParams,
      offset: offset,
      limit: this.pageSize
    };

    this.refreshTable();
  }


  getZone() {
    this.commonService.getData(`/projects/zone/`, {}).subscribe({
      next: (data: any) => {
        this.zones = data;
      },
      error: (error: any) => { }
    })
  }

  search(value: string) {
    this.tableConfig.remoteParams = {
      ...this.tableConfig.remoteParams,
      searchText: value
    };
    this.pageLoading = true;
    this.refreshTable();
  }

  refreshTable(): void {
    this.listOfData = [];
    this.fetchData();
  }

  getSortOrder(key: string | undefined): 'ascend' | 'descend' | null {
    if (!key) return null;
    return this.sortBy === key ? this.sortOrder : null;
  }

  onSortChange(order: any, key: any): void {
    if (!key) return;
    this.sortBy = key;
    this.sortOrder = order;

    this.tableConfig.remoteParams = {
      ...this.tableConfig.remoteParams,
      sort_by: `${this.sortOrder === 'ascend' ? '' : '-'}${this.sortBy}`,
    };

    this.pageLoading = true;
    this.refreshTable();
  }

  resetInputs(): void {
    this.searchText = null;
    this.sortBy = null;
    this.sortOrder = null;
    this.callSearchApi('', 'reset');
    if (this.zoneList) {
      this.zoneList.reset()
    }
  }

  zoneSelect(zone: any): void {
    const zoneIds = zone.map((value: any) => value.id)
    this.selectedZones = zone

    this.tableConfig.remoteParams = {
      ...this.tableConfig.remoteParams,
      zone: zoneIds
    };
    this.pageLoading = true;
    this.refreshTable();
  }

  sortSelect(sort: string): void {
    this.selectedSort = sort;
    this.tableConfig.remoteParams = {
      ...this.tableConfig.remoteParams,
      sort: sort
    };
    this.pageLoading = true;
    this.refreshTable();
  }
  showAddonBtnModal(){
    this.modelAction.emit({ actionKey: 'addOnshowModal', rowData: null });

  }
  showModal() {
    if (this.tableConfig.btnText == 'Export') {
      this.exportBtnLoader = true
      const route: any = this.router.url.split('/').pop();

      const exportTypeMap: { [key: string]: number } = {
        dealers: 1,
        retailers: 2,
        'dealer-report': 3
      };

      const exportType = exportTypeMap[route] ?? 4;

      this.dataExport(exportType);
      // const fields = this.tableConfig.exportData;
      // const filteredData = this.listOfData.map((item: any) => {
      //   const arr: any[] = [];
      //   fields.forEach((key: any) => {
      //     if (key.includes('.')) {
      //       const [parentKey, childKey] = key.split('.');
      //       arr.push(item[parentKey]?.[childKey]);
      //     } else {
      //       arr.push(item[key]);
      //     }
      //   });
      //   return arr;
      // });

    }
    else {
      this.modelAction.emit({ actionKey: 'showModal', rowData: null });
    }

  }

  dataExport(type: any) {
    const payload: any = {
      header: this.tableConfig.exportHeader,
      type: type
    }

    // dealer
    // const payload = {
    //   header: ['ID',
    // 'Name',
    // 'Total Orders',
    // 'Reorder',
    // 'Last Order',
    // 'Zone',
    // 'Status'],
    //   type: 1
    // };

    // retailer 
    // const payload = {
    //   header: ['Retailer ID',
    //     'Retailer Name',
    //     'Assosiate Dealer',
    //     'Total Orders',
    //     'Zone',
    //     'Last Order',
    //     'Status'],
    //   type: 2
    // };

    // dealer report
    // const payload = {
    //   header: [
    //     'Dealer Name',
    //     'Total Orders',
    //     'Gold',
    //     'Silver',
    //     'Platinum',
    //     'Zone',
    //     'Permissions',
    //     'Status'
    //   ],
    //   type: 3
    // };

    // executive report
    // const payload = {
    //   header: ['Executive Name',
    //     'Total Orders',
    //     'Gold',
    //     'Silver',
    //     'Platinum',
    //     'Zone',
    //     'Status'],
    //   type: type
    // };

    this.commonService.exportData(payload).subscribe({
      next: (blob: Blob) => {
        this.exportBtnLoader = false
        this.cdr.detectChanges();
        const filename = 'report.xlsx';
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      },
      error: (err: any) => {
        this.exportBtnLoader = false
        this.cdr.detectChanges();
      }
    });
  }


  dateFormat = 'MMM dd yyyy';
  selectedRange: Date[] = [];  // holds start and end dates

  onChange(result: Date[]): void {

    if (result && result.length === 2) {
      const start = result[0];
      const end = result[1];
      const start_date = this.datePipe.transform(result[0], 'dd-MM-yyyy');
      const end_date = this.datePipe.transform(result[1], 'dd-MM-yyyy');
      this.tableConfig.remoteParams = {
        ...this.tableConfig.remoteParams,
        start_date: start_date,
        end_date: end_date
      };
      this.refreshTable();
    }
    else {
      if (this.tableConfig.remoteParams) {
        delete this.tableConfig.remoteParams['start_date'];
        delete this.tableConfig.remoteParams['end_date'];
        this.refreshTable()
      }
    }
  }

  onPageIndexChange(newPage: number) {
    this.pageIndex = newPage;
  }

  onPageSizeChange(newSize: number) {
    this.pageSize = newSize;
    this.pageIndex = 1;
  }

}

export class HttpDataBase {
  constructor(private commonService: CommonService) {
  }

  getData(params: any, url: string): Observable<any> {
    return this.commonService.getData(url, params);
  }
}
