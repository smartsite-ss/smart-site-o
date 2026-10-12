// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { ScheduledTask } from '../types/script.types';
import { ScriptEngine } from './ScriptEngine';

/**
 * Cron 字段解析器
 * 支持标准 5 字段 Cron 格式：分 时 日 月 星期
 * 支持语法：* (通配)、step (步长)、list (列表)、range (范围)
 */
class CronParser {

  /**
   * 计算 Cron 表达式的下一次执行时间
   */
  static getNextRunTime(cron: string, fromDate: Date = new Date()): number {
    const parts = cron.trim().split(/\s+/);
    if (parts.length < 5) {
      return fromDate.getTime() + 60000; // 默认每分钟
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    const next = new Date(fromDate.getTime() + 60000); // 至少 1 分钟后
    next.setSeconds(0);
    next.setMilliseconds(0);

    // 最多搜索 366 天，避免死循环
    const maxIterations = 366 * 24 * 60;
    let iterations = 0;

    while (iterations < maxIterations) {
      iterations++;

      const currentMinute = next.getMinutes();
      const currentHour = next.getHours();
      const currentDayOfMonth = next.getDate();
      const currentMonth = next.getMonth() + 1;
      const currentDayOfWeek = next.getDay();

      if (
        this.matchesField(minute, currentMinute) &&
        this.matchesField(hour, currentHour) &&
        this.matchesField(dayOfMonth, currentDayOfMonth) &&
        this.matchesField(month, currentMonth) &&
        this.matchesField(dayOfWeek, currentDayOfWeek)
      ) {
        return next.getTime();
      }

      next.setMinutes(next.getMinutes() + 1);
    }

    // 回退：1 分钟后
    return fromDate.getTime() + 60000;
  }

  /**
   * 判断某个字段值是否匹配 Cron 表达式片段
   */
  private static matchesField(fieldExpr: string, value: number): boolean {
    if (fieldExpr === '*') return true;

    // 逗号分隔的多个值/表达式
    const parts = fieldExpr.split(',');
    for (const part of parts) {
      if (this.matchesPart(part.trim(), value)) return true;
    }
    return false;
  }

  /**
   * 判断单个表达式片段是否匹配
   */
  private static matchesPart(part: string, value: number): boolean {
    // 步长：*/5 或 1-30/5
    if (part.includes('/')) {
      const [range, stepStr] = part.split('/');
      const step = parseInt(stepStr, 10);
      if (isNaN(step) || step <= 0) return false;

      if (range === '*') {
        return value % step === 0;
      }

      if (range.includes('-')) {
        const [rangeStart, rangeEnd] = range.split('-').map(Number);
        return value >= rangeStart && value <= rangeEnd && (value - rangeStart) % step === 0;
      }

      const start = parseInt(range, 10);
      return value >= start && (value - start) % step === 0;
    }

    // 范围：1-5
    if (part.includes('-')) {
      const [rangeStart, rangeEnd] = part.split('-').map(Number);
      return value >= rangeStart && value <= rangeEnd;
    }

    // 精确值
    const exact = parseInt(part, 10);
    return value === exact;
  }

  /**
   * 验证 Cron 表达式是否合法
   */
  static validate(cron: string): { valid: boolean; error?: string } {
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) {
      return { valid: false, error: `Cron 表达式需要 5 个字段，当前 ${parts.length} 个` };
    }

    const fieldNames = ['分', '时', '日', '月', '星期'];

    for (let i = 0; i < 5; i++) {
      const field = parts[i];
      if (field === '*') continue;

      if (!/^[0-9,\-*/]+$/.test(field)) {
        return { valid: false, error: `${fieldNames[i]}字段包含非法字符: "${field}"` };
      }
    }

    return { valid: true };
  }

  /**
   * 获取 Cron 表达式的可读描述
   */
  static describe(cron: string): string {
    const parts = cron.trim().split(/\s+/);
    if (parts.length < 5) return '无效表达式';

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    const descriptions: string[] = [];

    if (minute === '*' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return '每分钟执行';
    }

    if (minute === '0' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return '每小时执行';
    }

    if (hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      if (minute.includes('/')) {
        const step = minute.split('/')[1];
        return `每 ${step} 分钟执行`;
      }
      return `在第 ${minute} 分钟执行`;
    }

    if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      descriptions.push(`每天 ${hour}:${minute.padStart(2, '0')}`);
    } else if (dayOfMonth !== '*' && month === '*' && dayOfWeek === '*') {
      descriptions.push(`每月 ${dayOfMonth} 日 ${hour}:${minute.padStart(2, '0')}`);
    } else if (dayOfWeek !== '*' && dayOfMonth === '*' && month === '*') {
      const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      descriptions.push(`每${dayNames[parseInt(dayOfWeek, 10)] ?? '周'} ${hour}:${minute.padStart(2, '0')}`);
    }

