/** 쌤픽에듀 문의 접수. 개인정보를 실행 로그에 출력하지 않습니다. */
// RECIPIENT and TYPES are generated in SiteSettings.gs from site/data/.
const LIMITS = { org: 80, name: 40, email: 80, type: 40, phone: 20, target: 60, topic: 120, headcount: 20, schedule: 80, message: 2000 };
const LABELS = { org: '기관명', name: '담당자명', email: '이메일', type: '문의 유형', phone: '연락처', target: '연수 대상', topic: '희망 주제', headcount: '예상 인원', schedule: '희망 일정', message: '상세 내용' };

function settings_() {
  const p = PropertiesService.getScriptProperties();
  const origin = p.getProperty('ALLOWED_SITE_ORIGIN') || '';
  const version = p.getProperty('PRIVACY_VERSION') || '';
  const secret = p.getProperty('SIGNING_SECRET') || '';
  if (!/^https:\/\/[^/?#]+$/.test(origin) || !version || /draft/i.test(version) || !secret) throw new Error('NOT_CONFIGURED');
  return { origin: origin, version: version, secret: secret };
}

/** 편집기에서 한 번 실행해 발송 권한 승인 및 서명키를 설정합니다.
 * 초기 설정 뒤에는 외부에서 호출되어도 아무 변경을 하지 않습니다.
 */
function setupMailAuthorization() {
  const p = PropertiesService.getScriptProperties();
  if (p.getProperty('SIGNING_SECRET')) return '이미 설정되어 있습니다.';
  p.setProperty('SIGNING_SECRET', Utilities.getUuid() + Utilities.getUuid());
  MailApp.getRemainingDailyQuota();
  return '메일 발송 권한 승인과 서명키 설정을 마쳤습니다.';
}

function sign_(text, secret) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(text, secret));
}

