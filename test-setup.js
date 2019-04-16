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
dom.window.navigator = {
    userAgent: "mock"
}


// globals
global.history = dom.window.history
global.Uint8Array = dom.window.Uint8Array

// timer testing shim
global.window.__TIMERS = []
global.window.setTimeout = function(f, d){
    global.window.__TIMERS.push([f, d])
}
global.window.flushTimers = function(maxIterations){
    const timers = global.window.__TIMERS
    if (maxIterations === 0){
        return
    } else if (maxIterations === undefined) {
        maxIterations = 10
    }
    global.window.__TIMERS = []
    // sort timeouts so that they are executed in the order
    // defined by their duration
    timers.sort(function compare(a, b) {
        if (a[1] < b[1]) {
            return -1;
        }
        if (a[1] > b[1]) {
            return 1;
        }
        return 0;
    });
    for (let i = 0; i < timers.length; i++) {
        timers[i][0]();
    }
    if (global.window.__TIMERS.length > 0) {
        global.window.flushTimers(maxIterations -1)
    }
}

global.window.TREETOP_CONFIG = {
    treetopAttr: false,
    mountAttrs: {
        "test": sinon.spy(),
        "test2": sinon.spy(),
    },
    unmountAttrs: {
        "test": sinon.spy(),
        "test2": sinon.spy()
    },
    merge: {
        "test": (next, prev) => {
            Array.from(next.children).forEach(child => {
                prev.appendChild(child);
            });
        }
    }
};