type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

/**
 * 構造化ロガー
 * CloudWatch Logs での検索を考慮したJSON形式
 */
class Logger {
  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(data && { data: this.maskSensitiveData(data) }),
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(entry));
  }

  /**
   * 機密情報をマスク
   */
  private maskSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = ['token', 'secret', 'password', 'authorization', 'clientSecret'];
    const masked = { ...data };

    for (const key of Object.keys(masked)) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
        masked[key] = '***MASKED***';
      }
    }

    return masked;
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.log('error', message, data);
  }
}

export const logger = new Logger();
