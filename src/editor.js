/*
 * @Author: WR
 * @Date: 2023-09-24 14:18:49
 * @LastEditTime: 2023-11-03 12:11:44
 * @LastEditors: WR
 * @Description: 操作编辑器相关
 * @FilePath: \print-log\src\editor.js
 */
const vscode = require('vscode')
const path = require('path')

const {
  moveTheCursor,
  getAllConsole,
  getConfig,
  getCloseBracketLine,
  getNotContainLineNum,
  getLeftIncludeLineNum,
  confirmInclude,
  findBackticksLineNum,
  textHandle
} = require('./public')

// 获取用户的所有配置
let config = getConfig()
// 清空console是否格式化
let format = config.get('clean.format')
// 开始填充的字符串
let startAddStr = config.get('output.log')
// 引号方式
let quotationMarks = config.get('output.select quotation marks')
// 引号数组  0 单引号  1 双引号  2 反引号
const marks = ['Single Quote', 'Double Quotes', 'Backticks']
// 是否移动光标到适当位置
let isMove = config.get('output.move the cursor')
// 是否需要分号
let semicolon = config.get('output.semicolon is required')
// 是否需要文件名
let needFileName = config.get('output.needFileName')
// 是否需要行号
let needLineNumber = config.get('output.needLineNumber')

// 监听配置项变化
vscode.workspace.onDidChangeConfiguration(() => {
  // 获取用户的所有配置
  config = getConfig()
  startAddStr = config.get('output.log')
  format = config.get('clean.format')
  quotationMarks = config.get('output.select quotation marks')
  isMove = config.get('output.move the cursor')
  semicolon = config.get('output.semicolon is required')
  needFileName = config.get('output.needFileName')
  needLineNumber = config.get('output.needLineNumber')
})

/**
 * @author: WR
 * @Date: 2023-09-24 14:21:12
 * @description: 打印当前行内容
 * @param {vscode.TextEditor} activeEditor
 * @param {?String} text 指令
 * @param {Number[]} lineArr 光标所在行
 * @return {*}
 */
const consoleHandle = (activeEditor, text = 'log', lineArr) => {
  try {
    const selections = activeEditor.selections
    const document = activeEditor.document
    const fileName = path.basename(document.uri.fsPath)

    let waitingProcessing = [] // 待处理数组

    lineArr.forEach(line => {
      const currentLine = document.lineAt(line) // 当前行
      const currentLineRange = currentLine.range // 当前行范围
      let currentLineText = currentLine.text.trim() // 去掉空格的当前行的文本

      const indent = currentLine.text.match(/^\s*/)?.[0] || '' // 获取当前行的缩进
      const index = marks.indexOf(quotationMarks)
      const quote = index === 0 ? "'" : index === 1 ? '"' : '`'

      // 判断是否是以当前打印的字符串开始或结束 如果是就清空
      if (currentLineText.startsWith(text)) {
        currentLineText = currentLineText.replace(text, '')
      }
      if (currentLineText.endsWith(text)) {
        currentLineText = currentLineText.slice(0, currentLineText.length - text.length)
      }

      // 开始位置增加的字符串
      let temp = textHandle({
        startAddStr,
        needFileName,
        needLineNumber,
        fileName,
        quote,
        line
      })
      currentLineText = temp + currentLineText

      let replacedText = `console.${text}(${currentLineText})`.replace(/^(.*)$/, `${indent}$1`) // 在替换字符串中添加缩进

      semicolon ? (replacedText += ';') : null // 需要分号

      waitingProcessing.push({ currentLineRange, replacedText })
    })

    // 对光标位置所在行进行替换
    activeEditor
      .edit(edit => {
        for (const { currentLineRange, replacedText } of waitingProcessing) {
          edit.replace(currentLineRange, replacedText)
        }
      })
      .then(success => {
        if (success && isMove) {
          moveTheCursor({
            activeEditor,
            selections,
            offset: semicolon ? 2 : 1
          })
        }
      })
  } catch (error) {
    vscode.window.showErrorMessage(error)
  }
}

/**
 * @author: WR
 * @Date: 2023-10-11 18:11:17
 * @description: 打印选择的内容
 * @param {vscode.TextEditor} activeEditor
 * @param {?String} text 指令
 * @param {String[]} strArr 选择的内容
 * @param {Number[]} lineArr 光标所在行
 * @return {*}
 */
