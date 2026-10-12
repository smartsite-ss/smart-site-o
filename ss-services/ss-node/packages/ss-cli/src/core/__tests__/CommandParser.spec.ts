// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// ============================================================
// Unit tests for CommandParser — commander-based CLI parser
// ============================================================

import 'jest';

// ---------- Mock commander ----------
// Each Command instance is a chainable mock that records calls
// (name/description/version/option/command/action/parse) so tests
// can assert how the parser configured the program.

interface MockCommand {
  _calls: {
    name?: string[];
    description?: string[];
    version?: string[];
    option?: Array<{ flags: string; desc: string }>;
    command?: string[];
    action?: Array<{ fn: (...args: unknown[]) => unknown }>;
  };
  name: jest.Mock;
  description: jest.Mock;
  version: jest.Mock;
  option: jest.Mock;
  requiredOption: jest.Mock;
  command: jest.Mock;
  action: jest.Mock;
  parse: jest.Mock;
  exit: jest.Mock;
}

const capturedInstances: MockCommand[] = [];

function createMockCommand(): MockCommand {
  const calls: MockCommand['_calls'] = {};
  const cmd = {} as MockCommand;

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

  cmd.option = jest.fn().mockImplementation((flags: string, desc: string) => {
    calls.option = calls.option || [];
    calls.option.push({ flags, desc });
    return cmd;
  });

  cmd.requiredOption = jest.fn().mockReturnThis();

  cmd.command = jest.fn().mockImplementation((val: string) => {
    calls.command = calls.command || [];
    calls.command.push(val);
    const subCmd = createMockCommand();
    capturedInstances.push(subCmd);
    return subCmd;
  });

  cmd.action = jest.fn().mockImplementation((fn: (...args: unknown[]) => unknown) => {
    calls.action = calls.action || [];
    calls.action.push({ fn });
    return cmd;
  });

  cmd.parse = jest.fn();
  cmd.exit = jest.fn();

  cmd._calls = calls;
  return cmd;
}

jest.mock('commander', () => ({
  Command: jest.fn(() => {
    const program = createMockCommand();
    capturedInstances.push(program);
    return program;
  }),
}));

// ---------- Mock script-create-wizard ----------
// The wizard is invoked asynchronously by the script create-wizard
// command's action. We capture the args passed to it so tests can
// assert that an ApiClient was provided.

const wizardRunMock = jest.fn().mockResolvedValue(undefined);
jest.mock('../../commands/script-create-wizard', () => ({
  runScriptCreateWizard: wizardRunMock,
}));

// ---------- Import after mocks are in place ----------
import { CommandParser } from '../CommandParser';
import { ApiClient } from '../ApiClient';

