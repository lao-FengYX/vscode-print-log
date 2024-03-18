import { commands, ExtensionContext, languages, TextEditor } from 'vscode'
import { getTextEditor } from './utils'
import {
  removeAllComment,
  removeAllConsole,
  removeAllEmptyLine
} from './utils/remove'
import { AutoCompletionItemProvider } from './utils/completionItem'

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

      handlePrint(editor, command)
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

const handlePrint = (editor: TextEditor, command: string) => {
  const selections = editor.selections
  const document = editor.document
  const strArr: string[] = [] // 获取所有选择的内容
  const lineArr: { num: number; text: string }[] = [] // 获取行号

  selections.forEach((selection) => {
    const words = document.getText(selection)
    lineArr.push({ num: selection.active.line, text: words })
    if (words !== '') {
      strArr.push(words)
    }
  })

  if (strArr.length) {
    
  }
}

export function deactivate() {}
