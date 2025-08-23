import { ipcRenderer } from 'electron'
import { sha256sum } from './nodeCrypto.js'
import { versions } from './versions.js'

function send(channel: string, message: string) {
  return ipcRenderer.invoke(channel, message)
}

// 错误日志记录
function logError(type: string, errorData: any) {
  return ipcRenderer.invoke('log-error', type, errorData)
}

// 获取日志文件路径
function getLogPath() {
  return ipcRenderer.invoke('get-log-path')
}

// 显示消息
function showMessage(message: string) {
  return ipcRenderer.invoke('show-message', message)
}

// 获取应用信息
function getAppInfo() {
  return ipcRenderer.invoke('get-app-info')
}

export { sha256sum, versions, send, logError, getLogPath, showMessage, getAppInfo }
