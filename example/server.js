const path = require('path')
const fs = require('fs')
const renderHelper = require('../')
const browserSync = require('browser-sync').create()
const replaceExt = require('replace-ext')
const pug = require('pug')
const rimraf = require('rimraf')

const isProd = process.argv[2] === '--prod'

const renderHelperConfig = {
  input: path.join(__dirname, 'src'),
  inputExt: 'pug',
  output: path.join(__dirname, 'dist'),
  outputExt: 'html',
  render: ({ src, filename }) => {
    const pageData = JSON.parse(
      fs.readFileSync(replaceExt(filename, '.json'), 'utf8') || '{}',
    )
    return pug.render(src.toString(), { ...pageData, filename })
  },
}

const startDevServer = () => {
  browserSync.init({
    server: true,
    middleware: renderHelper.createRenderMiddleware(renderHelperConfig),
    open: false,
  })
}

const build = () => {
  rimraf(path.join(__dirname, 'dist'), () => {
    renderHelper.build(renderHelperConfig)
  })
}

if (isProd) {
  build()
} else {
  startDevServer()
}
