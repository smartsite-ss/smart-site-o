// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  WebSocketGateway as NestWebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { TerminalService } from './terminal.service';

/**
 * 终端 WebSocket CORS 白名单：与主网关一致的环境变量来源 + Tauri 桌面端源兜底，
 * 否则桌面端（页面源 https://tauri.localhost）终端连接握手被拒。
 */
function buildTerminalCorsOrigins(): string[] {
  const origins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:4000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const TAURI_DESKTOP_ORIGINS = ['https://tauri.localhost', 'tauri://localhost'];
  for (const tauriOrigin of TAURI_DESKTOP_ORIGINS) {
    if (!origins.includes(tauriOrigin)) {
      origins.push(tauriOrigin);
    }
  }
  return origins;
}

@Injectable()
@NestWebSocketGateway({
  namespace: '/terminal',
  cors: { origin: buildTerminalCorsOrigins(), credentials: true },
  transports: ['websocket'],
})
export class TerminalGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TerminalGateway.name);
  private connectedClients = new Map<string, { socket: Socket; username?: string }>();

  constructor(private readonly terminalService: TerminalService) {}

  handleConnection(client: Socket): void {
    this.connectedClients.set(client.id, { socket: client });
    this.logger.log(`Terminal client connected: ${client.id}`);
    client.emit('terminal:connected', {
      message: 'Web terminal ready',
      timestamp: new Date().toISOString(),
    });
  }

  handleDisconnect(client: Socket): void {
    this.connectedClients.delete(client.id);
    this.logger.log(`Terminal client disconnected: ${client.id}`);
  }

  @SubscribeMessage('terminal:execute')
  async handleExecute(
    @MessageBody() data: { command: string; adminUser?: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    try {
      const result = await this.terminalService.executeCommand(data.command, data.adminUser);
      client.emit('terminal:result', result);
    } catch (error) {
      client.emit('terminal:error', {
        message: error.message || 'Command execution failed',
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage('terminal:active')
  handleGetActive(@ConnectedSocket() client: Socket): void {
    const active = this.terminalService.getActiveCommands();
    client.emit('terminal:active', { commands: active });
  }
}
