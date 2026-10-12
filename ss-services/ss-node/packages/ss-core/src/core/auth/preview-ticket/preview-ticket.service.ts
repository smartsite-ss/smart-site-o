// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuthService } from '../auth.service';
import { UserService } from '../../user/user.service';

/** 一次性预览票据条目：绑定签发用户与过期时刻 */
interface PreviewTicketEntry {
  userId: string;
  expiresAtTimestamp: number;
}

/** 票据生成结果 */
export interface PreviewTicketTokenPair {
  accessToken: string;
  refreshToken: string;
}

/** 票据有效期（毫秒）：足够 H5 运行态壳加载并完成兑换，又足够短以降低 URL 泄露风险 */
const PREVIEW_TICKET_TTL_MS = 60 * 1000;

/** 票据存储上限：防止恶意高频签发撑爆内存（超限清理最旧条目） */
const MAX_PREVIEW_TICKET_COUNT = 1000;

/**
 * 组态运行态预览一次性票据服务（06 方案路线 B #2 ticket 鉴权桥）
 *
 * 场景：移动端（uni-app H5/App/小程序）以 Bearer Token 持有会话，而 Web 组态运行态壳
 * （ss-editor /preview）依赖 HttpOnly Cookie 会话。票据桥接两种会话形态：
 *   1. 移动端携带 Bearer Token 调 POST /auth/preview-ticket 签发一次性票据；
 *   2. 票据经 URL 传入 H5 运行态壳，壳内调 POST /auth/preview-ticket-exchange
 *      兑换为 HttpOnly Cookie 会话（兑换即销毁，防重放）。
 */
@Injectable()
export class PreviewTicketService {
  private readonly logger = new Logger(PreviewTicketService.name);
  private readonly previewTicketStore = new Map<string, PreviewTicketEntry>();

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  /**
   * 组装运行态壳完整预览 URL（方案 C：后端下发，前端零拼接）。
   * 壳基地址由后端环境变量 SCADA_SHELL_BASE_URL 配置：
   * - 本地调试：http://localhost:5173（full 壳 dev，跨端口由后端显式给出）；
   * - 生产：/scada-preview（H5 同源相对路径，浏览器按当前 origin 解析，天然同源免跨域）。
   * 未配置时返回 undefined，调用方回退本地拼接兜底（VITE_WEB_PREVIEW_BASE_URL）。
   */
  buildPreviewUrl(
    previewTicket: string,
    parameters: { projectId?: string; pageName?: string; group?: string },
  ): string | undefined {
    const shellBaseUrl = process.env.SCADA_SHELL_BASE_URL?.trim();
    if (!shellBaseUrl) {
      return undefined;
    }
    const queryParts = [`ticket=${encodeURIComponent(previewTicket)}`];
    if (parameters.projectId) {
      queryParts.push(`projectId=${encodeURIComponent(parameters.projectId)}`);
    }
    if (parameters.pageName) {
      queryParts.push(`pageName=${encodeURIComponent(parameters.pageName)}`);
    }
    if (parameters.group) {
      queryParts.push(`group=${encodeURIComponent(parameters.group)}`);
    }
    return `${shellBaseUrl.replace(/\/+$/, '')}/preview?${queryParts.join('&')}`;
  }

  /** 为指定用户签发一次性预览票据（60 秒有效，兑换后立即销毁） */
  issuePreviewTicket(userId: string): string {
    this.purgeExpiredPreviewTickets();
    if (this.previewTicketStore.size >= MAX_PREVIEW_TICKET_COUNT) {
      const oldestTicketKey = this.previewTicketStore.keys().next().value;
      if (oldestTicketKey !== undefined) {
        this.previewTicketStore.delete(oldestTicketKey);
      }
    }
    const previewTicket = randomUUID();
    this.previewTicketStore.set(previewTicket, {
      userId,
      expiresAtTimestamp: Date.now() + PREVIEW_TICKET_TTL_MS,
    });
    this.logger.debug(
      `[预览票据] 已签发 | userId="${userId}" | pendingTicketCount=${this.previewTicketStore.size}`,
    );
    return previewTicket;
  }

  /**
   * 兑换票据为 Token 对（一次性消费：无论有效与否先移除，防止重放）。
   * 无效/过期/用户不存在一律抛 401，不泄露具体原因差异给调用方。
   */
  async consumePreviewTicket(previewTicket: string): Promise<PreviewTicketTokenPair> {
    this.purgeExpiredPreviewTickets();
    const ticketEntry = this.previewTicketStore.get(previewTicket);
    this.previewTicketStore.delete(previewTicket);
    if (!ticketEntry || Date.now() > ticketEntry.expiresAtTimestamp) {
      this.logger.warn('[预览票据] 兑换失败：票据不存在或已过期');
      throw new UnauthorizedException('预览票据无效或已过期');
    }
    const user = await this.userService.findById(ticketEntry.userId);
    if (!user) {
      this.logger.warn(`[预览票据] 兑换失败：用户不存在 | userId="${ticketEntry.userId}"`);
      throw new UnauthorizedException('预览票据无效或已过期');
    }
    this.logger.log(
      `[预览票据] 兑换成功 | userId="${user.id}" username="${user.username}" | pendingTicketCount=${this.previewTicketStore.size}`,
    );
    return this.authService.generateTokensForUser({
      id: user.id,
      username: user.username,
      role: user.role,
    });
  }

  /** 清理过期票据（签发/兑换时顺带执行，无需独立定时器） */
  private purgeExpiredPreviewTickets(): void {
    const nowTimestamp = Date.now();
    for (const [ticketKey, ticketEntry] of this.previewTicketStore) {
      if (nowTimestamp > ticketEntry.expiresAtTimestamp) {
        this.previewTicketStore.delete(ticketKey);
      }
    }
  }
}
