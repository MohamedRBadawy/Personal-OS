export const BODY_REGION_KEYS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'core',
  'glutes',
  'quads',
  'hamstrings',
  'calves',
] as const

export type BodyRegionKey = typeof BODY_REGION_KEYS[number]

type InferredMuscles = {
  primary: BodyRegionKey | ''
  secondary: BodyRegionKey[]
}

export type MuscleInferenceProfile = InferredMuscles & {
  matchCount: number
}

const BODY_REGION_SET = new Set<string>(BODY_REGION_KEYS)

export const MUSCLE_LABELS: Record<BodyRegionKey, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  core: 'Core',
  glutes: 'Glutes',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  calves: 'Calves',
}

const CLIENT_MUSCLE_MAP: ReadonlyArray<[string, InferredMuscles]> = [
  ['bench press',      { primary: 'chest',      secondary: ['triceps', 'shoulders'] }],
  ['chest press',      { primary: 'chest',      secondary: ['triceps'] }],
  ['chest fly',        { primary: 'chest',      secondary: [] }],
  ['cable fly',        { primary: 'chest',      secondary: [] }],
  ['push up',          { primary: 'chest',      secondary: ['triceps', 'shoulders'] }],
  ['lat pulldown',     { primary: 'back',       secondary: ['biceps'] }],
  ['pull up',          { primary: 'back',       secondary: ['biceps'] }],
  ['pull-up',          { primary: 'back',       secondary: ['biceps'] }],
  ['chin up',          { primary: 'back',       secondary: ['biceps'] }],
  ['cable row',        { primary: 'back',       secondary: ['biceps'] }],
  ['seated row',       { primary: 'back',       secondary: ['biceps'] }],
  ['face pull',        { primary: 'back',       secondary: ['shoulders'] }],
  ['deadlift',         { primary: 'back',       secondary: ['glutes', 'hamstrings'] }],
  ['overhead press',   { primary: 'shoulders',  secondary: ['triceps'] }],
  ['shoulder press',   { primary: 'shoulders',  secondary: ['triceps'] }],
  ['lateral raise',    { primary: 'shoulders',  secondary: [] }],
  ['front raise',      { primary: 'shoulders',  secondary: [] }],
  ['shrug',            { primary: 'shoulders',  secondary: [] }],
  ['bicep curl',       { primary: 'biceps',     secondary: [] }],
  ['hammer curl',      { primary: 'biceps',     secondary: [] }],
  ['preacher curl',    { primary: 'biceps',     secondary: [] }],
  ['skull crusher',    { primary: 'triceps',    secondary: [] }],
  ['tricep pushdown',  { primary: 'triceps',    secondary: [] }],
  ['triceps pushdown', { primary: 'triceps',    secondary: [] }],
  ['dip',              { primary: 'triceps',    secondary: ['chest'] }],
  ['tricep',           { primary: 'triceps',    secondary: [] }],
  ['plank',            { primary: 'core',       secondary: [] }],
  ['crunch',           { primary: 'core',       secondary: [] }],
  ['sit up',           { primary: 'core',       secondary: [] }],
  ['leg raise',        { primary: 'core',       secondary: [] }],
  ['hip thrust',       { primary: 'glutes',     secondary: ['hamstrings'] }],
  ['glute bridge',     { primary: 'glutes',     secondary: [] }],
  ['rdl',              { primary: 'hamstrings', secondary: ['glutes'] }],
  ['romanian',         { primary: 'hamstrings', secondary: ['glutes'] }],
  ['squat',            { primary: 'quads',      secondary: ['glutes', 'hamstrings'] }],
  ['leg press',        { primary: 'quads',      secondary: ['glutes'] }],
  ['lunge',            { primary: 'quads',      secondary: ['glutes'] }],
  ['leg extension',    { primary: 'quads',      secondary: [] }],
  ['leg curl',         { primary: 'hamstrings', secondary: [] }],
  ['calf raise',       { primary: 'calves',     secondary: [] }],
  ['curl',             { primary: 'biceps',     secondary: [] }],
  ['calf',             { primary: 'calves',     secondary: [] }],
]

export function isBodyRegionKey(value: string): value is BodyRegionKey {
  return BODY_REGION_SET.has(value)
}

export function inferMuscles(name: string): InferredMuscles {
  const lower = name.toLowerCase()
  for (const [keyword, muscles] of CLIENT_MUSCLE_MAP) {
    if (lower.includes(keyword)) return muscles
  }
  return { primary: '', secondary: [] }
}

export function inferMuscleProfile(name: string): MuscleInferenceProfile {
  const lower = name.toLowerCase()
  const scores = Object.fromEntries(BODY_REGION_KEYS.map((key) => [key, 0])) as Record<BodyRegionKey, number>
  let matchCount = 0

  for (const [keyword, muscles] of CLIENT_MUSCLE_MAP) {
    if (!lower.includes(keyword)) continue

    matchCount += 1
    if (muscles.primary) scores[muscles.primary] += 2
    muscles.secondary.forEach((muscle) => {
      scores[muscle] += 1
    })
  }

  if (matchCount === 0) return { primary: '', secondary: [], matchCount: 0 }

  const ranked = BODY_REGION_KEYS
    .filter((muscle) => scores[muscle] > 0)
    .sort((left, right) => scores[right] - scores[left] || BODY_REGION_KEYS.indexOf(left) - BODY_REGION_KEYS.indexOf(right))

  return {
    primary: ranked[0] ?? '',
    secondary: ranked.slice(1),
    matchCount,
  }
}
