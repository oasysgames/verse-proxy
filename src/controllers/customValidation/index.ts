import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint()
export class StringOrNumber implements ValidatorConstraintInterface {
  validate(value: any) {
    return typeof value === 'string' || typeof value === 'number';
  }

  defaultMessage() {
    return '($value) is not string or number';
  }
}
