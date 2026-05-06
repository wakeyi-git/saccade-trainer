# Saccade Trainer

디지털네이티브 아동의 안구운동 인프라(수평 사카드, 응시 안정성, 수직↔수평 전환)를
학급 5분 루틴 또는 개별 지원 15분 회기에서 훈련하는 정적 웹앱이다.

설계와 운영 원리는 [프로그램 설계서 v0.1](./2026-05-06%20디지털네이티브%20안구운동%20문해력%20프로그램%20설계서%20v0.1.md),
도구의 기능 사양은 [기능 사양 v0.1](./2026-05-06%20디지털네이티브%20안구운동%20도구%20—%20기능%20사양%20v0.1.md)을 따른다.

## 현재 상태 — M0

- 모드 A의 활동 A1 (두 점 점프, 강도 보통, 60초)만 동작
- Fullscreen 진입, ESC로 즉시 종료
- 회기 종료 후 자극 엔진 자가진단 보고 (cue 오차, 드롭 프레임)
- 기록 저장·내보내기·강도 슬라이더·학생 등록은 미구현 (M1 이후)

## 개발

```sh
npm install
npm run dev      # http://localhost:5173/saccade-trainer/
npm run build    # dist/
```

## 배포

`main` 브랜치 push 시 GitHub Actions가 GitHub Pages로 자동 배포한다.
배포 URL: https://wakeyi-git.github.io/saccade-trainer/
