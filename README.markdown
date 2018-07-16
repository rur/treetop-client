# Treetop Client

Browser client library for treetop enabled web servers.

See [Treetop server library](https://github.com/rur/treetop) for more details.

## Client Library

The __treetop.js__ script must be sourced by the browser to enable in-page navigation.

### The `treetop` Attribute

The most convenient way to enable in-page nav is declaratively. The behavior of specific elements can be overloaded by adding a `treetop` attribute. This allows your template to decide which navigation actions should trigger full-page vs. in-page loading.

Here is an example of an anchor tag:

```
<a treetop href="/some/path">treetop link</a>

```
Click event trigger the following treetop request, as you might expect.
```
treetop.request("GET", "/some/path")
```
Here is an example of a form tag:
```

<form treetop action="/some/path" method="POST">
    <input name="foo" value="bar" type="text"/>
    <input type="submit"/>
</form>

```
Submit event will trigger the following request,
```
treetop.request("POST", "/some/path", "foo=bar", "application/x-www-form-urlencoded")
```

### Client Library API

The client library exposes the `window.treetop` instance with the following methods:

#### treetop.request
Issue a treetop request. Notice that no callback mechanism is available. This is by design. Response handling is mandated by the protocol, see [Treetop Request](https://github.com/rur/treetop/blob/master/README.markdown#how-treetop-requests-work)

##### Usage
```
treetop.request( [method], [url], [body], [contentType])
```

##### Arguments:

| Param             | Type    | Details                                          |
|-------------------|---------|--------------------------------------------------|
| method            | string  | The HTTP request method  to use                  |
| url               | string  | The URL path                                     |
| body              | *string | the request body, encoded string                 |
| contentType       | *string | describe the encoding of the request body        |

_*optional_

### `treetop.push` Component

Register a mount and unmount function for custom components. Elements are matching by either tagName or attrName. The mounting functions will be called by treetop during the course of replacing a region of the DOM.

Fragment child elements are 'mounted' and 'unmounted' recursively in depth first order.

#### Usage
```
(window.treetop = window.treetop || []).push({
    tagName: "",
    attrName: "",
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


### `treetop.push` Composition

Register a method for use in conjunction with `treetop-compose` attribute.

#### Usage
```
(window.treetop = window.treetop || []).push({
    composition: {
        "custom-compose": (next, prev) => {
            prev.parentNode.replaceChild(next, prev)

            // optional async component mounting
            return (done) => {
                done();
            }
        }
    }
})
```

_*optional_

### Browser support

Backwards compatibility is a priority for the client library. It has been designed to rely on well supported APIs for the most part. However, you should use a HTML5 `history.pushState` shim to enable the the full navigation experience in legacy browsers.

__TODO: More browser testing is needed, please help!__

