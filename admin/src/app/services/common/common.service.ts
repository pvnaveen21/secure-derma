import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, Observable } from 'rxjs';
import { InterfaceService } from '../core/interface.service';
import { environment } from '../../../environments/environment.development';
import { ACCESS_TOKEN, getToken } from '@app/core/token';

@Injectable({
  providedIn: 'root'
})
export class CommonService extends InterfaceService {
  baseUrl: string = environment.BASEURL_API;
  constructor(
    http: HttpClient,
  ) {
    super('', http);
  }

  getData(url: string, params: object): Observable<any> {
    return this.http.get(this.getApiUrl(url, params), this.getHttpOptions()).pipe(
      map((res: any) => res),
      catchError(this.handleError)
    );
  }

  deleteUser(id: any): Observable<any> {
    return this.http.delete(this.getApiUrl(`/users/user/${id}/`), this.getHttpOptions()).pipe(
      map((res: any) => res),
      catchError(this.handleError)
    );
  }

  fileUpload(file: any, type: any, confirm: boolean = false) {
    const url = `${this.baseUrl}/admin-panel/file-upload/`;
    const formData: FormData = new FormData();
    const _confirm = confirm ? true : false;
    // append file
    formData.append('file', file, file.name);
    formData.append('upload_type', type);
    formData.append('confirm', String(_confirm))


    // setup headers (don’t set Content-Type manually)
    const headers = {
      'X-Requested-With': 'XMLHttpRequest',
      'Authorization': `Bearer ${getToken(ACCESS_TOKEN)}`
    };

    return this.http.post(url, formData, { headers });
  }
  chainfileUpload(file:any){
    const url = `${this.baseUrl}/projects/chain/`;
    const formData: FormData = new FormData();
    // append file
    formData.append('file', file, file.name);

    // setup headers (don’t set Content-Type manually)
    const headers = {
      'X-Requested-With': 'XMLHttpRequest',
      'Authorization': `Bearer ${getToken(ACCESS_TOKEN)}`
    };

    return this.http.post(url, formData, { headers });
  }

  fileUploadList(params: any, offSet?: any, limit?: any) {
    return this.http.get(this.getApiUrl(`/admin-panel/file-upload/?offset=${offSet}&limit=${limit}`), {
      params: params,
      ...this.getHttpOptions()
    }).pipe(
      map((res: any) => res),
      catchError(this.handleError)
    );
  }

  getFlyerList() {
    return this.http.get(this.getApiUrl(`/admin-panel/flyers/`), this.getHttpOptions()).pipe(
      map((res: any) => res),
      catchError(this.handleError)
    );
  }

  getProjectlist() {
    return this.http.get(this.getApiUrl(`/projects/projects/`), this.getHttpOptions()).pipe(
      map((res: any) => res),
      catchError(this.handleError)
    );
  }

  updatePassword(payload: any, id: any) {
    return this.http.post(this.getApiUrl(`/users/user/${id}/password-reset/`), payload, this.getHttpOptions()).pipe(
      map((res: any) => res),
      catchError(this.handleError)
    );
  }

  addProfile(file: any) {
    const url = `${this.baseUrl}/users/user/set-profile-image/`;
    const formData: FormData = new FormData();

    // append file
    formData.append('image', file, file.name);

    // setup headers (don’t set Content-Type manually)
    const headers = {
      'X-Requested-With': 'XMLHttpRequest',
      'Authorization': `Bearer ${getToken(ACCESS_TOKEN)}`
    };

    return this.http.post(url, formData, { headers });
  }

  removeProfile() {
    return this.http.post(this.getApiUrl(`/users/user/remove-profile-image/`), '', this.getHttpOptions()).pipe(
      map((res: any) => res),
      catchError(this.handleError)
    );
  }

  addOderSettings(payload: any) {
    return this.http.post(this.getApiUrl(`/order/split-order/split-order-by-project/`), payload, this.getHttpOptions()).pipe(
      map((res: any) => res),
      catchError(this.handleError)
    );
  }

  ordersList(
    offSet?: number,
    limit?: number,
    zones: number[] = [],
    dealers: number[] = [],
    searchText: string = ''
  ) {
    let params = new HttpParams()
      .set('offset', offSet ?? 0)
      .set('limit', limit ?? 10);

    // Append zones
    zones.forEach(zoneId => {
      params = params.append('zone', zoneId.toString());
    });

    // Append dealers
    dealers.forEach(dealerId => {
      params = params.append('dealer', dealerId.toString());
    });

    if (searchText) {
      params = params.set('searchText', searchText);
    }

    return this.http.get(this.getApiUrl(`/order/split-order/order-list/`), {
      ...this.getHttpOptions(),
      params
    }).pipe(
      map((res: any) => res),
      catchError(this.handleError)
    );
  }

