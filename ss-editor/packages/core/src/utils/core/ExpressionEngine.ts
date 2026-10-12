// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export interface ExpressionToken {
  type: 'number' | 'string' | 'identifier' | 'operator' | 'function' | 'paren' | 'bracket' | 'comma' | 'dot';
  value: string;
  position: number;
}

export interface ParsedExpression {
  type: 'literal' | 'identifier' | 'binary' | 'unary' | 'call' | 'member';
  value?: string | number;
  operator?: string;
  left?: ParsedExpression;
  right?: ParsedExpression;
  argument?: ParsedExpression;
  functionName?: string;
  args?: ParsedExpression[];
  object?: ParsedExpression;
  property?: string;
}

export interface ExpressionResult {
  success: boolean;
  value?: any;
  error?: string;
}

export class ExpressionEngine {
  private operators: Record<string, { precedence: number; associativity: string }> = {
    '+': { precedence: 1, associativity: 'left' },
    '-': { precedence: 1, associativity: 'left' },
    '*': { precedence: 2, associativity: 'left' },
    '/': { precedence: 2, associativity: 'left' },
    '%': { precedence: 2, associativity: 'left' },
    '^': { precedence: 3, associativity: 'right' },
    '==': { precedence: 0, associativity: 'left' },
    '!=': { precedence: 0, associativity: 'left' },
    '<': { precedence: 0, associativity: 'left' },
    '>': { precedence: 0, associativity: 'left' },
    '<=': { precedence: 0, associativity: 'left' },
    '>=': { precedence: 0, associativity: 'left' },
    '&&': { precedence: -1, associativity: 'left' },
    '||': { precedence: -2, associativity: 'left' },
  };

