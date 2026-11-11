# API

Aplikasi v1 bersifat **offline-first dengan sinkronisasi** ke server untuk dashboard guru. Dokumen ini
memuat **kontrak antarmodul internal** (JavaScript + JSDoc), **skema konten JSON**, **skema data/log**, dan
**endpoint REST v1** (§7).

## 1. Tipe dasar (`src/engine/equation.js (JSDoc)`)

```ts
export type Fraction = { n: number; d: number };          // d > 0, selalu disederhanakan

export type Linear = { a: Fraction; b: Fraction };        // a·x + b

export interface Equation {
  display: string;            // bentuk yang ditampilkan, mis. "3(x - 2) = 12"
  left: Linear;               // bentuk normal ruas kiri
  right: Linear;
}

export type OpKind =
  | 'addBoth' | 'subBoth' | 'mulBoth' | 'divBoth'
  | 'distribute' | 'combineLike' | 'clearDenominators' | 'moveTerm';

export interface Op { kind: OpKind; value?: Fraction; side?: 'left' | 'right'; term?: string }

export interface Step {
  before: Equation;
  op: Op;
  after: Equation;
  explanation: string;        // "Kurangi kedua ruas dengan 5"
  highlight: { side: 'left'|'right'|'both'; tokenIdx: number[]; role: 'var'|'const'|'op' }[];
}

export type StepResult =
  | 'valid_progress' | 'valid_no_progress'
  | 'invalid_one_side' | 'invalid_sign' | 'invalid_arithmetic' | 'invalid_parse';
```

## 2. Modul engine

```ts
// equation.js
parse(input: string): Equation                       // melempar ParseError
normalize(eq: Equation): Equation
solve(eq: Equation): Fraction | 'none' | 'all'       // untuk kunci, tidak pernah ditampilkan langsung
isEquivalent(a: Equation, b: Equation): boolean

// transforms.js
apply(eq: Equation, op: Op): Step
legalOps(eq: Equation, level: LevelId): Op[]         // pilihan chip aksi
explainMoveTerm(eq: Equation, term: string): Step[]  // pindah ruas → operasi kedua ruas (IL01)

// validator.js
classify(prev: Equation, studentNext: Equation | Op): { result: StepResult; detail?: string }

// hints.js
interface HintState { stepId: string; wrongStreak: number; level: 0|1|2|3|4; offered: boolean }
onAttempt(s: HintState, r: StepResult): HintState    // wrongStreak ≥ 2 → offered = true
nextHint(s: HintState, ctx: HintContext): { state: HintState; hint: Hint }
startLevelFor(itemType: string, history: AttemptSummary[]): 0|1|2|3   // fading

// adaptive.js
scoreDiagnostic(answers: DiagnosticAnswer[]): PrereqProfile
nextActivity(profile: PrereqProfile, progress: Progress): Activity
isMastered(levelId: LevelId, attempts: AttemptSummary[]): boolean // 3 benar beruntun, ≤1 hint

// story.js
checkTags(story: Story, tapped: string[]): { correct: string[]; missing: string[]; extra: string[] }
checkLetStatement(story: Story, choiceId: string): boolean
checkEquationCards(story: Story, cards: string[]): { ok: boolean; equation?: Equation; hintKey?: string }
```

## 3. Kontrak Scene 3D (`src/scene3d/scale3d.js · scale2d.js`)

Satu-satunya pintu antara React dan Three.js.

```ts
export interface ScaleController {
  mount(canvas: HTMLCanvasElement, opts?: { lowPower?: boolean }): void;
  setEquation(eq: Equation, opts?: { animate?: boolean }): void;
  apply(step: Step): Promise<void>;          // animasi selesai → resolve
  previewImbalance(side: 'left'|'right', op: Op): Promise<void>;  // umpan balik salah
  setAbstraction(level: 'full' | 'compact' | 'hidden'): void;
  setReducedMotion(on: boolean): void;
  onFallback(cb: (reason: 'no_webgl' | 'low_fps' | 'user') => void): void;
  dispose(): void;
}
export function createScaleController(): ScaleController;   // 3D, otomatis fallback ke 2D
```

Fallback 2D (`Fallback2D.tsx`) mengimplementasikan antarmuka yang sama.

## 4. Skema konten (`content/`)

### 4.1 Level & soal
```json
{
  "id": "L3",
  "title": "Bentuk ax + b = c",
  "prereq": ["integerOps"],
  "items": [
    {
      "id": "L3-E1",
      "type": "worked_example",
      "equation": "2x + 5 = 15",
      "steps": [{ "op": { "kind": "subBoth", "value": 5 }, "why": "Agar 2x sendirian di ruas kiri" },
                { "op": { "kind": "divBoth", "value": 2 }, "why": "2 mengalikan x, maka bagi 2" }]
    },
    { "id": "L3-C1", "type": "completion", "equation": "3x + 4 = 19", "givenSteps": 1 },
    { "id": "L3-P1", "type": "practice", "equation": "4x - 7 = 9",
      "whyPrompt": { "atStep": 2, "options": ["a", "b", "c"], "correct": "b" } }
  ],
  "hints": {
    "invalid_one_side": ["Apakah kedua ruas sudah diberi perlakuan sama?", "..."],
    "invalid_sign": ["..."]
  }
}
```

