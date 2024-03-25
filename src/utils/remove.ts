import {
  commands,
  workspace,
  window,
  Range,
  Position,
  TextDocument
} from 'vscode'
import { Extension, getConfig, getTextEditor } from '.'
import Logger from './logger'

let format = getConfig('clear.format')
let removeEmptyLine = getConfig('clear.deleteCommentsAndEmptyLine')

workspace.onDidChangeConfiguration((e) => {
  if (e.affectsConfiguration(Extension.name)) {
    format = getConfig('clear.format')
    removeEmptyLine = getConfig('clear.deleteCommentsAndEmptyLine')
  }
})

/**
 * 返回console的范围
 */
const findConsoleRange = (document: TextDocument, text: string) => {
  const consoleReg =
    /((window|global|globalThis)\.)?console\.(log|debug|info|warn|error|assert|clear|dir|dirxml|trace|table|group|groupCollapsed|groupEnd|time|timeEnd|timeLog|timeStamp|profile|profileEnd|count|countReset)/g

  // 正则内的括号不进行记录
  const reg = /\/.+\//g
  text = text.replace(reg, (s) => ''.padEnd(s.length, ' '))

  let result: Range[] = []
  let match

  while ((match = consoleReg.exec(text))) {
    const sourceLength = match[0].length
    const start = sourceLength + match.index
    let end = start
    let count = 0

    if (text.slice(start, start + 1) !== '(') {
      continue
    }

    while (end < text.length) {
      let str = text[end]
      if (str === '(') {
        count++
      } else if (str === ')') {
        count--
      }

      if (count === 0) {
        break
      }
      end++
    }

    if (text[end + 1] === ';') {
      end++
    }

    const newRange = new Range(
      document.positionAt(match.index),
      document.positionAt(end + 1)
    )
    // 检查范围是否重叠
    if (!result.some((range) => range.intersection(newRange))) {
      result.push(newRange)
    }
  }

  return result
}

/**
 * 删除console
 */
export const removeAllConsole = () =>
  commands.registerCommand('print.cleanConsole', () => {
    const editor = getTextEditor()
    if (!editor) {
      return
    }
    const document = editor.document

    let text = document.getText()

    try {
      const timeStamp = performance.now()
      const rangeList = findConsoleRange(document, text)

      editor
        .edit((builder) => {
          rangeList.forEach((range) => {
            builder.replace(range, '')
          })
        })
        .then((success) => {
          if (success) {
            Logger.info(
              `remove console time ${Math.ceil(
                performance.now() - timeStamp
              )}ms`
            )

            window.showInformationMessage(
              `remove ${rangeList.length} console ✅`
            )

            format // 触发vscode的格式化
              ? commands.executeCommand('editor.action.formatDocument')
              : null
          }
        })
    } catch (error) {
      window.showErrorMessage(`remove console error ❌`)
    }
  })

/**
 * 删除注释
 */
export const removeAllComment = () =>
  commands.registerCommand('print.removeAllComment', () => {
    const editor = getTextEditor()
    if (!editor) {
      return
    }

    const document = editor.document
    const commentReg = /\/\*[\s\S]*?\*\/|\/\/.*|<!--[\s\S]*?-->/g // 匹配注释
    let text = document.getText()
    let count = 0

    try {
      const timeStamp = performance.now()
      text = text.replace(commentReg, () => {
        count++
        return ''
      })

      editor
        .edit((builder) => {
          const documentStart = new Position(0, 0)
          const documentEnd = document.lineAt(document.lineCount - 1).range.end
          builder.replace(new Range(documentStart, documentEnd), text)
        })
        .then((success) => {
          if (success) {
            Logger.info(
              `remove comments time ${Math.ceil(
                performance.now() - timeStamp
              )}ms`
            )

            window.showInformationMessage(`remove ${count} comments ✅`)

            format
              ? commands.executeCommand('editor.action.formatDocument')
              : null
            removeEmptyLine
              ? commands.executeCommand('print.removeAllEmptyLine')
              : null
          }
        })
    } catch (error) {
      window.showErrorMessage(`remove comment error ❌`)
    }
  })

/**
 * 删除空行
 */
export const removeAllEmptyLine = () =>
  commands.registerCommand('print.removeAllEmptyLine', () => {
    const editor = getTextEditor()
    if (!editor) {
      return
    }

    const document = editor.document
    const resourceLength = document.lineCount
    const emptyReg = /^\s*[\r\n]/gm
    let text = document.getText()
    try {
      const timeStamp = performance.now()
      text = text.replace(emptyReg, '')

      editor
        .edit((builder) => {
          const documentStart = new Position(0, 0)
          const documentEnd = document.lineAt(resourceLength - 1).range.end
          builder.replace(new Range(documentStart, documentEnd), text)
        })
        .then((success) => {
          if (success) {
            Logger.info(
              `remove emptyLine time ${Math.ceil(
                performance.now() - timeStamp
              )}ms`
            )

            window.showInformationMessage(
              `remove ${resourceLength - document.lineCount} emptyLine ✅`
            )
          }
        })
    } catch (error) {
      window.showErrorMessage(`remove emptyLine error ❌`)
    }
  })
