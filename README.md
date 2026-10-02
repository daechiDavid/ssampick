# 쌤픽에듀 final

mix_fable 전체를 복사한 후 이 폴더에서만 수정한 독립 정적 사이트입니다. Fable의 파랑·초록 색상, 둥근 카드, 실제 박람회 사진과 확대 기능을 유지합니다. index.html을 정적 웹서버로 제공하면 되며 빌드 과정은 없습니다.

## 보완 사항
- 실적 다음에 프로그램·사례·강사진을 배치하고 회사 소개의 중복 서비스 목록을 정리했습니다.
- 바이브 코딩과 원격 콘텐츠를 별도 카드로 추가해 6개 프로그램을 제공합니다.
- 실제 실적 숫자를 HTML 기본값으로 제공하며 JavaScript가 없어도 콘텐츠와 FAQ가 보입니다.
- 닫힌 모바일 메뉴의 키보드 접근을 차단하고 열린 메뉴의 포커스 순환·Escape 닫기를 지원합니다.
- 모바일 상단 문의 버튼, 16px 입력 글씨, 기기 하단 안전 여백을 적용했습니다.
- Google Apps Script 자동 메일 발송 코드를 준비했습니다. 서버의 접수 성공 응답 이후에만 완료 화면을 표시하며 실패 시 입력 내용을 유지합니다.
- 수집·이용 동의를 필수/선택으로 나누고, 선택 동의가 없으면 선택 항목은 전송하지 않습니다. 국외 이전 동의는 별도로 받습니다. 핵심 동의 안내와 하단의 상세 개인정보 처리방침을 분리했습니다.
- 소개서 PPTX 파일이나 다운로드 기능은 없습니다.

## Apps Script 배포 및 연결

전송 흐름: 웹사이트 → Apps Script 서버 함수 → MailApp → `ij7404613@gmail.com`.
별도 DB·구글 시트는 사용하지 않습니다. Gmail 비밀번호를 사이트에 넣을 필요가 없습니다.

### 1. Google 프로젝트 만들기

