import { config } from '../config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const CURRENT_LOG_LEVEL = (config.log.level as LogLevel) || 'info';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[CURRENT_LOG_LEVEL];
}

function formatLogMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

export function debug(message: string, meta?: Record<string, unknown>): void {
  if (shouldLog('debug')) console.debug(formatLogMessage('debug', message, meta));
}

export function info(message: string, meta?: Record<string, unknown>): void {
  if (shouldLog('info')) console.info(formatLogMessage('info', message, meta));
}

export function warn(message: string, meta?: Record<string, unknown>): void {
  if (shouldLog('warn')) console.warn(formatLogMessage('warn', message, meta));
}

export function error(message: string, meta?: Record<string, unknown>): void {
  if (shouldLog('error')) console.error(formatLogMessage('error', message, meta));
}

export default { debug, info, warn, error };
