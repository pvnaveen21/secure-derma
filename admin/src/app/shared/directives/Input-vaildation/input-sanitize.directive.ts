import { Directive, ElementRef, HostListener, Input } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appInputSanitize]'
})
export class InputSanitizeDirective {
  @Input() allowOnlyNumbers = false;
  @Input() removeLeadingSpace = false;

  constructor(private el: ElementRef, private control: NgControl) { }

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = this.el.nativeElement;
    let value = input.value;

    if (this.removeLeadingSpace) {
      value = value.replace(/^\s+/, '');
    }

    if (this.allowOnlyNumbers) {
      value = value.replace(/[^0-9]/g, '');
    }

    // Always update control value
    this.control.control?.setValue(value, { emitEvent: false });

    // Only update DOM input if changed
    if (value !== input.value) {
      input.value = value;
    }
  }
  
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.allowOnlyNumbers) return;

    const allowedKeys = [
      'Backspace', 'Tab', 'ArrowLeft', 'ArrowRight',
      'Delete', 'Home', 'End'
    ];

    // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, etc.
    if (allowedKeys.includes(event.key) || event.ctrlKey || event.metaKey) {
      return;
    }

    // Prevent entering non-numeric characters
    if (!/^[0-9]$/.test(event.key)) {
      event.preventDefault();
    }
  }
}