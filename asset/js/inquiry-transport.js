/* Apps Script HtmlService 브리지. 제출 개인정보를 URL에 넣지 않습니다. */
(function () {
  'use strict';
  window.createInquiryId = function () {
    var bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return Array.prototype.map.call(bytes, function (n) { return n.toString(16).padStart(2, '0'); }).join('');
  };
  window.sendInquiryViaAppsScript = function (endpoint, payload) {
    return new Promise(function (resolve, reject) {
      var channel = window.createInquiryId();
      var frame = document.createElement('iframe');
      var remote = null;
      var timer;
      var stage = 'bridge-loading';
      frame.hidden = true;
      frame.title = '문의 전송 연결';
      frame.referrerPolicy = 'no-referrer';
      function cleanup() {
        clearTimeout(timer);
        window.removeEventListener('message', receive);
        frame.remove();
      }
      function receive(event) {
        var message = event.data;
        if (!message || message.channel !== channel ||
            !/^https:\/\/(?:script\.google\.com|[a-z0-9-]+\.googleusercontent\.com)$/.test(event.origin)) return;
        // HtmlService는 중첩 iframe을 사용하므로 nonce로 첫 응답을 확인한 뒤 source를 고정합니다.
        if (message.kind === 'ready' && !remote && event.source) {
          if (message.error === 'NOT_CONFIGURED') {
            cleanup();
            resolve({ ok: false, code: 'NOT_CONFIGURED' });
            return;
          }
          stage = 'server-response';
          remote = event.source;
          remote.postMessage({ channel: channel, kind: 'submit', payload: payload }, event.origin);
        } else if (message.kind === 'result' && event.source === remote) {
          cleanup();
          resolve(message.result || { ok: false, code: 'UNKNOWN' });
        }
      }
      window.addEventListener('message', receive);
      timer = setTimeout(function () {
        cleanup();
        var err = new Error('전송 결과 확인 시간 초과');
        err.name = 'TimeoutError';
        err.code = remote ? 'RESPONSE_TIMEOUT' : 'BRIDGE_TIMEOUT';
        err.stage = stage;
        reject(err);
      }, 45000);
      frame.src = endpoint + '?channel=' + encodeURIComponent(channel);
      frame.addEventListener('error', function () {
        cleanup();
        var err = new Error('문의 전송 연결 실패');
        err.code = 'BRIDGE_LOAD_FAILED';
        err.stage = stage;
        reject(err);
      });
      document.body.appendChild(frame);
    });
  };
})();
