// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// ============================================================
// Unit tests for InteractivePrompts — readline-based prompts
// ============================================================

import 'jest';

// ---------- Mock readline ----------
// The mock Interface exposes `question(prompt, cb)` and `close()`.
// Tests drive `question` by capturing the cb and invoking it with a
// controlled answer via the `setNextAnswer` helper.

interface MockInterface {
  question: jest.Mock;
  close: jest.Mock;
}

let nextAnswer: string = '';
let answerQueue: string[] = [];
let questionCallCount = 0;

function createMockInterface(): MockInterface {
  const rl: MockInterface = {
    question: jest.fn((prompt: string, cb: (answer: string) => void) => {
      questionCallCount++;
      // Pick the next answer from the queue, or fall back to nextAnswer
      const answer = answerQueue.length > 0 ? answerQueue.shift()! : nextAnswer;
      // Defer cb to next microtask so the prompt returns the Promise
      // before the callback fires (mirrors real readline behavior).
      Promise.resolve().then(() => cb(answer));
      return rl;
    }),
    close: jest.fn(),
  };
  return rl;
}

const createInterfaceMock = jest.fn(createMockInterface);

jest.mock('readline', () => ({
  createInterface: createInterfaceMock,
}));

// ---------- Helpers ----------
function setNextAnswer(answer: string): void {
  nextAnswer = answer;
  answerQueue = [];
}

function setAnswerQueue(answers: string[]): void {
  answerQueue = [...answers];
  nextAnswer = answers[0] ?? '';
}

function resetAnswerState(): void {
  nextAnswer = '';
  answerQueue = [];
  questionCallCount = 0;
}

// ---------- Import after mocks are in place ----------
import {
  confirm,
  input,
  select,
  multiSelect,
  password,
  InteractivePrompts,
  SelectChoice,
  MultiSelectChoice,
  Validator,
} from '../InteractivePrompts';

