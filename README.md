# real-world-website-render-helper

## Installation

```bash
npm install -D yuheiy/real-world-website-render-helper
```

## Usage

```js
const pug = require('pug')
const {
  renderMiddleware: renderHtmlMiddleware,
  buildAllFiles: html,
} = require('real-world-website-render-helper')({
  input: './src/html',
  inputExt: 'pug',
  output: './dist',
  outputExt: 'html',
  exclude: ['**/_*', '**/_*/**'],
  task: (inputFilePath) => {
    return readPageData(inputFilePath)
      .then((data) => {
        return pug.renderFile(inputFilePath, data)
      })
  },
}, '/subdir')
```

## License

MIT
