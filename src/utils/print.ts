import path from 'path'
import {
  EndOfLine,
  Position,
  Range,
  Selection,
  TextDocument,
  TextEditor,
  TextEditorRevealType,
  window,
  workspace
} from 'vscode'
import { Extension, findEndLine, getConfig, getNotCommentText } from '.'
import { useCommandTrigger } from './completionItem'
import Logger from './logger'

//#region
// 开始填充的字符串
let startAddStr = getConfig('output.log')
// 引号方式
let quotationMarks = getConfig('output.selectQuotationMarks')
// 是否移动光标到适当位置
let isMove = getConfig('output.moveTheCursor')
// 是否需要分号
let semicolon = getConfig('output.semicolonIsRequired')
// 是否需要文件名
let needFileName = getConfig('output.needFileName')
// 是否需要行号
let needLineNumber = getConfig('output.needLineNumber')
// 是否输出选中文本
let needOutputText = getConfig('output.needSelectedText')
// 获取缩进
let tabSize = getConfig('tabSize', 'editor')

// 监听配置项变化
workspace.onDidChangeConfiguration((e) => {
  if (e.affectsConfiguration(Extension.name)) {
    startAddStr = getConfig('output.log')
    quotationMarks = getConfig('output.selectQuotationMarks')
    isMove = getConfig('output.moveTheCursor')
    semicolon = getConfig('output.semicolonIsRequired')
    needFileName = getConfig('output.needFileName')
    needLineNumber = getConfig('output.needLineNumber')
    needOutputText = getConfig('output.needSelectedText')
  }
  tabSize = getConfig('tabSize', 'editor')
})
//#endregion

enum MarkObj {
  'Single Quote' = "'", //单引号
  'Double Quotes' = '"', //双引号
  'Backticks' = '`' //反引号
}

type WaitingProcessing = {
  currentLineRange: Range
  replaceText: string
  line?: number
}[]

/**
 * 在当前行进行打印
 */
export const currentRowConsoleHandler = (
  editor: TextEditor,
  lineArr: { num: number; text: string }[],
  command: string
) => {
  try {
    const document = editor.document
    let waitingProcessing: WaitingProcessing = []
    const [trigger, setTrigger] = useCommandTrigger()
    const startTime = performance.now()

    lineArr.forEach((lineItem) => {
      const currentLine = document.lineAt(lineItem.num)
      const currentLineRange = currentLine.range
      const indent = currentLine.text.match(/^\s*/)?.[0] || '' // 缩进

      let currentLineText = getNotCommentText(currentLine.text) // 当前行文本

      if (trigger) {
        if (currentLineText.endsWith(command)) {
          currentLineText = currentLineText
            .slice(0, currentLineText.length - command.length)
            .trim()
        } else if (currentLineText.startsWith(command)) {
          currentLineText = currentLineText.slice(command.length).trim()
        }
      }

      if (command === 'log') {
        currentLineText =
          textHandler(document, lineItem.num, lineItem.text) + currentLineText
      }

      let replaceText = `console.${command}(${currentLineText})`.replace(
        /^(.*)$/,
        `${indent}$1`
      )

      semicolon ? (replaceText += ';') : null

      if (lineItem.text === '') {
        waitingProcessing.push({ currentLineRange, replaceText })
      }
    })

    editor
      .edit((editBuilder) => {
        for (const { currentLineRange, replaceText } of waitingProcessing) {
          editBuilder.replace(currentLineRange, replaceText)
        }
      })
      .then((success) => {
        if (success) {
          setTrigger(false)
          const runTime = Math.ceil(performance.now() - startTime)

          Logger.info(`Output Console Time ${runTime}ms`)

          isMove
            ? moveTheCursor(
                editor,
                lineArr.map((i) => i.num)
              )
            : null
        }
      })
  } catch (error) {
    window.showErrorMessage('Output Console Failed ❌')
  }
}

/**
 * 找到结束位置进行打印
 */
export const otherConsoleHandler = (
  editor: TextEditor,
  lineArr: { num: number; text: string }[],
  command: string
) => {
  const document = editor.document
  const lineCount = document.lineCount
  let waitingProcessing: Required<WaitingProcessing[number]>[] = []
  const startTime = performance.now()

  try {
    lineArr.sort((a, b) => a.num - b.num)
    lineArr
      .filter((lineItem) => lineItem.text !== '')
      .forEach((lineItem, index) => {
        if (lineItem.text === '') {
          return
        }
        const currentLine = document.lineAt(lineItem.num)
        const indent = currentLine.text.match(/^\s*/)?.[0] || '' // 缩进

        let currentLineText = getNotCommentText(currentLine.text) // 当前行文本

        const { endLine, padIndent } = loopFind(
          document,
          currentLineText,
          lineItem.num,
          lineItem.text
        )

        let insertLine = endLine + 1 >= lineCount ? lineCount - 1 : endLine + 1
        let insertText = ''
        let needOutputText = ''
        let insertLineRange = document.lineAt(insertLine).range
        if (command === 'log') {
          needOutputText = textHandler(
            document,
            insertLine + index,
            lineItem.text
          )
        }
        insertText = `${indent + padIndent}console.${command}(${
          needOutputText + lineItem.text
        })${document.eol === EndOfLine.CRLF ? '\r\n' : '\n'}`

        waitingProcessing.push({
          currentLineRange: insertLineRange,
          replaceText: insertText,
          line: insertLine
        })
      })

    editor
      .edit((editBuilder) => {
        for (const { line, replaceText } of waitingProcessing) {
          editBuilder.insert(new Position(line, 0), replaceText)
        }
      })
      .then((success) => {
        if (success) {
          const runTime = Math.ceil(performance.now() - startTime)

          Logger.info(`Output Console Time ${runTime}ms`)

          isMove
            ? moveTheCursor(
                editor,
                waitingProcessing.map((i) => i.line),
                true
              )
            : null
        }
      })
  } catch (error) {
    window.showErrorMessage('Output Console Failed ❌')
  }
}

