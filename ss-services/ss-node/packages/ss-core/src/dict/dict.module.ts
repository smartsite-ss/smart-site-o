// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Module } from '@nestjs/common';
import { DictionaryLoaderService } from './dict-loader.service';
import { DictController } from './dict.controller';

@Module({
  controllers: [DictController],
  providers: [DictionaryLoaderService],
  exports: [DictionaryLoaderService],
})
export class DictModule {}
