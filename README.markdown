
# Treetop Client
Browser client library for Treetop enabled web servers. See [Treetop Library](https://github.com/rur/treetop) for more details. The _treetop.js_ script must be sourced by the web browser to enable in-page navigation.

## Client API
This library defines a `window.treetop` API instance.
### Request
A Treetop request can be triggered from a script like so,
```
treetop.request(
	"POST",
	"/example",
	"a=123&b=987",
	"application/x-www-form-urlencoded"
)
```
Notice that no callback mechanism is supported. Response handing is mandated by the protocol, see [Treetop Library](https://github.com/rur/treetop).

##### Usage
```
treetop.request( [method], [url], [body], [contentType])
```

##### Arguments:

| Param             | Type    | Details                                          |
|-------------------|---------|--------------------------------------------------|
| method            | string  | The HTTP request method to use                   |
| URL               | string  | The URL path                                     |
| body              | (optional) string | the encoded request body                   |
| contentType       | (optional) string | body encoding type        |
  

### Configuration
The `treetop.init(..)` method is used to configure and initialize the client library when a new page is loaded. The init function __can only be called once__, between full-page loads, hence the full configuration must be supplied all at once.
##### For example,
```
treetop.init({
  mountDefault: true,
  mountTags: {
    "my-tag": (el) => { /*...*/ }
  },
  unmountTags: {
    "my-tag": (el) => { /*...*/ }
  },
  mountAttrs: {
    "my-attr": (el) => { /*...*/ },
  },
  unmountAttrs: {
    "my-attr": (el) => { /*...*/ },
  },
  compose: {
    "my-composition": (next, prev) => { /*...*/ }
  },
  onNetworkError: (xhr) => { /*...*/ },
  onUnsupported: (xhr) => { /*...*/ }
});
```
#### Element Mount Hooks
When an element has been added or removed from the DOM by the Treetop library, the fragment is scanned for elements matching the configured mount/unmount functions.

* `mountTags`: match element tag name after being added
* `unmountTags`: match element tag name after removal
* `mountAttrs`: match attribute name after being attached
* `unmountAttrs`: match attribute name after removal
 
 _NB. Names are case insensitive_

##### Initial Mount
When treetop is initialized a one-time _mount_ is triggered from the document body.

### Composing Element
When a new fragment is matched to an existing DOM node the default behavior is to replace one with the other and mount/unmount  synchronously. It is possible however, to define a custom 'compose' function which merges the two elements in some way, for example...
```
treetop.init({
	...
	"compose": {
		"append-children": (next, prev) => {
		    Array.from(next.children).forEach((child) => {
		        prev.appendChild(child)
		    })
		}
	}
})
```
This custom compose implementation will be triggered if both new and old elements have matching _treetop-compose_ attributes. Like so,
```
<ul treetop-compose="append-children"><li...
```

### Config Getter
To obtain the active configuration for debug purposes, a copy can be read out like so.
```
var cfg = treetop.config()
```

### Request Errors
When the treetop client is not capable of handling the result of a request, handling can be delegated to a user defined function. The relevant XMLHttpRequest instance will be passed to the handler.

`onUnsupported`, when a server responds to a Treetop request with an unsupported content type

`onNetworkError`, failed to establish a connection with the server for some reason.

## Default Mount Config
### The "treetop" Attribute

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


## Browser Support & Ployfills

Backwards compatibility is a priority for the client library. It has been designed to rely on well-supported APIs for the most part. However, if pre-HTML5 browsers support is required, then the following polyfills should be used:
* `history.pushState`, to enable the full navigation experience.
* `HTMLTemplateElement`, for decoding HTML strings.

__TODO: More browser testing is needed, please help!__

