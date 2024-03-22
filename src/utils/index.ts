import { window, workspace, TextDocument } from 'vscode'
import type {
  Config,
  ExtractKey,
  Identifier,
  KeyPath,
  BraketReg
} from '../types'

export enum Extension {
  name = 'print-log'
}

/**
 * 获取激活编辑器对象
 */
export const getTextEditor = () => window.activeTextEditor

/**
 * 获取配置
 * @param config 需要取的配置名称
 * @param identifier 从哪里取配置
 */
export const getConfig: {
  <T extends KeyPath<Config>>(config: T):
    | ExtractKey<Config, T>
    | undefined
  <T extends KeyPath<Identifier>>(config: T, identifier: 'editor'):
    | ExtractKey<Identifier, T>
    | undefined
} = <T extends KeyPath<Config & Identifier>>(
  config: T,
  identifier?: T extends keyof Identifier ? 'editor' : 'print-log'
): ExtractKey<Config & Identifier, T> | undefined =>
  workspace
    .getConfiguration(!identifier ? Extension.name : identifier)
    .get(config)

/**
 * 获取没有注释的文本
 * @param text 需要删除注释的文本
 */
export const getNotCommentText = (text: string) => {
  const commentReg = /\/\*[\s\S]*?\*\/|\/\/.*|<!--[\s\S]*?-->/g // 匹配注释
  if (commentReg.test(text)) {
    // 截取除了注释外的所有字符
    let normalText = text.slice(0, text.search(commentReg)).trimEnd() // 获取文本
    text = normalText.trim() === '' ? text : normalText
  }
  return text.trim()
}

/**
 * 找括号结束行
 * @param num 开始行
 * @param obj
 * @param cb 判断条件回调
 */
export const findEndLine = (
  document: TextDocument,
  num: number,
  obj: BraketReg,
  cb = (start: number, end: number) => start === end
) => {
  let start = 0,
    end = 0,
    temp = num

  while (num < document.lineCount) {
    let text = getNotCommentText(document.lineAt(num).text)

    const { startNum, endNum } = getBraketNum(text, {
      start: obj.start,
      end: obj.end
    })
    start += startNum
    end += endNum

    if (cb(start, end)) {
      return num
    }
    num++
  }
  return temp
}

/**
 * 拿到每一行括号数量
 * @param text 待验证的字符串
 */
export const getBraketNum = (text: string, { start, end }: BraketReg) => {
  let startNum = 0
  let endNum = 0
  const startReg = new RegExp(start, 'g')
  const endReg = new RegExp(end, 'g')

  while (startReg.exec(text)) {
    startNum++
  }
  while (endReg.exec(text)) {
    endNum++
  }
  return { startNum, endNum }
}
