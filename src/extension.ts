import path from 'path'
import { commands, ExtensionContext, languages, TextEditor } from 'vscode'
import { getTextEditor } from './utils'
import { allowLog, AutoCompletionItemProvider } from './utils/completionItem'
import { currentRowConsoleHandler, otherConsoleHandler } from './utils/print'
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
  let lineArr: { num: number; text: string }[] = []
  let strArr: string[] = []

  selections.forEach((selection) => {
    const words = document.getText(selection)
    if (words !== '') {
      strArr.push(words)
    }

    if (
      allowLog(path.extname(document.fileName), document, selection.active.line)
    ) {
      lineArr.push({ num: selection.active.line, text: words })
    }
  })

  // 如果有选择的内容   找到应该输出的位置
  // 否则打印当前行
  ;(strArr.length ? otherConsoleHandler : currentRowConsoleHandler)(
    editor,
    lineArr,
    command
  )
}

export function deactivate() {}
