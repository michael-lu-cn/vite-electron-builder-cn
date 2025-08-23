import { existsSync } from 'node:fs'
import { appendFile, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app, dialog, ipcMain } from 'electron'

export class Logger {
  private logDir: string
  private logFile: string
  private errorLogFile: string

  constructor() {
    this.logDir = join(app.getPath('userData'), 'logs')
    this.logFile = join(this.logDir, 'app.log')
    this.errorLogFile = join(this.logDir, 'error.log')
    this.initializeLogger()
  }

  private async initializeLogger() {
    try {
      // 确保日志目录存在
      if (!existsSync(this.logDir)) {
        await mkdir(this.logDir, { recursive: true })
      }

      // 注册IPC处理器
      this.registerIpcHandlers()

      // 记录应用启动
      await this.log('info', 'Application started', {
        version: app.getVersion(),
        platform: process.platform,
        arch: process.arch,
        electronVersion: process.versions.electron,
        nodeVersion: process.versions.node,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Failed to initialize logger:', error)
    }
  }

  private registerIpcHandlers() {
    // 处理渲染进程的错误日志
    ipcMain.handle('log-error', async (_event, type: string, errorData: any) => {
      await this.logError(type, errorData)
      return true
    })

    // 获取日志文件路径
    ipcMain.handle('get-log-path', () => {
      return this.logDir
    })

    // 显示消息对话框
    ipcMain.handle('show-message', async (_event, message: string) => {
      const result = await dialog.showMessageBox({
        type: 'info',
        title: '消息',
        message: message,
        buttons: ['确定'],
      })
      return result
    })

    // 获取应用信息
    ipcMain.handle('get-app-info', () => {
      return {
        name: app.getName(),
        version: app.getVersion(),
        platform: process.platform,
        arch: process.arch,
        electronVersion: process.versions.electron,
        nodeVersion: process.versions.node,
        userDataPath: app.getPath('userData'),
        logPath: this.logDir,
      }
    })
  }

  async log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      message,
      data,
    }

    const logLine = `${JSON.stringify(logEntry)}\n`

    try {
      await appendFile(this.logFile, logLine)
      console.log(`[${level.toUpperCase()}] ${message}`, data || '')
    } catch (error) {
      console.error('Failed to write to log file:', error)
    }
  }

  async logError(type: string, errorData: any) {
    const timestamp = new Date().toISOString()
    const errorEntry = {
      timestamp,
      type,
      errorData,
      processInfo: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.versions.node,
        electronVersion: process.versions.electron,
        appVersion: app.getVersion(),
      },
    }

    const errorLine = `${JSON.stringify(errorEntry)}\n`

    try {
      // 写入错误日志文件
      await appendFile(this.errorLogFile, errorLine)

      // 也写入普通日志
      await this.log('error', `${type} error occurred`, errorData)

      console.error(`[ERROR] ${type}:`, errorData)
    } catch (error) {
      console.error('Failed to write error log:', error)
    }
  }

  // 清理旧日志文件
  async cleanupOldLogs(daysToKeep: number = 7) {
    try {
      const { readdir, stat, unlink } = await import('node:fs/promises')
      const files = await readdir(this.logDir)
      const now = Date.now()
      const maxAge = daysToKeep * 24 * 60 * 60 * 1000 // 转换为毫秒

      for (const file of files) {
        if (file.endsWith('.log')) {
          const filePath = join(this.logDir, file)
          const stats = await stat(filePath)

          if (now - stats.mtime.getTime() > maxAge) {
            await unlink(filePath)
            await this.log('info', `Cleaned up old log file: ${file}`)
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old logs:', error)
    }
  }

  // 获取最近的错误日志
  async getRecentErrors(limit: number = 50): Promise<any[]> {
    try {
      const { readFile } = await import('node:fs/promises')

      if (!existsSync(this.errorLogFile)) {
        return []
      }

      const content = await readFile(this.errorLogFile, 'utf-8')
      const lines = content
        .trim()
        .split('\n')
        .filter((line) => line.length > 0)

      const errors = lines
        .slice(-limit) // 获取最后N行
        .map((line) => {
          try {
            return JSON.parse(line)
          } catch {
            return null
          }
        })
        .filter(Boolean)

      return errors.reverse() // 最新的在前面
    } catch (error) {
      console.error('Failed to read error logs:', error)
      return []
    }
  }

  // 导出日志文件
  async exportLogs(): Promise<string> {
    try {
      const { readFile } = await import('node:fs/promises')
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const exportPath = join(app.getPath('desktop'), `app-logs-${timestamp}.txt`)

      let content = `Application Logs Export\n`
      content += `Generated: ${new Date().toISOString()}\n`
      content += `App Version: ${app.getVersion()}\n`
      content += `Platform: ${process.platform} ${process.arch}\n`
      content += `Electron: ${process.versions.electron}\n`
      content += `Node: ${process.versions.node}\n`
      content += `\n${'='.repeat(50)}\n\n`

      // 添加普通日志
      if (existsSync(this.logFile)) {
        const logContent = await readFile(this.logFile, 'utf-8')
        content += `GENERAL LOGS:\n${logContent}\n\n`
      }

      // 添加错误日志
      if (existsSync(this.errorLogFile)) {
        const errorContent = await readFile(this.errorLogFile, 'utf-8')
        content += `ERROR LOGS:\n${errorContent}\n`
      }

      await writeFile(exportPath, content)
      return exportPath
    } catch (error) {
      console.error('Failed to export logs:', error)
      throw error
    }
  }

  getLogDirectory(): string {
    return this.logDir
  }
}
