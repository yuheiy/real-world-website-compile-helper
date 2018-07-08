const path = require('path')
const fs = require('fs')
const { promisify } = require('util')
const url = require('url')
const replaceExt = require('replace-ext')
const minimatch = require('minimatch')
const mime = require('mime')
const fg = require('fast-glob')
const makeDir = require('make-dir')

const readFileAsync = promisify(fs.readFile)
const writeFileAsync = promisify(fs.writeFile)

const toPosixPath = (pathname) => {
  if (path.sep === path.posix.sep) {
    return pathname
  }

  return pathname.replace(
    new RegExp(`\\${path.win32.sep}`, 'g'),
    path.posix.sep,
  )
}

const normalizePath = (pathname) => {
  const isDirectory = /\/$/.test(pathname)
  return isDirectory ? path.join(pathname, 'index.html') : pathname
}

const defaultOptions = {
  input: './src',
  output: './dist',
  exclude: ['**/_*', '**/_*/**'],
}

const loadConfig = (options = {}) => {
  options = {
    ...defaultOptions,
    ...options,
  }

  if (typeof options.input !== 'string') {
    throw new TypeError('options.input must be a string')
  }

  if (typeof options.inputExt !== 'string') {
    throw new TypeError('options.inputExt must be a string')
  }

  if (typeof options.output !== 'string') {
    throw new TypeError('options.output must be a string')
  }

  if (typeof options.outputExt !== 'string') {
    throw new TypeError('options.outputExt must be a string')
  }

  if (
    !(
      Array.isArray(options.exclude) &&
      options.exclude.every((pattern) => typeof pattern === 'string')
    )
  ) {
    throw new TypeError(
      'options.exclude must be a array, and all elements must be a string',
    )
  }

  if (typeof options.render !== 'function') {
    throw new TypeError('options.render must be a function')
  }

  const input = path.normalize(options.input)
  const inputExt = options.inputExt
  const output = path.normalize(options.output)
  const outputExt = options.outputExt
  const exclude = options.exclude
  const render = options.render

  return {
    input,
    inputExt,
    output,
    outputExt,
    exclude,
    render,
  }
}

const withConfig = (fn) => (options, ...args) => {
  return fn(loadConfig(options), ...args)
}

const createRenderMiddleware = withConfig((config, basePath = '') => {
  const getInputPath = (outputPath) => {
    return replaceExt(
      path.join(config.input, outputPath),
      `.${config.inputExt}`,
    )
  }

  const isExcluded = (inputPath) => {
    const pathname = path.join(config.input, inputPath)
    return config.exclude.some((pattern) => minimatch(pathname, pattern))
  }

  const pathPrefix = toPosixPath(path.join(basePath, '/'))

  const renderMiddleware = (req, res, next) => {
    const parsedPath = url.parse(req.url).pathname
    const reqPath = toPosixPath(normalizePath(parsedPath))

    if (!reqPath.startsWith(pathPrefix)) {
      return next()
    }

    let outputPath = reqPath.replace(pathPrefix, '')
    if (!path.extname(reqPath) && config.outputExt === 'html') {
      outputPath += `.${config.outputExt}`
    }
    const inputPath = getInputPath(outputPath)
    const isReqFileExists =
      fs.existsSync(inputPath) && fs.statSync(inputPath).isFile()

    if (!isReqFileExists) {
      return next()
    }

    if (isExcluded(inputPath)) {
      return next()
    }

    readFileAsync(inputPath)
      .then((fileData) => config.render({ src: fileData, filename: inputPath }))
      .then((result) => {
        res.setHeader('Content-Type', mime.getType(outputPath))
        res.end(result)
      })
  }

  return renderMiddleware
})

const build = withConfig(async (config) => {
  const getOutputPath = (inputPath) => {
    return replaceExt(
      inputPath.replace(config.input, config.output),
      `.${config.outputExt}`,
    )
  }

  const targetPattern = path.join(config.input, `**/*.${config.inputExt}`)
  const inputPaths = (await fg(targetPattern, {
    ignore: config.exclude.map((pattern) =>
      toPosixPath(path.join(config.input, pattern)),
    ),
  })).map(path.normalize)

  return Promise.all(
    inputPaths.map(async (inputPath) => {
      const outputFilePath = getOutputPath(inputPath)
      const outputDir = path.dirname(outputFilePath)
      await makeDir(outputDir)
      const fileData = await readFileAsync(inputPath)
      const result = await config.render({
        src: fileData,
        filename: inputPath,
      })
      return writeFileAsync(outputFilePath, result)
    }),
  )
})

module.exports = {
  createRenderMiddleware,
  build,
}
