/*
 * @Author: WR
 * @Date: 2023-09-24 14:18:49
 * @LastEditTime: 2023-12-07 17:33:54
 * @LastEditors: WR
 * @Description: 操作编辑器相关
 * @FilePath: \print-log\src\editor.js
 */
const vscode = require('vscode')
const path = require('path')

const {
  moveTheCursor,
  getConfig,
  getCloseBracketLine,
  getNotContainLineNum,
  getLeftIncludeLineNum,
  confirmInclude,
  findBackticksLineNum,
  textHandle
} = require('./public')

// 获取用户的所有配置
let config = getConfig()
// 开始填充的字符串
let startAddStr = config.get('output.log')
// 引号方式
let quotationMarks = config.get('output.selectQuotationMarks')
// 引号数组  0 单引号  1 双引号  2 反引号
const marks = ['Single Quote', 'Double Quotes', 'Backticks']
// 是否移动光标到适当位置
let isMove = config.get('output.moveTheCursor')
// 是否需要分号
let semicolon = config.get('output.semicolonIsRequired')
// 是否需要文件名
let needFileName = config.get('output.needFileName')
// 是否需要行号
let needLineNumber = config.get('output.needLineNumber')
// 是否输出选中文本
let needOutputText = config.get('output.needSelectedText')
// 获取缩进
let tabSize = getConfig('editor').get('tabSize')

// 监听配置项变化
vscode.workspace.onDidChangeConfiguration(() => {
  // 获取用户的所有配置
  config = getConfig()
  startAddStr = config.get('output.log')
  quotationMarks = config.get('output.selectQuotationMarks')
  isMove = config.get('output.moveTheCursor')
  semicolon = config.get('output.semicolonIsRequired')
  needFileName = config.get('output.needFileName')
  needLineNumber = config.get('output.needLineNumber')
  needOutputText = config.get('output.needSelectedText')
  tabSize = getConfig('editor').get('tabSize')
})

let commandTrigger = false

/**
 * @author: WR
 * @Date: 2023-09-24 14:21:12
 * @description: 打印当前行内容
 * @param {vscode.TextEditor} activeEditor
 * @param {?String} text 指令
 * @param {Number[]} lineArr 光标所在行
 * @return {*}
 */
const consoleHandle = (activeEditor, text = 'log', lineArr) => {
  try {
    const selections = activeEditor.selections
    const document = activeEditor.document
    const fileName = path.basename(document.uri.fsPath)

    let waitingProcessing = [] // 待处理数组

    lineArr.forEach(line => {
      // 如果当前位置不允许打印 跳过
      if (!allowLog(path.extname(fileName), document, line.num)) {
        return
      }

      const currentLine = document.lineAt(line.num) // 当前行
      const currentLineRange = currentLine.range // 当前行范围
      let currentLineText = currentLine.text.trim() // 去掉空格的当前行的文本

      const indent = currentLine.text.match(/^\s*/)?.[0] || '' // 获取当前行的缩进
      const index = marks.indexOf(quotationMarks)
      const quote = index === 0 ? "'" : index === 1 ? '"' : '`'

      if (commandTrigger) {
        // 判断是否是以当前打印的字符串开始或结束 如果是就清空
        if (currentLineText.endsWith(text)) {
          currentLineText = currentLineText.slice(0, currentLineText.length - text.length)
        } else if (currentLineText.startsWith(text)) {
          currentLineText = currentLineText.replace(text, '')
        }
        commandTrigger = false
      }

      // 开始位置增加的字符串
      let temp = textHandle({
        startAddStr,
        needFileName,
        needLineNumber,
        fileName,
        quote,
        line: line.num
      })
      currentLineText = temp + currentLineText

      let replacedText = `console.${text}(${currentLineText})`.replace(/^(.*)$/, `${indent}$1`) // 在替换字符串中添加缩进

      semicolon ? (replacedText += ';') : null // 需要分号

      waitingProcessing.push({ currentLineRange, replacedText })
    })

    // 对光标位置所在行进行替换
    activeEditor
      .edit(edit => {
        for (const { currentLineRange, replacedText } of waitingProcessing) {
          edit.replace(currentLineRange, replacedText)
        }
      })
      .then(success => {
        if (success && isMove) {
          moveTheCursor({
            activeEditor,
            selections,
            offset: semicolon ? 2 : 1
          })
        }
      })
  } catch (error) {
    vscode.window.showErrorMessage(error)
  }
}

