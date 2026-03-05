import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ValidationService } from './validation.service';

@Component({
  selector: 'control-messages,[control-messages]',
  templateUrl: './control-messages.component.html',
})
export class ControlMessagesComponent {
  @Input() control!: any;
  @Input() ErrorText!: any
  @Input() type: 'select' | 'text' = 'text';
  @Input() customControlName: string = '';

  constructor() { }

  get errorMessage(): string | null | unknown {
    if (!this.control || !this.control.invalid || !this.control.errors) return null;

    const controlName = this.customControlName || getControlName(this.control);
    if (!controlName) return null;

    for (const [key, value] of Object.entries(this.control.errors)) {
      if (this.control.dirty || this.control.touched) {
        const errorMsg = ValidationService.getValidatorErrorMessage(key, value, controlName, this.type, this.ErrorText);
        return errorMsg || value;
      }
    }
    return null;
  }
}

// Find control name from FormControl
export const getControlName = (control: any): string | null => {
  const parent = control["_parent"];
  if (parent instanceof FormGroup) {
    const controlName = Object.entries(parent.controls).find(
      ([_, c]) => c === control
    )?.[0];
    return controlName?.replace(/(Id|_id)$/g, '') || null;
  }
  return null;
};
