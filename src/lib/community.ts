import type { Catalog, CatalogEntry } from './catalog'
import { DSH_PLUGIN_TOPIC_URL, FEATURED_STAR_THRESHOLD, computeRating } from './catalog'
import { classifyRepository, type Confidence } from './classification'

/**
 * 社群发布条目：用户通过首页「社区发布」弹窗提交的插件，
 * 与 GitHub Topic 自动收录数据分开存放（projectType / source 均为 'community'）。
 *
 * 数据结构与 CatalogEntry 对齐，保证 ProjectCard、详情页、筛选器可以直接复用；
 * 提交后先进入 KV 存储，再由 scripts/sync-community.ts 拉取生成 community.json，
 * 构建时经 mergeCommunityEntries 合并进目录。
 */
export interface CommunityEntry extends Omit<CatalogEntry, 'projectType' | 'source' | 'status'> {
  projectType: 'community'
  source: 'community'
  /** 用户提交时间（用于“最新排序”与展示） */
  submittedAt: string
  status: {
    discovery: 'community'
    verification: 'not-verified'
  }
}

/**
 * 把社群发布条目合并进目录：
 * - 按 fullName（大小写不敏感）去重，GitHub 已收录的仓库不再重复展示；
 * - 更新 fetched / categories / projectTypes 统计。
 * 返回新 Catalog，不改动入参。
 */
export function mergeCommunityEntries(catalog: Catalog, entries: CommunityEntry[]): Catalog {
  if (entries.length === 0) return catalog

  const knownNames = new Set(catalog.repositories.map((repository) => repository.fullName.toLowerCase()))
  const added = entries.filter((entry) => !knownNames.has(entry.fullName.toLowerCase()))
  if (added.length === 0) return catalog

  const categories = { ...catalog.stats.categories }
  const projectTypes = { ...catalog.stats.projectTypes }
  for (const entry of added) {
    categories[entry.category] = (categories[entry.category] ?? 0) + 1
    projectTypes[entry.projectType] = (projectTypes[entry.projectType] ?? 0) + 1
  }

  return {
    ...catalog,
    stats: {
      ...catalog.stats,
      fetched: catalog.stats.fetched + added.length,
      categories,
      projectTypes,
    },
    repositories: [...catalog.repositories, ...added],
  }
}

/** GitHub API 仓库快照（提交时由服务端抓取并存进 KV） */
export interface CommunitySubmissionRepo {
  id: number
  name: string
  full_name: string
  html_url: string
  owner: { login: string; avatar_url: string }
  description: string | null
  homepage: string | null
  language: string | null
  license: { spdx_id: string | null } | null
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  size: number
  created_at: string
  updated_at: string
  pushed_at: string
  topics: string[]
  archived: boolean
  fork: boolean
  default_branch: string
}

/** KV 中一条社区提交记录的原始形态 */
export interface CommunitySubmission {
  id: string
  fullName: string
  url: string
  submittedAt: string
  note: string
  validated: boolean
  repo: CommunitySubmissionRepo | null
}

/** 把社区提交记录转换为目录条目；repo 快照缺失时返回 null（无法补全信息，跳过） */
export function toCommunityEntry(submission: CommunitySubmission): CommunityEntry | null {
  const repo = submission.repo
  if (!repo) return null

  const fullName = repo.full_name || submission.fullName
  const classification = classifyRepository({
    fullName,
    name: repo.name,
    description: repo.description ?? '',
    topics: repo.topics ?? [],
  })
  const featured = repo.stargazers_count >= FEATURED_STAR_THRESHOLD

  return {
    id: `community:${submission.id}`,
    repositoryId: repo.id,
    slug: `community-${submission.id}`,
    name: repo.name,
    fullName,
    description: repo.description?.trim() || '该仓库暂未提供项目说明。',
    url: repo.html_url || submission.url,
    homepage: repo.homepage === DSH_PLUGIN_TOPIC_URL ? null : repo.homepage || null,
    owner: {
      login: repo.owner?.login ?? fullName.split('/')[0],
      avatarUrl: repo.owner?.avatar_url ?? '',
    },
    topics: [...new Set(repo.topics ?? [])].sort((left, right) => left.localeCompare(right)),
    language: repo.language,
    license: repo.license?.spdx_id || null,
    stars: repo.stargazers_count ?? 0,
    forks: repo.forks_count ?? 0,
    openIssues: repo.open_issues_count ?? 0,
    size: repo.size ?? 0,
    createdAt: repo.created_at,
    updatedAt: repo.updated_at || repo.created_at,
    pushedAt: repo.pushed_at || repo.created_at,
    archived: repo.archived,
    fork: repo.fork,
    projectType: 'community',
    category: classification.category,
    categories: classification.categories,
    matchedTopics: classification.matchedTopics,
    classificationConfidence: classification.confidence as Confidence,
    defaultBranch: repo.default_branch || 'main',
    awesomeListed: false,
    verified: false,
    verificationUrl: null,
    featured,
    rating: computeRating({
      stars: repo.stargazers_count ?? 0,
      pushedAt: repo.pushed_at || repo.created_at,
      featured,
      archived: repo.archived,
      fork: repo.fork,
    }),
    status: {
      discovery: 'community',
      verification: 'not-verified',
    },
    source: 'community',
    submittedAt: submission.submittedAt,
  }
}

/** 取全部社区条目的空结果（供静态构建兜底） */
export function getEmptyCommunityEntries(): CommunityEntry[] {
  return []
}
