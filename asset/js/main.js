/* ==========================================================================
   SSAMPICK EDU — mix_fable / main.js
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
  }
  menuToggle.addEventListener('click', function () {
    setMenu(!header.classList.contains('menu-open'));
  });
  $$('a', gnb).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) {
    if (!header.classList.contains('menu-open')) return;
    if (e.key === 'Escape') { setMenu(false); menuToggle.focus(); }
    if (e.key === 'Tab') {
      var controls = [menuToggle].concat($$('a, button', gnb));
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
    if (history.replaceState) history.replaceState(null, '', id);
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

  /* ---------------- Reveal + 카운트업 ---------------- */
  var reveals = $$('.reveal');
  $$('.service-list .reveal').forEach(function (li, i) { li.style.setProperty('--i', i); });

  function countUp(el) {
    var end = parseInt(el.getAttribute('data-count'), 10) || 0;
    if (reduceMotion) { el.textContent = end.toLocaleString('ko-KR'); return; }
    var start = null, dur = 1400;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(end * eased).toLocaleString('ko-KR');
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  if ('IntersectionObserver' in window && !reduceMotion) {
    var ro = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        $$('.count', en.target).forEach(countUp);
        obs.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
    reveals.forEach(function (el) { ro.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
    $$('.count').forEach(countUp);
  }

  /* ---------------- 문의 유형 프리필 (data-inquiry) ---------------- */
  var typeSelect = $('#type');
  $$('[data-inquiry]').forEach(function (el) {
    el.addEventListener('click', function () {
      var v = el.getAttribute('data-inquiry');
      if (!typeSelect) return;
      var has = $$('option', typeSelect).some(function (o) { return o.value === v || o.textContent === v; });
      if (has) { typeSelect.value = v; clearError(typeSelect); }
      showForm();
    });
  });

  /* ---------------- Dialog 공통 ---------------- */
  var lastFocus = null;
  var pendingInquiry = null;
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
      if (pendingInquiry) {
        var v = pendingInquiry; pendingInquiry = null;
        typeSelect.value = v; clearError(typeSelect); showForm();
        $('#contact').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
        typeSelect.focus({ preventScroll: true });
      } else if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus({ preventScroll: true });
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
  photoDialog.addEventListener('close', function () { photoImg.removeAttribute('src'); });

  /* ---------------- 사례 상세 (제공 자료 범위 내) ---------------- */
  var CASES = {
    expo: {
      kicker: '교육행사 운영',
      title: 'AI미래교육박람회 기획·운영',
      image: { src: 'asset/img/expo-stage-1280.webp', alt: "박람회 메인 무대. '교실을 바꾸는 AI미래교육' 특강회 화면과 AI미래교육연구회·쌤픽에듀 로고." },
      body: [
        'AI와 에듀테크를 주제로 40개 에듀테크 기업이 참여하고 50개 부스를 운영해 총 1,546명이 방문한 박람회를 기획·운영했습니다.',
        '기업 전시·체험, 교원 연수, 교육 사례 공유를 진행했으며, 당일 강연 수강생은 1,000명 이상이었습니다.'
      ],
      facts: [['일시', '2026년 6월 20일(토) 09:00~17:00'], ['장소', '숙명여자대학교 제2캠퍼스 눈꽃광장홀'], ['대상', '전국 유·초·중·고·대·특 교육 종사자'], ['운영 규모', '참여 기업 40개 · 부스 50개 · 방문 1,546명 · 강연 수강 1,000명 이상']],
      inquiry: '교육행사 운영'
    },
    physical: {
      kicker: '학생 AI 체험',
      title: 'AI·디지털 캠프 ‘남한 미래 챌린지’',
      body: [
        '2026년 7월 4일 남한고등학교에서 ‘남한 미래 챌린지’를 운영했습니다. 신청 학생은 69명이었습니다.',
        '오전에는 AI 자율주행과 생성형 AI 메이커톤, 오후에는 LEGO CS & AI와 로보틱스를 진행했습니다.'
      ],
      facts: [['일시', '2026년 7월 4일(토) 09:00~16:00'], ['장소', '남한고등학교 제1·제2과학실'], ['대상', '신청 학생 69명']],
      programs: [
        { time: '오전 · 참여 30명', title: 'AI 자율주행차 부트 캠프', description: '초음파 센서와 메카넘휠 제어로 AI 자율주행 원리를 배우고 코딩 미션을 수행했습니다.' },
        { time: '오전 · 참여 30명', title: '뚝딱 AI 메이커톤: 생각을 작품으로', description: '생성형 AI 활용법을 배우고 일상 문제를 해결하는 결과물을 제작·발표하는 PBL 활동을 진행했습니다.' },
        { time: '오후 · 참여 27명', title: '레고 에듀케이션 CS & AI', description: 'AI 비전 센서를 학습시키고 로봇 제어 로직을 배우며 자율주행의 핵심 원리를 탐구했습니다.' },
        { time: '오후 · 참여 30명', title: '메카트로닉스 시스템을 활용한 로보틱스', description: '산업 현장의 자동화 기기를 제작하며 작동 원리를 배우고 로보틱스로 문제를 해결했습니다.' }
      ],
      note: '현장 사진은 학생 초상권 공개 동의 확인 후 게재 예정입니다.',
      inquiry: '학생 AI 체험'
    },
    remote: {
      kicker: '교원 연수 · 원격교육',
      title: '교육부 인가 원격교육연수원 직무연수 제작 및 실시간 연수 운영',
      body: [
        '교원의 실제 수업 활용을 중심으로 다양한 직무연수 콘텐츠를 기획·제작하고, 실시간 온라인 연수를 운영해왔습니다.',
        '연수 주제 선정부터 강사 섭외, 콘텐츠 구성, 촬영·운영까지 연수 제작의 전 과정을 체계적으로 지원합니다.'
      ],
      facts: [['대상', '교원'], ['프로그램', '원격 직무연수 콘텐츠 제작 · 실시간 온라인 연수'], ['운영 범위', '주제 선정 · 강사 섭외 · 콘텐츠 구성 · 촬영 · 운영']],
      inquiry: '원격 직무연수·콘텐츠'
    },
    keris: {
      kicker: '학교 컨설팅',
      title: 'KERIS 찾아가는 학교 컨설팅 다수 운영',
      body: [
        '학교 현장의 디지털 전환과 AI·에듀테크 활용을 지원하기 위한 찾아가는 학교 컨설팅을 다수 운영했습니다.',
        '학교별 환경과 교원의 요구를 반영한 현장 중심 프로그램으로, 실제 수업과 학교 운영에 적용할 수 있는 실질적인 컨설팅을 제공합니다.'
      ],
      facts: [['대상', '학교 및 교원'], ['프로그램', '디지털 전환 · AI·에듀테크 활용 현장 컨설팅'], ['운영 범위', '학교 방문 · 현장 맞춤 컨설팅']],
      inquiry: '학교 컨설팅'
    },
    community: {
      kicker: '교원 커뮤니티 · 플랫폼',
      title: 'AI미래교육연구회 연수 운영 및 갓쌤연수원 사이트 위탁 운영',
      body: [
        'AI·디지털 교육에 관심 있는 교원들을 대상으로 다양한 전문 연수를 운영하고 있습니다.',
        '교원 연수 플랫폼인 갓쌤연수원 사이트 위탁 운영을 통해 연수 콘텐츠와 교원을 지속적으로 연결하고 있습니다.'
      ],
      facts: [['대상', 'AI·디지털 교육에 관심 있는 교원'], ['프로그램', 'AI미래교육연구회 연수 · 갓쌤연수원 위탁 운영'], ['운영 범위', '연수 운영 · 플랫폼 위탁 운영']],
      inquiry: '교원 연수'
    }
  };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var caseDialog = $('#caseDialog');
  var caseContent = $('#caseDialogContent');
  function renderCase(key) {
    var c = CASES[key];
    if (!c) return;
    var html = '';
    if (c.image) html += '<img class="dialog-image" src="' + esc(c.image.src) + '" alt="' + esc(c.image.alt) + '">';
    html += '<div class="dialog-body">';
    html += '<span class="case-kicker">' + esc(c.kicker) + '</span>';
    html += '<h2 id="caseDialogTitle">' + esc(c.title) + '</h2>';
    c.body.forEach(function (p) { html += '<p>' + esc(p) + '</p>'; });
    html += '<dl class="facts">';
    c.facts.forEach(function (f) { html += '<div><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>'; });
    html += '</dl>';
    if (c.programs && c.programs.length) {
      html += '<section class="case-programs"><h3>프로그램별 구성</h3><ol class="case-program-list">';
      c.programs.forEach(function (program) {
        html += '<li><span class="case-program-meta">' + esc(program.time) + '</span><strong>' + esc(program.title) + '</strong><p>' + esc(program.description) + '</p></li>';
      });
      html += '</ol></section>';
    }
    if (c.note) html += '<p class="dialog-small">' + esc(c.note) + '</p>';
    html += '<button type="button" class="btn btn-primary" data-case-inquiry="' + esc(c.inquiry) + '">비슷한 프로그램 문의하기 <svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></button>';
    html += '</div>';
    caseContent.innerHTML = html;
    openDialog(caseDialog);
  }
  $$('[data-case]').forEach(function (btn) {
    btn.addEventListener('click', function () { renderCase(btn.getAttribute('data-case')); });
  });
  caseContent.addEventListener('click', function (e) {
    var b = e.target.closest('[data-case-inquiry]');
    if (!b) return;
    pendingInquiry = b.getAttribute('data-case-inquiry');
    caseDialog.close();
  });

  /* ---------------- config.js 기반 연락처 / 사업자 정보 ---------------- */
  (function applyConfig() {
    var direct = $('#contactDirect');
    var items = [];
    if (CFG.inquiryEmail) items.push(['이메일', '<a href="mailto:' + esc(CFG.inquiryEmail) + '">' + esc(CFG.inquiryEmail) + '</a>']);
    if (CFG.phone) items.push(['전화', '<a href="tel:' + esc(CFG.phone.replace(/[^\d+]/g, '')) + '">' + esc(CFG.phone) + '</a>']);
    if (CFG.businessHours) items.push(['운영 시간', esc(CFG.businessHours)]);
    if (items.length) {
      direct.innerHTML = items.map(function (it) {
        return '<div class="direct-item"><span class="direct-label">' + it[0] + '</span><strong>' + it[1] + '</strong></div>';
      }).join('');
      direct.hidden = false;
    }

    var fc = $('#footerContact');
    if (CFG.inquiryEmail) fc.insertAdjacentHTML('afterbegin', '<li><a href="mailto:' + esc(CFG.inquiryEmail) + '">' + esc(CFG.inquiryEmail) + '</a></li>');
    if (CFG.phone) fc.insertAdjacentHTML('afterbegin', '<li><a href="tel:' + esc(CFG.phone.replace(/[^\d+]/g, '')) + '">' + esc(CFG.phone) + '</a></li>');

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
  var formBody = $('#formBody');
  var formSuccess = $('#formSuccess');
  var formStatus = $('#formStatus');
  var phone = $('#phone');

  var LABELS = { org: '기관명', name: '담당자명', phone: '연락처', email: '이메일', type: '문의 유형', target: '연수 대상', topic: '희망 주제', headcount: '예상 인원', schedule: '희망 일정', message: '상세 내용' };
  var PHONE_RE = /^(0\d{1,2})-?(\d{3,4})-?(\d{4})$/;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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
    if (input.id === 'phone' && !$('#optionalConsent').checked) { clearError(input); return true; }
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

  function collect() {
    var data = {};
    Object.keys(LABELS).forEach(function (id) {
      if (!$('#optionalConsent').checked && optionalIds.indexOf(id) !== -1) return;
      var el = document.getElementById(id);
      data[id] = el ? el.value.trim() : '';
    });
    return data;
  }

  function buildText(d) {
    var lines = ['[쌤픽에듀 연수·사업 문의]', ''];
    Object.keys(LABELS).forEach(function (id) {
      if (d[id]) lines.push(LABELS[id] + ': ' + d[id]);
    });
    lines.push('', '— ' + location.href.split('#')[0] + ' 문의 양식에서 작성');
    return lines.join('\n');
  }

  var lastText = '';
  var submitting = false;
  var submissionId = '';
  var submissionFingerprint = '';
  var submitBtn = $('#submitBtn');
  $('#optionalConsent').addEventListener('change', function () { validateField(phone); });
  var copyBtn = $('#copyBtn');
  var copyStatus = $('#copyStatus');

  function showForm() {
    formSuccess.hidden = true;
    formBody.hidden = false;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (submitting || !receptionReady) return;
    if ($('#website').value) return;

    var firstBad = null;
    required.forEach(function (input) {
      if (!validateField(input) && !firstBad) firstBad = input;
    });
    if (firstBad) {
      formStatus.textContent = '입력 내용을 확인해 주세요. ' + (errorEl(firstBad) ? errorEl(firstBad).textContent : '');
      firstBad.focus();
      return;
    }

    var d = collect();
    var fingerprint = JSON.stringify(d) + ':' + $('#optionalConsent').checked;
    if (fingerprint !== submissionFingerprint || !submissionId) {
      submissionFingerprint = fingerprint;
      submissionId = window.createInquiryId();
    }
    var payload = Object.assign({}, d, {
      request_id: submissionId,
      consent_required: true,
      consent_optional: $('#optionalConsent').checked,
      consent_overseas_transfer: true,
      consent_version: CFG.privacyVersion,
      _gotcha: $('#website').value
    });
    submitting = true;
    submitBtn.disabled = true;
    submitBtn.textContent = '접수 중…';
    form.setAttribute('aria-busy', 'true');
    formStatus.textContent = '문의 내용을 전송하고 있습니다.';
    try {
      var result = await window.sendInquiryViaAppsScript(CFG.inquiryEndpoint, payload);
      if (result.ok !== true) {
        var failed = new Error(result.code || 'UNAVAILABLE');
        if (result.code === 'UNKNOWN') failed.name = 'TimeoutError';
        throw failed;
      }
      lastText = buildText(d);
      $('#summary').innerHTML = Object.keys(LABELS).filter(function (id) { return d[id]; }).map(function (id) {
        return '<div><dt>' + esc(LABELS[id]) + '</dt><dd>' + esc(d[id]) + '</dd></div>';
      }).join('');
      $('#successDesc').textContent = '문의 메일 발송 요청이 완료되었습니다. 담당자가 확인 후 입력하신 이메일로 연락드립니다.';
      copyStatus.textContent = '';
      formBody.hidden = true;
      formSuccess.hidden = false;
      $('#successTitle').focus();
    } catch (err) {
      formStatus.textContent = err.name === 'TimeoutError' || err instanceof TypeError ?
        '접수 결과를 확인하지 못했습니다. 이미 전송됐을 수 있으므로 재접수 전 ij7404613@gmail.com으로 확인해 주세요. 입력 내용은 유지됩니다.' :
        '접수를 완료하지 못했습니다. 입력 내용을 유지했습니다. 잠시 후 다시 시도하거나 ij7404613@gmail.com으로 문의해 주세요.';
    } finally {
      submitting = false;
      submitBtn.disabled = false;
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
  $('#formNote').textContent = receptionReady ? '문의 내용은 담당자 이메일로 자동 전달됩니다. 별도의 메일 앱을 열지 않습니다.' : '자동 접수 연결을 준비 중입니다. 현재는 문의가 전송되지 않습니다. 문의: ' + CFG.inquiryEmail;

  $('#editBtn').addEventListener('click', function () {
    form.reset();
    submissionId = '';
    submissionFingerprint = '';
    required.forEach(clearError);
    formStatus.textContent = '';
    showForm();
    $('#org').focus();
  });
})();
