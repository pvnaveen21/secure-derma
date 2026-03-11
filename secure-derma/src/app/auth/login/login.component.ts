import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzFlexDirective } from 'ng-zorro-antd/flex';
import { NzInputOtpComponent } from 'ng-zorro-antd/input';

@Component({
  selector: 'app-login',
  imports: [
    CommonModule,
    FormsModule,
    NzInputModule,
    NzButtonModule,
    NzCheckboxModule,
    NzIconModule,
    NzFlexDirective, NzInputOtpComponent
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  timer = 25;
  resendCode() {
    this.timer = 25;
    this.startTimer();

    // Focus first input
    const inputs = document.querySelectorAll('.otp-input');
    (inputs[0] as HTMLInputElement)?.focus();
  }
  email = '';
  ngOnInit() {
    this.startTimer();
  }
  private intervalId: any;
  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  startTimer() {
    this.intervalId = setInterval(() => {
      if (this.timer > 0) {
        this.timer--;
      } else {
        clearInterval(this.intervalId);
      }
    }, 1000);
  }

  sendUpdates = true;
  showOtp:any  =false
  sendOtp(){
    this.showOtp =true
  }

  back(){
    this.showOtp = false
  }
  formatter: (value: string) => string = value => value.toUpperCase();

}
