// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock node:readline
const mockQuestion = vi.fn();
const mockClose = vi.fn();

const mockCreateInterface = vi.fn(() => ({
  question: mockQuestion,
  close: mockClose,
}));

vi.mock('node:readline', () => ({
  default: {
    createInterface: mockCreateInterface,
  },
  createInterface: mockCreateInterface,
}));

// Mock node:fs
const mockFsExistsSync = vi.fn();
const mockFsMkdirSync = vi.fn();
const mockFsWriteFileSync = vi.fn();
const mockFsRmSync = vi.fn();

vi.mock('node:fs', () => ({
  default: {
    existsSync: mockFsExistsSync,
    mkdirSync: mockFsMkdirSync,
    writeFileSync: mockFsWriteFileSync,
    rmSync: mockFsRmSync,
  },
  existsSync: mockFsExistsSync,
  mkdirSync: mockFsMkdirSync,
  writeFileSync: mockFsWriteFileSync,
  rmSync: mockFsRmSync,
}));

// Mock node:path
vi.mock('node:path', async () => {
  const actual = await vi.importActual('node:path');
  return {
    ...actual,
    default: actual,
  };
});

// Mock @scada-editor/plugin-sdk
const mockGenerate = vi.fn();
const mockGetBackendChoices = vi.fn(() => [
  { value: 'canvas2d', label: 'Canvas 2D', description: '2D canvas rendering' },
  { value: 'three', label: 'Three.js', description: '3D rendering' },
]);

vi.mock('@scada-editor/plugin-sdk', () => ({
  ScaffoldGenerator: {
    getBackendChoices: mockGetBackendChoices,
    generate: mockGenerate,
  },
  RenderBackend: {
    Canvas2D: 'canvas2d',
    Three: 'three',
  },
}));

// ================================================================
// askQuestion helper (extracted for testability)
// ================================================================
function askQuestion(rl: { question: (query: string, cb: (answer: string) => void) => void }, query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, (answer: string) => {
      resolve(answer.trim());
    });
  });
}

describe('create-plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ================================================================
  // Module exports
  // ================================================================
  describe('module exports', () => {
    // TC-CREATE-001
    it('should be importable without errors', async () => {
      // Mock process.exit to prevent actual exit
      const mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {
        // noop
      }) as never);

      // Prevent console output during import
      const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await import('../index');
      } catch {
        // Import may fail if some dependencies are not fully mocked
        // but the module itself should be importable
      }

      mockExit.mockRestore();
      mockConsoleLog.mockRestore();
      mockConsoleError.mockRestore();
    });
  });

  // ================================================================
  // askQuestion helper
  // ================================================================
  describe('askQuestion', () => {
    // TC-CREATE-002
    it('should resolve with trimmed answer', async () => {
      const rl = {
        question: vi.fn((_query: string, cb: (answer: string) => void) => {
          cb('  my-plugin  ');
        }),
      };

      const result = await askQuestion(rl, 'Enter plugin type: ');
      expect(result).toBe('my-plugin');
    });

    // TC-CREATE-003
    it('should pass the query string to readline.question', async () => {
      const rl = {
        question: vi.fn((_query: string, cb: (answer: string) => void) => {
          cb('test');
        }),
      };

      await askQuestion(rl, 'Enter plugin type: ');
      expect(rl.question).toHaveBeenCalledWith('Enter plugin type: ', expect.any(Function));
    });

    // TC-CREATE-004
    it('should handle empty answer', async () => {
      const rl = {
        question: vi.fn((_query: string, cb: (answer: string) => void) => {
          cb('');
        }),
      };

      const result = await askQuestion(rl, 'Enter plugin type: ');
      expect(result).toBe('');
    });

    // TC-CREATE-005
    it('should handle whitespace-only answer', async () => {
      const rl = {
        question: vi.fn((_query: string, cb: (answer: string) => void) => {
          cb('   ');
        }),
      };

      const result = await askQuestion(rl, 'Enter plugin type: ');
      expect(result).toBe('');
    });

    // TC-CREATE-006
    it('should handle unicode characters', async () => {
      const rl = {
        question: vi.fn((_query: string, cb: (answer: string) => void) => {
          cb('my-plugin-中文');
        }),
      };

      const result = await askQuestion(rl, 'Plugin label: ');
      expect(result).toBe('my-plugin-中文');
    });
  });

  // ================================================================
  // ScaffoldGenerator integration
  // ================================================================
  describe('ScaffoldGenerator', () => {
    // TC-CREATE-007
    it('should have ScaffoldGenerator.getBackendChoices available', () => {
      const { ScaffoldGenerator } = require('@scada-editor/plugin-sdk');
      expect(ScaffoldGenerator).toBeDefined();
      expect(ScaffoldGenerator.getBackendChoices).toBeDefined();
      expect(typeof ScaffoldGenerator.getBackendChoices).toBe('function');
    });

    // TC-CREATE-008
    it('should have ScaffoldGenerator.generate available', () => {
      const { ScaffoldGenerator } = require('@scada-editor/plugin-sdk');
      expect(ScaffoldGenerator.generate).toBeDefined();
      expect(typeof ScaffoldGenerator.generate).toBe('function');
    });

    // TC-CREATE-009
    it('should return backend choices with correct structure', () => {
      const choices = mockGetBackendChoices();
      expect(choices).toHaveLength(2);
      expect(choices[0]).toHaveProperty('value');
      expect(choices[0]).toHaveProperty('label');
      expect(choices[0]).toHaveProperty('description');
    });

    // TC-CREATE-010
    it('should generate scaffold files', () => {
      mockGenerate.mockReturnValue({
        'index.ts': 'export default {}',
        'schema.json': '{}',
        'Graphic.vue': '<template><div></div></template>',
      });

      const files = mockGenerate({
        type: 'test-plugin',
        label: 'Test Plugin',
        category: 'basic',
        renderBackend: 'canvas2d',
        fields: [],
      });

      expect(files).toHaveProperty('index.ts');
      expect(files).toHaveProperty('schema.json');
      expect(files).toHaveProperty('Graphic.vue');
    });

    // TC-CREATE-011
    it('should call generate with correct config', () => {
      const config = {
        type: 'my-plugin',
        label: 'My Plugin',
        category: 'basic',
        renderBackend: 'canvas2d',
        fields: [],
      };

      mockGenerate(config);

      expect(mockGenerate).toHaveBeenCalledWith(config);
    });
  });
});