# real-world-website-render-helper

## Installation

```bash
npm install -D yuheiy/real-world-website-render-helper
```

## Usage

```js
const pug = require('pug')
const renderHelper = require('real-world-website-render-helper')
const browserSync = require('browser-sync').create()
const gulp = require('gulp')

const renderHelperConfig = {
    input: './src',
    inputExt: 'pug',
    output: './dist',
    outputExt: 'html',
    exclude: ['**/_*', '**/_*/**'],
    task: (pathname) => {
        return readPageData(pathname).then((data) => {
            return pug.renderFile(pathname, data)
        })
    },
}

const serve = (done) => {
    browserSync.init(
        {
            server: 'dist',
            middleware: renderHelper.createRenderMiddleware(renderHelperConfig),
        },
        done,
    )
}

gulp.task('default', serve)

const html = () => {
    return renderHelper.build(renderHelperConfig)
}

gulp.task('build', html)
```

## License

MIT
