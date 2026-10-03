"""Generate static HTML and an explicit, public-only dist/ directory. Python 3 stdlib."""
from pathlib import Path
from html import escape
from html.parser import HTMLParser
from urllib.parse import quote, urlsplit, unquote
import argparse
import json
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'site'
DIST = ROOT / 'dist'

def data(name):
    return json.loads((SOURCE / 'data' / (name + '.json')).read_text())

def inquiry(name):
    return 'index.html?inquiry=' + quote(name) + '#contact'

def facts(items, cls='facts'):
    return '<dl class="' + cls + '">' + ''.join('<div><dt>' + escape(k) + '</dt><dd>' + escape(v) + '</dd></div>' for k, v in items) + '</dl>'

def case_cards(cases):
    cards = []
    for key, c in cases.items():
        image = c['image']
        responsive = ' srcset="' + escape(image['srcset']) + '" sizes="(min-width: 1080px) 45vw, 100vw"' if image.get('srcset') else ''
        media = '<img class="case-visual-image" src="' + image['src'] + '" width="' + str(image['width']) + '" height="' + str(image['height']) + '"' + responsive + ' loading="lazy" alt="' + escape(image['alt']) + '">'
        if key == 'expo':
            media = '''<div class="case-featured-media"><figure><button type="button" class="zoomable" data-full="asset/img/expo-hall-1536-faces-blurred-1536.webp" data-caption="AI미래교육박람회 전시장 전경 · 50개 부스 운영" aria-label="전시장 전경 사진 크게 보기"><img src="asset/img/expo-hall-1280-faces-blurred.webp" srcset="asset/img/expo-hall-768-faces-blurred.webp 768w, asset/img/expo-hall-1280-faces-blurred.webp 1280w" sizes="(min-width: 1080px) 45vw, 100vw" width="1280" height="853" loading="lazy" alt="참가자 얼굴을 흐리게 처리한 AI미래교육박람회 전시장"><svg class="icon zoom-hint" aria-hidden="true"><use href="#i-zoom"/></svg></button><figcaption>박람회 전시장 · 50개 부스 운영</figcaption></figure><figure><button type="button" class="zoomable" data-full="asset/img/expo-stage-1920.webp" data-caption="AI미래교육박람회 메인 무대" aria-label="메인 무대 사진 크게 보기"><img src="asset/img/expo-stage-1280.webp" width="1280" height="853" loading="lazy" alt="AI미래교육박람회 메인 무대"><svg class="icon zoom-hint" aria-hidden="true"><use href="#i-zoom"/></svg></button><figcaption>AI미래교육연구회 × 쌤픽에듀</figcaption></figure></div>'''
        extra = ''.join('<p>' + escape(p) + '</p>' for p in c['body'][1:]) + facts(c['facts'])
        if c.get('programs'):
            extra += '<h4>프로그램별 구성</h4><ol class="case-program-list">' + ''.join('<li><span class="case-program-meta">' + escape(p['time']) + '</span><strong>' + escape(p['title']) + '</strong><p>' + escape(p['description']) + '</p></li>' for p in c['programs']) + '</ol>'
        body = '<div class="' + ('case-featured-body' if key == 'expo' else 'case-body') + '"><span class="case-kicker">' + escape(c['kicker']) + '</span><h3>' + escape(c['title']) + '</h3><p class="case-summary">' + escape(c['body'][0]) + '</p><details class="case-more"><summary>운영 내용 자세히 보기</summary><div>' + extra + '</div></details><a class="link-arrow" href="' + inquiry(c['inquiry']) + '">비슷한 프로그램 문의하기 <svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></a></div>'
        cards.append('<article id="case-' + key + '" class="' + ('case-featured' if key == 'expo' else 'case') + '">' + media + body + '</article>')
    return cards[0] + '<div class="case-grid">' + ''.join(cards[1:]) + '</div>'

