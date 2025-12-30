/**
 * アプリケーションエラー基底クラス
 */
export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode: number = 500) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

/**
 * Zoom API エラー
 */
export class ZoomApiError extends AppError {
  constructor(message: string, _originalError?: Error) {
    super('E002', `Zoom API Error: ${message}`, 502);
    this.name = 'ZoomApiError';
  }
}

/**
 * バリデーションエラー
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super('E003', message, 400);
    this.name = 'ValidationError';
  }
}
