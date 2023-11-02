/*
 * @Author: WR
 * @Date: 2023-10-11 18:55:49
 * @LastEditTime: 2023-11-02 10:24:24
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
 */
/**
 * @author: WR
 * @Date: 2023-10-11 18:25:10
 * @description: 移动光标
 * @param {MoveType|MovesType} obj
 * @return {*}
 */
const moveTheCursor = ({ activeEditor, currentLineRange, text, offset = 1, selections }) => {
  if (!selections) {
    const newPosition = currentLineRange.start.translate(0, text.length - offset) // 新的光标位置
    const newSelection = new vscode.Selection(newPosition, newPosition) // 创建新的选区
    activeEditor.selection = newSelection // 设置新的选区
    // activeEditor.revealRange(newSelection, vscode.TextEditorRevealType.Default) // 滚动编辑器以显示新的选区
  } else {
    const document = activeEditor.document
    let positions = [] // 更新位置
    selections.forEach(selection => {
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
  // 不写小于不执行后面的return
  while (line < document.lineCount) {
    const { startNum, endNum } = getBracketNum(document.lineAt(line).text, bracket)
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

module.exports = {
  moveTheCursor,
  getAllConsole,
  getConfig,
  getCloseBracketLine,
  getBracketNum
}