def business_cards(businesses):
    return '<div class="business-grid">' + ''.join('<a class="business-card" href="business-' + b['slug'] + '.html"><span class="business-card-top"><span class="business-number">0' + str(i+1) + '</span><svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></span><h3>' + escape(b['name']) + '</h3><span class="business-audience">' + escape(b['audience']) + '</span><p>' + escape(b['summary']) + '</p><span class="business-card-link">사업 자세히 보기</span></a>' for i,b in enumerate(businesses)) + '</div>'

def business_guide(b):
    return '<section class="section business-guide" aria-labelledby="guideTitle"><div class="container"><div class="section-head"><p class="eyebrow">상담 준비</p><h2 class="section-title" id="guideTitle">문의 전에 함께 확인할 내용</h2><p class="section-lead">정해진 항목만 알려주세요. 세부 구성·일정·비용은 기관의 목적과 조건을 확인한 뒤 제안드립니다.</p></div>' + facts(b['guide'], 'planning-grid') + '</div></section>'

def business_outline(b):
    outline = b['outline']
    steps = ''.join('<li><span class="outline-number" aria-hidden="true">0' + str(i+1) + '</span><h3>' + escape(title) + '</h3><p>' + escape(body) + '</p></li>' for i, (title, body) in enumerate(outline['steps']))
    return '<section class="section business-outline" aria-labelledby="outlineTitle"><div class="container"><div class="section-head"><p class="eyebrow">구성 · 진행 안내</p><h2 class="section-title" id="outlineTitle">' + escape(outline['title']) + '</h2></div><ol class="outline-grid">' + steps + '</ol><p class="outline-note">' + escape(outline['note']) + '</p></div></section>'

def seo(name, cfg, url):
    if name == '404.html':
        return '<meta name="robots" content="noindex">'
    if not url:
        return '<meta property="og:image" content="asset/img/og-image.jpg">'
    canonical = url + ('/' if name == 'index.html' else '/' + name)
    org = {'@context': 'https://schema.org', '@type': 'Organization', 'name': cfg['legalName'], 'url': url+'/', 'logo': url+'/asset/img/logo.webp', 'email': cfg['inquiryEmail']}
    if cfg.get('phone'): org['telephone'] = cfg['phone']
    return '<link rel="canonical" href="' + escape(canonical) + '">\n  <meta property="og:url" content="' + escape(canonical) + '">\n  <meta property="og:image" content="' + escape(url) + '/asset/img/og-image.jpg">\n  <script type="application/ld+json">' + json.dumps(org,ensure_ascii=False).replace('<','\\u003c') + '</script>'

class Assets(HTMLParser):
    def __init__(self): super().__init__(); self.files = set()
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        for key in ('src','href','data-full','content'):
            value = a.get(key, '')
            if value.startswith(('asset/', '/asset/')): self.files.add(value.lstrip('/'))
        for key in ('srcset','imagesrcset'):
            for item in a.get(key,'').split(','):
                value = item.strip().split(' ')[0]
                if value.startswith('asset/'): self.files.add(value)

