// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { RegisterDto } from '../auth/dto/register.dto';
import { I18nService } from '@ss-node/ss-i18n';
export declare class UserService {
  private userRepository;
  private i18nService;
  constructor(userRepository: Repository<User>, i18nService: I18nService);
  findById(id: string): Promise<User>;
  findByUsername(username: string): Promise<User>;
  findByUsernameOrEmail(username: string, email: string): Promise<User>;
  createUser(registerDto: RegisterDto): Promise<User>;
}