describe('ss-cli — InteractivePrompts (core/InteractivePrompts.ts)', () => {
  let consoleLogSpy: jest.SpyInstance;
  let stdoutWriteSpy: jest.SpyInstance;
  let originalIsTTY: boolean | undefined;

  beforeEach(() => {
    resetAnswerState();
    createInterfaceMock.mockClear();

    // Pretend stdin is a TTY by default (so ensureTty passes)
    originalIsTTY = process.stdin.isTTY;
    Object.defineProperty(process.stdin, 'isTTY', {
      value: true,
      configurable: true,
      writable: true,
    });

    // Suppress console output
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    stdoutWriteSpy = jest.spyOn(process.stdout, 'write').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    stdoutWriteSpy.mockRestore();
    // Restore original TTY flag
    Object.defineProperty(process.stdin, 'isTTY', {
      value: originalIsTTY,
      configurable: true,
      writable: true,
    });
  });

  // ---- TC-IP-001: confirm() ----
  describe('TC-IP-001: confirm()', () => {
    it('TC-IP-001-01: should resolve true when user enters "y"', async () => {
      setNextAnswer('y');
      const result = await confirm('Continue?');
      expect(result).toBe(true);
    });

    it('TC-IP-001-02: should resolve true when user enters "yes"', async () => {
      setNextAnswer('yes');
      const result = await confirm('Continue?');
      expect(result).toBe(true);
    });

    it('TC-IP-001-03: should resolve true when user enters "Y" (case insensitive)', async () => {
      setNextAnswer('Y');
      const result = await confirm('Continue?');
      expect(result).toBe(true);
    });

    it('TC-IP-001-04: should resolve true when user enters "YES" (case insensitive)', async () => {
      setNextAnswer('YES');
      const result = await confirm('Continue?');
      expect(result).toBe(true);
    });

    it('TC-IP-001-05: should resolve false when user enters "n"', async () => {
      setNextAnswer('n');
      const result = await confirm('Continue?');
      expect(result).toBe(false);
    });

    it('TC-IP-001-06: should resolve false when user enters "no"', async () => {
      setNextAnswer('no');
      const result = await confirm('Continue?');
      expect(result).toBe(false);
    });

    it('TC-IP-001-07: should resolve false when user enters arbitrary text', async () => {
      setNextAnswer('maybe');
      const result = await confirm('Continue?');
      expect(result).toBe(false);
    });

    it('TC-IP-001-08: should resolve defaultValue (true) when user enters empty string', async () => {
      setNextAnswer('');
      const result = await confirm('Continue?', true);
      expect(result).toBe(true);
    });

    it('TC-IP-001-09: should resolve defaultValue (false) when user enters empty string', async () => {
      setNextAnswer('');
      const result = await confirm('Continue?', false);
      expect(result).toBe(false);
    });

    it('TC-IP-001-10: should resolve false when no default and user enters empty string', async () => {
      setNextAnswer('');
      const result = await confirm('Continue?');
      expect(result).toBe(false);
    });

    it('TC-IP-001-11: should trim whitespace from user input', async () => {
      setNextAnswer('  y  ');
      const result = await confirm('Continue?');
      expect(result).toBe(true);
    });

    it('TC-IP-001-12: should include Y/n hint in prompt when defaultValue is true', async () => {
      setNextAnswer('y');
      await confirm('Continue?', true);
      const rl = createInterfaceMock.mock.results[0].value as MockInterface;
      const promptArg = rl.question.mock.calls[0][0] as string;
      expect(promptArg).toContain('Y/n');
    });

    it('TC-IP-001-13: should include y/N hint in prompt when defaultValue is false', async () => {
      setNextAnswer('y');
      await confirm('Continue?', false);
      const rl = createInterfaceMock.mock.results[0].value as MockInterface;
      const promptArg = rl.question.mock.calls[0][0] as string;
      expect(promptArg).toContain('y/N');
    });

    it('TC-IP-001-14: should include y/n hint in prompt when no defaultValue', async () => {
      setNextAnswer('y');
      await confirm('Continue?');
      const rl = createInterfaceMock.mock.results[0].value as MockInterface;
      const promptArg = rl.question.mock.calls[0][0] as string;
      expect(promptArg).toContain('y/n');
      expect(promptArg).not.toContain('Y/n');
      expect(promptArg).not.toContain('y/N');
    });

    it('TC-IP-001-15: should include the message in the prompt', async () => {
      setNextAnswer('y');
      await confirm('Do you want to proceed?');
      const rl = createInterfaceMock.mock.results[0].value as MockInterface;
      const promptArg = rl.question.mock.calls[0][0] as string;
      expect(promptArg).toContain('Do you want to proceed?');
    });

    it('TC-IP-001-16: should close the readline interface after input', async () => {
      setNextAnswer('y');
      await confirm('Continue?');
      const rl = createInterfaceMock.mock.results[0].value as MockInterface;
      expect(rl.close).toHaveBeenCalled();
    });
  });

  // ---- TC-IP-002: input() ----
  describe('TC-IP-002: input()', () => {
    it('TC-IP-002-01: should resolve with user input', async () => {
      setNextAnswer('hello');
      const result = await input('Enter name:');
      expect(result).toBe('hello');
    });

    it('TC-IP-002-02: should trim whitespace from user input', async () => {
      setNextAnswer('  hello  ');
      const result = await input('Enter name:');
      expect(result).toBe('hello');
    });

    it('TC-IP-002-03: should resolve with defaultValue when user enters empty string', async () => {
      setNextAnswer('');
      const result = await input('Enter name:', 'default-name');
      expect(result).toBe('default-name');
    });

    it('TC-IP-002-04: should resolve with empty string when no default and user enters empty', async () => {
      setNextAnswer('');
      const result = await input('Enter name:');
      expect(result).toBe('');
    });

    it('TC-IP-002-05: should include default value hint in prompt when default provided', async () => {
      setNextAnswer('x');
      await input('Enter name:', 'my-default');
      const rl = createInterfaceMock.mock.results[0].value as MockInterface;
      const promptArg = rl.question.mock.calls[0][0] as string;
      expect(promptArg).toContain('default: my-default');
    });

    it('TC-IP-002-06: should not include default hint when no default provided', async () => {
      setNextAnswer('x');
      await input('Enter name:');
      const rl = createInterfaceMock.mock.results[0].value as MockInterface;
      const promptArg = rl.question.mock.calls[0][0] as string;
      expect(promptArg).not.toContain('default:');
    });

    it('TC-IP-002-07: should include the message in the prompt', async () => {
      setNextAnswer('x');
      await input('Please enter your username:');
      const rl = createInterfaceMock.mock.results[0].value as MockInterface;
      const promptArg = rl.question.mock.calls[0][0] as string;
      expect(promptArg).toContain('Please enter your username:');
    });

    it('TC-IP-002-08: should accept a validator that returns null (passes)', async () => {
      setNextAnswer('valid');
      const validator: Validator = (v) => (v.length > 0 ? null : 'required');
      const result = await input('Enter:', undefined, validator);
      expect(result).toBe('valid');
    });

    it('TC-IP-002-09: should retry when validator returns an error string', async () => {
      setAnswerQueue(['', 'valid']);
      const validator: Validator = (v) => (v.length >= 3 ? null : 'must be at least 3 chars');
      const result = await input('Enter:', undefined, validator);
      expect(result).toBe('valid');
      // Validator failed once → question asked twice
      expect(questionCallCount).toBe(2);
    });

    it('TC-IP-002-10: should log error message when validator fails', async () => {
      setAnswerQueue(['x', 'valid']);
      const validator: Validator = (v) => (v.length >= 3 ? null : 'too short');
      await input('Enter:', undefined, validator);
      expect(consoleLogSpy).toHaveBeenCalledWith('  Error: too short');
    });

    it('TC-IP-002-11: should close readline after successful validation', async () => {
      setNextAnswer('valid');
      const validator: Validator = () => null;
      await input('Enter:', undefined, validator);
      const rl = createInterfaceMock.mock.results[0].value as MockInterface;
      expect(rl.close).toHaveBeenCalled();
    });

    it('TC-IP-002-12: should apply default value before validation', async () => {
      setNextAnswer('');
      const validator: Validator = (v) => (v === 'default-val' ? null : 'must be default-val');
      const result = await input('Enter:', 'default-val', validator);
      expect(result).toBe('default-val');
      expect(questionCallCount).toBe(1);
    });
  });

  // ---- TC-IP-003: select() ----
  describe('TC-IP-003: select()', () => {
    const choices: SelectChoice[] = [
      { name: 'Option A', value: 'a' },
      { name: 'Option B', value: 'b' },
      { name: 'Option C', value: 'c' },
    ];

    it('TC-IP-003-01: should resolve with the value of the selected option (1)', async () => {
      setNextAnswer('1');
      const result = await select('Pick one:', choices);
      expect(result).toBe('a');
    });

    it('TC-IP-003-02: should resolve with the value of the selected option (2)', async () => {
      setNextAnswer('2');
      const result = await select('Pick one:', choices);
      expect(result).toBe('b');
    });

    it('TC-IP-003-03: should resolve with the value of the selected option (3)', async () => {
      setNextAnswer('3');
      const result = await select('Pick one:', choices);
      expect(result).toBe('c');
    });

    it('TC-IP-003-04: should resolve with defaultValue when user enters empty string', async () => {
      setNextAnswer('');
      const result = await select('Pick one:', choices, 'b');
      expect(result).toBe('b');
    });

    it('TC-IP-003-05: should retry when user enters invalid number (out of range)', async () => {
      setAnswerQueue(['5', '1']);
      const result = await select('Pick one:', choices);
      expect(result).toBe('a');
      expect(questionCallCount).toBe(2);
    });

    it('TC-IP-003-06: should retry when user enters non-numeric input', async () => {
      setAnswerQueue(['abc', '2']);
      const result = await select('Pick one:', choices);
      expect(result).toBe('b');
      expect(questionCallCount).toBe(2);
    });

    it('TC-IP-003-07: should retry when user enters 0 (1-indexed)', async () => {
      setAnswerQueue(['0', '1']);
      const result = await select('Pick one:', choices);
      expect(result).toBe('a');
      expect(questionCallCount).toBe(2);
    });

    it('TC-IP-003-08: should retry when user enters negative number', async () => {
      setAnswerQueue(['-1', '3']);
      const result = await select('Pick one:', choices);
      expect(result).toBe('c');
      expect(questionCallCount).toBe(2);
    });

    it('TC-IP-003-09: should log invalid selection message on bad input', async () => {
      setAnswerQueue(['99', '1']);
      await select('Pick one:', choices);
      expect(consoleLogSpy).toHaveBeenCalledWith('  Invalid selection. Please try again.');
    });

    it('TC-IP-003-10: should log the message and options to console', async () => {
      setNextAnswer('1');
      await select('Pick one:', choices);
      expect(consoleLogSpy).toHaveBeenCalledWith('Pick one:');
      expect(consoleLogSpy).toHaveBeenCalledWith('    1. Option A');
      expect(consoleLogSpy).toHaveBeenCalledWith('    2. Option B');
      expect(consoleLogSpy).toHaveBeenCalledWith('    3. Option C');
    });

    it('TC-IP-003-11: should mark default option with "*" in the listing', async () => {
      setNextAnswer('1');
      await select('Pick one:', choices, 'b');
      // default is 'b' (Option B), so it should be marked with '*'
      expect(consoleLogSpy).toHaveBeenCalledWith('  * 2. Option B');
      // Non-default options should be marked with ' '
      expect(consoleLogSpy).toHaveBeenCalledWith('    1. Option A');
    });

    it('TC-IP-003-12: should include default hint in question prompt', async () => {
      setNextAnswer('1');
      await select('Pick one:', choices, 'b');
      const rl = createInterfaceMock.mock.results[0].value as MockInterface;
      const promptArg = rl.question.mock.calls[0][0] as string;
      expect(promptArg).toContain('default: b');
    });

    it('TC-IP-003-13: should include valid range in question prompt', async () => {
      setNextAnswer('1');
      await select('Pick one:', choices);
      const rl = createInterfaceMock.mock.results[0].value as MockInterface;
      const promptArg = rl.question.mock.calls[0][0] as string;
      expect(promptArg).toContain('1-3');
    });

    it('TC-IP-003-14: should close readline after successful selection', async () => {
      setNextAnswer('1');
      await select('Pick one:', choices);
      const rl = createInterfaceMock.mock.results[0].value as MockInterface;
      expect(rl.close).toHaveBeenCalled();
    });
  });

  // ---- TC-IP-004: multiSelect() ----
  describe('TC-IP-004: multiSelect()', () => {
    const choices: MultiSelectChoice[] = [
      { name: 'Option A', value: 'a', checked: true },
      { name: 'Option B', value: 'b' },
      { name: 'Option C', value: 'c', checked: true },
      { name: 'Option D', value: 'd' },
    ];

    it('TC-IP-004-01: should resolve with checked defaults when user enters empty string', async () => {
      setNextAnswer('');
      const result = await multiSelect('Pick many:', choices);
      expect(result).toEqual(['a', 'c']);
    });

    it('TC-IP-004-02: should resolve with empty array when no defaults and empty input', async () => {
      setNextAnswer('');
      const noDefaults: MultiSelectChoice[] = [
        { name: 'X', value: 'x' },
        { name: 'Y', value: 'y' },
      ];
      const result = await multiSelect('Pick many:', noDefaults);
      expect(result).toEqual([]);
    });

    it('TC-IP-004-03: should resolve with selected values for single number input', async () => {
      setNextAnswer('2');
      const result = await multiSelect('Pick many:', choices);
      expect(result).toEqual(['b']);
    });

    it('TC-IP-004-04: should resolve with selected values for comma-separated input', async () => {
      setNextAnswer('1,3');
      const result = await multiSelect('Pick many:', choices);
      expect(result).toEqual(['a', 'c']);
    });

    it('TC-IP-004-05: should handle spaces in comma-separated input', async () => {
      setNextAnswer('1, 3, 4');
      const result = await multiSelect('Pick many:', choices);
      expect(result).toEqual(['a', 'c', 'd']);
    });

    it('TC-IP-004-06: should retry when input contains an out-of-range number', async () => {
      setAnswerQueue(['1,9', '1,2']);
      const result = await multiSelect('Pick many:', choices);
      expect(result).toEqual(['a', 'b']);
      expect(questionCallCount).toBe(2);
    });

    it('TC-IP-004-07: should retry when input contains non-numeric value', async () => {
      setAnswerQueue(['1,x', '2,3']);
      const result = await multiSelect('Pick many:', choices);
      expect(result).toEqual(['b', 'c']);
      expect(questionCallCount).toBe(2);
    });

    it('TC-IP-004-08: should retry when input contains 0 (1-indexed)', async () => {
      setAnswerQueue(['0,1', '1']);
      const result = await multiSelect('Pick many:', choices);
      expect(result).toEqual(['a']);
      expect(questionCallCount).toBe(2);
    });

    it('TC-IP-004-09: should log invalid selection message on bad input', async () => {
      setAnswerQueue(['99', '1']);
      await multiSelect('Pick many:', choices);
      expect(consoleLogSpy).toHaveBeenCalledWith('  Invalid selection. Please try again.');
    });

    it('TC-IP-004-10: should log the message and options to console', async () => {
      setNextAnswer('1');
      await multiSelect('Pick many:', choices);
      expect(consoleLogSpy).toHaveBeenCalledWith('Pick many:');
      expect(consoleLogSpy).toHaveBeenCalledWith('  [x] 1. Option A');
      expect(consoleLogSpy).toHaveBeenCalledWith('  [ ] 2. Option B');
      expect(consoleLogSpy).toHaveBeenCalledWith('  [x] 3. Option C');
      expect(consoleLogSpy).toHaveBeenCalledWith('  [ ] 4. Option D');
    });

    it('TC-IP-004-11: should log the instructions for comma-separated input', async () => {
      setNextAnswer('1');
      await multiSelect('Pick many:', choices);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '  Enter comma-separated numbers (e.g., 1,3,5). Empty for defaults.',
      );
    });

    it('TC-IP-004-12: should close readline after successful selection', async () => {
      setNextAnswer('1');
      await multiSelect('Pick many:', choices);
      const rl = createInterfaceMock.mock.results[0].value as MockInterface;
      expect(rl.close).toHaveBeenCalled();
    });

    it('TC-IP-004-13: should preserve order of selected values based on input', async () => {
      setNextAnswer('3,1');
      const result = await multiSelect('Pick many:', choices);
      // The implementation maps indices to values in the order they appear in input
      expect(result).toEqual(['c', 'a']);
    });
  });

  // ---- TC-IP-005: password() ----
  describe('TC-IP-005: password()', () => {
    let originalSetRawMode: ((mode: boolean) => void) | undefined;
    let onMock: jest.Mock;
    let setRawModeMock: jest.Mock;
    let resumeMock: jest.Mock;
    let pauseMock: jest.Mock;
    let setEncodingMock: jest.Mock;
    let removeListenerMock: jest.Mock;

    beforeEach(() => {
      // Mock process.stdin methods used by password()
      onMock = jest.fn();
      setRawModeMock = jest.fn();
      resumeMock = jest.fn();
      pauseMock = jest.fn();
      setEncodingMock = jest.fn();
      removeListenerMock = jest.fn();

      const stdin = process.stdin as unknown as Record<string, unknown>;
      originalSetRawMode = stdin.setRawMode as ((mode: boolean) => void) | undefined;
      stdin.setRawMode = setRawModeMock as unknown as typeof process.stdin.setRawMode;
      stdin.resume = resumeMock as unknown as typeof process.stdin.resume;
      stdin.pause = pauseMock as unknown as typeof process.stdin.pause;
      stdin.setEncoding = setEncodingMock as unknown as typeof process.stdin.setEncoding;
      stdin.on = onMock as unknown as typeof process.stdin.on;
      stdin.removeListener = removeListenerMock as unknown as typeof process.stdin.removeListener;
    });

    afterEach(() => {
      const stdin = process.stdin as unknown as Record<string, unknown>;
      if (originalSetRawMode !== undefined) {
        stdin.setRawMode = originalSetRawMode as unknown as typeof process.stdin.setRawMode;
      } else {
        delete stdin.setRawMode;
      }
    });

    it('TC-IP-005-01: should write the message to stdout', async () => {
      const promise = password('Enter password');

      // Find the 'data' handler registered on stdin
      await Promise.resolve();
      const onDataCall = onMock.mock.calls.find((c) => c[0] === 'data');
      expect(onDataCall).toBeDefined();
      const dataHandler = onDataCall![1] as (char: string) => void;

      // Simulate user pressing Enter to complete input
      dataHandler('\r');

      await promise;

      expect(stdoutWriteSpy).toHaveBeenCalledWith('Enter password: ');
    });

    it('TC-IP-005-02: should resolve with accumulated password on Enter', async () => {
      const promise = password('Enter password');
      await Promise.resolve();
      const onDataCall = onMock.mock.calls.find((c) => c[0] === 'data');
      const dataHandler = onDataCall![1] as (char: string) => void;

      dataHandler('p');
      dataHandler('a');
      dataHandler('s');
      dataHandler('s');
      dataHandler('\r');

      const result = await promise;
      expect(result).toBe('pass');
    });

    it('TC-IP-005-03: should also resolve on newline (\\n) character', async () => {
      const promise = password('Enter password');
      await Promise.resolve();
      const onDataCall = onMock.mock.calls.find((c) => c[0] === 'data');
      const dataHandler = onDataCall![1] as (char: string) => void;

      dataHandler('x');
      dataHandler('\n');

      const result = await promise;
      expect(result).toBe('x');
    });

    it('TC-IP-005-04: should set raw mode to true on stdin', async () => {
      const promise = password('Enter password');
      await Promise.resolve();
      expect(setRawModeMock).toHaveBeenCalledWith(true);
      // Cleanup
      const onDataCall = onMock.mock.calls.find((c) => c[0] === 'data');
      const dataHandler = onDataCall![1] as (char: string) => void;
      dataHandler('\r');
      await promise;
    });

    it('TC-IP-005-05: should resume and set utf-8 encoding on stdin', async () => {
      const promise = password('Enter password');
      await Promise.resolve();
      expect(resumeMock).toHaveBeenCalled();
      expect(setEncodingMock).toHaveBeenCalledWith('utf-8');
      const onDataCall = onMock.mock.calls.find((c) => c[0] === 'data');
      const dataHandler = onDataCall![1] as (char: string) => void;
      dataHandler('\r');
      await promise;
    });

    it('TC-IP-005-06: should write "*" for each typed character', async () => {
      const promise = password('Enter password');
      await Promise.resolve();
      const onDataCall = onMock.mock.calls.find((c) => c[0] === 'data');
      const dataHandler = onDataCall![1] as (char: string) => void;

      dataHandler('a');
      dataHandler('b');
      dataHandler('c');

      expect(stdoutWriteSpy).toHaveBeenCalledWith('*');
      // '*' written 3 times (one per character)
      const starCalls = stdoutWriteSpy.mock.calls.filter((c) => c[0] === '*');
      expect(starCalls).toHaveLength(3);

      dataHandler('\r');
      await promise;
    });

    it('TC-IP-005-07: should remove the last character on Backspace', async () => {
      const promise = password('Enter password');
      await Promise.resolve();
      const onDataCall = onMock.mock.calls.find((c) => c[0] === 'data');
      const dataHandler = onDataCall![1] as (char: string) => void;

      dataHandler('a');
      dataHandler('b');
      // Backspace (\u007f)
      dataHandler('\u007f');
      dataHandler('\r');

      const result = await promise;
      expect(result).toBe('a');
    });

    it('TC-IP-005-08: should also support \\b for Backspace', async () => {
      const promise = password('Enter password');
      await Promise.resolve();
      const onDataCall = onMock.mock.calls.find((c) => c[0] === 'data');
      const dataHandler = onDataCall![1] as (char: string) => void;

      dataHandler('x');
      dataHandler('y');
      dataHandler('\b');
      dataHandler('\r');

      const result = await promise;
      expect(result).toBe('x');
    });

    it('TC-IP-005-09: should not crash when Backspace is pressed on empty input', async () => {
      const promise = password('Enter password');
      await Promise.resolve();
      const onDataCall = onMock.mock.calls.find((c) => c[0] === 'data');
      const dataHandler = onDataCall![1] as (char: string) => void;

      // Press Backspace on empty input
      expect(() => dataHandler('\u007f')).not.toThrow();

      dataHandler('\r');
      const result = await promise;
      expect(result).toBe('');
    });

    it('TC-IP-005-10: should restore raw mode and pause stdin on Enter', async () => {
      const promise = password('Enter password');
      await Promise.resolve();
      const onDataCall = onMock.mock.calls.find((c) => c[0] === 'data');
      const dataHandler = onDataCall![1] as (char: string) => void;

      dataHandler('\r');
      await promise;

      expect(setRawModeMock).toHaveBeenCalledWith(false);
      expect(pauseMock).toHaveBeenCalled();
    });

    it('TC-IP-005-11: should remove data listener after Enter', async () => {
      const promise = password('Enter password');
      await Promise.resolve();
      const onDataCall = onMock.mock.calls.find((c) => c[0] === 'data');
      const dataHandler = onDataCall![1] as (char: string) => void;

      dataHandler('\r');
      await promise;

      expect(removeListenerMock).toHaveBeenCalledWith('data', dataHandler);
    });

    it('TC-IP-005-12: should write newline after Enter is pressed', async () => {
      const promise = password('Enter password');
      await Promise.resolve();
      const onDataCall = onMock.mock.calls.find((c) => c[0] === 'data');
      const dataHandler = onDataCall![1] as (char: string) => void;

      dataHandler('\r');
      await promise;

      expect(stdoutWriteSpy).toHaveBeenCalledWith('\n');
    });
  });

  // ---- TC-IP-006: TTY environment checks ----
  describe('TC-IP-006: TTY environment checks', () => {
    beforeEach(() => {
      // Force non-TTY environment
      Object.defineProperty(process.stdin, 'isTTY', {
        value: false,
        configurable: true,
        writable: true,
      });
    });

    it('TC-IP-006-01: confirm() should throw in non-TTY environment', () => {
      // ensureTty() throws synchronously before returning the Promise
      expect(() => confirm('Continue?')).toThrow(/TTY/);
    });

    it('TC-IP-006-02: input() should throw in non-TTY environment', () => {
      expect(() => input('Enter:')).toThrow(/TTY/);
    });

    it('TC-IP-006-03: select() should throw in non-TTY environment', () => {
      expect(() => select('Pick:', [{ name: 'A', value: 'a' }])).toThrow(/TTY/);
    });

    it('TC-IP-006-04: multiSelect() should throw in non-TTY environment', () => {
      expect(() => multiSelect('Pick:', [{ name: 'A', value: 'a' }])).toThrow(/TTY/);
    });

    it('TC-IP-006-05: password() should throw in non-TTY environment', () => {
      expect(() => password('Enter:')).toThrow(/TTY/);
    });

    it('TC-IP-006-06: TTY error message should mention interactive terminal', () => {
      expect(() => confirm('Continue?')).toThrow(/interactive terminal/i);
    });

    it('TC-IP-006-07: TTY error should be thrown before any readline interaction', () => {
      // No readline interface should be created if ensureTty throws
      const initialCallCount = createInterfaceMock.mock.calls.length;
      try {
        confirm('Continue?');
      } catch {
        // expected
      }
      expect(createInterfaceMock).toHaveBeenCalledTimes(initialCallCount);
    });
  });

  // ---- TC-IP-007: InteractivePrompts namespace export ----
  describe('TC-IP-007: InteractivePrompts namespace export', () => {
    it('TC-IP-007-01: should export confirm function', () => {
      expect(typeof InteractivePrompts.confirm).toBe('function');
      expect(InteractivePrompts.confirm).toBe(confirm);
    });

    it('TC-IP-007-02: should export input function', () => {
      expect(typeof InteractivePrompts.input).toBe('function');
      expect(InteractivePrompts.input).toBe(input);
    });

    it('TC-IP-007-03: should export select function', () => {
      expect(typeof InteractivePrompts.select).toBe('function');
      expect(InteractivePrompts.select).toBe(select);
    });

    it('TC-IP-007-04: should export multiSelect function', () => {
      expect(typeof InteractivePrompts.multiSelect).toBe('function');
      expect(InteractivePrompts.multiSelect).toBe(multiSelect);
    });

    it('TC-IP-007-05: should export password function', () => {
      expect(typeof InteractivePrompts.password).toBe('function');
      expect(InteractivePrompts.password).toBe(password);
    });
  });
});