  private functions: Record<string, (...args: any[]) => any> = {
    abs: Math.abs,
    ceil: Math.ceil,
    floor: Math.floor,
    round: Math.round,
    sqrt: Math.sqrt,
    pow: Math.pow,
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    asin: Math.asin,
    acos: Math.acos,
    atan: Math.atan,
    min: Math.min,
    max: Math.max,
    sum: (...args: number[]) => args.reduce((a, b) => a + b, 0),
    avg: (...args: number[]) => args.reduce((a, b) => a + b, 0) / args.length,
    count: (...args: any[]) => args.length,
    concat: (...args: any[]) => args.join(''),
    substr: (str: string, start: number, length?: number) => str.substr(start, length),
    toUpperCase: (str: string) => str.toUpperCase(),
    toLowerCase: (str: string) => str.toLowerCase(),
    trim: (str: string) => str.trim(),
    length: (str: string) => str.length,
    isEmpty: (value: any) => value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0),
    notEmpty: (value: any) => !this.functions.isEmpty(value),
    ifelse: (condition: boolean, trueValue: any, falseValue: any) => condition ? trueValue : falseValue,
    ternary: (condition: boolean, trueValue: any, falseValue: any) => condition ? trueValue : falseValue,
  };

  tokenize(expression: string): ExpressionToken[] {
    const tokens: ExpressionToken[] = [];
    
    const regex = /(\d+\.?\d*|'[^']*'|"[^"]*"|[a-zA-Z_]\w*|==|!=|<=|>=|&&|\|\||[+\-*/%^<>!()[\]{},.])/g;
    let match;
    
    while ((match = regex.exec(expression)) !== null) {
      const value = match[0];
      let type: ExpressionToken['type'] = 'identifier';
      
      if (/^\d+\.?\d*$/.test(value)) {
        type = 'number';
      } else if (/^['"].*['"]$/.test(value)) {
        type = 'string';
      } else if (value in this.operators) {
        type = 'operator';
      } else if (/^[a-zA-Z_]\w*$/.test(value) && value.toLowerCase() in this.functions) {
        type = 'function';
      } else if (value === '(' || value === ')') {
        type = 'paren';
      } else if (value === '[' || value === ']') {
        type = 'bracket';
      } else if (value === ',') {
        type = 'comma';
      } else if (value === '.') {
        type = 'dot';
      }
      
      tokens.push({ type, value, position: match.index });
    }
    
    return tokens;
  }

  parse(tokens: ExpressionToken[]): ParsedExpression {
    let index = 0;
    
    const parseExpression = (precedence: number = -3): ParsedExpression => {
      let left = parsePrimary();
      
      while (index < tokens.length) {
        const token = tokens[index];
        if (token.type !== 'operator') break;
        
        const opInfo = this.operators[token.value];
        if (!opInfo || opInfo.precedence < precedence) break;
        
        index++;
        const right = parseExpression(opInfo.precedence + (opInfo.associativity === 'right' ? 1 : 0));
        left = { type: 'binary', operator: token.value, left, right };
      }
      
      return left;
    };
    
    const parsePrimary = (): ParsedExpression => {
      if (index >= tokens.length) {
        throw new Error('Unexpected end of expression');
      }
      
      const token = tokens[index];
      
      if (token.type === 'number') {
        index++;
        return { type: 'literal', value: parseFloat(token.value) };
      }
      
      if (token.type === 'string') {
        index++;
        return { type: 'literal', value: token.value.slice(1, -1) };
      }
      
      if (token.type === 'identifier' || token.type === 'function') {
        index++;
        
        if (index < tokens.length && tokens[index].value === '(') {
          return parseCall(token.value);
        }
        
        return { type: 'identifier', value: token.value };
      }
      
      if (token.value === '(') {
        index++;
        const expr = parseExpression();
        if (index >= tokens.length || tokens[index].value !== ')') {
          throw new Error('Missing closing parenthesis');
        }
        index++;
        return expr;
      }
      
      if (token.value === '-' || token.value === '!') {
        index++;
        const argument = parseExpression(2);
        return { type: 'unary', operator: token.value, argument };
      }
      
      throw new Error(`Unexpected token: ${token.value}`);
    };
    
    const parseCall = (functionName: string): ParsedExpression => {
      index++;
      
      const args: ParsedExpression[] = [];
      
      if (index < tokens.length && tokens[index].value !== ')') {
        do {
          args.push(parseExpression());
          if (index < tokens.length && tokens[index].value === ',') {
            index++;
          } else {
            break;
          }
        } while (index < tokens.length);
      }
      
      if (index >= tokens.length || tokens[index].value !== ')') {
        throw new Error('Missing closing parenthesis for function call');
      }
      
      index++;
      
      return { type: 'call', functionName, args };
    };
    
    const result = parseExpression();
    
    if (index < tokens.length) {
      throw new Error(`Unexpected token after expression: ${tokens[index].value}`);
    }
    
    return result;
  }

  evaluate(expression: ParsedExpression, data: Record<string, any>): any {
    switch (expression.type) {
      case 'literal':
        return expression.value;
        
      case 'identifier':
        return this.getProperty(data, String(expression.value || ''));
        
      case 'binary': {
        const left = this.evaluate(expression.left!, data);
        const right = this.evaluate(expression.right!, data);
        return this.applyOperator(expression.operator!, left, right);
      }
      
      case 'unary': {
        const arg = this.evaluate(expression.argument!, data);
        if (expression.operator === '-') return -arg;
        if (expression.operator === '!') return !arg;
        return arg;
      }
      
      case 'call': {
        const func = this.functions[expression.functionName?.toLowerCase() || ''];
        if (!func) {
          throw new Error(`Unknown function: ${expression.functionName}`);
        }
        const args = expression.args?.map(arg => this.evaluate(arg, data)) || [];
        return func(...args);
      }
      
      case 'member': {
        const obj = this.evaluate(expression.object!, data);
        return this.getProperty(obj, String(expression.property || ''));
      }
      
      default:
        return undefined;
    }
  }

  private getProperty(obj: any, path: string): any {
    if (obj === null || obj === undefined) return undefined;
    
    const parts = path.split('.');
    let result = obj;
    
    for (const part of parts) {
      if (result === null || result === undefined) return undefined;
      result = result[part];
    }
    
    return result;
  }

  private applyOperator(operator: string, left: any, right: any): any {
    switch (operator) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': 
        if (right === 0) throw new Error('Division by zero');
        return left / right;
      case '%': return left % right;
      case '^': return Math.pow(left, right);
      case '==': return left == right;
      case '!=': return left != right;
      case '<': return left < right;
      case '>': return left > right;
      case '<=': return left <= right;
      case '>=': return left >= right;
      case '&&': return left && right;
      case '||': return left || right;
      default: return left;
    }
  }

  compile(expression: string): (data: Record<string, any>) => ExpressionResult {
    try {
      const tokens = this.tokenize(expression);
      const parsed = this.parse(tokens);
      
      return (data: Record<string, any>) => {
        try {
          const value = this.evaluate(parsed, data);
          return { success: true, value };
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      };
    } catch (error) {
      return () => ({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  execute(expression: string, data: Record<string, any>): ExpressionResult {
    const compiled = this.compile(expression);
    return compiled(data);
  }

  validate(expression: string): { valid: boolean; error?: string } {
    try {
      const tokens = this.tokenize(expression);
      this.parse(tokens);
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  addFunction(name: string, func: (...args: any[]) => any): void {
    this.functions[name.toLowerCase()] = func;
  }

  removeFunction(name: string): void {
    delete this.functions[name.toLowerCase()];
  }

  listFunctions(): string[] {
    return Object.keys(this.functions);
  }

  listOperators(): string[] {
    return Object.keys(this.operators);
  }

  getDependencies(expression: string): string[] {
    try {
      const tokens = this.tokenize(expression);
      const identifiers = new Set<string>();
      for (const token of tokens) {
        if (token.type === 'identifier' && !(token.value.toLowerCase() in this.functions)) {
          identifiers.add(token.value);
        }
      }
      return Array.from(identifiers);
    } catch {
      return [];
    }
  }

  parseAndExecute(expression: string, data: Record<string, any>): ExpressionResult {
    try {
      const tokens = this.tokenize(expression);
      const parsed = this.parse(tokens);
      const value = this.evaluate(parsed, data);
      return { success: true, value };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const expressionEngine = new ExpressionEngine();