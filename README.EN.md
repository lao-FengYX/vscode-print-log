# README

[中文](README.md)

This is a plugin that helps you quickly print

You can input corresponding instructions at the beginning/end of the current line to trigger completion

it comes with a one click function to clear all `consoles` (in the `Print `right-click menu)

Comes with the function of deleting all comments and blank lines with one click (in the 'Print' right-click menu)

### Trigger instruction

When the command is triggered, if there is selected content, the selected content will be printed instead of the current line

| command       |                      result |
| ---------- | ------------------------: |
| log        | console.log(lineContent) |
| table      | console.table(lineContent) |
| dir        | console.dir(lineContent) |
| warn       | console.warn(lineContent) |
| error      | console.error(lineContent) |

| Shortcut keys    |                      result |
| ---------- | ------------------------: |
| ctrl+alt+l | console.log(lineContent) |
| ctrl+alt+t | console.table(lineContent) |
| ctrl+alt+d | console.dir(lineContent) |
|            | console.warn(lineContent) |
|            | console.error(lineContent) |

### Example

<img src="public/img/example1.gif" alt="log" title="example1" width="70%" >

<br>

<img src="public/img/example2.gif" alt="select log" title="example2" width="70%">

### note

- It is recommended to enable the `"files.insertFinalNewline": true,` configuration item, otherwise it will not be printed if the line to be printed is the last line

- When you need to print a line if there is `str = text.trim()?. split('(') || ''` This kind of `(` and `)` are not equal, and the next line is another logical code is similar to the situation, it is recommended to print manually, otherwise if the current file is too large, it will be very performance-intensive

#### The shortcut keys can be modified by yourself

Others can be viewed in the context menu

#### If you like this plugin, please give me a star. Thanks

**Enjoy!**
