// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * WechatSubscribeMessageChannel 单元测试（10 模块）
 *
 * 覆盖：未配置跳过 / Mock 配额扣减 / 偏好关闭过滤 / 级别阈值过滤 /
 *       用户限频 / 真实模式成功扣配额 / 43101 配额清零
 */
import { httpRequest } from '../../../ai/http-client.util';
import { WechatSubscribeMessageChannel } from '../wechat-subscribe-message.channel';
import { WechatSubscribeAuthorization } from '../entities/wechat-subscribe-authorization.entity';
import { WechatNotificationPreference } from '../entities/wechat-notification-preference.entity';

jest.mock('../../../ai/http-client.util', () => ({
  httpRequest: jest.fn(),
}));

const mockedHttpRequest = httpRequest as jest.MockedFunction<typeof httpRequest>;

/** 备份并在每个用例前重置相关环境变量 */
const ENV_KEYS = [
  'WECHAT_MOCK',
  'WECHAT_MP_APPID',
  'WECHAT_MP_SECRET',
  'WECHAT_SUBSCRIBE_TEMPLATE_ALARM',
  'WECHAT_SUBSCRIBE_TEMPLATE_FIELDS',
  'WECHAT_SUBSCRIBE_TEMPLATE_DEVICE_STATUS',
  'WECHAT_SUBSCRIBE_TEMPLATE_DEVICE_FIELDS',
  'WECHAT_SUBSCRIBE_RATE_LIMIT_PER_HOUR',
  'WECHAT_APPID',
  'WECHAT_SECRET',
];
const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
  mockedHttpRequest.mockReset();
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

