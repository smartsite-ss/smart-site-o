// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import client from '../client';

/** 定时器配置条目 */
export interface TimerConfigEntry {
  id: string;
  name: string;
  module: string;
  currentInterval: number;
  defaultInterval: number;
  description: string;
  runtimeUpdate: boolean;
}

export const timerConfigApi = {
  /** 获取所有定时任务配置 */
  getAll(): Promise<TimerConfigEntry[]> {
    return client.get('/system/timer-configs').then((res) => res.data);
  },

  /** 获取单个定时任务配置 */
  getById(id: string): Promise<TimerConfigEntry> {
    return client.get(`/system/timer-configs/${id}`).then((res) => res.data);
  },

  /** 更新定时任务间隔 */
  updateInterval(id: string, interval: number): Promise<TimerConfigEntry> {
    return client
      .put(`/system/timer-configs/${id}`, { interval })
      .then((res) => res.data);
  },

  /** 重置定时任务为默认值 */
  resetInterval(id: string): Promise<TimerConfigEntry> {
    return client
      .post(`/system/timer-configs/${id}/reset`)
      .then((res) => res.data);
  },
};
