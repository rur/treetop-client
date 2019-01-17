
[![Build Status](https://travis-ci.org/rur/treetop-client.svg?branch=master)](https://travis-ci.org/rur/treetop-client)

# Treetop Client
This is the browser client library for Treetop enabled web servers. See [Treetop Library](https://github.com/rur/treetop) for more details. The _treetop.js_ script must be sourced by the web browser to enable in-page navigation.

## Client API
This library defines a `window.treetop` API instance. See [API Docs](API.markdown) for more details

### Example request using API

A Treetop request can be triggered from a script like so,

```
treetop.request(
	"POST",
	"/example",
	"a=123&b=987",
	"application/x-www-form-urlencoded"
)
```

## Configuration

### Initialization

To make use of custom integration hooks and the built-in components, the client library
must be initialized before any partial requests are made. Late arriving configuration
will be rejected.

<!-- TODO: add troubleshooting docs -->

Initialization can be triggered actively using `treetop.init({...})` or passively by
declaring a global variable `window.TREETOP_CONFIG` __before__ the client script loads.
The config object is the same in both cases.

#### Config Example
```
window.init({
  treetopAttr: true,
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
  merge: {
    "my-custom-merge": (next, prev) => { /*...*/ }
  },
  onNetworkError: (xhr) => { /*...*/ },
  onUnsupported: (xhr) => { /*...*/ }
});
```

## Treetop Events

When the client library is used to make an XHR request, events will be dispached to indicate overall loading status.
Note that, by design, the context of specific requests cannot be distinguised this way.

### Treetop Event Types:

* `"treetopstart"` event is dispached when an XHR request is initiated. Will only execute once for concurrent requests.
* `"treetopcomplete"` event is dispached when all active XHR requests are completed.

Example

```
document.addEventListener("treetopstart", function () {
    document.body.classList.add("loading");
});
document.addEventListener("treetopcomplete", function () {
    document.body.classList.remove("loading");
});
```

## Custom Component

When an element has been added or removed from the DOM by the Treetop library, the node hierarchy is scanned for elements matching the configured mount/unmount functions.

* `mountTags`: match element tag name after being added
* `unmountTags`: match element tag name after removal
* `mountAttrs`: match attribute name after being attached
* `unmountAttrs`: match attribute name after removal

Custom JS components can make use of this for integration hooks.

## Built-in components

Some build-in components are available when treetop is initialized.
Built-in components can be enabled or disabled in the config.

### Feature Flags
Properties supported by Treetop config allow control of build-in components.

| Config Flag       | Type    | Default | Component                                      |
|-------------------|---------|---------|------------------------------------------------|
| treetopAttr       |`boolean`| `true`  | Enable the "treetop" attribute component       |
| treetopLinkAttr   |`boolean`| `true`  | Enable the "treetop-link" attribute component  |

### The "treetop" Attribute

The `treetop` attribute component overrides any `HTMLAnchorElement` or `HTMLFormElement` node it is attached to. Activating "href" or "action" behavior on those elements will trigger a Treetop XHR request instead of browser navigation.

#### Example
```
<a treetop href="/some/path">treetop link</a>
```
A click event on this anchor will result in the following Treetop request via the client library.
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
Submit event here will result in the following library call,
```
treetop.request("POST", "/some/path", "foo=bar", "application/x-www-form-urlencoded")
```

### The "treetop-link" Attribute

The `treetop-link` attribute component will trigger a treetop GET request when an element is clicked.
This is a useful alternative to the `treetop` attribute when you wish to avoid the semantics of the `href` anchor tag.

For example,

    <ANY treetop-link="/some/path/">...</ANY>

This is similar to the following,

    <ANY onclick="treetop.request('GET', '/some/path/')">...</ANY>

## Custom Merge

When a new fragment is matched to an existing DOM node the default behavior is to replace one with the other, then mount and unmount synchronously. It is possible however, to define a custom 'merge' function which merges the two elements in some way, for example...
```
treetop.init({
	...
	"merge": {
		"append-children": (next, prev) => {
			Array.from(next.children).forEach((child) => {
				treetop.mountChild(child, prev);
			})
		}
	}
})
```
This custom merge implementation will be triggered if both new and old elements have matching _treetop-merge_ attributes. Like so,
```
<!-- old -->
<ul id="list" treetop-merge="append-children"><li...

<!-- new -->
<ul id="list" treetop-merge="append-children"><li...
```

## Browser Support & Ployfills

Backwards compatibility is a priority for the client library. It has been designed to rely on long-supported APIs where possible. However, if broad browser support is important to you, the following modern browser features require a ployfill:
* `history.pushState`, so that the location can be updated following partial navigation.
* `HTMLTemplateElement`, for reliable decoding of HTML strings.
  * Suggested polyfill library https://github.com/webcomponents/template

The Treetop client library will abort loading and throw an error if these features are not available.

__TODO: More browser testing is needed, please help!__
