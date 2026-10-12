// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { I18nService } from '@ss-node/ss-i18n';
import { EventBusService } from '../../event-bus/event-bus.service';

export interface RoomMember {
  socketId: string;
  userId?: string;
  username?: string;
  joinedAt: number;
}

export interface RoomJoinResult {
  allowed: boolean;
  reason?: string;
}

@Injectable()
export class RoomService implements OnModuleInit {
  private readonly logger = new Logger(RoomService.name);

  /** 房间成员存储：roomName -> Set<RoomMember> */
  private readonly memberStore = new Map<string, Map<string, RoomMember>>();

  /** 用户所属房间：userId -> Set<roomName> */
  private readonly userRooms = new Map<string, Set<string>>();

  /** socket 所属房间：socketId -> Set<roomName> */
  private readonly socketRooms = new Map<string, Set<string>>();

  constructor(
    @Inject(I18nService)
    private readonly i18n: I18nService,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit(): void {
    this.logger.log('RoomService initialized');
  }

  /**
   * 加入项目房间（带权限校验）
   * @param room 房间名
   * @param socketId socket ID
   * @param userId 用户ID（未认证用户可能为 undefined）
   * @param username 用户名
   * @param canAccess 权限校验函数：返回用户是否有权限访问该项目
   */
  joinProjectRoom(
    room: string,
    socketId: string,
    userId: string | undefined,
    username: string | undefined,
    canAccess: boolean,
  ): RoomJoinResult {
    if (!userId) {
      const reason = this.i18n.tSync('websocket.room.not_authenticated');
      return { allowed: false, reason };
    }

    if (!canAccess) {
      const projectId = room.replace('project:', '');
      const reason = this.i18n.tSync('websocket.room.permission_denied', {
        projectId,
      });
      this.logger.warn(`Permission denied: user ${username} tried to join ${room}`);
      return { allowed: false, reason };
    }

    this.addMember(room, socketId, userId, username);
    return { allowed: true };
  }

  /**
   * 加入普通房间（无权限校验）
   */
  joinRoom(room: string, socketId: string, userId?: string, username?: string): void {
    this.addMember(room, socketId, userId, username);
  }

  /**
   * 离开房间
   */
  leaveRoom(room: string, socketId: string): void {
    const members = this.memberStore.get(room);
    if (!members) return;

    const member = members.get(socketId);
    if (!member) return;

    members.delete(socketId);
    if (members.size === 0) {
      this.memberStore.delete(room);
    }

    // 清理用户房间索引
    if (member.userId) {
      const rooms = this.userRooms.get(member.userId);
      if (rooms) {
        rooms.delete(room);
        if (rooms.size === 0) {
          this.userRooms.delete(member.userId);
        }
      }
    }

    // 清理 socket 房间索引
    const socketRooms = this.socketRooms.get(socketId);
    if (socketRooms) {
      socketRooms.delete(room);
      if (socketRooms.size === 0) {
        this.socketRooms.delete(socketId);
      }
    }

    const message = this.i18n.tSync('websocket.room.left', {
      username: member.username || socketId,
      room,
    });
    this.logger.log(message);

    // 发送 user:left 事件
    this.eventBus.emit('user.left', {
      socketId,
      userId: member.userId,
      username: member.username,
      room,
      timestamp: Date.now(),
    });
  }

  /** 移除某 socket 所有房间 */
  leaveAllRooms(socketId: string): void {
    const rooms = this.socketRooms.get(socketId);
    if (!rooms) return;

    const roomNames = Array.from(rooms);
    for (const room of roomNames) {
      this.leaveRoom(room, socketId);
    }
  }

  /** 获取房间成员列表 */
  getRoomMembers(room: string): RoomMember[] {
    const members = this.memberStore.get(room);
    if (!members) return [];
    return Array.from(members.values());
  }

  /** 获取房间成员数 */
  getRoomMemberCount(room: string): number {
    return this.memberStore.get(room)?.size || 0;
  }

  /** 获取用户所在房间 */
  getUserRooms(userId: string): string[] {
    const rooms = this.userRooms.get(userId);
    return rooms ? Array.from(rooms) : [];
  }

  /** 获取 socket 所在房间 */
  getSocketRooms(socketId: string): string[] {
    const rooms = this.socketRooms.get(socketId);
    return rooms ? Array.from(rooms) : [];
  }

  /** 获取所有房间名 */
  getAllRoomNames(): string[] {
    return Array.from(this.memberStore.keys());
  }

  /** 获取所有房间统计 */
  getRoomStats(): Array<{ name: string; memberCount: number }> {
    const stats: Array<{ name: string; memberCount: number }> = [];
    this.memberStore.forEach((members, name) => {
      stats.push({ name, memberCount: members.size });
    });
    return stats.sort((a, b) => b.memberCount - a.memberCount);
  }

  /** 检查用户是否在房间中 */
  isMemberInRoom(room: string, socketId: string): boolean {
    return this.memberStore.get(room)?.has(socketId) || false;
  }

  private addMember(room: string, socketId: string, userId?: string, username?: string): void {
    if (!this.memberStore.has(room)) {
      this.memberStore.set(room, new Map());
    }

    const member: RoomMember = {
      socketId,
      userId,
      username,
      joinedAt: Date.now(),
    };

    this.memberStore.get(room)!.set(socketId, member);

    // 更新用户房间索引
    if (userId) {
      if (!this.userRooms.has(userId)) {
        this.userRooms.set(userId, new Set());
      }
      this.userRooms.get(userId)!.add(room);
    }

    // 更新 socket 房间索引
    if (!this.socketRooms.has(socketId)) {
      this.socketRooms.set(socketId, new Set());
    }
    this.socketRooms.get(socketId)!.add(room);

    const message = this.i18n.tSync('websocket.room.joined', {
      username: username || socketId,
      room,
    });
    this.logger.log(message);

    // 发送 user:joined 事件
    this.eventBus.emit('user.joined', {
      socketId,
      userId,
      username,
      room,
      timestamp: Date.now(),
    });
  }
}
