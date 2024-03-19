import * as vscode from 'vscode'
import { Extension, getConfig, getTextEditor } from '.'
import Logger from './logger'

let format = getConfig('clear.format')
let removeEmptyLine = getConfig('clear.deleteCommentsAndEmptyLine')

vscode.workspace.onDidChangeConfiguration((e) => {
  if (e.affectsConfiguration(Extension.name)) {
    format = getConfig('clear.format')
    removeEmptyLine = getConfig('clear.deleteCommentsAndEmptyLine')
  }
})

/**
 * 删除console
 */
export const removeAllConsole = () =>
  vscode.commands.registerCommand('print.cleanConsole', () => {
    const editor = getTextEditor()
    if (!editor) {
      return
    }
    const document = editor.document
    const resourceLength = document.lineCount

    const consoleReg =
      /((window|global|globalThis)\.)?console\.(log|debug|info|warn|error|assert|clear|dir|dirxml|trace|table|group|groupCollapsed|groupEnd|time|timeEnd|timeLog|timeStamp|profile|profileEnd|count|countReset)\((.*)\);?/g
    let text = document.getText()
    let count = 0

    try {
      const timeStamp = performance.now()
      text = text.replace(consoleReg, () => {
        count++
        return ''
      })
      editor
        .edit((builder) => {
          const documentStart = new vscode.Position(0, 0)
          const documentEnd = document.lineAt(resourceLength - 1).range.end
          builder.replace(new vscode.Range(documentStart, documentEnd), text)
        })
        .then((success) => {
          if (success) {
            Logger.info(
              `remove console time ${Math.ceil(performance.now() - timeStamp)}ms`
            )

            vscode.window.showInformationMessage(`remove ${count} console ✅`)

            format // 触发vscode的格式化
              ? vscode.commands.executeCommand('editor.action.formatDocument')
              : null
          }
        })
    } catch (error) {
      vscode.window.showErrorMessage(`remove console error ❌`)
    }
  })

/**
 * 删除注释
 */
export const removeAllComment = () =>
  vscode.commands.registerCommand('print.removeAllComment', () => {
    const editor = getTextEditor()
    if (!editor) {
      return
    }

    const document = editor.document
    const commentReg = /\/\*[\s\S]*?\*\/|\/\/.*|<!--[\s\S]*?-->/g // 匹配注释
    let text = document.getText()
    let count = 0

    try {
      const timeStamp = performance.now()
      text = text.replace(commentReg, () => {
        count++
        return ''
      })

      editor
        .edit((builder) => {
          const documentStart = new vscode.Position(0, 0)
          const documentEnd = document.lineAt(document.lineCount - 1).range.end
          builder.replace(new vscode.Range(documentStart, documentEnd), text)
        })
        .then((success) => {
          if (success) {
            Logger.info(
              `remove comments time ${Math.ceil(performance.now() - timeStamp)}ms`
            )

            vscode.window.showInformationMessage(`remove ${count} comments ✅`)

            format
              ? vscode.commands.executeCommand('editor.action.formatDocument')
              : null
            removeEmptyLine
              ? vscode.commands.executeCommand('print.removeAllEmptyLine')
              : null
          }
        })
    } catch (error) {
      vscode.window.showErrorMessage(`remove comment error ❌`)
    }
  })

/**
 * 删除空行
 */
export const removeAllEmptyLine = () =>
  vscode.commands.registerCommand('print.removeAllEmptyLine', () => {
    const editor = getTextEditor()
    if (!editor) {
      return
    }

    const document = editor.document
    const resourceLength = document.lineCount
    const emptyReg = /^\s*[\r\n]/gm
    let text = document.getText()
    try {
      const timeStamp = performance.now()
      text = text.replace(emptyReg, '')

      editor
        .edit((builder) => {
          const documentStart = new vscode.Position(0, 0)
          const documentEnd = document.lineAt(resourceLength - 1).range.end
          builder.replace(new vscode.Range(documentStart, documentEnd), text)
        })
        .then((success) => {
          if (success) {
            Logger.info(
              `remove emptyLine time ${Math.ceil(
                performance.now() - timeStamp
              )}ms`
            )

            vscode.window.showInformationMessage(
              `remove ${resourceLength - document.lineCount} emptyLine ✅`
            )
          }
        })
    } catch (error) {
      vscode.window.showErrorMessage(`remove emptyLine error ❌`)
    }
  })
