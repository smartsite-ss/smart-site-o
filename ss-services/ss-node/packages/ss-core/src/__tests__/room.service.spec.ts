// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { RoomService } from '../websocket/room/room.service';
import { I18nService } from '@ss-node/ss-i18n';
import { EventBusService } from '../event-bus/event-bus.service';
import { Logger } from '@nestjs/common';

describe('RoomService', () => {
  let service: RoomService;
  let mockI18n: jest.Mocked<I18nService>;
  let mockEventBus: EventBusService;
  let mockEventEmitter: { emit: jest.Mock };

  beforeEach(() => {
    mockI18n = {
      tSync: jest.fn().mockImplementation((key: string, args?: Record<string, any>) => {
        if (args) {
          return `${key} ${JSON.stringify(args)}`;
        }
        return key;
      }),
      t: jest.fn(),
      translate: jest.fn(),
      translateSync: jest.fn(),
      getLanguage: jest.fn(),
      getFallbackLanguage: jest.fn().mockReturnValue('zh-CN'),
      getSupportedLanguages: jest.fn().mockReturnValue(['zh-CN', 'en-US']),
    } as any;

    mockEventEmitter = {
      emit: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn(),
    } as any;
    mockEventBus = new EventBusService(mockEventEmitter as any);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();

    service = new RoomService(mockI18n, mockEventBus);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('joinProjectRoom', () => {
    it('should allow joining when authenticated and has access', () => {
      const result = service.joinProjectRoom('project:p1', 'socket-1', 'user-1', 'testuser', true);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(service.getRoomMemberCount('project:p1')).toBe(1);
    });

    it('should deny joining when user is not authenticated (no userId)', () => {
      const result = service.joinProjectRoom('project:p1', 'socket-1', undefined, undefined, false);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
      expect(service.getRoomMemberCount('project:p1')).toBe(0);
    });

    it('should deny joining when canAccess is false (permission denied)', () => {
      const result = service.joinProjectRoom('project:p1', 'socket-1', 'user-1', 'testuser', false);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
      expect(Logger.prototype.warn).toHaveBeenCalled();
      expect(service.getRoomMemberCount('project:p1')).toBe(0);
    });

    it('should emit user.joined event when member added', () => {
      service.joinProjectRoom('project:p1', 'socket-1', 'user-1', 'testuser', true);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'user.joined',
        expect.objectContaining({
          socketId: 'socket-1',
          userId: 'user-1',
          username: 'testuser',
          room: 'project:p1',
        }),
      );
    });
  });

  describe('joinRoom', () => {
    it('should add member without permission check', () => {
      service.joinRoom('device:d1', 'socket-1', 'user-1', 'tester');

      expect(service.getRoomMemberCount('device:d1')).toBe(1);
      expect(service.isMemberInRoom('device:d1', 'socket-1')).toBe(true);
    });

    it('should support anonymous (no userId) join', () => {
      service.joinRoom('device:d1', 'socket-1');

      expect(service.getRoomMemberCount('device:d1')).toBe(1);
    });
  });

  describe('leaveRoom', () => {
    it('should remove member and clean up indexes', () => {
      service.joinProjectRoom('project:p1', 'socket-1', 'user-1', 'testuser', true);
      expect(service.getRoomMemberCount('project:p1')).toBe(1);

      service.leaveRoom('project:p1', 'socket-1');

      expect(service.getRoomMemberCount('project:p1')).toBe(0);
      expect(service.isMemberInRoom('project:p1', 'socket-1')).toBe(false);
      expect(service.getUserRooms('user-1')).toHaveLength(0);
      expect(service.getSocketRooms('socket-1')).toHaveLength(0);
    });

    it('should emit user.left event when member leaves', () => {
      service.joinProjectRoom('project:p1', 'socket-1', 'user-1', 'testuser', true);
      mockEventEmitter.emit.mockClear();

      service.leaveRoom('project:p1', 'socket-1');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'user.left',
        expect.objectContaining({
          socketId: 'socket-1',
          userId: 'user-1',
          username: 'testuser',
          room: 'project:p1',
        }),
      );
    });

    it('should handle leaving non-existent room gracefully', () => {
      expect(() => service.leaveRoom('project:unknown', 'socket-x')).not.toThrow();
    });

    it('should handle leaving room where socket is not a member gracefully', () => {
      service.joinRoom('project:p1', 'socket-1', 'user-1', 'tester');

      expect(() => service.leaveRoom('project:p1', 'socket-other')).not.toThrow();
      expect(service.getRoomMemberCount('project:p1')).toBe(1);
    });
  });

  describe('leaveAllRooms', () => {
    it('should remove socket from all joined rooms', () => {
      service.joinRoom('project:p1', 'socket-1', 'user-1', 'tester');
      service.joinRoom('device:d1', 'socket-1', 'user-1', 'tester');
      service.joinRoom('tag:t1', 'socket-1', 'user-1', 'tester');

      expect(service.getSocketRooms('socket-1')).toHaveLength(3);

      service.leaveAllRooms('socket-1');

      expect(service.getSocketRooms('socket-1')).toHaveLength(0);
      expect(service.getRoomMemberCount('project:p1')).toBe(0);
      expect(service.getRoomMemberCount('device:d1')).toBe(0);
      expect(service.getRoomMemberCount('tag:t1')).toBe(0);
    });

    it('should handle socket with no rooms gracefully', () => {
      expect(() => service.leaveAllRooms('socket-none')).not.toThrow();
    });
  });

  describe('getRoomMembers', () => {
    it('should return all members of a room', () => {
      service.joinRoom('project:p1', 'socket-1', 'user-1', 'u1');
      service.joinRoom('project:p1', 'socket-2', 'user-2', 'u2');

      const members = service.getRoomMembers('project:p1');

      expect(members).toHaveLength(2);
      expect(members.map((m) => m.socketId).sort()).toEqual(['socket-1', 'socket-2']);
    });

    it('should return empty array for non-existent room', () => {
      expect(service.getRoomMembers('project:unknown')).toEqual([]);
    });
  });

  describe('getUserRooms / getSocketRooms', () => {
    it('should return rooms for a user', () => {
      service.joinRoom('project:p1', 'socket-1', 'user-1', 'u1');
      service.joinRoom('device:d1', 'socket-2', 'user-1', 'u1');

      const rooms = service.getUserRooms('user-1');
      expect(rooms.sort()).toEqual(['device:d1', 'project:p1']);
    });

    it('should return empty for user with no rooms', () => {
      expect(service.getUserRooms('user-none')).toEqual([]);
    });
  });

  describe('getAllRoomNames / getRoomStats', () => {
    it('should return all room names', () => {
      service.joinRoom('project:p1', 'socket-1', 'user-1', 'u1');
      service.joinRoom('device:d1', 'socket-2', 'user-2', 'u2');

      const names = service.getAllRoomNames().sort();
      expect(names).toEqual(['device:d1', 'project:p1']);
    });

    it('should return room stats sorted by member count desc', () => {
      service.joinRoom('project:p1', 'socket-1', 'user-1', 'u1');
      service.joinRoom('project:p1', 'socket-2', 'user-2', 'u2');
      service.joinRoom('device:d1', 'socket-3', 'user-3', 'u3');

      const stats = service.getRoomStats();

      expect(stats[0].name).toBe('project:p1');
      expect(stats[0].memberCount).toBe(2);
      expect(stats[1].memberCount).toBe(1);
    });
  });
});
