import { Injectable } from '@angular/core';
import { AuthService } from '@app/services/auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  constructor(
    private auth: AuthService,
  ) {}

  loadAppData(): Promise<any> {
    return this.auth.loadAppData();
  }
}
