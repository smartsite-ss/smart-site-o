// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, beforeEach } from 'vitest';
import { ExpressionEngine } from '../../utils/core/ExpressionEngine';

describe('ExpressionEngine', () => {
    let engine: ExpressionEngine;

    beforeEach(() => {
        engine = new ExpressionEngine();
    });

    it('should list operators', () => {
        const operators = engine.listOperators();
        expect(operators).toContain('+');
        expect(operators).toContain('-');
        expect(operators).toContain('*');
        expect(operators).toContain('/');
    });

    it('should list functions', () => {
        const functions = engine.listFunctions();
        expect(functions).toContain('abs');
        expect(functions).toContain('sin');
        expect(functions).toContain('concat');
    });

    it('should add and remove custom functions', () => {
        engine.addFunction('double', (x: number) => x * 2);
        expect(engine.listFunctions()).toContain('double');
        
        engine.removeFunction('double');
        expect(engine.listFunctions()).not.toContain('double');
    });

    it('should validate expressions', () => {
        expect(engine.validate('1 + 2')).toEqual({ valid: true });
    });

    it('should handle invalid expressions gracefully', () => {
        const result = engine.parseAndExecute('invalid expression', {});
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
    });

    it('should tokenize expressions', () => {
        const tokens = engine.tokenize('1 + 2');
        expect(tokens.length).toBe(3);
        expect(tokens[0].type).toBe('number');
        expect(tokens[1].type).toBe('operator');
        expect(tokens[2].type).toBe('number');
    });

    describe('Basic arithmetic', () => {
        it('should evaluate arithmetic expression', () => {
            const result = engine.parseAndExecute('2 + 3 * 4', {});
            expect(result.success).toBe(true);
            expect(result.value).toBe(14);
        });

        it('should evaluate tag substitution', () => {
            const ctx = { tag1: 10, tag2: 20 };
            const result = engine.parseAndExecute('tag1 + tag2', ctx);
            expect(result.success).toBe(true);
            expect(result.value).toBe(30);
        });

        it('should evaluate string concatenation', () => {
            const ctx = { temp: 25 };
            const result = engine.parseAndExecute("'Temp:' + temp + '°C'", ctx);
            expect(result.success).toBe(true);
            expect(result.value).toBe('Temp:25°C');
        });

        it('should evaluate power operation', () => {
            const ctx = { x: 2 };
            const result = engine.parseAndExecute('x ^ 3', ctx);
            expect(result.success).toBe(true);
            expect(result.value).toBe(8);
        });
    });

    describe('Logical and comparison operations', () => {
        it('should evaluate comparison', () => {
            const ctx = { temp: 85 };
            const result = engine.parseAndExecute('temp > 80', ctx);
            expect(result.success).toBe(true);
            expect(result.value).toBe(true);
        });

        it('should evaluate AND logic', () => {
            const ctx = { temp: 85, alarm: true };
            const result = engine.parseAndExecute('temp > 80 && alarm', ctx);
            expect(result.success).toBe(true);
            expect(result.value).toBe(true);
        });

        it('should evaluate OR logic', () => {
            const ctx = { temp: 30, alarm: true };
            const result = engine.parseAndExecute('temp > 80 || alarm', ctx);
            expect(result.success).toBe(true);
            expect(result.value).toBe(true);
        });

        it('should evaluate equality', () => {
            const ctx = { status: 1 };
            const result = engine.parseAndExecute('status == 1', ctx);
            expect(result.success).toBe(true);
            expect(result.value).toBe(true);
        });
    });

    describe('Conditional expressions', () => {
        it('should evaluate ternary expression (true branch)', () => {
            const ctx = { level: 80 };
            const result = engine.parseAndExecute('ifelse(level > 50, "HIGH", "LOW")', ctx);
            expect(result.success).toBe(true);
            expect(result.value).toBe("HIGH");
        });

        it('should evaluate ternary expression (false branch)', () => {
            const ctx = { level: 30 };
            const result = engine.parseAndExecute('ifelse(level > 50, "HIGH", "LOW")', ctx);
            expect(result.success).toBe(true);
            expect(result.value).toBe("LOW");
        });
    });

    describe('Function calls', () => {
        it('should call Math.sin', () => {
            const ctx = { angle: Math.PI / 2 };
            const result = engine.parseAndExecute('sin(angle)', ctx);
            expect(result.success).toBe(true);
            expect(Number(result.value)).toBeCloseTo(1, 5);
        });

        it('should call Math.abs', () => {
            const result = engine.parseAndExecute('abs(-5)', {});
            expect(result.success).toBe(true);
            expect(result.value).toBe(5);
        });

        it('should call Math.round', () => {
            const result = engine.parseAndExecute('round(3.7)', {});
            expect(result.success).toBe(true);
            expect(result.value).toBe(4);
        });

        it('should call Math.min', () => {
            const ctx = { a: 10, b: 5 };
            const result = engine.parseAndExecute('min(a, b)', ctx);
            expect(result.success).toBe(true);
            expect(result.value).toBe(5);
        });
    });

    describe('Expression compilation', () => {
        it('should compile expression once and reuse', () => {
            const compiled = engine.compile('tag1 + tag2');
            const ctx1 = { tag1: 5, tag2: 10 };
            const ctx2 = { tag1: 100, tag2: 200 };

            const r1 = compiled(ctx1);
            const r2 = compiled(ctx2);

            expect(r1.value).toBe(15);
            expect(r2.value).toBe(300);
        });
    });

    describe('Dependency analysis', () => {
        it('should extract tag dependencies', () => {
            const deps = engine.getDependencies('tag1 + tag2 * tag3');
            expect(deps).toContain('tag1');
            expect(deps).toContain('tag2');
            expect(deps).toContain('tag3');
        });

        it('should return empty for literal expression', () => {
            const deps = engine.getDependencies('1 + 2');
            expect(deps.length).toBe(0);
        });
    });

    describe('Error Handling', () => {
        it('should throw on syntax error', () => {
            const result = engine.validate('tag1 +');
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should handle undefined tag', () => {
            const result = engine.parseAndExecute('unknownFunc(1)', {});
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should handle division by zero', () => {
            const ctx = { x: 10 };
            const result = engine.parseAndExecute('x / 0', ctx);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });
});