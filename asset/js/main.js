/* ==========================================================================
   SSAMPICK EDU — shared interactions
   의존성 없음. 모든 데이터는 제공 자료(order_main.txt) 범위에서만 작성.
   ========================================================================== */
(function () {
  'use strict';

  var CFG = Object.assign({}, window.SSAMPICK_CONFIG || {});
  CFG.inquiryEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((CFG.inquiryEmail || '').trim()) ? CFG.inquiryEmail.trim() : '';
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var transferFields = ['name', 'contact', 'countries', 'items', 'timing', 'method', 'purpose', 'retention'];
  var transfers = Array.isArray(CFG.transferRecipients) ? CFG.transferRecipients : [];
  var transferReady = transfers.length >= 1 && transfers.every(function (r) {
    return r && transferFields.every(function (key) { return typeof r[key] === 'string' && r[key].trim(); });
  });
  var endpointReady = /^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(CFG.inquiryEndpoint || '');
  var receptionReady = endpointReady && !!CFG.inquiryEmail && CFG.privacyReviewed === true && transferReady &&
    !!CFG.privacyOfficerName && !!CFG.privacyOfficerRole && !!CFG.privacyEffectiveDate &&
    !!CFG.privacyVersion && !/draft/i.test(CFG.privacyVersion);
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var headerH = function () { return $('#siteHeader').offsetHeight || 72; };

  /* ---------------- Header: 스크롤 상태 / 모바일 메뉴 ---------------- */
  var header = $('#siteHeader');
  var menuToggle = $('#menuToggle');
  var gnb = $('#gnb');

  function setMenu(open) {
    header.classList.toggle('menu-open', open);
    document.body.classList.toggle('no-scroll', open || !!document.querySelector('dialog[open]'));
    $$('main, .site-footer, .floating-cta, .to-top').forEach(function (el) { el.inert = open; });
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    if (!open && businessNav) setBusinessMenu(false);
  }
  menuToggle.addEventListener('click', function () {
    setMenu(!header.classList.contains('menu-open'));
  });
  $$('a', gnb).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) {
    if (!header.classList.contains('menu-open')) return;
    if (e.key === 'Escape') { setMenu(false); menuToggle.focus(); }
    if (e.key === 'Tab') {
      var controls = [menuToggle].concat($$('a, button', gnb).filter(function (el) { return el.getClientRects().length > 0; }));
      var i = controls.indexOf(document.activeElement);
      var next = e.shiftKey ? i - 1 : i + 1;
      if (i < 0 || next < 0 || next >= controls.length) {
        e.preventDefault(); controls[e.shiftKey ? controls.length - 1 : 0].focus();
      }
    }
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth > 960 && header.classList.contains('menu-open')) setMenu(false);
  });

  /* 주요 사업: 마우스, 터치 및 키보드로 여닫는 탐색 메뉴 */
  var businessNav = $('.nav-business');
  var businessToggle = $('.business-toggle');
  var businessOpenedByHover = false;
  function setBusinessMenu(open) {
    businessNav.classList.toggle('is-open', open);
    businessToggle.setAttribute('aria-expanded', String(open));
    if (!open) businessOpenedByHover = false;
  }
  businessToggle.addEventListener('click', function (e) {
    if (e.detail > 0 && businessOpenedByHover) {
      businessOpenedByHover = false;
      return;
    }
    setBusinessMenu(!businessNav.classList.contains('is-open'));
  });
  businessNav.addEventListener('mouseenter', function () {
    if (window.matchMedia('(hover: hover) and (min-width: 961px)').matches && !businessNav.classList.contains('is-open')) {
      setBusinessMenu(true);
      businessOpenedByHover = true;
    }
  });
  businessNav.addEventListener('mouseleave', function () {
    if (window.innerWidth > 960 && !businessNav.contains(document.activeElement)) setBusinessMenu(false);
  });
  businessNav.addEventListener('focusout', function (e) {
    if (!businessNav.contains(e.relatedTarget)) setBusinessMenu(false);
  });
  businessNav.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && businessNav.classList.contains('is-open')) {
      e.preventDefault(); e.stopPropagation(); setBusinessMenu(false); businessToggle.focus();
    }
    if (e.key === 'ArrowDown' && e.target === businessToggle) {
      e.preventDefault(); setBusinessMenu(true); $('a', businessNav).focus();
    }
  });
  document.addEventListener('click', function (e) {
    if (!businessNav.contains(e.target)) setBusinessMenu(false);
  });

  /* ---------------- 앵커 스크롤 (헤더 높이 보정) ---------------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var target = document.getElementById(id.slice(1));
    if (!target) return;
    e.preventDefault();
    var top = target.getBoundingClientRect().top + window.pageYOffset - headerH();
    if (id === '#top') top = 0;
    window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
    if (history.pushState && location.hash !== id) history.pushState(null, '', id);
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  /* ---------------- 스크롤: 헤더 / 맨 위로 ---------------- */
  var toTop = $('#toTop');
  function onScroll() {
    var y = window.pageYOffset;
    header.classList.toggle('scrolled', y > 10);
    toTop.classList.toggle('show', y > 600);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  toTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  /* ---------------- 스크롤 스파이 ---------------- */
  var navLinks = $$('a[data-nav]');
  var sections = navLinks.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
  function setActive(id) {
    navLinks.forEach(function (a) {
      var on = a.getAttribute('href') === '#' + id;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });
  }
  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) setActive(en.target.id); });
    }, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* Stable numbers remain readable without animation or JavaScript. */
  var floating = $('.floating-cta');
  if (floating && 'IntersectionObserver' in window) {
    var visibleAreas = new Set();
    var ctaObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) visibleAreas.add(entry.target); else visibleAreas.delete(entry.target);
      });
      floating.hidden = visibleAreas.size > 0;
    }, { rootMargin: '-72px 0px 0px 0px' });
    $$('.hero-actions, #contact, .business-contact, .site-footer').forEach(function (el) { ctaObserver.observe(el); });
  }

  function openLinkedCase() {
    var id = location.hash.slice(1);
    if (!/^case-[a-z]+$/.test(id)) return;
    var article = document.getElementById(id);
    var details = article && $('details', article);
    if (details) details.open = true;
  }
  openLinkedCase();
  window.addEventListener('hashchange', openLinkedCase);

  /* ---------------- 문의 유형 프리필 (data-inquiry) ---------------- */
  var typeSelect = $('#type');
  var requestedInquiry = new URLSearchParams(window.location.search).get('inquiry');
  if (typeSelect && requestedInquiry && $$('option', typeSelect).some(function (o) { return o.value === requestedInquiry; })) {
    typeSelect.value = requestedInquiry;
  }
  $$('[data-inquiry]').forEach(function (el) {
    el.addEventListener('click', function () {
      var v = el.getAttribute('data-inquiry');
      if (!typeSelect) {
        el.href = 'index.html?inquiry=' + encodeURIComponent(v) + '#contact';
        return;
      }
      var has = $$('option', typeSelect).some(function (o) { return o.value === v || o.textContent === v; });
      if (has) { typeSelect.value = v; clearError(typeSelect); }
      showForm();
      updateInquiryContext();
    });
  });

  /* ---------------- Dialog 공통 ---------------- */
  var lastFocus = null;
  function openDialog(dlg) {
    if (!dlg) return;
    lastFocus = document.activeElement;
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
    document.body.classList.add('no-scroll');
    var closeBtn = $('.dialog-close', dlg);
    if (closeBtn) closeBtn.focus();
  }
  $$('dialog').forEach(function (dlg) {
    dlg.addEventListener('close', function () {
      document.body.classList.remove('no-scroll');
      if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus({ preventScroll: true });
    });
    // 배경 클릭 시 닫기
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) dlg.close();
    });
  });
  $$('[data-open]').forEach(function (btn) {
    btn.addEventListener('click', function () { openDialog(document.getElementById(btn.getAttribute('data-open'))); });
  });

  /* ---------------- 사진 라이트박스 ---------------- */
  var photoDialog = $('#photoDialog');
  var photoImg = $('#photoImg');
  var photoCaption = $('#photoCaption');
  $$('.zoomable').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var img = $('img', btn);
      photoImg.src = btn.getAttribute('data-full');
      photoImg.alt = img ? img.alt : '';
      photoCaption.textContent = btn.getAttribute('data-caption') || '';
      openDialog(photoDialog);
    });
  });
  if (photoDialog) photoDialog.addEventListener('close', function () { photoImg.removeAttribute('src'); });

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------------- config.js 기반 연락처 / 사업자 정보 ---------------- */
  (function applyConfig() {
    var fc = $('#footerContact');
    $$('[data-inquiry-email]').forEach(function (link) {
      link.href = 'mailto:' + CFG.inquiryEmail; link.textContent = CFG.inquiryEmail;
    });
    if (CFG.phone) fc.insertAdjacentHTML('afterbegin', '<li><a href="tel:' + esc(CFG.phone.replace(/[^\d+]/g, '')) + '">' + esc(CFG.phone) + '</a></li>');
    if (CFG.businessHours) fc.insertAdjacentHTML('beforeend', '<li>운영 시간: ' + esc(CFG.businessHours) + '</li>');
    if (CFG.responseTime) fc.insertAdjacentHTML('beforeend', '<li>' + esc(CFG.responseTime) + '</li>');

    var biz = [];
    if (CFG.legalName) biz.push('상호: ' + esc(CFG.legalName));
    if (CFG.representative) biz.push('대표: ' + esc(CFG.representative));
    if (CFG.businessNumber) biz.push('사업자등록번호: ' + esc(CFG.businessNumber));
    if (CFG.address) biz.push('주소: ' + esc(CFG.address));
    $('#companyDetails').innerHTML = biz.map(function (b) { return '<span>' + b + '</span>'; }).join('');

    if (CFG.privacyEffectiveDate && $('#privacyDate')) {
      var pd = $('#privacyDate');
      pd.textContent = '시행일: ' + CFG.privacyEffectiveDate;
      pd.hidden = false;
    }
    if (CFG.privacyOfficerName && CFG.privacyOfficerRole) {
      $('#privacyOfficer').textContent = CFG.privacyOfficerName + ' / ' + CFG.privacyOfficerRole;
    }
    $('#policyDraftNotice').hidden = receptionReady;
    if (transferReady) {
      var labels = ['이전받는 자', '연락처', '이전 국가', '이전 항목', '이전 시기', '이전 방법', '이용 목적', '보유·이용 기간'];
      $$('[data-transfer-details]').forEach(function (container) {
        container.innerHTML = transfers.map(function (r) {
          return '<dl class="privacy-summary">' + transferFields.map(function (key, i) {
            return '<div><dt>' + labels[i] + '</dt><dd>' + esc(r[key]) + '</dd></div>';
          }).join('') + '</dl>';
        }).join('');
      });
    }
    $('#year').textContent = String(new Date().getFullYear());
  })();

  /* ---------------- 문의 폼 ---------------- */
  var form = $('#inquiryForm');
  if (!form) return;
  var formBody = $('#formBody');
  var formSuccess = $('#formSuccess');
  var formStatus = $('#formStatus');
  var phone = $('#phone');
  var collectionConsent = $('#consent');
  // 공통 수집·이용 동의는 필수 정보와 사용자가 입력한 선택 정보에 적용합니다.
  function hasOptionalConsent() { return !!(collectionConsent && collectionConsent.checked); }

  var LABELS = { org: '기관명', name: '담당자명', phone: '연락처', email: '이메일', type: '문의 유형', target: '교육 대상', topic: '희망 주제', headcount: '예상 인원', schedule: '희망 일정', message: '상세 내용' };
  var PHONE_RE = /^(0\d{1,2})-?(\d{3,4})-?(\d{4})$/;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function labelsForType(type) {
    var labels = Object.assign({}, LABELS);
    var lms = type === '강의 전용 LMS 구축';
    var event = type === '교육행사 운영';
    labels.target = lms ? '이용 대상' : event ? '참가 대상' : '교육 대상';
    labels.topic = lms ? '필요 기능' : event ? '행사 주제' : '희망 주제';
    labels.headcount = lms ? '예상 이용 규모' : '예상 인원';
    labels.schedule = lms ? '희망 구축 일정' : '희망 일정';
    return labels;
  }

  function updateInquiryContext() {
    var lms = typeSelect.value === '강의 전용 LMS 구축';
    var event = typeSelect.value === '교육행사 운영';
    var student = typeSelect.value === '학생교육 프로그램';
    var labels = labelsForType(typeSelect.value);
    ['target', 'topic', 'headcount', 'schedule'].forEach(function (id) {
      $('#' + id + 'Label').textContent = labels[id];
    });
    $('#optionalTitle').textContent = lms ? '기능·운영 규모 알려주기' : event ? '행사 조건 알려주기' : '상담에 필요한 정보 더하기';
    $('#topic').placeholder = lms ? '예) 과정 등록, 수강 신청, 진도 확인' : event ? '예) AI 체험 박람회, 해커톤' : '예) 생성형 AI 수업 활용';
    $('#target').placeholder = lms ? '예) 교원 연수 수강자 / 기관 내부 직원' : event ? '예) 학생 / 교원 / 교육기관 담당자' : student ? '예) 초등 5~6학년 / 중학생' : '예) 초등 교원 / 교사 학습공동체';
    $('#headcount').placeholder = lms ? '예) 학습자 200명' : '예) 30명';
    $('#message').placeholder = lms ? '현재 운영 방식, 필요한 기능, 콘텐츠 분량, 유지관리 범위 등 정해진 내용을 적어주세요.' : '교육 목적, 운영 방식, 장소, 예산 범위 등 정해진 내용을 자유롭게 적어주세요.';
    $('#inquiryHint').textContent = lms ? '필요 기능과 예상 학습자 수, 희망 구축 일정을 알려주세요. 세부 범위는 상담에서 정합니다.' : event ? '행사 목적과 장소, 예상 규모가 정해졌다면 알려주세요.' : '대상·주제·인원·일정 중 정해진 내용만 알려주세요.';
  }
  typeSelect.addEventListener('change', updateInquiryContext);
  updateInquiryContext();

  // 연락처 자동 하이픈
  phone.addEventListener('input', function () {
    var d = phone.value.replace(/\D/g, '').slice(0, 11);
    var out = d;
    if (d.startsWith('02')) {
      if (d.length > 5) out = d.length > 9 ? d.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3') : d.replace(/(\d{2})(\d{3})(\d{0,4})/, '$1-$2-$3');
      else if (d.length > 2) out = d.replace(/(\d{2})(\d+)/, '$1-$2');
    } else {
      if (d.length > 7) out = d.length > 10 ? d.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3') : d.replace(/(\d{3})(\d{3,4})(\d{0,4})/, '$1-$2-$3');
      else if (d.length > 3) out = d.replace(/(\d{3})(\d+)/, '$1-$2');
    }
    phone.value = out.replace(/-$/, '');
  });

  function fieldWrap(input) { return input.closest('.field'); }
  function errorEl(input) { return document.getElementById(input.id + '-error'); }
  function setError(input, msg) {
    var err = errorEl(input);
    fieldWrap(input).classList.add('is-invalid');
    input.setAttribute('aria-invalid', 'true');
    if (err) { err.textContent = msg; err.hidden = false; input.setAttribute('aria-describedby', err.id); }
  }
  function clearError(input) {
    var err = errorEl(input);
    fieldWrap(input).classList.remove('is-invalid');
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
    if (err) { err.textContent = ''; err.hidden = true; }
  }

  function validateField(input) {
    if (input.id === 'phone' && !hasOptionalConsent()) { clearError(input); return true; }
    var v = (input.value || '').trim();
    var msg = '';
    switch (input.id) {
      case 'org': if (!v) msg = '기관명을 입력해 주세요.'; break;
      case 'name': if (!v) msg = '담당자 성함을 입력해 주세요.'; break;
      case 'phone':
        if (v && !PHONE_RE.test(v)) msg = '연락처 형식을 확인해 주세요. 예) 010-1234-5678';
        break;
      case 'email':
        if (!v) msg = '이메일을 입력해 주세요.';
        else if (!EMAIL_RE.test(v)) msg = '이메일 형식을 확인해 주세요. 예) name@school.kr';
        break;
      case 'type': if (!v) msg = '문의 유형을 선택해 주세요.'; break;
      case 'consent': if (!input.checked) msg = '필수 개인정보 수집·이용에 동의해 주세요.'; break;
      case 'transferConsent': if (!input.checked) msg = '문의 전송을 위한 국외 이전 동의를 확인해 주세요.'; break;
    }
    if (msg) setError(input, msg); else clearError(input);
    return !msg;
  }

  var required = ['org', 'name', 'phone', 'email', 'type', 'consent', 'transferConsent'].map(function (id) { return document.getElementById(id); });
  required.forEach(function (input) {
    var ev = (input.tagName === 'SELECT' || input.type === 'checkbox') ? 'change' : 'blur';
    input.addEventListener(ev, function () { validateField(input); });
    input.addEventListener('input', function () { if (input.getAttribute('aria-invalid')) validateField(input); });
  });

  var optionalIds = ['phone', 'target', 'topic', 'headcount', 'schedule', 'message'];
  function updateOptionalCount() {
    var count = optionalIds.filter(function (id) { return $('#' + id).value.trim(); }).length;
    $('#optionalCount').textContent = count ? '선택 · ' + count + '개 작성' : '선택';
  }
  optionalIds.forEach(function (id) { $('#' + id).addEventListener('input', updateOptionalCount); });
  updateOptionalCount();

  function collect() {
    var data = {};
    Object.keys(LABELS).forEach(function (id) {
      if (!hasOptionalConsent() && optionalIds.indexOf(id) !== -1) return;
      var el = document.getElementById(id);
      data[id] = el ? el.value.trim() : '';
    });
    return data;
  }

  function buildText(d) {
    var lines = ['[쌤픽에듀 연수·사업 문의]', ''];
    var labels = labelsForType(d.type);
    Object.keys(LABELS).forEach(function (id) {
      if (d[id]) lines.push(labels[id] + ': ' + d[id]);
    });
    lines.push('', '— ' + location.href.split('#')[0] + ' 문의 양식에서 작성');
    return lines.join('\n');
  }

  var lastText = '';
  var submitting = false;
  var submissionId = '';
  var submissionFingerprint = '';
  var submitBtn = $('#submitBtn');
  if (collectionConsent) collectionConsent.addEventListener('change', function () { validateField(phone); });
  var copyBtn = $('#copyBtn');
  var copyStatus = $('#copyStatus');

  function showForm() {
    formSuccess.hidden = true;
    formBody.hidden = false;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (submitting || !receptionReady) return;
    if ($('#website').value) {
      formStatus.textContent = '자동 입력된 정보 때문에 접수를 진행하지 못했습니다. 페이지를 새로 연 뒤 직접 입력하거나 ' + CFG.inquiryEmail + '로 문의해 주세요.';
      return;
    }

    var firstBad = null;
    required.forEach(function (input) {
      if (!validateField(input) && !firstBad) firstBad = input;
    });
    if (firstBad) {
      formStatus.textContent = '입력 내용을 확인해 주세요. ' + (errorEl(firstBad) ? errorEl(firstBad).textContent : '');
      var collapsed = firstBad.closest('details');
      if (collapsed) collapsed.open = true;
      firstBad.focus();
      return;
    }

    var d = collect();
    var fingerprint = JSON.stringify(d) + ':' + hasOptionalConsent();
    if (fingerprint !== submissionFingerprint || !submissionId) {
      submissionFingerprint = fingerprint;
      submissionId = window.createInquiryId();
    }
    var payload = Object.assign({}, d, {
      request_id: submissionId,
      consent_required: true,
      consent_optional: hasOptionalConsent(),
      consent_overseas_transfer: true,
      consent_version: CFG.privacyVersion,
      _gotcha: $('#website').value
    });
    submitting = true;
    submitBtn.disabled = true;
    submitBtn.textContent = '접수 중…';
    form.setAttribute('aria-busy', 'true');
    formStatus.textContent = '';
    var mailAccepted = false;
    try {
      var result = await window.sendInquiryViaAppsScript(CFG.inquiryEndpoint, payload);
      if (result.ok !== true) {
        var failed = new Error(result.code || 'UNAVAILABLE');
        failed.code = result.code || 'UNAVAILABLE';
        if (result.code === 'UNKNOWN') failed.name = 'TimeoutError';
        throw failed;
      }
      mailAccepted = true;
      lastText = buildText(d);
      var labels = labelsForType(d.type);
      $('#summary').innerHTML = Object.keys(LABELS).filter(function (id) { return d[id]; }).map(function (id) {
        return '<div><dt>' + esc(labels[id]) + '</dt><dd>' + esc(d[id]) + '</dd></div>';
      }).join('');
      $('#successDesc').textContent = '문의 메일 발송 요청이 완료되었습니다. 담당자가 확인 후 입력하신 이메일로 연락드립니다.';
      copyStatus.textContent = '';
      formBody.hidden = true;
      formSuccess.hidden = false;
      $('#successTitle').focus();
    } catch (err) {
      var contactHelp = ' 입력 내용은 유지됩니다. 도움이 필요하면 ' + CFG.inquiryEmail + '로 문의해 주세요.';
      var errors = {
        RATE_LIMIT: '같은 이메일로 조금 전 문의를 접수했습니다. 1분 뒤 다시 시도해 주세요.',
        QUOTA: '오늘의 자동 접수 한도에 도달했습니다. 이메일로 문의해 주세요.',
        BUSY: '다른 문의를 처리하고 있습니다. 잠시 후 다시 시도해 주세요.',
        INVALID: '입력 정보 또는 동의 문서가 변경되었습니다. 내용을 확인하고, 계속 실패하면 새 페이지에서 다시 작성해 주세요.',
        EXPIRED: '접수 연결의 유효 시간이 지났습니다. 다시 문의하기를 눌러 주세요.',
        NOT_CONFIGURED: '자동 접수 연결을 준비 중입니다. 이메일로 문의해 주세요.',
        BRIDGE_TIMEOUT: '접수 시스템에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        BRIDGE_LOAD_FAILED: '접수 시스템에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'
      };
      formStatus.textContent = mailAccepted ? '문의 메일 발송 요청은 완료되었으나 완료 화면을 표시하지 못했습니다. 다시 제출하지 마세요.' :
        errors[err.code] ? errors[err.code] + contactHelp :
        err.name === 'TimeoutError' || err instanceof TypeError ?
        '접수 결과를 확인하지 못했습니다. 이미 전송됐을 수 있으므로 재접수 전 ' + CFG.inquiryEmail + '로 확인해 주세요. 입력 내용은 유지됩니다.' :
        '접수를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.' + contactHelp;
    } finally {
      submitting = false;
      submitBtn.disabled = !receptionReady;
      submitBtn.textContent = '문의하기';
      form.removeAttribute('aria-busy');
    }
  });

  copyBtn.addEventListener('click', function () {
    function done(ok) {
      copyStatus.textContent = ok ? '문의 내용이 복사되었습니다.' : '복사에 실패했습니다. 내용을 직접 선택해 복사해 주세요.';
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lastText).then(function () { done(true); }, function () { fallbackCopy(); });
    } else {
      fallbackCopy();
    }
    function fallbackCopy() {
      var ta = document.createElement('textarea');
      ta.value = lastText;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      document.body.removeChild(ta);
      done(ok);
    }
  });

  $('#downloadBtn').addEventListener('click', function () {
    if (!lastText) return;
    var url = URL.createObjectURL(new Blob(['\uFEFF', lastText], { type: 'text/plain;charset=utf-8' }));
    var link = document.createElement('a');
    link.href = url; link.download = '쌤픽에듀_연수문의서.txt';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    copyStatus.textContent = '접수된 문의 내용의 사본을 기기에 저장했습니다.';
  });
  submitBtn.disabled = !receptionReady;
  var formNote = $('#formNote');
  if (formNote) formNote.textContent = receptionReady ? '문의 내용은 담당자 이메일로 자동 전달됩니다. 별도의 메일 앱을 열지 않습니다.' : '자동 접수 연결을 준비 중입니다. 현재는 문의가 전송되지 않습니다. 문의: ' + CFG.inquiryEmail;

  $('#editBtn').addEventListener('click', function () {
    form.reset();
    $('#optionalFields').open = false;
    updateInquiryContext();
    updateOptionalCount();
    submissionId = '';
    submissionFingerprint = '';
    required.forEach(clearError);
    formStatus.textContent = '';
    showForm();
    $('#org').focus();
  });
})();
