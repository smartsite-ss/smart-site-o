// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { PaginationDto } from '../../../packages/ss-sdk/src/dto/pagination.dto';
import { validate } from 'class-validator';
import { SortOrder } from '../../../packages/ss-sdk/src/types';

describe('PaginationDto', () => {
  describe('Default Values', () => {
    it('TC-SDK-DTO-001: should have default page value of 1', () => {
      const dto = new PaginationDto();
      expect(dto.page).toBe(1);
    });

    it('TC-SDK-DTO-002: should have default pageSize value of 20', () => {
      const dto = new PaginationDto();
      expect(dto.pageSize).toBe(20);
    });

    it('TC-SDK-DTO-003: should have default sortOrder of DESC', () => {
      const dto = new PaginationDto();
      expect(dto.sortOrder).toBe(SortOrder.DESC);
    });

    it('TC-SDK-DTO-004: should have undefined keyword and sortBy by default', () => {
      const dto = new PaginationDto();
      expect(dto.keyword).toBeUndefined();
      expect(dto.sortBy).toBeUndefined();
    });
  });

  describe('Validation - page', () => {
    it('TC-SDK-DTO-005: should allow valid page value', async () => {
      const dto = new PaginationDto();
      dto.page = 3;
      const errors = await validate(dto);
      const pageErrors = errors.filter((e) => e.property === 'page');
      expect(pageErrors).toHaveLength(0);
    });

    it('TC-SDK-DTO-006: should reject page value less than 1', async () => {
      const dto = new PaginationDto();
      dto.page = 0;
      const errors = await validate(dto);
      const pageErrors = errors.filter((e) => e.property === 'page');
      expect(pageErrors.length).toBeGreaterThan(0);
    });

    it('TC-SDK-DTO-007: should reject page value of -1', async () => {
      const dto = new PaginationDto();
      dto.page = -1;
      const errors = await validate(dto);
      const pageErrors = errors.filter((e) => e.property === 'page');
      expect(pageErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Validation - pageSize', () => {
    it('TC-SDK-DTO-008: should allow valid pageSize', async () => {
      const dto = new PaginationDto();
      dto.pageSize = 50;
      const errors = await validate(dto);
      const sizeErrors = errors.filter((e) => e.property === 'pageSize');
      expect(sizeErrors).toHaveLength(0);
    });

    it('TC-SDK-DTO-009: should reject pageSize greater than 100', async () => {
      const dto = new PaginationDto();
      dto.pageSize = 200;
      const errors = await validate(dto);
      const sizeErrors = errors.filter((e) => e.property === 'pageSize');
      expect(sizeErrors.length).toBeGreaterThan(0);
    });

    it('TC-SDK-DTO-010: should reject pageSize less than 1', async () => {
      const dto = new PaginationDto();
      dto.pageSize = 0;
      const errors = await validate(dto);
      const sizeErrors = errors.filter((e) => e.property === 'pageSize');
      expect(sizeErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Optional Fields', () => {
    it('TC-SDK-DTO-011: should allow keyword to be optional', async () => {
      const dto = new PaginationDto();
      const errors = await validate(dto);
      const keywordErrors = errors.filter((e) => e.property === 'keyword');
      expect(keywordErrors).toHaveLength(0);
    });

    it('TC-SDK-DTO-012: should allow setting keyword', async () => {
      const dto = new PaginationDto();
      dto.keyword = 'test';
      const errors = await validate(dto);
      const keywordErrors = errors.filter((e) => e.property === 'keyword');
      expect(keywordErrors).toHaveLength(0);
    });
  });
});
