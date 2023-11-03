/*
 * @Author: WR
 * @Date: 2023-10-11 18:55:49
 * @LastEditTime: 2023-11-03 16:43:02
 * @LastEditors: WR
 * @Description: 公共方法
 * @FilePath: \print-log\src\public.js
 */
const vscode = require('vscode')

const projectName = 'print-log'

/**
 * @typedef {Object} MoveType
 * @property {vscode.activeEditor} activeEditor
 * @property {vscode.Range} currentLineRange
 * @property {String} text 文本
 * @property {?Number} offset 光标偏移距离
 */
/**
 * @typedef {Object} MovesType
 * @property {vscode.activeEditor} activeEditor
 * @property {vscode.Selection[]} selections
 * @property {?Number} offset 光标偏移距离
 * @property {?Boolean} additional 光标错误 额外处理
 */
/**
 * @author: WR
 * @Date: 2023-10-11 18:25:10
 * @description: 移动光标
 * @param {MoveType|MovesType} obj
 * @return {*}
 */
const moveTheCursor = ({
  activeEditor,
  currentLineRange,
  text,
  offset = 1,
  selections,
  additional // 额外处理 用在把每个内容单独打印 separateLineHandle
}) => {
  if (!selections) {
    const newPosition = currentLineRange.start.translate(0, text.length - offset) // 新的光标位置
    const newSelection = new vscode.Selection(newPosition, newPosition) // 创建新的选区
    activeEditor.selection = newSelection // 设置新的选区
    // activeEditor.revealRange(newSelection, vscode.TextEditorRevealType.Default) // 滚动编辑器以显示新的选区
  } else {
    const document = activeEditor.document
    let positions = [] // 更新位置
    selections.forEach((selection, index) => {
      // 一旦插入行之后，光标位置会错误，所以需要额外处理
      if (additional) {
        selection.active.c += index
      }
      const current = document.lineAt(selection.active)
      const range = current.range
      const currentText = current.text

      // 光标移动到适当位置
      const newPosition = range.start.translate(0, currentText.length - offset)
      positions.push(new vscode.Selection(newPosition, newPosition))
    })
    activeEditor.selections = positions
  }
}

/**
 * @author: WR
 * @Date: 2023-10-12 08:53:59
 * @description: 获取所有console
 * @param {vscode.TextEditor} editor
 * @return {vscode.Range[]|[]}
 */
const getAllConsole = editor => {
  const document = editor.document
  const documentText = document.getText()

  let arr = []
  // 匹配所有console
  let reg =
    /((window|global|globalThis)\.)?console\.(log|debug|info|warn|error|assert|clear|dir|dirxml|trace|table|group|groupCollapsed|groupEnd|time|timeEnd|timeLog|timeStamp|profile|profileEnd|count|countReset)\((.*)\);?/g

  let match
  while ((match = reg.exec(documentText))) {
    // 匹配的范围
    let matchRange = new vscode.Range(
      document.positionAt(match.index),
      document.positionAt(match.index + match[0].length)
    )
    // 如果不是空
    if (!matchRange.isEmpty) arr.push(matchRange)
  }
  return arr
}

/**
 * @author: WR
 * @Date: 2023-10-14 09:47:33
 * @description: 获取当前插件的全部配置
 * @return {vscode.WorkspaceConfiguration}
 */
const getConfig = () => {
  return vscode.workspace.getConfiguration(projectName)
}

/**
 * @author: WR
 * @Date: 2023-10-16 11:55:54
 * @description: 获取最大行
 * @param {vscode.TextDocument} document
 * @param {Number} line
 * @param {?String} bracket
 * @return {Number|undefined}
 */
const getCloseBracketLine = (document, line, bracket = '{') => {
  const temp = line
  let startBracket = 0
  let endBracket = 0
  let text

  // 不写小于不执行后面的return
  while (line < document.lineCount) {
    text = document.lineAt(line).text
    const { startNum, endNum } = getBracketNum(text, bracket)
    startBracket += startNum
    endBracket += endNum
    if (startBracket - endBracket === 0) {
      return line
    }
    line++
  }
  return temp
}

/**
 * @author: WR
 * @Date: 2023-10-16 12:55:11
 * @description: 获取括号数量
 * @param {String} text
 * @param {String} bracket
 * @return {{startNum:Number,endNum:Number}}
 */
