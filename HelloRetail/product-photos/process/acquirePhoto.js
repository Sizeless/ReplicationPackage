'use strict'

const fs = require('fs')
const yaml = require('js-yaml') // eslint-disable-line import/no-extraneous-dependencies

module.exports = {
  shim: () => {
    const aquirePhoto = yaml.safeLoad(fs.readFileSync('./acquirePhoto.yml', 'utf8'))
    return JSON.stringify(aquirePhoto)
  },
}
