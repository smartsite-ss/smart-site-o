// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// ============================================================
// Mock commander before the module is loaded
// ============================================================

/** Captured Command instances: [program, initCmd, startCmd] */
const capturedInstances: any[] = [];

const createMockCommand = () => {
  const calls: Record<string, any[]> = {};

  const cmd: Record<string, any> = {
    _calls: calls,
  };

  cmd.name = jest.fn().mockImplementation((val: string) => {
    calls.name = calls.name || [];
    calls.name.push(val);
    return cmd;
  });

  cmd.description = jest.fn().mockImplementation((val: string) => {
    calls.description = calls.description || [];
    calls.description.push(val);
    return cmd;
  });

  cmd.version = jest.fn().mockImplementation((val: string) => {
    calls.version = calls.version || [];
    calls.version.push(val);
    return cmd;
  });

  cmd.command = jest.fn().mockImplementation((val: string) => {
    calls.command = calls.command || [];
    calls.command.push(val);
    const subCmd = createMockCommand();
    capturedInstances.push(subCmd);
    return subCmd;
  });

  cmd.action = jest.fn().mockReturnThis();
  cmd.option = jest.fn().mockReturnThis();
  cmd.requiredOption = jest.fn().mockReturnThis();

  // Override parse to be a no-op, preventing CLI execution during import
  cmd.parse = jest.fn();

  return cmd;
};

jest.mock('commander', () => ({
  Command: jest.fn(() => {
    const program = createMockCommand();
    capturedInstances.push(program);
    return program;
  }),
}));

// ============================================================
// Now import the module under test (mock is hoisted by Jest)
// ============================================================
import '../index';

describe('ss-cli — index.ts (CLI Configuration)', () => {
  // ---- TC-CLI-001: Program metadata ----
  describe('TC-CLI-001: Program metadata', () => {
    it('TC-CLI-001-01: should set program name to "ss-data"', () => {
      const program = capturedInstances[0];
      expect(program._calls.name).toBeDefined();
      expect(program._calls.name).toContain('ss-data');
    });

    it('TC-CLI-001-02: should set program description to "Smart SCADA Node CLI Tool"', () => {
      const program = capturedInstances[0];
      expect(program._calls.description).toBeDefined();
      expect(program._calls.description).toContain('Smart SCADA Node CLI Tool');
    });

    it('TC-CLI-001-03: should set program version to "0.1.0"', () => {
      const program = capturedInstances[0];
      expect(program._calls.version).toBeDefined();
      expect(program._calls.version).toContain('0.1.0');
    });
  });

  // ---- TC-CLI-002: Command registration ----
  describe('TC-CLI-002: Command registration', () => {
    it('TC-CLI-002-01: should register "init" command', () => {
      const program = capturedInstances[0];
      expect(program._calls.command).toBeDefined();
      expect(program._calls.command).toContain('init');
    });

    it('TC-CLI-002-02: should register "start" command', () => {
      const program = capturedInstances[0];
      expect(program._calls.command).toBeDefined();
      expect(program._calls.command).toContain('start');
    });

    it('TC-CLI-002-03: should have exactly 9 commands registered', () => {
      const program = capturedInstances[0];
      expect(program._calls.command).toHaveLength(9);
    });
  });

  // ---- TC-CLI-003: "init" command configuration ----
  describe('TC-CLI-003: "init" command configuration', () => {
    let initCmd: any;

    beforeEach(() => {
      // The init subcommand is the second instance captured (index 1)
      initCmd = capturedInstances[1];
    });

    it('TC-CLI-003-01: "init" command should have description "Initialize a new project"', () => {
      expect(initCmd).toBeDefined();
      expect(initCmd._calls.description).toBeDefined();
      expect(initCmd._calls.description).toContain('Initialize a new project');
    });

    it('TC-CLI-003-02: "init" command should have an action registered', () => {
      expect(initCmd).toBeDefined();
      expect(initCmd.action).toHaveBeenCalled();
      const actionArg = initCmd.action.mock.calls[0][0];
      expect(typeof actionArg).toBe('function');
    });

    it('TC-CLI-003-03: "init" action should log "Initializing ss-data project..."', () => {
      expect(initCmd).toBeDefined();
      const actionFn = initCmd.action.mock.calls[0][0];
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      actionFn();

      expect(consoleSpy).toHaveBeenCalledWith('Initializing ss-data project...');

      consoleSpy.mockRestore();
    });
  });

  // ---- TC-CLI-004: "start" command configuration ----
  describe('TC-CLI-004: "start" command configuration', () => {
    let startCmd: any;

    beforeEach(() => {
      // The start subcommand is the third instance captured (index 2)
      startCmd = capturedInstances[2];
    });

    it('TC-CLI-004-01: "start" command should have description "Start the server"', () => {
      expect(startCmd).toBeDefined();
      expect(startCmd._calls.description).toBeDefined();
      expect(startCmd._calls.description).toContain('Start the server');
    });

    it('TC-CLI-004-02: "start" command should have an action registered', () => {
      expect(startCmd).toBeDefined();
      expect(startCmd.action).toHaveBeenCalled();
      const actionArg = startCmd.action.mock.calls[0][0];
      expect(typeof actionArg).toBe('function');
    });

    it('TC-CLI-004-03: "start" action should log "Starting ss-data server..."', () => {
      expect(startCmd).toBeDefined();
      const actionFn = startCmd.action.mock.calls[0][0];
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      actionFn();

      expect(consoleSpy).toHaveBeenCalledWith('Starting ss-data server...');

      consoleSpy.mockRestore();
    });
  });

  // ---- TC-CLI-005: Error / edge cases ----
  describe('TC-CLI-005: Error / edge cases', () => {
    it('TC-CLI-005-01: "init" command with missing description should still not break', () => {
      // Verify init command was properly configured (covers regression)
      const initCmd = capturedInstances[1];
      expect(initCmd._calls.description).toHaveLength(1);
    });

    it('TC-CLI-005-02: "start" command with missing description should still not break', () => {
      // Verify start command was properly configured (covers regression)
      const startCmd = capturedInstances[2];
      expect(startCmd._calls.description).toHaveLength(1);
    });

    it('TC-CLI-005-03: parse() should be called after configuration', () => {
      const program = capturedInstances[0];
      expect(program.parse).toHaveBeenCalled();
    });

    it('TC-CLI-005-04: parse() should receive process.argv', () => {
      const program = capturedInstances[0];
      expect(program.parse).toHaveBeenCalledWith(process.argv);
    });
  });
});
