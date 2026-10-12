// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { API_VERSION_CONFIG } from './api-version.config';

@Injectable()
export class VersionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const versionMatch = request.url?.match(/^\/api\/(v\d+)/);
    const version = versionMatch ? versionMatch[1] : null;

    if (!version) {
      return true;
    }

    if (!API_VERSION_CONFIG.supported.includes(version)) {
      throw new HttpException(
        {
          statusCode: HttpStatus.GONE,
          message: `API version '${version}' is no longer supported. Please use version '${API_VERSION_CONFIG.current}'.`,
          code: 'UNSUPPORTED_API_VERSION',
        },
        HttpStatus.GONE,
      );
    }

    return true;
  }
}
