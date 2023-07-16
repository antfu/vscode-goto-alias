import * as vscode from 'vscode'

const name = 'gotoAlias'

export function config(section?: string) {
  if (!section)
    return vscode.workspace.getConfiguration(name)

  return vscode.workspace.getConfiguration(`${name}.${section}`)
}

export default config
