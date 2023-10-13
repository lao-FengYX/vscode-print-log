const vscode = require('vscode')

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

module.exports = {
  moveTheCursor
}
