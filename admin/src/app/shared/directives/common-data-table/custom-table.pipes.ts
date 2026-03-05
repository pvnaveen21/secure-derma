import { PipeTransform, Pipe } from '@angular/core';
import { formatDate } from '@angular/common';


// Custom Datatable colum
@Pipe({ name: "NormalColumn" })
export class NormalColumn implements PipeTransform {
    transform(value: any, args: string) {
        const defaultHyphen = '---';
        const returnValue = (value: any) => {
            if (typeof value === "string") {
                return value.trim() === "" ? defaultHyphen : value;
            } else if (Array.isArray(value)) {
                return value.length === 0 ? defaultHyphen : value;
            } else {
                return value;
            }
        }
        try {
            let data = args.split('.');
            if (data.length > 1) {
                let temp = value;
                data.forEach(element => {
                    temp = temp[element]
                });
                return temp || "---";
            } else {
                return returnValue(value[args] || defaultHyphen);
            }
        } catch {
            return "---";
        }
    }
}


@Pipe({
    name: 'SafeDatePipe'
})
export class SafeDatePipe implements PipeTransform {
    constructor() { }

    transform(value: any, format: string = 'dd/MM/yyyy'): string {
        return value && value !== '---' ? formatDate(value, format, 'en-US')! : '---';
    }
}