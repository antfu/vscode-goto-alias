import type { Definition, DefinitionLink, Location, LocationLink, TextDocument } from 'vscode'
import { Position, commands, languages, workspace } from 'vscode'

export function activate() {
  let triggerDoc: TextDocument | undefined
  let triggerPos: Position | undefined

  languages.registerDefinitionProvider([
    'javascript',
    'typescript',
    'javascriptreact',
    'typescriptreact',
    'vue',
  ], {
    async provideDefinition(document: TextDocument, position: Position) {
      // prevent infinite loop and reduce unnecessary calls
      if ((triggerDoc === document && triggerPos?.isEqual(position)))
        return null

      triggerDoc = document
      triggerPos = position

      const definitions = await commands.executeCommand('vscode.executeDefinitionProvider', document.uri, position) as Definition | DefinitionLink[]
      if (!Array.isArray(definitions))
        return definitions

      const modifiedDefinitions = []
      for (const definition of definitions) {
        if ('targetUri' in definition) {
          const { originSelectionRange, targetUri } = definition
          if (targetUri.fsPath.endsWith('.d.ts')) {
            // get the content of the dts file without opening it
            const dtsDocument = (await workspace.fs.readFile(targetUri)).toString()
            const { targetRange } = definition
            const regex = /:\s+typeof import\(['"`]([^']*)['"`]\)\[['"`]([^']*)['"`]\]/
            const line = dtsDocument.split('\n')[targetRange.start.line]
            const match = line.match(regex)

            if (!match) {
              modifiedDefinitions.push(definition)
              continue
            }

            const importNameStart = match.index! + match[0].length - match[2].length - 1
            const dtsDefinitions = await commands.executeCommand('vscode.executeDefinitionProvider', targetUri, new Position(targetRange.start.line, importNameStart)) as DefinitionLink[]
            if (dtsDefinitions.length) {
              // unshift to keep this definition as primary
              // when set `"editor.gotoLocation.multipleDefinitions": "goto"`, it will go to the right file
              modifiedDefinitions.unshift(...dtsDefinitions.map(dtsDefinition => ({ ...dtsDefinition, originSelectionRange })))
            }
          }
        }
        else {
          modifiedDefinitions.push(definition)
        }
      }

      return modifiedDefinitions as Location[] | LocationLink[]
    },
  })
}

export function deactivate() {}
