/*eslint-env es6 */
// timer testing shim
window.__TIMERS = [];
window.setTimeout = function (f, d) {
    window.__TIMERS.push([f, d]);
};
window.flushTimers = function (maxIterations) {
    const timers = window.__TIMERS;
    if (maxIterations === 0) {
        return;
    } else if (maxIterations === undefined) {
        maxIterations = 10;
    }
    window.__TIMERS = [];
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
    if (window.__TIMERS.length > 0) {
        window.flushTimers(maxIterations - 1);
    }
};

window.treetop.init({
    treetopAttr: false,
    mountAttrs: {
        test: sinon.spy(),
        test2: sinon.spy(),
    },
    unmountAttrs: {
        test: sinon.spy(),
        test2: sinon.spy(),
    },
    merge: {
        test: (next, prev) => {
            Array.from(next.children).forEach((child) => {
                treetop.mountChild(child, prev);
            });
        },
        "test-recursive-merge": (next, prev) => {
            treetop.merge(next, prev);
        },
    },
});
