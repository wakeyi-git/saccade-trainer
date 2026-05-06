import type { Mode, Intensity } from './types'

export type ActivityMeta = {
  id: string
  mode: Mode
  label: string
  description: string
  intensities: Intensity[]
  defaultIntensity: Intensity
  defaultDurationSec: number
  recommendedDurations: number[]   // 콘솔 placeholder용 권장값 (강제 아님)
  usesParagraph?: boolean          // 단락 풀에서 본문 선택 가능
  usesChunk?: boolean              // 청킹 단어 수 선택 가능
}

export const ACTIVITIES: ActivityMeta[] = [
  {
    id: 'A1',
    mode: 'A',
    label: '두 점 점프',
    description: '화면 좌·우 두 점이 교대로 점등. 학생은 켜진 점을 응시.',
    intensities: ['low', 'medium', 'high'],
    defaultIntensity: 'medium',
    defaultDurationSec: 60,
    recommendedDurations: [30, 60, 90]
  },
  {
    id: 'A2',
    mode: 'A',
    label: '행 추적',
    description: '한 줄의 단어가 차례로 강조. 시선으로 따라가기.',
    intensities: ['low', 'medium', 'high'],
    defaultIntensity: 'medium',
    defaultDurationSec: 60,
    recommendedDurations: [30, 60, 90]
  },
  {
    id: 'A3',
    mode: 'A',
    label: 'Return sweep',
    description: '행 끝 → 다음 행 시작점 점프. 책 읽기의 가장 어려운 운동.',
    intensities: ['low', 'medium', 'high'],
    defaultIntensity: 'medium',
    defaultDurationSec: 60,
    recommendedDurations: [30, 60, 90]
  },
  {
    id: 'A4',
    mode: 'A',
    label: '단어 등장 (RSVP 변형)',
    description: '정해진 위치 시퀀스에 단어가 차례로 등장.',
    intensities: ['low', 'medium', 'high'],
    defaultIntensity: 'medium',
    defaultDurationSec: 60,
    recommendedDurations: [30, 60, 90]
  },
  {
    id: 'A5',
    mode: 'A',
    label: '청킹 트레이너',
    description: '단락의 어휘를 N개씩 묶어 동시에 강조. 의미 단위 응시 훈련 (수동 청킹).',
    intensities: ['low', 'medium', 'high'],
    defaultIntensity: 'medium',
    defaultDurationSec: 90,
    recommendedDurations: [60, 90, 120],
    usesParagraph: true,
    usesChunk: true
  },
  {
    id: 'B1',
    mode: 'B',
    label: '상하 분할 전환',
    description: '상단(수직 흐름)·하단(수평 단락) 사이를 신호에 따라 시선 전환.',
    intensities: ['low', 'medium', 'high'],
    defaultIntensity: 'medium',
    defaultDurationSec: 90,
    recommendedDurations: [60, 90, 120],
    usesParagraph: true
  },
  {
    id: 'B2',
    mode: 'B',
    label: '모드 명명 카드',
    description: '카드(스크롤·책·자막)를 보고 "수직" 또는 "수평" 메타인지 명명.',
    intensities: ['low', 'medium', 'high'],
    defaultIntensity: 'medium',
    defaultDurationSec: 60,
    recommendedDurations: [30, 60, 90]
  },
  {
    id: 'B3',
    mode: 'B',
    label: '같은 글 두 번 읽기',
    description: '같은 글을 수직 배치본·수평 배치본으로 연이어 읽고 비교.',
    intensities: ['low', 'medium', 'high'],
    defaultIntensity: 'medium',
    defaultDurationSec: 90,
    recommendedDurations: [60, 90, 120],
    usesParagraph: true
  },
  {
    id: 'C1',
    mode: 'C',
    label: '응시 카드',
    description: '한 단어를 응시 시간 동안 응시 후, 떠오른 것 한 줄 입력.',
    intensities: ['low', 'medium', 'high'],
    defaultIntensity: 'medium',
    defaultDurationSec: 120,
    recommendedDurations: [60, 120, 180]
  },
  {
    id: 'C2',
    mode: 'C',
    label: 'Slow read minute',
    description: '한 단락을 진행 막대 안내에 맞춰 천천히 읽기.',
    intensities: ['low', 'medium', 'high'],
    defaultIntensity: 'medium',
    defaultDurationSec: 60,
    recommendedDurations: [45, 60, 90],
    usesParagraph: true
  }
]

export function findActivity(mode: string, id: string): ActivityMeta | undefined {
  return ACTIVITIES.find((a) => a.mode === mode && a.id === id)
}

export const INTENSITY_LABEL: Record<Intensity, string> = {
  low: '낮음',
  medium: '보통',
  high: '높음'
}
