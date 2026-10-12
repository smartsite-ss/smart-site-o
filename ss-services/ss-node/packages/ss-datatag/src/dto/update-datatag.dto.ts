// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { PartialType } from '@nestjs/swagger';
import { CreateDataTagDto } from './create-datatag.dto';

export class UpdateDataTagDto extends PartialType(CreateDataTagDto) {}
