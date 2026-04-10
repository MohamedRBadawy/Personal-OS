// Compatibility shim — real type definitions live in ./types/
// This file exists so that existing imports like `import type { Foo } from '../lib/types'`
// continue to work without any changes.
export * from './types/base'
export * from './types/goals'
export * from './types/finance'
export * from './types/health'
export * from './types/pipeline'
export * from './types/schedule'
export * from './types/contacts'
export * from './types/journal'
export * from './types/learning'
export * from './types/analytics'
export * from './types/chat'
export * from './types/dashboard'
