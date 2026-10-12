// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { I18nService } from '@ss-node/ss-i18n';
export declare class AuthService {
  private userService;
  private jwtService;
  private i18nService;
  private refreshTokenStore;
  private readonly ACCESS_TOKEN_EXPIRES;
  private readonly REFRESH_TOKEN_EXPIRES;
  constructor(userService: UserService, jwtService: JwtService, i18nService: I18nService);
  validateUser(username: string, password: string): Promise<any>;
  login(loginDto: LoginDto): Promise<{
    accessToken: string;
    refreshToken: string;
    user: {
      id: any;
      username: any;
      email: any;
      displayName: any;
      role: any;
    };
  }>;
  register(registerDto: RegisterDto): Promise<{
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      username: string;
      email: string;
      displayName: string;
      role: import('../..').UserRole;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    };
  }>;
  refreshToken(token: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }>;
  logout(token: string): Promise<void>;
  private generateTokens;
}
