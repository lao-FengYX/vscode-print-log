import * as vscode from 'vscode'
import { Config } from '../types'

export enum Fixed {
  name = 'print-log'
}

/**
 * 获取激活编辑器对象
 */
export const getTextEditor = () => vscode.window.activeTextEditor

/**
 * 获取配置
 */
export const getConfig = <T extends keyof Config>(
  config: T
): Readonly<Config[T]> =>
  vscode.workspace.getConfiguration(Fixed.name).get(config) as Config[T]