1. 수신 계정 또는 운영용 Google 계정으로 [Apps Script](https://script.google.com/)에서 새 프로젝트를 만듭니다.
2. 이 폴더의 `apps-script/Code.gs` 내용을 편집기의 `Code.gs`에 붙여 넣습니다.
3. HTML 파일을 추가해 이름을 **Bridge**로 지정하고 `apps-script/Bridge.html` 내용을 넣습니다.
4. 프로젝트 설정에서 `appsscript.json` 표시를 켜고 제공된 `apps-script/appsscript.json` 내용으로 설정합니다.
5. 프로젝트 설정 → 스크립트 속성에 아래 값을 추가합니다.

| 속성 | 값 |
| --- | --- |
| `ALLOWED_SITE_ORIGIN` | 실제 웹사이트 출처. 예: `https://www.example.com` (경로·끝 슬래시 제외) |
| `PRIVACY_VERSION` | 확정된 동의 문서 버전. 웹사이트 설정과 동일해야 하며 `draft`를 포함하면 안 됩니다. |

6. 편집기의 함수 선택에서 **setupMailAuthorization**을 한 번 실행하고 Google의 메일 발송 권한을 승인합니다. `SIGNING_SECRET`이 자동 생성됩니다. 이 값은 서버에만 보관합니다.
7. 배포 → 새 배포 → 웹 앱을 선택합니다. 실행 사용자 **나**, 액세스 권한 **모든 사용자**(로그인하지 않은 방문자 포함)로 설정합니다.
8. 배포된 `https://script.google.com/macros/s/배포ID/exec` URL을 복사합니다. `/dev` URL은 사용하지 않습니다.

### 2. 웹사이트 설정

`asset/js/config.js`에서 다음 항목을 설정합니다.

- `inquiryEndpoint`: 위 `/exec` 배포 URL.
- `privacyOfficerName`, `privacyOfficerRole`: 보호책임자 이름·직책.
- `privacyEffectiveDate`: 실제 시행일.
- `privacyVersion`: 서버의 `PRIVACY_VERSION`과 같은 확정 버전.
- `transferRecipients`: Google Apps Script·Gmail의 법인명, 연락처, 이전 국가, 항목, 시기·방법, 목적, 문의 메일·운영 기록·백업의 보유기간. 국가 안내는 “미국 등 Google 데이터센터 소재 국가”로 작성하고, 개별 처리 국가를 공개 자료만으로 특정하지 못한다는 설명을 함께 표시합니다. 이 표현을 법령상 기재 요건이 확인된 표준 문구로 단정하지 않습니다.
- `privacyReviewed`: 상세 처리방침의 미확정 부분과 운영 조건을 확정한 뒤 `true`.

현재는 배포 URL과 운영 정보가 없어 접수 버튼이 비활성화되어 있습니다. 운영 정보가 입력되기 전에는 개인정보가 전송되지 않습니다. 로컬 파일 URL 대신 실제 HTTPS 사이트에서 운영해야 하며, 도메인이 바뀌면 서버 `ALLOWED_SITE_ORIGIN`도 변경해야 합니다.

수신 주소는 `apps-script/Code.gs`의 `RECIPIENT`로 고정합니다. 웹사이트의 `inquiryEmail`은 화면 표시용으로, 제출자가 메일 수신자를 바꿀 수 없습니다. 코드 변경 후에는 배포 관리에서 새 버전을 선택해 다시 배포하세요.

### 전송 처리

- Google HtmlService 브리지와 `google.script.run`으로 서버 결과를 받습니다. 개인정보를 URL에 넣지 않습니다.
- 메일 발송 함수가 성공한 경우에만 완료 화면을 표시합니다. 이는 메일 발송 요청의 완료이며 수신함 배달·읽음 보장은 아닙니다.
- 서버에서도 필수 항목·문서 버전·필수 동의를 확인하고, 선택 동의가 없으면 선택 항목을 제외합니다.
- 선택 정보 동의 여부, 국외 이전 동의, 문서 버전과 **서버 접수 시각**을 문의 메일에 기록합니다.
- 일일 최대 50건, 같은 이메일은 60초 간격으로 제한합니다. 일반 Gmail Apps Script의 현재 수신자 한도는 하루 100명이며 다른 스크립트 발송량과 합산됩니다.
- 중복 방지 캐시는 최대 10분이며 Google이 일찍 제거할 수 있어 영구적인 중복 방지를 보장하지 않습니다. 결과가 불확실하면 자동 재전송하지 않습니다.
- 공개 웹 앱은 로그인 없이 접근할 수 있습니다. 출처 확인·서명 티켓·일일 제한은 완전한 봇 차단 수단이 아닙니다. 스팸 때문에 한도가 소진되면 추가 방어가 필요합니다. CAPTCHA 추가 시 개인정보 안내도 함께 변경해야 합니다.
- 이번 작업에서 실제 Google 계정 배포·실메일 발송·브라우저 동작 검증은 수행하지 않았습니다.

## 개인정보 운영 기준 (초안)

- 문의 메일과 동의 기록은 상담 종료일부터 3개월 또는 접수일부터 1년 중 먼저 도래하는 날까지 보관하도록 권장했습니다. 종료일이 정해지지 않은 진행 중 문의도 접수일부터 최대 1년을 넘기지 않습니다. 이 기간은 법정 의무 보존기간이 아닌 운영 기준입니다.
- 메일 삭제를 자동 수행하는 기능은 포함하지 않았습니다. 담당자는 상담 종료일과 접수일을 기준으로 삭제 예정일을 관리하고, 해당 날짜까지 수신·발송 계정의 메일 사본, 휴지통 및 다운로드 사본을 삭제해야 합니다. 휴지통으로 이동만 하면 최대 30일이 더 남으므로 영구 삭제해야 합니다.
- 스팸 방지용 이메일 서명값은 최대 60초, 중복 방지용 접수 식별자·제출 내용 서명값·처리 상태는 최대 10분간 서버 캐시에 저장합니다. 원문 이메일·문의 본문을 캐시에 보관하지 않습니다.
- 실행 로그에 문의 본문을 출력하지 않습니다. Google이 자체적으로 처리하는 운영 기록·백업의 기간은 실제 이용 조건과 구분해 안내해야 합니다.
- 보호책임자·시행일·Google 국외 처리 조건, 호스팅 접속 로그와 jsDelivr 글꼴 CDN 조건은 운영 전 확정해야 합니다. 현재 처리방침은 검토용 초안입니다.
- 개인정보 처리방침과 서버·웹사이트의 동의 버전은 함께 관리하고 이전 방침은 시행일별로 보관하세요.

## Google 이전 국가 안내와 적용 조건

현재 수신 주소는 개인 Gmail입니다. 먼저 Apps Script 배포 계정도 일반 개인 Google 계정인지, Workspace 조직 계정인지 확인합니다. Gmail 주소만으로 배포 계정 종류를 판단하지 마세요.

1. Google의 [데이터센터 위치](https://www.datacenters.google/locations/)에서 공개된 소재 국가를 확인합니다. 이 목록은 Google 전체 시설의 목록이며 이 프로젝트의 문의가 실제로 저장·처리되는 국가 목록을 확정하는 자료는 아닙니다. Apps Script 프로젝트의 연결된 Google Cloud 프로젝트에 표시되는 리전, 접속 IP의 국가 또는 Google 계정의 가입 국가도 Gmail·Apps Script 전체 처리 위치를 증명하지 않습니다.
2. 일반 개인 계정의 현재 안내는 **미국 등 Google 데이터센터 소재 국가**로 작성합니다. 이는 분산 처리에 관한 범위 안내이며, 미국만으로 처리 국가를 한정하거나 대만·싱가포르를 이 프로젝트의 실제 처리 국가로 확인했다는 의미가 아닙니다. `googlekrsupport@google.com`은 개인정보 보호 문의처입니다. Apps Script·Gmail의 개별 처리 국가와 보유기간을 확인해 주는 전담 창구로 안내하지 않습니다. 일반 제품 지원은 [Google 고객지원](https://support.google.com)을 참고합니다.
3. Workspace 조직 계정이면 관리자에게 **관리 콘솔 → 데이터 → 규정 준수 → 데이터 리전** 정책과 해당 계정·조직 단위에 실제 적용된 설정을 확인받습니다. 지원 에디션과 적용 범위는 계약마다 다릅니다. Google은 2026년 9월부터 일부 Workspace 에디션의 Apps Script 저장·실행에 데이터 리전을 지원합니다. 이는 일반 무료 Gmail 계정의 국가 고정 기능을 의미하지 않습니다. [공식 발표](https://workspaceupdates.googleblog.com/2026/09/data-regions-support-for-google-apps-script-now-generally-available.html)
4. 답변 또는 적용 정책으로 확인한 국가를 `transferRecipients[].countries`에 반영합니다. Apps Script 실행 계정과 Gmail 수신 계정의 적용 조건이 다르면 각각 구분해 기록합니다. 국가를 실제로 확인하지 못했다면 공개 데이터센터 국가 목록 전체가 이 프로젝트의 처리 국가라고 단정하지 않습니다.

회사 문의 보유기간과 Google 자체 운영 로그·백업 기간은 구분합니다. 회사는 문의 메일의 삭제일을 정할 수 있지만 Google의 내부 기간을 임의로 3개월로 지정할 수는 없습니다.

현재 문의 양식은 별도 국외 이전 동의를 받는 방식입니다. 계약의 체결·이행에 필요한 처리위탁·보관에 해당하고 법정 고지 요건을 충족하는 경우에는 개인정보 보호법 제28조의8 제1항 제3호를 검토할 수 있으나, 이메일 인프라 이용이라는 이유만으로 이 예외가 자동 적용되지는 않습니다. 국가를 특정하기 어렵다는 사정만으로 국가 안내 의무가 면제된다고 해석하지 않습니다. 문구 변경만으로 `privacyReviewed`를 자동 활성화하지 않습니다.

## 작성 근거

- [개인정보보호위원회 작성지침, 2026.4. 개정](https://pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS217&mCode=D010030040&nttId=12018)
- [Google 개인정보처리방침](https://policies.google.com/privacy?hl=ko)
- [Apps Script 웹 앱 배포](https://developers.google.com/apps-script/guides/web)
- [HtmlService 서버 호출](https://developers.google.com/apps-script/guides/html/communication)
- [MailApp](https://developers.google.com/apps-script/reference/mail/mail-app)
- [Apps Script 사용 한도](https://developers.google.com/apps-script/guides/services/quotas)
