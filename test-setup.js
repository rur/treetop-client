/*eslint-env node, es6 */
const jsdom = require("jsdom");
const sinon = require("sinon");

const DEFAULT_HTML = "<html><head><title>Default Title</title></head><body></body></html>";
const dom = new jsdom.JSDOM(DEFAULT_HTML)
global.document = dom.window.document
global.window = dom.window
global.window.requestAnimationFrame = sinon.spy();
global.window.cancelAnimationFrame = sinon.spy();
