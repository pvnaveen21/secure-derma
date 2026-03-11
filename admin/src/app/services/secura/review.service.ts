import { Injectable } from '@angular/core';
import { InterfaceService } from '../core/interface.service';
import { HttpClient } from '@angular/common/http';
import { catchError, map } from 'rxjs';
import { ACCESS_TOKEN, getToken } from '@app/core/token';
@Injectable({
  providedIn: 'root'
})
export class ReviewService extends InterfaceService {

  constructor(http: HttpClient) {
    super("/auth", http)
  }

  addReview(payload: any,id:any) {
    const formData = this.convertToFormData(payload);

    const headers = {
      'X-Requested-With': 'XMLHttpRequest',
      'Authorization': `Bearer ${getToken(ACCESS_TOKEN)}`
    };

    return this.http.post(
      this.getApiUrl(`/products/${id}/reviews/`),
      formData,
      { headers }
    );
  }

  updateReview(payload: any, id: any) {
    const formData = this.convertToFormData(payload);

    const headers = {
      'X-Requested-With': 'XMLHttpRequest',
      'Authorization': `Bearer ${getToken(ACCESS_TOKEN)}`
    };

    return this.http.put(
      this.getApiUrl(`/reviews/${id}/`),
      formData,
      { headers }
    );
  }



  convertToFormData(payload: any): FormData {
    const formData = new FormData();

    // Basic fields
    formData.append('reviewer_name', payload.reviewer_name);
    formData.append('rating', payload.rating);
    formData.append('review_text', payload.review_text);
    formData.append('review_date', payload.review_date);


    // Multiple images
    if (payload.images?.length) {
      payload.images.forEach((img: any) => {
        if (img.file) {
          formData.append('images', img.file);
        }
      });
    }


    return formData;
  }


  selectedProductDetail(id: any) {
    return this.http.get(
      this.getApiUrl(`/products/${id}/`),
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }
  deleteReview(id: any) {
    return this.http.delete(
      this.getApiUrl(`/reviews/${id}/`),
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }
  deleteSingleProduct(id: any) {
    return this.http.delete(
      this.getApiUrl(`/products/details/${id}/`),
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

  deleteSingleImage(id: any) {
    return this.http.delete(
      this.getApiUrl(`/products/images/${id}/`),
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

  deleteReviewImage(id: any) {
    return this.http.delete(
      this.getApiUrl(`/reviews/images/${id}/`),
      this.getHttpOptions()
    ).pipe(
      map(res => res),
      catchError(this.handleError)
    );
  }

}
