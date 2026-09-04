/**
 * ✅ Centralized Logging Service
 * Provides consistent error/warning/info logging across the app
 * Integrates with Sentry for production error tracking
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  context?: Record<string, any>;
  error?: Error;
}

class Logger {
  private isDev = process.env.NODE_ENV === 'development';
  private logs: LogEntry[] = [];

  log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error) {
    const entry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      message,
      context,
      error,
    };

    this.logs.push(entry);

    // Console logging in development
    if (this.isDev) {
      const style = this.getConsoleStyle(level);
      console.log(
        `%c[${level.toUpperCase()}]%c ${message}`,
        style,
        'color: inherit;',
        context
      );
      if (error) console.error(error);
    }

    // Send to Sentry in production (if available)
    if (!this.isDev && typeof window !== 'undefined' && window.Sentry) {
      this.sendToSentry(entry);
    }
  }

  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    this.log('error', message, context, error);
  }

  private getConsoleStyle(level: LogLevel): string {
    const styles: Record<LogLevel, string> = {
      debug: 'color: #8A8599; font-weight: normal;',
      info: 'color: #00FF9D; font-weight: bold;',
      warn: 'color: #FFB800; font-weight: bold;',
      error: 'color: #FF4E4E; font-weight: bold;',
    };
    return styles[level];
  }

  private sendToSentry(entry: LogEntry) {
    try {
      // @ts-ignore Sentry injected globally
      window.Sentry?.captureMessage(entry.message, entry.level);
      if (entry.error) {
        // @ts-ignore
        window.Sentry?.captureException(entry.error);
      }
    } catch {
      // Silently fail if Sentry not available
    }
  }

  getLogs(level?: LogLevel) {
    return level ? this.logs.filter((l) => l.level === level) : this.logs;
  }

  clearLogs() {
    this.logs = [];
  }
}

export const logger = new Logger();
