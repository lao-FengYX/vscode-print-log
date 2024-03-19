import { workspace, TextEditor, window, TextDocument, Range } from 'vscode'
import { Extension, getConfig, getNotCommentText } from '.'
import { getCommandTrigger } from './completionItem'
import path from 'path'
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

type WaitingProcessing = { currentLineRange: Range; replaceText: string }[]

export const consoleHandler = (
  editor: TextEditor,
  lineArr: { num: number; text: string }[],
  command: string
) => {
  try {
    const document = editor.document
    let waitingProcessing: WaitingProcessing = []
    const startTime = performance.now()

    lineArr.forEach((lineItem) => {
      const currentLine = document.lineAt(lineItem.num) // 选择的行
      const currentLineRange = currentLine.range // 选择行的范围
      const indent = currentLine.text.match(/^\s*/)?.[0] || '' // 缩进

      let currentLineText = getNotCommentText(currentLine.text).trim() // 当前行文本

      if (getCommandTrigger()) {
        if (currentLineText.endsWith(command)) {
          currentLineText = currentLineText
            .slice(0, currentLineText.length - command.length)
            .trim()
        } else if (currentLineText.startsWith(command)) {
          currentLineText = currentLineText.slice(command.length).trim()
        }
      }

      currentLineText =
        textHandler(document, lineItem.num, lineItem.text) + currentLineText

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
        if (success && isMove) {
          const runTime = Math.ceil(performance.now() - startTime)
          Logger.clear()
          Logger.show()
          Logger.info(`Output Console Time ${runTime}ms`)
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
    temp += text !== '' ? text + ' ->' : ''
  }

  temp = temp.trimEnd()
  if (temp !== '') {
    temp = `${quote + temp + quote}, `
  }
  return temp
}
