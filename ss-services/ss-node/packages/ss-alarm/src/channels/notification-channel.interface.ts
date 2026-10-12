// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 通知通道统一接口
 */
export interface INotificationChannel {
  /** 通道名称 */
  readonly name: string;
  /** 发送通知 */
  send(targets: string[], payload: NotificationPayload): Promise<boolean>;
}

/**
 * 通知载荷
 */
export interface NotificationPayload {
  /** 标题 */
  title: string;
  /** 消息内容 */
  message: string;
  /** 报警级别 */
  level: string;
  /** 设备名称 */
  deviceName?: string;
  /** 时间戳 */
  timestamp: Date;
}
