// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { API_VERSION_CONFIG } from './api-version.config';

@Injectable()
export class VersionMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const versionMatch = req.url.match(/^\/api\/(v\d+)/);
    const version = versionMatch ? versionMatch[1] : null;

    if (version && API_VERSION_CONFIG.deprecated.includes(version)) {
      res.setHeader('Deprecation', 'true');
      res.setHeader('Sunset', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toUTCString());
      res.setHeader('Link', `</api/${API_VERSION_CONFIG.current}>; rel="latest-version"`);
    }

    next();
  }
}
