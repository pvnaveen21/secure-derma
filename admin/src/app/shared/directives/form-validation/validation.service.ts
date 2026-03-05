import { Injectable } from '@angular/core';
import { AbstractControl, FormGroup, FormControl, ValidationErrors, ValidatorFn } from '@angular/forms';

@Injectable({
    providedIn: 'root'
})
export class ValidationService {

    static getValidatorErrorMessage(validatorName: string, validatorValue?: any, controlName?: string, type: 'text' | 'select' = 'text', ErrorText?: any) {
        const formattedControlName = this.formatControlName(controlName);


        const config: Record<string, string> = {
            'pattern': this.patternMessage(controlName),
            'required': type === 'select' ? `Please select ${formattedControlName}` : `Please enter ${ErrorText ? ErrorText : formattedControlName}`,
            'max': `Maximum ${validatorValue?.max}`,
            'min': `Minimum ${validatorValue?.min}`,
            'invalidInteger': 'Invalid number, enter like 1, 3, 40, 90',
            'invalidDecimal': 'Invalid number, enter like 1, 1.1, 1.22',
            'invalidOneDecimal': 'Invalid number, enter like 1, 1.1, 2.5',
            'minlength': `Minimum ${validatorValue.requiredLength} characters`,
            'maxlength': `Maximum ${validatorValue.requiredLength} characters`,
            'invalidEmailAddress': 'Please enter a valid email address',
            'invalidPhoneNumber': 'Mobile number must be 10 digits',
            'invalidMobileNumber': 'Mobile number must be 10 or 12 digits',
            'invalidUserName': 'Please avoid spaces in username',
            'notEqual': `Entered ${formattedControlName} doesn't match`,
            'valueLess': 'Value should be greater than the score from',
            'duplicated': 'Duplicated',
            'onlyLowercase': 'Only lowercase characters and numbers allowed',
            'domainName': 'Only lowercase characters allowed',
            'whitespace': 'Empty space not allowed',
            'multiSpace': 'Multiple spaces not allowed',
            'dateFormed': 'Invalid date. Please use DD-MM-YYYY format',
            'validDate': 'Disabled date selection is not allowed',
            'noSpace': 'Space not allowed',
            'numberCharAndHyphen': 'Only numbers, characters, hyphens, and underscores allowed',
            'formatValidator': 'Invalid date format. Please select a valid date',
            'validDateRange': 'Disabled calendar date selection is not allowed',
            'emailOrPhone': 'Enter a valid email or phone number',
            'invalidNonEmptyList': 'Please select atleast one value.',
            'email': 'Please enter a valid email',
            'url': 'Please enter a valid URL',
            'missingLowercase': 'Password must contain at least one lowercase letter.',
            'missingUppercase': 'Password must contain at least one uppercase letter.',
            'missingSpecialChar': 'Password must contain at least one special character (@$!%*?&).',
            'missingNumber': 'Password must contain at least one number.',

        };
        return config[validatorName] || 'Please enter valid ' + formattedControlName;
    }

    static equalValidator(group: FormGroup): ValidationErrors | null {
        const values = Object.values(group.controls).map(control => control.value);
        const allEqual = values.every(val => val === values[0]);

        return allEqual ? null : { 'notEqual': true };
    }

    static patternMessage(controlName?: string): string {
        const patterns: Record<string, string> = {
            'application_name': 'Start with an alphabet followed by alphanumeric or hyphen',
            'project_name': 'Start with an alphabet followed by alphanumeric or hyphen',
            'steps': 'Start with an alphabet followed by alphanumeric or hyphen',
            'delete': 'You need to type the word "DELETE" to remove',
            'link': 'Please enter a valid link'
        };

        return controlName ? patterns[controlName] : 'Invalid characters';
    }

    static formatControlName(name?: string): string {
        return name ? name.replace(/_/g, ' ') : 'input';
    }

