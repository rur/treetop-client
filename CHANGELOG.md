
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
