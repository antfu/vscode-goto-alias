import type { TextDocument } from 'vscode'
import { Position, Selection, commands, languages, window } from 'vscode'

// TODO: config
const CLOSE_DTS_TAB = false

export function activate() {
  let triggerDoc: TextDocument | undefined
  let lastDoc: TextDocument | undefined

  languages.registerDefinitionProvider([
    'javascript',
    'typescript',
    'javascriptreact',
    'typescriptreact',
    'vue',
  ], {
    provideDefinition(document: TextDocument) {
      // record the last document triggers the "goto definition"
      triggerDoc = document
      return null
    },
  })

  window.onDidChangeActiveTextEditor(async (e) => {
    if (!e || !e.document)
      return

    const fn = async () => {
      if (!e.selection.isSingleLine)
        return

      // to check if this editor change is triggered by "goto definition"
      if (!triggerDoc || triggerDoc !== lastDoc)
        return

      // we only handles redirection to dts file
      const path = e.document.uri.fsPath
      if (!path.endsWith('.d.ts'))
        return

      // wait for e.selection to update (init 0)
      const waitInterval = 5
      const maxWait = 1000
      for (let i = 0; i < maxWait; i += waitInterval) {
        await new Promise(resolve => setTimeout(resolve, waitInterval))
        if (e.selection.anchor.line !== 0)
          break
      }

      const line = e.document.lineAt(e.selection.anchor.line)
      const text = line.text
      const regex = /:\s+typeof import\(.*?\)/
      const match = text.match(regex)
      if (!match)
        return

      // select the import name and trigger "goto definition" again
      e.selection = new Selection(
        new Position(
          e.selection.anchor.line,
          match.index! + match[0].length,
        ),
        new Position(
          e.selection.anchor.line,
          match.index! + match[0].length + 1,
        ),
      )
      const tab = window.tabGroups.activeTabGroup.activeTab
      triggerDoc = undefined
      await commands.executeCommand('editor.action.goToDeclaration')
      if (CLOSE_DTS_TAB && tab && tab !== window.tabGroups.activeTabGroup.activeTab)
        await window.tabGroups.close(tab)
    }

    await fn()
    await Promise.resolve()
    lastDoc = window.activeTextEditor?.document
  })

  setTimeout(() => {
    lastDoc = window.activeTextEditor?.document
  }, 100)
}

export function deactivate() {

}