const getBracketNum = (text, bracket) => {
  let startNum = 0
  let endNum = 0
  let startReg = bracket === '{' ? /{/g : bracket === '(' ? /\(/g : /\[/g
  let endReg = bracket === '{' ? /}/g : bracket === '(' ? /\)/g : /\]/g

  while (startReg.exec(text)) {
    startNum++
  }
  while (endReg.exec(text)) {
    endNum++
  }
  return {
    startNum,
    endNum
  }
}

/**
 * @author: WR
 * @Date: 2023-10-30 15:22:11
 * @description: 找到函数参数的打印位置
 * @param {vscode.TextDocument} document
 * @param {Number} num
 * @return {Number}
 */
const getNotContainLineNum = (document, num) => {
  const temp = num
  const thenReg = /\.(then|catch|finally)/
  const fnEndReg = /\((.*)\)\s*(=>\s*)?{$|=>\s*{$/

  let notFirstLine = false // 如果当前不是第一行

  while (num < document.lineCount) {
    let text = document.lineAt(num).text.trim()
    if (text === '') {
      return num - 1
    }
    if (!thenReg.test(text) && notFirstLine) {
      return num - 1
    }
    if (thenReg.test(text) && fnEndReg.test(text)) {
      return num
    }
    num++
    notFirstLine = true
  }

  return temp
}

/**
 * @author: WR
 * @Date: 2023-10-30 10:33:06
 * @description: 找到接受返回值的位置
 * @param {vscode.TextDocument} document
 * @param {Number} num
 * @return {Number}
 */
const getLeftIncludeLineNum = (document, num) => {
  let text = document.lineAt(num + 1).text.trim()
  const thenReg = /^\.(then|catch|finally)/

  if (!thenReg.test(text) || text === '') {
    return num
  } else {
    let lineNum = getCloseBracketLine(document, num + 1, '(') // 获取结束括号的行号
    return getLeftIncludeLineNum(document, lineNum)
  }
}

/**
 * @author: WR
 * @Date: 2023-10-24 09:14:47
 * @description: 选择的内容是否包含左侧内容
 * @param {String} currentText
 * @param {String} strArr
 * @return {Boolean}
 */
const confirmInclude = (currentText, strArr) => {
  let leftStr = currentText.trim()?.split('(')[0] || '' // 获取参数左侧的内容
  leftStr = leftStr.replace(/=/g, ' ')

  let leftStrArr = leftStr
    .split(' ')
    .filter(Boolean)
    .flatMap((t, i) => {
      if (i === 0) return [t, ...t.split('.')]
      return t.split('.')
    }) // 过滤出真值
  return strArr.some(str => leftStrArr.includes(str)) // 左侧内容是否为已选择的内容
}

/**
 * @author: WR
 * @Date: 2023-11-02 17:11:45
 * @description: 查找反引号结束行号
 * @param {vscode.TextDocument} document
 * @param {Number} num
 * @return {Number}
 */
const findBackticksLineNum = (document, num) => {
  const backtickReg = /`/g
  let count = 0
  let temp = num
  let text

  while (num < document.lineCount) {
    text = document.lineAt(num).text.trim()
    while (backtickReg.exec(text)) {
      count++
    }
    if (count % 2 === 0) return num
    num++
  }
  return temp
}

/**
 * @author: WR
 * @Date: 2023-11-03 10:52:39
 * @description: 处理需要打印的文本内容
 * @param {Object} options
 * @param {String} options.startAddStr
 * @param {Boolean} options.needFileName
 * @param {Boolean} options.needLineNumber
 * @param {String} options.quote
 * @param {String} options.fileName
 * @param {Number} options.line
 * @return {String} text
 */
const textHandle = ({ startAddStr, needFileName, needLineNumber, quote, fileName, line }) => {
  let text = ''
  // 开始位置增加的字符串
  if (startAddStr !== '') {
    text += `${needFileName || needLineNumber ? startAddStr + ' ' : startAddStr}`
  }
  // 需要文件名
  if (needFileName) {
    text += `${needLineNumber ? fileName + ' ' : fileName}`
  }
  // 需要当前行号
  if (needLineNumber) {
    text += `${needFileName ? '~ line: ' + (line + 1) : 'line: ' + (line + 1)}`
  }
  if (text !== '') {
    text = `${quote}${text}${quote}, `
  }
  return text
}

module.exports = {
  moveTheCursor,
  getAllConsole,
  getConfig,
  getCloseBracketLine,
  getBracketNum,
  getNotContainLineNum,
  getLeftIncludeLineNum,
  confirmInclude,
  findBackticksLineNum,
  textHandle
}
