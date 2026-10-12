// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  PipeTransform,
  Injectable,
  BadRequestException,
  Inject,
  ArgumentMetadata,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { I18nService } from '../i18n.service';

interface ValidationError {
  property: string;
  constraints?: Record<string, string>;
  children?: ValidationError[];
}

@Injectable()
export class ValidationI18nPipe implements PipeTransform<any> {
  constructor(@Inject(I18nService) private readonly i18nService: I18nService) {}

  async transform(value: any, metadata: ArgumentMetadata) {
    const { metatype } = metadata;

    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToClass(metatype, value);
    const errors = await validate(object);

    if (errors.length > 0) {
      const messages = this.translateErrors(errors);
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: messages,
      });
    }

    return object;
  }

  private translateErrors(errors: ValidationError[], parentProperty = ''): string[] {
    const messages: string[] = [];

    for (const error of errors) {
      const property = parentProperty ? `${parentProperty}.${error.property}` : error.property;

      if (error.constraints) {
        for (const [constraintKey, constraintMessage] of Object.entries(error.constraints)) {
          const translated = this.translateConstraintMessage(
            constraintKey,
            constraintMessage,
            property,
            error,
          );
          messages.push(translated);
        }
      }

      if (error.children && error.children.length > 0) {
        const childMessages = this.translateErrors(error.children, property);
        messages.push(...childMessages);
      }
    }

    return messages;
  }

  private translateConstraintMessage(
    constraintKey: string,
    originalMessage: string,
    property: string,
    _error: ValidationError,
  ): string {
    const i18nKey = `validation.common.${constraintKey}`;
    const translated = this.i18nService.translateSync(i18nKey);

    if (translated !== i18nKey) {
      return translated.replace(/\{\{\s*property\s*\}\}/g, property);
    }

    return originalMessage;
  }

  private toValidate(metatype: any): boolean {
    const types = [String, Boolean, Number, Array, Object];
    return !types.some((type) => metatype === type);
  }
}
