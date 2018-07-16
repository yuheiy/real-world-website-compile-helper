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
const browserSync = require('browser-sync')
const del = require('del')

const htmlRendererConfig = {
  input: 'src',
  inputExt: '.pug',
  output: 'dist',
  outputExt: '.html',
  exclude: ['**/_*', '**/_*/**'],
  render: ({ src, filename }) => {
    return readPageData(filename).then((pageData) => {
      return pug.render(String(src), { ...pageData, filename })
    })
  },
}

const serve = (done) => {
  const bs = browserSync.create()
  const renderHtmlMiddleware = renderHelper.createRenderMiddleware(
    htmlRendererConfig,
  )

  bs.init(
    {
      server: 'public',
      files: [
        {
          match: ['public', 'src/**/*.{pug,json}'],
          fn: bs.reload,
        },
      ],
      watchEvents: ['add', 'change', 'unlink'],
      middleware: renderHtmlMiddleware,
    },
    done,
  )
}

gulp.task('default', serve)

const clean = () => {
  return del('dist')
}

const html = () => {
  return renderHelper.build(htmlRendererConfig)
}

const copy = () => {
  return gulp.src('public/**/*').pipe(gulp.dest('dist'))
}

gulp.task('build', gulp.series(clean, gulp.parallel(html, copy)))
```

## Related Projects

- [Real world website boilerplate](https://github.com/yuheiy/real-world-website-boilerplate)
- [yuheiy.com](https://github.com/yuheiy/yuheiy.com)

## Thanks

Inspired by [ktsn/bs-compile-middleware](https://github.com/ktsn/bs-compile-middleware).
