# API Docs

The Treetop JavaScript client library defines a `window.treetop` global instance with the
following API.

### Index

-   _Issue Requests:_
    -   [request([method], [url], [body], [contentType], [headers])](#treetoprequest)
    -   [submit( [HTMLFormElement], [HTMLElement] )](#treetopsubmit)
-   _Configuration:_
    -   [init( [config] )](#treetopinit)
    -   [config()](#treetopconfig)
-   _Mounting Elements:_
    -   [mount( [HTMLElement], [HTMLElement] )](#treetopmount)
    -   [mountChild( [HTMLElement], [HTMLElement] )](#treetopmountchild)
    -   [mountBefore( [HTMLElement], [HTMLElement] )](#treetopmountbefore)
    -   [unmount( [HTMLElement])](#treetopunmount)
-   _Misc:_
    -   [merge( [HTMLElement], [HTMLElement] )](#treetopmerge)
    -   [TEMPLATE_CONTENT_TYPE](#treetoptemplatecontenttype)

## Issue Requests

### treetop.request

A Treetop request can be triggered from a script like so,

```
treetop.request(
	"POST",
	"/example",
	"a=123&b=987",
	"application/x-www-form-urlencoded"
)
```

Notice that no callback mechanism is supported. Response handling is mandated by the protocol, see [Treetop Library](https://github.com/rur/treetop).

##### Usage

```
treetop.request([method], [url], [body], [contentType], [headers])
```

##### Arguments:

| Param       | Type                              | Details                          |
| ----------- | --------------------------------- | -------------------------------- |
| method      | `String`                          | The HTTP request method to use   |
| URL         | `String`                          | The URL path                     |
| body        | (optional) `String`               | the encoded request body         |
| contentType | (optional) `String`               | body encoding type               |
| headers     | (optional) `Array<Array<String>>` | List of header name values pairs |

### treetop.submit

Parse state of a form element inputs, and submit a HTTP request using XHR.

**NOTE:** This feature needs a lot more testing, please report any issues you encounter.

```
var formElement = document.getElementById("my-form");
treetop.submit(formElement);
```

##### Usage

```
treetop.submit( [HTMLFormElement], [HTMLElement] )
```

##### Arguments:

| Param     | Type                     | Details                                                        |
| --------- | ------------------------ | -------------------------------------------------------------- |
| form      | `HTMLFormElement`        | Submit the form as treetop partial request using XHR           |
| submitter | (optional) `HTMLElement` | designate a submitter element which may override form behavior |

## Configuration

### treetop.init

One time initialization of Treetop with configuration which will be stored internally.

```
window.init({
  treetopAttr: true,
  treetopLinkAttr: true,
  treetopSubmitterAttr: true,
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
  onUnsupported: (xhr, url) => { /*...*/ }
});
```

#### Usage

```
treetop.init( [config] )
```

#### Arguments:

| Param  | Type     | Details                         |
| ------ | -------- | ------------------------------- |
| config | `Object` | Object treetop component config |

#### Throws

`Error`: If the library has already been initialized intentionally or
implicitly with a call to any API method.

#### Configuration properties:

| Param                | Type       | Default | Details                                                  |
| -------------------- | ---------- | ------- | -------------------------------------------------------- |
| mountAttrs           | `Object`   | `{}`    | Component hooks keyed by match pattern                   |
| unmountAttrs         | `Object`   | `{}`    | Component hooks keyed by match pattern                   |
| merge                | `Object`   | `{}`    | Custom merge function with a merge-name key              |
| onNetworkError       | `Function` | `null`  | Network connection error callback, (xhr) => {...}        |
| onUnsupported        | `Function` | `null`  | Non-Treetop response error callback, (xhr, url) => {...} |
| treetopAttr          | `Boolean`  | `true`  | treetop attribute component feature flag                 |
| treetopLinkAttr      | `Boolean`  | `true`  | treetop-link attribute component feature flag            |
| treetopSubmitterAttr | `Boolean`  | `true`  | treetop-submit attribute component feature flag          |

### treetop.config

Get a copy of current treetop config for debug purposes. The configuration cannot be changed this way, FYI.

```
treetop.config()
=>
{
  treetopAttr: true,
  treetopLinkAttr: true,
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
  onUnsupported: (xhr, url) => { /*...*/ }
}
```

## Modifying the DOM

Wrap basic DOM modification procedures to incorporate the mount/unmount process
when attaching or detaching an element from a web page.

### treetop.mount

Attach a new template fragment to the DOM replacing an existing DOM node.
The unmount procedure is run on the old element, then it is replaced with the new element.
The mount procedure is then run on the new element.

```
var newElm = document.createElement("p");
var oldElm = document.getElementById("my-section");
treetop.mount(newElm, oldElm);
```

##### Usage

```
treetop.mount( [HTMLElement], [HTMLElement] );
```

##### Arguments:

| Param      | Type          | Details                                         |
| ---------- | ------------- | ----------------------------------------------- |
| newElement | `HTMLElement` | newly minted template element to add to the DOM |
| oldElement | `HTMLElement` | DOM node to be replaced and unmounted.          |

### treetop.mountChild

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

| Param         | Type          | Details                                         |
| ------------- | ------------- | ----------------------------------------------- |
| newElement    | `HTMLElement` | newly minted template element to add to the DOM |
| parentElement | `HTMLElement` | DOM node act as parent of new node.             |

### treetop.mountBefore

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

| Param          | Type          | Details                                           |
| -------------- | ------------- | ------------------------------------------------- |
| newElement     | `HTMLElement` | newly minted template element to add to the DOM   |
| siblingElement | `HTMLElement` | DOM node to act as immediate sibling of new node. |

### treetop.unmount

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

| Param      | Type          | Details                                        |
| ---------- | ------------- | ---------------------------------------------- |
| oldElement | `HTMLElement` | Element attached to the DOM remove and unmount |

## Misc

### treetop.merge

This is the procedure that is called to apply a template fragment to a target location
attached to the DOM. It will check for matching treetop-merge attribute. If a custom merge
procedure is not found, the default [mount](#treetopmount) procedure is used.

```
var target = document.getElementById("my-section");
var fragment = document.createElement("p");
treetop.merge(fragment, target);
```

##### Usage

```
treetop.merge( [HTMLElement], [HTMLElement] )
```

##### Arguments:

| Param    | Type          | Details                                         |
| -------- | ------------- | ----------------------------------------------- |
| fragment | `HTMLElement` | newly minted template element to add to the DOM |
| target   | `HTMLElement` | DOM node to act as the mount-point              |

### treetop.TEMPLATE_CONTENT_TYPE

The Treetop content type value supported by the server-side handlers.
