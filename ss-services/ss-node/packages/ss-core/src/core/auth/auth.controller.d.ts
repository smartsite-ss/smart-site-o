// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
export declare class AuthController {
  private readonly authService;
  constructor(authService: AuthService);
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
  refresh(refreshTokenDto: RefreshTokenDto): Promise<{
    accessToken: string;
    refreshToken: string;
  }>;
  logout(refreshTokenDto: RefreshTokenDto): Promise<{
    message: string;
  }>;
}
