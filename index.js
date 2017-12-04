const path = require('path')
const fs = require('fs')
const {promisify} = require('util')
const url = require('url')
const minimatch = require('minimatch')
const mime = require('mime')
const globby = require('globby')
const makeDir = require('make-dir')

const writeFileAsync = promisify(fs.writeFile)

class Config {
  constructor(config) {
    this.input = config.input || './src'
    this.inputExt = config.inputExt || 'html'
    this.output = config.output || './dist'
    this.outputExt = config.outputExt || 'html'
    this.exclude = config.exclude || ['**/_*', '**/_*/**']
    this.task = config.task
  }

  isExclude(pathname) {
    pathname = path.join(this.input, pathname)
    return this.exclude.some((exclude) => minimatch(pathname, exclude))
  }

  getInputPath(outputPath) {
    const extRe = new RegExp(`\\.${this.outputExt}$`, 'i')
    return path.join(
      this.input,
      outputPath.replace(extRe, `.${this.inputExt}`),
    )
  }

  getOutputPath(inputPath) {
    const input = path.normalize(this.input)
    const output = path.normalize(this.output)
    const extRe = new RegExp(`\\.${this.inputExt}$`, 'i')
    return inputPath
      .replace(path.normalize(input), path.normalize(output))
      .replace(extRe, `.${this.outputExt}`)
  }
}

const normalizePath = (pathname) => {
  const isDirectoryPath = /\/$/.test(pathname)
  return isDirectoryPath
    ? path.join(pathname, 'index.html')
    : pathname
}

const renderMiddleware = (config, basePath) => (req, res, next) => {
  const parsedPath = url.parse(req.url).pathname
  const reqPath = normalizePath(parsedPath)

  if (!reqPath.startsWith(`${basePath}/`)) {
    return next()
  }

  const outputPath = reqPath.replace(`${basePath}/`, '')
  const inputPath = config.getInputPath(outputPath)
  const isInputFileExists = fs.existsSync(inputPath) && fs.statSync(inputPath).isFile()

  if (!isInputFileExists) {
    return next()
  }

  if (config.isExclude(inputPath)) {
    return next()
  }

  Promise.resolve(config.task(inputPath))
    .then((result) => {
      res.setHeader('Content-Type', mime.getType(outputPath))
      res.end(result)
    })
    .catch((err) => {
      throw err
    })
}

const buildAllFiles = (config) => async () => {
  const targetFiles = path.join(config.input, `**/*.${config.inputExt}`)
  const inputPaths = await globby(targetFiles, {
    nodir: true,
    ignore: config.exclude.map((exclude) => path.join(config.input, exclude)),
  })

  await Promise.all(
    inputPaths
      .map(async (inputPath) => {
        const outputFilePath = config.getOutputPath(inputPath)
        const outputDir = path.dirname(outputFilePath)
        await makeDir(outputDir)
        const result = await config.task(inputPath)
        await writeFileAsync(outputFilePath, result)
      })
  )
}

module.exports = (options = {}, basePath = '') => {
  const config = new Config(options)
  return {
    renderMiddleware: renderMiddleware(config, basePath),
    buildAllFiles: buildAllFiles(config),
  }
}
