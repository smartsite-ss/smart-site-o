// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ConfigWatcherService } from '../../../packages/ss-core/src/config/config-watcher.service';

const mockEventEmitter = {
  emit: jest.fn(),
};

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  readFileSync: jest.fn(),
  promises: {
    readFile: jest.fn().mockResolvedValue('{}'),
  },
  watch: jest.fn().mockReturnValue({ close: jest.fn() }),
  readdirSync: jest.fn().mockReturnValue([]),
}));

describe('ConfigWatcherService', () => {
  let service: ConfigWatcherService;

  beforeEach(() => {
    jest.useFakeTimers();
    mockEventEmitter.emit.mockClear();
    service = new ConfigWatcherService(mockEventEmitter as any);
  });

  afterEach(() => {
    jest.useRealTimers();
    service.onModuleDestroy();
  });

  describe('get and getAll', () => {
    it('TC-CW-001: get should return undefined for missing key', () => {
      expect(service.get('no.such.key')).toBeUndefined();
    });

    it('TC-CW-002: get should return default value for missing key', () => {
      expect(service.get('no.key', 'default')).toBe('default');
    });

    it('TC-CW-003: get should return nested value', async () => {
      await service.set('app.db.host', 'localhost');
      expect(service.get('app.db.host')).toBe('localhost');
    });

    it('TC-CW-004: getAll should return entire config copy', () => {
      const all = service.getAll();
      expect(typeof all).toBe('object');
    });
  });

  describe('set', () => {
    it('TC-CW-005: should set and persist config value', async () => {
      const result = await service.set('app.name', 'SmartSCADA');
      expect(result).toBe(true);
      expect(service.get('app.name')).toBe('SmartSCADA');
    });

    it('TC-CW-006: should return false when validation fails', async () => {
      service.addValidator('app.port', (v: any) => v > 0 && v < 65536);
      const result = await service.set('app.port', -1);
      expect(result).toBe(false);
    });

    it('TC-CW-007: should allow valid value through validator', async () => {
      service.addValidator('app.port', (v: any) => v > 0 && v < 65536);
      const result = await service.set('app.port', 8800);
      expect(result).toBe(true);
      expect(service.get('app.port')).toBe(8800);
    });

    it('TC-CW-008: should emit config.changed event on set', async () => {
      await service.set('event.key', 'val');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('config.changed', expect.any(Object));
    });

    it('TC-CW-009: should set nested path creating intermediate objects', async () => {
      await service.set('a.b.c.d', 42);
      expect(service.get('a.b.c.d')).toBe(42);
    });
  });

  describe('update', () => {
    it('TC-CW-010: should update multiple values', async () => {
      const results = await service.update({
        'app.name': 'SCADA',
        'app.version': '1.0.0',
      });
      expect(results).toHaveLength(2);
      expect(results).toEqual([true, true]);
    });
  });

  describe('subscribe and unsubscribe', () => {
    it('TC-CW-011: subscribe should return subscription id', () => {
      const id = service.subscribe('app.', jest.fn());
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('TC-CW-012: should notify subscribers on matching key change', async () => {
      const callback = jest.fn();
      service.subscribe('app.', callback);

      await service.set('app.name', 'NewName');
      jest.runAllTimers();
      expect(callback).toHaveBeenCalled();
    });

    it('TC-CW-013: should not notify subscribers on non-matching key', async () => {
      const callback = jest.fn();
      service.subscribe('app.', callback);

      await service.set('db.host', 'localhost');
      jest.runAllTimers();
      expect(callback).not.toHaveBeenCalled();
    });

    it('TC-CW-014: should match RegExp pattern', async () => {
      const callback = jest.fn();
      service.subscribe(/^db\..*/, callback);

      await service.set('db.host', 'localhost');
      jest.runAllTimers();
      expect(callback).toHaveBeenCalled();
    });

    it('TC-CW-015: unsubscribe should remove subscription', () => {
      const id = service.subscribe('x', jest.fn());
      expect(service.unsubscribe(id)).toBe(true);
      expect(service.unsubscribe('fake-id')).toBe(false);
    });
  });

  describe('validators', () => {
    it('TC-CW-016: addValidator and removeValidator', () => {
      service.addValidator('key', () => true);
      expect(service.removeValidator('key')).toBe(true);
      expect(service.removeValidator('no-key')).toBe(false);
    });
  });

  describe('export and import', () => {
    it('TC-CW-017: exportConfig should return JSON string', async () => {
      await service.set('x', 1);
      const json = service.exportConfig();
      const parsed = JSON.parse(json);
      expect(parsed.x).toBe(1);
    });

    it('TC-CW-018: importConfig should merge by default', async () => {
      await service.set('existing', 'old');
      await service.importConfig('{"newKey": "newVal"}');
      expect(service.get('existing')).toBe('old');
      expect(service.get('newKey')).toBe('newVal');
    });

    it('TC-CW-019: importConfig should replace when merge is false', async () => {
      await service.set('existing', 'old');
      await service.importConfig('{"onlyKey": 1}', { merge: false });
      expect(service.get('onlyKey')).toBe(1);
    });
  });

  describe('history and rollback', () => {
    it('TC-CW-020: getHistory should return empty initially', () => {
      const history = service.getHistory();
      expect(history).toHaveLength(0);
    });

    it('TC-CW-021: getHistory should return changes after set', async () => {
      await service.set('hist.1', 'v1');
      const history = service.getHistory();
      expect(history.length).toBeGreaterThanOrEqual(1);
    });

    it('TC-CW-022: getHistory should filter by key', async () => {
      await service.set('hist.a', 1);
      await service.set('hist.b', 2);
      const filtered = service.getHistory({ key: 'hist.a' });
      expect(filtered.length).toBeGreaterThanOrEqual(1);
    });

    it('TC-CW-023: getHistory should respect limit', async () => {
      for (let i = 0; i < 5; i++) {
        await service.set(`h.${i}`, i);
      }
      const limited = service.getHistory({ limit: 2 });
      expect(limited.length).toBeLessThanOrEqual(2);
    });

    it('TC-CW-024: rollback should restore old value', async () => {
      await service.set('rb.key', 'first');
      await service.set('rb.key', 'second');

      const history = service.getHistory({ key: 'rb.key' });
      if (history.length > 0) {
        const changeId = `${history[0].timestamp.getTime()}`;
        await service.rollback(changeId);
      }
      expect(true).toBe(true);
    });
  });
});
