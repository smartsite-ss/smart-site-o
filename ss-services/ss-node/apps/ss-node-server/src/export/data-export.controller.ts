// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Controller, Post, Body, Res, HttpCode } from '@nestjs/common';
import { Response } from 'express';
import { DataExportService, ExportFilter } from './data-export.service';

@Controller('api/v1/export')
export class DataExportController {
  constructor(private readonly exportService: DataExportService) {}

  @Post('csv')
  @HttpCode(200)
  async exportCSV(@Body() filters: ExportFilter, @Res() res: Response) {
    const result = await this.exportService.exportToResult({ ...filters, format: 'csv' });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('X-Row-Count', String(result.rowCount));
    res.send(result.data);
  }

  @Post('excel')
  @HttpCode(200)
  async exportExcel(@Body() filters: ExportFilter, @Res() res: Response) {
    const result = await this.exportService.exportToResult({ ...filters, format: 'excel' });

    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('X-Row-Count', String(result.rowCount));
    res.send(result.data);
  }

  @Post('stream')
  @HttpCode(200)
  async exportStream(@Body() filters: ExportFilter, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="export_stream_${Date.now()}.csv"`);
    res.setHeader('Transfer-Encoding', 'chunked');

    for await (const chunk of this.exportService.exportStream(filters)) {
      res.write(chunk);
    }

    res.end();
  }
}
