/*eslint-env node, es6, jasmine */
/*eslint indent: ['error', 2], quotes: [0, 'single'] */
const sinon = require('sinon');
const chai = require('chai');
const expect = chai.expect;


describe('Treetop', () => {
  'strict mode';
  var requests;
  var treetop;

  beforeEach(() => {
    this.xhr = sinon.useFakeXMLHttpRequest();
    global.XMLHttpRequest = this.xhr;
    requests = [];
    treetop = window.treetop;
    this.xhr.onCreate = req => requests.push(req);
    treetop.push();
    window.requestAnimationFrame.lastCall.args[0]();
  });

  afterEach(() => {
    this.xhr.restore();
    window.requestAnimationFrame.resetHistory();
    window.cancelAnimationFrame.resetHistory();
  });

  describe('issue basic GET request', () => {
    var req = null;
    beforeEach(() => {
      treetop.request("GET", "/test");
      req = requests[0];
    });

    it('should have issued a request', () => expect(req).to.exist);

    it('should have issued a request with the method and url', () => {
      expect(req.url).to.contain("/test");
      expect(req.method).to.equal("GET");
    });

    it('should have added the treetop header', () => expect(req.requestHeaders["accept"]).to.contain(treetop.PARTIAL_CONTENT_TYPE));

    it('should have no body', () => expect(req.requestBody).to.be.null);
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

  describe('parse maformed responses', () => {
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
      treetop.push({
        "compose": {
          "test": (next, prev) => {
            Array.from(next.children).forEach(child => {
              prev.appendChild(child);
            });
          }
        }
      });
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
      return treetop.mount(document.body);
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
    beforeEach(() => {
      this.el = document.createElement("test-node");
      this.el.setAttribute("id", "test");
      document.body.appendChild(this.el);
      this.el2 = document.createElement("div");
      this.el2.setAttribute("id", "test2");
      this.el2.setAttribute("test-node", 123);
      document.body.appendChild(this.el2);
      // component definition:
      this.component = {
        tagName: "test-node",
        attrName: "test-node",
        mount: sinon.spy(),
        unmount: sinon.spy()
      };
      treetop.push(this.component);
      window.requestAnimationFrame.lastCall.args[0]();
    });

    afterEach(() => {
      document.body.removeChild(document.getElementById("test"));
      document.body.removeChild(document.getElementById("test2"));
    });

    it('should have called the mount on the element', () => {
      expect(this.component.mount.calledWith(this.el)).to.be.true;
    });

    it('should have called the mount on the attribute', () => {
      expect(this.component.mount.calledWith(this.el2)).to.be.true;
    });

    describe('when unmounted', () => {
      beforeEach(() => {
        treetop.request("GET", "/test");
        requests[0].respond(
          200,
          { 'content-type': treetop.PARTIAL_CONTENT_TYPE },
          '<div id="test">after!</div><div id="test2">after2!</div>'
        );
      });

      it('should have called the unmount on the element', () => {
        expect(this.component.unmount.calledWith(this.el)).to.be.true;
      });

      it('should have called the unmount on the attribute', () => {
        expect(this.component.unmount.calledWith(this.el2)).to.be.true;
      });
    });
  });

  describe('binding two components', () => {
    beforeEach(() => {
      this.el = document.createElement("test-node");
      this.el.setAttribute("id", "test");
      this.el.setAttribute("test-node2", 456);
      document.body.appendChild(this.el);
      this.el2 = document.createElement("div");
      this.el2.setAttribute("id", "test2");
      this.el2.setAttribute("test-node", 123);
      this.el2.setAttribute("test-node2", 456);
      document.body.appendChild(this.el2);
      // component definition:
      this.component = {
        tagName: "test-node",
        attrName: "test-node",
        mount: sinon.spy(),
        unmount: sinon.spy()
      };
      this.component2 = {
        attrName: "test-node2",
        mount: sinon.spy(),
        unmount: sinon.spy()
      };
      treetop.push(this.component);
      treetop.push(this.component2);
      window.requestAnimationFrame.lastCall.args[0]();
    });

    afterEach(() => {
      document.body.removeChild(document.getElementById("test"));
      document.body.removeChild(document.getElementById("test2"));
    });

    it('should have called mount on component 1 for the tagName', () => {
      expect(this.component.mount.calledWith(this.el)).to.be.true;
    });

    it('should have called mount on component 1 for the attrName', () => {
      expect(this.component.mount.calledWith(this.el2)).to.be.true;
    });

    it('should have called mount on component 2 for the tagName', () => {
      expect(this.component2.mount.calledWith(this.el)).to.be.true;
    });

    it('should have called mount on component 2 for the attrName', () => {
      expect(this.component2.mount.calledWith(this.el2)).to.be.true;
    });
  });
});