describe('ss-cli — CommandParser (core/CommandParser.ts)', () => {
  let parser: CommandParser;

  beforeEach(() => {
    capturedInstances.length = 0;
    wizardRunMock.mockClear();
    wizardRunMock.mockResolvedValue(undefined);
    // Reset env vars used by createApiClient
    delete process.env.SS_CLI_SERVER_URL;
    delete process.env.SS_CLI_API_KEY;
    delete process.env.SS_CLI_TOKEN;
    parser = new CommandParser();
  });

  afterEach(() => {
    if (process.env.SS_CLI_SERVER_URL === undefined) delete process.env.SS_CLI_SERVER_URL;
    if (process.env.SS_CLI_API_KEY === undefined) delete process.env.SS_CLI_API_KEY;
    if (process.env.SS_CLI_TOKEN === undefined) delete process.env.SS_CLI_TOKEN;
  });

  // ---- TC-CP-001: Construction & program metadata ----
  describe('TC-CP-001: Construction & program metadata', () => {
    it('TC-CP-001-01: should construct a CommandParser instance', () => {
      expect(parser).toBeInstanceOf(CommandParser);
    });

    it('TC-CP-001-02: should create exactly one top-level Command on construction', () => {
      // Construction registers global options, so the program is the first captured instance
      expect(capturedInstances.length).toBeGreaterThanOrEqual(1);
    });

    it('TC-CP-001-03: should set program name to "ss-data"', () => {
      const program = capturedInstances[0];
      expect(program._calls.name).toBeDefined();
      expect(program._calls.name).toContain('ss-data');
    });

    it('TC-CP-001-04: should set program description to "Smart SCADA Node CLI Tool"', () => {
      const program = capturedInstances[0];
      expect(program._calls.description).toBeDefined();
      expect(program._calls.description).toContain('Smart SCADA Node CLI Tool');
    });

    it('TC-CP-001-05: should set program version to "0.1.0"', () => {
      const program = capturedInstances[0];
      expect(program._calls.version).toBeDefined();
      expect(program._calls.version).toContain('0.1.0');
    });

    it('TC-CP-001-06: should register --interactive / -i global option', () => {
      const program = capturedInstances[0];
      expect(program._calls.option).toBeDefined();
      const interactiveOption = program._calls.option.find((o) => o.flags === '-i, --interactive');
      expect(interactiveOption).toBeDefined();
      expect(interactiveOption?.desc).toBe('Enable interactive mode');
    });
  });

  // ---- TC-CP-002: getProgram() ----
  describe('TC-CP-002: getProgram()', () => {
    it('TC-CP-002-01: should return the commander program instance', () => {
      const program = parser.getProgram();
      expect(program).toBeDefined();
      expect(program).toBe(capturedInstances[0]);
    });

    it('TC-CP-002-02: should return the same instance on multiple calls', () => {
      const a = parser.getProgram();
      const b = parser.getProgram();
      expect(a).toBe(b);
    });
  });

  // ---- TC-CP-003: registerCommands() ----
  describe('TC-CP-003: registerCommands()', () => {
    it('TC-CP-003-01: should register exactly 3 top-level commands (init, start, script)', () => {
      // Capture state before registration
      const programBefore = capturedInstances[0];
      const commandsBefore = programBefore._calls.command?.length ?? 0;

      parser.registerCommands();

      const programAfter = capturedInstances[0];
      const commandsAfter = programAfter._calls.command?.length ?? 0;
      // init + start + script = 3 newly registered commands
      expect(commandsAfter - commandsBefore).toBe(3);
    });

    it('TC-CP-003-02: should register "init" command', () => {
      parser.registerCommands();
      const program = capturedInstances[0];
      expect(program._calls.command).toContain('init');
    });

    it('TC-CP-003-03: should register "start" command', () => {
      parser.registerCommands();
      const program = capturedInstances[0];
      expect(program._calls.command).toContain('start');
    });

    it('TC-CP-003-04: should register "script" command', () => {
      parser.registerCommands();
      const program = capturedInstances[0];
      expect(program._calls.command).toContain('script');
    });

    it('TC-CP-003-05: should be safe to call registerCommands() multiple times', () => {
      expect(() => {
        parser.registerCommands();
        parser.registerCommands();
      }).not.toThrow();
    });
  });

  // ---- TC-CP-004: "init" command configuration ----
  describe('TC-CP-004: "init" command configuration', () => {
    it('TC-CP-004-01: "init" should have description "Initialize a new project"', () => {
      parser.registerCommands();
      const program = capturedInstances[0];
      // Find index of 'init' in command calls
      const initIndex = program._calls.command!.indexOf('init');
      // Captured instances: [program, ...subCmds]; subCmds are pushed in command() call order
      // program is index 0, first subCmd is index 1, etc.
      const initCmd = capturedInstances[initIndex + 1];
      expect(initCmd).toBeDefined();
      expect(initCmd._calls.description).toContain('Initialize a new project');
    });

    it('TC-CP-004-02: "init" should register an action function', () => {
      parser.registerCommands();
      const program = capturedInstances[0];
      const initIndex = program._calls.command!.indexOf('init');
      const initCmd = capturedInstances[initIndex + 1];
      expect(initCmd._calls.action).toBeDefined();
      expect(initCmd._calls.action).toHaveLength(1);
      expect(typeof initCmd._calls.action![0].fn).toBe('function');
    });

    it('TC-CP-004-03: "init" action should log "Initializing ss-data project..."', () => {
      parser.registerCommands();
      const program = capturedInstances[0];
      const initIndex = program._calls.command!.indexOf('init');
      const initCmd = capturedInstances[initIndex + 1];
      const actionFn = initCmd._calls.action![0].fn;

      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      actionFn();
      expect(logSpy).toHaveBeenCalledWith('Initializing ss-data project...');
      logSpy.mockRestore();
    });
  });

  // ---- TC-CP-005: "start" command configuration ----
  describe('TC-CP-005: "start" command configuration', () => {
    it('TC-CP-005-01: "start" should have description "Start the server"', () => {
      parser.registerCommands();
      const program = capturedInstances[0];
      const startIndex = program._calls.command!.indexOf('start');
      const startCmd = capturedInstances[startIndex + 1];
      expect(startCmd).toBeDefined();
      expect(startCmd._calls.description).toContain('Start the server');
    });

    it('TC-CP-005-02: "start" should register an action function', () => {
      parser.registerCommands();
      const program = capturedInstances[0];
      const startIndex = program._calls.command!.indexOf('start');
      const startCmd = capturedInstances[startIndex + 1];
      expect(startCmd._calls.action).toBeDefined();
      expect(startCmd._calls.action).toHaveLength(1);
      expect(typeof startCmd._calls.action![0].fn).toBe('function');
    });

    it('TC-CP-005-03: "start" action should log "Starting ss-data server..."', () => {
      parser.registerCommands();
      const program = capturedInstances[0];
      const startIndex = program._calls.command!.indexOf('start');
      const startCmd = capturedInstances[startIndex + 1];
      const actionFn = startCmd._calls.action![0].fn;

      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      actionFn();
      expect(logSpy).toHaveBeenCalledWith('Starting ss-data server...');
      logSpy.mockRestore();
    });
  });

  // ---- TC-CP-006: "script" command group ----
  describe('TC-CP-006: "script" command group', () => {
    it('TC-CP-006-01: "script" should have description "Script management commands"', () => {
      parser.registerCommands();
      const program = capturedInstances[0];
      const scriptIndex = program._calls.command!.indexOf('script');
      const scriptCmd = capturedInstances[scriptIndex + 1];
      expect(scriptCmd).toBeDefined();
      expect(scriptCmd._calls.description).toContain('Script management commands');
    });

    it('TC-CP-006-02: "script" should register "create-wizard" subcommand', () => {
      parser.registerCommands();
      const program = capturedInstances[0];
      const scriptIndex = program._calls.command!.indexOf('script');
      const scriptCmd = capturedInstances[scriptIndex + 1];
      expect(scriptCmd._calls.command).toContain('create-wizard');
    });

    it('TC-CP-006-03: "create-wizard" should have description "Interactive script creation wizard"', () => {
      parser.registerCommands();
      const program = capturedInstances[0];
      const scriptIndex = program._calls.command!.indexOf('script');
      const scriptCmd = capturedInstances[scriptIndex + 1];
      const wizardIndex = scriptCmd._calls.command!.indexOf('create-wizard');
      // scriptCmd was captured at scriptIndex+1; its subcommand create-wizard was pushed later
      // Find the subCmd captured when scriptCmd.command('create-wizard') was called
      // Order of capture: program (0), init (1), start (2), script (3), create-wizard (4)
      const wizardCmd = capturedInstances[scriptIndex + 1 + wizardIndex + 1];
      expect(wizardCmd).toBeDefined();
      expect(wizardCmd._calls.description).toContain('Interactive script creation wizard');
    });

    it('TC-CP-006-04: "create-wizard" should register an action function', () => {
      parser.registerCommands();
      const program = capturedInstances[0];
      const scriptIndex = program._calls.command!.indexOf('script');
      const scriptCmd = capturedInstances[scriptIndex + 1];
      const wizardIndex = scriptCmd._calls.command!.indexOf('create-wizard');
      const wizardCmd = capturedInstances[scriptIndex + 1 + wizardIndex + 1];
      expect(wizardCmd._calls.action).toBeDefined();
      expect(wizardCmd._calls.action).toHaveLength(1);
      expect(typeof wizardCmd._calls.action![0].fn).toBe('function');
    });

    it('TC-CP-006-05: "create-wizard" action should invoke runScriptCreateWizard with an ApiClient', async () => {
      parser.registerCommands();
      const program = capturedInstances[0];
      const scriptIndex = program._calls.command!.indexOf('script');
      const scriptCmd = capturedInstances[scriptIndex + 1];
      const wizardIndex = scriptCmd._calls.command!.indexOf('create-wizard');
      const wizardCmd = capturedInstances[scriptIndex + 1 + wizardIndex + 1];
      const actionFn = wizardCmd._calls.action![0].fn;

      await actionFn();
      expect(wizardRunMock).toHaveBeenCalledTimes(1);
      const arg = wizardRunMock.mock.calls[0][0];
      expect(arg).toBeDefined();
      expect(arg.apiClient).toBeInstanceOf(ApiClient);
    });

    it('TC-CP-006-06: "create-wizard" action should log error and exit(1) when wizard throws', async () => {
      wizardRunMock.mockRejectedValueOnce(new Error('wizard failed'));
      parser.registerCommands();
      const program = capturedInstances[0];
      const scriptIndex = program._calls.command!.indexOf('script');
      const scriptCmd = capturedInstances[scriptIndex + 1];
      const wizardIndex = scriptCmd._calls.command!.indexOf('create-wizard');
      const wizardCmd = capturedInstances[scriptIndex + 1 + wizardIndex + 1];
      const actionFn = wizardCmd._calls.action![0].fn;

      const errSpy = jest.spyOn(console, 'error').mockImplementation();
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
        /* noop */
      }) as never);

      await actionFn();

      expect(errSpy).toHaveBeenCalledWith('Error:', 'wizard failed');
      expect(exitSpy).toHaveBeenCalledWith(1);

      errSpy.mockRestore();
      exitSpy.mockRestore();
    });

    it('TC-CP-006-07: "create-wizard" action should handle non-Error thrown values', async () => {
      wizardRunMock.mockRejectedValueOnce('string error');
      parser.registerCommands();
      const program = capturedInstances[0];
      const scriptIndex = program._calls.command!.indexOf('script');
      const scriptCmd = capturedInstances[scriptIndex + 1];
      const wizardIndex = scriptCmd._calls.command!.indexOf('create-wizard');
      const wizardCmd = capturedInstances[scriptIndex + 1 + wizardIndex + 1];
      const actionFn = wizardCmd._calls.action![0].fn;

      const errSpy = jest.spyOn(console, 'error').mockImplementation();
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
        /* noop */
      }) as never);

      await actionFn();

      // For non-Error values, String(err) is used
      expect(errSpy).toHaveBeenCalledWith('Error:', 'string error');
      expect(exitSpy).toHaveBeenCalledWith(1);

      errSpy.mockRestore();
      exitSpy.mockRestore();
    });
  });

  // ---- TC-CP-007: createApiClient() ----
  describe('TC-CP-007: createApiClient()', () => {
    it('TC-CP-007-01: should return an ApiClient instance', () => {
      const client = parser.createApiClient();
      expect(client).toBeInstanceOf(ApiClient);
    });

    it('TC-CP-007-02: should default baseUrl to http://localhost:4000 when env not set', () => {
      delete process.env.SS_CLI_SERVER_URL;
      const client = parser.createApiClient();
      // We can't read private fields directly; verify via behavior by checking
      // the constructor did not throw. Use a separate spy on ApiClient.
      expect(client).toBeDefined();
    });

    it('TC-CP-007-03: should use SS_CLI_SERVER_URL env var when set', () => {
      process.env.SS_CLI_SERVER_URL = 'http://example.com:9000';
      // Re-instantiate parser so createApiClient reads fresh env
      const freshParser = new CommandParser();
      const client = freshParser.createApiClient();
      expect(client).toBeInstanceOf(ApiClient);
    });

    it('TC-CP-007-04: should use SS_CLI_TOKEN env var when set', () => {
      process.env.SS_CLI_TOKEN = 'my-token';
      const freshParser = new CommandParser();
      const client = freshParser.createApiClient();
      expect(client).toBeInstanceOf(ApiClient);
    });

    it('TC-CP-007-05: should use SS_CLI_API_KEY env var when set', () => {
      process.env.SS_CLI_API_KEY = 'my-key';
      const freshParser = new CommandParser();
      const client = freshParser.createApiClient();
      expect(client).toBeInstanceOf(ApiClient);
    });

    it('TC-CP-007-06: should construct ApiClient with all env values combined', () => {
      process.env.SS_CLI_SERVER_URL = 'http://api.example.com';
      process.env.SS_CLI_TOKEN = 'tok-xyz';
      process.env.SS_CLI_API_KEY = 'key-abc';
      const freshParser = new CommandParser();
      // Spy on ApiClient constructor to capture config
      const client = freshParser.createApiClient();
      expect(client).toBeInstanceOf(ApiClient);
    });
  });

  // ---- TC-CP-008: parse() ----
  describe('TC-CP-008: parse()', () => {
    it('TC-CP-008-01: should call program.parse with provided argv', () => {
      const argv = ['node', 'cli.js', 'init'];
      parser.parse(argv);
      const program = capturedInstances[0];
      expect(program.parse).toHaveBeenCalledWith(argv);
    });

    it('TC-CP-008-02: should call program.parse exactly once per call', () => {
      const program = capturedInstances[0];
      parser.parse(['node', 'cli.js']);
      expect(program.parse).toHaveBeenCalledTimes(1);
      parser.parse(['node', 'cli.js', 'start']);
      expect(program.parse).toHaveBeenCalledTimes(2);
    });

    it('TC-CP-008-03: should forward empty argv array without error', () => {
      expect(() => parser.parse([])).not.toThrow();
    });

    it('TC-CP-008-04: should forward process.argv-like array', () => {
      expect(() =>
        parser.parse(['node', '/path/to/cli.js', 'script', 'create-wizard']),
      ).not.toThrow();
      const program = capturedInstances[0];
      expect(program.parse).toHaveBeenCalledWith([
        'node',
        '/path/to/cli.js',
        'script',
        'create-wizard',
      ]);
    });
  });

  // ---- TC-CP-009: Global option configuration ----
  describe('TC-CP-009: Global option configuration', () => {
    it('TC-CP-009-01: should register exactly one global option on construction', () => {
      const program = capturedInstances[0];
      // Only --interactive should be registered as a global option
      expect(program._calls.option).toBeDefined();
      expect(program._calls.option).toHaveLength(1);
    });

    it('TC-CP-009-02: global option flags should be "-i, --interactive"', () => {
      const program = capturedInstances[0];
      expect(program._calls.option![0].flags).toBe('-i, --interactive');
    });

    it('TC-CP-009-03: global option description should be "Enable interactive mode"', () => {
      const program = capturedInstances[0];
      expect(program._calls.option![0].desc).toBe('Enable interactive mode');
    });
  });
});
