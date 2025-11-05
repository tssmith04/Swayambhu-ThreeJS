import { describe, it, expect } from 'vitest'
import { cn } from '../../lib/utils'

describe('cn utility', () => {
    it('merges class names and dedupes logically', () => {
        const r = cn('p-2', 'p-2', ['rounded', false && 'hidden'], { 'text-white': true, 'hidden': false })
        expect(r).toContain('p-2')
        expect(r).toContain('rounded')
        expect(r).toContain('text-white')
        expect(r).not.toContain('hidden')
    })

    it('handles empty inputs', () => {
        const r = cn()
        expect(r).toBe('')
    })
})
