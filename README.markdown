# Treetop Client

Browser client library for treetop enabled web servers.

See [Treetop server library](https://github.com/rur/treetop) for more details.

The __treetop.js__ script must be sourced by the browser to enable in-page navigation.

## Client Library

Sourcing the treetop client library does two things: 

* Click, submit and keyboard event listeners are bound to the body element.
* The `window.treetop` API instance is exposed.

The library API provides the following features:

* API to trigger Treetop requests.
* Hooks for mounting & unmounting component code.
* Configure how responses are handled.

## The "treetop" attribute

The treetop attribute allows the behavior of anchors and forms to be hijacked, for example:

```
<a treetop href="/some/path">treetop link</a>
```
Click event on this anchor is equivalent to the following treetop request using the client library.
```
treetop.request("GET", "/some/path")
```
Here is an example with a form tag:
```
<form treetop action="/some/path" method="POST">
    <input name="foo" value="bar" type="text"/>
    <input type="submit"/>
</form>

```
Submit event here is the same as the following library call,
```
treetop.request("POST", "/some/path", "foo=bar", "application/x-www-form-urlencoded")
```

###  Client Library API

####  treetop.request
Issue a treetop request. Notice that no callback mechanism is available by design. Response handling is mandated by the protocol, see [Treetop Request](https://github.com/rur/treetop/blob/master/README.markdown#how-treetop-requests-work).

##### Usage
```
treetop.request( [method], [url], [body], [contentType])
```

##### Arguments:

| Param             | Type    | Details                                          |
|-------------------|---------|--------------------------------------------------|
| method            | string  | The HTTP request method to use                   |
| URL               | string  | The URL path                                     |
| body              | *string | the request body encoded string                  |
| contentType       | *string | describe the encoding of the request body        |

_*optional_

### Components

Treetop provides a hook for attaching custom JS to recently mounted or unmounted HTML elements.

#### `treetop.push({"tagName": "my-tag"})`

Register a 'mount' and 'unmount' function for custom components. Elements are matched by either tagName or attrName. The mounting functions will be called by treetop during the course of replacing a region of the DOM.

Fragment child elements are 'mounted' and 'unmounted' recursively in depth-first order.

#### Usage
```
(window.treetop = window.treetop || []).push({
    tagName: "my-tag",
    attrName: "my-attr",
    mount: (el) => {},
    unmount: (el) => {},
})
```

#### Arguments:

| Param             |  Type      | Details                                         |
|-------------------|------------|-------------------------------------------------|
| tagName           | *string    | Case insensitive HTMLElement tag name           |
| attrName          | *string    | Case insensitive HTMLElement attr name          |
| mount             | *function  | Function accepting the HTMLElement as parameter |
| unmount           | *function  | Function accepting the HTMLElement as parameter |

_*optional_

### Treetop Compose

When a new HTML snipped is received and matched to an existing DOM node, the default behaviour is to synchronously
swap the new element in, clobbering the old. The 'compose' functionality allows the developer to define a custom node update 
strategy.

#### `treetop.push({"compose":  {...}})`

Register a method for use in conjunction with `treetop-compose` attribute.

#### Usage
```
/* define 'custom-compose' update strategy which is equivalent to default behaviour */
(window.treetop = window.treetop || []).push({
    compose: {
        "custom-compose": (next, prev) => {
            prev.parentNode.replaceChild(next, prev)
            return (doMount) => {
                // optionally sync or async component unmounting + mounting
                doMount();
            }
        }
    }
})
```
#### Matching compose attributes

A new element and old element must have matching attribute values for the custom compose function to be used.
If these attribute values do not match for any reason, the library will fall back on the default 'replace in place'
strategy. For example,

```
<!-- Old -->
<div id="example" treetop-compose="custom-compose">stale content</div>

<!-- New -->
<div id="example" treetop-compose="custom-compose">updated content</div>
```


## Browser support

Backwards compatibility is a priority for the client library. It has been designed to rely on well-supported APIs for the most part. However, you should use an HTML5 `history.pushState` shim to enable the full navigation experience in legacy browsers.

__TODO: More browser testing is needed, please help!__
