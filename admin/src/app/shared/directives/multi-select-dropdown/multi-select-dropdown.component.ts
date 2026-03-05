import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icons } from '@app/shared/icons';
import { LucideAngularModule } from 'lucide-angular';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSpaceModule } from 'ng-zorro-antd/space';
@Component({
  selector: 'app-multi-select-dropdown',
  imports: [
    NzInputModule,
    NzIconModule,
    NzSpaceModule,
    NzDropDownModule,
    NzCheckboxModule,
    FormsModule,
    LucideAngularModule
  ],
  templateUrl: './multi-select-dropdown.component.html',
  styleUrl: './multi-select-dropdown.component.scss'
})
export class MultiSelectDropdownComponent {
  @Input() items: any[] = [];           // full list (zones/projects/categories etc.)
  @Input() selectedItems: any[] = [];   // selected list
  @Input() placeholder: string = 'Select';
  @Input() labelKey: string = 'name';   // property for display
  @Input() idKey: string = 'id';        // property for unique id
  @Input() showIcon: any = '';        // property for unique id

  @Output() selectedItemsChange = new EventEmitter<any[]>();

  searchText: string = '';
  filteredItems: any[] = [];
  selectedIds: any[] = [];
  icons: any = Icons;

  ngOnChanges() {
    this.filteredItems = [...this.items];
    this.selectedIds = this.selectedItems.map(i => i[this.idKey]);
  }

  onSearch(event: any) {
    const text = event.target.value.toLowerCase();
    this.filteredItems = this.items.filter(item =>
      item[this.labelKey].toLowerCase().includes(text)
    );
  }

  toggleSelect(item: any) {
    const index = this.selectedItems.findIndex(i => i[this.idKey] === item[this.idKey]);
    if (index > -1) {
      this.selectedItems.splice(index, 1);
      this.selectedIds.splice(index, 1);
    } else {
      this.selectedItems.push(item);
      this.selectedIds.push(item[this.idKey]);
    }
    this.selectedItemsChange.emit(this.selectedItems);
  }

  onDropdownVisibleChange(visible: boolean): void {
    if (!visible) {
    } else {
      this.searchText = '';
      this.filteredItems = [...this.items];
    }
  }

  reset() {
    this.selectedItems = []
    this.selectedIds = []
    this.selectedItemsChange.emit(this.selectedItems);
  }
}