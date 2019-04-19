## [0.7.3] - 2019-04-15

### Bugfix

- Just rely on MouseEvent properties when checking for modifier keys, tracking approach has issues.

## [0.7.2] - 2019-04-15

### Bugfix

- Make a better effort to address issues with how history API is being used.
- Treetop client should not interfere unnecessarily with other JS code using History API
- Abuse of try/catch block


## [0.7.1] - 2019-04-05

### Changed

- Add support for custom `headers` in Treetop request API

## [0.7.0] - 2019-03-21

### Changed

- Remove support for mounting component matching HTML tag names;
- When treetop attribute component is enabled, add an attribute to body allowing it to be disabled;
- Only handle popstate when the state being popped has a treetop flag in state;
- Unmount nodes before they are removed from the DOM;
- Send request URL as second parameter to `onUnsupported` handler;
- Make global browser footprint of treetop client library more clearly defined.

### Bugfix

- Prevent an exceptions thrown by a mount function from affect internals or mounting of other components.

## [0.6.1] - 2019-02-08

### Bugfix

- treetop-link attribute component changed to use `event.currentTarget` to obtain a URL.

## [0.6.0] - 2018-11-25

Change how mounting is done internally. New API for editing DOM nodes which incorporates component (un)mounting.

### Changed

- Change use of term "compose" in favor of "merge"
- Mount and unmount no longer supported in custom merge functions
    * new DOM editing API must be used.

### Added
- New functions for editing DOM nodes while mounting/unmounting components.
    * `treetop.mountChild`
    * `treetop.mountAfter`
    * `treetop.mountBefore`
    * `treetop.unmount`
- Treetop client API docs

## [0.5.6] - 2018-11-25
### Bugfix

- FormSerializer: Error when an input does not have a 'type' attribute defined

## [0.5.5] - 2018-11-25
### Changed

- Treetop initialization will now fail if any API method is called beforehand;
- New "treetopLinkAttr" config feature flag.
- README docs improved


## [0.5.3] - 2018-06-09
### Changed

- Fixed bug where Treetop element attribute is not enabled by default as intended


## [0.4.1] - 2018-25-07
### Changed

- Check for treetop redirect before processing any other aspect of the XHR response

## [0.4.0] - 2018-24-07
### Changed

- Create treetop.onUnsupported signal to permit request handing fall through.
- Remove treetop.onUpdated signal what wasn't very useful after all.
- Internal refactoring and tidy up


## [0.3.0] - 2018-23-07
### Changed

- Check for absense of support for essential browser features that might not be available in
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
- Remove DOM node element state from unmounting process @Exbia
