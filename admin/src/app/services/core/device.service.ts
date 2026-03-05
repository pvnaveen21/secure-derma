import { Injectable } from '@angular/core';
import { appDetails } from '@app/core/config';
import { from, Observable } from 'rxjs';
import { IndexedDbService } from '@app/services/indexed-db/indexed-db.service';

declare global {
  interface Window {
    electronAPI: {
      getMachineId: () => Promise<string>;
      getFCMToken: () => Promise<string>;
    };
  }
}

interface User {
  id: string;
}

@Injectable({
  providedIn: 'root'
})
export class DeviceService {
  constructor(
    private indexedDbService: IndexedDbService
  ) {
  }

  getUsers(): Promise<User[]> {
    return new Promise((resolve, reject) => {
      this.indexedDbService.getAllData('user').then((data) => {
        resolve(data)
      }).catch(reject);
    });
  }

  staticGetMachineId() {
    return new Promise((resolve, reject) => {
      try {
        this.getUsers().then((users) => {
          if (users && users.length > 0) {
            resolve(users[0].id);
          } else {
            const uuid = crypto.randomUUID();
            this.indexedDbService.addData('user', {id: uuid}).then(() => resolve(uuid)).catch(reject);
          }
        })
      } catch (err) {
        reject(err);
      }
    })
  }

  requestDevice(): Observable<any> {
    try {

      return from(window.electronAPI.getMachineId().then((devices: any) => {
        if (devices) {
          return devices;
        }
        throw new Error('No device selected');
      }));
    } catch (err) {
      return from(this.staticGetMachineId())
    }
  }

  requestToken(): Observable<any> {
    try {
      return from(window.electronAPI.getFCMToken().then((devices: any) => {
        if (devices) {
          return devices;
        }
        throw new Error('No device selected');
      }));
    } catch (err) {
      return from(this.staticGetMachineId())
    }
  }
}
