const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const path = require('node:path');

function transport() {
  let receive, timer, frame;
  const context = vm.createContext({
    crypto: crypto.webcrypto, Uint8Array, Promise,
    setTimeout: fn => { timer = fn; return 1; }, clearTimeout: () => {},
    window: {
      addEventListener: (kind, fn) => { receive = fn; },
      removeEventListener: () => { receive = null; }
    },
    document: {
      createElement: () => frame = { removed: false, addEventListener(kind, fn) { this[kind] = fn; }, remove() { this.removed = true; } },
      body: { appendChild() {} }
    }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../asset/js/inquiry-transport.js'), 'utf8'), context);
  context.window.createInquiryId = () => 'a'.repeat(48);
  const payload = { org: 'test-only' };
  const promise = context.window.sendInquiryViaAppsScript('https://script.google.com/macros/s/test/exec', payload);
  const posts = [];
  const source = { postMessage: (data, origin) => posts.push({ data, origin }) };
  const message = (kind, extra = {}, origin = 'https://test.googleusercontent.com', sender = source, channel = 'a'.repeat(48)) => receive?.({data:{kind,channel,...extra},origin,source:sender});
  return { promise, posts, frame, source, message, timeout: () => timer() };
}

test('bridge configuration failure resolves before sending any payload', async () => {
  const t = transport(); t.message('ready', {error:'NOT_CONFIGURED'});
  assert.equal((await t.promise).code, 'NOT_CONFIGURED');
  assert.equal(t.posts.length, 0); assert.equal(t.frame.removed, true);
});
test('origin, nonce and result sender must match the bridge handshake', async () => {
  const t = transport();
  t.message('ready', {}, 'https://attacker.example');
  t.message('ready', {}, undefined, undefined, 'wrong-channel');
  assert.equal(t.posts.length, 0);
  t.message('ready'); assert.equal(t.posts.length, 1);
  t.message('result', {result:{ok:false}}, undefined, {});
  assert.equal(t.frame.removed, false);
  t.message('result', {result:{ok:true}});
  assert.equal((await t.promise).ok, true); assert.equal(t.frame.removed, true);
});
test('timeout distinguishes bridge loading from uncertain server response', async () => {
  const pending = transport(); pending.timeout();
  await assert.rejects(pending.promise, e => e.code === 'BRIDGE_TIMEOUT');
  const sent = transport(); sent.message('ready'); sent.timeout();
  await assert.rejects(sent.promise, e => e.code === 'RESPONSE_TIMEOUT');
  assert.equal(sent.posts.length, 1);
});
test('iframe URL contains only channel, never submitted information', async () => {
  const t = transport();
  assert.equal(new URL(t.frame.src).searchParams.get('channel'), 'a'.repeat(48));
  assert.ok(!t.frame.src.includes('test-only'));
  t.frame.error();
  await assert.rejects(t.promise, e => e.code === 'BRIDGE_LOAD_FAILED');
});
