import { describe, expect, it } from 'vitest'

import { buildCatalog, type GitHubRepository } from './catalog'
import {
  mergeCommunityEntries,
  sanitizeRepoSnapshot,
  toCommunityEntry,
  type CommunityEntry,
  type CommunitySubmission,
} from './community'

const rawGithubRepo: GitHubRepository = {
  id: 1,
  name: 'existing',
  full_name: 'owner/existing',
  owner: { login: 'owner', avatar_url: 'https://x' },
  html_url: 'https://github.com/owner/existing',
  description: null,
  fork: false,
  created_at: '2026-08-13T00:00:00Z',
  updated_at: '2026-08-13T00:00:00Z',
  pushed_at: '2026-08-13T00:00:00Z',
  homepage: null,
  size: 1,
  stargazers_count: 2,
  forks_count: 0,
  open_issues_count: 0,
  language: null,
  archived: false,
  license: null,
  topics: ['dsh-plugin'],
  default_branch: 'main',
}

const baseSubmission: CommunitySubmission = {
  id: 'sub-1750000000-ab12cd',
  fullName: 'community-owner/dsh-hello',
  url: 'https://github.com/community-owner/dsh-hello',
  submittedAt: '2026-08-15T10:00:00.000Z',
  note: '',
  validated: true,
  repo: {
    id: 9001,
    name: 'dsh-hello',
    full_name: 'community-owner/dsh-hello',
    html_url: 'https://github.com/community-owner/dsh-hello',
    owner: { login: 'community-owner', avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4' },
    description: 'A community-submitted plugin.',
    homepage: null,
    language: 'TypeScript',
    license: { spdx_id: 'MIT' },
    stargazers_count: 12,
    forks_count: 1,
    open_issues_count: 0,
    size: 100,
    created_at: '2026-08-15T09:00:00Z',
    updated_at: '2026-08-15T09:30:00Z',
    pushed_at: '2026-08-15T09:40:00Z',
    topics: ['dsh-plugin', 'skills'],
    archived: false,
    fork: false,
    default_branch: 'main',
  },
}

describe('社群发布 toCommunityEntry', () => {
  it('把提交快照转换为独立的 community 类型条目', () => {
    const entry = toCommunityEntry(baseSubmission)

    expect(entry).not.toBeNull()
    expect(entry).toMatchObject({
      id: 'community:sub-1750000000-ab12cd',
      slug: 'community-sub-1750000000-ab12cd',
      fullName: 'community-owner/dsh-hello',
      projectType: 'community',
      source: 'community',
      submittedAt: '2026-08-15T10:00:00.000Z',
      status: { discovery: 'community', verification: 'not-verified' },
      verified: false,
      awesomeListed: false,
      stars: 12,
      createdAt: '2026-08-15T09:00:00Z',
    })
    expect(entry!.repositoryId).toBe(9001)
    expect(entry!.featured).toBe(false)
  })

  it('repo 快照缺失时跳过该提交', () => {
    expect(toCommunityEntry({ ...baseSubmission, repo: null })).toBeNull()
  })

  it('star 达到精选门槛时标记 featured', () => {
    const entry = toCommunityEntry({
      ...baseSubmission,
      repo: { ...baseSubmission.repo!, stargazers_count: 120 },
    })
    expect(entry!.featured).toBe(true)
  })
})

describe('社群发布 sanitizeRepoSnapshot', () => {
  it('清洗客户端快照为服务端认可的字段，并拒绝非对象', () => {
    const snapshot = sanitizeRepoSnapshot({
      id: 42,
      name: 'hello',
      full_name: 'octocat/Hello-World',
      html_url: 'https://github.com/octocat/Hello-World',
      owner: { login: 'octocat', avatar_url: 'https://x/avatar.png' },
      description: 'My first repository on GitHub!',
      stargazers_count: 1234,
      topics: ['demo', 'dsh-plugin'],
      license: { spdx_id: 'MIT' },
      extraJunk: 'should be dropped',
    }, 'octocat/Hello-World')

    expect(snapshot).not.toBeNull()
    expect(snapshot).toMatchObject({
      full_name: 'octocat/Hello-World',
      name: 'hello',
      id: 42,
      stargazers_count: 1234,
      topics: ['demo', 'dsh-plugin'],
      license: { spdx_id: 'MIT' },
    })
    expect((snapshot as unknown as Record<string, unknown>).extraJunk).toBeUndefined()
    expect(sanitizeRepoSnapshot(null, 'a/b')).toBeNull()
    expect(sanitizeRepoSnapshot('not-an-object', 'a/b')).toBeNull()
  })

  it('缺字段时使用兜底值（owner / 时间 / 分支）', () => {
    const snapshot = sanitizeRepoSnapshot({ name: 'x' }, 'owner/repo')
    expect(snapshot).not.toBeNull()
    expect(snapshot!.full_name).toBe('owner/repo')
    expect(snapshot!.owner.login).toBe('owner')
    expect(snapshot!.default_branch).toBe('main')
    expect(snapshot!.archived).toBe(false)
  })
})

describe('mergeCommunityEntries', () => {
  it('合并进目录并更新统计', () => {
    const catalog = buildCatalog([], '2026-08-15T00:00:00.000Z', 0)
    const community: CommunityEntry[] = [toCommunityEntry(baseSubmission)!]

    const merged = mergeCommunityEntries(catalog, community)

    expect(merged.repositories).toHaveLength(1)
    expect(merged.stats.fetched).toBe(1)
    expect(merged.stats.projectTypes.community).toBe(1)
    expect(merged.stats.categories[merged.repositories[0].category] ?? 0).toBe(1)
  })

  it('GitHub 已收录的同名仓库不再重复加入', () => {
    const catalog = buildCatalog([rawGithubRepo], '2026-08-15T00:00:00.000Z', 1)
    const community: CommunityEntry[] = [{
      ...toCommunityEntry(baseSubmission)!,
      fullName: rawGithubRepo.full_name,
    }]

    const merged = mergeCommunityEntries(catalog, community)

    expect(merged.repositories).toHaveLength(1)
    expect(merged.stats.fetched).toBe(1)
    expect(merged.stats.projectTypes.community).toBeUndefined()
  })

  it('与已有目录合并时正确累加统计', () => {
    const catalog = buildCatalog([rawGithubRepo], '2026-08-15T00:00:00.000Z', 1)
    const community: CommunityEntry[] = [toCommunityEntry(baseSubmission)!]

    const merged = mergeCommunityEntries(catalog, community)

    expect(merged.repositories).toHaveLength(2)
    expect(merged.stats.fetched).toBe(2)
    expect(merged.stats.projectTypes.community).toBe(1)
  })

  it('空列表时原样返回', () => {
    const catalog = buildCatalog([rawGithubRepo], '2026-08-15T00:00:00.000Z', 1)
    expect(mergeCommunityEntries(catalog, [])).toBe(catalog)
  })
})