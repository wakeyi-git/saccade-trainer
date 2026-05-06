import { test, expect } from '@playwright/test'

const ACTIVITIES = ['A1', 'A2', 'A3', 'A4'] as const

// 사양서 §8.1: 자극 등장 지연 ±16ms (60Hz 1프레임), 지속 ±32ms.
// 헤드리스 환경의 jitter를 감안해 회귀 테스트는 *코드 변경 시 더 나빠지지 않는지* 검증.
// 절대 정확도 검증은 학교 PC 현장 측정의 몫.
const AVG_LIMIT_MS = 25
const MAX_LIMIT_MS = 80
const DROP_LIMIT = 8

for (const id of ACTIVITIES) {
  test(`${id} 자극 타이밍이 한도 이내`, async ({ page }) => {
    page.on('pageerror', (e) => console.error('pageerror:', e.message))
    await page.goto(`#/run/A/${id}?i=medium&d=15&autoexit=1`)

    const report = page.locator('[data-test-report="1"]')
    await expect(report).toBeVisible({ timeout: 30_000 })

    const cueCount = Number(await report.getAttribute('data-cue-count'))
    const avgError = Number(await report.getAttribute('data-avg-error'))
    const maxError = Number(await report.getAttribute('data-max-error'))
    const dropCount = Number(await report.getAttribute('data-drop-count'))

    console.log(`[${id}] cues=${cueCount} avg=${avgError.toFixed(2)}ms max=${maxError.toFixed(2)}ms drops=${dropCount}`)

    expect(cueCount, 'cue가 발화돼야 함').toBeGreaterThan(0)
    expect(avgError, '평균 오차').toBeLessThanOrEqual(AVG_LIMIT_MS)
    expect(maxError, '최대 오차').toBeLessThanOrEqual(MAX_LIMIT_MS)
    expect(dropCount, '드롭 프레임 수').toBeLessThanOrEqual(DROP_LIMIT)
  })
}