function doGet(e) {
  const channel = String(e && e.parameter && e.parameter.channel || '');
  if (!/^[a-f0-9]{48}$/.test(channel)) return HtmlService.createHtmlOutput('문의 양식을 통해 접속해 주세요.');
  let cfg;
  try {
    cfg = settings_();
  } catch (err) {
    // Only the configured origin may receive the error. Never post to '*'.
    const origin = PropertiesService.getScriptProperties().getProperty('ALLOWED_SITE_ORIGIN') || '';
    if (!/^https:\/\/[^/?#]+$/.test(origin)) return HtmlService.createHtmlOutput('자동 접수 설정을 확인 중입니다. 사이트의 이메일 문의를 이용해 주세요.');
    const unavailable = HtmlService.createTemplateFromFile('Bridge');
    unavailable.bridgeConfig = JSON.stringify({ origin: origin, channel: channel, error: 'NOT_CONFIGURED' }).replace(/</g, '\\u003c');
    return unavailable.evaluate().setTitle('쌤픽에듀 문의 전송').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  const issued = Date.now();
  const ticket = channel + '.' + issued;
  const template = HtmlService.createTemplateFromFile('Bridge');
  template.bridgeConfig = JSON.stringify({
    origin: cfg.origin, channel: channel, issued: issued, signature: sign_(ticket + '.' + cfg.origin, cfg.secret)
  }).replace(/</g, '\\u003c');
  return template.evaluate().setTitle('쌤픽에듀 문의 전송').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Editor-only operational status. Trailing underscore prevents google.script.run access. */
function getReceptionStatus_() {
  const cfg = settings_();
  const props = PropertiesService.getScriptProperties();
  const today = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
  return { origin: cfg.origin, privacyVersion: cfg.version, date: today,
    sentToday: props.getProperty('SEND_DAY') === today ? Number(props.getProperty('SEND_COUNT') || 0) : 0,
    mailQuotaRemaining: MailApp.getRemainingDailyQuota() };
}

/** Bridge의 google.script.run에서 호출. 주소·제목·내용은 서버에서 구성합니다. */
function submitInquiry(data, ticket) {
  try {
    const cfg = settings_();
    if (!ticket || !/^[a-f0-9]{48}$/.test(String(ticket.channel)) || !Number.isFinite(ticket.issued) ||
        Date.now() - ticket.issued > 600000 || ticket.issued > Date.now() + 30000 ||
        ticket.signature !== sign_(ticket.channel + '.' + ticket.issued + '.' + cfg.origin, cfg.secret)) return { ok: false, code: 'EXPIRED' };
    if (!data || data.consent_required !== true || data.consent_overseas_transfer !== true ||
        typeof data.consent_optional !== 'boolean' || data.consent_version !== cfg.version || data._gotcha ||
        !/^[a-f0-9]{48}$/.test(String(data.request_id))) return { ok: false, code: 'INVALID' };
    const required = ['org', 'name', 'email', 'type'];
    const values = {};
    Object.keys(LIMITS).forEach(function (key) {
      // 선택 동의가 없는 정보는 서버에서도 제외합니다.
      if (!data.consent_optional && required.indexOf(key) < 0) return;
      const value = data[key] == null ? '' : data[key];
      if (typeof value !== 'string' || value.length > LIMITS[key] || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) throw new Error('INVALID');
      values[key] = value.trim();
    });
    if (required.some(function (key) { return !values[key]; }) || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email) ||
        /[\r\n]/.test(values.email) || TYPES.indexOf(values.type) < 0 ||
        (values.phone && !/^(0\d{1,2})-?(\d{3,4})-?(\d{4})$/.test(values.phone))) return { ok: false, code: 'INVALID' };
    return sendOnce_(values, data, cfg);
  } catch (err) {
    return { ok: false, code: err.message === 'INVALID' ? 'INVALID' : 'UNAVAILABLE' };
  }
}

function sendOnce_(values, data, cfg) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return { ok: false, code: 'BUSY' };
  try {
    const cache = CacheService.getScriptCache();
    const idKey = 'request:' + data.request_id;
    const fingerprint = sign_(JSON.stringify(values) + '.' + data.consent_optional + '.' + cfg.version, cfg.secret);
    const previous = cache.get(idKey);
    if (previous) {
      const record = JSON.parse(previous);
      if (record.fingerprint !== fingerprint) return { ok: false, code: 'INVALID' };
      return record.state === 'sent' ? { ok: true } : { ok: false, code: 'UNKNOWN' };
    }
    const senderKey = 'sender:' + sign_(values.email.toLowerCase(), cfg.secret);
    if (cache.get(senderKey)) return { ok: false, code: 'RATE_LIMIT' };
    const props = PropertiesService.getScriptProperties();
    const today = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
    const count = props.getProperty('SEND_DAY') === today ? Number(props.getProperty('SEND_COUNT') || 0) : 0;
    // 개인 Gmail 일일 한도 일부를 남겨 둡니다. 일일 전역 한도 50건.
    if (count >= 50 || MailApp.getRemainingDailyQuota() < 1) return { ok: false, code: 'QUOTA' };
    const receivedAt = new Date().toISOString();
    const lines = ['[쌤픽에듀 연수·사업 문의]', ''];
    Object.keys(LABELS).forEach(function (key) { if (values[key]) lines.push(LABELS[key] + ': ' + values[key]); });
    lines.push('', '[동의 기록]', '필수 수집·이용: 동의', '선택 수집·이용: ' + (data.consent_optional ? '동의' : '미동의'),
      '국외 이전: 동의', '동의 문서 버전: ' + cfg.version, '서버 접수 시각: ' + receivedAt, '접수 식별자: ' + data.request_id);
    // 사전 상태를 남겨 응답 유실 후 재전송으로 인한 중복 발송을 줄입니다.
    cache.put(idKey, JSON.stringify({ fingerprint: fingerprint, state: 'sending' }), 600);
    cache.put(senderKey, '1', 60);
    props.setProperties({ SEND_DAY: today, SEND_COUNT: String(count + 1) });
    try {
      MailApp.sendEmail({ to: RECIPIENT, replyTo: values.email, name: '쌤픽에듀 문의 접수',
        subject: '[연수·사업 문의] ' + values.org.replace(/[\r\n]/g, ' ') + ' · ' + values.type,
        body: lines.join('\n') });
    } catch (err) {
      // 발송 결과가 불확실할 수 있으므로 자동으로 재발송하지 않습니다.
      return { ok: false, code: 'UNKNOWN' };
    }
    cache.put(idKey, JSON.stringify({ fingerprint: fingerprint, state: 'sent' }), 600);
    return { ok: true };
  } finally { lock.releaseLock(); }
}
