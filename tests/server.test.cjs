const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const path = require('node:path');
const root = path.join(__dirname, '..');

function server() {
  const properties = new Map([['ALLOWED_SITE_ORIGIN', 'https://example.org'], ['PRIVACY_VERSION', 'test-v1'], ['SIGNING_SECRET', 'test-only-secret']]);
  const cache = new Map(); const mails=[];
  const state={quota:100, fail:false, busy:false};
  const props={getProperty:k=>properties.get(k),setProperty:(k,v)=>properties.set(k,v),setProperties:o=>Object.entries(o).forEach(([k,v])=>properties.set(k,v))};
  const context=vm.createContext({
    PropertiesService:{getScriptProperties:()=>props},
    CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v)})},
    LockService:{getScriptLock:()=>({tryLock:()=>!state.busy,releaseLock:()=>{}})},
    MailApp:{getRemainingDailyQuota:()=>state.quota,sendEmail:mail=>{if(state.fail)throw Error('delivery uncertain');mails.push(mail)}},
    Utilities:{computeHmacSha256Signature:(s,k)=>crypto.createHmac('sha256',k).update(s).digest(),base64EncodeWebSafe:b=>Buffer.from(b).toString('base64url'),formatDate:()=> '2026-10-03',getUuid:()=>crypto.randomUUID()},
    HtmlService:{createHtmlOutput:text=>({text}),XFrameOptionsMode:{ALLOWALL:'allow'},createTemplateFromFile:()=>({bridgeConfig:'',evaluate(){const result={config:JSON.parse(this.bridgeConfig),setTitle(){return this},setXFrameOptionsMode(){return this}};return result}})}
  });
  vm.runInContext(fs.readFileSync(path.join(root,'apps-script/SiteSettings.gs'),'utf8')+'\n'+fs.readFileSync(path.join(root,'apps-script/Code.gs'),'utf8'),context);
  const ticket={channel:'a'.repeat(48),issued:Date.now()};
  ticket.signature=context.sign_(`${ticket.channel}.${ticket.issued}.https://example.org`,'test-only-secret');
  const payload={org:'테스트 기관',name:'테스트 담당자',email:'test@example.org',type:'강사 섭외',phone:'',target:'',topic:'',headcount:'',schedule:'',message:'',request_id:'b'.repeat(48),consent_required:true,consent_optional:true,consent_overseas_transfer:true,consent_version:'test-v1',_gotcha:''};
  const submit=(patch={})=>JSON.parse(JSON.stringify(context.submitInquiry({...payload,...patch},ticket)));
  return {context,properties,cache,mails,state,payload,ticket,submit};
}

test('valid inquiry sends once, duplicate request is idempotent',()=>{
  const s=server();assert.deepEqual(s.submit(),{ok:true});assert.deepEqual(s.submit(),{ok:true});assert.equal(s.mails.length,1);
  assert.equal(s.mails[0].replyTo,'test@example.org');
  assert.deepEqual(s.submit({message:'changed content'}),{ok:false,code:'INVALID'});
});
test('consent, version, type and field length are validated before sending',()=>{
  const s=server();
  for(const patch of [{consent_required:false},{consent_version:'old'},{type:'unknown'},{org:'x'.repeat(81)},{_gotcha:'bot'}])assert.equal(s.submit(patch).code,'INVALID');
  assert.equal(s.mails.length,0);
});
test('optional fields are excluded without optional consent',()=>{
  const s=server();assert.equal(s.submit({consent_optional:false,message:'private text'}).ok,true);assert.ok(!s.mails[0].body.includes('private text'));
});
test('rate and daily quota protection remain active',()=>{
  const s=server();s.submit();assert.equal(s.submit({request_id:'c'.repeat(48)}).code,'RATE_LIMIT');
  const q=server();q.state.quota=0;assert.equal(q.submit().code,'QUOTA');assert.equal(q.mails.length,0);
  const daily=server();daily.properties.set('SEND_DAY','2026-10-03');daily.properties.set('SEND_COUNT','50');assert.equal(daily.submit().code,'QUOTA');
});
test('uncertain delivery cannot be automatically sent twice',()=>{
  const s=server();s.state.fail=true;assert.equal(s.submit().code,'UNKNOWN');s.state.fail=false;assert.equal(s.submit().code,'UNKNOWN');assert.equal(s.mails.length,0);
});
test('invalid signing tickets never send mail',()=>{
  const s=server();s.ticket.signature='bad';assert.equal(s.submit().code,'EXPIRED');assert.equal(s.mails.length,0);
});
test('known-origin configuration failure is reported without receiving personal data',()=>{
  const s=server();s.properties.delete('SIGNING_SECRET');
  const page=s.context.doGet({parameter:{channel:'a'.repeat(48)}});
  assert.equal(page.config.error,'NOT_CONFIGURED');assert.equal(page.config.origin,'https://example.org');assert.equal(s.mails.length,0);
  s.properties.delete('ALLOWED_SITE_ORIGIN');assert.ok(s.context.doGet({parameter:{channel:'a'.repeat(48)}}).text.includes('자동 접수'));
});