  customerOrdersList(id: any, offSet?: any, limit?: any) {
    return this.http.get(this.getApiUrl(`/order/order-history/order-details/?tab_order_no=${id}&offset=${offSet}&limit=${limit}`), this.getHttpOptions()).pipe(
      map((res: any) => res),
      catchError(this.handleError)
    );
  }

  oderDeatilSummary(id: any) {
    return this.http.get(this.getApiUrl(`/order/order-history/reorder-summary-view/?order_split_id=${id}`), this.getHttpOptions()).pipe(
      map((res: any) => res),
      catchError(this.handleError)
    );
  }
  dealersList() {
    return this.http.get(this.getApiUrl(`/admin-panel/file-upload/dealer-list/`), this.getHttpOptions()).pipe(
      map((res: any) => res),
      catchError(this.handleError)
    );
  }

  creatNewUser(payload: any) {
    return this.http.post(this.getApiUrl(`/users/user/`), payload, this.getHttpOptions()).pipe(
      map((res: any) => res),
      catchError(this.handleError)
    );
  }

  updateUser(payload: any, id: any) {
    return this.http.put(this.getApiUrl(`/users/user/${id}/`), payload, this.getHttpOptions()).pipe(
      map((res: any) => res),
      catchError(this.handleError)
    );
  }


  preferencelist(searchText?: any) {
    let params = new HttpParams().set('is_common', true);

    if (searchText) {
      params = params.set('searchText', searchText);
    }

    return this.http.get(
      this.getApiUrl(`/users/user-preference/`),
      {
        ...this.getHttpOptions(),
        params
      }
    ).pipe(
      map((res: any) => res),
      catchError(this.handleError)
    );
  }

  addPrefrence(payload: any) {
    return this.http.post(this.getApiUrl(`/users/user-preference/`), payload, this.getHttpOptions()).pipe(
      map((res: any) => res),
      catchError(this.handleError)
    );
  }

  updatePrefrence(payload: any, id: any) {
    return this.http.put(this.getApiUrl(`/users/user-preference/${id}/`), payload, this.getHttpOptions()).pipe(
      map((res: any) => res),
      catchError(this.handleError)
    );
  }


  resetUUID(payload: any) {
    return this.http.post(this.getApiUrl(`/users/user/reset-uuid/`), payload, this.getHttpOptions()).pipe(
      map((res: any) => res),
      catchError(this.handleError)
    );
  }

  saveChainSettings(payload: any) {
    const isUpdate = !!payload?.id;
    const url = this.getApiUrl(`/projects/chain/${isUpdate ? payload.id +'/' : ''}`);
    const method = isUpdate ? 'put' : 'post';

    return this.http[method](url, payload, this.getHttpOptions()).pipe(
      map((res: any) => res),
      catchError(this.handleError)
    );
  }

  exportData(payload: any) {
    const url = this.getApiUrl(`/admin-panel/file-upload/report-download/`);
    return this.http.post(url, payload, { responseType: 'blob', ...this.getHttpOptions() });
  }
  chainSettings(id: any): Observable<any> {
    return this.http.delete(this.getApiUrl(`/projects/chain/${id}/`), this.getHttpOptions()).pipe(
      map((res: any) => res),
      catchError(this.handleError)
    );
  }

  orderSettings(id: any): Observable<any> {
    return this.http.delete(this.getApiUrl(`/order/split-order/${id}/`), this.getHttpOptions()).pipe(
      map((res: any) => res),
      catchError(this.handleError)
    );
  }

  maintenanceSettings(): Observable<any> {
    return this.http.get(this.getApiUrl(`/maintenance/`), this.getHttpOptions()).pipe(
      map((res: any) => res),
      catchError(this.handleError)
    );
  }

  maintenanceUpdateSettings(id: any, payload: any): Observable<any> {
    return this.http.put(this.getApiUrl(`/maintenance/${id}/`), payload, this.getHttpOptions()).pipe(
      map((res: any) => res),
      catchError(this.handleError)
    );
  }

  maintenanceCreateSettings(payload: any): Observable<any> {
    return this.http.post(this.getApiUrl(`/maintenance/`), payload, this.getHttpOptions()).pipe(
      map((res: any) => res),
      catchError(this.handleError)
    );
  }

  downloadImg(url: string) {
    this.http.get(url, { responseType: 'blob' as 'json' }).subscribe({
      next: (blobData: any) => {
        const blob = new Blob([blobData]);
        const blobUrl = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = "image.png";   // file name
        link.click();

        window.URL.revokeObjectURL(blobUrl);
      },
      error: (err) => {
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute("target", "_blank");
        link.setAttribute('download', '');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // console.error("Download error:", err);
      }
    });
  }

}
