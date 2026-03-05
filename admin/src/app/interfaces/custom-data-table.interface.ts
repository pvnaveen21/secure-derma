import { TemplateRef } from "@angular/core";


export interface CustomDataTableConfig {
    screenName: string;
    remoteUrl: string;
    remoteParams?: { [key: string]: any };
    btnIcon?: any;
    addOnBtnText?:string|'';
    addOnIcon?:any;
    btnText?: string;
    status?: boolean;
    showDateField?: boolean
    viewZoneOption?: false | boolean;
    sortBy?: true | Boolean
    exportHeader?: any
    exportData?: any;
    searchOption?: true | boolean;
}

export interface CustomDataTableColumn {
    title: string;
    property: string;
    headerTemplate?: TemplateRef<any>;
    cellTemplate?: TemplateRef<any>;
    headerClass?: string;
    cellClass?: string;
    width?: string;
    isSortable?: boolean;
    sortKey?: string;
    isDate?: boolean;
}

export interface CustomDataTableAction {
    title: string;
    actionKey: string;
    icon?: string;
    buttonClass?: string;
    isVisible?: (rowData: any) => boolean;
}

export interface CustomDataTableResponse {
    data: any[];
    total: number;
}

