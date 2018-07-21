const path = require('path')
const fs = require('fs')
const util = require('util')
const compileHelper = require('..')
const replaceExt = require('replace-ext')
const pug = require('pug')
const browserSync = require('browser-sync')
const del = require('del')

const srcDir = path.join(__dirname, 'src')
const publicDir = path.join(__dirname, 'public')
const distDir = path.join(__dirname, 'dist')

const readFileAsync = util.promisify(fs.readFile)

const readPageData = (filename) => {
  return readFileAsync(replaceExt(filename, '.json'), 'utf8').then((data) => {
    return JSON.parse(data || '{}')
  })
}

const htmlCompilerConfig = {
  input: srcDir,
  inputExt: '.pug',
  output: distDir,
  outputExt: '.html',
  compile: ({ src, filename }) => {
    return readPageData(filename).then((pageData) => {
      return pug.render(String(src), { ...pageData, filename })
    })
  },
}

const startDevServer = () => {
  return new Promise((resolve) => {
    const bs = browserSync.create()
    const compileHtmlMiddleware = compileHelper.buildCompileMiddleware(
      htmlCompilerConfig,
    )

    bs.init(
      {
        server: publicDir,
        files: [
          {
            match: [publicDir, path.join(srcDir, '**/*.{pug,json}')],
            fn: bs.reload,
          },
        ],
        watchEvents: ['add', 'change', 'unlink'],
        middleware: compileHtmlMiddleware,
        open: false,
      },
      resolve,
    )
  })
}

const clean = () => {
  return del(distDir)
}

const build = () => {
  return compileHelper.buildFiles(htmlCompilerConfig)
}

const script = process.argv[2]

switch (script) {
  case 'start': {
    startDevServer()
    break
  }
  case 'build': {
    Promise.resolve()
      .then(clean)
      .then(build)
    break
  }
}
