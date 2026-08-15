import { describe, expect, it } from 'vitest'

import { CURATED_PICKS, getCuratedGroups } from './curated'
import catalogData from './catalog.json'

const catalog = catalogData as { repositories: Array<{ fullName: string }> }
const catalogNames = Object.fromEntries(
  catalog.repositories.map((repository) => [repository.fullName, true]),
) as Record<string, boolean>

describe('站长精选 curated picks', () => {
  it('每个精选都有推荐理由，排名在 1-3 之间', () => {
    for (const pick of CURATED_PICKS) {
      expect(pick.reason.trim().length).toBeGreaterThan(0)
      expect(pick.rank).toBeGreaterThanOrEqual(1)
      expect(pick.rank).toBeLessThanOrEqual(3)
    }
  })

  it('同一分类内排名从 1 开始连续且不重复', () => {
    for (const group of getCuratedGroups()) {
      const ranks = group.picks.map((pick) => pick.rank)
      expect([...ranks].sort((left, right) => left - right)).toEqual(
        Array.from({ length: ranks.length }, (_, index) => index + 1),
      )
    }
  })

  it('每个分类最多 3 个精选', () => {
    for (const group of getCuratedGroups()) {
      expect(group.picks.length).toBeLessThanOrEqual(3)
    }
  })

  it('精选仓库全部存在于 catalog（需先 npm run sync）', () => {
    for (const pick of CURATED_PICKS) {
      expect(catalogNames[pick.fullName], `${pick.fullName} 不在 catalog.json 中，请重新同步目录`).toBe(true)
    }
  })

  it('fullName 无重复', () => {
    const names = CURATED_PICKS.map((pick) => pick.fullName)
    expect(new Set(names).size).toBe(names.length)
  })
})