    static DecimalValidator(control: FormControl): ValidationErrors | null {
        const value = control.value?.toString();
        if (!value) return null;

        return /^\d+(\.\d{1,2})?$/.test(value) ? null : { 'invalidDecimal': true };
    }

    static DecimalOneValidator(control: FormControl): ValidationErrors | null {
        const value = control.value?.toString();
        if (!value) return null;

        return /^\d+(\.\d{1})?$/.test(value) ? null : { 'invalidOneDecimal': true };
    }

    static urlValidator(control: FormControl) {
        if (!control.value) {
            return null; // If the field is empty, don't validate
        }

        const urlPattern = /^(https?:\/\/)([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
        return urlPattern.test(control.value) ? null : { invalidUrl: true };
    }

    static youtubeUrlValidator(control: FormControl) {
        if (!control.value) {
            return null; // If the field is empty, don't validate
        }

        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]+(&.*)?$/;
        return youtubeRegex.test(control.value) ? null : { invalidYoutubeUrl: true };
    }

    static IntegerValidator(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            const value = control.value?.toString();
            if (!value) return null;

            return /^\d+$/.test(value) ? null : { 'invalidInteger': true };
        };
    }

    static emailValidator(control: FormControl): ValidationErrors | null {
        const value = control.value;
        if (!value) return null;

        const reg = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
        return reg.test(value) ? null : { 'invalidEmailAddress': true };
    }

    static phoneValidator(control: FormControl): ValidationErrors | null {
        return /^[0-9]{10}$/.test(control.value) ? null : { 'invalidPhoneNumber': true };
    }

    static userNameValidator(control: FormControl): ValidationErrors | null {
        const regex = /\s/;
        return regex.test(control.value) ? { 'invalidUserName': true } : null;
    }

    static onlyLowerCase(control: FormControl): ValidationErrors | null {
        const regex = /^[a-z0-9]*$/;
        return regex.test(control.value) ? null : { 'onlyLowercase': true };
    }

    static noWhitespaceValidator(control: FormControl): ValidationErrors | null {
        return control.value ? control.value?.trim() ? null : { 'whitespace': true } : null;
    }

    static noSpaceValidator(control: FormControl): ValidationErrors | null {
        return /\s/.test(control.value) ? { 'noSpace': true } : null;
    }

    // Non empty validator
    static nonEmptyListValidator(control: FormControl) {
        // Checks is array & has Minimum one item in array
        if (control.value instanceof Array && (control.value.length > 0)) {
            return null;
        } else {
            return { 'invalidNonEmptyList': true };
        }
    }

    static emailOrPhoneValidator(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            const value = control.value;

            if (!value) {
                return null; // Allow empty values (if required, handle with `Validators.required`)
            }

            // Email regex pattern
            const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;

            // Phone number regex pattern (international format)
            const phonePattern = /^\+?[1-9][0-9]{7,14}$/;

            if (emailPattern.test(value) || phonePattern.test(value)) {
                return null; // Valid email or phone number
            }

            return { emailOrPhone: true }; // Invalid input
        };
    }
    // Add these validator functions to your component
    public static passwordValidator(control: AbstractControl): ValidationErrors | null {
        const value = control.value;
        if (!value) return null;

        const errors: ValidationErrors = {};

        // Check for lowercase letter
        if (!/[a-z]/.test(value)) {
            errors['missingLowercase'] = true;
        }

        // Check for uppercase letter
        if (!/[A-Z]/.test(value)) {
            errors['missingUppercase'] = true;
        }

        // Check for special character
        if (!/[@$!%*?&]/.test(value)) {
            errors['missingSpecialChar'] = true;
        }

        if (!/[0-9]/.test(value)) {
            errors['missingNumber'] = true;
        }

        // Check for leading space (you already have this in your pattern)
        if (/^\s/.test(value)) {
            errors['leadingSpace'] = true;
        }

        return Object.keys(errors).length > 0 ? errors : null;
    }
}
