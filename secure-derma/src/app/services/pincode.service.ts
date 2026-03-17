import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable } from 'rxjs';
import { InterfaceService } from './core/interface.service';

export interface PincodeServiceabilityResponse {
  origin_pincode: string;
  destination_pincode: string;
  pincode: string;
  serviceable: boolean;
  location_name: string;
  city: string;
  state: string;
  state_district: string;
  distance_km: number | null;
  eta_min_days: number | null;
  eta_max_days: number | null;
  shipping_fee: number;
  provider_name: string;
  source: string;
  cached: boolean;
  suggested_pincodes?: Array<{
    pincode: string;
    location_name: string;
    city: string;
    state: string;
  }>;
  resolved_coordinates?: {
    latitude: number;
    longitude: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class PincodeService extends InterfaceService {
  constructor(http: HttpClient) {
    super('', http);
  }

  checkServiceability(pincode: string): Observable<PincodeServiceabilityResponse> {
    return this.http.get<PincodeServiceabilityResponse>(
      this.getApiUrl('/pincode/serviceability/', { pincode }),
      this.getHttpOptions('json', { auth: false })
    ).pipe(
      map((res) => res),
      catchError(this.handleError)
    );
  }

  checkCurrentLocation(latitude: number, longitude: number): Observable<PincodeServiceabilityResponse> {
    return this.http.get<PincodeServiceabilityResponse>(
      this.getApiUrl('/pincode/current-location/', { lat: latitude, lng: longitude }),
      this.getHttpOptions('json', { auth: false })
    ).pipe(
      map((res) => res),
      catchError(this.handleError)
    );
  }
}
