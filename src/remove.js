const vscode = require('vscode')

const { getConfig, getAllConsole } = require('./public')

// 获取用户的所有配置
let config = getConfig()
// 清空console是否格式化
let format = config.get('clean.format')
// 删除所有注释后删除空行
let removeEmptyLine = config.get('clean.deleteCommentsAndEmptyLine')
// 监听配置项变化
vscode.workspace.onDidChangeConfiguration(() => {
  config = getConfig()
  format = config.get('clean.format')
  removeEmptyLine = config.get('clean.deleteCommentsAndEmptyLine')
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

/**
 * @author: WR
 * @Date: 2023-11-11 19:37:52
 * @description: 删除所有注释
 * @param {vscode.ExtensionContext} context
 * @return {*}
 */
const registerRemoveAllComment = context => {
  let disposable = vscode.commands.registerCommand('print.removeAllComment', () => {
    const editor = vscode.window.activeTextEditor
    if (!editor) return

    try {
      const document = editor.document
      const allCommentReg = /\/\*[\s\S]*?\*\/|\/\/.*|<!--[\s\S]*?-->/g // 匹配注释
      const text = document.getText() // 文本
      let waitArr = []

      let match
      while ((match = allCommentReg.exec(text))) {
        let range = new vscode.Range(
          document.positionAt(match.index),
          document.positionAt(match.index + match[0].length)
        )
        if (!range.isEmpty) waitArr.push(range)
      }

      editor
        .edit(edit => {
          waitArr.forEach(range => {
            edit.delete(range)
          })
        })
        .then(success => {
          if (success) {
            // 触发vscode的格式化
            format ? vscode.commands.executeCommand('editor.action.formatDocument') : null
            removeEmptyLine ? vscode.commands.executeCommand('print.removeAllEmptyLine') : null
          }
          // 消息提示
          vscode.window.showInformationMessage(`remove ${waitArr.length} comments ✅`)
        })
    } catch (error) {
      vscode.window.showErrorMessage(`remove comment error ❌`)
    }
  })
  context.subscriptions.push(disposable)
}

/**
 * @author: WR
 * @Date: 2023-11-11 20:23:08
 * @description: 删除所有空行
 * @param {vscode.ExtensionContext} context
 * @return {*}
 */
const registerRemoveAllEmptyLine = context => {
  let disposable = vscode.commands.registerCommand('print.removeAllEmptyLine', () => {
    const editor = vscode.window.activeTextEditor
    if (!editor) return
    try {
      const document = editor.document
      const resourceLength = document.lineCount
      let text = document.getText()
      text = text.replace(/^\s*[\r\n]/gm, '') // 使用正则表达式替换空行
      editor
        .edit(editor => {
          const documentStart = new vscode.Position(0, 0)
          const documentEnd = document.lineAt(document.lineCount - 1).range.end
          editor.replace(new vscode.Range(documentStart, documentEnd), text)
        })
        .then(success => {
          if (success) {
            vscode.window.showInformationMessage(
              `remove ${resourceLength - document.lineCount} emptyLine success ✅`
            )
          }
        })
    } catch (error) {
      vscode.window.showErrorMessage(`remove emptyLine error ❌`)
    }
  })
  context.subscriptions.push(disposable)
}

module.exports = {
  registerRemoveAllConsole,
  registerRemoveAllComment,
  registerRemoveAllEmptyLine
}