function createAuthorization(overrides: Partial<WechatSubscribeAuthorization> = {}): WechatSubscribeAuthorization {
  return {
    id: 'auth-1',
    userId: 'user-1',
    mpOpenId: 'openid-user-1',
    templateId: 'tpl-alarm',
    authorizationStatus: 'accept',
    quotaRemaining: 2,
    authorizedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as WechatSubscribeAuthorization;
}

function createRepos(options: {
  authorizations?: WechatSubscribeAuthorization[];
  preferences?: WechatNotificationPreference[];
}) {
  const authorizationRepo = {
    find: jest.fn().mockResolvedValue(options.authorizations ?? []),
    save: jest.fn().mockImplementation(async (entity: WechatSubscribeAuthorization) => entity),
  };
  const preferenceRepo = {
    find: jest.fn().mockResolvedValue(options.preferences ?? []),
  };
  return { authorizationRepo, preferenceRepo };
}

function createChannel(repos: ReturnType<typeof createRepos>): WechatSubscribeMessageChannel {
  return new WechatSubscribeMessageChannel(
    repos.authorizationRepo as any,
    repos.preferenceRepo as any,
  );
}

const basePayload = {
  title: '温度超限',
  message: '1号锅炉温度超过阈值',
  level: 'warning',
  timestamp: new Date('2026-03-15T08:30:00Z'),
};

const baseDeviceStatusPayload = {
  deviceName: '1号锅炉',
  status: 'offline',
  projectId: 'proj-1',
  timestamp: new Date('2026-03-15T08:30:00Z'),
};

describe('WechatSubscribeMessageChannel', () => {
  it('TC-SUB-001 未配置（无模板/凭证/非 Mock）时跳过发送', async () => {
    const repos = createRepos({ authorizations: [createAuthorization()] });
    const channel = createChannel(repos);

    expect(channel.isConfigured()).toBe(false);
    const result = await channel.notifySubscribedUsers(basePayload);

    expect(result).toBe(false);
    expect(repos.authorizationRepo.find).not.toHaveBeenCalled();
  });

  it('TC-SUB-002 Mock 模式下发成功并扣减配额', async () => {
    process.env.WECHAT_MOCK = 'true';
    const authorization = createAuthorization({ quotaRemaining: 2 });
    const repos = createRepos({ authorizations: [authorization] });
    const channel = createChannel(repos);

    const result = await channel.notifySubscribedUsers(basePayload);

    expect(result).toBe(true);
    expect(repos.authorizationRepo.save).toHaveBeenCalledTimes(1);
    expect(authorization.quotaRemaining).toBe(1);
    expect(mockedHttpRequest).not.toHaveBeenCalled();
  });

  it('TC-SUB-003 用户通知偏好关闭时跳过该用户', async () => {
    process.env.WECHAT_MOCK = 'true';
    const authorization = createAuthorization();
    const preference = {
      userId: 'user-1',
      alarmNotificationEnabled: false,
      minimumAlarmLevel: 'info',
    } as WechatNotificationPreference;
    const repos = createRepos({ authorizations: [authorization], preferences: [preference] });
    const channel = createChannel(repos);

    const result = await channel.notifySubscribedUsers(basePayload);

    expect(result).toBe(false);
    expect(repos.authorizationRepo.save).not.toHaveBeenCalled();
  });

  it('TC-SUB-004 报警级别低于偏好阈值时跳过，达到阈值时下发', async () => {
    process.env.WECHAT_MOCK = 'true';
    const authorization = createAuthorization({ quotaRemaining: 1 });
    const preference = {
      userId: 'user-1',
      alarmNotificationEnabled: true,
      minimumAlarmLevel: 'error',
    } as WechatNotificationPreference;
    const repos = createRepos({ authorizations: [authorization], preferences: [preference] });
    const channel = createChannel(repos);

    // warning < error 阈值 → 跳过
    const skipped = await channel.notifySubscribedUsers(basePayload);
    expect(skipped).toBe(false);

    // critical ≥ error 阈值 → 下发
    const sent = await channel.notifySubscribedUsers({ ...basePayload, level: 'critical' });
    expect(sent).toBe(true);
    expect(authorization.quotaRemaining).toBe(0);
  });

  it('TC-SUB-005 用户限频：超出每小时上限后跳过', async () => {
    process.env.WECHAT_MOCK = 'true';
    process.env.WECHAT_SUBSCRIBE_RATE_LIMIT_PER_HOUR = '1';
    const authorization = createAuthorization({ quotaRemaining: 5 });
    const repos = createRepos({ authorizations: [authorization] });
    const channel = createChannel(repos);

    const first = await channel.notifySubscribedUsers(basePayload);
    const second = await channel.notifySubscribedUsers(basePayload);

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(authorization.quotaRemaining).toBe(4);
  });

  it('TC-SUB-006 真实模式：取 token 后下发成功，扣减配额', async () => {
    process.env.WECHAT_MP_APPID = 'wx-appid';
    process.env.WECHAT_MP_SECRET = 'wx-secret';
    process.env.WECHAT_SUBSCRIBE_TEMPLATE_ALARM = 'tpl-alarm';
    mockedHttpRequest
      .mockResolvedValueOnce({
        statusCode: 200,
        headers: {},
        body: JSON.stringify({ access_token: 'mock-token', expires_in: 7200 }),
      })
      .mockResolvedValueOnce({
        statusCode: 200,
        headers: {},
        body: JSON.stringify({ errcode: 0, errmsg: 'ok' }),
      });
    const authorization = createAuthorization({ quotaRemaining: 1 });
    const repos = createRepos({ authorizations: [authorization] });
    const channel = createChannel(repos);

    const result = await channel.notifySubscribedUsers(basePayload);

    expect(result).toBe(true);
    expect(authorization.quotaRemaining).toBe(0);
    expect(mockedHttpRequest).toHaveBeenCalledTimes(2);
    expect(mockedHttpRequest.mock.calls[0][0].url).toContain('cgi-bin/token');
    const sendRequest = mockedHttpRequest.mock.calls[1][0];
    expect(sendRequest.url).toContain('access_token=mock-token');
    const sendBody = JSON.parse(sendRequest.body as string);
    expect(sendBody.touser).toBe('openid-user-1');
    expect(sendBody.template_id).toBe('tpl-alarm');
    expect(sendBody.data.thing1.value).toBe('温度超限');
  });

  it('TC-SUB-007 真实模式：43101（用户拒收）清零配额', async () => {
    process.env.WECHAT_MP_APPID = 'wx-appid';
    process.env.WECHAT_MP_SECRET = 'wx-secret';
    process.env.WECHAT_SUBSCRIBE_TEMPLATE_ALARM = 'tpl-alarm';
    mockedHttpRequest
      .mockResolvedValueOnce({
        statusCode: 200,
        headers: {},
        body: JSON.stringify({ access_token: 'mock-token', expires_in: 7200 }),
      })
      .mockResolvedValueOnce({
        statusCode: 200,
        headers: {},
        body: JSON.stringify({ errcode: 43101, errmsg: 'user refuse to accept message' }),
      });
    const authorization = createAuthorization({ quotaRemaining: 3 });
    const repos = createRepos({ authorizations: [authorization] });
    const channel = createChannel(repos);

    const result = await channel.notifySubscribedUsers(basePayload);

    expect(result).toBe(false);
    expect(authorization.quotaRemaining).toBe(0);
    expect(repos.authorizationRepo.save).toHaveBeenCalledTimes(1);
  });

  it('TC-SUB-008 无可用授权（配额为 0）时跳过发送', async () => {
    process.env.WECHAT_MOCK = 'true';
    const repos = createRepos({ authorizations: [] });
    const channel = createChannel(repos);

    const result = await channel.notifySubscribedUsers(basePayload);

    expect(result).toBe(false);
    expect(repos.preferenceRepo.find).not.toHaveBeenCalled();
  });

  it('TC-SUB-009 通知跳转：携带 alarmRecordId 时跳转页附带参数（二期 10 #7）', async () => {
    process.env.WECHAT_MP_APPID = 'wx-appid';
    process.env.WECHAT_MP_SECRET = 'wx-secret';
    process.env.WECHAT_SUBSCRIBE_TEMPLATE_ALARM = 'tpl-alarm';
    mockedHttpRequest
      .mockResolvedValueOnce({
        statusCode: 200,
        headers: {},
        body: JSON.stringify({ access_token: 'mock-token', expires_in: 7200 }),
      })
      .mockResolvedValueOnce({
        statusCode: 200,
        headers: {},
        body: JSON.stringify({ errcode: 0, errmsg: 'ok' }),
      })
      .mockResolvedValueOnce({
        statusCode: 200,
        headers: {},
        body: JSON.stringify({ errcode: 0, errmsg: 'ok' }),
      });
    // 配额 2 保证两次发送均有授权；同实例 token 已缓存，第二次不会重复请求 token（calls: token=0、第一次=1、第二次=2）
    const authorization = createAuthorization({ quotaRemaining: 2 });
    const repos = createRepos({ authorizations: [authorization] });
    const channel = createChannel(repos);

    // 无记录 ID：保持原落页；有记录 ID：附带参数供小程序直达详情
    await channel.notifySubscribedUsers(basePayload);
    await channel.notifySubscribedUsers({ ...basePayload, alarmRecordId: 'alarm-record-1' });

    expect(mockedHttpRequest).toHaveBeenCalledTimes(3);
    const plainBody = JSON.parse(mockedHttpRequest.mock.calls[1][0].body as string);
    expect(plainBody.page).toBe('pages/alarm/list');
    const navigatedBody = JSON.parse(mockedHttpRequest.mock.calls[2][0].body as string);
    expect(navigatedBody.page).toBe('pages/alarm/list?alarmRecordId=alarm-record-1');
  });
});

describe('WechatSubscribeMessageChannel 设备状态通知（二期 10 #6）', () => {
  it('TC-SUB-101 未配置设备状态模板（非 Mock）时跳过发送', async () => {
    const repos = createRepos({ authorizations: [createAuthorization()] });
    const channel = createChannel(repos);

    const result = await channel.notifyDeviceStatus(baseDeviceStatusPayload);

    expect(result).toBe(false);
    expect(repos.authorizationRepo.find).not.toHaveBeenCalled();
  });

  it('TC-SUB-102 Mock 模式走占位模板下发成功并扣减配额', async () => {
    process.env.WECHAT_MOCK = 'true';
    const authorization = createAuthorization({
      templateId: 'mock-device-status-template',
      quotaRemaining: 2,
    });
    const repos = createRepos({ authorizations: [authorization] });
    const channel = createChannel(repos);

    const result = await channel.notifyDeviceStatus(baseDeviceStatusPayload);

    expect(result).toBe(true);
    expect(authorization.quotaRemaining).toBe(1);
    // 占位模板 ID 参与授权查询与下发，跳转设备列表页由真实模式用例校验
    expect(repos.authorizationRepo.find).toHaveBeenCalledWith({
      where: expect.objectContaining({ templateId: 'mock-device-status-template' }),
    });
    expect(mockedHttpRequest).not.toHaveBeenCalled();
  });

  it('TC-SUB-103 用户限频：设备状态通知复用每小时上限', async () => {
    process.env.WECHAT_MOCK = 'true';
    process.env.WECHAT_SUBSCRIBE_RATE_LIMIT_PER_HOUR = '1';
    const authorization = createAuthorization({
      templateId: 'mock-device-status-template',
      quotaRemaining: 5,
    });
    const repos = createRepos({ authorizations: [authorization] });
    const channel = createChannel(repos);

    const first = await channel.notifyDeviceStatus(baseDeviceStatusPayload);
    const second = await channel.notifyDeviceStatus(baseDeviceStatusPayload);

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(authorization.quotaRemaining).toBe(4);
  });

  it('TC-SUB-104 真实模式：配置模板后下发成功，跳转设备列表页且状态文案映射', async () => {
    process.env.WECHAT_MP_APPID = 'wx-appid';
    process.env.WECHAT_MP_SECRET = 'wx-secret';
    process.env.WECHAT_SUBSCRIBE_TEMPLATE_DEVICE_STATUS = 'tpl-device';
    mockedHttpRequest
      .mockResolvedValueOnce({
        statusCode: 200,
        headers: {},
        body: JSON.stringify({ access_token: 'mock-token', expires_in: 7200 }),
      })
      .mockResolvedValueOnce({
        statusCode: 200,
        headers: {},
        body: JSON.stringify({ errcode: 0, errmsg: 'ok' }),
      });
    const authorization = createAuthorization({ templateId: 'tpl-device', quotaRemaining: 1 });
    const repos = createRepos({ authorizations: [authorization] });
    const channel = createChannel(repos);

    const result = await channel.notifyDeviceStatus(baseDeviceStatusPayload);

    expect(result).toBe(true);
    expect(authorization.quotaRemaining).toBe(0);
    const sendRequest = mockedHttpRequest.mock.calls[1][0];
    const sendBody = JSON.parse(sendRequest.body as string);
    expect(sendBody.template_id).toBe('tpl-device');
    expect(sendBody.page).toBe('pages/device/list');
    expect(sendBody.data.thing1.value).toBe('1号锅炉');
    expect(sendBody.data.phrase2.value).toBe('离线');
  });

  it('TC-SUB-105 无可用授权时跳过发送', async () => {
    process.env.WECHAT_MOCK = 'true';
    const repos = createRepos({ authorizations: [] });
    const channel = createChannel(repos);

    const result = await channel.notifyDeviceStatus(baseDeviceStatusPayload);

    expect(result).toBe(false);
    expect(repos.authorizationRepo.save).not.toHaveBeenCalled();
  });
});
