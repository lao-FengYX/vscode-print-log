/*
 * @Author: WR
 * @Date: 2023-09-24 13:19:00
 * @LastEditTime: 2023-11-10 17:40:27
 * @LastEditors: WR
 * @Description: 入口
 * @FilePath: \print-log\src\index.js
 */
const vscode = require('vscode')

const {
  consoleHandle,
  selectHandle,
  separateLineHandle,
  AutoCompletionItemProvider
} = require('./editor')
const { registerRemoveAllConsole } = require('./remove')

const { getConfig } = require('./public')

let language = ['html', 'javascript', 'typescript', 'javascriptreact', 'typescriptreact', 'vue']

/**
 * @author: WR
 * @Date: 2023-10-14 10:06:00
 * @description: 激活插件入口
 * @param {vscode.ExtensionContext} context
 * @return {*}
 */
function activate(context) {
  const arr = ['log', 'table', 'dir', 'warn', 'error']
  arr.forEach(command => {
    // 注册指令
    let disposable = vscode.commands.registerCommand(`print.${command}`, function () {
      // 当前激活的编辑器
      const activeEditor = vscode.window.activeTextEditor
      if (!activeEditor) {
        return
      }

      // 打印入口
      handlePrint(activeEditor, command)
    })

    context.subscriptions.push(disposable)

    context.subscriptions.push(
      vscode.languages.registerCompletionItemProvider(
        language,
        new AutoCompletionItemProvider(command)
      )
    )
  })

  // 注册清空所有console的指令
  registerRemoveAllConsole(context)
}

// 获取用户的所有配置
let config = getConfig()
// 打印内容是否需要单独占一行
let separateLine = config.get('output.separate line')
// 监听配置项变化
vscode.workspace.onDidChangeConfiguration(() => {
  config = getConfig()
  separateLine = config.get('output.separate line')
})

/**
 * @author: WR
 * @Date: 2023-10-17 13:59:01
 * @description: 打印入口
 * @param {vscode.TextEditor} activeEditor
 * @param {String} command
 * @return {*}
 */
function handlePrint(activeEditor, command) {
  const selections = activeEditor.selections
  const document = activeEditor.document
  let strArr = [] // 获取所有选择的内容
  let lineArr = [] // 获取行号
  selections.forEach(selection => {
    const words = document.getText(selection)
    lineArr.push({ num: selection.active.line, text: words })
    if (words !== '') {
      strArr.push(words)
    }
  })
  // 有选中的文本
  if (strArr.length) {
    ;(separateLine ? separateLineHandle : selectHandle)?.(activeEditor, command, strArr, lineArr)
  } else {
    // 没有选中的文本
    consoleHandle(activeEditor, command, lineArr)
  }
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate
}
