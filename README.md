# 피피티에 수식 넣기 번거로워서 만든 레포

LaTeX나 자연어로 수식을 입력하면 바로 렌더링되고, 버튼 한 번에 **LaTeX / PNG(흰 배경) / SVG / MathML(Word)** 로 클립보드에 복사합니다.
웹앱(`web/`)과 크롬 확장프로그램(`extension/`, 단축키 `Alt+S`) 두 가지로 씁니다. 맥·우분투 모두 동작합니다.

## 구조
```
src/          ← 원본 코드 (여기만 수정)
  body.html   UI 마크업
  app.css     스타일
  app.js      렌더링·복사·기록 로직
  nl.js       자연어 → LaTeX 변환 규칙
  mj-config.js MathJax 설정
build.js      src → web/index.html, extension/ 생성
web/          웹앱 (Vercel 배포 폴더)
extension/    크롬 확장 (MathJax 로컬 번들 포함, 오프라인 동작)
test/         변환 규칙 테스트
```
코드를 고쳤으면 `npm run build` 후 커밋하세요.

## 1. 우분투에서 검증
```bash
cd /home/mylatex
npm test            # 자연어 변환 규칙 테스트
npm run serve       # http://localhost:8080 에서 웹앱 확인
```
크롬 확장 설치:
1. 크롬에서 `chrome://extensions` 열기 → 우측 상단 **개발자 모드** 켜기
2. **압축해제된 확장 프로그램을 로드** → `/home/mylatex/extension` 선택
3. 아무 탭에서 `Alt+S` → 팝업이 뜨면 성공
   - 단축키가 안 먹으면 `chrome://extensions/shortcuts` 에서 다시 지정 (다른 확장과 충돌하는 경우가 있음)

## 2. 깃허브에 올리기
깃허브에서 빈 저장소(`mylatex`)를 만든 뒤:
```bash
cd /home/mylatex
git remote add origin https://github.com/<아이디>/mylatex.git
git push -u origin main
```

## 3. 맥북에서 테스트
```bash
git clone https://github.com/<아이디>/mylatex.git ~/mylatex
```
크롬 확장 설치는 우분투와 같고, 폴더만 `~/mylatex/extension` 을 고르면 됩니다.
맥에서 `Alt` 는 **Option(⌥)** 키입니다. (`⌥S`)

## 4. 웹앱 배포 (Vercel, 무료)
```bash
cd web
npx vercel          # 처음엔 로그인 → 질문은 기본값 Enter
npx vercel --prod   # 고정 주소로 배포
```
나온 주소를 북마크하면 끝입니다.

## 단축키
| 동작 | 맥 | 우분투 |
|---|---|---|
| 팝업 열기 (확장) | ⌥S | Alt+S |
| LaTeX 복사 | ⌘↵ | Ctrl+Enter |
| PNG 복사 | ⌘⇧↵ | Ctrl+Shift+Enter |

## 자연어 입력 예시
| 입력 | 결과 |
|---|---|
| `a over b`, `b 분의 a` | `\frac{a}{b}` |
| `x squared`, `x 제곱` | `x^{2}` |
| `sqrt(x+1)`, `루트 2` | `\sqrt{x+1}` |
| `sum from i=1 to n of x_i` | `\sum_{i=1}^{n} x_i` |
| `integral from 0 to infinity of e^(-x) dx` | `\int_{0}^{\infty} e^{-x} \, dx` |
| `norm of (f_t) <= mu f_n` | `\lVert f_t \rVert \le \mu f_n` |

## 참고
- PNG는 흰 배경·검은 글자로 고정되어 슬라이드에 바로 붙여넣을 수 있습니다. 해상도는 2×/4×/8×.
- MathML 복사 결과를 Word에 붙여넣으면 편집 가능한 수식 개체가 됩니다.
- MathJax 3.2.2 (Apache-2.0) 를 `extension/mathjax/` 에 포함. 다시 받으려면 `npm run vendor`.
