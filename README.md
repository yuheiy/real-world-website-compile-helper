# real-world-website-render-helper

## Installation

```bash
npm install -D yuheiy/real-world-website-render-helper
```

## Usage

```js
const renderHelper = require('real-world-website-render-helper')
const gulp = require('gulp')
const pug = require('pug')
const browserSync = require('browser-sync').create()
const del = require('del')

const renderHelperConfig = {
    input: 'src',
    inputExt: 'pug',
    output: 'dist',
    outputExt: 'html',
    exclude: ['**/_*', '**/_*/**'],
    render: ({ src, filename }) => {
        return readPageData(filename).then((pageData) => {
            return pug.render(src, { ...pageData, filename })
        })
    },
}

const serve = (done) => {
    browserSync.init(
        {
            server: true,
            middleware: renderHelper.createRenderMiddleware(renderHelperConfig),
        },
        done,
    )
}

const watch = (done) => {
    const options = {
        delay: 50,
    }

    const reload = (done) => {
        browserSync.reload()
        done()
    }

    gulp.watch('src/**/*', options, reload)
    done()
}

gulp.task('default', gulp.series(serve, watch))

const clean = () => {
    return del('dist')
}

const html = () => {
    return renderHelper.build(renderHelperConfig)
}

gulp.task('build', gulp.series(clean, html))
```

## License

MIT
