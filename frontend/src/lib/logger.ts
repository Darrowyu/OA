// 前端日志库 - 统一日志管理
// 生产环境自动禁用 debug/info 级别

const isDev = import.meta.env.DEV || import.meta.env.VITE_LOG_LEVEL === 'debug'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'
type LogMeta = Record<string, unknown> | undefined

// 日志级别权重
const levelWeight: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

// 当前日志级别
const currentLevel: LogLevel = isDev ? 'debug' : 'warn'

// 格式化日志消息
function formatMessage(level: LogLevel, message: string, meta?: LogMeta): string {
  const timestamp = new Date().toISOString()
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : ''
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`
}

// 检查是否应该记录该级别
function shouldLog(level: LogLevel): boolean {
  return levelWeight[level] >= levelWeight[currentLevel]
}

// 发送日志到服务器（错误级别）
async function sendToServer(level: LogLevel, message: string, meta?: LogMeta): Promise<void> {
  if (level !== 'error') return

  try {
    // 批量发送或防抖处理
    await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        message,
        meta,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      }),
    })
  } catch {
    // 静默失败，避免循环错误
  }
}

export const logger = {
  debug: (message: string, meta?: LogMeta): void => {
    if (!shouldLog('debug')) return
    // eslint-disable-next-line no-console
    console.debug(formatMessage('debug', message, meta))
  },

  info: (message: string, meta?: LogMeta): void => {
    if (!shouldLog('info')) return
    // eslint-disable-next-line no-console
    console.info(formatMessage('info', message, meta))
  },

  warn: (message: string, meta?: LogMeta): void => {
    if (!shouldLog('warn')) return
    console.warn(formatMessage('warn', message, meta))
  },

  error: (message: string, meta?: LogMeta): void => {
    if (!shouldLog('error')) return
    console.error(formatMessage('error', message, meta))
    // 生产环境发送错误到服务器
    if (!isDev) {
      sendToServer('error', message, meta)
    }
  },
}

export default logger
