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

type WaitingInsertProcessing = {
  insertLine: number
  insertText: string
}[]

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
  let waitingInsertProcessing: WaitingInsertProcessing = []
  const startTime = performance.now()

  try {
    lineArr.sort((a, b) => a.num - b.num)
    lineArr.forEach((lineItem, index) => {
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

      waitingInsertProcessing.push({
        insertText,
        insertLine
      })
    })

    editor
      .edit((editBuilder) => {
        for (const { insertLine, insertText } of waitingInsertProcessing) {
          editBuilder.insert(new Position(insertLine, 0), insertText)
        }
      })
      .then((success) => {
        if (success) {
          const runTime = Math.ceil(performance.now() - startTime)

          Logger.info(`Output Console Time ${runTime}ms`)

          isMove
            ? moveTheCursor(
                editor,
                waitingInsertProcessing.map((i) => i.insertLine),
                true
              )
            : null
        }
      })
  } catch (error) {
    window.showErrorMessage('Output Console Failed ❌')
  }
}

/**
 * 处理输出文本
 * @param line 需要输出的行号
 * @param text 需要输出的文本
 */
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

/**
 * 查找结束位置
 * @param lineText 当前行文本
 * @param line 当前行
 * @param selectText 选择的文本
 * @param padIndent 填充缩进
 */
const loopFind = (
  document: TextDocument,
  lineText: string,
  line: number,
  selectText: string,
  padIndent = ''
): { endLine: number; padIndent: string } => {
  const fnReg = /\)\s*(:.*)?{$|=>\s*{$/
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
    // 如果选择的是参数  不用继续往下找
    if (strArr.slice(1).some((t) => t.includes(selectText))) {
      endLine = line
      padIndent += ''.padStart(tabSize ? tabSize : 0, ' ')
      return { endLine, padIndent }
    } else {
      endLine = findEndLine(document, line, { start: '\\{', end: '\\}' })
    }
  } else if (arrReg.test(lineText)) {
    endLine = findEndLine(document, line, { start: '\\[', end: '\\]' })
  } else if (objReg.test(lineText)) {
    endLine = findEndLine(document, line, { start: '\\{', end: '\\}' })
  } else if (barketReg.test(lineText)) {
    endLine = findEndLine(document, line, { start: '\\(', end: '\\)' })

    // 判断结束行是否是函数
    const endLineNextText = getNotCommentText(document.lineAt(endLine).text)
    if (fnReg.test(endLineNextText)) {
      endLine = findEndLine(document, endLine, { start: '\\{', end: '\\}' })
    }
  } else if (antiReg.test(lineText)) {
    endLine = findEndLine(
      document,
      line,
      { start: '`', end: '`' },
      (start) => start % 2 === 0
    )
  } else if (equalReg.test(lineText)) {
    const nextLineText =
      line + 1 < document.lineCount
        ? getNotCommentText(document.lineAt(line + 1).text)
        : undefined

    if (nextLineText) {
      return loopFind(document, nextLineText, line + 1, selectText, padIndent)
    }
  } else if (
    line - 1 >= 0 &&
    (commaReg.test(lineText) ||
      commaReg.test(getNotCommentText(document.lineAt(line - 1).text)))
  ) {
    // 此处向上查找  当前选择的文本是函数参数、对象、变量声明
    endLine = findCommaLine(document, line)
  }

  // 如果下一行是三元或者可选链运算符  再次进行查找
  const nextLineText =
    endLine + 1 < document.lineCount
      ? getNotCommentText(document.lineAt(endLine + 1).text)
      : ''
  if (dotReg.test(nextLineText) || ternaryReg.test(nextLineText)) {
    return loopFind(document, nextLineText, endLine + 1, selectText, padIndent)
  }

  return { endLine, padIndent }
}

/**
 * 查找以逗号结尾 应该输出的位置
 * @param start 查找开始行
 */
const findCommaLine = (document: TextDocument, start: number) => {
  let temp = start
  let isVarFlag = false
  const varReg = /^(let|const|var)\s+/
  const commaReg = /\,$/
  const fnReg = /function\s+.*\((.*\{)?$|=.*\(/

  while (start >= 0) {
    const text = getNotCommentText(document.lineAt(start).text)
    const beforeText = getNotCommentText(document.lineAt(start - 1).text)

    if (!isVarFlag && (varReg.test(text) || varReg.test(beforeText))) {
      isVarFlag = true
      break
    }

    if (fnReg.test(text)) {
      return findEndLine(document, start, { start: '\\(', end: '\\)' })
    }

    start--
  }

  start = temp
  while (isVarFlag && start < document.lineCount) {
    const text = getNotCommentText(document.lineAt(start).text)
    const nextText = getNotCommentText(document.lineAt(start + 1).text)
    if (!commaReg.test(text) && !commaReg.test(nextText)) {
      return start
    }
    start++
  }

  return temp
}

/**
 * 移动光标
 * @param selections 待移动光标
 * @param additional 需要计算行号(找范围)
 */
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
