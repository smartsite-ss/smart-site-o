// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

@Injectable()
export class ExcelParserService {
  private readonly logger = new Logger(ExcelParserService.name);

  private readonly COLUMN_MAP: Record<string, string> = {
    A: 'name',
    B: 'address',
    C: 'dataType',
    D: 'scanRate',
    E: 'scale',
    F: 'offset',
    G: 'unit',
    H: 'minValue',
    I: 'maxValue',
    J: 'deadbandMode',
    K: 'description',
    L: 'alarmHigh',
    M: 'alarmLow',
  };

  async parse(filePath: string): Promise<any[]> {
    const buffer = fs.readFileSync(filePath);
    return this.parseBuffer(buffer);
  }

  async parseBuffer(buffer: Buffer): Promise<any[]> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (jsonData.length <= 1) {
      return [];
    }

    const result: any[] = [];

    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      const obj: any = {};

      for (let colIdx = 0; colIdx < 13; colIdx++) {
        const colLetter = String.fromCharCode(65 + colIdx);
        const fieldName = this.COLUMN_MAP[colLetter];
        if (fieldName) {
          const value = row[colIdx] !== undefined ? row[colIdx] : '';
          obj[fieldName] = value;
        }
      }

      if (obj.scanRate !== '' && obj.scanRate !== undefined) obj.scanRate = Number(obj.scanRate);
      if (obj.scale !== '' && obj.scale !== undefined) obj.scale = Number(obj.scale);
      if (obj.offset !== '' && obj.offset !== undefined) obj.offset = Number(obj.offset);
      if (obj.minValue !== '' && obj.minValue !== undefined) obj.minValue = Number(obj.minValue);
      if (obj.maxValue !== '' && obj.maxValue !== undefined) obj.maxValue = Number(obj.maxValue);
      if (obj.alarmHigh !== '' && obj.alarmHigh !== undefined)
        obj.alarmHigh = Number(obj.alarmHigh);
      if (obj.alarmLow !== '' && obj.alarmLow !== undefined) obj.alarmLow = Number(obj.alarmLow);

      const isEmpty = Object.values(obj).every((v) => v === '' || v === undefined || v === null);
      if (isEmpty) {
        continue;
      }

      result.push(obj);
    }

    this.logger.log(`Parsed ${result.length} rows from Excel`);
    return result;
  }
}
