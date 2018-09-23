/*eslint-env node, es6 */
const jsdom = require("jsdom");
const sinon = require("sinon");

const DEFAULT_HTML = "<html><head><title>Default Title</title></head><body></body></html>";
const dom = new jsdom.JSDOM(DEFAULT_HTML, {
    url: "http://www.example.com",
    referrer: "http://www.example.com",
    contentType: "text/html",
    userAgent: "node.js",
    includeNodeLocations: true
})
global.document = dom.window.document
global.window = dom.window
global.window.TREETOP_CONFIG = {
    treetopAttr: false,
    mountTags: {
        "test-node": sinon.spy()
    },
    mountAttrs: {
        "test": sinon.spy(),
        "test2": sinon.spy(),
    },
    unmountTags: {
        "test-node": sinon.spy()
    },
    unmountAttrs: {
        "test": sinon.spy(),
        "test2": sinon.spy()
    },
    compose: {
        "test": (next, prev) => {
            Array.from(next.children).forEach(child => {
                prev.appendChild(child);
            });
        }
    }
};