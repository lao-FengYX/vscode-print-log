export interface Config {
  /**
   * 删除后执行格式化
   */
  'clean.format': boolean
  /**
   * 删除注释和空行
   */
  'clean.deleteCommentsAndEmptyLine': boolean

  /**
   * 添加的信息
   */
  'output.log': string
  /**
   * 输出日志引号
   */
  'output.selectQuotationMarks': string
  /**
   * 是否在结尾添加分号
   */
  'output.semicolonIsRequired': boolean
  /**
   * 输出时添加文件名
   */
  'output.needFileName': boolean
  /**
   * 输出是添加行号
   */
  'output.needLineNumber': boolean
  /**
   * 输出时添加选择的内容
   */
  'output.needSelectedText': boolean
  /**
   * 输出后移动光标
   */
  'output.moveTheCursor': boolean
  /**
   * 输出内容是否独占一行
   */
  'output.separateLine': boolean
}
