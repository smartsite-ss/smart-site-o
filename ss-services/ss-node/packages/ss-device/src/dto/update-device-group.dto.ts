// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { PartialType } from '@nestjs/swagger';
import { CreateDeviceGroupDto } from './create-device-group.dto';

export class UpdateDeviceGroupDto extends PartialType(CreateDeviceGroupDto) {}
