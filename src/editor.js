/*
 * @Author: WR
 * @Date: 2023-09-24 14:18:49
 * @LastEditTime: 2023-10-13 11:11:20
 * @LastEditors: WR
 * @Description:
 * @FilePath: \helloworld\src\editor.js
 */
const vscode = require('vscode')

const { moveTheCursor } = require('./public')

// 获取用户的所有配置
const config = vscode.workspace.getConfiguration('print-log')
// 开始填充的字符串
const startAddStr = config.get('output.log')

/**
 * @author: WR
 * @Date: 2023-09-24 14:21:12
 * @description: 打印当前行内容
 * @param {vscode.TextEditor} activeEditor
 * @param {?String} text
 * @return {*}
 */
const consoleHandle = (activeEditor, text = 'log') => {
  try {
    const selection = activeEditor.selection
    const currentLine = activeEditor.document.lineAt(selection.active.line) // 当前行
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
      currentLineText = `'${startAddStr}',` + currentLineText
    }

    const replacedText = `console.${text}(${currentLineText})`.replace(/^(.*)$/, `${indent}$1`) // 在替换字符串中添加缩进

    activeEditor
      .edit(edit => edit.replace(currentLineRange, replacedText))
      .then(success => {
        if (success) {
          // 移动光标
          moveTheCursor({
            activeEditor,
            currentLineRange,
            text: replacedText
          })
        }
      })

    // vscode.window.showInformationMessage(`当前行内容为: ${currentLine.text}`)
  } catch (error) {
    vscode.window.showErrorMessage(error)
  }
}

/**
 * @author: WR
 * @Date: 2023-10-11 18:11:17
 * @description: 打印插入选择的内容
 * @param {vscode.TextEditor} activeEditor
 * @param {?String} text
 * @return {*}
 */
const selectHandle = (activeEditor, text = 'log') => {
  const selections = activeEditor.selections
  let strArr = [] // 获取所有选择的内容
  let lineArr = [] // 获取行号
  selections.forEach(selection => {
    const words = activeEditor.document.getText(selection)
    lineArr.push(selection.active.line)
    if (words !== '') {
      strArr.push(words)
    }
  })

  // 没有选择的内容直接 return
  if (!strArr.length) return

  try {
    const maxLine = Math.max(...lineArr) + 1
    const maxLineCount = activeEditor.document.lineCount // 当前编辑器最大行数

    const currentLineRange = activeEditor.document.lineAt(
      maxLine >= maxLineCount ? maxLine - 1 : maxLine
    ).range // 获取范围

    const preIndent = activeEditor.document.lineAt(maxLine - 1)?.text.match(/^\s*/)?.[0] || '' // 获取当前行的缩进

    // 开始位置增加的字符串
    if (startAddStr !== '') {
      strArr.unshift(`'${startAddStr}'`)
    }

    const nextLineText = `${preIndent}console.${text}(${strArr.join(',')})\n` // 下一行要插入的文本

    activeEditor
      .edit(edit => edit.insert(new vscode.Position(maxLine, 0), nextLineText))
      .then(success => {
        if (success) {
          // 移动光标
          moveTheCursor({
            activeEditor,
            currentLineRange,
            text: nextLineText,
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
    // console.log(document, position,this.text)

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
 * @Date: 2023-10-12 08:53:59
 * @description: 获取所有console
 * @param {vscode.TextEditor} editor
 * @return {*}
 */
const getAllConsole = editor => {
  const document = editor.document
  const documentText = document.getText()

  let arr = []
  // 匹配所有console以及里面可能会包含多个()的情况
  let reg =
    /((window|global|globalThis)\.)?console\.(log|debug|info|warn|error|assert|dir|dirxml|trace|group|groupEnd|time|timeEnd|profile|profileEnd|count)\(([\(|\)]*.*)\);?/g

  let match
  while ((match = reg.exec(documentText))) {
    // 匹配的范围
    let matchRange = new vscode.Range(
      document.positionAt(match.index),
      document.positionAt(match.index + match[0].length)
    )
    // 如果不是空
    if (!matchRange.isEmpty) arr.push(matchRange)
  }
  return arr
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
        if (config.get('clean.format')) {
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
