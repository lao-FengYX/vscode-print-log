import { window, workspace } from 'vscode'
import type { Config, ExtractKey, Identifier, KeyPath } from '../types'

export enum Extension {
  name = 'print-log'
}

/**
 * 获取激活编辑器对象
 */
export const getTextEditor = () => window.activeTextEditor

/**
 * 获取配置
 */
export const getConfig = <T extends KeyPath<Config & Identifier>>(
  config: T,
  identifier?: T extends keyof Identifier ? 'editor' : 'print-log'
): ExtractKey<Config & Identifier, T> | undefined =>
  workspace
    .getConfiguration(!identifier ? Extension.name : identifier)
    .get(config)

/**
 * 获取没有注释的文本
 */
export const getNotCommentText = (text: string) => {
  const commentReg = /\/\*[\s\S]*?\*\/|\/\/.*|<!--[\s\S]*?-->/g // 匹配注释
  if (commentReg.test(text)) {
    // 截取除了注释外的所有字符
    let normalText = text.slice(0, text.search(commentReg)).trimEnd() // 获取文本
    text = normalText.trim() === '' ? text : normalText
  }
  return text
}
