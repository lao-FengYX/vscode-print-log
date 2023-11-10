const vscode = require('vscode')

const { getConfig, getAllConsole } = require('./public')

// 获取用户的所有配置
let config = getConfig()
// 清空console是否格式化
let format = config.get('clean.format')
// 监听配置项变化
vscode.workspace.onDidChangeConfiguration(() => {
  config = getConfig()
  format = config.get('clean.format')
})

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
  registerRemoveAllConsole
}
