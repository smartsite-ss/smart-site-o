// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export type ErrorCode = 
  | 'INVALID_TYPE'
  | 'NOT_FOUND'
  | 'INVALID_ARGUMENT'
  | 'OPERATION_FAILED'
  | 'PERMISSION_DENIED'
  | 'GRAPHIC_ERROR'
  | 'RENDERER_ERROR'
  | 'PLUGIN_ERROR'
  | 'STATE_ERROR'
  | 'STORAGE_ERROR'
  | 'EXPORT_ERROR'
  | 'IMPORT_ERROR'
  | 'SCRIPT_ERROR'
  | 'SERIALIZATION_ERROR'
  | 'VALIDATION_ERROR';

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  details?: Record<string, any>;
  stack?: string;
  timestamp?: number;
  context?: string;
  handled?: boolean;
}

export class GraphicError extends Error {
  public code: ErrorCode;
  public details?: Record<string, any>;
  public timestamp: number;

  constructor(code: ErrorCode, message: string, details?: Record<string, any>) {
    super(message);
    this.name = 'GraphicError';
    this.code = code;
    this.details = details;
    this.timestamp = Date.now();
    this.stack = new Error().stack;
  }

  toJSON(): ErrorDetails {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      stack: this.stack,
      timestamp: this.timestamp,
    };
  }

  toString(): string {
    const detailsStr = this.details ? `, details: ${JSON.stringify(this.details)}` : '';
    return `[${this.code}] ${this.message}${detailsStr}`;
  }
}

export class InvalidTypeError extends GraphicError {
  constructor(type: string, expectedTypes?: string[]) {
    super(
      'INVALID_TYPE',
      `Invalid type: ${type}${expectedTypes ? `, expected: ${expectedTypes.join(', ')}` : ''}`,
      { type, expectedTypes }
    );
  }
}

export class NotFoundError extends GraphicError {
  constructor(resource: string, id: string | number) {
    super(
      'NOT_FOUND',
      `${resource} not found with id: ${id}`,
      { resource, id }
    );
  }
}

export class InvalidArgumentError extends GraphicError {
  constructor(argument: string, reason?: string) {
    super(
      'INVALID_ARGUMENT',
      `Invalid argument: ${argument}${reason ? `, ${reason}` : ''}`,
      { argument, reason }
    );
  }
}

export class OperationFailedError extends GraphicError {
  constructor(operation: string, reason?: string) {
    super(
      'OPERATION_FAILED',
      `Operation failed: ${operation}${reason ? `, ${reason}` : ''}`,
      { operation, reason }
    );
  }
}

export class PermissionDeniedError extends GraphicError {
  constructor(operation: string) {
    super(
      'PERMISSION_DENIED',
      `Permission denied for operation: ${operation}`,
      { operation }
    );
  }
}

export class RendererError extends GraphicError {
  constructor(message: string, details?: Record<string, any>) {
    super('RENDERER_ERROR', message, details);
  }
}

export class PluginError extends GraphicError {
  constructor(pluginId: string, message: string) {
    super(
      'PLUGIN_ERROR',
      `Plugin error [${pluginId}]: ${message}`,
      { pluginId }
    );
  }
}

export class StateError extends GraphicError {
  constructor(message: string, state?: Record<string, any>) {
    super('STATE_ERROR', message, state);
  }
}

export class StorageError extends GraphicError {
  constructor(operation: string, reason: string) {
    super(
      'STORAGE_ERROR',
      `Storage operation failed: ${operation} - ${reason}`,
      { operation, reason }
    );
  }
}

export class ScriptError extends GraphicError {
  constructor(scriptId: string, message: string, line?: number, column?: number) {
    super('SCRIPT_ERROR', `Script execution failed: ${message}`, {
      scriptId,
      line,
      column,
    });
  }
}

export class ExportError extends GraphicError {
  constructor(format: string, reason: string) {
    super(
      'EXPORT_ERROR',
      `Export failed for format ${format}: ${reason}`,
      { format, reason }
    );
  }
}

export class ImportError extends GraphicError {
  constructor(reason: string, details?: any) {
    super(
      'IMPORT_ERROR',
      `Import failed: ${reason}`,
      { details }
    );
  }
}

