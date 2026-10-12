// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
interface AuthenticatedSocket extends Socket {
  user?: {
    sub: string;
    username: string;
    role: string;
  };
  connectedAt?: number;
}
export declare class ScadaWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private jwtService;
  server: Server;
  private readonly logger;
  private connectedClients;
  constructor(jwtService: JwtService);
  handleConnection(client: AuthenticatedSocket): void;
  handleDisconnect(client: Socket): void;
  handlePing(client: Socket): void;
  handleSubscribeProject(
    data: {
      projectId: string;
    },
    client: Socket,
  ): void;
  handleUnsubscribeProject(
    data: {
      projectId: string;
    },
    client: Socket,
  ): void;
  handleSubscribeDevice(
    data: {
      deviceId: string;
    },
    client: Socket,
  ): void;
  handleSubscribeTag(
    data: {
      tagIds: string[];
    },
    client: Socket,
  ): void;
  broadcastTagUpdate(
    projectId: string,
    tagData: {
      tagId: string;
      tagName: string;
      value: number;
      quality: string;
      timestamp: string;
    },
  ): void;
  broadcastBatchUpdate(
    projectId: string,
    tags: Array<{
      tagId: string;
      tagName: string;
      value: number;
      quality: string;
      timestamp: string;
    }>,
  ): void;
  broadcastAlarmTrigger(
    projectId: string,
    alarmData: {
      alarmId: string;
      ruleName: string;
      tagName: string;
      level: string;
      value: number;
      message: string;
      timestamp: string;
    },
  ): void;
  broadcastAlarmAcknowledged(
    projectId: string,
    data: {
      alarmId: string;
      acknowledgedBy: string;
      timestamp: string;
    },
  ): void;
  broadcastAlarmCleared(
    projectId: string,
    data: {
      alarmId: string;
      clearedBy: string;
      timestamp: string;
    },
  ): void;
  broadcastDeviceStatus(
    projectId: string,
    deviceId: string,
    status: {
      fromStatus: string;
      toStatus: string;
      errorMessage?: string;
      timestamp: string;
    },
  ): void;
  broadcastSystem(message: string, data?: any): void;
  sendToUser(userId: string, event: string, data: any): void;
  getConnectionCount(): number;
  getRoomSize(room: string): number;
  getMetrics(): {
    totalConnections: number;
    roomCount: number;
    rooms: Array<{
      name: string;
      size: number;
    }>;
  };
}
export {};
