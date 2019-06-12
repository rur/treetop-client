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
//       * `FormData` is required if form element must be encoded for XHR
//
// Global browser footprint of this script:
//      * Assigns `window.treetop` with Treetop API instance;
//      * Assigns `window.onpopstate` with a handler that refreshes the page when a treetop entry is popped from the browser history;
//      * Built-in components attach various event listeners when mounted. (Built-ins can be disabled, see docs)
//

window.treetop = (function ($, $components) {
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
        var treetopSubmitterAttr = true;

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
            case "treetopsubmitterattr":
                treetopSubmitterAttr = !(config[key] === false);
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
            $.mountAttrs["treetop-attr"] = $components.bodyMount;
        }
        if (treetopLinkAttr) {
            $.mountAttrs["treetop-link"] = $components.linkMount;
        }
        if (treetopSubmitterAttr) {
            $.mountAttrs["treetop-submitter"] = $components.submitterMount;
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
        } else if (!prev.parentElement) {
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
        } else if (!mountedSibling.parentElement) {
            throw new Error(
                "Treetop: Cannot mount after a sibling node that is not attached to a parent."
            );
        }
        mountedSibling.parentElement.insertAfter(newSibling, mountedSibling);
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
        } else if (!mountedSibling.parentElement) {
            throw new Error(
                "Treetop: Cannot mount before a sibling node that is not attached to a parent."
            );
        }
        mountedSibling.parentElement.insertBefore(newSibling, mountedSibling);
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
        if (!mountedElement.parentElement) {
            throw new Error(
                "Treetop: Cannot unmount a node that is not attached to a parent."
            );
        }
        mountedElement.parentElement.removeChild(mountedElement);
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
                var responseHistory = xhr.getResponseHeader("x-response-history");
                // NOTE: This HTML5 feature will require a polyfil for some browsers
                if (typeof responseHistory === "string"
                    && responseHistory.toLowerCase() === "replace"
                    && typeof history.replaceState === "function"
                ) {
                    // update the current history with a new URL
                    history.replaceState({
                        treetop: true,
                    }, "", responseURL);
                } else {
                    // add a new history entry using response URL
                    history.pushState({
                        treetop: true,
                    }, "", responseURL);
                }
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
     * @param {HTMLElement} submitter Optional element that is capable of adding an input value and overriding form behaviour
     * @throws {Error} If an XHR request cannot derived from the element supplied for any reason.
     */
    Treetop.prototype.submit = function (formElement, submitter) {
        initialized = true;  // ensure that late arriving configuration will be rejected
        var params = $.encodeForm(formElement, submitter);
        if (params) {
            window.treetop.request.apply(window.treetop, params);
        }
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
        if (node.parentElement) {
            parentUpdate = this.getLastUpdate(node.parentElement);
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
        prev.parentElement.replaceChild(next, prev);
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
    },

    /**
     * Convert a form element into parameters for treetop.request API method
     *
     * @param {FormElement} formElement Required, valid HTML form element with state to be used for treetop request
     * @param {HTMLElement} submitter Optional element designated as the form 'submitter'
     * @returns Array parameters for treetop request method
     * @throws Error if the target form cannot be encoded for any reason
     */
    encodeForm: function(formElement, submitter) {
        var noValidate = submitter && submitter.hasAttribute("formnovalidate") ? true : formElement.noValidate;
        var method = submitter && submitter.hasAttribute("formmethod") ? submitter.getAttribute("formmethod") : formElement.method;
        var action = submitter && submitter.hasAttribute("formaction") ? submitter.getAttribute("formaction") : formElement.action;
        var enctype = submitter && submitter.hasAttribute("formenctype") ? submitter.getAttribute("formenctype") : formElement.enctype;

        if (!noValidate) {
            if (typeof formElement.reportValidity === "function") {
                if (!formElement.reportValidity()) {
                    return null;
                }
            } else if (typeof formElement.checkValidity === "function") {
                if (!formElement.checkValidity()) {
                    return null;
                }
            }
        }

        if (!method) {
            // default method
            method = "GET"
        } else {
            method = method.toUpperCase();
        }
        if (!enctype) {
            // default encoding
            enctype = "application\/x-www-form-urlencoded"
        } else {
            enctype = enctype.toLowerCase();
        }

        if (method === "POST" && enctype == "multipart/form-data") {
            if (typeof window.FormData === "undefined") {
                throw Error("Treetop: An implementation of FormData is not available. Multipart form data cannot be encoded for XHR.");
            }
            // delegate to FormData to handle multipart forms
            var data = new window.FormData(formElement)
            if (submitter && submitter.hasAttribute("name")) {
                data.append(submitter.name, submitter.value);
            }
            return ["POST", action, data] // do not include the enctype, that will be supplied by FormData instance
        }

        // collect form entry list from input elements
        var segments = [];
        for (var i = 0, len = formElement.elements.length; i < len; i++) {
            var inputElement = formElement.elements[i];
            if (!inputElement.hasAttribute("name") ||
                // do not include submit/button element values in the request data
                // Those values must only be included if they are designated as the 'submitter' (singular)
                inputElement.nodeName.toUpperCase() === "BUTTON" ||
                (inputElement.getAttribute("type") || "").toLowerCase() === "submit"
            ) {
                continue;
            }
            var inputType = inputElement.nodeName.toUpperCase() === "INPUT" ? (inputElement.getAttribute("type") || "").toUpperCase() : "TEXT";
            if (inputType === "FILE" && inputElement.files.length > 0) {
                // skip files for urlencoded submit
                continue
            } else if ((inputType !== "RADIO" && inputType !== "CHECKBOX") || inputElement.checked) {
                segments.push([inputElement.name, inputElement.value]);
            }
        }
        if (submitter && submitter.hasAttribute("name")) {
            segments.push([submitter.name, submitter.value]);
        }
        var encodedSegments = segments.map(function (kv) {
            return encodeURIComponent(kv[0]) + "=" + encodeURIComponent(kv[1]);
        })

        if (method === "GET") {
            // put encoded form data into the URL
            action = action.split("#")[0];  // remove everything after hash, it's not sent anyway
            var parts = action.split("?");
            action = parts[0] + "?" + parts.slice(1).concat(encodedSegments).join("&");
            return ["GET", action, null, enctype];
        }

        if (enctype === "application/x-www-form-urlencoded"){
            return [method, action, encodedSegments.join("&"), "application/x-www-form-urlencoded"];
        }
        function plainEscape(sText) {
            return sText.replace(/[\s\=\\]/g, "\\$&");
        }
        if (enctype === "text\/plain"){
            return [
                method,
                action,
                segments.map(function (kv) {
                    return plainEscape(kv[0]) + "=" + plainEscape(kv[1]);
                }).join("\r\n"),
                "text\/plain"
            ]
        }

        // fall-through
        throw Error("Treetop: Cannot submit form as XHR request with method " + method + " and encoding type " + enctype);
    }


}, (function () {
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
        // use MouseEvent properties to check for modifiers
        // if engaged, allow default action to proceed
        // see https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/MouseEvent
        if (evt.ctrlKey || evt.shiftKey || evt.altKey || evt.metaKey ||
            (elm.getAttribute("treetop") || "").toLowerCase() === "disabled" ||
            !elm.hasAttribute("href") || !elm.hasAttribute("treetop")
        ) {
            // Use default browser behavior when a modifier key is pressed
            // or treetop has been explicity disabled
            return;
        }
        // hijack standard link click, extract href of link and
        // trigger a Treetop XHR request instead
        evt.preventDefault();
        window.treetop.request("GET", elm.href);
        return false;
    }

    function onSubmit(_evt) {
        if (!_attrEquals(document.body, "treetop-attr", "enabled")) {
            return
        }
        var evt = _evt || window.event;
        var elm = evt.target || evt.srcElement;
        if (elm.action && elm.hasAttribute("treetop") && elm.getAttribute("treetop").toLowerCase() != "disabled") {
            evt.preventDefault();

            // Serialize HTML form including file inputs and trigger a treetop request.
            // The request will be executed asynchronously.
            // TODO: If an error occurs during serialization there should be some logging/recovery mechanism in the API
            window.treetop.submit(elm);

            return false;
        }
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
     * Click event hander for elements with the 'treetop-submitter' attribute.
     *
     * treetop-submitter designates an element as a submitter.
     * Hence, when the element is clicked the state of the targeted form
     * will be used to trigger a Treetop XHR request.
     *
     * Explicit or implicit behavior declared on the form element can be overridden
     * by the designated submitter, using the "formaction" attribute for example.
     *
     * The "form" attribute is also supported where the target form does not enclose the submitter.
     */
    function submitClick(_evt) {
        var evt = _evt || window.event;
        var elm = evt.currentTarget;
        var formElement = null
        if (elm && elm.hasAttribute("treetop-submitter") && elm.getAttribute("treetop-submitter") !== "disabled") {
            if (elm.hasAttribute("form")) {
                var formID = elm.getAttribute("form");
                if (!formID) {
                    return false;
                }
                formElement = document.getElementById(formID)
                if (!formElement || formElement.tagName.toUpperCase() !== "FORM") {
                    return false;
                }
            } else {
                var cursor = elm;
                while (cursor.parentElement) {
                    if (cursor.parentElement.tagName.toUpperCase() === "FORM") {
                        formElement = cursor.parentElement;
                        break;
                    }
                    cursor = cursor.parentElement;
                }
            }
            if (formElement) {
                // pass click target as 'submitter'
                window.treetop.submit(formElement, elm)
                evt.preventDefault();
                return false;
            }
        }
        // fall-through, default click behaviour not prevented
    }

    /**
     * treetop event delegation component definition
     */
    return {
        bodyMount: function (el) {
            if (el.addEventListener) {
                el.addEventListener("click", documentClick, false);
                el.addEventListener("submit", onSubmit, false);
            } else if (el.attachEvent) {
                el.attachEvent("onclick", documentClick);
                el.attachEvent("onsubmit", onSubmit);
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
        },
        submitterMount: function (el) {
            if (el.addEventListener) {
                el.addEventListener("click", submitClick, false);
            } else if (el.attachEvent) {
                el.attachEvent("onclick", submitClick);
            } else {
                throw new Error("Treetop Events: Event delegation is not supported in this browser!");
            }
        }
    };
}())
));
