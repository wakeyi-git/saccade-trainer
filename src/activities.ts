import type { Mode, Intensity } from './types'

export type ActivityMeta = {
  id: string
  mode: Mode
  label: string
  description: string
  intensities: Intensity[]
  durations: number[]
  defaultIntensity: Intensity
  defaultDuration: number
}

export const ACTIVITIES: ActivityMeta[] = [
  {
    id: 'A1',
    mode: 'A',
    label: '두 점 점프',
    description: '화면 좌·우 두 점이 교대로 점등. 학생은 켜진 점을 응시.',
    intensities: ['low', 'medium', 'high'],
    durations: [30, 60, 90],
    defaultIntensity: 'medium',
    defaultDuration: 60
  },
  {
    id: 'A2',
    mode: 'A',
    label: '행 추적',
    description: '한 줄의 단어가 차례로 강조. 시선으로 따라가기.',
    intensities: ['low', 'medium', 'high'],
    durations: [30, 60, 90],
    defaultIntensity: 'medium',
    defaultDuration: 60
  },
  {
    id: 'A3',
    mode: 'A',
    label: 'Return sweep',
    description: '행 끝 → 다음 행 시작점 점프. 책 읽기의 가장 어려운 운동.',
    intensities: ['low', 'medium', 'high'],
    durations: [30, 60, 90],
    defaultIntensity: 'medium',
    defaultDuration: 60
  },
  {
    id: 'A4',
    mode: 'A',
    label: '단어 등장 (RSVP 변형)',
    description: '정해진 위치 시퀀스에 단어가 차례로 등장.',
    intensities: ['low', 'medium', 'high'],
    durations: [30, 60, 90],
    defaultIntensity: 'medium',
    defaultDuration: 60
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
