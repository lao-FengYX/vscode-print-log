# Welcome to your VS Code Extension

## What's in the folder

* 此文件夹包含扩展所需的所有文件。
* `package.json` - 这是在其中声明扩展和命令的清单文件。
  * 示例插件注册一个命令并定义其标题和命令名称。有了这些信息，VS Code 就可以在命令面板中显示命令。它还不需要加载插件。
* `extension.js` - 这是主文件，您将在其中提供命令的实现。
  * 该文件导出一个函数, `activate`, 这是第一次激活扩展时调用的（在本例中通过执行命令）。在 `activate` 函数中，我们调用 `registerCommand` 。
  * 我们将包含命令实现的函数作为第二个参数传递给 `registerCommand`.

## Get up and running straight away

* 按 `F5` 打开一个加载了扩展的新窗口。
* 通过按(`Ctrl+Shift+P` 或 在 Mac 上为 `Cmd+Shift+P`) 并键入 `Hello World`，从命令面板运行命令。
* 在 `extension.js` 内的代码中设置断点以调试扩展。
* 在调试控制台中查找扩展的输出。

## Make changes

* 更改代码后，可以从调试工具栏重新启动扩展 `extension.js`.
* 您也可以重新加载 (`Ctrl+R` 或 在 Mac 上为 `Cmd+R`) 带有扩展的 VS Code 窗口，用于加载更改。

## Explore the API

* 当您打开文件时，您可以打开我们全套的 API `node_modules/@types/vscode/index.d.ts`.

## Run tests

* 打开调试 viewlet(`Ctrl+Shift+D` 或 在 Mac 上为 `Cmd+Shift+D`)，然后从启动配置下拉列表中选择 `扩展测试`。
* 按 `F5` 在加载扩展的新窗口中运行测试。
* 在调试控制台中查看测试结果的输出。
* 对 `src/test/suite/extension.test.js` 进行更改，或在 `test/suite` 文件夹中创建新的测试文件。
  * 提供的测试运行程序将仅考虑与名称模式匹配的文件 `**.test.ts`.
  * 您可以在 `test` 文件夹中创建文件夹，以任何您想要的方式构建测试。

## Go further

 * [遵循用户体验准则](https://code.visualstudio.com/api/ux-guidelines/overview) 创建与 VS Code 的本机接口和模式无缝集成的扩展。
 * [发布扩展](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) 在 VS Code 扩展市场上。
 * 通过设置 [持续集成](https://code.visualstudio.com/api/working-with-extensions/continuous-integration) 实现构建自动化.
