import { dirname, join } from 'node:path'
import type { TextDocument } from 'vscode'
import { Position, Selection, Uri, commands, languages, window, workspace } from 'vscode'

const extName = 'gotoAlias'

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
      const regex = /:\s+typeof import\(['"`]([^']*)['"`]\)/
      const match = text.match(regex)
      if (!match)
        return
      const importName = match[1]

      // Select the import name and trigger "goto definition" again.
      // 1. If the import name is a local relative path and ends with `.vue`,
      //    we should jump to that file directly.
      if (importName.startsWith('.') && importName.endsWith('.vue')) {
        // Get current `components.d.ts` file directory and build an absolute path to open window
        const componentsDtsDir = dirname(e.document.uri.fsPath)
        const targetPath = join(componentsDtsDir, importName)
        commands.executeCommand('vscode.open', Uri.file(targetPath))
      }
      // 2. And we use VSCode built-in "Go to definition" command trigger any
      //    other condition's jump
      else {
        const importNameStart = match.index! + match[0].length - match[1].length - 1
        e.selection = new Selection(
          new Position(
            e.selection.anchor.line,
            importNameStart,
          ),
          new Position(
            e.selection.anchor.line,
            importNameStart + match[1].length,
          ),
        )
        triggerDoc = undefined
        await commands.executeCommand('editor.action.goToDeclaration')
      }

      const { activeTab } = window.tabGroups.activeTabGroup
      const isNeedCloseDts = workspace.getConfiguration(`${extName}`).get('closeDts')
      if (isNeedCloseDts && activeTab?.label.endsWith('.d.ts'))
        await window.tabGroups.close(activeTab)
    }

    await fn()
    await Promise.resolve()
    lastDoc = window.activeTextEditor?.document
  })

  setTimeout(() => {
    lastDoc = window.activeTextEditor?.document
  }, 100)
}

export function deactivate() {}
