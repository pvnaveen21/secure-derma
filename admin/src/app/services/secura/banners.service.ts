import { Injectable } from '@angular/core';
import { InterfaceService } from '../core/interface.service';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable } from 'rxjs';
import { ACCESS_TOKEN, getToken } from '@app/core/token'; 

@Injectable({
  providedIn: 'root'
})
export class BannersService extends InterfaceService {

  constructor(http: HttpClient) {
    super("/auth", http)
  }

  getImagesList(type?: string): Observable<any> {
    let url = `/images/?sort=-created_at`;

    if (type) {
      url += `&banner_type=${type}`;
    }

    return this.http.get(
      this.getApiUrl(url),
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

  getAllImagesList():Observable<any>{
    return this.http.get(
      this.getApiUrl(`/images/grouped/`),
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }



  getBanners(type: any): Observable<any> {
    return this.http.get(
      this.getApiUrl(`/admin-panel/banner/?sort=-created_at&banner_type=${type}`),
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

  addNewBanner(file: File, type: any) {
    const url = this.getApiUrl("/images/create/");
    const formData: FormData = new FormData();

    // append file
    formData.append('image', file, file.name);
    formData.append('type', type);


    // setup headers (don’t set Content-Type manually)
    const headers = {
      'X-Requested-With': 'XMLHttpRequest',
      'Authorization': `Bearer ${getToken(ACCESS_TOKEN)}`
    };

    return this.http.post(url, formData, { headers });
  }

  deleteBanner(id: any) {
    return this.http.delete(
      this.getApiUrl(`/images/${id}/`),
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }
}
