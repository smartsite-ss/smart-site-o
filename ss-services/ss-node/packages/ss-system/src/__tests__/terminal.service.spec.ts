// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { Test, TestingModule } from '@nestjs/testing';
import { TerminalService } from '../terminal/terminal.service';

jest.mock('child_process', () => ({
  exec: jest.fn((cmd: string, options: any, callback: any) => {
    if (cmd.includes('dir')) {
      callback(null, 'Directory listing', '');
    } else if (cmd.includes('ping')) {
      callback(null, 'Ping result', '');
    } else {
      callback(null, '', '');
    }
  }),
}));

describe('TerminalService', () => {
  let service: TerminalService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TerminalService],
    }).compile();

    service = module.get<TerminalService>(TerminalService);
    jest.clearAllMocks();
  });

  describe('executeCommand', () => {
    it('TC-TERM-001: should block dangerous commands', async () => {
      const result = await service.executeCommand('rm -rf /', 'admin');

      expect(result.status).toBe('blocked');
      expect(result.output).toContain('blocked');
    });

    it('TC-TERM-002: should block non-whitelisted commands', async () => {
      const result = await service.executeCommand('unknown_command', 'admin');

      expect(result.status).toBe('blocked');
    });

    it('TC-TERM-003: should execute whitelisted commands', async () => {
      const result = await service.executeCommand('dir', 'admin');

      expect(result.status).toBe('completed');
    });

    it('TC-TERM-004: should block DROP TABLE', async () => {
      const result = await service.executeCommand('DROP TABLE users', 'admin');

      expect(result.status).toBe('blocked');
    });

    it('TC-TERM-005: should require admin permission', async () => {
      await expect(service.executeCommand('dir')).rejects.toThrow();
    });

    it('TC-TERM-006: should execute ping command', async () => {
      const result = await service.executeCommand('ping localhost', 'admin');

      expect(result.status).toBe('completed');
    });
  });
});
