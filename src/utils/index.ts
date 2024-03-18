import * as vscode from 'vscode'
import type { Config, ExtractKey, KeyPath } from '../types'

export enum Extension {
  name = 'print-log'
}

/**
 * 获取激活编辑器对象
 */
export const getTextEditor = () => vscode.window.activeTextEditor

/**
 * 获取配置
 */
export const getConfig = <T extends KeyPath<Config>>(
  config: T
): ExtractKey<Config, T> | undefined =>
  vscode.workspace.getConfiguration(Extension.name).get(config)
