// Diagnostic → prerequisite profile → learning path (prd.md F4, architecture.md §3.6).
// Deliberately simple threshold rules, not ML, so the research design stays explainable.

export const SKILLS = ['integerOps', 'fractions', 'algebraSimplify'];
export const SKILL_LABEL = {
  integerOps: 'Operasi bilangan bulat',
  fractions: 'Pecahan',
  algebraSimplify: 'Penyederhanaan aljabar',
};

/** Which level each prerequisite protects (IL03, IL04). */
export const SKILL_BEFORE_LEVEL = { integerOps: 'L2', algebraSimplify: 'L5', fractions: 'L6' };

/** @param {{skill:string, correct:boolean}[]} answers */
export function scoreDiagnostic(answers) {
  const profile = {};
  for (const skill of SKILLS) {
    const mine = answers.filter((a) => a.skill === skill);
    const ratio = mine.length ? mine.filter((a) => a.correct).length / mine.length : 1;
    profile[skill] = ratio < 0.5 ? 'lemah' : ratio < 0.8 ? 'cukup' : 'kuat';
  }
  return profile;
}

/** Reinforcement module to show before entering `levelId`, or null. */
export function reinforcementFor(profile, levelId, done = []) {
  if (!profile) return null;
  for (const [skill, lvl] of Object.entries(SKILL_BEFORE_LEVEL)) {
    if (lvl === levelId && profile[skill] === 'lemah' && !done.includes(skill)) return skill;
  }
  return null;
}

/** An item is "clean" with at most one wrong attempt and at most H1. */
export const isClean = (r) => r.wrongs <= 1 && r.maxHint <= 1;

/** Mastery = the last 3 practice items were clean (architecture.md §3.6). */
export function isMastered(results) {
  const practice = results.filter((r) => r.mode !== 'worked');
  const last3 = practice.slice(-3);
  return last3.length === 3 && last3.every(isClean);
}

export function bestStreak(results) {
  let best = 0;
  let cur = 0;
  for (const r of results.filter((x) => x.mode !== 'worked')) {
    cur = isClean(r) ? cur + 1 : 0;
    best = Math.max(best, cur);
  }
  return best;
}

export const LEVEL_ORDER = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'];

export function nextLevel(id) {
  const i = LEVEL_ORDER.indexOf(id);
  return i >= 0 && i < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[i + 1] : null;
}
