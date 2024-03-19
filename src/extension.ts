import { commands, ExtensionContext, languages, TextEditor } from 'vscode'
import { getTextEditor } from './utils'
import {
  removeAllComment,
  removeAllConsole,
  removeAllEmptyLine
} from './utils/remove'
import { allowLog, AutoCompletionItemProvider } from './utils/completionItem'
import { consoleHandler } from './utils/print'
import path from 'path'

const language = [
  'html',
  'javascript',
  'typescript',
  'javascriptreact',
  'typescriptreact',
  'vue'
]

export function activate(context: ExtensionContext) {
  const logCommands = ['log', 'table', 'dir', 'warn', 'error']
  logCommands.forEach((command) => {
    const dispose = commands.registerCommand(`print.${command}`, () => {
      const editor = getTextEditor()
      if (!editor) {
        return
      }

      entranceProcess(editor, command)
    })

    context.subscriptions.push(dispose)

    context.subscriptions.push(
      languages.registerCompletionItemProvider(
        language,
        new AutoCompletionItemProvider(command)
      )
    )
  })

  context.subscriptions.push(removeAllConsole())
  context.subscriptions.push(removeAllComment())
  context.subscriptions.push(removeAllEmptyLine())
}

const entranceProcess = (editor: TextEditor, command: string) => {
  const selections = editor.selections
  const document = editor.document
  const lineArr: { num: number; text: string }[] = []

  selections.forEach((selection) => {
    const words = document.getText(selection)
    if (
      allowLog(path.extname(document.fileName), document, selection.active.line)
    ) {
      lineArr.push({ num: selection.active.line, text: words })
    }
  })

  consoleHandler(editor, lineArr, command)
}

export function deactivate() {}
