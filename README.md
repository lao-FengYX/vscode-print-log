# README

This is a plugin that helps you quickly print the current line content.

这是一个帮助你快速打印当前行内容的插件

### Current
#### English
- When adding a shortcut key to restrict, if there is already selected content, it will print <font color=CornflowerBlue><b>the selected content on the next line (multiple are allowed)</b></font>; Instead of triggering the printing of the current line's content

- Add instructions to clear all consoles; You can enter `Print CleanConsole` in the right-click menu or `Ctrl+Shift+p`

-  Add custom content to the console output of `output.log`

- <font color=CornflowerBlue><b>Cross row console will not be matched for deletion</b></font>

#### 中文
- 新增输入快捷键时,如果有已选择的内容,则<font color=CornflowerBlue><b>会在下一行打印已选择的内容(允许多个)</b></font>;而不是触发打印当前行的内容

- 新增清空所有console的指令;可以在右键菜单或者 `ctrl+shift+p` 输入`Print CleanConsole`

- 新增配置项：`output.log` 输出的console添加自定义内容

- <font color=CornflowerBlue><b>跨行的console不会进行匹配删除</b></font>

### Before

Now you can input the corresponding instruction at the beginning/end of the current line to trigger completion

现在可以在当前行的开始/结尾处输入响应的指令进行触发补全

#### example

| 指令     |                      结果 |
| ---------- | ------------------------: |
| log        | console.log(lineContent) |

| 快捷键     |                      结果 |
| ---------- | ------------------------: |
| ctrl+alt+l | console.log(lineContent) |
| ctrl+alt+d | console.table(lineContent) |
| ctrl+alt+d | console.dir(lineContent) |

Other options can be viewed in the right-click menu

其他的可以在右键菜单查看

**Enjoy!**
