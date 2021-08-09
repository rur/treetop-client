/*eslint-env browser, es6, jasmine */
/*eslint indent: ['error', 2], quotes: [0, 'single'] */
const expect = chai.expect;
sandbox = document.createElement("div");
sandbox.id = "sandbox";
document.body.append(sandbox);

describe("Treetop", () => {
  "strict mode";
  var treetop, requests;

  beforeEach(() => {
    this.xhr = sinon.useFakeXMLHttpRequest();
    window.XMLHttpRequest = this.xhr;
    requests = [];
    treetop = window.treetop;
    this.xhr.onCreate = function (xhr) {
      requests.push(xhr);
    };
    var config = treetop.config();
    // reset all mount spys
    Object.values(config.mountAttrs).map((s) => {
      try {
        s.resetHistory();
      } catch (e) {
        ("pass");
      }
    });
    Object.values(config.unmountAttrs).map((s) => {
      try {
        s.resetHistory();
      } catch (e) {
        ("pass");
      }
    });
    window.flushTimers();
  });

  afterEach(() => {
    this.xhr.restore();
  });

  it("should not allow init to be called more than once", () => {
    try {
      window.treetop.init();
    } catch (err) {
      expect(err.toString()).to.contain(
        "Treetop: Failed attempt to re-initialize"
      );
      return;
    }
    throw Error("An error was not thrown");
  });

  describe("issue basic GET request", () => {
    it("should have issued a request", () => {
      window.treetop.request("GET", "/test");
      var req = requests[0];
      expect(req).to.exist;
    });

    it("should have issued a request with the method and url", () => {
      window.treetop.request("GET", "/test");
      var req = requests[0];
      expect(req.url).to.contain("/test");
      expect(req.method).to.equal("GET");
    });

    it("should have added the treetop header", () => {
      window.treetop.request("GET", "/test");
      var req = requests[0];
      expect(req.requestHeaders["accept"]).to.contain(
        treetop.TEMPLATE_CONTENT_TYPE
      );
    });

    it("should have no body", () => {
      window.treetop.request("GET", "/test");
      var req = requests[0];
      expect(req.requestBody).to.be.null;
    });
  });

  describe("issue basic POST request", () => {
    var req = null;
    beforeEach(() => {
      treetop.request(
        "POST",
        "/test",
        "a=123&b=987",
        "application/x-www-form-urlencoded"
      );
      req = requests[0];
    });

    it("should have issued a request with right info", () => {
      expect(req).to.exist;
      expect(req.url).to.contain("/test");
      expect(req.method).to.equal("POST");
      expect(req.requestHeaders["accept"]).to.contain(
        treetop.TEMPLATE_CONTENT_TYPE
      );
      expect(req.url).to.equal("/test");
    });

    it("should have added the content type header", () =>
      expect(req.requestHeaders["content-type"]).to.contain(
        "application/x-www-form-urlencoded"
      ));

    it("should have a body", () =>
      expect(req.requestBody).to.equal("a=123&b=987"));
  });

  describe("include headers", () => {
    it("should include one header", () => {
      treetop.request(
        "POST",
        "/test",
        "a=123&b=987",
        "application/x-www-form-urlencoded",
        [["x-custom-header", "VALUE"]]
      );
      var req = requests[0];
      expect(req.requestHeaders["x-custom-header"]).to.eq("VALUE");
    });

    it("should include multiple headers", () => {
      treetop.request(
        "POST",
        "/test",
        "a=123&b=987",
        "application/x-www-form-urlencoded",
        [
          ["x-custom-header", "VALUE"],
          ["x-custom-header-2", "VALUE_2"],
        ]
      );
      var req = requests[0];
      expect(req.requestHeaders["x-custom-header"]).to.eq("VALUE");
      expect(req.requestHeaders["x-custom-header-2"]).to.eq("VALUE_2");
    });

    it("should include duplicate headers", () => {
      treetop.request(
        "POST",
        "/test",
        "a=123&b=987",
        "application/x-www-form-urlencoded",
        [
          ["x-custom-header", "VALUE"],
          ["x-custom-header", "VALUE_2"],
        ]
      );
      var req = requests[0];
      expect(req.requestHeaders["x-custom-header"]).to.eq("VALUE, VALUE_2");
    });
  });

  describe("rejected request", () =>
    it("should have a white list of methods", () =>
      expect(() => treetop.request("NOMETHOD")).to.throw(
        "Treetop: Unknown request method 'NOMETHOD'"
      )));

  describe("replace indexed elements", () => {
    var el = null;
    beforeEach(() => {
      el = document.createElement("p");
      el.setAttribute("id", "test");
      el.textContent = "before!";
      sandbox.appendChild(el);
    });

    afterEach(() => (sandbox.innerHTML = ""));

    it("should have appended the child", () =>
      expect(el.parentNode.id).to.equal("sandbox"));

    it("should replace <p>before!</p> with <em>after!</em>", () => {
      treetop.request("GET", "/test");
      requests[0].respond(
        200,
        { "content-type": treetop.TEMPLATE_CONTENT_TYPE },
        '<template><em id="test">after!</em></template>'
      );
      window.flushTimers();
      expect(document.getElementById("test").textContent).to.equal("after!");
    });

    it("should handle utf-8 encoded string", () => {
      treetop.request("GET", "/test");
      requests[0].respond(
        200,
        { "content-type": treetop.TEMPLATE_CONTENT_TYPE },
        '<template><em id="test">🕺!</em></template>'
      );
      window.flushTimers();
      expect(document.getElementById("test").textContent).to.equal("🕺!");
    });

    it("should handle a string with html entities encoding for unicode characters", () => {
      treetop.request("GET", "/test");
      requests[0].respond(
        200,
        { "content-type": treetop.TEMPLATE_CONTENT_TYPE },
        '<template><em id="test">&#x1F57A!</em></template>'
      );
      window.flushTimers();
      expect(document.getElementById("test").textContent).to.equal("🕺!");
    });

    it("should work without template tags", () => {
      treetop.request("GET", "/test");
      requests[0].respond(
        200,
        { "content-type": treetop.TEMPLATE_CONTENT_TYPE },
        '<template><em id="test">after!</em></template>'
      );
      window.flushTimers();
      expect(document.getElementById("test").textContent).to.equal("after!");
    });

    it("should do nothing with an unmatched response", () => {
      treetop.request("GET", "/test");
      requests[0].respond(
        200,
        { "content-type": treetop.TEMPLATE_CONTENT_TYPE },
        '<template><em id="test_other">after!</em></template>'
      );
      window.flushTimers();
      expect(document.getElementById("test").textContent).to.equal("before!");
    });
  });

  describe("response handling edge cases", () => {
    beforeEach(() => {
      var el = document.createElement("p");
      el.setAttribute("id", "test");
      el.textContent = "before!";
      sandbox.appendChild(el);
    });

    afterEach(() => (sandbox.innerHTML = ""));

    it("ignore test nodes", () => {
      treetop.request("GET", "/test");
      requests[0].respond(
        200,
        { "content-type": treetop.TEMPLATE_CONTENT_TYPE },
        "TESTING"
      );
      window.flushTimers();
      expect(document.getElementById("test").textContent).to.equal("before!");
    });

    it("form element with input names shadowing element properties", () => {
      treetop.request("GET", "/test");
      requests[0].respond(
        200,
        { "content-type": treetop.TEMPLATE_CONTENT_TYPE },
        '<template><form id="test"><p>OK!</p><input name="tagName"/></form></template>'
      );
      window.flushTimers();
      expect(document.getElementById("test").textContent).to.equal("OK!");
    });

    it("replace child of a form element when properties are shadowed", () => {
      treetop.request("GET", "/test");
      requests[0].respond(
        200,
        { "content-type": treetop.TEMPLATE_CONTENT_TYPE },
        '<template><form id="test"><p>FIRST!</p><input name="parentElement"/></form></template>'
      );
      window.flushTimers();
      treetop.request("GET", "/test");
      requests[1].respond(
        200,
        { "content-type": treetop.TEMPLATE_CONTENT_TYPE },
        '<template><form id="test"><p>SECOND!</p><input name="othername"/></form></template>'
      );
      expect(document.getElementById("test").textContent).to.equal("SECOND!");
    });
  });

  describe("late arriving responses", () => {
    beforeEach(() => {
      var el = document.createElement("p");
      el.setAttribute("id", "test");
      el.textContent = "top!";
      sandbox.appendChild(el);
    });

    afterEach(() => {
      sandbox.innerHTML = "";
    });

    it("should ignore a stale partial response", () => {
      treetop.request("GET", "/test");
      treetop.request("GET", "/test");
      requests[1].respond(
        200,
        {
          "content-type": treetop.TEMPLATE_CONTENT_TYPE,
          "X-Page-URL": "/test",
        },
        '<template><em id="test">sooner!</em></template>'
      );
      window.flushTimers();
      requests[0].respond(
        200,
        {
          "content-type": treetop.TEMPLATE_CONTENT_TYPE,
          "X-Page-URL": "/test",
        },
        '<template><em id="test">later!</em></template>'
      );
      window.flushTimers();
      expect(document.getElementById("test").textContent).to.equal("sooner!");
    });

    it("should allow a late arriving update to unrelated part of the DOM", () => {
      var el = document.createElement("p");
      el.setAttribute("id", "test2");
      el.textContent = "bottom!";
      sandbox.appendChild(el);
      treetop.request("GET", "/test");
      treetop.request("GET", "/test2");
      requests[1].respond(
        200,
        { "content-type": treetop.TEMPLATE_CONTENT_TYPE },
        '<template><em id="test">sooner!</em></template>'
      );
      window.flushTimers();
      requests[0].respond(
        200,
        { "content-type": treetop.TEMPLATE_CONTENT_TYPE },
        '<template><em id="test2">later!</em></template>'
      );
      window.flushTimers();
      expect(document.getElementById("test").textContent).to.equal("sooner!");
      expect(document.getElementById("test2").textContent).to.equal("later!");
    });

    it("should ignore stale updates to children of updated containers", () => {
      var p = document.getElementById("test");
      var sub = document.createElement("span");
      sub.setAttribute("id", "test-sub");
      sub.textContent = "Sub Content!";
      p.appendChild(sub);
      treetop.request("GET", "/test-sub");
      treetop.request("GET", "/test");
      requests[1].respond(
        200,
        { "content-type": treetop.TEMPLATE_CONTENT_TYPE },
        '<template><p id="test"><span id="test-sub">container!</span></p></template>'
      );
      window.flushTimers();
      requests[0].respond(
        200,
        { "content-type": treetop.TEMPLATE_CONTENT_TYPE },
        '<template><em id="test-sub">child!</em></template>'
      );
      window.flushTimers();
      expect(document.getElementById("test").textContent).to.equal(
        "container!"
      );
    });
  });

  describe("treetop-merge indexed elements", () => {
    var el = null;
    beforeEach(() => {
      el = document.createElement("ul");
      el.setAttribute("id", "test");
      el.setAttribute("treetop-merge", "test");
      el.innerHTML = "<li>1</li><li>2</li><li>3</li>";
      sandbox.appendChild(el);
    });

    afterEach(() => (sandbox.innerHTML = ""));

    it("should have appended the child", () =>
      expect(el.parentNode.id).to.equal("sandbox"));

    it("should trigger merge when called using treetop.merge", () => {
      const fragment = document.createElement("ul");
      fragment.setAttribute("treetop-merge", "test");
      fragment.innerHTML = "<li>4</li><li>5</li><li>6</li></ul>";
      treetop.merge(fragment, el);
      expect(el.textContent).to.eq("123456");
    });

    it("should append items to the list as a result of XHR", () => {
      treetop.request("GET", "/test");
      requests[0].respond(
        200,
        { "content-type": treetop.TEMPLATE_CONTENT_TYPE },
        '<template><ul id="test" treetop-merge="test"><li>4</li><li>5</li><li>6</li></ul></template>'
      );
      window.flushTimers();
      expect(document.getElementById("test").textContent).to.equal("123456");
    });

    it("should fall back on replace when called using treetop.merge", () => {
      const fragment = document.createElement("ul");
      fragment.setAttribute("treetop-merge", "NOT-MATCHING");
      fragment.innerHTML = "<li>4</li><li>5</li><li>6</li></ul>";
      treetop.merge(fragment, el);
      expect(sandbox.textContent).to.eq("456");
    });

    it("should replace if compose method does not match after XHR", () => {
      treetop.request("GET", "/test");
      requests[0].respond(
        200,
        { "content-type": treetop.TEMPLATE_CONTENT_TYPE },
        '<template><ul id="test" treetop-merge="something-else"><li>4</li><li>5</li><li>6</li></ul></template>'
      );
      window.flushTimers();
      expect(document.getElementById("test").textContent).to.equal("456");
    });
  });

  describe("treetop-merge detect recursive merge", () => {
    var el = null;
    beforeEach(() => {
      el = document.createElement("div");
      el.setAttribute("id", "test");
      el.setAttribute("treetop-merge", "test-recursive-merge");
      sandbox.appendChild(el);
    });

    afterEach(() => (sandbox.innerHTML = ""));

    it("should replace if compose method does not match", () => {
      treetop.request("GET", "/test");
      try {
        requests[0].respond(
          200,
          { "content-type": treetop.TEMPLATE_CONTENT_TYPE },
          '<template><div id="test" treetop-merge="test-recursive-merge"></div></template>'
        );
        window.flushTimers();
      } catch (error) {
        expect(error.message).to.contain(
          "Treetop: Recursive merge detected inside merge procedure test-recursive-merge. " +
            "Be careful when using treetop.merge inside a custom merge function!"
        );
        return;
      }
      throw new Error("Expecting an error!");
    });
  });

  describe("Handle special cases of elements", () => {
    afterEach(() => {
      sandbox.innerHTML = "";
    });

    it("should replace title tag", () => {
      treetop.request("GET", "/test");
      requests[0].respond(
        200,
        { "content-type": treetop.TEMPLATE_CONTENT_TYPE },
        "<template><title>New Title!</title></template>"
      );
      window.flushTimers();
      expect(document.title).to.equal("New Title!");
    });

    it("should not replace body tag", () => {
      treetop.request("GET", "/test");
      requests[0].respond(
        200,
        { "content-type": treetop.TEMPLATE_CONTENT_TYPE },
        '<template><body><p id="test">New Body!</p></body></template>'
      );
      window.flushTimers();
      expect(document.getElementById("test")).to.be.null;
    });

    it("should handle dependent element types", () => {
      // see http://www.ericvasilik.com/2006/07/code-karma.html
      sandbox.innerHTML = '<table><tr id="test"><td>OLD CELL</td></tr></table>';
      treetop.request("GET", "/test");
      requests[0].respond(
        200,
        { "content-type": treetop.TEMPLATE_CONTENT_TYPE },
        '<template><tr id="test"><td>New Cell!</td></tr></template>'
      );
      window.flushTimers();
      expect(document.getElementById("test").textContent).to.equal("New Cell!");
    });
  });

  describe("mounting and unmounting elements", () => {
    beforeEach(() => {
      this.el = document.createElement("DIV");
      this.el.textContent = "Before!";
      this.el.setAttribute("id", "test");
      sandbox.appendChild(this.el);
    });

    afterEach(() => (sandbox.innerHTML = ""));

    describe("when elements are replaced", () => {
      beforeEach(() => {
        treetop.request("GET", "/test");
        requests[0].respond(
          200,
          { "content-type": treetop.TEMPLATE_CONTENT_TYPE },
          '<template><em id="test">after!</em></template>'
        );
        window.flushTimers();
        this.nue = document.getElementById("test");
      });

      it("should remove the element from the DOM", () => {
        expect(this.el.parentNode).to.be.null;
      });

      it("should have inserted the new #test element", () => {
        expect(this.nue.tagName).to.equal("EM");
      });
    });
  });

  describe("binding components", () => {
    var config;
    beforeEach(() => {
      var el = document.createElement("p");
      el.setAttribute("id", "test");
      sandbox.appendChild(el);
      var el2 = document.createElement("div");
      el2.setAttribute("id", "test2");
      el2.setAttribute("test-node", 123);
      sandbox.appendChild(el2);
      config = window.treetop.config();
    });

    afterEach(() => (sandbox.innerHTML = ""));

    it("should have called the mount on the attribute", () => {
      treetop.request("GET", "/test");
      requests[0].respond(
        200,
        { "content-type": treetop.TEMPLATE_CONTENT_TYPE },
        '<template><div id="test"><p id="test-child" test>New Cell!</p></div></template>'
      );
      window.flushTimers();
      var el = document.getElementById("test-child");
      var mount = config.mountAttrs["test"];
      expect(calledWithStrict(mount, el)).to.be.true;
    });

    it("should not have called unmount on the new element", () => {
      treetop.request("GET", "/test");
      requests[0].respond(
        200,
        { "content-type": treetop.TEMPLATE_CONTENT_TYPE },
        '<template><div id="test"><p id="test-child" test>New Cell!</p></div></template>'
      );
      window.flushTimers();
      var el = document.getElementById("test-child");
      var unmount = config.unmountAttrs["test"];
      expect(calledWithStrict(unmount, el)).to.be.false;
    });

    describe("when unmounted", () => {
      it("should have called the unmount on the attribute", () => {
        treetop.request("GET", "/test");
        requests[0].respond(
          200,
          { "content-type": treetop.TEMPLATE_CONTENT_TYPE },
          '<div id="test"><p id="test-child" test>New Cell!</p></div>'
        );
        window.flushTimers(); // ensure any errors are raised at this stage
        var el = document.getElementById("test-child");
        treetop.request("GET", "/test");
        requests[1].respond(
          200,
          { "content-type": treetop.TEMPLATE_CONTENT_TYPE },
          '<div id="test">after!</div><div id="test2">after2!</div>'
        );
        window.flushTimers();
        var unmount = config.unmountAttrs["test"];
        expect(calledWithStrict(unmount, el)).to.be.true;
      });
    });

    it("should have called mount on the same component multiple times", () => {
      var el;
      var mount = config.mountAttrs["test"];
      var mount2 = config.mountAttrs["test2"];
      treetop.request("GET", "/test");
      requests[0].respond(
        200,
        { "content-type": treetop.TEMPLATE_CONTENT_TYPE },
        '<template><div id="test"><p id="test-child" test test2>New Cell!</p></div></template>'
      );
      window.flushTimers();
      el = document.getElementById("test-child");
      expect(calledWithStrict(mount, el)).to.be.true;
      expect(calledWithStrict(mount2, el)).to.be.true;
    });

    it("should have called unmount on the same element multiple times", () => {
      var el;
      var unmount = config.unmountAttrs["test"];
      var unmount2 = config.unmountAttrs["test2"];
      treetop.request("GET", "/test");
      requests[0].respond(
        200,
        { "content-type": treetop.TEMPLATE_CONTENT_TYPE },
        '<template><div id="test"><p id="test-child" test test2>New Data</p></div></template>'
      );
      window.flushTimers();
      el = document.getElementById("test-child");
      treetop.request("GET", "/test");
      requests[1].respond(
        200,
        { "content-type": treetop.TEMPLATE_CONTENT_TYPE },
        '<template><div id="test">replaced</div></template>'
      );
      window.flushTimers();
      expect(calledWithStrict(unmount, el)).to.be.true;
      expect(calledWithStrict(unmount2, el)).to.be.true;
    });
  });

  describe("treetop.mountAPI method", () => {
    beforeEach(() => {
      sandbox.innerHTML = "";
    });

    it("should allow an element to be created outside and mounted normally", () => {
      sandbox.innerHTML =
        '<table><tr><td id="test">OLD CELL</td></tr></tablen>';
      var el = document.createElement("td");
      el.id = "test";
      el.textContent = "New Cell!";
      treetop.mount(el, document.getElementById("test"));
      expect(document.getElementById("test").textContent).to.equal("New Cell!");
    });

    it("should mount components on the new element", () => {
      sandbox.innerHTML = '<table><tr><td id="test">OLD CELL</td></tr></table>';
      var el = document.createElement("td");
      el.textContent = "New Cell!";
      el.setAttribute("test", "something");
      treetop.mount(el, document.getElementById("test"));
      var mount = window.treetop.config().mountAttrs["test"];
      expect(calledWithStrict(mount, el)).to.be.true;
      var unmount = window.treetop.config().unmountAttrs["test"];
      expect(calledWithStrict(unmount, el)).to.be.false;
    });

    it("should unmount components on the old element", () => {
      sandbox.innerHTML =
        '<table><tr><td test id="test-cell">OLD CELL</td></tr></table>';
      var oldElm = document.getElementById("test-cell");
      var el = document.createElement("td");
      el.textContent = "New Cell!";
      el.setAttribute("test", "something");
      treetop.mount(el, oldElm);
      var unmount = window.treetop.config().unmountAttrs["test"];
      expect(calledWithStrict(unmount, oldElm)).to.be.true;
      var mount = window.treetop.config().mountAttrs["test"];
      expect(calledWithStrict(mount, oldElm)).to.be.false;
    });
  });

  // treetop.mountChild
  describe("treetop.mountChild API method", () => {
    var el;
    beforeEach(() => {
      sandbox.innerHTML =
        '<table><tr id="test"><td>First Cell</td></tr></tablen>';
      el = document.createElement("td");
      el.textContent = "Second Cell!";
      el.setAttribute("test", "something");
      treetop.mountChild(el, document.getElementById("test"));
    });

    it("should allow a child element to be created outside and mounted normally", () => {
      expect(document.getElementById("test").textContent).to.equal(
        "First CellSecond Cell!"
      );
    });

    it("should mount components on the new element", () => {
      var mount = window.treetop.config().mountAttrs["test"];
      expect(calledWithStrict(mount, el)).to.be.true;
    });
  });

  // treetop.mountBefore
  describe("treetop.mountBefore API method", () => {
    var el;
    beforeEach(() => {
      sandbox.innerHTML =
        '<table id="mount_test"><tr><td id="test">First Cell</td></tr></tablen>';
      el = document.createElement("td");
      el.textContent = "Second Cell!";
      el.setAttribute("test", "something");
      var testEl = document.getElementById("test");
      treetop.mountBefore(el, testEl);
    });

    it("should allow a child element to be created outside and mounted normally", () => {
      expect(document.getElementById("mount_test").textContent).to.equal(
        "Second Cell!First Cell"
      );
    });

    it("should mount components on the new element", () => {
      var mount = window.treetop.config().mountAttrs["test"];
      expect(calledWithStrict(mount, el)).to.be.true;
    });
  });

  // treetop.unmount
  describe("treetop.unmount API method", () => {
    var el;
    beforeEach(() => {
      sandbox.innerHTML =
        '<table id="mount_test"><tr><td test id="test">First Cell</td></tr></tablen>';
      el = document.getElementById("test");
      treetop.unmount(el);
    });

    it("should allow a child element to be created outside and mounted normally", () => {
      expect(document.getElementById("mount_test").textContent).to.equal("");
    });

    it("should mount components on the new element", () => {
      var unmount = window.treetop.config().unmountAttrs["test"];
      expect(calledWithStrict(unmount, el)).to.be.true;
    });
  });
});

/// utils
//

/**
 * Custom assertion that sinon does not provide
 */
function calledWithStrict(spy) {
  var calls = spy.getCalls();
  var call;
  var args = Array.prototype.slice.call(arguments, 1);
  SCAN: for (var i = 0, len = calls.length; i < len; i++) {
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
