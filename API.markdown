# API Docs

The Treetop JavaScript client library defines a `window.treetop` global instance with the following static API methods.

## treetop.request
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
| body              | (optional) string | the encoded request body               |
| contentType       | (optional) string | body encoding type                     |


## treetop.submit
Parse state of a form element inputs, and submit a HTTP request using XHR.

__NOTE:__ This feature needs a lot more testing, please report any issues you encounter.

```
var formElement = document.getElementById("my-form");
treetop.submit(formElement);
```

##### Usage
```
treetop.submit( [HTMLFormElement] )
```

##### Arguments:

| Param    | Type             | Details                                              |
|----------|------------------|------------------------------------------------------|
| form     | HTMLFormElement  | Submit the form as treetop partial request using XHR |



## treetop.init

One time initialization of Treetop with configuration which will be stored internally.

```
window.init({
  treetopAttr: true,
  treetopLinkAttr: true,
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

#### Usage
```
treetop.init( [config] )
```

#### Arguments:

| Param             | Type    | Details                                          |
|-------------------|---------|--------------------------------------------------|
| config            | `Object`  | Object treetop component config                  |

#### Configuration properties:

| Param             | Type    | Default | Details                                           |
|-------------------|---------|---------|---------------------------------------------------|
| mountTags         | `Object`  | `{}`    | Component hooks keyed by match pattern            |
| unmountTags       | `Object`  | `{}`    | Component hooks keyed by match pattern            |
| mountAttrs        | `Object`  | `{}`    | Component hooks keyed by match pattern            |
| unmountAttrs      | `Object`  | `{}`    | Component hooks keyed by match pattern            |
| merge             | `Object`  | `{}`    | Custom merge function with a merge-name key       |
| onNetworkError    | `Function`| `null`  | Network connection error callback, (xhr) => {...} |
| onUnsupported     | `Function`| `null`  | Network connection error callback, (xhr) => {...} |
| treetopAttr       | `Boolean` | `true`  | treetop attribute component feature flag          |
| treetopLinkAttr   | `Boolean` | `true`  | treetop-link attribute component feature flag     |


## treetop.config
Get a copy of current treetop config for debug purposes. The configuration cannot be changed this way, FYI.
```
treetop.config()
=>
{
  treetopAttr: true,
  treetopLinkAttr: true,
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
}
```


## treetop.updateElement
Replace one element attached to the DOM with a new element and mount/unmount accordingly.
```
var oldElm = document.getElementById("my-section");
var newElm = document.createElement("p");
treetop.updateElement(newElm, oldElm)
```

##### Usage
```
treetop.updateElement( [HTMLElement], [HTMLElement] )
```

##### Arguments:

| Param             | Type         | Details                                          |
|-------------------|--------------|--------------------------------------------------|
| newElement        | `HTMLElement` | newly minted template element to add to the DOM  |
| oldElement        | `HTMLElement` | DOM node to be replaced and unmounted.           |



## treetop.mountChild
Append a new element to the child list of a DOM node and mount the new element.

```
var list = document.getElementById("my-list");
var newListItem = document.createElement("li");
treetop.mountChild(newListItem, list)
```

##### Usage
```
treetop.mountChild( [HTMLElement], [HTMLElement] )
```

##### Arguments:

| Param             | Type         | Details                                          |
|-------------------|--------------|--------------------------------------------------|
| newElement        | `HTMLElement` | newly minted template element to add to the DOM  |
| parentElement      | `HTMLElement` | DOM node act as parent of new node.           |


## treetop.mountAfter
Add a new element as a sibling immediately following a DOM node and mount the new element.

```
var item2 = document.getElementById("list-item-2");
var item3 = document.createElement("li");
treetop.mountAfter(item3, item2)
```

##### Usage
```
treetop.mountAfter( [HTMLElement], [HTMLElement] )
```

##### Arguments:

| Param             | Type         | Details                                          |
|-------------------|--------------|--------------------------------------------------|
| newElement        | `HTMLElement` | newly minted template element to add to the DOM  |
| siblingElement    | `HTMLElement` | DOM node to act as immediate sibling of new node.|


## treetop.mountBefore
Add a new element as a sibling immediately before a DOM node and mount the new element.

```
var item2 = document.getElementById("list-item-2");
var item1 = document.createElement("li");
treetop.mountBefore(item1, item2)
```

##### Usage
```
treetop.mountBefore( [HTMLElement], [HTMLElement] )
```

##### Arguments:

| Param             | Type         | Details                                          |
|-------------------|--------------|--------------------------------------------------|
| newElement        | `HTMLElement` | newly minted template element to add to the DOM  |
| siblingElement    | `HTMLElement` | DOM node to act as immediate sibling of new node.|


## treetop.unmount
Remove an element from the DOM and trigger unmount component hooks.
```
var elm = document.getElementById("to-destroy");
treetop.unmount(elm);
```

##### Usage
```
treetop.unmount( [HTMLElement])
```

##### Arguments:

| Param             | Type         | Details                                          |
|-------------------|--------------|--------------------------------------------------|
| oldElement        | `HTMLElement` | Element attached to the DOM remove and unmount |



## treetop.PARTIAL_CONTENT_TYPE
The Treetop partial content type value supported by this version of the treetop client.

## treetop.FRAGMENT_CONTENT_TYPE
The Treetop fragment content type value supported by this version of the treetop client.
