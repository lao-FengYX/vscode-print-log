import * as vscode from 'vscode'
import { getTextEditor } from './utils'
import {
  removeAllComment,
  removeAllConsole,
  removeAllEmptyLine
} from './utils/remove'

const language = [
  'html',
  'javascript',
  'typescript',
  'javascriptreact',
  'typescriptreact',
  'vue'
]

export function activate(context: vscode.ExtensionContext) {
  const commands = ['log', 'table', 'dir', 'warn', 'error']
  commands.forEach((command) => {
    const dispose = vscode.commands.registerCommand(`print.${command}`, () => {
      const editor = getTextEditor()
      if (!editor) {
        return
      }
    })

    context.subscriptions.push(dispose)
  })

  context.subscriptions.push(removeAllConsole())
  context.subscriptions.push(removeAllComment())
  context.subscriptions.push(removeAllEmptyLine())
}

export function deactivate() {}
