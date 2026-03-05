import { Component } from '@angular/core';
import { NzFlexDirective } from 'ng-zorro-antd/flex';
import { Assets } from '@app/shared/assets';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { SvgLoad } from '@app/shared/assets/svg-load';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonValidatorService } from '@app/shared/directives/form-validation/common-validator';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { ControlMessagesComponent } from '@app/shared/directives/form-validation/control-messages.component';
import { ButtonLoaderComponent } from '@app/shared/components/button-loader/button-loader.component';
import { NgStyle } from '@angular/common';
import { AuthService } from '@app/services/auth/auth.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { ActivatedRoute, Router } from '@angular/router';
import { ForceNumericKeyboardDirective } from '@app/shared/directives/input-control/force-numeric-keyboard.directive';
import { NumberDirective } from '@app/shared/directives/input-control/numbers-validations';
import { LucideAngularModule } from 'lucide-angular';
import { Icons } from '@app/shared/icons';
import { LinkNotValidComponent } from '@app/shared/components/link-not-valid/link-not-valid.component';

@Component({
  selector: 'app-otp-login',
  imports: [
    NzFlexDirective,
    SvgLoad,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    ControlMessagesComponent,
    ButtonLoaderComponent,
    NgStyle,
    ForceNumericKeyboardDirective,
    NumberDirective,
    LucideAngularModule,
    LinkNotValidComponent
  ],
  templateUrl: './otp-login.component.html',
  styleUrl: './otp-login.component.scss'
})
export class OtpLoginComponent {

  protected readonly assets = Assets;
  otpLoginForm: FormGroup;
  step: 'MOBILE' | 'OTP' = 'MOBILE'; // control steps
  loginLoading = false;
  backendData: string = '';
  user_id: number = 0;
  order_success = false;
  order_ids: any = null;

  constructor(
    private sanitizer: DomSanitizer,
    private fb: FormBuilder,
    private commonValidator: CommonValidatorService,
    private authService: AuthService,
    private messageService: NzMessageService,
    private route: ActivatedRoute,
    private router: Router,
  ) {
    this.otpLoginForm = this.fb.group({
      mobile: [null, this.commonValidator.validators({ required: true, phoneNumberCheck: true })],
      otpPassword: [null],
    });
    this.route.queryParams.subscribe(params => {
      this.backendData = params['data'];
      this.order_success = params['order_success'] === 'true';
      this.order_ids = params['tab_order_no'] || null;
    })
    this.getUserId()
  }

  getBackgroundStyle(path: string, flag: string): SafeStyle {
    return this.sanitizer.bypassSecurityTrustStyle(
      `--background-image_${flag}: url(${path})`
    );
  }

  getUserId() {
    if (this.order_success === false) {
      this.authService.getUserId(this.backendData).subscribe({
        next: (res: any) => {
          if (res.status == 2) {
            this.backendData = '';
            return
          }
          this.user_id = res?.user_id
        },
        error: (err: any) => {
          this.router.navigate(['/error'])
          // this.backendData = ''
          // console.log(err)
          this.messageService.error(err.error || err.message || err.toString())
        }
      })
    }

  }
  isKeyboardOpen = false;

  initialHeight = window.innerHeight;

  ngOnInit() {
    if (typeof window !== 'undefined') {

      const viewport = (window as any).visualViewport;

      if (viewport) {
        viewport.addEventListener('resize', () => {
          this.isKeyboardOpen = viewport.height < this.initialHeight - 100;
        });

      } else {
        window.addEventListener('resize', () => {
          this.isKeyboardOpen = window.innerHeight < this.initialHeight - 150;
        });
      }
    }
  }



  submit() {
    if (this.step === 'MOBILE') {

      if (!this.otpLoginForm.controls['mobile'].valid) {
        this.messageService.info(`Please enter a ${this.otpLoginForm.controls['mobile'].value ? 'valid' : ''} mobile number`);
        return;
      }
      this.loginLoading = true;
      const payload: any = { "mobile": this.otpLoginForm.value.mobile }
      payload.encoded = this.backendData

      // 🔹 Call API to send OTP
      this.authService.sendOTP(payload).subscribe({
        next: () => {
          this.loginLoading = false;
          this.step = 'OTP'; // move to step 2
        },
        error: (error) => {
          this.loginLoading = false;
          this.messageService.error(error.message || error.detail || error.toString());
        }
      });
    } else if (this.step === 'OTP') {
      if (!this.otpLoginForm.controls['otpPassword'].value) {
        this.messageService.info('Please enter a otp number');
        return;
      }
      this.loginLoading = true;
      // 🔹 Call API to verify OTP
      this.authService.verifyOTP(this.otpLoginForm.value.mobile, this.otpLoginForm.value.otpPassword, this.user_id).then(
        (user: any) => {
          this.authService.whereToNavigate({ data: this.backendData, user_id: user.id }).then((navigate) => {
            const data = navigate.payload;
            const navigateURL: any = {
              'wishlist': 'wishlist',
              'cart': 'product',
              'product': 'product',
              'invoice': 'product',
            }
            this.authService.haveDefault().then(() => {
              this.loginLoading = false;
              this.router.navigate([navigateURL[data.model.toLowerCase()], data.ids[0]],
                {
                  queryParams: {
                    model: data.model
                  }
                }).then(() => {
                });
            });
          }).catch((error) => {
            this.loginLoading = false;
            this.messageService.error(error || error.message || error.toString());
          })
        }
      ).catch(error => {
        this.loginLoading = false;
        this.messageService.error(error.message || error.toString());
      })
    }
  }
  otpLength = 6;
  ngAfterViewInit() {
    const otpControl = this.otpLoginForm.get('otpPassword');
    otpControl?.valueChanges.subscribe(val => {
      if (val != null && String(val).length === this.otpLength) {
        this.dismissKeyboardForOtp();
      }
    });
  }

  dismissKeyboardForOtp() {
    const inputs = Array.from(document.querySelectorAll('.otp-box-container input')) as HTMLInputElement[];

    if (!inputs.length) {
      const alt = Array.from(document.querySelectorAll('nz-input-otp input')) as HTMLInputElement[];
      if (alt.length) inputs.push(...alt);
    }

    if (!inputs.length) {
      this._tempInputFocusBlur();
      return;
    }

    inputs.forEach(i => i.readOnly = true);
    inputs.forEach(i => i.blur());

    try { (document.activeElement as HTMLElement)?.blur(); } catch { }

    setTimeout(() => {
      inputs.forEach(i => i.readOnly = false);
      try { (document.activeElement as HTMLElement)?.blur(); } catch { }
      try { window.scrollTo(0, 0); } catch { }
    }, 50);
  }

  private _tempInputFocusBlur() {
    const tmp = document.createElement('input');
    tmp.setAttribute('type', 'text');
    tmp.style.position = 'absolute';
    tmp.style.opacity = '0';
    tmp.style.height = '0';
    tmp.style.width = '0';
    tmp.style.top = '0';
    tmp.style.left = '0';
    tmp.readOnly = true;
    document.body.appendChild(tmp);

    tmp.focus();
    tmp.blur();

    setTimeout(() => {
      try { tmp.remove(); } catch { }
      try { window.scrollTo(0, 0); } catch { }
    }, 50);
  }

  protected readonly icons = Icons;
}