def build(site_url=None, release=False):
    cfg, businesses, cases, types = data('config'), data('businesses'), data('cases'), data('inquiry-types')
    url = (site_url if site_url is not None else cfg.get('siteUrl','')).rstrip('/')
    parsed = urlsplit(url)
    if url and (parsed.scheme != 'https' or not parsed.netloc or parsed.path or parsed.query or parsed.fragment or parsed.username or parsed.password):
        raise ValueError('siteUrl must be an HTTPS origin without a path, credentials, query or fragment.')
    if release and not url:
        raise ValueError('Release requires the confirmed public siteUrl or --site-url https://your-domain.')
    marker = DIST / '.ssampick-generated'
    if DIST.exists() and (DIST.is_symlink() or not marker.is_file()):
        raise ValueError('Refusing to replace an unrecognized dist directory.')
    cfg['siteUrl'] = url
    (ROOT / 'asset/js/config.js').write_text('/* Generated from site/data/config.json. No secrets belong here. */\nwindow.SSAMPICK_CONFIG = ' + json.dumps(cfg,ensure_ascii=False,indent=2) + ';\n')
    (ROOT / 'apps-script/SiteSettings.gs').write_text('// Generated by scripts/build_site.py. Redeploy Apps Script after changes.\nconst RECIPIENT = ' + json.dumps(cfg['inquiryEmail']) + ';\nconst TYPES = ' + json.dumps(types,ensure_ascii=False) + ';\n')
    partials = {p.stem:p.read_text() for p in (SOURCE/'partials').glob('*.html')}
    outputs = {}
    for page in sorted((SOURCE/'pages').glob('*.html')):
        home = '' if page.name == 'index.html' else 'index.html'
        context = {**partials, 'home':home, 'email':escape(cfg['inquiryEmail']), 'seo':seo(page.name,cfg,url), 'business_cards':business_cards(businesses), 'case_cards':case_cards(cases), 'inquiry_options':''.join('<option>'+escape(t)+'</option>' for t in types)}
        if page.stem.startswith('business-'):
            b = next(b for b in businesses if page.stem == 'business-' + b['slug'])
            context['business_guide'] = business_guide(b)
            context['business_outline'] = business_outline(b)
        content=page.read_text()
        for _ in range(5):
            content=re.sub(r'\{\{(\w+)\}\}',lambda m:context.get(m[1],m[0]),content)
        if re.search(r'\{\{\w+\}\}',content): raise ValueError('Unresolved template in '+page.name)
        content=re.sub(r'<a\b[^>]*>', lambda m: m[0][:-1]+' aria-current="page">' if 'href="'+page.name+'"' in m[0] and 'aria-current=' not in m[0] else m[0], content)
        if page.name != 'index.html': content=content.replace(' data-nav','')
        if page.stem.startswith('business-'): content=content.replace('class="business-toggle"','class="business-toggle active"')
        if page.name=='404.html': content=content.replace('href="asset/','href="/asset/').replace('src="asset/','src="/asset/').replace('href="index.html','href="/index.html').replace('href="programs.html','href="/programs.html').replace('href="business-','href="/business-')
        content='<!-- Generated from site/pages/'+page.name+' and site/partials/. Run python3 scripts/build_site.py after editing sources. -->\n'+content
        outputs[page.name]=content
        (ROOT/page.name).write_text(content)
    # A fresh destination contains only allowed pages and their referenced public assets.
    # Refuse to replace a folder not marked as our own generated output.
    marker=DIST/'.ssampick-generated'
    if DIST.exists():
        if DIST.is_symlink() or not marker.is_file(): raise ValueError('Refusing to replace an unrecognized dist directory.')
        shutil.rmtree(DIST)
    DIST.mkdir()
    marker.write_text('Generated output; never put source files here.\n')
    assets=Assets()
    for name,content in outputs.items():
        (DIST/name).write_text(content); assets.feed(content)
    # Font CSS references a pinned local subset bundle; include its license.
    assets.files.update(str(p.relative_to(ROOT)) for p in (ROOT/'asset/fonts').glob('*') if p.suffix in ('.woff2','.css','.txt'))
    assets.files.add('asset/img/og-image.jpg')
    for name in sorted(assets.files):
        p=ROOT/name
        if not p.is_file() or p.is_symlink() or not p.resolve().is_relative_to((ROOT/'asset').resolve()) or '..' in p.parts or 'original' in p.name: raise ValueError('Unsafe or missing asset: '+name)
        target=DIST/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,target)
    robots='User-agent: *\n'+('Allow: /\nSitemap: '+url+'/sitemap.xml\n' if url else 'Disallow: /\n')
    (DIST/'robots.txt').write_text(robots)
    if url:
        xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join('<url><loc>'+escape(url+('/' if n=='index.html' else '/'+n))+'</loc></url>' for n in outputs if n!='404.html')+'</urlset>\n'
        (DIST/'sitemap.xml').write_text(xml)
    (DIST/'_headers').write_text('/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n')
    print(f'Generated {len(outputs)} pages and {len(assets.files)} public assets in dist/. '+('Public URL: '+url if url else 'Preview build: indexing disabled until siteUrl is confirmed.'))
    return outputs

if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--site-url',help='Confirmed public HTTPS origin')
    parser.add_argument('--release',action='store_true',help='Require the public origin before creating a release')
    args=parser.parse_args()
    build(args.site_url,args.release)
