'use strict'

/* eslint-env node, mocha */

// const expect = require('chai').expect;

// const catalog = require('./catalog.js');

describe('Product Catalog Processor Unit Tests', () => {
  let consoleLog
  before(() => {
    consoleLog = console.log
    console.log = () => {}
  })
  after(() => {
    console.log = consoleLog
  })
  it('should have some tests', () => {
  })
})
