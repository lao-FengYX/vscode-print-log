/*
 * @Author: WR
 * @Date: 2023-09-24 13:19:00
 * @LastEditTime: 2023-10-12 09:19:16
 * @LastEditors: WR
 * @Description: 入口
 * @FilePath: \helloworld\src\index.js
 */
const vscode = require('vscode')

const {
  consoleHandle,
  selectHandle,
  registerRemoveAllConsole,
  AutoCompletionItemProvider
} = require('./editor')

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

      const selection = activeEditor.selection
      const words = activeEditor.document.getText(selection)
      // 有选中的文本
      if (words !== '') {
        selectHandle(activeEditor, command)
      } else {
        // 没有选中的文本
        consoleHandle(activeEditor, command)
      }
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

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate
}
