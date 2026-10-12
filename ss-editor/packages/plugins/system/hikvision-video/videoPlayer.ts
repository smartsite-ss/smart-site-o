// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * 视频通道与播放协议适配纯函数。
 * 播放内核（jessibuca / flv.js / hls.js）为浏览器端解码库，需按需引入；
 * 本模块只承载协议映射与网格布局等纯逻辑，便于单测。
 */

export type VideoProtocol = 'webrtc' | 'http-flv' | 'hls';

export type VideoLayout = '1x1' | '2x2' | '3x3';

export interface VideoChannel {
  /** 通道唯一 ID（用于 Vue key / 删除 / 排序） */
  id: string;
  /** 通道名称（如「1 号摄像头」「东门入口」） */
  name: string;
  /** RTSP 源地址（rtsp://user:pass@host:554/...，用于记录/网关配置） */
  sourceUrl: string;
  /** 网关转流后的播放地址（前端实际消费） */
  playUrl: string;
  /** 播放协议 */
  protocol: VideoProtocol;
  /** 摄像头认证用户名（可选） */
  username: string;
  /** 摄像头认证密码（可选） */
  password: string;
  /** 是否启用（禁用显示占位） */
  enabled: boolean;
}

/**
 * 根据协议选择播放内核类型。
 * - hls → 原生 <video>（Safari 原生支持，其余浏览器需 hls.js）
 * - http-flv → 需 flv.js
 * - webrtc → 需 jessibuca / WebRTC 信令
 */
export function resolvePlayerKind(protocol: VideoProtocol): 'native' | 'flv' | 'webrtc' {
  switch (protocol) {
    case 'hls':
      return 'native';
    case 'http-flv':
      return 'flv';
    case 'webrtc':
      return 'webrtc';
  }
}

/** 校验通道是否可播放：启用且已配置播放地址 */
export function isPlayableChannel(channel: VideoChannel): boolean {
  return channel.enabled && Boolean(channel.playUrl);
}

/** 根据布局返回网格行列数与总槽位数 */
export function resolveGrid(layout: VideoLayout): { columns: number; rows: number; total: number } {
  const map: Record<VideoLayout, { columns: number; rows: number; total: number }> = {
    '1x1': { columns: 1, rows: 1, total: 1 },
    '2x2': { columns: 2, rows: 2, total: 4 },
    '3x3': { columns: 3, rows: 3, total: 9 },
  };
  return map[layout];
}

/** 根据布局裁剪通道列表到可视槽位数（超出忽略，不足占位） */
export function resolveVisibleChannels(channels: VideoChannel[], layout: VideoLayout): VideoChannel[] {
  const { total } = resolveGrid(layout);
  return channels.slice(0, total);
}
