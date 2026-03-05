import { Injectable } from '@angular/core';
import { ValidationService } from '@app/shared/directives/form-validation/validation.service';
import { Validators } from '@angular/forms';
import { CommonValidatorsConfig } from '@app/shared/directives/form-validation/interface';

@Injectable({
    providedIn: 'root'
})
export class CommonValidatorService {
    defaultConfig: CommonValidatorsConfig = {
        maxLength: 150,
    }

    validators(config: Partial<CommonValidatorsConfig> = {}, extraValidation: any[] = []) {
        const mergedConfig: CommonValidatorsConfig = {
            ...this.defaultConfig,
            ...config,
        };
        const common = [ValidationService.noWhitespaceValidator];
        const rules: Array<[boolean, any]> = [
            [!!mergedConfig.maxLength, Validators.maxLength(mergedConfig.maxLength || 150)],
            [!!mergedConfig.minLength, Validators.minLength(mergedConfig.minLength || 1)],
            [!!mergedConfig.charOnlyAllowed, Validators.pattern(/^[a-zA-Z ]+$/)],
            [!!mergedConfig.required, Validators.required],
            [!!mergedConfig.phoneNumberCheck, ValidationService.phoneValidator],
            [!!mergedConfig.emailCheck, ValidationService.emailValidator],
        ];

        rules.forEach(([condition, validator]) => {
            if (condition) {
                common.push(validator);
            }
        });

        return [...common, ...extraValidation];
    }
}
