import {
  CompletionItem,
  CompletionItemKind,
  CompletionItemProvider,
  CompletionList,
  MarkdownString,
  Position,
  ProviderResult,
  TextDocument,
  env
} from 'vscode'
import path from 'path'
import { getNotCommentText } from '.'

/**
 * 是否是指令触发的 consoleHandle
 */
let commandTrigger = false

export const useCommandTrigger = (): [boolean, (trigger: boolean) => any] => {
  const setCommandTrigger = (trigger: boolean) => {
    commandTrigger = trigger
  }

  return [commandTrigger, setCommandTrigger]
}

export class AutoCompletionItemProvider implements CompletionItemProvider {
  private command: string = '' // 完成指令
  private upperCommand: string = '' // 开始字母大写的指令
  private language: string = '' // 当前vscode语言

  constructor(command: string) {
    this.command = command
    this.language = env.language.toLowerCase()
  }

  provideCompletionItems(
    document: TextDocument,
    position: Position
  ): ProviderResult<CompletionItem[] | CompletionList<CompletionItem>> {
    this.upperCommand =
      this.command.slice(0, 1).toUpperCase() + this.command.slice(1)

    const snippetCompletion = new CompletionItem(
      this.command,
      CompletionItemKind.Method
    )
    snippetCompletion.documentation = new MarkdownString(
      `${
        this.language === 'zh-cn'
          ? '快速打印当前行'
          : 'Quickly print the current line'
      } (Print ${this.upperCommand})\n\nconsole.${this.command}(lineCode)`
    )
    snippetCompletion.sortText = '0'

    const arr = this.command
      .split('')
      .map((_, i) => this.command.slice(0, i + 1))
    const extname = path.extname(document.uri.fsPath) // 文件扩展名
    let text = getNotCommentText(document.lineAt(position).text)

    if (
      allowLog(extname, document, position) &&
      arr.some((t) => text.endsWith(t) || text.startsWith(t))
    ) {
      return [snippetCompletion]
    }
    return
  }

  resolveCompletionItem(item: CompletionItem): ProviderResult<CompletionItem> {
    commandTrigger = true

    item.command = {
      command: `print.${this.command}`,
      title: `Print ${this.upperCommand}`
    }
    return item
  }
}

export const allowLog = (
  extname: string,
  document: TextDocument,
  position: Position | number
) => {
  const checkExtReg = /\.(html|vue|svelte)$/ // 需要判断 script 标签的文件

  // 需要判断 script 位置
  if (checkExtReg.test(extname)) {
    const line =
      typeof position === 'number'
        ? position
        : document.lineAt(position).lineNumber // 第一个光标所在行
    const scriptPosition: { start: number; end: number }[] = []
    const startScriptReg = /<script[\s\S]*?>/g // script 开始标签
    const endScriptReg = /<\/script>/g // script 结束标签
    const text = document.getText()

    // script 标签不能嵌套
    let startMatch, endMatch
    while (
      (startMatch = startScriptReg.exec(text)) &&
      (endMatch = endScriptReg.exec(text))
    ) {
      const start = document.positionAt(
        startMatch.index + startMatch[0].length
      ).line // 开始位置
      const end =
        document.positionAt(endMatch.index + endMatch[0].length).line || start // 结束位置

      scriptPosition.push({
        start,
        end
      })
    }

    // 当前行属于 script 标签内部
    if (scriptPosition.some((pos) => pos.start < line && line < pos.end)) {
      return true
    }
    return false
  }
  return true
}
