import { Injectable } from '@angular/core';
import { InterfaceService } from '../core/interface.service';
import { HttpClient } from '@angular/common/http';
import { catchError, map } from 'rxjs';
import { ACCESS_TOKEN, getToken } from '@app/core/token';
@Injectable({
  providedIn: 'root'
})
export class ProductService extends InterfaceService {

  constructor(http: HttpClient) {
    super("/auth", http)
  }

  addProduct(payload: any) {
    const formData = this.convertToFormData(payload);

    const headers = {
      'X-Requested-With': 'XMLHttpRequest',
      'Authorization': `Bearer ${getToken(ACCESS_TOKEN)}`
    };

    return this.http.post(
      this.getApiUrl(`/products/`),
      formData,
      { headers }
    );
  }

  updateProduct(payload: any, id: any) {
    const formData = this.convertToFormData(payload);

    const headers = {
      'X-Requested-With': 'XMLHttpRequest',
      'Authorization': `Bearer ${getToken(ACCESS_TOKEN)}`
    };

    return this.http.put(
      this.getApiUrl(`/products/${id}/`),
      formData,
      { headers }
    );
  }

  updateProductFlags(id: any, flags: { trending_product: boolean; best_seller: boolean }) {
    const formData = new FormData();
    formData.append('trending_product', JSON.stringify(flags.trending_product));
    formData.append('best_seller', JSON.stringify(flags.best_seller));

    const headers = {
      'X-Requested-With': 'XMLHttpRequest',
      'Authorization': `Bearer ${getToken(ACCESS_TOKEN)}`
    };

    return this.http.put(
      this.getApiUrl(`/products/${id}/`),
      formData,
      { headers }
    );
  }



  convertToFormData(payload: any): FormData {
    const formData = new FormData();

    // Basic fields
    formData.append('brand', payload.brand_id);
    formData.append('categorie', payload.categorie);
    formData.append('product_type', payload.product_type);
    formData.append('product_name', payload.product_name);
    formData.append('product_description', payload.product_description);
    formData.append('trending_product', payload.trending_product);
    formData.append('best_seller', payload.best_seller);

    // Skin Concern (multiple)
    if (payload.skin_concern?.length) {
      payload.skin_concern.forEach((c: any) => {
        formData.append('skin_concern', c);
      });
    }
    if (payload.ingredient?.length) {
      payload.ingredient.forEach((c: any) => {
        formData.append('ingredient', c);
      });
    }

    if (payload.key_benefits?.length) {
      const benefits = payload.key_benefits.map((c: any) => c.value);
      formData.append('key_benefits', JSON.stringify(benefits));
    }


    // Handle key_ingredients
    if (payload.key_ingredients?.length) {
      const ingredients = payload.key_ingredients.map((c: any) => c.value);
      formData.append('key_ingredients', JSON.stringify(ingredients));
    }

    // Handle how_to_use
    if (payload.how_to_use?.length) {
      const uses = payload.how_to_use.map((c: any) => c.value);
      formData.append('how_to_use', JSON.stringify(uses));
    }


    // Hair Concern (if needed)
    if (payload.hair_concern?.length) {
      payload.hair_concern.forEach((c: any) => {
        formData.append('hair_concern', c);
      });
    }

    // Single images
    if (payload.thumbnail_image instanceof File) {
      formData.append('thumbnail_image', payload.thumbnail_image);
    }

    if (payload.hover_image instanceof File) {
      formData.append('hover_image', payload.hover_image);
    }

    // Multiple images
    if (payload.images?.length) {
      payload.images.forEach((img: any) => {
        if (img.file) {
          formData.append('images', img.file);
        }
      });
    }

    // Product details array
    payload.product_details.forEach((d: any, index: number) => {
      if (d?.id) {
        formData.append(`details[${index}].id`, d.id);
      }
      formData.append(`details[${index}].product_weight`, d.product_weight);
      formData.append(`details[${index}].weight_type`, d.weight_type);
      formData.append(`details[${index}].combo`, d.combo);
      formData.append(`details[${index}].original_price`, d.original_price);
      formData.append(`details[${index}].selling_price`, d.selling_price);
      formData.append(`details[${index}].available_stock_count`, d.available_stock_count);
      formData.append(`details[${index}].discount_price`, d.discount_price);

    });

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
  deleteProduct(id: any) {
    return this.http.delete(
      this.getApiUrl(`/products/${id}/`),
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

}
