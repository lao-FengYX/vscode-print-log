/*
 * @Author: WR
 * @Date: 2023-10-11 18:55:49
 * @LastEditTime: 2023-12-07 17:08:26
 * @LastEditors: WR
 * @Description: 公共方法
 * @FilePath: \print-log\src\public.js
 */
const vscode = require('vscode')

const projectName = 'print-log'

/**
 * @typedef {Object} MoveType
 * @property {vscode.TextEditor} activeEditor
 * @property {vscode.Range} currentLineRange
 * @property {String} text 文本
 * @property {?Number} offset 光标偏移距离
 */
/**
 * @typedef {Object} MovesType
 * @property {vscode.TextEditor} activeEditor
 * @property {vscode.Selection[]} selections
 * @property {?Number} offset 光标偏移距离
 * @property {?Boolean} additional 光标错误 额外处理
 */
/**
 * @author: WR
 * @Date: 2023-10-11 18:25:10
 * @description: 移动光标
 * @param {MoveType & MovesType} obj
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

    scrollView(activeEditor, newSelection) // 滚动编辑器以显示新的选区
  } else {
    const document = activeEditor.document
    let positions = [] // 更新位置
    selections.forEach((selection, index) => {
      // 一旦插入行之后，光标位置会错误，所以需要额外处理
      if (additional) {
        selection.active.line += index
      }
      const current = document.lineAt(selection.active)
      const range = current.range
      const currentText = current.text

      // 光标移动到适当位置
      const newPosition = range.start.translate(0, currentText.length - offset)
      positions.push(new vscode.Selection(newPosition, newPosition))
    })
    activeEditor.selections = positions

    scrollView(activeEditor, activeEditor.selection)
  }
}

/**
 * 滚动视图到适当位置
 * @param {vscode.TextEditor} activeEditor
 * @param {vscode.Range} range
 * @returns {*}
 */
const scrollView = (activeEditor, range) =>
  activeEditor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport)

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
 * @param {?String} configName 配置名 默认 print-log
 * @return {vscode.WorkspaceConfiguration}
 */
const getConfig = configName => {
  return vscode.workspace.getConfiguration(configName ? configName : projectName)
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
  const fnEndReg = /\((.*)\)\s*(\:.*)?(=>\s*)?{$|=>\s*{$/

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
 * @param {?String} options.selectText
 * @return {String} text
 */
const textHandle = ({
  startAddStr,
  needFileName,
  needLineNumber,
  quote,
  fileName,
  line,
  selectText
}) => {
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
    text += `${needFileName ? '~ ' : ''}${'line: ' + (line + 1)}`
  }
  if (selectText) {
    text +=
      text !== '' ? (text.endsWith(' ') ? '~ ' : ' ~ ') + selectText + ' ->' : selectText + ' ->'
  }
  if (text !== '') {
    text = `${quote}${text}${quote}, `
  }
  return text
}

/**
 * @author: WR
 * @Date: 2024-1-22 17:31:45
 * @description: 查找点或者问点结束行号
 * @param {vscode.TextDocument} document
 * @param {Number} num
 * @return {Number}
 */
const findDropLine = (document, num) => {
  const dropReg = /^(\?)?\./
  let text
  while (num < document.lineCount) {
    text = document.lineAt(num).text.trim()
    if (!dropReg.test(text)) {
      return num - 1
    }
    num++
  }
}

/**
 * @author: WR
 * @Date: 2024-1-23 09:45:45
 * @description: 查找三目结束行号
 * @param {vscode.TextDocument} document
 * @param {Number} num
 * @return {Number}
 */
const findTernaryLine = (document, num) => {
  const funcReg = /\((.*)\)\s*(\:.*)?(=>\s*)?{$|=>\s*{$/ // 如果是以函数结尾 匹配当前行缩进
  const askReg = /^\?(?!\.)/g
  const colonReg = /^:/g
  let line = num
  let askNum = (colonNum = 0)
  let text
  while (num < document.lineCount) {
    text = document.lineAt(num).text.trim()
    if (askReg.exec(text)) {
      askNum++
    }
    if (colonReg.exec(text)) {
      colonNum++
    }
    if (askNum === colonNum) {
      let previousText = document.lineAt(num + 1).text.trim()
      if (
        !askReg.test(previousText) &&
        !colonReg.test(previousText) &&
        !funcReg.test(previousText)
      ) {
        return num - 1
      }
    }
    num++
  }
  return line
}

/**
 * @author: WR
 * @Date: 2024-2-5 10:53:45
 * @description: 得到不含注释的文本
 * @param {String} text
 * @returns {String} 不含注释的文本
 */
const getNotCommentText = text => {
  const commentReg = /\/\*[\s\S]*?\*\/|\/\/.*|<!--[\s\S]*?-->/g // 匹配注释
  if (commentReg.test(text)) {
    // 截取除了注释外的所有字符
    let normalText = text.slice(0, text.search(commentReg)).trimEnd() // 获取文本
    text = normalText.trim() === '' ? text : normalText
  }
  return text
}

/**
 * 找函数解构的参数打印位置
 * @param {vscode.TextDocument} document
 * @param {Number} num
 */
const findStartLine = (document, num) => {
  let startLine
  let varReg = /^(var|let|const)\s+(.*?),/
  while (num >= 0) {
    let text = getNotCommentText(document.lineAt(num).text)
    // 不要 }, 结尾
    if (/\}\s*,$/.test(text) || text.trim().match(varReg)) {
      return
    }
    // 找到参数解构行
    if (/\(.*\{$/.test(text)) {
      startLine = num
      break
    }
    num--
  }
  return startLine
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
  textHandle,
  findDropLine,
  findTernaryLine,
  getNotCommentText,
  findStartLine
}