### 4.2 Soal cerita
```json
{
  "id": "S-ber-01",
  "literacy": { "process": ["formulate", "employ", "interpret"], "context": "personal" },
  "chunks": ["Jumlah tiga bilangan berurutan adalah 45.", "Tentukan bilangan terkecil."],
  "keywords": [{ "text": "Jumlah", "role": "add" }, { "text": "berurutan", "role": "consecutive" },
               { "text": "45", "role": "number" }],
  "let": { "question": "Apa yang dimisalkan x?", "options": ["bilangan terkecil", "45", "jumlahnya"],
           "correct": 0, "expressions": ["x", "x + 1", "x + 2"] },
  "cards": ["x", "+", "x + 1", "+", "x + 2", "=", "45", "-", "3"],
  "equation": "x + (x + 1) + (x + 2) = 45",
  "reasonableness": { "question": "Apakah hasilnya bilangan bulat?", "expect": "integer" }
}
```

### 4.3 Diagnostik
```json
{ "items": [ { "id": "D1", "skill": "integerOps", "prompt": "-3 + (-5) = ?", "answer": "-8" } ] }
```

## 5. Skema data lokal (Dexie)

| Tabel | Kunci | Field |
|---|---|---|
| `profile` | `studentCode` | `studentCode` (S01), `createdAt`, `prereq` (PrereqProfile), `consent: boolean` |
| `progress` | `[studentCode+levelId]` | `status` (locked/active/mastered), `bestStreak`, `updatedAt` |
| `attempts` | `++id` | `studentCode`, `itemId`, `stepIdx`, `input`, `result`, `hintLevel`, `ms`, `ts` |
| `events` | `++id` | lihat §6 |
| `settings` | `key` | `lightMode3D`, `reducedMotion`, `fontScale`, `researchPinHash` |

## 6. Skema event log (penelitian)

```ts
interface LogEvent {
  id?: number;
  studentCode: string;     // hanya kode
  sessionId: string;       // uuid per sesi
  ts: number;              // epoch ms
  type:
    | 'session_start' | 'session_end'
    | 'diagnostic_answer'
    | 'item_start' | 'step' | 'item_complete'
    | 'hint_offered' | 'hint_opened'
    | 'why_answer' | 'verify_substitution'
    | 'story_tag' | 'story_let' | 'story_cards'
    | 'scale_fallback' | 'cl_questionnaire';
  itemId?: string;
  payload: Record<string, unknown>;   // mis. { result: 'invalid_sign', ms: 8200, hintLevel: 2 }
}
```

Ekspor: `exportEvents(format: 'csv'|'json', filter?: {studentCode?, from?, to?}): Promise<Blob>`, lalu
dibagikan lewat Android Share Sheet.

## 7. Endpoint REST v1 (sinkronisasi & dashboard guru)

Basis: `https://<server>/api/v1`. Implementasi: Python FastAPI (`server/app/routes.py`). Endpoint ini
mengikuti kontrak di bawah; dokumentasi interaktif tersedia di `/docs`.

Autentikasi:
- **Siswa:** tanpa akun pribadi. `join` dengan kode kelas + kode siswa menghasilkan token perangkat
  (JWT, berlaku 180 hari).
- **Guru:** login email (magic link). Hanya bisa membaca kelas miliknya.

Tabel tambahan di Dexie: `outbox` (`++id`, `clientEventId`, `payload`, `status`, `tries`, `nextTryAt`) dan
`auth` (`deviceToken`, `classCode`).

| Metode | Path | Fungsi |
|---|---|---|
| `POST` | `/admin/classes` | (Peneliti) membuat kelas + daftar kode siswa + menautkan email guru |
| `POST` | `/classes/{classCode}/join` | Siswa memasukkan kode kelas + kode siswa yang sudah dibuat peneliti → token (gagal `404` jika kode tidak terdaftar) |
| `POST` | `/events:batch` | Unggah batch `LogEvent[]` (idempoten via `sessionId+id`) |
| `GET` | `/progress?studentCode=` | Ambil progres untuk perangkat lain |
| `GET` | `/classes/{classCode}/summary` | (Guru) ringkasan: level, kesalahan dominan per jenis |
| `GET` | `/classes/{classCode}/export?format=csv` | (Peneliti) ekspor data |
| `GET` | `/content/version` | Cek pembaruan konten JSON |

Kode galat: `400` skema tidak valid, `401` token salah, `409` duplikat batch (diabaikan aman), `429` terlalu
sering.
