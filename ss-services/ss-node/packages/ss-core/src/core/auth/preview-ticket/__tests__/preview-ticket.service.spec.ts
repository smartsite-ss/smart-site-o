// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { UnauthorizedException } from '@nestjs/common';
import { PreviewTicketService } from '../preview-ticket.service';
import { AuthService } from '../../auth.service';
import { UserService } from '../../../user/user.service';
import { User } from '../../../user/entities/user.entity';

// Mock 依赖（与 auth 域既有手工 mock 风格一致）
const mockAuthService = {
  generateTokensForUser: jest.fn(),
};

const mockUserService = {
  findById: jest.fn(),
};

const TOKEN_PAIR = { accessToken: 'access-token', refreshToken: 'refresh-token' };

function buildUser(overrides?: Partial<User>): User {
  return {
    id: 'user-1',
    username: 'operator',
    role: 'user',
    ...overrides,
  } as User;
}

describe('PreviewTicketService', () => {
  let service: PreviewTicketService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockAuthService.generateTokensForUser.mockResolvedValue(TOKEN_PAIR);
    mockUserService.findById.mockResolvedValue(buildUser());
    service = new PreviewTicketService(
      mockAuthService as unknown as AuthService,
      mockUserService as unknown as UserService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('签发的票据可兑换为 Token 对（用户身份取自签发时绑定的 userId）', async () => {
    const previewTicket = service.issuePreviewTicket('user-1');

    const tokenPair = await service.consumePreviewTicket(previewTicket);

    expect(tokenPair).toEqual(TOKEN_PAIR);
    expect(mockUserService.findById).toHaveBeenCalledWith('user-1');
    expect(mockAuthService.generateTokensForUser).toHaveBeenCalledWith({
      id: 'user-1',
      username: 'operator',
      role: 'user',
    });
  });

  it('票据一次性消费：第二次兑换同票据抛 401（防重放）', async () => {
    const previewTicket = service.issuePreviewTicket('user-1');
    await service.consumePreviewTicket(previewTicket);

    await expect(service.consumePreviewTicket(previewTicket)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('超过 60 秒有效期的票据不可兑换', async () => {
    const previewTicket = service.issuePreviewTicket('user-1');
    jest.advanceTimersByTime(61 * 1000);

    await expect(service.consumePreviewTicket(previewTicket)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mockAuthService.generateTokensForUser).not.toHaveBeenCalled();
  });

  it('未知票据兑换抛 401', async () => {
    await expect(service.consumePreviewTicket('nonexistent-ticket')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('票据绑定用户不存在时抛 401', async () => {
    mockUserService.findById.mockResolvedValue(null);
    const previewTicket = service.issuePreviewTicket('user-deleted');

    await expect(service.consumePreviewTicket(previewTicket)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mockAuthService.generateTokensForUser).not.toHaveBeenCalled();
  });

  describe('buildPreviewUrl（方案 C：后端下发完整壳 URL）', () => {
    const originalShellBaseUrl = process.env.SCADA_SHELL_BASE_URL;

    afterEach(() => {
      if (originalShellBaseUrl === undefined) {
        delete process.env.SCADA_SHELL_BASE_URL;
      } else {
        process.env.SCADA_SHELL_BASE_URL = originalShellBaseUrl;
      }
    });

    it('未配置 SCADA_SHELL_BASE_URL 时返回 undefined（前端回退本地拼接）', () => {
      delete process.env.SCADA_SHELL_BASE_URL;

      expect(
        service.buildPreviewUrl('ticket-abc', { projectId: 'demo', pageName: 'page-1' }),
      ).toBeUndefined();
    });

    it('按配置基地址拼装完整预览 URL（含全部可选参数）', () => {
      process.env.SCADA_SHELL_BASE_URL = 'http://localhost:5173';

      expect(
        service.buildPreviewUrl('ticket-abc', {
          projectId: 'demo',
          pageName: 'page-1',
          group: 'group-a',
        }),
      ).toBe(
        'http://localhost:5173/preview?ticket=ticket-abc&projectId=demo&pageName=page-1&group=group-a',
      );
    });

    it('可选参数缺省时不拼接对应查询项，且去除基地址尾部斜杠', () => {
      process.env.SCADA_SHELL_BASE_URL = '/scada-preview/';

      expect(service.buildPreviewUrl('ticket-abc', {})).toBe('/scada-preview/preview?ticket=ticket-abc');
    });
  });
});
