// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { UserService } from './user.service';
export declare class UserController {
  private readonly userService;
  constructor(userService: UserService);
  getProfile(req: any): any;
}
