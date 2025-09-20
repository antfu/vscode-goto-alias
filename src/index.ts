import type { ExtensionContext } from 'vscode'
import { window, workspace } from 'vscode'

function showSettingsUpdateDialog(ext: ExtensionContext) {
  if (workspace.getConfiguration().get('editor.gotoLocation.multipleDefinitions') === 'goto')
    return

  if (ext.globalState.get('showedSettingsUpdateDialog'))
    return

  window.showInformationMessage(
    [
      '[Goto Alias]',
      'To get the best experience, we recommend you to set',
      '`"editor.gotoLocation.multipleDefinitions": "goto"` to the first definition automatically.',
      'Click "OK" to set it now.',
    ].join('\n'),
    'OK',
    'Not now',
  )
    .then((selection) => {
      if (selection === 'OK')
        workspace.getConfiguration().update('editor.gotoLocation.multipleDefinitions', 'goto', true)
      ext.globalState.update('showedSettingsUpdateDialog', true)
    })
}

export function activate(ext: ExtensionContext) {
  showSettingsUpdateDialog(ext)
}

export function deactivate() {}