const textHandler = (document: TextDocument, line: number, text: string) => {
  let temp = ''
  const quote: string =
    MarkObj[(quotationMarks as keyof typeof MarkObj) ?? 'Single Quote']

  if (startAddStr) {
    temp += startAddStr + ' '
  }
  if (needFileName) {
    temp += path.basename(document.fileName) + ' '
  }
  if (needLineNumber) {
    temp += `${temp !== '' ? '~ ' : ''}line: ${line + 1} `
  }
  if (needOutputText) {
    temp += text !== '' ? (temp !== '' ? ' ~ ' : '') + text + ' ->' : ''
  }

  temp = temp.trimEnd()
  if (temp !== '') {
    temp = `${quote + temp + quote}, `
  }
  return temp
}

const moveTheCursor = (
  editor: TextEditor,
  selections: (Selection | number)[],
  additional?: boolean
) => {
  const document = editor.document
  const positions: Selection[] = []

  selections.forEach((selection, index) => {
    let num =
      (typeof selection === 'number' ? selection : selection.active.line) +
      (additional ? index : 0)

    const current = document.lineAt(num)
    const currentRange = current.range
    const currentText = current.text.replace(/[\r\n]$/, '')

    const newPosition = currentRange.start.translate(0, currentText.length - 1)
    positions.push(new Selection(newPosition, newPosition))
  })

  editor.selections = positions

  // 移动视口位置
  editor.revealRange(
    editor.selection,
    TextEditorRevealType.InCenterIfOutsideViewport
  )
}

const loopFind = (
  document: TextDocument,
  lineText: string,
  line: number,
  selectText: string,
  padIndent = ''
): { endLine: number; padIndent: string } => {
  const fnReg = /\(.*\)\s*(:.*)?{$|=>\s*{$/
  const objReg = /\{$/
  const arrReg = /\[$/
  const barketReg = /\($/
  const antiReg = /\`$/
  const equalReg = /=$/
  const commaReg = /\,$/
  const dotReg = /^(\?)?\.\S/ // 匹配可选链操作符
  const ternaryReg = /^(\?|:)\s+\S/ // 匹配三元运算符

  let endLine = line

  if (fnReg.test(lineText)) {
    let strArr = lineText.split('(')
    // 如果选择的是函数名
    if (strArr[0].includes(selectText)) {
      endLine = findEndLine(document, line, { start: '\\{', end: '\\}' })
    } else {
      // 是参数
      endLine = line
      padIndent += ''.padStart(tabSize ? tabSize : 0, ' ')
    }
  } else if (arrReg.test(lineText)) {
    endLine = findEndLine(document, line, { start: '\\[', end: '\\]' })
  } else if (objReg.test(lineText)) {
    endLine = findEndLine(document, line, { start: '\\{', end: '\\}' })
  } else if (barketReg.test(lineText)) {
    endLine = findEndLine(document, line, { start: '\\(', end: '\\)' })
  } else if (antiReg.test(lineText)) {
    endLine = findEndLine(
      document,
      line,
      { start: '`', end: '`' },
      (start) => start % 2 === 0
    )
  } else if (equalReg.test(lineText)) {
    const nextLine = line + 1
    const nextLineText = getNotCommentText(document.lineAt(nextLine).text)
    const res = loopFind(
      document,
      nextLineText,
      nextLine,
      selectText,
      padIndent
    )

    const resEndLineText = getNotCommentText(
      document.lineAt(res.endLine + 1).text
    )
    if (!dotReg.test(resEndLineText) || !ternaryReg.test(resEndLineText)) {
      return res
    }
    return loopFind(
      document,
      resEndLineText,
      res.endLine + 1,
      selectText,
      padIndent
    )
  } else if (
    commaReg.test(lineText) ||
    commaReg.test(getNotCommentText(document.lineAt(line - 1).text))
  ) {
    // 此处向上查找  当前选择的文本是函数参数、对象、变量声明
  }

  // 如果下一行是三元或者可选链运算符  再次进行查找
  const nextLine = endLine + 1
  const nextLineText = getNotCommentText(document.lineAt(nextLine).text)
  if (dotReg.test(nextLineText) || ternaryReg.test(nextLineText)) {
    return loopFind(document, nextLineText, nextLine, selectText, padIndent)
  }

  return { endLine, padIndent }
}
