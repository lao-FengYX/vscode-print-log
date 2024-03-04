import * as vscode from 'vscode'
import { getTextEditor } from "./utils";

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand('ts-print-log.helloWorld', () => {
    const editor = getTextEditor()
    if (!editor) {
      return
    }
    const document = editor.document

  })
  context.subscriptions.push(disposable)
}

export function deactivate() {}
