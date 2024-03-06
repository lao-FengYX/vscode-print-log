import { LogOutputChannel, window } from 'vscode'

export default class Logger {
  /** 日志实例 */
  private static instance?: Logger
  /** 输出通道 */
  private out: LogOutputChannel
  constructor() {
    this.out = window.createOutputChannel('print-log', {
      log: true
    })
  }

  /**
   * 获取实例对象
   */
  private static getInstance() {
    Logger.instance ??= new Logger()
    return Logger.instance
  }

  /**
   * 输出信息到日志通道
   * @param msg 需要输出的信息
   * @param arg 其他信息
   */
  static info(msg: string, ...arg: any[]) {
    Logger.getInstance().out.info(msg, ...arg)
  }

  /**
   * 输出错误信息到日志通道
   * @param msg 需要输出的信息
   * @param arg 其他信息
   */
  static error(msg: string | Error, ...arg: any[]) {
    Logger.getInstance().out.error(msg, ...arg)
  }

  /**
   * 显示日志通道信息
   */
  static show() {
    Logger.getInstance().out.show()
  }

  /**
   * 清空日志通道信息
   */
  static clear() {
    Logger.getInstance().out.clear()
  }
}
