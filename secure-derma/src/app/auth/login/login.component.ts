import { AfterViewInit, Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzFlexDirective } from 'ng-zorro-antd/flex';
import { NzInputOtpComponent } from 'ng-zorro-antd/input';
import { AuthService } from '../../services/auth/auth.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { environment } from '../../../environments/environment';
import { Assets } from '../../shared/assets';
import { Icons } from '../../shared/icons';
import { LucideAngularModule } from 'lucide-angular';

declare const google: any;

@Component({
  selector: 'app-login',
  imports: [
    CommonModule,
    FormsModule,
    NzInputModule,
    NzButtonModule,
    NzCheckboxModule,
    LucideAngularModule,
    NzFlexDirective, NzInputOtpComponent
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements AfterViewInit {
  protected readonly assets = Assets;
  protected readonly icons = Icons;
  private readonly googleClientId = environment.GOOGLE_CLIENT_ID;
  timer = 25;
  googleReady = false;
  googleLoading = false;
  authMode: 'email' | 'phone' = 'email';
  emailError = '';
  phoneError = '';
  otpValue = '';
  otpError = '';
  private googleInitAttempts = 0;
  private readonly maxGoogleInitAttempts = 20;
  private googleRetryTimeout?: ReturnType<typeof setTimeout>;

  constructor(
    private authService: AuthService,
    private message: NzMessageService
  ) {}

  resendCode() {
    this.otpValue = '';
    this.otpError = '';
    this.timer = 25;
    this.startTimer();

    // Focus first input
    const inputs = document.querySelectorAll('.ant-otp-input');
    (inputs[0] as HTMLInputElement)?.focus();
  }
  email = '';
  phone = '';
  ngOnInit() {
  }
  ngAfterViewInit() {
    this.initializeGoogleLogin();
  }

  @HostListener('window:resize')
  onWindowResize() {
    if (!this.showOtp) {
      this.renderGoogleButton();
    }
  }
  private intervalId: any;
  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    if (this.googleRetryTimeout) {
      clearTimeout(this.googleRetryTimeout);
    }
  }

  startTimer() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
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
    if (!this.validateCurrentInput()) {
      return;
    }

    this.otpValue = '';
    this.otpError = '';
    this.showOtp =true
    this.timer = 25;
    this.startTimer();
  }

  back(){
    this.showOtp = false
    this.otpValue = '';
    this.otpError = '';
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.scheduleGoogleButtonRender();
  }
  formatter: (value: string) => string = value => value.toUpperCase();

  switchAuthMode(mode: 'email' | 'phone') {
    this.authMode = mode;
    this.showOtp = false;
    this.email = '';
    this.phone = '';
    this.clearErrors();
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    if (mode === 'email') {
      this.scheduleGoogleButtonRender();
    }
  }

  get otpDestinationLabel() {
    return this.authMode === 'email' ? this.email : this.phone;
  }

  get maskedOtpDestinationLabel() {
    if (this.authMode === 'email') {
      return this.maskEmail(this.email);
    }

    return this.maskPhone(this.phone);
  }

  onEmailInput() {
    if (this.emailError) {
      this.validateEmail();
    }
  }

  onPhoneInput(event?: Event) {
    const input = event?.target as HTMLInputElement | undefined;
    const normalizedPhone = (input?.value ?? this.phone).replace(/\D/g, '').slice(0, 10);
    this.phone = normalizedPhone;
    if (input && input.value !== normalizedPhone) {
      input.value = normalizedPhone;
    }

    if (this.phoneError) {
      this.validatePhone();
    }
  }

  onOtpChange(value: string[] | string | Event | null | undefined) {
    if (Array.isArray(value)) {
      this.otpValue = value.join('');
    } else if (typeof value === 'string') {
      this.otpValue = value;
    } else if (value && 'target' in value) {
      const input = value.target as HTMLInputElement | null;
      this.otpValue = input?.value ?? '';
    } else {
      this.otpValue = '';
    }

    if (this.otpError) {
      this.validateOtp();
    }
  }

  verifyOtp() {
    if (!this.validateOtp()) {
      return;
    }

    this.message.success('OTP verified successfully.');
  }

  continueWithGoogle() {
    const googleButton = document.querySelector('#googleBtn [role="button"]') as HTMLElement | null;
    if (!googleButton) {
      this.message.warning('Google sign-in is not ready yet. Please try again.');
      return;
    }

    googleButton.click();
  }

  validateCurrentInput() {
    return this.authMode === 'email' ? this.validateEmail() : this.validatePhone();
  }

  private validateEmail() {
    const normalizedEmail = this.email.trim();
    this.email = normalizedEmail;

    if (!normalizedEmail) {
      this.emailError = 'Email address is required.';
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      this.emailError = 'Enter a valid email address.';
      return false;
    }

    this.emailError = '';
    return true;
  }

  private validatePhone() {
    const digits = this.phone.replace(/\D/g, '').slice(0, 10);
    this.phone = digits;

    if (!digits) {
      this.phoneError = 'Phone number is required.';
      return false;
    }

    if (digits.length !== 10) {
      this.phoneError = 'Phone number must be 10 digits.';
      return false;
    }

    this.phoneError = '';
    return true;
  }

  private validateOtp() {
    if (!this.otpValue) {
      this.otpError = 'Enter the 6-digit verification code.';
      return false;
    }

    if (!/^[A-Z0-9]{6}$/.test(this.otpValue)) {
      this.otpError = 'Verification code must be 6 characters.';
      return false;
    }

    this.otpError = '';
    return true;
  }

  private clearErrors() {
    this.emailError = '';
    this.phoneError = '';
    this.otpError = '';
  }

  private maskEmail(value: string) {
    const [name, domain] = value.split('@');
    if (!name || !domain) {
      return value;
    }

    const visibleName = name.length <= 2 ? name[0] ?? '' : `${name.slice(0, 2)}${'*'.repeat(Math.max(name.length - 2, 1))}`;
    return `${visibleName}@${domain}`;
  }

  private maskPhone(value: string) {
    if (value.length < 4) {
      return value;
    }

    return `${'*'.repeat(Math.max(value.length - 4, 0))}${value.slice(-4)}`;
  }

  private initializeGoogleLogin() {
    if (typeof window === 'undefined') {
      return;
    }

    const buttonElement = document.getElementById('googleBtn');
    if (!buttonElement) {
      return;
    }

    if (typeof google === 'undefined' || !google?.accounts?.id) {
      if (this.googleInitAttempts >= this.maxGoogleInitAttempts) {
        return;
      }
      this.googleInitAttempts += 1;
      this.googleRetryTimeout = setTimeout(() => this.initializeGoogleLogin(), 500);
      return;
    }

    google.accounts.id.initialize({
      client_id: this.googleClientId,
      callback: this.handleCredentialResponse.bind(this)
    });

    this.googleReady = true;
    this.renderGoogleButton();
  }

  private renderGoogleButton() {
    if (!this.googleReady || typeof google === 'undefined' || !google?.accounts?.id) {
      return;
    }

    const buttonElement = document.getElementById('googleBtn');
    if (!buttonElement) {
      return;
    }

    const buttonWidth = Math.max(220, Math.floor(buttonElement.clientWidth || 320));
    buttonElement.innerHTML = '';
    google.accounts.id.renderButton(buttonElement, {
      theme: 'outline',
      size: 'large',
      width: buttonWidth,
      text: 'continue_with'
    });
  }

  private scheduleGoogleButtonRender(attempt = 0) {
    if (typeof window === 'undefined') {
      return;
    }

    window.requestAnimationFrame(() => {
      const buttonElement = document.getElementById('googleBtn');
      if (!buttonElement) {
        if (attempt < 8) {
          setTimeout(() => this.scheduleGoogleButtonRender(attempt + 1), 50);
        }
        return;
      }

      if (this.googleReady) {
        this.renderGoogleButton();
      } else {
        this.initializeGoogleLogin();
      }
    });
  }

  private handleCredentialResponse(response: any) {
    const idToken = response?.credential;
    if (!idToken) {
      this.message.error('Google login failed. Please try again.');
      return;
    }

    this.googleLoading = true;
    this.authService.googleLogin({ token: idToken }).then(() => {
      this.googleLoading = false;
      this.authService.redirectToHome();
    }).catch((err) => {
      this.googleLoading = false;
      this.message.error(err?.message || err?.error || 'Google login failed.');
    });
  }

}
