import { describe, expect, it } from 'vitest'

import { getCanonicalUrl } from './seo'

describe('canonical URLs', () => {
  it('uses the production origin and removes query strings and fragments', () => {
    expect(
      getCanonicalUrl(new URL('http://localhost:4321/plugins/1333111893?sort=stars#readme')),
    ).toBe('https://dsh-plugin-market.pages.dev/plugins/1333111893')
  })

  it('keeps the root slash while removing trailing slashes from content pages', () => {
    expect(getCanonicalUrl(new URL('http://localhost:4321/'))).toBe('https://dsh-plugin-market.pages.dev/')
    expect(getCanonicalUrl(new URL('http://localhost:4321/topics/dsh-plugin/'))).toBe(
      'https://dsh-plugin-market.pages.dev/topics/dsh-plugin',
    )
  })
})
