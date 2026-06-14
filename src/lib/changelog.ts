// 패치노트(변경 내역) — 단일 진실 공급원.
// 새 버전을 낼 때 이 배열의 "맨 위"에 항목을 하나 추가하면 끝.
// UI(PatchNotesButton)는 CHANGELOG[0]을 "최신 버전"으로 간주한다.

export type ChangeType = 'feat' | 'fix'

export interface ChangeItem {
  /** 'feat' = 새 기능, 'fix' = 버그 수정 */
  type: ChangeType
  /** 선생님이 읽을 한국어 한 줄 설명 */
  text: string
}

export interface ReleaseNote {
  /** Semantic Versioning: MAJOR.MINOR.PATCH (예: '1.1.0') */
  version: string
  /** 출시일 YYYY-MM-DD */
  date: string
  /** 그 버전 한 줄 요약 (선택) */
  title?: string
  changes: ChangeItem[]
}

/** 최신순(내림차순)으로 정렬. 맨 앞이 최신 버전. */
export const CHANGELOG: readonly ReleaseNote[] = [
  {
    version: '1.1.1',
    date: '2026-06-14',
    title: '저장 오류 안내가 정확해졌어요',
    changes: [
      {
        type: 'fix',
        text: '힌트를 빠뜨려 저장이 안 될 때, 몇 번째 문제의 어느 힌트가 비었는지 콕 집어 알려줘요.',
      },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-06-14',
    title: '사진 힌트와 패치노트가 추가됐어요',
    changes: [
      { type: 'feat', text: '패치노트 — 무엇이 바뀌었는지 이 창에서 확인할 수 있어요.' },
      { type: 'feat', text: '사진 힌트 — 문제에 이미지를 넣어 클릭하면 펼쳐지게 하거나, 처음부터 보여줄 수 있어요.' },
      { type: 'feat', text: '퀴즈 풀기 화면에서 글자 크기를 슬라이더로 즉시 조절할 수 있어요.' },
      { type: 'feat', text: '사용 가이드 투어 설명을 더 자세하게 다듬었어요.' },
    ],
  },
  {
    version: '1.0.2',
    date: '2026-05-11',
    title: '가이드 투어 자동 시작',
    changes: [
      { type: 'feat', text: '처음 방문하면 사용 가이드 투어가 자동으로 시작돼요.' },
      { type: 'feat', text: '음절 힌트를 여러 글자에 한 번에 적용할 수 있어요.' },
    ],
  },
  {
    version: '1.0.1',
    date: '2026-05-10',
    title: '비밀번호 흐름 개선',
    changes: [
      { type: 'feat', text: '회원가입 시 비밀번호 확인 입력이 추가됐어요.' },
      { type: 'feat', text: '비밀번호를 잊었을 때 재설정 메일로 다시 설정할 수 있어요.' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-05-10',
    title: '첫 출시',
    changes: [
      { type: 'feat', text: '초성 퀴즈를 만들고, 수정하고, 삭제할 수 있어요.' },
      { type: 'feat', text: '퀴즈 풀기 모드 — 풀스크린으로 힌트를 하나씩 펼치며 진행해요.' },
      { type: 'feat', text: '선생님 로그인으로 본인 퀴즈만 안전하게 관리해요.' },
    ],
  },
]

/** 최신 버전 문자열 (예: '1.1.0'). "안읽음" 판단의 기준값. */
export const LATEST_VERSION = CHANGELOG[0].version
