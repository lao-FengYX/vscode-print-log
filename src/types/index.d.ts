export interface Config {
  clear: {
    /**
     * 删除后执行格式化
     */
    format: boolean
    /**
     * 删除注释和空行
     */
    deleteCommentsAndEmptyLine: boolean
  }
  output: {
    /**
     * 添加的信息
     */
    log: string
    /**
     * 输出日志引号
     */
    selectQuotationMarks: string
    /**
     * 是否在结尾添加分号
     */
    semicolonIsRequired: boolean
    /**
     * 输出时添加文件名
     */
    needFileName: boolean
    /**
     * 输出是添加行号
     */
    needLineNumber: boolean
    /**
     * 输出时添加选择的内容
     */
    needSelectedText: boolean
    /**
     * 输出后移动光标
     */
    moveTheCursor: boolean
    /**
     * 输出内容是否独占一行
     */
    separateLine: boolean
  }
}

export interface Identifier {
  tabSize: number
}

/**
 * 提取键
 */
export type KeyPath<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${KeyPath<T[K]>}`
          : `${K}`
        : never
    }[keyof T]
  : never

/**
 * 提取值
 */
export type ExtractKey<
  T extends object,
  K extends string
> = K extends `${infer P}.${infer R}`
  ? P extends keyof T
    ? T[P] extends object
      ? ExtractKey<T[P], R>
      : never
    : never
  : K extends keyof T
  ? T[K]
  : never
