// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';

@Injectable()
export class JsonParserService {
  private readonly logger = new Logger(JsonParserService.name);

  async parse(filePath: string): Promise<any[]> {
    const content = fs.readFileSync(filePath, 'utf-8');
    return this.parseString(content);
  }

  parseString(jsonString: string): any[] {
    const parsed = JSON.parse(jsonString);

    if (Array.isArray(parsed)) {
      return parsed;
    }

    if (typeof parsed === 'object' && parsed !== null) {
      return [parsed];
    }

    return [];
  }
}
