// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// ============================================================
// Integration tests for ss-cli
// Simulates real CLI execution by driving commander with
// mocked process.argv and captured console.log output.
// ============================================================

describe('ss-cli — Integration (CLI execution)', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let stdoutWriteSpy: jest.SpyInstance;
  let stderrWriteSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset module cache so each test re-executes index.ts from scratch
    jest.resetModules();

    // Suppress all output channels
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    stdoutWriteSpy = jest.spyOn(process.stdout, 'write').mockImplementation();
    stderrWriteSpy = jest.spyOn(process.stderr, 'write').mockImplementation();

    // Prevent commander / process from calling real exit
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
      // noop – never actually exit
    }) as never);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    stdoutWriteSpy.mockRestore();
    stderrWriteSpy.mockRestore();
    exitSpy.mockRestore();
  });

  // ---- TC-CLI-INT-001: "init" command execution ----
  describe('TC-CLI-INT-001: "init" command', () => {
    it('TC-CLI-INT-001-01: should print "Initializing ss-data project..." when init is invoked', async () => {
      process.argv = ['node', 'cli.js', 'init'];

      await import('../index');

      expect(consoleLogSpy).toHaveBeenCalledWith('Initializing ss-data project...');
    });

    it('TC-CLI-INT-001-02: should not print start message when init is invoked', async () => {
      process.argv = ['node', 'cli.js', 'init'];

      await import('../index');

      expect(consoleLogSpy).not.toHaveBeenCalledWith('Starting ss-data server...');
    });

    it('TC-CLI-INT-001-03: should log exactly one message for init', async () => {
      process.argv = ['node', 'cli.js', 'init'];

      await import('../index');

      // Only the init message should appear (no banner / help text)
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ---- TC-CLI-INT-002: "start" command execution ----
  describe('TC-CLI-INT-002: "start" command', () => {
    it('TC-CLI-INT-002-01: should print "Starting ss-data server..." when start is invoked', async () => {
      process.argv = ['node', 'cli.js', 'start'];

      await import('../index');

      expect(consoleLogSpy).toHaveBeenCalledWith('Starting ss-data server...');
    });

    it('TC-CLI-INT-002-02: should not print init message when start is invoked', async () => {
      process.argv = ['node', 'cli.js', 'start'];

      await import('../index');

      expect(consoleLogSpy).not.toHaveBeenCalledWith('Initializing ss-data project...');
    });

    it('TC-CLI-INT-002-03: should log exactly one message for start', async () => {
      process.argv = ['node', 'cli.js', 'start'];

      await import('../index');

      // Only the start message should appear
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ---- TC-CLI-INT-003: Unknown / missing command ----
  describe('TC-CLI-INT-003: Unknown / missing command', () => {
    it('TC-CLI-INT-003-01: should not log init or start message when no subcommand is given', async () => {
      process.argv = ['node', 'cli.js'];

      await import('../index');

      expect(consoleLogSpy).not.toHaveBeenCalledWith('Initializing ss-data project...');
      expect(consoleLogSpy).not.toHaveBeenCalledWith('Starting ss-data server...');
    });

    it('TC-CLI-INT-003-02: should not log init or start message for unknown subcommand', async () => {
      process.argv = ['node', 'cli.js', 'unknown-cmd'];

      await import('../index');

      expect(consoleLogSpy).not.toHaveBeenCalledWith('Initializing ss-data project...');
      expect(consoleLogSpy).not.toHaveBeenCalledWith('Starting ss-data server...');
    });

    it('TC-CLI-INT-003-03: should not crash with unknown subcommand', async () => {
      process.argv = ['node', 'cli.js', 'unknown-cmd'];

      // Should not throw
      await expect(import('../index')).resolves.not.toThrow();
    });
  });

  // ---- TC-CLI-INT-004: Output isolation between commands ----
  describe('TC-CLI-INT-004: Output isolation', () => {
    it('TC-CLI-INT-004-01: init output should contain exactly the expected string', async () => {
      process.argv = ['node', 'cli.js', 'init'];

      await import('../index');

      const allCalls = consoleLogSpy.mock.calls.flat();
      expect(allCalls).toEqual(['Initializing ss-data project...']);
    });

    it('TC-CLI-INT-004-02: start output should contain exactly the expected string', async () => {
      process.argv = ['node', 'cli.js', 'start'];

      await import('../index');

      const allCalls = consoleLogSpy.mock.calls.flat();
      expect(allCalls).toEqual(['Starting ss-data server...']);
    });
  });
});
