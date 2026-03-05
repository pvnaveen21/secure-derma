import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';

import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { AuthService } from '@app/services/auth/auth.service';
import { NzMessageService } from 'ng-zorro-antd/message';
declare var google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzIconModule,
    NzCheckboxModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  passwordVisible = false;
  isLoading = false;
  loginError = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private message: NzMessageService,

  ) { }

  ngOnInit(): void {
    google.accounts.id.initialize({
      client_id: '366738678025-5bleq673qblpukr2ten3o0qq6oji7hr2.apps.googleusercontent.com',
      callback: this.handleCredentialResponse.bind(this)
    });

    google.accounts.id.renderButton(
      document.getElementById("googleBtn"),
      { theme: "outline", size: "large" }
    );
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      // remember: [false],
    });
  }
  handleCredentialResponse(response: any) {
    const idToken = response.credential;
    console.log(idToken);
    this.authService.googleLogin({ token: idToken }).then(() => {
      this.authService.redirectToHome();
    }).catch((err) => {
      this.message.error(err.message || err.error);
    })
  }

  get username() { return this.loginForm.get('username')!; }
  get password() { return this.loginForm.get('password')!; }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      Object.values(this.loginForm.controls).forEach((c) => {
        c.markAsDirty();
        c.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }

    this.isLoading = true;
    this.loginError = '';

    // Replace this with your real AuthService call

    const payload = this.loginForm.value;

    this.authService.login(payload).then(() => {
      this.authService.redirectToHome();
      this.isLoading = false;
    }).catch((err) => {
      this.message.error(err.message || err.error);
      this.isLoading = false;
    })
  }
}
