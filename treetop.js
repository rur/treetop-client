/* global window, document, XMLHttpRequest, ActiveXObject, history, setTimeout, Uint8Array */

// Web browser client API for [Treetop request library](https://github.com/rur/treetop).
//
// For an introduction and API docs see https://github.com/rur/treetop-client
//
// This script is written with the following goals:
//      1. Work out-of-the-box, without a build tool or wrapper;
//      2. Maximize compatibility for both modern and legacy browsers;
//      3. Minimize browser footprint to accommodate the use of other JS libraries and frameworks.
//
// Compatibility Caveats
//      The following modern browser APIs are essential. A 'polyfil' must available when necessary.
//       * `history.pushState` is required so that the location can be updated following partial navigation;
//       * `HTMLTemplateElement` is required for reliable decoding of HTML strings.
//
// Global browser footprint of this script:
//      * Assigns `window.treetop` with Treetop API instance;
//      * Assigns `window.onpopstate` with a handler that refreshes the page when a treetop entry is popped from the browser history;
//      * Built-in components attach various event listeners when mounted. (Built-ins can be disabled, see docs)
//

window.treetop = (function ($, BodyComponent, FormSerializer) {
    "use strict";
    if (window.treetop !== void 0) {
        // throwing an error here is important since it prevents window.treetop from being reassigned
        throw Error("Treetop: treetop global is already defined");
    }

    // First check browser support for essential modern features
    if (typeof window.HTMLTemplateElement === "undefined") {
        throw Error("Treetop: HTMLTemplateElement not supported, a polyfil should be used");
    }
    if (!$.supportsHistory()) {
        throw Error("Treetop: HTML5 History pushState not supported, a polyfil should be used");
    }

    function init(_config) {
        var config = _config instanceof Object ? _config : {};

        // Feature flags for built-in component. Note default values.
        var treetopAttr = true;
        var treetopLinkAttr = true;

        for (var key in config) {
            if (!config.hasOwnProperty(key)) {
                continue;
            }
            switch (key.toLowerCase()) {
            case "mountattr":
            case "mountattrs":
                $.mountAttrs = $.copyConfig(config[key]);
                break;
            case "unmountattr":
            case "unmountattrs":
                $.unmountAttrs = $.copyConfig(config[key]);
                break;
            case "merge":
                $.merge = $.copyConfig(config[key]);
                break;
            case "onnetworkerror":
                if (typeof config[key] === "function") {
                    $.onNetworkError = config[key];
                }
                break;
            case "onunsupported":
                if (typeof config[key] === "function") {
                    $.onUnsupported = config[key];
                }
                break;
            case "treetopattr":
                treetopAttr = !(config[key] === false);
                continue;
            case "treetoplinkattr":
                treetopLinkAttr = !(config[key] === false);
                continue;
            case "mounttags":
            case "unmounttags":
                try {
                    throw new Error("Treetop: Mounting components based upon tag name is no longer supported");
                } catch (err) {
                    // throw error later allowing init to finish its work
                    $.throwErrorAsync(err);
                }
                break;
            default:
                try {
                    throw new Error("Treetop: unknown configuration property '" + key + "'");
                } catch (err) {
                    // throw error later allowing init to finish its work
                    $.throwErrorAsync(err);
                }
            }
        }

        // Add built-in component to configuration.
        // Notice that conflicting custom components will be clobbered.
        if (treetopAttr) {
            document.body.setAttribute("treetop-attr", "enabled")
            $.mountAttrs["treetop-attr"] = BodyComponent.bodyMount;
        }
        if (treetopLinkAttr) {
            $.mountAttrs["treetop-link"] = BodyComponent.linkMount;
        }

        window.onpopstate = function (evt) {
            // Taken from https://github.com/ReactTraining/history/blob/master/modules/createBrowserHistory.js
            var stateFromHistory = (history && history.state) || null;
            var isPageLoadPopState = (evt.state === null) && !!stateFromHistory;

            // Ignore extraneous popstate events in WebKit.
            if (isPageLoadPopState || $.isExtraneousPopstateEvent(evt)) {
                return;
            }
            if (!history.state || !history.state.treetop) {
                // not a treetop state, skip
                return
            }
            $.browserPopState(evt);
        };

        // normalize initial history state
        history.replaceState({treetop: true}, window.document.title, window.location.href)
        $.mount(document.body);
    }

    /**
     * Treetop API Constructor
     *
     * @constructor
     */
    function Treetop() {}

    var initialized = false;
    /**
     * Configure treetop and mount document.body.
     *
     * @param  {Object} config Dict containing complete page configuration.
     * @throws  {Error} If a config property isn't recognized or `init` was
     *                  triggered previously
     */
    Treetop.prototype.init = function(config) {
        // Since the DOM is 'stateful', mounting is not a
        // reversible operation. It is crucial therefore that
        // the initial setup process only ever happens once during
        // the lifetime of a page. After that elements will only
        // be mounted and unmounted when being attached or detached
        // from the DOM.
        if (initialized) {
            throw Error("Treetop: Failed attempt to re-initialize. Treetop client is already in use.");
        }
        initialized = true;
        // see https://plainjs.com/javascript/events/running-code-when-the-document-is-ready-15/
        if (document.readyState != "loading") {
            // async used for the sake of consistency with other conditions
            setTimeout(function () {
                init(config);
            });
        } else if (document.addEventListener) {
            // modern browsers
            document.addEventListener("DOMContentLoaded", function(){
                init(config);
            });
        } else {
            // IE <= 8
            document.attachEvent("onreadystatechange", function(){
                if (document.readyState == "complete") init(config);
            });
        }
    };

    /**
     * Update a existing DOM node with a new element. The elements will be merged
     * and (un)mounted in the normal Treetop way.
     *
     * @param {HTMLElement} next: HTMLElement, not yet attached to the DOM
     * @param {HTMLElement} prev: node currently attached to the DOM
     *
     * @throws Error if the elements provided are not valid in some obvious way
     */
    Treetop.prototype.updateElement = function (next, prev) {
        // make sure an error is raise if initialization happens after the API is used
        initialized = true;
        if (!next || !prev) {
            throw new Error("Treetop: Expecting two HTMLElements");
        } else if (!prev.parentNode) {
            throw new Error(
                "Treetop: Cannot update an element that is not attached to the DOM"
            );
        }
        $.updateElement(next, prev);
    };


    /**
     * Appends a node to a parent and mounts treetop components.
     *
     * TODO: Needs a test case
     *
     * @param {HTMLElement} child: HTMLElement, not yet attached to the DOM
     * @param {HTMLElement} mountedParent: node currently attached to the DOM
     *
     * @throws Error if the elements provided are not valid in some obvious way
     */
    Treetop.prototype.mountChild = function(child, mountedParent) {
        if (!child || !mountedParent) {
            throw new Error("Treetop: Expecting two HTMLElements");
        }
        mountedParent.appendChild(child);
        $.mount(child);
    };

    /**
     * Inserts new node as a sibling after an element already attache to a parent node.
     * The new node will be mounted.
     *
     * TODO: Needs a test case
     *
     * @param {HTMLElement} newSibling: HTMLElement, not yet attached to the DOM
     * @param {HTMLElement} mountedSibling: node currently attached to the DOM
     *
     * @throws Error if the elements provided are not valid in some obvious way
     */
    Treetop.prototype.mountAfter = function(newSibling, mountedSibling) {
        if (!newSibling || !mountedSibling) {
            throw new Error("Treetop: Expecting two HTMLElements");
        } else if (!mountedSibling.parentNode) {
            throw new Error(
                "Treetop: Cannot mount after a sibling node that is not attached to a parent."
            );
        }
        mountedSibling.parentNode.insertAfter(newSibling, mountedSibling);
        $.mount(newSibling);
    };

    /**
     * Inserts new node as a sibling before an element already attached to a parent node.
     * The new node will be mounted.
     *
     * TODO: Needs a test case
     *
     * @param {HTMLElement} newSibling: HTMLElement, not yet attached to the DOM
     * @param {HTMLElement} mountedSibling: node currently attached to the DOM
     *
     * @throws Error if the elements provided are not valid in some obvious way
     */
    Treetop.prototype.mountBefore = function(newSibling, mountedSibling) {
        if (!newSibling || !mountedSibling) {
            throw new Error("Treetop: Expecting two HTMLElements");
        } else if (!mountedSibling.parentNode) {
            throw new Error(
                "Treetop: Cannot mount before a sibling node that is not attached to a parent."
            );
        }
        mountedSibling.parentNode.insertBefore(newSibling, mountedSibling);
        $.mount(newSibling);
    };

    /**
     * Removes and un-mounts an element from the DOM
     *
     * TODO: Needs a test case
     *
     * @param {HTMLElement} mountedElement: HTMLElement, not attached and mounted to the DOM
     *
     * @throws Error if the elements provided is not attached to a parent node
     */
    Treetop.prototype.unmount = function(mountedElement) {
        if (!mountedElement.parentNode) {
            throw new Error(
                "Treetop: Cannot unmount a node that is not attached to a parent."
            );
        }
        mountedElement.parentNode.removeChild(mountedElement);
        $.unmount(mountedElement);
    };

    /**
     * Get a copy of the treetop configuration,
     * useful for debugging.
     *
     * Note, mutating this object will not affect the configuration.
     *
     * @returns {Object} copy of internal configuration
     */
    Treetop.prototype.config = function () {
        return {
            mountAttrs: $.copyConfig($.mountAttrs),
            unmountAttrs: $.copyConfig($.unmountAttrs),
            merge: $.copyConfig($.merge),
            onNetworkError: $.onNetworkError,
            onUnsupported: $.onUnsupported,
        };
    };


    /**
     * Send XHR request to Treetop endpoint. The response is handled
     * internally, the response is handled internally.
     *
     * @public
     * @param  {string} method The request method GET|POST|...
     * @param  {string} url    The url
     * @param  {string} body   Encoded request body
     * @param  {string} contentType    Encoding of the request body
     * @param  {array} headers    List of header field-name and field-value pairs
     */
    Treetop.prototype.request = function (method, url, body, contentType, headers) {
        // make sure an error is raise if initialization happens after the API is used
        initialized = true;
        if (!$.METHODS[method.toUpperCase()]) {
            throw new Error("Treetop: Unknown request method '" + method + "'");
        }

        var xhr = $.createXMLHTTPObject();
        if (!xhr) {
            throw new Error("Treetop: XHR is not supported by this browser");
        }
        var requestID = $.lastRequestID = $.lastRequestID + 1;
        xhr.open(method.toUpperCase(), url, true);
        if (headers instanceof Array) {
            for (var i = 0; i < headers.length; i++) {
                xhr.setRequestHeader(headers[i][0], headers[i][1]);
            }
        }
        xhr.setRequestHeader("accept", [$.PARTIAL_CONTENT_TYPE, $.FRAGMENT_CONTENT_TYPE].join(", "));
        if (contentType) {
            xhr.setRequestHeader("content-type", contentType);
        }
        xhr.onreadystatechange = function() {
            if (xhr.readyState !== 4) {
                return;
            }
            $.endRequest(requestID);
            if (xhr.status < 100) {
                // error occurred, do not attempt to process contents
                return;
            }
            // check if the response can be processed by treetop client library,
            // otherwise trigger 'onUnsupported' signal
            if (xhr.getResponseHeader("x-treetop-see-other") !== null) {
                // Redirect browser window
                window.location = xhr.getResponseHeader("x-treetop-see-other");

            } else if (xhr.getResponseHeader("content-type") === $.PARTIAL_CONTENT_TYPE) {
                // this response is part of a larger page, add a history entry before processing
                var responseURL = xhr.getResponseHeader("x-response-url") || xhr.responseURL;
                // NOTE: This HTML5 feature will require a polyfil for some browsers
                history.pushState({
                    treetop: true,
                }, "", responseURL);
                $.xhrProcess(xhr, requestID, true);

            } else if(xhr.getResponseHeader("content-type") === $.FRAGMENT_CONTENT_TYPE) {
                // this is a fragment response, just process the update
                $.xhrProcess(xhr, requestID, false);

            } else if(typeof $.onUnsupported === "function") {
                // Fall through; this is not a response that treetop supports.
                // Allow developer to handle.
                $.onUnsupported(xhr, url);
            }
        };
        xhr.onerror = function () {
            if(typeof $.onNetworkError === "function") {
                // Network level error, likely a connection problem
                $.onNetworkError(xhr);
            }
        };
        xhr.send(body || null);
        $.startRequest(requestID);
    };

    /**
     * treetop.submit will trigger an XHR request derived from the state
     * of a supplied HTML Form element. Request will be sent asynchronously.
     *
     * @public
     * @param {HTMLFormElement} formElement Reference to a HTML form element whose state is to be encoded into a treetop request
     * @throws {Error} If an XHR request cannot derived from the element supplied for any reason.
     */
    Treetop.prototype.submit = function (formElement) {
        var api = this;
        initialized = true;  // ensure that late arriving configuration will be rejected
        function dataHandler(method, action, data, enctype) {
            api.request(method, action, data, enctype);
        }
        new FormSerializer(formElement, dataHandler);
    };

    Treetop.prototype.PARTIAL_CONTENT_TYPE = $.PARTIAL_CONTENT_TYPE;
    Treetop.prototype.FRAGMENT_CONTENT_TYPE = $.FRAGMENT_CONTENT_TYPE;

    var api = new Treetop();
    if (window.hasOwnProperty("TREETOP_CONFIG")) {
        // support passive initialization
        api.init(window.TREETOP_CONFIG);
    }
    // api
    return api;
}({
    //
    // Treetop Internal
    //
    /**
     * Store configuration
     */
    mountTags: {},
    mountAttrs: {},
    unmountTags: {},
    unmountAttrs: {},
    onUnsupported: null,
    onNetworkError: null,

    /**
     * Store the treetop custom merge functions
     * @type {Object} object reference
     */
    merge: {},

    /**
     * Track order of requests as well as the elements that were updated.
     * This is necessary because under certain situations late arriving
     * responses should be ignored.
     */
    lastRequestID: 0,
    /**
     * Dictionary is used to track the last request ID that was successfully resolved
     * to a given element "id"
     */
    updates: {},

    /**
     * Track the number of active XHR requests.
     */
    activeCount: 0,

    /**
     * White-list of request methods types
     * @type {Array}
     */
    METHODS: {"POST": true, "GET": true, "PUT": true, "PATCH": true, "DELETE": true},

    /**
     * List of HTML element for which there can be only one
     * @type {Array}
     */
    SINGLETONS: {"TITLE": true},

    /**
     * Content-Type for Treetop partials
     *
     * This will be set as the `Accept` header for Treetop mediated XHR requests. The
     * server must respond with the same value as `Content-Type` or a client error result.
     *
     * With respect to the media type value, we are taking advantage of the unregistered 'x.' tree while
     * Treetop is a proof-of-concept project. Should a stable API emerge at a later point, then registering a personal
     * or vendor MEME-type would be considered. See https://tools.ietf.org/html/rfc6838#section-3.4
     *
     * @type {String}
     */
    PARTIAL_CONTENT_TYPE: "application/x.treetop-html-partial+xml",
    FRAGMENT_CONTENT_TYPE: "application/x.treetop-html-fragment+xml",

    START: "treetopstart",
    COMPLETE: "treetopcomplete",

    startRequest: function () {
        this.activeCount++;
        if (this.activeCount === 1) {
            var event = document.createEvent("Event");
            event.initEvent(this.START, false, false);
            document.dispatchEvent(event);
        }
    },

    endRequest: function () {
        this.activeCount--;
        if (this.activeCount === 0) {
            var event = document.createEvent("Event");
            event.initEvent(this.COMPLETE, false, false);
            document.dispatchEvent(event);
        }
    },

    /**
     * XHR onload handler
     *
     * This will convert the response HTML into nodes and
     * figure out how to attached them to the DOM
     *
     * @param {XMLHttpRequest} xhr The xhr instance used to make the request
     * @param {number} requestID The number of this request
     * @param {boolean} isPagePartial Flag which will be true if the request response is part of a page
     */
    xhrProcess: function (xhr, requestID, isPagePartial) {
        "use strict";
        var $ = this;
        var i, len, temp, neu, old, nodes, matches;
        i = len = temp = neu = old = nodes = matches = undefined;

        // this will require a polyfil for browsers that do not support HTMLTemplateElement
        temp = document.createElement("template");
        temp.innerHTML = xhr.responseText;
        nodes = new Array(temp.content.children.length);
        for (i = 0, len = temp.content.children.length; i < len; i++) {
            nodes[i] = temp.content.children[i];
        }
        matches = []
        for (i = 0, len = nodes.length; i < len; i++) {
            neu = nodes[i];
            if ($.SINGLETONS[neu.tagName.toUpperCase()]) {
                old = document.getElementsByTagName(neu.nodeName)[0];
            } else if (neu.id) {
                old = document.getElementById(neu.id);
            } else {
                old = null;
            }
            // check that an existing node was found, and that this node
            // has not already been updated by a more recent request
            if (old && requestID >= $.getLastUpdate(old)) {
                if (isPagePartial) {
                    $.updates["BODY"] = requestID;
                } else if (neu.id) {
                    $.updates["#" + neu.id] = requestID;
                }
                matches.push(neu, old)
            }
        }
        for (i = 0; i < matches.length; i += 2) {
            $.updateElement(matches[i], matches[i+1]);
        }
    },

    /**
     * document history pop state event handler
     *
     * @param {PopStateEvent} e
     */
    browserPopState: function () {
        "use strict";
        // force browser to refresh the page when the back
        // nav is triggered, seems to be the best thing to do
        window.location.reload();
    },

    /**
     * Given a HTMLELement node attached to the DOM, this will
     * the most recent update requestID for this node and all of its
     * parent nodes.
     *
     * @param node (HTMLElement)
     * @returns number: the most recent request ID that either this or one of
     *                  its ancestor nodes were updated
     */
    getLastUpdate: function(node) {
        var updatedID = 0;
        var parentUpdate = 0;
        if (node === document.body) {
            if ("BODY" in this.updates) {
                updatedID = this.updates["BODY"];
            }
            // dont descent further
            return updatedID;
        } else if (node.id && "#" + node.id in this.updates) {
            updatedID = this.updates["#" + node.id];
        }
        if (node.parentNode) {
            parentUpdate = this.getLastUpdate(node.parentNode);
            if (parentUpdate > updatedID) {
                return parentUpdate;
            }
        }
        return updatedID;
    },

    /**
     * Default treetop merge method. Replace element followed by sync
     * mount of next and unmount of previous elements.
     *
     * @param  {HTMLElement} next The element recently loaded from the API
     * @param  {HTMLElement} prev The element currently within the DOM
     */
    defaultComposition: function(next, prev) {
        this.unmount(prev);
        prev.parentNode.replaceChild(next, prev);
        this.mount(next);
    },

    /**
     * Apply a recently loaded element to an existing one attached to the DOM
     *
     * @param  {HTMLElement} next The element recently loaded from the API
     * @param  {HTMLElement} prev The element currently within the DOM
    */
    updateElement: function(next, prev) {
        var $ = this;
        var nextValue = next.getAttribute("treetop-merge");
        var prevValue = prev.getAttribute("treetop-merge");
        if (typeof nextValue === "string" &&
            typeof prevValue === "string" &&
            nextValue !== ""
        ) {
            nextValue = nextValue.toLowerCase();
            prevValue = prevValue.toLowerCase();
            if (
              nextValue === prevValue &&
              $.merge.hasOwnProperty(nextValue) &&
              typeof $.merge[nextValue] === "function"
            ) {
                // all criteria have been met, delegate update to custom merge function.
                var mergeFn = $.merge[nextValue];
                mergeFn(next, prev);
                return;
            }
        }
        $.defaultComposition(next, prev);
    },

    /**
     * Trigger mount on provided element and all children in
     * depth first order.
     *
     * @param  {HTMLElement} el
     */
    mount: function (el) {
        "use strict";
        var $ = this;
        var i, j, comp, name;
        if (el.nodeType !== 1) {
            // this is not an ELEMENT_NODE
            return;
        }
        // depth-first recursion
        for (i = 0; i < el.children.length; i++) {
            $.mount(el.children[i]);
        }
        // mount attribute components
        for (j = el.attributes.length - 1; j >= 0; j--) {
            name = el.attributes[j].name.toLowerCase();
            if ($.mountAttrs.hasOwnProperty(name)) {
                comp = $.mountAttrs[name];
                if (typeof comp === "function") {
                    try {
                        comp(el);
                    } catch (err) {
                        $.throwErrorAsync(err)
                    }
                }
            }
        }
    },

    /**
     * Trigger unmount on provided element and all children in
     * depth first order.
     *
     * @param  {HTMLElement} el
     */
    unmount: function (el) {
        "use strict";
        var $ = this;
        var i, j, comp, name;
        if (el.nodeType !== 1) {
            // this is not an ELEMENT_NODE
            return;
        }
        // depth first recursion
        for (i = 0; i < el.children.length; i++) {
            $.unmount(el.children[i]);
        }
        // unmount attribute components
        for (j = el.attributes.length - 1; j >= 0; j--) {
            name = el.attributes[j].name.toLowerCase();
            if ($.unmountAttrs.hasOwnProperty(name)) {
                comp = $.unmountAttrs[name];
                if (typeof comp === "function") {
                    try {
                        comp(el);
                    } catch (err) {
                        $.throwErrorAsync(err)
                    }
                }
            }
        }
    },

    // see https://www.quirksmode.org/js/xmlhttp.html
    XMLHttpFactories: [
        function () {return new XMLHttpRequest();},
        function () {return new ActiveXObject("Msxml2.XMLHTTP");},
        function () {return new ActiveXObject("Msxml3.XMLHTTP");},
        function () {return new ActiveXObject("Microsoft.XMLHTTP");}
    ],

    createXMLHTTPObject: function() {
        var xmlhttp = false;
        for (var i = 0; i < this.XMLHttpFactories.length; i++) {
            try {
                xmlhttp = this.XMLHttpFactories[i]();
            }
            catch (e) {
                continue;
            }
            break;
        }
        return xmlhttp;
    },

    /**
     * Create copy of config object, all keys are transformed to lowercase.
     * Non-function type config values will be ignored.
     *
     * @param {object} source Dict {String => Function}
     *
     */
    copyConfig: function (source) {
        var target = {};
        // snippet from
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign#Polyfill
        for (var key in source) {
            if (typeof source[key] !== "function") {
                continue;
            }
            // Avoid bugs when hasOwnProperty is shadowed
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                target[key.toLowerCase()] = source[key];
            }
        }
        return target;
    },

    /**
     * Used to throw non-fatal errors.
     *
     * @param {Error} err Error instance to rethrow
     */
    throwErrorAsync: function(err) {
        setTimeout(function(){
            throw err;
        });
    },


    /**
     * Returns true if the HTML5 history API is supported. Taken from Modernizr via ReactTraining.
     *
     * https://github.com/ReactTraining/history/blob/master/LICENSE
     * https://github.com/ReactTraining/history/blob/master/modules/DOMUtils.js
     * https://github.com/Modernizr/Modernizr/blob/master/LICENSE
     * https://github.com/Modernizr/Modernizr/blob/master/feature-detects/history.js
     */
    supportsHistory: function() {
        var ua = window.navigator.userAgent

        if ((ua.indexOf('Android 2.') !== -1 || ua.indexOf('Android 4.0') !== -1) &&
        ua.indexOf('Mobile Safari') !== -1 &&
        ua.indexOf('Chrome') === -1 &&
        ua.indexOf('Windows Phone') === -1
        ) {
            return false;
        }
        return window.history && 'pushState' in window.history
    },
    /**
     * Taken from ReactTraining history.
     * https://github.com/ReactTraining/history/blob/master/LICENSE
     * https://github.com/ReactTraining/history/blob/master/modules/DOMUtils.js
     *
     * Returns true if a given popstate event is an extraneous WebKit event.
     * Accounts for the fact that Chrome on iOS fires real popstate events
     * containing undefined state when pressing the back button.
     *
     */
    isExtraneousPopstateEvent: function (event) {
        return event.state === undefined && window.navigator.userAgent.indexOf('CriOS') === -1;
    }


}, (function ($) {
    "use strict";

    function _attrEquals(el, attr, expect) {
        if (el && typeof el.hasAttribute === "function" && el.hasAttribute(attr)) {
            var value = el.getAttribute(attr);
            if (!value && !expect) {
                return true;
            } else if (typeof value === "string" && typeof expect === "string") {
                return value.toLowerCase() === expect.toLowerCase();
            }
        }
        return false;
    }

    /**
     * This is the implementation of the 'treetop' attributes what can be used to overload
     * html anchors and form elements. It works by registering event handlers on
     * the body element.
     *
     * @type {Object} dictionary with 'mount' and 'unmount' function
     *
     */
    // handlers:
    function documentClick(_evt) {
        if (!_attrEquals(document.body, "treetop-attr", "enabled")) {
            return
        }
        var evt = _evt || window.event;
        var elm = evt.target || evt.srcElement;
        while (elm.tagName.toUpperCase() !== "A") {
            if (elm.parentElement) {
                elm = elm.parentElement;
            } else {
                return; // this is not an anchor click
            }
        }
        $.anchorClicked(evt, elm);
    }

    function updateModifiers(_kevt) {
        var kevt = _kevt || window.event;
        $.shiftKey =  kevt.shiftKey;
        $.ctrlKey =  kevt.ctrlKey;
        $.metaKey =  kevt.metaKey;
    }

    function onSubmit(_evt) {
        if (!_attrEquals(document.body, "treetop-attr", "enabled")) {
            return
        }
        var evt = _evt || window.event;
        var elm = evt.target || evt.srcElement;
        $.formSubmit(evt, elm);
    }

    function linkClick(_evt) {
        var evt = _evt || window.event;
        var elm = evt.currentTarget;
        if (elm && elm.hasAttribute("treetop-link")) {
            var href = elm.getAttribute("treetop-link");
            window.treetop.request("GET", href);
        }
    }

    /**
     * treetop event delegation component definition
     */
    return {
        bodyMount: function (el) {
            if (el.addEventListener) {
                el.addEventListener("click", documentClick, false);
                el.addEventListener("submit", onSubmit, false);
                el.addEventListener("keydown", updateModifiers, false);
                el.addEventListener("keyup", updateModifiers, false);
            } else if (el.attachEvent) {
                el.attachEvent("onclick", documentClick);
                el.attachEvent("onsubmit", onSubmit);
                el.attachEvent("onkeydown", updateModifiers);
                el.attachEvent("onkeyup", updateModifiers);
            } else {
                throw new Error("Treetop Events: Event delegation is not supported in this browser!");
            }
        },
        linkMount: function (el) {
            if (el.addEventListener) {
                el.addEventListener("click", linkClick, false);
            } else if (el.attachEvent) {
                el.attachEvent("onclick", linkClick);
            } else {
                throw new Error("Treetop Events: Event delegation is not supported in this browser!");
            }
        }
    };
}({
    //
    // Body Component internal state
    //

    // track modifier key state
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,

    /**
     * document submit event handler
     *
     * @param {Event} evt
     */
    anchorClicked: function (evt, elm) {
        "use strict";
        if (this.shiftKey || this.ctrlKey || this.metaKey ||
            (elm.getAttribute("treetop") || "").toLowerCase() === "disabled"
        ) {
            // Use default browser behavior when a modifier key is pressed
            // or treetop has been explicity disabled
            return;
        }
        if (elm.href && elm.hasAttribute("treetop")) {
            // hijack standard link click, extract href of link and
            // trigger a Treetop XHR request instead
            evt.preventDefault();
            window.treetop.request("GET", elm.href);
            return false;
        }
    },

    /**
     * document submit event handler
     *
     * @param {Event} evt
     */
    formSubmit: function (evt, elm) {
        "use strict";
        if (elm.action && elm.hasAttribute("treetop") && elm.getAttribute("treetop").toLowerCase() != "disabled") {
            evt.preventDefault();

            // Serialize HTML form including file inputs and trigger a treetop request.
            // The request will be executed asynchronously.
            // TODO: If an error occurs during serialization there should be some logging/recovery mechanism in the API
            window.treetop.submit(elm);

            return false;
        }
    },

})),
/**
 * FormSerializer library is used to convert HTML Form data for use in XMLHTTPRequests
 */
(function () {
    "use strict";
    /**
     * techniques:
     */
    var URLEN_GET = 0;   // GET method
    var URLEN_POST = 1;  // POST method, enctype is application/x-www-form-urlencoded (default)
    var PLAIN_POST = 2;  // POST method, enctype is text/plain
    var MULTI_POST = 3;  // POST method, enctype is multipart/form-data

    /**
     * @private
     * @constructor
     * @param {FormElement}   elm       The form to be serialized
     * @param {Function}      callback  Called when the serialization is complete (may be sync or async)
     */
    function FormSerializer(elm, callback) {
        if (!(this instanceof FormSerializer)) {
            return new FormSerializer(elm, callback);
        }

        var nFile, sFieldType, oField, oSegmReq, oFile;
        var bIsPost = elm.method.toLowerCase() === "post";
        var fFilter = window.encodeURIComponent;

        this.onRequestReady = callback;
        this.receiver = elm.action;
        this.status = 0;
        this.segments = [];

        if (bIsPost) {
            this.contentType = elm.enctype ? elm.enctype : "application\/x-www-form-urlencoded";
            switch (this.contentType) {
            case "multipart\/form-data":
                this.technique = MULTI_POST;

                try {
                    // ...to let FormData do all the work
                    this.data = new window.FormData(elm);
                    if (this.data) {
                        this.processStatus();
                        return;
                    }
                } catch (_) {
                    "pass";
                }

                break;

            case "text\/plain":
                this.technique = PLAIN_POST;
                fFilter = plainEscape;
                break;

            default:
                this.technique = URLEN_POST;
            }
        } else {
            this.technique = URLEN_GET;
        }

        for (var i = 0, len = elm.elements.length; i < len; i++) {
            oField = elm.elements[i];
            if (!oField.hasAttribute("name")) { continue; }
            sFieldType = oField.nodeName.toUpperCase() === "INPUT" ? (oField.getAttribute("type") || "").toUpperCase() : "TEXT";
            if (sFieldType === "FILE" && oField.files.length > 0) {
                if (this.technique === MULTI_POST) {
                    if (!window.FileReader) {
                        throw new Error("Operation not supported: cannot upload a document via AJAX if FileReader is not supported");
                    }
                    /* enctype is multipart/form-data */
                    for (nFile = 0; nFile < oField.files.length; nFile++) {
                        oFile = oField.files[nFile];
                        oSegmReq = new window.FileReader();
                        oSegmReq.onload = this.fileReadHandler(oField, oFile);
                        oSegmReq.readAsBinaryString(oFile);
                    }
                } else {
                    /* enctype is application/x-www-form-urlencoded or text/plain or method is GET: files will not be sent! */
                    for (nFile = 0; nFile < oField.files.length; this.segments.push(fFilter(oField.name) + "=" + fFilter(oField.files[nFile++].name)));
                }
            } else if ((sFieldType !== "RADIO" && sFieldType !== "CHECKBOX") || oField.checked) {
                /* field type is not FILE or is FILE but is empty */
                this.segments.push(
                    this.technique === MULTI_POST ? /* enctype is multipart/form-data */
                        "Content-Disposition: form-data; name=\"" + oField.name + "\"\r\n\r\n" + oField.value + "\r\n"
                    : /* enctype is application/x-www-form-urlencoded or text/plain or method is GET */
                        fFilter(oField.name) + "=" + fFilter(oField.value)
                );
            }
        }
        this.processStatus();
    }

    /**
     * Create FileReader onload handler
     *
     * @return {function}
     */
    FormSerializer.prototype.fileReadHandler = function (field, file) {
        var self = this;
        var index = self.segments.length;
        self.segments.push(
            "Content-Disposition: form-data; name=\"" + field.name + "\"; " +
            "filename=\""+ file.name + "\"\r\n" +
            "Content-Type: " + file.type + "\r\n\r\n");
        self.status++;
        return function (oFREvt) {
            self.segments[index] += oFREvt.target.result + "\r\n";
            self.status--;
            self.processStatus();
        };
    };

    /**
     * Is called when a pass of serialization has completed.
     *
     * It will be called asynchronously if file reading is taking place.
     */
    FormSerializer.prototype.processStatus = function () {
        if (this.status > 0) { return; }
        /* the form is now totally serialized! prepare the data to be sent to the server... */
        var sBoundary, method, url, hash, data, enctype;

        switch (this.technique) {
        case URLEN_GET:
            method = "GET";
            url = this.receiver.split("#");
            hash = url.length > 1 ? "#" + url.splice(1).join("#") : "";  // preserve the hash
            url = url[0].replace(/(?:\?.*)?$/, this.segments.length > 0 ? "?" + this.segments.join("&") : "") + hash;
            data = null;
            enctype = null;
            break;

        case URLEN_POST:
        case PLAIN_POST:
            method = "POST";
            url = this.receiver;
            enctype =  this.contentType;
            data  = this.segments.join(this.technique === PLAIN_POST ? "\r\n" : "&");
            break;

        case MULTI_POST:
            method = "POST";
            url = this.receiver;
            if (this.data) {
                // use native FormData multipart data
                data = this.data;
                enctype = null;
            } else {
                // construct serialized multipart data manually
                sBoundary = "---------------------------" + Date.now().toString(16);
                enctype = "multipart\/form-data; boundary=" + sBoundary;
                data = "--" + sBoundary + "\r\n" + this.segments.join("--" + sBoundary + "\r\n") + "--" + sBoundary + "--\r\n";
                if (window.Uint8Array) {
                    data = createArrayBuffer(data);
                }
            }
            break;
        }
        // Since processStatus may or _may not_ be called synchronously, ensure that the callback
        // is always invoked asynchronously.
        setTimeout(this.onRequestReady, 0, method, url, data, enctype);
    };

    /**
     * Used to escape strings for encoding text/plain
     *
     * eg. "4\3\7 - Einstein said E=mc2" ----> "4\\3\\7\ -\ Einstein\ said\ E\=mc2"
     *
     * @param  {string} sText
     * @return {string}
     */
    function plainEscape(sText) {
        return sText.replace(/[\s\=\\]/g, "\\$&");
    }

    /**
     * @param  {string} str
     * @return {ArrayBuffer}
     */
    function createArrayBuffer(str) {
        var nBytes = str.length;
        var ui8Data = new Uint8Array(nBytes);
        for (var i = 0; i < nBytes; i++) {
            ui8Data[i] = str.charCodeAt(i) & 0xff;
        }
        return ui8Data;
    }

    return FormSerializer;
}())));
