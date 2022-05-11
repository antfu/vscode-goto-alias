# vscode-goto-alias

<a href="https://marketplace.visualstudio.com/items?itemName=antfu.vscode-goto-alias" target="__blank"><img src="https://img.shields.io/visual-studio-marketplace/v/antfu.vscode-goto-alias.svg?color=eee&amp;label=VS%20Code%20Marketplace&logo=visual-studio-code" alt="Visual Studio Marketplace Version" /></a>

Goto the source definition for aliased types.

## Motivation

For example, in [Nuxt 3](https://github.com/nuxt/framework) or [Vitesse](https://github.com/antfu/vitesse) projects, we provide auto import for APIs and components. To provide types for these auto imports, the tools will generate a `.d.ts` file to declare those APIs as "global" type.

```ts
// generated.d.ts
declare global {
  const autoImported: typeof import('foobar')['autoImported'] // alias to provide type from package 'foobar'
  // ...
}
```

With this declaration file, we could have type safety using `autoImported` in our code without importing it.

```ts
// no need to import
const foo = autoImported()
```

The only small downside is that when you use "Go to definition" in the code, the IDE will redirect you the the definition file we generated instead of the real definition source.

So, this extension is built to solve this. With this extension installed, when the "Go to definition" command hits the definition file, it will then redirect again to the definition source.

## Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/antfu/static/sponsors.svg">
    <img src='https://cdn.jsdelivr.net/gh/antfu/static/sponsors.png'/>
  </a>
</p>

## License

[MIT](./LICENSE) License © 2022 [Anthony Fu](https://github.com/antfu)
