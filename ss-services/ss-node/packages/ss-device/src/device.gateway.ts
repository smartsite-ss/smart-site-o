// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  namespace: '/devices',
  cors: { origin: '*', credentials: true },
})
export class DeviceGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(DeviceGateway.name);

  afterInit(_server: Server) {
    this.logger.log('Device WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe:device')
  handleSubscribeDevice(client: Socket, deviceId: string) {
    client.join(`device:${deviceId}`);
    this.logger.log(`Client ${client.id} subscribed to device:${deviceId}`);
  }

  @SubscribeMessage('unsubscribe:device')
  handleUnsubscribeDevice(client: Socket, deviceId: string) {
    client.leave(`device:${deviceId}`);
  }

  /** 推送设备状态变更 */
  pushDeviceStatus(
    deviceId: string,
    event: { fromStatus: string; toStatus: string; timestamp: string; errorMessage?: string },
  ) {
    this.server.to(`device:${deviceId}`).emit('device:statusChange', {
      deviceId,
      ...event,
    });
  }

  /** 推送 Tag 值变更 */
  pushTagValue(deviceId: string, tagId: string, value: any, quality: string, timestamp: Date) {
    this.server.to(`device:${deviceId}`).emit('device:tagUpdate', {
      tagId,
      value,
      quality,
      timestamp,
    });
  }
}
