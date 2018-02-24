const path = require('path')
const fs = require('fs')
const { promisify } = require('util')
const url = require('url')
const minimatch = require('minimatch')
const mime = require('mime')
const globby = require('globby')
const makeDir = require('make-dir')

const readFileAsync = promisify(fs.readFile)
const writeFileAsync = promisify(fs.writeFile)

const normalizePath = (pathname) => {
    const isDirectory = /\/$/.test(pathname)
    return isDirectory ? path.join(pathname, 'index.html') : pathname
}

const loadConfig = (options = {}) => {
    const input = path.normalize(options.input || './src')
    const inputExt = options.inputExt
    const output = path.normalize(options.output || './dist')
    const outputExt = options.outputExt
    const exclude = options.exclude || ['**/_*', '**/_*/**']
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

const withConfig = (fn) => (options, ...args) =>
    fn(loadConfig(options), ...args)

const createRenderMiddleware = withConfig((config, basePath = '') => {
    const getInputPath = (outputPath) => {
        const dirname = path.join(config.input, path.dirname(outputPath))
        const basename = path.basename(outputPath, `.${config.outputExt}`)
        return path.join(dirname, `${basename}.${config.inputExt}`)
    }

    const isExcluded = (inputPath) => {
        const pathname = path.join(config.input, inputPath)
        return config.exclude.some((pattern) => minimatch(pathname, pattern))
    }

    const pathPrefix = `${basePath}/`

    const renderMiddleware = (req, res, next) => {
        const parsedPath = url.parse(req.url).pathname
        const reqPath = normalizePath(parsedPath)

        if (!reqPath.startsWith(pathPrefix)) {
            return next()
        }

        const outputPath = reqPath.replace(pathPrefix, '')
        const inputPath = getInputPath(outputPath)
        const isReqFileExists =
            fs.existsSync(inputPath) && fs.statSync(inputPath).isFile()

        if (!isReqFileExists) {
            return next()
        }

        if (isExcluded(inputPath)) {
            return next()
        }

        readFileAsync(inputPath, 'utf8')
            .then((fileData) =>
                config.render({ src: fileData, filename: inputPath }),
            )
            .then((result) => {
                res.setHeader('Content-Type', mime.getType(outputPath))
                res.end(result)
            })
    }

    return renderMiddleware
})

const build = withConfig(async (config) => {
    const getOutputPath = (inputPath) => {
        const dirname = path.dirname(
            inputPath.replace(config.input, config.output),
        )
        const basename = path.basename(inputPath, `.${config.inputExt}`)
        return path.join(dirname, `${basename}.${config.outputExt}`)
    }

    const targetPattern = path.join(config.input, `**/*.${config.inputExt}`)
    const inputPaths = await globby(targetPattern, {
        nodir: true,
        ignore: config.exclude.map((pattern) =>
            path.join(config.input, pattern),
        ),
    })

    return Promise.all(
        inputPaths.map(async (inputPath) => {
            const outputFilePath = getOutputPath(inputPath)
            const outputDir = path.dirname(outputFilePath)
            await makeDir(outputDir)
            const fileData = await readFileAsync(inputPath, 'utf8')
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