    return descriptions.length > 0 ? descriptions.join('；') : cron;
  }
}

/**
 * Cron 定时调度器
 * 负责解析 Cron 表达式并调度脚本执行
 */
export class TaskScheduler {
  private static instance: TaskScheduler;
  private tasks: Map<string, ScheduledTask> = new Map();
  private runningTimers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private engine: ScriptEngine;

  constructor() {
    this.engine = ScriptEngine.getInstance();
  }

  static getInstance(): TaskScheduler {
    if (!TaskScheduler.instance) {
      TaskScheduler.instance = new TaskScheduler();
    }
    return TaskScheduler.instance;
  }

  /**
   * 调度一个脚本按 Cron 表达式执行
   */
  schedule(scriptId: string, cron: string, params?: Record<string, any>): ScheduledTask {
    // 验证 Cron 表达式
    const validation = CronParser.validate(cron);
    if (!validation.valid) {
      throw new Error(`Invalid cron expression: ${validation.error}`);
    }

    const taskId = `task_${scriptId}_${Date.now()}`;
    const nextRun = CronParser.getNextRunTime(cron);

    const task: ScheduledTask = {
      taskId,
      scriptId,
      cron,
      params,
      enabled: true,
      nextRunTime: nextRun,
      runCount: 0,
    };

    this.tasks.set(taskId, task);
    this.startCronTimer(taskId);
    return task;
  }

  /** 取消调度任务 */
  cancel(taskId: string): void {
    this.stopCronTimer(taskId);
    this.tasks.delete(taskId);
  }

  /** 暂停任务 */
  pause(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.enabled = false;
      this.stopCronTimer(taskId);
    }
  }

  /** 恢复任务 */
  resume(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.enabled = true;
      task.nextRunTime = CronParser.getNextRunTime(task.cron);
      this.startCronTimer(taskId);
    }
  }

  /** 获取所有任务 */
  getAll(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  /** 获取指定脚本的调度任务 */
  getByScriptId(scriptId: string): ScheduledTask[] {
    return Array.from(this.tasks.values()).filter((t) => t.scriptId === scriptId);
  }

  /**
   * 验证 Cron 表达式
   */
  static validateCron(cron: string): { valid: boolean; error?: string } {
    return CronParser.validate(cron);
  }

  /**
   * 获取 Cron 表达式可读描述
   */
  static describeCron(cron: string): string {
    return CronParser.describe(cron);
  }

  /**
   * 计算 Cron 表达式的下一次执行时间（公开方法）
   */
  static getNextRunTime(cron: string, fromDate: Date = new Date()): number {
    return CronParser.getNextRunTime(cron, fromDate);
  }

  /** 启动 Cron 定时器 */
  private startCronTimer(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task || !task.enabled) return;

    this.stopCronTimer(taskId);

    const checkAndRun = () => {
      const task = this.tasks.get(taskId);
      if (!task || !task.enabled) return;

      const now = Date.now();
      if (now >= task.nextRunTime) {
        task.runCount++;
        task.lastRunTime = now;
        task.nextRunTime = CronParser.getNextRunTime(task.cron, new Date());

        // 执行脚本
        this.engine.executeAsync(task.scriptId, 'cron').catch((err) => {
          console.error(`TaskScheduler: script ${task.scriptId} execution failed:`, err);
        });
      }
    };

    // 每秒检查一次
    const timerId = setInterval(checkAndRun, 1000);
    this.runningTimers.set(taskId, timerId);
  }

  /** 停止 Cron 定时器 */
  private stopCronTimer(taskId: string): void {
    const timerId = this.runningTimers.get(taskId);
    if (timerId !== undefined) {
      clearInterval(timerId);
      this.runningTimers.delete(taskId);
    }
  }

  /** 清理所有定时器 */
  destroy(): void {
    for (const timerId of this.runningTimers.values()) {
      clearInterval(timerId);
    }
    this.runningTimers.clear();
    this.tasks.clear();
  }
}