const selectHandle = (activeEditor, text = 'log', strArr, lineArr) => {
  // 没有选择的内容直接 return
  if (!strArr.length) return

  try {
    const document = activeEditor.document
    const max = document.lineCount
    const maxLine = Math.max(...lineArr)
    const currentLine = document.lineAt(maxLine)
    const currentText = currentLine.text?.trimEnd() // 获取文本
    const fileName = path.basename(document.uri.fsPath)

    let nextLine = document.lineAt(maxLine + 1 >= max ? max - 1 : maxLine + 1)
    let nextLineRange = nextLine.range // 获取移动光标范围
    let insertLine // 插入行
    let preIndent = currentText.match(/^\s*/)?.[0] || '' // 获取当前行缩进

    const objReg = /=\s*{$/g // 如果是对象结尾
    const arrReg = /=\s*\[$/g // 数组结尾

    let objResult = objReg.test(currentText)
    let arrResult = arrReg.test(currentText)

    // 精简一下
    let lineNum

    if (objResult || arrResult) {
      lineNum = getCloseBracketLine(document, maxLine, objResult ? '{' : '[') // 获取结束括号的行号
    } else if (currentText.includes('`')) {
      lineNum = findBackticksLineNum(document, maxLine)
    }

    const funcReg = /\((.*)\)\s*(=>\s*)?{$|=>\s*{$/g // 如果是以函数结尾 匹配当前行缩进
    const bracketReg = /\(.*$/g // 如果是括号结尾的

    let funcResult = funcReg.test(currentText)
    let braketResult = bracketReg.test(currentText)
    let judgment = false // 是否需要进一步判断缩进
    let judgmentNum = 0 // 0是包含左侧内容 1是不包含

    if (funcResult) {
      preIndent = nextLine.text.match(/^\s*/)?.[0] || '' // 获取下一行缩进
      let include = confirmInclude(currentText, strArr) // 是否包含左侧内容

      if (include) {
        lineNum = getCloseBracketLine(document, maxLine) // 获取结束括号的行号
        preIndent = currentText.match(/^\s*/)?.[0] || '' // 获取当前行缩进
      }
    } else if (braketResult) {
      judgment = true // 需要进一步判断缩进
      let include = confirmInclude(currentText, strArr) // 是否包含左侧内容
      lineNum = getCloseBracketLine(document, maxLine, '(') // 获取结束括号的行号
      if (include) {
        lineNum = getLeftIncludeLineNum(document, lineNum) // 判断Promise返回
        judgmentNum = 0
      } else {
        lineNum = getNotContainLineNum(document, lineNum) // 判断Promise返回
        judgmentNum = 1
      }
    }

    insertLine = lineNum ? lineNum + 1 : maxLine + 1
    nextLine = document.lineAt(insertLine)
    nextLineRange = nextLine.range // 更改移动光标范围
    if (!funcResult && judgment) {
      preIndent =
        (judgmentNum === 0 ? currentText : document.lineAt(insertLine).text).match(/^\s*/)?.[0] ||
        '' // 获取缩进
    }

    const index = marks.indexOf(quotationMarks)
    const quote = index === 0 ? "'" : index === 1 ? '"' : '`'
    // 开始位置增加的字符串
    let temp = textHandle({
      startAddStr,
      needFileName,
      needLineNumber,
      fileName,
      quote,
      line: insertLine
    })

    let insertLineText = `${preIndent}console.${text}(${temp + strArr.join(', ')})` // 要插入的文本

    semicolon ? (insertLineText += ';') : null // 需要分号

    insertLineText += '\n' // 换行

    activeEditor
      .edit(edit => edit.insert(new vscode.Position(insertLine, 0), insertLineText))
      .then(success => {
        if (success && isMove) {
          // 移动光标
          moveTheCursor({
            activeEditor,
            currentLineRange: nextLineRange,
            text: insertLineText,
            offset: semicolon ? 3 : 2
          })
          strArr = lineArr = []
        }
      })
  } catch (error) {
    vscode.window.showErrorMessage(error)
  }
}

/**
 * @author: WR
 * @Date: 2023-10-10 12:03:45
 * @description: 绑定自定义触发的代码片段
 * @return {*}
 */
class AutoCompletionItemProvider {
  // text = '' // 当前行的内容
  command = '' // 指令字符
  upperCommand = '' // 开始字母大写的指令字符
  language = '' // 当前vscode语言

  constructor(command) {
    this.command = command
    this.language = vscode.env.language.toLowerCase()
  }

  /**
   * @author: WR
   * @Date: 2023-11-03 11:51:51
   * @description:
   * @param {vscode.TextDocument} document
   * @param {vscode.Position} position
   * @return {vscode.CompletionItem[]}
   */
  provideCompletionItems(document, position) {
    this.upperCommand = this.command.slice(0, 1).toUpperCase() + this.command.slice(1)

    // this.text = document.lineAt(position.line).text;

    const snippetCompletion = new vscode.CompletionItem(
      this.command,
      vscode.CompletionItemKind.Method
    )
    snippetCompletion.detail = `${
      this.language === 'zh-cn' ? '快速打印当前行' : 'Quickly print the current line'
    } (Print ${this.upperCommand})\n console.${this.command}(lineCode)`
    snippetCompletion.sortText = 0 // 排序

    return [snippetCompletion]
  }

  /**
   * @author: WR
   * @Date: 2023-11-03 11:55:22
   * @description:
   * @param {vscode.CompletionItem} item
   * @return {vscode.CompletionItem}
   */
  resolveCompletionItem(item) {
    // 绑定触发指令
    item.command = {
      command: `print.${this.command}`,
      title: `Print ${this.upperCommand}`
    }
    return item
  }
}

/**
 * @author: WR
 * @Date: 2023-10-12 09:19:30
 * @description: 注册删除所有console的指令
 * @param {vscode.ExtensionContext} context
 * @return {*}
 */
const registerRemoveAllConsole = context => {
  let disposable = vscode.commands.registerCommand('print.cleanConsole', () => {
    const editor = vscode.window.activeTextEditor
    if (!editor) return

    try {
      const document = editor.document
      let workspaceEdit = new vscode.WorkspaceEdit()

      const allConsole = getAllConsole(editor)
      allConsole.forEach(console => {
        // 删除console
        workspaceEdit.delete(document.uri, console)
      })

      vscode.workspace.applyEdit(workspaceEdit).then(() => {
        if (format) {
          // 触发vscode的格式化
          vscode.commands.executeCommand('editor.action.formatDocument')
        }
        // 消息提示
        vscode.window.showInformationMessage(`clear ${allConsole.length} console ✅`)
      })
    } catch (error) {
      vscode.window.showErrorMessage(`clear console error ❌`)
    }
  })

  context.subscriptions.push(disposable)
}

module.exports = {
  consoleHandle,
  selectHandle,
  registerRemoveAllConsole,
  AutoCompletionItemProvider
}
