/* global window, document, XMLHttpRequest, ActiveXObject */

window.treetop = (function ($, BodyComponent, FormSerializer) {
    "use strict";
    if (window.treetop !== void 0) {
        // throwing an error here is important since it prevents window.treetop from being reassigned
        throw Error("Treetop: treetop global is already defined")
    }

    // First check browser support for essential modern features
    if (typeof window.HTMLTemplateElement === 'undefined') {
        throw Error("Treetop: HTMLTemplateElement not supported, a polyfil should be used");
    }
    if (!(window.history && typeof window.history.pushState === 'function')) {
        throw Error("Treetop: HTML5 History pushState not supported, a polyfil should be used");
    }

    function init(_config) {
        var config = _config instanceof Object ? _config : {};
        var treetopAttr = true;

        for (var key in config) {
            if (!config.hasOwnProperty(key)) {
                continue;
            }
            switch (key.toLowerCase()) {
            case "mounttags":
                $.mountTags = $.copyConfig(config[key])
                break;
            case "mountattrs":
                $.mountAttrs = $.copyConfig(config[key])
                break;
            case "unmounttags":
                $.unmountTags = $.copyConfig(config[key])
                break;
            case "unmountattrs":
                $.unmountAttrs = $.copyConfig(config[key])
                break;
            case "compose":
                $.compose = $.copyConfig(config[key])
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
            default:
                throw new Error(
                    "Treetop: unknown configuration property '" + key + "'"
                );
            }
        }

        if (treetopAttr) {
            // apply default components
            $.mountTags["body"] = BodyComponent.mount;
            // NOTE: realistically, body will never be 'unmounted', this
            // should not be necessary.
            $.unmountTags["body"] = BodyComponent.unmount;
        }

        // TODO: Check for document ready state before mounting,
        //       here we assume the developer has done so.
        // point of no return
        $.mount(document.body);
        window.onpopstate = function (_evt) {
            var evt = _evt || window.event;
            $.browserPopState(evt);
        };
    }

    /**
     * Treetop API Constructor
     *
     * @constructor
     */
    function Treetop() {}

    var initCalled = false;
    /**
     * Configure treetop and mount document.body.
     *
     * @param  {Object} config Dict containing complete page configuration.
     * @throws  {Error} If a config property isn't recognized or `init` was
     *                  triggered previously
     */
    Treetop.prototype.init = function(config) {
        // Since the DOM is stateful, mounting is not a
        // reversible operation. It is crucial therefore that
        // the initial setup process only ever happens once during
        // the lifetime of a page. After that elements will only
        // be mounted and unmounted when being attached or detached
        // from the DOM.
        if (initCalled) {
            throw Error("Treetop: init has already been called");
        }
        initCalled = true;
        // see https://plainjs.com/javascript/events/running-code-when-the-document-is-ready-15/
        if (document.readyState!='loading') {
            window.setTimeout(function () {
                init(config);
            });
        } else if (document.addEventListener) {
            // modern browsers
            document.addEventListener('DOMContentLoaded', function(){
                init(config);
            });
        } else {
            // IE <= 8
            document.attachEvent('onreadystatechange', function(){
                if (document.readyState=='complete') init(config);
            });
        }
    };

    /**
     * Update a existing DOM node with a new element. The elements will be composed
     * and (un)mounted in the normal Treetop way.
     *
     * @param {HTMLElement} next: HTMLElement, not yet attached to the DOM
     * @param {HTMLElement} prev: node currently attached to the DOM
     *
     * @throws Error if the elements provided are not valid in some obvious way
     */
    Treetop.prototype.updateElement = function (next, prev) {
        if (!next || !prev) {
            throw new Error("Treetop: Expecting two HTMLElements");
        } else if (next.parentNode) {
            throw new Error(
                "Treetop: Cannot update with an element that "+
                "is already attached to a parent node"
            );
        } else if (!prev.parentNode) {
            throw new Error(
                "Treetop: Cannot update an element that is not attached to the DOM"
            );
        }
        $.updateElement(next, prev);
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
            mountTags: $.copyConfig($.mountTags),
            mountAttrs: $.copyConfig($.mountAttrs),
            unmountTags: $.copyConfig($.unmountTags),
            unmountAttrs: $.copyConfig($.unmountAttrs),
            compose: $.copyConfig($.compose),
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
     */
    Treetop.prototype.request = function (method, url, body, contentType) {
        if (!$.METHODS[method.toUpperCase()]) {
            throw new Error("Treetop: Unknown request method '" + method + "'");
        }

        var xhr = $.createXMLHTTPObject();
        if (!xhr) {
            throw new Error("Treetop: XHR is not supproted by this browser");
        }
        var requestID = $.lastRequestID = $.lastRequestID + 1
        xhr.open(method.toUpperCase(), url, true);
        xhr.setRequestHeader("accept", [$.PARTIAL_CONTENT_TYPE, $.FRAGMENT_CONTENT_TYPE].join(", "));
        if (contentType) {
            xhr.setRequestHeader("content-type", contentType);
        }
        xhr.onreadystatechange = function() {
            if (xhr.readyState !== 4 || xhr.status < 100) {
                return
            }
            // check if the response can be processed by treetop client library,
            // otherwise trigger 'onUnsupported' signal
            if (xhr.getResponseHeader("x-treetop-see-other") !== null) {
                // Redirect browser window
                window.location = xhr.getResponseHeader("x-treetop-see-other");

            } else if (xhr.getResponseHeader("content-type") === $.PARTIAL_CONTENT_TYPE) {
                // this response is part of a larger page, add a history entry before processing
                var responseURL = xhr.getResponseHeader("x-response-url") || xhr.responseURL;
                // NOTE: This HTML5 feature will require a polyfill for some browsers
                window.history.pushState({
                    treetop: true,
                }, "", responseURL);
                $.xhrProcess(xhr, requestID, true);

            } else if(xhr.getResponseHeader("content-type") === $.FRAGMENT_CONTENT_TYPE) {
                // this is a fragment response, just process the update
                $.xhrProcess(xhr, requestID, false);

            } else if(typeof $.onUnsupported === "function") {
                // Fall through; this is not a response that treetop supports.
                // Allow developer to handle.
                $.onUnsupported(xhr);
            }
        };
        xhr.onerror = function () {
            if(typeof $.onNetworkError === "function") {
                // Network level error, likely a connection problem
                $.onNetworkError(xhr);
            }
        };
        xhr.send(body || null);
    };

    /**
     * treetop.submit will trigger an XHR request derived from the state
     * of a supplied HTML Form element.
     */
    Treetop.prototype.submit = function (formElement) {
        function dataHandler(fdata) {
            window.setTimeout(function () {
                window.treetop.request(
                    fdata.method,
                    fdata.action,
                    fdata.data,
                    fdata.enctype
                );
            }, 0);
        }
        new FormSerializer(formElement, dataHandler);
    }

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
     * Store the treetop composition definitions
     * @type {Object} object reference
     */
    compose: {},

    /**
     * Track order of requests as well as the elements that were updated.
     * This is necessary because under certain situations late arriving
     * responses should be ignored.
     */
    lastRequestID: 0,
    updates: {},

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
        var i, len, temp, child, old, nodes;
        i = len = temp = child = old = nodes = undefined;

        // this will require a polyfil for browsers that do not support HTMLTemplateElement
        temp = document.createElement('template');
        temp.innerHTML = xhr.responseText;
        nodes = new Array(temp.content.children.length);
        for (i = 0, len = temp.content.children.length; i < len; i++) {
            nodes[i] = temp.content.children[i];
        }
        for (i = 0, len = nodes.length; i < len; i++) {
            child = nodes[i];
            if ($.SINGLETONS[child.tagName.toUpperCase()]) {
                old = document.getElementsByTagName(child.nodeName)[0];
            } else if (child.id) {
                old = document.getElementById(child.id);
            } else {
                old = null;
            }
            // check that an existing node was found, and that this node
            // has not already been updated by a more recent request
            if (old && requestID >= $.getLastUpdate(old)) {
                if (isPagePartial) {
                    $.updates["BODY"] = requestID;
                } else if (child.id) {
                    $.updates["#" + child.id] = requestID;
                }
                $.updateElement(child, old);
            }
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
     * Default treetop composition method
     *
     * @param  {HTMLElement} next The element recently loaded from the API
     * @param  {HTMLElement} prev The element currently within the DOM
     */
    defaultComposition: function(next, prev) {
        prev.parentNode.replaceChild(next, prev);
    },

    /**
     * Apply a recently loaded element to an existing one attached to the DOM
     *
     * @param  {HTMLElement} next The element recently loaded from the API
     * @param  {HTMLElement} prev The element currently within the DOM
    */
    updateElement: function(next, prev) {
        var $ = this;
        var nextCompose = next.getAttribute("treetop-compose");
        var prevCompose = prev.getAttribute("treetop-compose");
        var compose = $.defaultComposition;
        if (typeof nextCompose === "string" &&
            typeof prevCompose === "string"
        ) {
            nextCompose = nextCompose.toLowerCase();
            prevCompose = prevCompose.toLowerCase();
            if (
              nextCompose.length &&
              nextCompose === prevCompose &&
              $.compose.hasOwnProperty(nextCompose) &&
              typeof $.compose[nextCompose] === "function"
            ) {
                compose = $.compose[nextCompose];
            }
        }

        var asyncMount = compose(next, prev);
        if (typeof asyncMount === "function") {
            asyncMount($.asyncMountFn(next, prev));
        } else {
            $.mount(next);
            $.unmount(prev);
        }
    },


    asyncMountFn: function (next, prev) {
        var $ = this;
        return function () {
            $.mount(next);
            $.unmount(prev);
        };
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
        // depth first recursion
        for (i = 0; i < el.children.length; i++) {
            $.mount(el.children[i]);
        }
        // mount tag component first
        name = el.tagName.toLowerCase();
        if ($.mountTags.hasOwnProperty(name)) {
            comp = $.mountTags[name];
            if (typeof comp === "function") {
                comp(el);
            }
        }
        // mount attribute components
        for (j = el.attributes.length - 1; j >= 0; j--) {
            name = el.attributes[j].name.toLowerCase();
            if ($.mountAttrs.hasOwnProperty(name)) {
                comp = $.mountAttrs[name];
                if (typeof comp === "function") {
                    comp(el);
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
        // unmount tag component first
        name = el.tagName.toLowerCase();
        if ($.unmountTags.hasOwnProperty(name)) {
            comp = $.unmountTags[name];
            if (typeof comp === "function") {
                comp(el);
            }
        }
        // unmount attribute components
        for (j = el.attributes.length - 1; j >= 0; j--) {
            name = el.attributes[j].name.toLowerCase();
            if ($.unmountAttrs.hasOwnProperty(name)) {
                comp = $.unmountAttrs[name];
                if (typeof comp === "function") {
                    comp(el);
                }
            }
        }
    },

    // see https://www.quirksmode.org/js/xmlhttp.html
    XMLHttpFactories: [
        function () {return new XMLHttpRequest()},
        function () {return new ActiveXObject("Msxml2.XMLHTTP")},
        function () {return new ActiveXObject("Msxml3.XMLHTTP")},
        function () {return new ActiveXObject("Microsoft.XMLHTTP")}
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
     * Create copy of config object, all keys are tranformed to lowercase.
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

}, (function ($) {
    "use strict";

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
        var evt = _evt || window.event;
        var elm = _evt.target || _evt.srcElement;
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
        var evt = _evt || window.event;
        var elm = _evt.target || _evt.srcElement;
        $.formSubmit(evt, elm);
    }

    /**
     * treetop event delegation component definition
     */
    return {
        mount: function (el) {
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
        unmount: function (el) {
            if (el.removeEventListener) {
                el.removeEventListener("click", documentClick);
                el.removeEventListener("submit", onSubmit);
                el.removeEventListener("keydown", updateModifiers);
                el.removeEventListener("keyup", updateModifiers);
            } else if (el.detachEvent) {
                el.detachEvent("onclick", documentClick);
                el.detachEvent("onsubmit", onSubmit);
                el.detachEvent("onkeydown", updateModifiers);
                el.detachEvent("onkeyup", updateModifiers);
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
            // Use default browser behaviour when a modifier key is pressed
            // or treetop has been explicity disabled
            return
        }
        if (elm.hasAttribute("treetop-link")) {
            // 'treetop-link' attribute can be used as an alternative to 'href' attribute.
            // This is useful when default 'href' behavior is undesirable.
            evt.preventDefault();
            window.treetop.request("GET", elm.getAttribute("treetop-link"));
            return false;
        } else if (elm.href && elm.hasAttribute("treetop")) {
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
            sFieldType = oField.nodeName.toUpperCase() === "INPUT" ? oField.getAttribute("type").toUpperCase() : "TEXT";
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

        this.onRequestReady({
            method: method,
            action: url,
            data: data,
            enctype: enctype
        });
    };

    /**
     * Used to escape strings for encoding text/plain
     *
     * eg. "4\3\7 - Einstein said E=mc2" ----> "4\\3\\7\ -\ Einstein\ said\ E\=mc2"
     *
     * @param  {stirng} sText
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
        var ui8Data = new window.Uint8Array(nBytes);
        for (var i = 0; i < nBytes; i++) {
            ui8Data[i] = str.charCodeAt(i) & 0xff;
        }
        return ui8Data;
    }

    return FormSerializer;
}())));
