/**
 * Error handling and categorization logic
 */

import {
  ErrorCategory,
  ErrorSeverity,
  ProcessingError,
  ValidationError,
  TransformationError,
  DatabaseError,
} from './error-types';

/**
 * Handle and categorize processing errors
 */
export function handleProcessingError(
  error: unknown,
  payload: any,
  payloadId?: number
): ProcessingError {
  // Handle ValidationError
  if (error instanceof ValidationError) {
    return {
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.HIGH,
      message: error.message,
      payload_id: payloadId,
      retryable: false, // Invalid data won't become valid
      notify_source: true, // Tive should know their payload is invalid
      original_error: error,
      timestamp: Date.now(),
    };
  }

  // Handle TransformationError
  if (error instanceof TransformationError) {
    return {
      category: ErrorCategory.TRANSFORMATION,
      severity: ErrorSeverity.MEDIUM,
      message: error.message,
      payload_id: payloadId,
      retryable: false, // Transformation errors are usually data issues
      notify_source: true, // Tive should know about data format issues
      original_error: error,
      timestamp: Date.now(),
    };
  }

  // Handle DatabaseError
  if (error instanceof DatabaseError) {
    return {
      category: ErrorCategory.DATABASE,
      severity: ErrorSeverity.CRITICAL,
      message: error.message,
      payload_id: payloadId,
      retryable: true, // DB might be temporarily down
      notify_source: false, // Internal issue, not Tive's problem
      original_error: error.originalError,
      timestamp: Date.now(),
    };
  }

  // Handle generic errors
  if (error instanceof Error) {
    // Check for database connection errors
    if (error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
      return {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.CRITICAL,
        message: 'Database connection error',
        payload_id: payloadId,
        retryable: true,
        notify_source: false,
        original_error: error,
        timestamp: Date.now(),
      };
    }

    // Default to transformation error for unknown errors
    return {
      category: ErrorCategory.TRANSFORMATION,
      severity: ErrorSeverity.MEDIUM,
      message: error.message || 'Unknown error occurred',
      payload_id: payloadId,
      retryable: true,
      notify_source: false,
      original_error: error,
      timestamp: Date.now(),
    };
  }

  // Fallback for non-Error objects
  return {
    category: ErrorCategory.TRANSFORMATION,
    severity: ErrorSeverity.MEDIUM,
    message: 'Unknown error occurred',
    payload_id: payloadId,
    retryable: false,
    notify_source: false,
    timestamp: Date.now(),
  };
}

