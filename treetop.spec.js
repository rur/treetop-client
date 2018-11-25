/*eslint-env node, es6, jasmine */
/*eslint indent: ['error', 2], quotes: [0, 'single'] */
const sinon = require('sinon');
const chai = require('chai');
const expect = chai.expect;
const window = global.window;
const document = global.window.document;

describe('Treetop', () => {
  'strict mode';
  var treetop, requests;

  beforeEach(() => {
    this.xhr = sinon.useFakeXMLHttpRequest();
    global.XMLHttpRequest = this.xhr;
    requests = [];
    treetop = window.treetop;
    this.xhr.onCreate = function (xhr) {
      requests.push(xhr);
    };
    var config = treetop.config();
    // reset all mount spys
    Object.values(config.mountTags).map(s => { try { s.resetHistory() } catch (e) {"pass"}})
    Object.values(config.mountAttrs).map(s => { try { s.resetHistory() } catch (e) {"pass"}})
    Object.values(config.unmountTags).map(s => { try { s.resetHistory() } catch (e) {"pass"}})
    Object.values(config.unmountAttrs).map(s => { try { s.resetHistory() } catch (e) {"pass"}})
  });

  afterEach(() => {
    this.xhr.restore();
  });

  it('should not allow init to be called more than once', () => {
    try {
      window.treetop.init();
    } catch (err) {
      expect(err.toString()).to.contain("Treetop: init has already been called")
      return
    }
    throw Error("An error was not thrown");
  });

  describe('issue basic GET request', () => {
    it('should have issued a request', () => {
      window.treetop.request("GET", "/test");
      var req = requests[0];
      expect(req).to.exist
    });

    it('should have issued a request with the method and url', () => {
      window.treetop.request("GET", "/test");
      var req = requests[0];
      expect(req.url).to.contain("/test");
      expect(req.method).to.equal("GET");
    });

    it('should have added the treetop header', () => {
      window.treetop.request("GET", "/test");
      var req = requests[0];
      expect(req.requestHeaders["accept"]).to.contain(treetop.PARTIAL_CONTENT_TYPE)
    });

    it('should have no body', () => {
      window.treetop.request("GET", "/test");
      var req = requests[0];
      expect(req.requestBody).to.be.null
    });
  });

  describe('issue basic POST request', () => {
    var req = null;
    beforeEach(() => {
      treetop.request("POST", "/test", "a=123&b=987", "application/x-www-form-urlencoded");
      req = requests[0];
    });

    it('should have issued a request with right info', () => {
      expect(req).to.exist;
      expect(req.url).to.contain("/test");
      expect(req.method).to.equal("POST");
      expect(req.requestHeaders["accept"]).to.contain(treetop.PARTIAL_CONTENT_TYPE);
      expect(req.url).to.equal("/test");
    });

    it('should have added the content type header', () =>
      expect(req.requestHeaders["content-type"])
        .to.contain("application/x-www-form-urlencoded")
    );

    it('should have a body', () => expect(req.requestBody).to.equal("a=123&b=987"));
  });

  describe('rejected request', () =>
    it('should have a white list of methods', () =>
      expect(() => treetop.request("NOMETHOD"))
        .to.throw("Treetop: Unknown request method 'NOMETHOD'")
    )
  );

  describe('replace indexed elements', () => {
    var el = null;
    beforeEach(() => {
      el = document.createElement("p");
      el.setAttribute("id", "test");
      el.textContent = "before!";
      document.body.appendChild(el);
    });

    afterEach(() => document.body.removeChild(document.getElementById("test")));

    it('should have appended the child', () => expect(el.parentNode.tagName).to.equal("BODY"));

    it('should replace <p>before!</p> with <em>after!</em>', () => {
      treetop.request("GET", "/test");
      requests[0].respond(
        200,
        { 'content-type': treetop.PARTIAL_CONTENT_TYPE },
        '<em id="test">after!</em>'
      );
      expect(document.body.textContent).to.equal("after!");
    });

    it('should do nothing with an unmatched response', () => {
      treetop.request("GET", "/test");
      requests[0].respond(
        200,
        { 'content-type': treetop.PARTIAL_CONTENT_TYPE },
        '<em id="test_other">after!</em>'
      );
      expect(document.body.textContent).to.equal("before!");
    });
  });

  describe('parse malformed responses', () => {
    beforeEach(() => {
      var el = document.createElement("p");
      el.setAttribute("id", "test");
      el.textContent = "before!";
      document.body.appendChild(el);
    });

    afterEach(() => document.body.removeChild(document.getElementById("test")));

    it('ignore test nodes', () => {
      treetop.request("GET", "/test");
      requests[0].respond(
        200,
        { 'content-type': treetop.PARTIAL_CONTENT_TYPE },
        'TESTING'
      );
      expect(document.body.textContent).to.equal("before!");
    });
  });

  describe('late arriving responses', () => {
    beforeEach(() => {
      var el = document.createElement("p");
      el.setAttribute("id", "test");
      el.textContent = "top!";
      document.body.appendChild(el);
    });

    afterEach(() => {
      document.body.innerHTML = ""
    });

    it('should ignore a stale partial response', () => {
      treetop.request("GET", "/test");
      treetop.request("GET", "/test");
      requests[1].respond(
        200,
        { 'content-type': treetop.PARTIAL_CONTENT_TYPE },
        '<em id="test">sooner!</em>'
     );
      requests[0].respond(
        200,
        { 'content-type': treetop.PARTIAL_CONTENT_TYPE },
        '<em id="test">later!</em>'
      );
      expect(document.body.textContent).to.equal("sooner!");
    });

    it('should allow a late arriving update to unrelated part of the DOM', () => {
      var el = document.createElement("p");
      el.setAttribute("id", "test2");
      el.textContent = "bottom!";
      document.body.appendChild(el);
      treetop.request("GET", "/test");
      treetop.request("GET", "/test2");
      requests[1].respond(
        200,
        { 'content-type': treetop.FRAGMENT_CONTENT_TYPE },
        '<em id="test">sooner!</em>'
      );
      requests[0].respond(
        200,
        { 'content-type': treetop.FRAGMENT_CONTENT_TYPE },
        '<em id="test2">later!</em>'
      );
      expect(document.body.textContent).to.equal("sooner!later!");
    });

    it('should ignore stale updates to children of updated containers', () => {
      var p = document.getElementById("test")
      var sub = document.createElement("span")
      sub.setAttribute("id", "test-sub")
      sub.textContent = "Sub Content!"
      p.appendChild(sub)
      treetop.request("GET", "/test-sub");
      treetop.request("GET", "/test");
      requests[1].respond(
        200,
        { 'content-type': treetop.FRAGMENT_CONTENT_TYPE },
        '<p id="test"><span id="test-sub">container!</span></p>'
      );
      requests[0].respond(
        200,
        { 'content-type': treetop.FRAGMENT_CONTENT_TYPE },
        '<em id="test-sub">child!</em>'
      );
      expect(document.body.textContent).to.equal("container!");
    });

  });

  describe('compose indexed elements', () => {
    var el = null;
    beforeEach(() => {
      el = document.createElement("ul");
      el.setAttribute("id", "test");
      el.setAttribute("treetop-compose", "test");
      el.innerHTML = "<li>1</li><li>2</li><li>3</li>";
      document.body.appendChild(el);
    });

    afterEach(() => document.body.removeChild(document.getElementById("test")));

    it('should have appended the child', () => expect(el.parentNode.tagName).to.equal("BODY"));

    it('should append items to the list', () => {
      treetop.request("GET", "/test");
      requests[0].respond(
        200,
        { 'content-type': treetop.PARTIAL_CONTENT_TYPE },
        '<ul id="test" treetop-compose="test"><li>4</li><li>5</li><li>6</li></ul>'
      );
      expect(document.body.textContent).to.equal("123456");
    });

    it('should replace if compose method does not match', () => {
      treetop.request("GET", "/test");
      requests[0].respond(
        200,
        { 'content-type': treetop.PARTIAL_CONTENT_TYPE },
        '<ul id="test" treetop-compose="something-else"><li>4</li><li>5</li><li>6</li></ul>'
      );
      expect(document.body.textContent).to.equal("456");
    });
  });


  describe('Handle special cases of elements', () => {
    it('should replace title tag', () => {
      treetop.request("GET", "/test");
      requests[0].respond(
        200,
        { 'content-type': treetop.PARTIAL_CONTENT_TYPE },
        '<title>New Title!</title>'
      );
      expect(document.title).to.equal("New Title!");
    })

    it('should not replace body tag', () => {
      treetop.request("GET", "/test");
      requests[0].respond(
        200,
        { 'content-type': treetop.PARTIAL_CONTENT_TYPE },
        '<body>New Body!</body>'
      );
      expect(document.body.textContent).not.to.equal("Body!");
    })

    it('should handle dependent element types', () => {
      // see http://www.ericvasilik.com/2006/07/code-karma.html
      document.body.innerHTML = '<table><tr id="test-table"><td>OLD CELL</td></tr></table>'
      treetop.request("GET", "/test");
      requests[0].respond(
        200,
        { 'content-type': treetop.PARTIAL_CONTENT_TYPE },
        '<tr id="test-table"><td>New Cell!</td></tr>'
      );
      expect(document.body.textContent).to.equal("New Cell!");
    })
  });

  describe('mounting and unmounting elements', () => {
    beforeEach(() => {
      this.el = document.createElement("DIV");
      this.el.textContent = "Before!";
      this.el.setAttribute("id", "test");
      document.body.appendChild(this.el);
    });

    afterEach(() => document.body.removeChild(document.getElementById("test")));

    describe('when elements are replaced', () => {
      beforeEach(() => {
        treetop.request("GET", "/test");
        requests[0].respond(
          200,
          { 'content-type': treetop.PARTIAL_CONTENT_TYPE },
          '<em id="test">after!</em>'
        );
        return this.nue = document.getElementById('test');
      });

      it('should remove the element from the DOM', () => {
        expect(this.el.parentNode).to.be.null;
      });

      it('should have inserted the new #test element', () => {
        expect(this.nue.tagName).to.equal("EM");
      });
    });
  });

  describe('binding components', () => {
    var config;
    beforeEach(() => {
      var el = document.createElement("p");
      el.setAttribute("id", "test");
      document.body.appendChild(el);
      var el2 = document.createElement("div");
      el2.setAttribute("id", "test2");
      el2.setAttribute("test-node", 123);
      document.body.appendChild(el2);
      config = window.treetop.config();
    });

    afterEach(() => {
      document.body.removeChild(document.getElementById("test"));
      document.body.removeChild(document.getElementById("test2"));
    });

    it('should have called the mount on the element', () => {
      treetop.request("GET", "/test");
      requests[0].respond(
        200,
        { 'content-type': treetop.PARTIAL_CONTENT_TYPE },
        '<test-node id="test"><p test>New Cell!</p></test-node>'
      );
      var el = document.getElementById("test");
      expect(el.tagName).to.equal("TEST-NODE");
      var mount = config.mountTags["test-node"];
      expect(calledWithStrict(mount, el)).to.be.true;
    });

    it('should not have called unmount on the new element', () => {
      treetop.request("GET", "/test");
      requests[0].respond(
        200,
        { 'content-type': treetop.PARTIAL_CONTENT_TYPE },
        '<test-node id="test"><p test>New Cell!</p></test-node>'
      );
      var el = document.getElementById("test");
      expect(el.tagName).to.equal("TEST-NODE");
      var unmount = config.unmountTags["test-node"];
      expect(calledWithStrict(unmount, el)).to.be.false;
    });

    it('should have called the mount on the attribute', () => {
      treetop.request("GET", "/test");
      requests[0].respond(
        200,
        { 'content-type': treetop.PARTIAL_CONTENT_TYPE },
        '<test-node id="test"><p id="test-child" test>New Cell!</p></test-node>'
      );
      var el = document.getElementById("test-child");
      var mount = config.mountAttrs["test"]
      expect(calledWithStrict(mount, el)).to.be.true;
    });

    it('should not have called unmount on the new element', () => {
      treetop.request("GET", "/test");
      requests[0].respond(
        200,
        { 'content-type': treetop.PARTIAL_CONTENT_TYPE },
        '<test-node id="test"><p id="test-child" test>New Cell!</p></test-node>'
      );
      var el = document.getElementById("test-child");
      var unmount = config.unmountAttrs["test"]
      expect(calledWithStrict(unmount, el)).to.be.false;
    });

    describe('when unmounted', () => {
      var el, el2;
      beforeEach(() => {
        treetop.request("GET", "/test");
        requests[0].respond(
          200,
          { 'content-type': treetop.PARTIAL_CONTENT_TYPE },
          '<test-node id="test"><p id="test-child" test>New Cell!</p></test-node>'
        );
        el = document.getElementById("test");
        el2 = document.getElementById("test-child");
        treetop.request("GET", "/test");
        requests[1].respond(
          200,
          { 'content-type': treetop.PARTIAL_CONTENT_TYPE },
          '<div id="test">after!</div><div id="test2">after2!</div>'
        );
      });

      it('should have called the unmount on the element', () => {
        var unmount = config.unmountTags["test-node"]
        expect(calledWithStrict(unmount, el)).to.be.true;
      });

      it('should have called the unmount on the attribute', () => {
        var unmount = config.unmountAttrs["test"]
        expect(calledWithStrict(unmount, el2)).to.be.true;
      });
    });

    describe('when unmounted', () => {
      var el, el2;
      beforeEach(() => {
        treetop.request("GET", "/test");
        requests[0].respond(
          200,
          { 'content-type': treetop.PARTIAL_CONTENT_TYPE },
          '<test-node id="test"><p id="test-child" test>New Cell!</p></test-node>'
        );
        el = document.getElementById("test");
        el2 = document.getElementById("test-child");
        treetop.request("GET", "/test");
        requests[1].respond(
          200,
          { 'content-type': treetop.PARTIAL_CONTENT_TYPE },
          '<div id="test">after!</div><div id="test2">after2!</div>'
        );
      });

      it('should have called the unmount on the element', () => {
        var unmount = config.unmountTags["test-node"]
        expect(calledWithStrict(unmount, el)).to.be.true;
      });

      it('should have called the unmount on the attribute', () => {
        var unmount = config.unmountAttrs["test"]
        expect(calledWithStrict(unmount, el2)).to.be.true;
      });
    });

    it('should have called mount on the same component multiple times', () => {
      var el;
      var mount = config.mountAttrs["test"]
      var mount2 = config.mountAttrs["test2"]
      treetop.request("GET", "/test");
      requests[0].respond(
        200,
        { 'content-type': treetop.PARTIAL_CONTENT_TYPE },
        '<test-node id="test"><p id="test-child" test test2>New Cell!</p></test-node>'
      );
      el = document.getElementById("test-child");
      expect(calledWithStrict(mount, el)).to.be.true;
      expect(calledWithStrict(mount2, el)).to.be.true;
    });

    it('should have called unmount on the same element multiple times', () => {
      var el;
      var unmount = config.unmountAttrs["test"]
      var unmount2 = config.unmountAttrs["test2"]
      treetop.request("GET", "/test");
      requests[0].respond(
        200,
        { 'content-type': treetop.PARTIAL_CONTENT_TYPE },
        '<test-node id="test"><p id="test-child" test test2>New Data</p></test-node>'
      );
      el = document.getElementById("test-child");
      treetop.request("GET", "/test");
      requests[1].respond(
        200,
        { 'content-type': treetop.PARTIAL_CONTENT_TYPE },
        '<div id="test">replaced</div>'
      );
      expect(calledWithStrict(unmount, el)).to.be.true;
      expect(calledWithStrict(unmount2, el)).to.be.true;
    });
  });

  describe('treetop.updateElement', () => {
    beforeEach(() => {
      document.body.innerHTML = "";
    });

    it('should allow an element to be created outside and mounted normally', () => {
      document.body.innerHTML = '<table><tr><td id="test">OLD CELL</td></tr></table>';
      var el = document.createElement("td");
      el.textContent = "New Cell!";
      treetop.updateElement(el, document.getElementById("test"));
      expect(document.body.textContent).to.equal("New Cell!");
    });

    it('should mount components on the new element', () => {
      document.body.innerHTML = '<table><tr><td id="test">OLD CELL</td></tr></table>';
      var el = document.createElement("td");
      el.textContent = "New Cell!";
      el.setAttribute("test", "something");
      treetop.updateElement(el, document.getElementById("test"));
      var mount = window.treetop.config().mountAttrs["test"];
      expect(calledWithStrict(mount, el)).to.be.true;
      var unmount = window.treetop.config().unmountAttrs["test"];
      expect(calledWithStrict(unmount, el)).to.be.false;
    });

    it('should unmount components on the old element', () => {
      document.body.innerHTML = '<table><tr><td test id="test-cell">OLD CELL</td></tr></table>';
      var oldElm = document.getElementById("test-cell")
      var el = document.createElement("td");
      el.textContent = "New Cell!";
      el.setAttribute("test", "something");
      treetop.updateElement(el, oldElm);
      var unmount = window.treetop.config().unmountAttrs["test"];
      expect(calledWithStrict(unmount, oldElm)).to.be.true;
      var mount = window.treetop.config().mountAttrs["test"];
      expect(calledWithStrict(mount, oldElm)).to.be.false;
    });
  });
});


/// utils
//

/**
 * stragely, sinon does not provide a built in assertion like this
 */
function calledWithStrict(spy) {
  var calls = spy.getCalls();
  var call;
  var args = Array.prototype.slice.call(arguments, 1)
  SCAN:
  for (var i = 0, len = calls.length; i < len; i++) {
    call = calls[i];
    if (call.args.length !== args.length) continue SCAN;
    for (var j = 0, lenj = args.length; j < lenj; j++) {
      if (call.args[j] !== args[j]) {
        continue SCAN;
      }
    }
    return true;
  }
  return false;
}
