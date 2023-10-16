/*
 * @Author: WR
 * @Date: 2023-10-11 18:55:49
 * @LastEditTime: 2023-10-16 16:02:00
 * @LastEditors: WR
 * @Description: 公共方法
 * @FilePath: \print-log\src\public.js
 */
const vscode = require('vscode')

const projectName = 'print-log'

/**
 * @author: WR
 * @Date: 2023-10-11 18:25:10
 * @description: 移动光标
 * @param {Object} obj
 * @param {vscode.activeEditor} obj.activeEditor
 * @param {vscode.Range} obj.currentLineRange
 * @param {String} obj.text
 * @param {Number} obj.offset 光标偏移距离
 * @return {*}
 */
const moveTheCursor = ({ activeEditor, currentLineRange, text, offset = 1 }) => {
  const newPosition = currentLineRange.start.translate(0, text.length - offset) // 新的光标位置
  const newSelection = new vscode.Selection(newPosition, newPosition) // 创建新的选区
  activeEditor.selection = newSelection // 设置新的选区
  // activeEditor.revealRange(newSelection, vscode.TextEditorRevealType.Default) // 滚动编辑器以显示新的选区
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
    /((window|global|globalThis)\.)?console\.(log|debug|info|warn|error|assert|dir|dirxml|trace|group|groupEnd|time|timeEnd|profile|profileEnd|count)\((.*)\);?/g

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
  let startBracket = 0
  let endBracket = 0
  while (line <= document.lineCount) {
    const { startNum, endNum } = getBracketNum(document.lineAt(line).text, bracket)
    startBracket += startNum
    endBracket += endNum
    if (startBracket - endBracket === 0) {
      return line
    }
    line++
  }
  return
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
