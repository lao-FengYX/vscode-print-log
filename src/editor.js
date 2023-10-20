/*
 * @Author: WR
 * @Date: 2023-09-24 14:18:49
 * @LastEditTime: 2023-10-20 10:43:15
 * @LastEditors: WR
 * @Description: 操作编辑器相关
 * @FilePath: \print-log\src\editor.js
 */
const vscode = require('vscode')

const { moveTheCursor, getAllConsole, getConfig, getCloseBracketLine } = require('./public')

// 获取用户的所有配置
let config = getConfig()
// 清空console是否格式化
let format = config.get('clean.format')
// 开始填充的字符串
let startAddStr = config.get('output.log')
// 引号方式
let quotationMarks = config.get('output.Select quotation marks')
// 引号数组  0 单引号  1 双引号  2 反引号
const marks = ['Single Quote', 'Double Quotes', 'Backticks']
// 是否移动光标到适当位置
let isMove = config.get('output.move the cursor')

// 监听配置项变化
vscode.workspace.onDidChangeConfiguration(() => {
  // 获取用户的所有配置
  config = getConfig()
  startAddStr = config.get('output.log')
  format = config.get('clean.format')
  quotationMarks = config.get('output.Select quotation marks')
  isMove = config.get('output.move the cursor')
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

    let waitingProcessing = [] // 待处理数组

    lineArr.forEach(line => {
      const currentLine = document.lineAt(line) // 当前行
      const currentLineRange = currentLine.range // 当前行范围
      let currentLineText = currentLine.text.trim() // 去掉空格的当前行的文本

      const indent = currentLine.text.match(/^\s*/)?.[0] || '' // 获取当前行的缩进

      // 判断是否是以当前打印的字符串开始或结束 如果是就清空
      if (currentLineText.startsWith(text)) {
        currentLineText = currentLineText.replace(text, '')
      }
      if (currentLineText.endsWith(text)) {
        currentLineText = currentLineText.slice(0, currentLineText.length - text.length)
      }

      // 开始位置增加的字符串
      if (startAddStr !== '') {
        const index = marks.indexOf(quotationMarks)
        const quote = index === 0 ? "'" : index === 1 ? '"' : '`'
        currentLineText = `${quote}${startAddStr}${quote}, ` + currentLineText
      }

      const replacedText = `console.${text}(${currentLineText})`.replace(/^(.*)$/, `${indent}$1`) // 在替换字符串中添加缩进

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
            selections
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

    const nextLine = document.lineAt(maxLine + 1 >= max ? max - 1 : maxLine + 1)
    let nextLineRange = nextLine.range // 获取移动光标范围

    let preIndent = currentText.match(/^\s*/)?.[0] || '' // 获取当前行缩进

    const objReg = /=\s*{$/g // 如果是对象结尾
    const arrReg = /=\s*\[$/g // 数组结尾
    let insertLine // 插入行
    if (objReg.test(currentText)) {
      const lineNum = getCloseBracketLine(document, maxLine) // 获取结束括号的行号
      insertLine = lineNum ? lineNum + 1 : maxLine + 1
      nextLineRange = document.lineAt(insertLine).range // 更改移动光标范围
    } else if (arrReg.test(currentText)) {
      const lineNum = getCloseBracketLine(document, maxLine, '[') // 获取结束括号的行号
      insertLine = lineNum ? lineNum + 1 : maxLine + 1
      nextLineRange = document.lineAt(insertLine).range // 更改移动光标范围
    } else {
      insertLine = maxLine + 1
    }

    const funcReg = /\((.*)\)\s*(=>\s*)?{$|=>\s*{$/g // 如果是以函数结尾 匹配当前行缩进
    if (funcReg.test(currentText)) {
      preIndent = nextLine.text.match(/^\s*/)?.[0] || '' // 获取下一行缩进

      let leftStr = currentText.trim()?.split('(')[0] || '' // 获取参数左侧的内容
      leftStr = leftStr.replace(/(\.|=)/g, ' ')
      let leftStrArr = leftStr.split(' ').filter(Boolean) // 过滤出真值
      let include = strArr.some(str => leftStrArr.includes(str)) // 左侧内容是否为已选择的内容
      if (include) {
        const lineNum = getCloseBracketLine(document, maxLine) // 获取结束括号的行号
        insertLine = lineNum ? lineNum + 1 : maxLine + 1
        nextLineRange = document.lineAt(insertLine).range // 更改移动光标范围
        preIndent = currentText.match(/^\s*/)?.[0] || '' // 获取当前行缩进
      }
    }

    // 开始位置增加的字符串
    if (startAddStr !== '') {
      const index = marks.indexOf(quotationMarks)
      const quote = index === 0 ? "'" : index === 1 ? '"' : '`'
      strArr.unshift(`${quote}${startAddStr}${quote}`)
    }

    const insertLineText = `${preIndent}console.${text}(${strArr.join(', ')})\n` // 要插入的文本

    activeEditor
      .edit(edit => edit.insert(new vscode.Position(insertLine, 0), insertLineText))
      .then(success => {
        if (success && isMove) {
          // 移动光标
          moveTheCursor({
            activeEditor,
            currentLineRange: nextLineRange,
            text: insertLineText,
            offset: 2
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

  constructor(command) {
    this.command = command
  }

  provideCompletionItems(document, position) {
    this.upperCommand = this.command.slice(0, 1).toUpperCase() + this.command.slice(1)

    // this.text = document.lineAt(position.line).text;

    const snippetCompletion = new vscode.CompletionItem(
      this.command,
      vscode.CompletionItemKind.Method
    )
    snippetCompletion.detail = `快速打印当前行 Print ${this.upperCommand}\n console.${this.command}(lineCode)`
    snippetCompletion.sortText = 0 // 排序

    return [snippetCompletion]
  }

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