export class SerializationError extends GraphicError {
  constructor(reason: string, data?: any) {
    super(
      'SERIALIZATION_ERROR',
      `Serialization failed: ${reason}`,
      { data }
    );
  }
}

export class ValidationError extends GraphicError {
  constructor(field: string, message: string, value?: any) {
    super(
      'VALIDATION_ERROR',
      `Validation failed for ${field}: ${message}`,
      { field, value }
    );
  }
}

class ErrorService {
  private errorHistory: ErrorDetails[] = [];
  private maxHistorySize = 100;
  private errorListeners: Array<(error: ErrorDetails) => void> = [];

  record(error: unknown, context?: string): ErrorDetails {
    const details = this.normalizeError(error, context);
    
    this.errorHistory.push(details);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }

    this.errorListeners.forEach((listener) => listener(details));

    return details;
  }

  normalizeError(error: unknown, context?: string): ErrorDetails {
    if (error instanceof GraphicError) {
      return {
        ...error.toJSON(),
        context,
        handled: false,
      };
    }

    if (error instanceof Error) {
      return {
        code: 'OPERATION_FAILED',
        message: error.message,
        stack: error.stack,
        context,
        handled: false,
        timestamp: Date.now(),
      };
    }

    return {
      code: 'OPERATION_FAILED',
      message: String(error),
      context,
      handled: false,
      timestamp: Date.now(),
    };
  }

  onError(listener: (error: ErrorDetails) => void): () => void {
    this.errorListeners.push(listener);
    return () => {
      this.errorListeners = this.errorListeners.filter((l) => l !== listener);
    };
  }

  getHistory(): ErrorDetails[] {
    return [...this.errorHistory];
  }

  clearHistory(): void {
    this.errorHistory = [];
  }

  getFriendlyMessage(error: ErrorDetails): string {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { i18n } = (globalThis as any).require('../../locales');
      const t = i18n.global.t.bind(i18n.global);
      switch (error.code) {
        case 'NOT_FOUND':
          return t('errors.friendly.notFound');
        case 'STORAGE_ERROR':
          return t('errors.friendly.storage');
        case 'EXPORT_ERROR':
          return t('errors.friendly.export');
        case 'IMPORT_ERROR':
          return t('errors.friendly.import');
        case 'SCRIPT_ERROR':
          return t('errors.friendly.script');
        case 'VALIDATION_ERROR':
          return t('errors.friendly.validation');
        case 'PERMISSION_DENIED':
          return t('errors.friendly.permissionDenied');
        default:
          return t('errors.friendly.default');
      }
    } catch {
      switch (error.code) {
        case 'NOT_FOUND':
          return 'Resource not found';
        case 'STORAGE_ERROR':
          return 'Storage operation failed';
        case 'EXPORT_ERROR':
          return 'Export failed';
        case 'IMPORT_ERROR':
          return 'Import failed';
        case 'SCRIPT_ERROR':
          return 'Script execution failed';
        case 'VALIDATION_ERROR':
          return 'Data validation failed';
        case 'PERMISSION_DENIED':
          return 'Permission denied';
        default:
          return 'Operation failed';
      }
    }
  }

  getHistoryByCode(code: ErrorCode): ErrorDetails[] {
    return this.errorHistory.filter((error) => error.code === code);
  }

  getLatestError(): ErrorDetails | null {
    return this.errorHistory.length > 0 ? this.errorHistory[this.errorHistory.length - 1] : null;
  }
}

export const errorHandler = {
  handle(error: unknown): void {
    if (error instanceof GraphicError) {
      console.error(`[GraphicError] ${error.toString()}`);
    } else if (error instanceof Error) {
      console.error(`[Error] ${error.message}`, error.stack);
    } else {
      console.error('[Unknown Error]', error);
    }
  },

  throwIf(condition: boolean, code: ErrorCode, message: string, details?: Record<string, any>): void {
    if (condition) {
      throw new GraphicError(code, message, details);
    }
  },

  assert(condition: boolean, message: string): void {
    if (!condition) {
      throw new GraphicError('INVALID_ARGUMENT', message);
    }
  },

  validateGraphicType(type: string, allowedTypes: string[]): void {
    if (!allowedTypes.includes(type)) {
      throw new InvalidTypeError(type, allowedTypes);
    }
  },
};

export const errorService = new ErrorService();