import fs from "fs/promises";
import path from "path";

/**
 * Simple File & Console Logger
 *
 * A logging solution for Next.js with support for:
 * - Console output (development)
 * - File output with rotation (configurable)
 * - 30-day log retention
 */

// Log levels
type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

interface LoggerConfig {
  enableFileLogging: boolean;
  logFilePath: string;
  retentionDays: number;
  maxFileSize: number; // in MB
}

class SimpleLogger {
  private level: LogLevel;
  private isDevelopment: boolean;
  private config: LoggerConfig;
  private logsDir: string;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === "development";
    this.level =
      (process.env.LOG_LEVEL as LogLevel) ||
      (this.isDevelopment ? "debug" : "info");

    // Configure file logging from environment
    this.config = {
      enableFileLogging: process.env.LOG_ENABLE_FILE === "true",
      logFilePath: process.env.LOG_FILE_PATH || "./logs",
      retentionDays: parseInt(process.env.LOG_RETENTION_DAYS || "30"),
      maxFileSize: parseInt(process.env.LOG_MAX_FILE_SIZE || "10"), // 10MB default
    };

    this.logsDir = path.resolve(this.config.logFilePath);

    // Initialize logs directory and cleanup on startup
    if (this.config.enableFileLogging) {
      this.initializeLogging();
    }
  }

  /**
   * Initialize logging directory and start cleanup routine
   */
  private async initializeLogging(): Promise<void> {
    try {
      // Create logs directory if it doesn't exist
      await fs.mkdir(this.logsDir, { recursive: true });

      // Start cleanup routine for old logs
      await this.cleanupOldLogs();

      // Schedule daily cleanup (runs every 24 hours)
      setInterval(
        () => {
          this.cleanupOldLogs().catch(console.error);
        },
        24 * 60 * 60 * 1000,
      );
    } catch (error) {
      console.error("Failed to initialize file logging:", error);
    }
  }

  /**
   * Clean up log files older than retention period
   */
  private async cleanupOldLogs(): Promise<void> {
    try {
      const files = await fs.readdir(this.logsDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      for (const file of files) {
        if (!file.endsWith(".log")) continue;

        const filePath = path.join(this.logsDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          console.log(`Deleted old log file: ${file}`);
        }
      }
    } catch (error) {
      console.error("Failed to cleanup old logs:", error);
    }
  }

  /**
   * Get current log file path with date
   */
  private getLogFilePath(level: LogLevel): string {
    const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const filename =
      level === "error" ? `error-${date}.log` : `app-${date}.log`;
    return path.join(this.logsDir, filename);
  }

  /**
   * Write log to file
   */
  private async writeToFile(
    level: LogLevel,
    formattedMessage: string,
  ): Promise<void> {
    if (!this.config.enableFileLogging) return;

    try {
      const logFilePath = this.getLogFilePath(level);
      const logEntry = `${formattedMessage}\n`;

      // Check file size before writing
      try {
        const stats = await fs.stat(logFilePath);
        const fileSizeMB = stats.size / (1024 * 1024);

        if (fileSizeMB > this.config.maxFileSize) {
          // Rotate log file
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const rotatedPath = logFilePath.replace(".log", `-${timestamp}.log`);
          await fs.rename(logFilePath, rotatedPath);
        }
      } catch {
        // File doesn't exist yet, that's fine
      }

      await fs.appendFile(logFilePath, logEntry, "utf8");
    } catch (error) {
      console.error("Failed to write to log file:", error);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };
    return levels[level] >= levels[this.level];
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext,
  ): string {
    const timestamp = new Date().toISOString();
    const baseInfo = {
      timestamp,
      level,
      pid: process.pid,
      environment: process.env.NODE_ENV || "development",
      version: process.env.NEXT_PUBLIC_APP_VERSION || "0.1.0",
    };

    if (this.isDevelopment) {
      // Pretty format for development
      const time = new Date().toLocaleTimeString();
      const contextStr = context ? ` | ${JSON.stringify(context)}` : "";
      return `[${time}] ${level.toUpperCase()}: ${message}${contextStr}`;
    } else {
      // JSON format for production
      return JSON.stringify({
        ...baseInfo,
        msg: message,
        ...context,
      });
    }
  }

  debug(message: string, context?: LogContext) {
    if (this.shouldLog("debug")) {
      const formatted = this.formatMessage("debug", message, context);
      console.log(formatted);
      this.writeToFile("debug", formatted).catch(console.error);
    }
  }

  info(message: string, context?: LogContext) {
    if (this.shouldLog("info")) {
      const formatted = this.formatMessage("info", message, context);
      console.log(formatted);
      this.writeToFile("info", formatted).catch(console.error);
    }
  }

  warn(message: string, context?: LogContext) {
    if (this.shouldLog("warn")) {
      const formatted = this.formatMessage("warn", message, context);
      console.warn(formatted);
      this.writeToFile("warn", formatted).catch(console.error);
    }
  }

  error(message: string, context?: LogContext) {
    if (this.shouldLog("error")) {
      const formatted = this.formatMessage("error", message, context);
      console.error(formatted);
      this.writeToFile("error", formatted).catch(console.error);
    }
  }
}

// Create logger instance
export const logger = new SimpleLogger();

// Convenience methods for common logging patterns
export const loggerUtils = {
  /**
   * Log API request start
   */
  logRequestStart: (method: string, url: string, requestId?: string) => {
    logger.info(`${method} ${url} - Request started`, {
      type: "request_start",
      method,
      url,
      requestId,
    });
  },

  /**
   * Log API request completion
   */
  logRequestEnd: (
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    requestId?: string,
  ) => {
    const level =
      statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
    logger[level](`${method} ${url} - ${statusCode} (${duration}ms)`, {
      type: "request_end",
      method,
      url,
      statusCode,
      duration,
      requestId,
    });
  },

  /**
   * Log authentication events
   */
  logAuth: (
    event: "login" | "logout" | "token_refresh" | "auth_failed",
    userId?: string,
    details?: Record<string, unknown>,
  ) => {
    logger.info(
      `Authentication: ${event}${userId ? ` for user ${userId}` : ""}`,
      {
        type: "auth",
        event,
        userId,
        ...details,
      },
    );
  },

  /**
   * Log database operations
   */
  logDatabase: (
    operation: string,
    table: string,
    duration?: number,
    error?: Error,
  ) => {
    if (error) {
      logger.error(`Database error: ${operation} on ${table}`, {
        type: "database_error",
        operation,
        table,
        error: error.message,
        stack: error.stack,
      });
    } else {
      logger.debug(
        `Database: ${operation} on ${table}${duration ? ` (${duration}ms)` : ""}`,
        {
          type: "database",
          operation,
          table,
          duration,
        },
      );
    }
  },

  /**
   * Log application errors with context
   */
  logError: (
    error: Error,
    context?: Record<string, unknown>,
    userId?: string,
  ) => {
    logger.error(`Application error: ${error.message}`, {
      type: "application_error",
      error: error.message,
      stack: error.stack,
      userId,
      context,
    });
  },

  /**
   * Log user actions for audit trail
   */
  logUserAction: (
    action: string,
    userId: string,
    resourceId?: string,
    details?: Record<string, unknown>,
  ) => {
    logger.info(
      `User action: ${action} by ${userId}${resourceId ? ` on ${resourceId}` : ""}`,
      {
        type: "user_action",
        action,
        userId,
        resourceId,
        ...details,
      },
    );
  },
};

// Export default logger
export default logger;