/**
 * @author: WR
 * @Date: 2023-10-11 18:11:17
 * @description: 打印选择的内容
 * @param {vscode.TextEditor} activeEditor
 * @param {?String} text 指令
 * @param {String[]} strArr 选择的内容
 * @param {Number[]} lineArr 光标所在行
 * @return {*}
 */
const selectHandle = (activeEditor, text = 'log', strArr, lineArr) => {
  // 没有选择的内容直接 return
  if (!strArr.length) return

  try {
    const document = activeEditor.document
    const max = document.lineCount
    const maxLine = Math.max(...lineArr.map(i => i.num))
    const currentLine = document.lineAt(maxLine)
    const commentReg = /\/\*[\s\S]*?\*\/|\/\/.*|<!--[\s\S]*?-->/g // 匹配注释
    const fileName = path.basename(document.uri.fsPath)

    // 得到允许打印的值
    strArr = lineArr
      .filter(line => allowLog(path.extname(fileName), document, line.num))
      .map(line => line.text)

    let currentText = currentLine.text?.trimEnd() // 获取文本
    if (commentReg.test(currentText)) {
      // 截取除了注释外的所有字符
      let normalText = currentText.slice(0, currentText.search(commentReg)).trimEnd() // 获取文本
      currentText = normalText.trim() === '' ? currentText : normalText
    }

    let nextLine = document.lineAt(maxLine + 1 >= max ? max - 1 : maxLine + 1)
    let nextLineRange = nextLine.range // 获取移动光标范围
    let insertLine // 插入行
    let preIndent = currentText.match(/^\s*/)?.[0] || '' // 获取当前行缩进

    const objReg = /=\s*{$/g // 如果是对象结尾
    const classReg = /class\s(.*)\s*{$/g // 如果是class
    const arrReg = /=\s*\[$/g // 数组结尾

    let objResult = objReg.test(currentText) || classReg.test(currentText)
    let arrResult = arrReg.test(currentText)

    // 精简一下
    let lineNum

    if (objResult || arrResult) {
      lineNum = getCloseBracketLine(document, maxLine, objResult ? '{' : '[') // 获取结束括号的行号
    } else if (currentText.includes('`')) {
      lineNum = findBackticksLineNum(document, maxLine)
    }

    const funcReg = /\((.*)\)\s*(=>\s*)?{$|=>\s*{$/g // 如果是以函数结尾 匹配当前行缩进
    const bracketReg = /\(.*$/g // 如果是括号结尾的

    let funcResult = funcReg.test(currentText)
    let braketResult = bracketReg.test(currentText)
    let judgment = false // 是否需要进一步判断缩进
    let judgmentNum = 0 // 0是包含左侧内容 1是不包含

    if (funcResult) {
      preIndent = currentText.match(/^\s*/)?.[0] || '' // 获取当前行缩进
      let include = confirmInclude(currentText, strArr) // 是否包含左侧内容

      if (include) {
        lineNum = getCloseBracketLine(document, maxLine) // 获取结束括号的行号
      } else {
        preIndent = preIndent.padStart(preIndent.length + tabSize, ' ')
      }
    } else if (braketResult) {
      judgment = true // 需要进一步判断缩进
      let include = confirmInclude(currentText, strArr) // 是否包含左侧内容
      lineNum = getCloseBracketLine(document, maxLine, '(') // 获取结束括号的行号
      if (include) {
        lineNum = getLeftIncludeLineNum(document, lineNum) // 判断Promise返回
        judgmentNum = 0
      } else {
        lineNum = getNotContainLineNum(document, lineNum) // 判断Promise返回
        judgmentNum = 1
      }
    }

    insertLine = lineNum ? lineNum + 1 : maxLine + 1
    nextLine = document.lineAt(insertLine)
    nextLineRange = nextLine.range // 更改移动光标范围
    if (!funcResult && judgment) {
      const tempText = document.lineAt(insertLine - 1).text // 要插入行的上一行
      const thenReg = /\.(then|catch|finally)/g
      let thenResult = thenReg.test(tempText)
      let funcResult = funcReg.test(tempText)
      preIndent =
        (judgmentNum === 0
          ? currentText
          : thenResult && funcResult
          ? tempText.padStart(tempText.length + tabSize, ' ')
          : currentText
        ).match(/^\s*/)?.[0] || '' // 获取缩进
    }

    const index = marks.indexOf(quotationMarks)
    const quote = index === 0 ? "'" : index === 1 ? '"' : '`'
    // 开始位置增加的字符串
    let temp = textHandle({
      startAddStr,
      needFileName,
      needLineNumber,
      fileName,
      quote,
      line: insertLine
    })

    if (needOutputText) {
      strArr = strArr.flatMap(i => [quote + i + ' ->' + quote, i])
    }

    let insertLineText = `${preIndent}console.${text}(${temp + strArr.join(', ')})` // 要插入的文本

    semicolon ? (insertLineText += ';') : null // 需要分号

    insertLineText += '\n' // 换行

    activeEditor
      .edit(edit => edit.insert(new vscode.Position(insertLine, 0), insertLineText))
      .then(success => {
        if (success && isMove) {
          // 移动光标
          moveTheCursor({
            activeEditor,
            currentLineRange: nextLineRange,
            text: insertLineText,
            offset: semicolon ? 3 : 2
          })
          strArr = lineArr = []
        }
      })
  } catch (error) {
    vscode.window.showErrorMessage(error)
  }
}

/**
 * @author: WR
 * @Date: 2023-11-03 16:43:06
 * @description: 打印选择的内容 虽然说写的有点屎山 但是能用 挺好的
 * @param {vscode.TextEditor} activeEditor
 * @param {?String} text 指令
 * @param {String[]} strArr 选择的内容
 * @param {Number[]} lineArr 光标所在行
 * @return {*}
 */
const separateLineHandle = (activeEditor, text = 'log', strArr, lineArr) => {
  try {
    const document = activeEditor.document
    const max = document.lineCount
    const fileName = path.basename(document.uri.fsPath)
    let waitingProcessing = [] // 待处理数组

    lineArr.sort((a, b) => a.num - b.num) // 排序
    lineArr.forEach((line, lineIndex) => {
      if (line.text) {
        // 如果当前位置不允许打印 跳过
        if (!allowLog(path.extname(fileName), document, line.num)) {
          return
        }

        const currentLine = document.lineAt(line.num)
        const commentReg = /\/\*[\s\S]*?\*\/|\/\/.*|<!--[\s\S]*?-->/g // 匹配注释

        let currentText = currentLine.text?.trimEnd() // 获取文本
        if (commentReg.test(currentText)) {
          // 截取除了注释外的所有字符
          let normalText = currentText.slice(0, currentText.search(commentReg)).trimEnd() // 获取文本
          currentText = normalText.trim() === '' ? currentText : normalText
        }

        let nextLine = document.lineAt(line.num + 1 >= max ? max - 1 : line.num + 1)
        let nextLineRange = nextLine.range // 获取移动光标范围
        let insertLine // 插入行
        let preIndent = currentText.match(/^\s*/)?.[0] || '' // 获取当前行缩进

        const objReg = /=\s*{$/g // 如果是对象结尾
        const classReg = /class\s(.*)\s*{$/g // 如果是class
        const arrReg = /=\s*\[$/g // 数组结尾

        let objResult = objReg.test(currentText) || classReg.test(currentText)
        let arrResult = arrReg.test(currentText)

        // 精简一下
        let lineNum

        if (objResult || arrResult) {
          lineNum = getCloseBracketLine(document, line.num, objResult ? '{' : '[') // 获取结束括号的行号
        } else if (currentText.includes('`')) {
          lineNum = findBackticksLineNum(document, line.num)
        }

        const funcReg = /\((.*)\)\s*(=>\s*)?{$|=>\s*{$/g // 如果是以函数结尾 匹配当前行缩进
        const bracketReg = /\(.*$/g // 如果是括号结尾的

        let funcResult = funcReg.test(currentText)
        let braketResult = bracketReg.test(currentText)
        let judgment = false // 是否需要进一步判断缩进
        let judgmentNum = 0 // 0是包含左侧内容 1是不包含

        if (funcResult) {
          preIndent = currentText.match(/^\s*/)?.[0] || '' // 获取当前行缩进
          let include = confirmInclude(currentText, strArr) // 是否包含左侧内容

          if (include) {
            lineNum = getCloseBracketLine(document, line.num) // 获取结束括号的行号
          } else {
            preIndent = preIndent.padStart(preIndent.length + tabSize, ' ')
          }
        } else if (braketResult) {
          judgment = true // 需要进一步判断缩进
          let include = confirmInclude(currentText, strArr) // 是否包含左侧内容
          lineNum = getCloseBracketLine(document, line.num, '(') // 获取结束括号的行号
          if (include) {
            lineNum = getLeftIncludeLineNum(document, lineNum) // 判断Promise返回
            judgmentNum = 0
          } else {
            lineNum = getNotContainLineNum(document, lineNum) // 判断Promise返回
            judgmentNum = 1
          }
        }

        insertLine = lineNum ? lineNum + 1 : line.num + 1
        nextLine = document.lineAt(insertLine)
        nextLineRange = nextLine.range // 更改移动光标范围
        if (!funcResult && judgment) {
          const tempText = document.lineAt(insertLine - 1).text // 要插入行的上一行
          const thenReg = /\.(then|catch|finally)/g
          let thenResult = thenReg.test(tempText)
          let funcResult = funcReg.test(tempText)
          preIndent =
            (judgmentNum === 0
              ? currentText
              : thenResult && funcResult
              ? tempText.padStart(tempText.length + tabSize, ' ')
              : currentText
            ).match(/^\s*/)?.[0] || '' // 获取缩进
        }

        const index = marks.indexOf(quotationMarks)
        const quote = index === 0 ? "'" : index === 1 ? '"' : '`'

        // 开始位置增加的字符串
        let temp = textHandle({
          startAddStr,
          needFileName,
          needLineNumber,
          fileName,
          quote,
          line: insertLine + lineIndex, // 排序后行号计算正确
          selectText: needOutputText ? line.text : ''
        })

        let insertLineText = `${preIndent}console.${text}(${temp + line.text})` // 要插入的文本

        semicolon ? (insertLineText += ';') : null // 需要分号

        insertLineText += '\n' // 换行

        waitingProcessing.push({
          nextLineRange,
          insertLineText,
          insertLine
        })
      }
    })

    // 对光标位置所在行进行插入
    activeEditor
      .edit(edit => {
        for (const { insertLine, insertLineText } of waitingProcessing) {
          edit.insert(new vscode.Position(insertLine, 0), insertLineText)
        }
      })
      .then(success => {
        if (success && isMove) {
          moveTheCursor({
            activeEditor,
            selections: waitingProcessing.map(i => {
              const newPosition = i.nextLineRange.start.translate(0, i.insertLineText.length)
              return new vscode.Selection(newPosition, newPosition)
            }),
            offset: semicolon ? 2 : 1,
            additional: true // 插入之后行的范围获取错误 所以对光标进行额外处理
          })
        }
      })
  } catch (error) {
    vscode.window.showErrorMessage(error)
  }
}

/**
 * @author: WR
 * @Date: 2023-10-10 12:03:45
 * @description: 绑定自定义触发的代码片段
 * @return {*}
 */
class AutoCompletionItemProvider {
  // text = '' // 当前行的内容
  command = '' // 指令字符
  upperCommand = '' // 开始字母大写的指令字符
  language = '' // 当前vscode语言

  constructor(command) {
    this.command = command
    this.language = vscode.env.language.toLowerCase()
  }

  /**
   * @author: WR
   * @Date: 2023-11-03 11:51:51
   * @description:
   * @param {vscode.TextDocument} document
   * @param {vscode.Position} position
   * @return {vscode.CompletionItem[]}
   */
  provideCompletionItems(document, position) {
    this.upperCommand = this.command.slice(0, 1).toUpperCase() + this.command.slice(1)

    const snippetCompletion = new vscode.CompletionItem(
      this.command,
      vscode.CompletionItemKind.Method
    )
    snippetCompletion.documentation = new vscode.MarkdownString(
      `${this.language === 'zh-cn' ? '快速打印当前行' : 'Quickly print the current line'} (Print ${
        this.upperCommand
      })\n\nconsole.${this.command}(lineCode)`
    )
    snippetCompletion.sortText = '0' // 排序

    const extname = path.extname(document.uri.fsPath) // 文件扩展名 返回的格式 .html

    let text = document.lineAt(position).text
    if (
      allowLog(extname, document, position) &&
      (text.endsWith(this.command.slice(0, 1)) || text.startsWith(this.command.slice(0, 1)))
    ) {
      return [snippetCompletion]
    }
    return
  }

  /**
   * @author: WR
   * @Date: 2023-11-03 11:55:22
   * @description:
   * @param {vscode.CompletionItem} item
   * @return {vscode.CompletionItem}
   */
  resolveCompletionItem(item) {
    commandTrigger = true

    // 绑定触发指令
    item.command = {
      command: `print.${this.command}`,
      title: `Print ${this.upperCommand}`
    }
    return item
  }
}

/**
 * @author: WR
 * @Date: 2023-12-02 15:37:25
 * @description: 当前位置是否允许打印
 * @param {String} extname 文件后缀名
 * @param {vscode.TextDocument} document 文档对象
 * @param {Number|vscode.Position} position 光标位置对象
 * @return {Boolean}
 */
const allowLog = (extname, document, position) => {
  const checkExtReg = /\.(html|vue)$/ // 需要判断 script 标签的文件

  // 需要判断 script 位置
  if (checkExtReg.test(extname)) {
    const line = typeof position === 'number' ? position : document.lineAt(position).lineNumber // 第一个光标所在行
    const scriptPosition = []
    const startScriptReg = /<script[\s\S]*?>/g // script 开始标签
    const endScriptReg = /<\/script>/g // script 结束标签
    const text = document.getText()

    // script 标签不能嵌套
    let startMatch, endMatch
    while ((startMatch = startScriptReg.exec(text)) && (endMatch = endScriptReg.exec(text))) {
      const start = document.positionAt(startMatch.index + startMatch[0].length).line // 开始位置
      const end = document.positionAt(endMatch.index + endMatch[0].length).line || start // 结束位置

      scriptPosition.push({
        start,
        end
      })
    }

    // 当前行属于 script 标签内部
    if (scriptPosition.some(pos => pos.start < line && line < pos.end)) {
      return true
    }
    return false
  }
  return true
}

module.exports = {
  consoleHandle,
  selectHandle,
  separateLineHandle,
  AutoCompletionItemProvider
}
