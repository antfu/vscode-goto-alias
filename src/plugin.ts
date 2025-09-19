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
      if (ts.isBindingElement(node)) {
        proxyBindingElement(node, definition, sourceFile)
      }
      if (ts.isPropertySignature(node) && node.type) {
        proxyTypeofImport(node.name, node.type, definition, sourceFile)
      }
      else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.type && !node.initializer) {
        proxyTypeofImport(node.name, node.type, definition, sourceFile)
      }
      else {
        ts.forEachChild(node, child => visit(child, definition, sourceFile))
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

      const { textSpan, fileName } = definition
      const start = name.getStart(sourceFile)
      const end = name.getEnd()

      if (start !== textSpan.start || end - start !== textSpan.length) {
        return
      }

      const pos = name.getStart(sourceFile)
      const res = getDefinitionAndBoundSpan(fileName, pos)
      if (res?.definitions?.length) {
        for (const definition of res.definitions) {
          definitions.add(definition)
        }
        skippedDefinitions.push(definition)
      }
    }

    function proxyTypeofImport(
      name: ts.PropertyName,
      type: ts.TypeNode,
      definition: ts.DefinitionInfo,
      sourceFile: ts.SourceFile,
    ) {
      const { textSpan, fileName } = definition
      const start = name.getStart(sourceFile)
      const end = name.getEnd()

      if (start !== textSpan.start || end - start !== textSpan.length) {
        return
      }

      let pos: number | undefined
      if (ts.isIndexedAccessTypeNode(type)) {
        pos = type.indexType.getStart(sourceFile)
      }
      else if (ts.isImportTypeNode(type)) {
        pos = type.argument.getStart(sourceFile)
      }
      if (pos === undefined) {
        return
      }

      const res = getDefinitionAndBoundSpan(fileName, pos)
      if (res?.definitions?.length) {
        for (const definition of res.definitions) {
          definitions.add(definition)
        }
        skippedDefinitions.push(definition)
      }
    }
  }
}
