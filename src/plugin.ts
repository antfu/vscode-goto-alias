import type ts from 'typescript'

const plugin: ts.server.PluginModuleFactory = (module) => {
  const { typescript: ts } = module

  return {
    create(info) {
      const original = info.languageService.getDefinitionAndBoundSpan
      info.languageService.getDefinitionAndBoundSpan = getDefinitionAndBoundSpan(
        ts,
        info.languageService,
        original,
      )

      return info.languageService
    },
  }
}

export default plugin

const DTS_REGEX = /\.d\.(?:c|m)ts$/

function getDefinitionAndBoundSpan(
  ts: typeof import('typescript'),
  languageService: ts.LanguageService,
  getDefinitionAndBoundSpan: ts.LanguageService['getDefinitionAndBoundSpan'],
): ts.LanguageService['getDefinitionAndBoundSpan'] {
  return (fileName, position) => {
    const result = getDefinitionAndBoundSpan(fileName, position)
    if (!result?.definitions?.length) {
      return result
    }

    const program = languageService.getProgram()!
    const definitions = new Set<ts.DefinitionInfo>(result.definitions)
    const skippedDefinitions: ts.DefinitionInfo[] = []

    for (const definition of result.definitions) {
      if (!DTS_REGEX.test(definition.fileName)) {
        continue
      }
      const sourceFile = program.getSourceFile(definition.fileName)
      if (sourceFile) {
        visit(sourceFile, definition, sourceFile)
      }
    }

    for (const definition of skippedDefinitions) {
      definitions.delete(definition)
    }

    return {
      definitions: [...definitions],
      textSpan: result.textSpan,
    }

    function visit(
      node: ts.Node,
      definition: ts.DefinitionInfo,
      sourceFile: ts.SourceFile,
    ) {
      let pos: number | undefined

      if (ts.isBindingElement(node)) {
        pos = proxyBindingElement(node, definition, sourceFile)
      }
      if (ts.isPropertySignature(node) && node.type) {
        pos = proxyTypeofImport(node.name, node.type, definition, sourceFile)
      }
      else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.type && !node.initializer) {
        pos = proxyTypeofImport(node.name, node.type, definition, sourceFile)
      }
      else {
        ts.forEachChild(node, child => visit(child, definition, sourceFile))
      }

      if (pos !== undefined) {
        const res = getDefinitionAndBoundSpan(definition.fileName, pos)
        if (res?.definitions?.length) {
          for (const definition of res.definitions) {
            definitions.add(definition)
          }
          skippedDefinitions.push(definition)
        }
      }
    }

    function proxyBindingElement(
      element: ts.BindingElement,
      definition: ts.DefinitionInfo,
      sourceFile: ts.SourceFile,
    ) {
      const name = element.propertyName ?? element.name
      if (!ts.isIdentifier(name)) {
        return
      }

      const { textSpan } = definition
      const start = name.getStart(sourceFile)
      const end = name.getEnd()

      if (start !== textSpan.start || end - start !== textSpan.length) {
        return
      }

      return name.getStart(sourceFile)
    }

    function proxyTypeofImport(
      name: ts.PropertyName,
      type: ts.TypeNode,
      definition: ts.DefinitionInfo,
      sourceFile: ts.SourceFile,
    ) {
      const { textSpan } = definition
      const start = name.getStart(sourceFile)
      const end = name.getEnd()

      if (start !== textSpan.start || end - start !== textSpan.length) {
        return
      }

      if (ts.isIndexedAccessTypeNode(type)) {
        return type.indexType.getStart(sourceFile)
      }
      else if (ts.isImportTypeNode(type)) {
        return type.argument.getStart(sourceFile)
      }
    }
  }
}
