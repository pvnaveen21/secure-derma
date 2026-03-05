import { ChangeDetectorRef, Component } from '@angular/core';
import { NzFlexModule } from 'ng-zorro-antd/flex';
import { Assets } from '@app/shared/assets';
import { SvgLoad } from '@app/shared/assets/svg-load';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '@app/services/auth/auth.service';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Router } from '@angular/router';
import { NgStyle } from '@angular/common';
import { ButtonLoaderComponent } from '@app/shared/components/button-loader/button-loader.component';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-change-password',
  imports: [
    NzFlexModule,
    SvgLoad,
    NzInputModule,
    NzIconModule,
    FormsModule,
    NgStyle,
    ReactiveFormsModule,
    ButtonLoaderComponent
  ],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss'
})
export class ChangePasswordComponent {
  assets: any = Assets;
  passwordVisibleCurrent = false;
  passwordVisibleNew = false;
  passwordVisibleConfirm = false;
  loginLoading = false;
  form!: FormGroup;

  constructor(
    private sanitizer: DomSanitizer,
    private authService: AuthService,
    private message: NzMessageService,
    private router: Router,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.passwordChangeForm();
  }
  passwordChangeForm() {
    this.form = this.fb.group({
      // old_password: ['', Validators.required],
      new_password1: ['', Validators.required],
      new_password2: ['', Validators.required]
    });
  }

  getBackgroundStyle(path: string, flag: string): SafeStyle {
    return this.sanitizer.bypassSecurityTrustStyle(
      `--background-image_${flag}: url(${path})`
    );
  }

  changePassword() {

    if (!this.form.valid) {
      this.message.info('Please enter passwords.');
      return;
    }
    this.loginLoading = true;
    this.authService.changePassword(this.form.getRawValue()).subscribe({
      next: (res: any) => {
        this.loginLoading = false;
        this.authService.markPasswordChanged();
        this.authService.redirectToHome()
        this.loginLoading = false;
        this.message.success(res.message);
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.message.error(err.message || err.error);
        this.loginLoading = false;
        // this.router.navigate(['/']).then();
      }
    });
    // return;
  }
}
