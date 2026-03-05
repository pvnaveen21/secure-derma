import { Injectable } from '@angular/core';
import { InterfaceService } from '../core/interface.service';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ImportService extends InterfaceService {

  constructor(http: HttpClient) {
    super("/auth", http)
  }

  importList(params?: any): Observable<any> {
    return this.http.get(
      this.getApiUrl(`/admin-panel/file-upload/`),
      {
        params: params,
        ...this.getHttpOptions()
      })
  }

  openImportErrorModal(data: any): Observable<any> {
    return this.http.get(`${data}`);
  }
}
