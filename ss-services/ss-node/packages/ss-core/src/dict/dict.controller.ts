// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DictionaryLoaderService } from './dict-loader.service';
import { DictTable, DictItem } from './dict.types';

@Controller('dicts')
export class DictController {
  constructor(private readonly dictLoader: DictionaryLoaderService) {}

  /**
   * 获取分类树结构
   */
  @Get()
  getCategories(@Query('locale') locale?: string) {
    const categories = this.dictLoader.getCategories(locale);
    return { code: 0, data: categories, message: 'ok' };
  }

  /**
   * 获取所有字典
   */
  @Get('all')
  getAllDicts(@Query('locale') locale?: string) {
    const dicts = this.dictLoader.getAllDicts(locale);
    return { code: 0, data: dicts, message: 'ok' };
  }

  /**
   * 获取单个字典
   */
  @Get(':dictId')
  getDict(@Param('dictId') dictId: string, @Query('locale') locale?: string) {
    const dict = this.dictLoader.getDict(dictId, locale);
    if (!dict) {
      return { code: 404, data: null, message: `Dict not found: ${dictId}` };
    }
    return { code: 0, data: dict, message: 'ok' };
  }

  /**
   * 热重载所有字典
   */
  @Post('reload')
  reloadDicts() {
    this.dictLoader.reloadDicts();
    return { code: 0, data: null, message: 'Dicts reloaded successfully' };
  }

  /**
   * Create a new dictionary
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createDict(@Body() body: DictTable, @Query('locale') locale?: string) {
    const success = this.dictLoader.addDict(body, locale);
    if (!success) {
      return { code: 409, data: null, message: `Dict already exists: ${body.dictId}` };
    }
    return { code: 0, data: body, message: 'Dict created successfully' };
  }

  /**
   * Update a dictionary
   */
  @Put(':dictId')
  updateDict(
    @Param('dictId') dictId: string,
    @Body() body: Partial<DictTable>,
    @Query('locale') locale?: string,
  ) {
    const success = this.dictLoader.updateDict(dictId, body, locale);
    if (!success) {
      return { code: 404, data: null, message: `Dict not found: ${dictId}` };
    }
    return {
      code: 0,
      data: this.dictLoader.getDict(dictId, locale),
      message: 'Dict updated successfully',
    };
  }

  /**
   * Delete a dictionary
   */
  @Delete(':dictId')
  @HttpCode(HttpStatus.OK)
  deleteDict(@Param('dictId') dictId: string, @Query('locale') locale?: string) {
    const success = this.dictLoader.deleteDict(dictId, locale);
    if (!success) {
      return { code: 404, data: null, message: `Dict not found: ${dictId}` };
    }
    return { code: 0, data: null, message: 'Dict deleted successfully' };
  }

  /**
   * Add an item to a dictionary
   */
  @Post(':dictId/items')
  @HttpCode(HttpStatus.CREATED)
  addDictItem(
    @Param('dictId') dictId: string,
    @Body() body: DictItem,
    @Query('locale') locale?: string,
  ) {
    const success = this.dictLoader.addDictItem(dictId, body, locale);
    if (!success) {
      return { code: 404, data: null, message: `Dict not found: ${dictId}` };
    }
    return { code: 0, data: body, message: 'Dict item added successfully' };
  }

  /**
   * Update a dict item
   */
  @Put(':dictId/items/:itemValue')
  updateDictItem(
    @Param('dictId') dictId: string,
    @Param('itemValue') itemValue: string,
    @Body() body: Partial<DictItem>,
    @Query('locale') locale?: string,
  ) {
    const success = this.dictLoader.updateDictItem(dictId, itemValue, body, locale);
    if (!success) {
      return { code: 404, data: null, message: `Dict item not found: ${dictId}/${itemValue}` };
    }
    return { code: 0, data: null, message: 'Dict item updated successfully' };
  }

  /**
   * Delete a dict item
   */
  @Delete(':dictId/items/:itemValue')
  deleteDictItem(
    @Param('dictId') dictId: string,
    @Param('itemValue') itemValue: string,
    @Query('locale') locale?: string,
  ) {
    const success = this.dictLoader.deleteDictItem(dictId, itemValue, locale);
    if (!success) {
      return { code: 404, data: null, message: `Dict item not found: ${dictId}/${itemValue}` };
    }
    return { code: 0, data: null, message: 'Dict item deleted successfully' };
  }
}
