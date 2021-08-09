## [0.10.0] - 2021-08-08

Address issues with the DOM mount API, clarify merge vs. mount.

### Breaking Changes

-   Removed `treetop.updateElement` from the JS API, (replaced with the following)
-   Add `treetop.mount` static method for explicitly replacing an element
-   Add `treetop.merge` static method for applying an new template, respecting `treetop-merge` attributes

### Fix

-   Detect recursive merges and throw an error

### Changes

-   Add an _.editorconfig_ and apply an automatic code formatter
-   Remove internal `defaultComposition` method
-   Minor improvements to API reference markdown

## [0.9.0] - 2020-03-10

Adopt changes to Treetop protocol in v0.3.0 of the Go library.

### Changed

-   Treetop content type changed to `application/x.treetop-html-template+xml`
-   Response URL is renamed to `X-Page-URL` and is now optional
-   Response body can now come wrapped in a `<template>...</template>` tag

### Redirects

-   Redirects now use `Location` header
-   Status will continue to be 200
-   There must be a header named `X-Treetop-Redirect` with a value of `SeeOther`

## [0.8.1] - 2019-10-17

### Changed

-   Remove `treetop.mountAfter`, no corresponding DOM method exists, this was a mix-up.

### Bugfix

-   DOM component mounting/unmounting API functions were not tested and inevitably did not work!

## [0.8.0] - 2019-08-19

### Changed

-   Replace mock-style test harness with headless browser
-   Use FormData api for both multipart and urlencoded form data serialization to reduce edge cases
-   New dependency on URLSearchParams API for urlencoding form data
-   Make API methods more strict about node types
-   Remove some redundency from the code overall.

### Bugfix

-   Address issue with shadowed form element properties breaking DOM dependent code

## [0.7.7] - 2019-06-12

### Bugfix

-   Use `Node.parentElement` for DOM traversal to avoid non-element nodes.

## [0.7.6] - 2019-06-11

### Changed

-   Add support for 'X-Response-History' response header using `history.replaceState`

## [0.7.5] - 2019-05-27

### Changed

-   Rename submit element component from `treetop-submit` to `treetop-submitter`
-   Support `formnovalidate` attribute on submitter component

### Bugfix

-   Fix typo in FORM element scan of submit attr component which results in an infinite while loop (◔_◔)

## [0.7.4] - 2019-05-21

### Changed

-   Support optional designated submitter element in `treetop.submit` function
-   Create `treetop-submit` built-in component to allow buttons to override form behavior
-   Check validity of form in `treetop.submit` function
-   Remove fallback implementation of multipart form encoding, require a polyfil instead.
-   Various code clean up

## [0.7.3] - 2019-04-15

### Bugfix

-   Just rely on MouseEvent properties when checking for modifier keys, tracking approach has issues.

## [0.7.2] - 2019-04-15

### Bugfix

-   Make a better effort to address issues with how history API is being used.
-   Treetop client should not interfere unnecessarily with other JS code using History API
-   Abuse of try/catch block

## [0.7.1] - 2019-04-05

### Changed

-   Add support for custom `headers` in Treetop request API

## [0.7.0] - 2019-03-21

### Changed

-   Remove support for mounting component matching HTML tag names;
-   When treetop attribute component is enabled, add an attribute to body allowing it to be disabled;
-   Only handle popstate when the state being popped has a treetop flag in state;
-   Unmount nodes before they are removed from the DOM;
-   Send request URL as second parameter to `onUnsupported` handler;
-   Make global browser footprint of treetop client library more clearly defined.

### Bugfix

-   Prevent an exceptions thrown by a mount function from affect internals or mounting of other components.

## [0.6.1] - 2019-02-08

### Bugfix

-   treetop-link attribute component changed to use `event.currentTarget` to obtain a URL.

## [0.6.0] - 2018-11-25

Change how mounting is done internally. New API for editing DOM nodes which incorporates component (un)mounting.

### Changed

-   Change use of term "compose" in favor of "merge"
-   Mount and unmount no longer supported in custom merge functions
    -   new DOM editing API must be used.

### Added

-   New functions for editing DOM nodes while mounting/unmounting components.
    -   `treetop.mountChild`
    -   `treetop.mountAfter`
    -   `treetop.mountBefore`
    -   `treetop.unmount`
-   Treetop client API docs

## [0.5.6] - 2018-11-25

### Bugfix

-   FormSerializer: Error when an input does not have a 'type' attribute defined

## [0.5.5] - 2018-11-25

### Changed

-   Treetop initialization will now fail if any API method is called beforehand;
-   New "treetopLinkAttr" config feature flag.
-   README docs improved

## [0.5.3] - 2018-06-09

### Changed

-   Fixed bug where Treetop element attribute is not enabled by default as intended

## [0.4.1] - 2018-25-07

### Changed

-   Check for treetop redirect before processing any other aspect of the XHR response

## [0.4.0] - 2018-24-07

### Changed

-   Create treetop.onUnsupported signal to permit request handing fall through.
-   Remove treetop.onUpdated signal what wasn't very useful after all.
-   Internal refactoring and tidy up

## [0.3.0] - 2018-23-07

### Changed

-   Check for absence of support for essential browser features that might not be available in
    certain browsers. Throw an error and ask for a polyfill.

#### HTMLTemplateElement, a new API dependency

Certain types of HTML elements cannot be created as a fragment using the innerHTML approach.
This is a tricky thing to deal with. Many modern browsers include a type of element called
HTMLTemplateElement, which addresses this issue. This is not universally supported by
any means and a polyfill is not trivial. Therefore, it was necessary to make some form of
HTML templates polyfill a dependency where uncooperative browsers are targeted.

## [0.2.1] - 2018-23-07

### Changed

Ignore late arriving responses when they conflict with requests that have
been fulfilled more recently.

## [0.2.0] - 2018-19-07

### Changed

-   Remove DOM node element state from unmounting process @Exbia
