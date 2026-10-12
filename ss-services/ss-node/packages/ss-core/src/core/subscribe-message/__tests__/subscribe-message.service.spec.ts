// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * SubscribeMessageService 单元测试（10 模块）
 *
 * 覆盖：配置查询 / 授权上报（accept 累加、ban 清零、未绑定拒绝、参数校验）/
 *       配额查询 / 偏好默认值与 upsert 校验
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SubscribeMessageService } from '../subscribe-message.service';
import { WechatSubscribeAuthorization } from '../entities/wechat-subscribe-authorization.entity';
import { WechatNotificationPreference } from '../entities/wechat-notification-preference.entity';

function createService(options: {
  user?: { id: string; wechatMpOpenId: string | null } | null;
  existingAuthorization?: WechatSubscribeAuthorization | null;
  existingPreference?: WechatNotificationPreference | null;
  templateId?: string;
  deviceStatusTemplateId?: string;
  configured?: boolean;
}) {
  const userRepo = {
    findOne: jest.fn().mockResolvedValue(options.user ?? null),
  };
  const authorizationRepo = {
    findOne: jest.fn().mockResolvedValue(options.existingAuthorization ?? null),
    create: jest.fn().mockImplementation((data: Partial<WechatSubscribeAuthorization>) => ({
      quotaRemaining: 0,
      ...data,
    })),
    save: jest.fn().mockImplementation(async (entity: WechatSubscribeAuthorization) => entity),
  };
  const preferenceRepo = {
    findOne: jest.fn().mockResolvedValue(options.existingPreference ?? null),
    create: jest.fn().mockImplementation((data: Partial<WechatNotificationPreference>) => data),
    save: jest.fn().mockImplementation(async (entity: WechatNotificationPreference) => entity),
  };
  const channel = {
    getAlarmTemplateId: jest.fn().mockReturnValue(options.templateId ?? 'tpl-alarm'),
    getDeviceStatusTemplateId: jest.fn().mockReturnValue(options.deviceStatusTemplateId ?? ''),
    isConfigured: jest.fn().mockReturnValue(options.configured ?? true),
  };
  const service = new SubscribeMessageService(
    userRepo as any,
    authorizationRepo as any,
    preferenceRepo as any,
    channel as any,
  );
  return { service, userRepo, authorizationRepo, preferenceRepo, channel };
}

describe('SubscribeMessageService', () => {
  it('TC-SVC-001 getSubscribeConfig 透传通道模板配置', () => {
    const { service, channel } = createService({
      templateId: 'tpl-x',
      deviceStatusTemplateId: 'tpl-device',
      configured: false,
    });

    expect(service.getSubscribeConfig()).toEqual({
      alarmTemplateId: 'tpl-x',
      deviceStatusTemplateId: 'tpl-device',
      configured: false,
    });
    expect(channel.getAlarmTemplateId).toHaveBeenCalled();
    expect(channel.getDeviceStatusTemplateId).toHaveBeenCalled();
  });

  it('TC-SVC-002 授权上报 accept（无历史记录）创建记录并累加配额', async () => {
    const { service, authorizationRepo } = createService({
      user: { id: 'user-1', wechatMpOpenId: 'openid-1' },
    });

    const result = await service.reportAuthorization('user-1', {
      templateId: 'tpl-alarm',
      result: 'accept',
    });

    expect(result.quotaRemaining).toBe(1);
    expect(authorizationRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        mpOpenId: 'openid-1',
        templateId: 'tpl-alarm',
      }),
    );
    expect(authorizationRepo.save).toHaveBeenCalledTimes(1);
  });

  it('TC-SVC-003 授权上报 accept（已有配额 2）累加为 3', async () => {
    const existing = {
      id: 'auth-1',
      userId: 'user-1',
      mpOpenId: 'openid-1',
      templateId: 'tpl-alarm',
      authorizationStatus: 'accept',
      quotaRemaining: 2,
    } as WechatSubscribeAuthorization;
    const { service } = createService({
      user: { id: 'user-1', wechatMpOpenId: 'openid-1' },
      existingAuthorization: existing,
    });

    const result = await service.reportAuthorization('user-1', {
      templateId: 'tpl-alarm',
      result: 'accept',
    });

    expect(result.quotaRemaining).toBe(3);
  });

  it('TC-SVC-004 授权上报 ban（设置中关闭）清零配额', async () => {
    const existing = {
      id: 'auth-1',
      userId: 'user-1',
      mpOpenId: 'openid-1',
      templateId: 'tpl-alarm',
      authorizationStatus: 'accept',
      quotaRemaining: 4,
    } as WechatSubscribeAuthorization;
    const { service } = createService({
      user: { id: 'user-1', wechatMpOpenId: 'openid-1' },
      existingAuthorization: existing,
    });

    const result = await service.reportAuthorization('user-1', {
      templateId: 'tpl-alarm',
      result: 'ban',
    });

    expect(result.quotaRemaining).toBe(0);
    expect(existing.authorizationStatus).toBe('ban');
  });

  it('TC-SVC-005 用户未绑定小程序微信身份时拒绝上报', async () => {
    const { service } = createService({ user: { id: 'user-1', wechatMpOpenId: null } });

    await expect(
      service.reportAuthorization('user-1', { templateId: 'tpl-alarm', result: 'accept' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('TC-SVC-006 无效上报参数抛 BadRequest', async () => {
    const { service } = createService({ user: { id: 'user-1', wechatMpOpenId: 'openid-1' } });

    await expect(
      service.reportAuthorization('user-1', { templateId: '', result: 'accept' }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.reportAuthorization('user-1', { templateId: 'tpl-alarm', result: 'unknown' as never }),
    ).rejects.toThrow(BadRequestException);
  });

  it('TC-SVC-007 配额查询：无授权记录返回 0', async () => {
    const { service } = createService({});

    await expect(service.getQuota('user-1', 'tpl-alarm')).resolves.toEqual({ quotaRemaining: 0 });
  });

  it('TC-SVC-008 偏好查询：无记录返回默认值（开启 + info）', async () => {
    const { service, preferenceRepo } = createService({});

    const preference = await service.getPreferences('user-1');

    expect(preference.alarmNotificationEnabled).toBe(true);
    expect(preference.minimumAlarmLevel).toBe('info');
    expect(preferenceRepo.create).toHaveBeenCalled();
    expect(preferenceRepo.save).not.toHaveBeenCalled();
  });

  it('TC-SVC-009 偏好更新：新建记录并写入字段', async () => {
    const { service, preferenceRepo } = createService({});

    const updated = await service.updatePreferences('user-1', {
      alarmNotificationEnabled: false,
      minimumAlarmLevel: 'error',
    });

    expect(updated.alarmNotificationEnabled).toBe(false);
    expect(updated.minimumAlarmLevel).toBe('error');
    expect(preferenceRepo.save).toHaveBeenCalledTimes(1);
  });

  it('TC-SVC-010 偏好更新：无效级别抛 BadRequest', async () => {
    const { service } = createService({});

    await expect(
      service.updatePreferences('user-1', { minimumAlarmLevel: 'fatal' as never }),
    ).rejects.toThrow(BadRequestException);
  });
});
