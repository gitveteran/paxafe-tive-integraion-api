/**
 * Error handling types and categories
 */

export enum ErrorCategory {
  VALIDATION = 'validation',      // Invalid payload structure
  TRANSFORMATION = 'transformation', // Can't transform data
  DATABASE = 'database',          // DB write failures
  EXTERNAL = 'external',          // External service failures
  NETWORK = 'network',            // Network/connection issues
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ProcessingError {
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  payload_id?: number;
  retryable: boolean;
  notify_source: boolean; // Should we notify Tive?
  original_error?: Error;
  timestamp: number;
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public errors: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class TransformationError extends Error {
  constructor(message: string, public originalData?: any) {
    super(message);
    this.name = 'TransformationError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'DatabaseError';
  }
}

