import {
  CATEGORIES,
  PROJECT_TYPES,
  classifyRepository,
  type Category,
  type Confidence,
  type ProjectType,
} from './classification'

export const VERIFICATION_DIRECTORY_URL = 'https://github.com/qing3a/dsh-plugin-verify#verified-%E7%9B%AE%E5%BD%95'
/** 仓库 homepage 指向该 topic 页面的，视为无效主页，不对外展示链接 */
export const DSH_PLUGIN_TOPIC_URL = 'https://github.com/topics/dsh-plugin'
export const VERIFIED_REPOSITORY_OVERRIDES: ReadonlyMap<string, string> = new Map([
  ['ccch1mneyyy/dsh-tui', 'https://github.com/ccch1mneyyy/dsh-TUI'],
])

export interface GitHubRepository {
  id: number
  name: string
  full_name: string
  owner: {
    login: string
    avatar_url: string
  }
  html_url: string
  description: string | null
  fork: boolean
  created_at: string
  updated_at: string
  pushed_at: string
  homepage: string | null
  size: number
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  language: string | null
  archived: boolean
  license: { spdx_id: string | null } | null
  topics: string[]
  default_branch?: string
}

export interface Rating {
  /** 综合评分 0-100，由人气、活跃度、精选状态三部分加权 */
  total: number
  /** 对应 5 星制展示值，0.5-5.0 */
  stars: number
  level: 'excellent' | 'good' | 'fair' | 'low'
  breakdown: {
    /** 人气分（满分 40） */
    popularity: number
    /** 活跃度分（满分 30） */
    activity: number
    /** 精选状态分（满分 30） */
    status: number
  }
}

export interface RatingInput {
  stars: number
  pushedAt: string
  /** star 数达到精选门槛 */
  featured: boolean
  archived: boolean
  fork: boolean
}

/** star 数达到该值即视为“精选” */
export const FEATURED_STAR_THRESHOLD = 100

const POPULARITY_MAX = 40

/** 平滑对数人气分：每差几倍 star 就有区分（1★≈4 分，100★≈27，500★≈36，1000★≈40） */
function popularityScore(stars: number): number {
  if (stars <= 0) return 0
  return Math.min(POPULARITY_MAX, Math.round(Math.log10(stars + 1) * 13.33))
}

const ACTIVITY_DAYS: ReadonlyArray<[number, number]> = [
  [1, 30],
  [3, 28],
  [7, 26],
  [30, 22],
  [90, 16],
  [180, 10],
  [365, 6],
]

export function computeRating(repository: RatingInput, now = new Date()): Rating {
  const popularity = popularityScore(repository.stars)

  const days = Math.max(
    0,
    Math.floor((now.getTime() - new Date(repository.pushedAt).getTime()) / 86_400_000),
  )
  let activity = ACTIVITY_DAYS[ACTIVITY_DAYS.length - 1][1]
  for (const [maxDays, score] of ACTIVITY_DAYS) {
    if (days <= maxDays) {
      activity = score
      break
    }
  }

  let status = 0
  if (repository.archived) {
    status = 0
  } else if (repository.featured) {
    status = 24
  } else if (repository.fork) {
    status = 6
  } else {
    status = 12
  }

  const total = popularity + activity + status
  const level: Rating['level'] = total >= 80
    ? 'excellent'
    : total >= 60
      ? 'good'
      : total >= 40
        ? 'fair'
        : 'low'

  return {
    total,
    stars: Math.round((total / 20) * 10) / 10,
    level,
    breakdown: { popularity, activity, status },
  }
}

export interface CatalogEntry {
  id: string
  repositoryId: number
  slug: string
  name: string
  fullName: string
  description: string
  url: string
  homepage: string | null
  owner: {
    login: string
    avatarUrl: string
  }
  topics: string[]
  language: string | null
  license: string | null
  stars: number
  forks: number
  openIssues: number
  size: number
  createdAt: string
  updatedAt: string
  pushedAt: string
  archived: boolean
  fork: boolean
  projectType: ProjectType
  category: Category
  categories: Category[]
  matchedTopics: string[]
  classificationConfidence: Confidence
  defaultBranch: string
  awesomeListed: boolean
  verified: boolean
  verificationUrl: string | null
  /** star 数达到精选门槛（star ≥ 100） */
  featured: boolean
  rating: Rating
  status: {
    discovery: 'topic-listed'
    verification: 'verified' | 'not-verified'
  }
}

export interface Catalog {
  schemaVersion: 1
  generatedAt: string
  source: {
    label: 'GitHub Topic'
    topic: 'dsh-plugin'
  }
  stats: {
    fetched: number
    reportedByGitHub: number
    verified: number
    categories: Partial<Record<Category, number>>
    projectTypes: Partial<Record<ProjectType, number>>
  }
  repositories: CatalogEntry[]
}

export type CatalogSort = 'recommended' | 'rating' | 'stars' | 'updated' | 'name'

export function createCatalogEntry(
  repository: GitHubRepository,
  awesomeRepositoryNames: ReadonlySet<string> = new Set(),
  verifiedRepositoryNames: ReadonlySet<string> = new Set(),
): CatalogEntry {
  const classification = classifyRepository({
    fullName: repository.full_name,
    name: repository.name,
    description: repository.description ?? '',
    topics: repository.topics ?? [],
  })
  const normalizedFullName = repository.full_name.toLowerCase()
  const verificationUrl = verifiedRepositoryNames.has(normalizedFullName)
    ? VERIFICATION_DIRECTORY_URL
    : VERIFIED_REPOSITORY_OVERRIDES.get(normalizedFullName) ?? null
  const featured = repository.stargazers_count >= FEATURED_STAR_THRESHOLD

  return {
    id: `github:${repository.id}`,
    repositoryId: repository.id,
    slug: String(repository.id),
    name: repository.name,
    fullName: repository.full_name,
    description: repository.description?.trim() || '该仓库暂未提供项目说明。',
    url: repository.html_url,
    homepage: repository.homepage === DSH_PLUGIN_TOPIC_URL ? null : repository.homepage || null,
    owner: {
      login: repository.owner.login,
      avatarUrl: repository.owner.avatar_url,
    },
    topics: [...new Set(repository.topics ?? [])].sort((left, right) => left.localeCompare(right)),
    language: repository.language,
    license: repository.license?.spdx_id || null,
    stars: repository.stargazers_count,
    forks: repository.forks_count,
    openIssues: repository.open_issues_count,
    size: repository.size,
    createdAt: repository.created_at,
    updatedAt: repository.updated_at,
    pushedAt: repository.pushed_at,
    archived: repository.archived,
    fork: repository.fork,
    projectType: classification.projectType,
    category: classification.category,
    categories: classification.categories,
    matchedTopics: classification.matchedTopics,
    classificationConfidence: classification.confidence,
    defaultBranch: repository.default_branch || 'main',
    awesomeListed: awesomeRepositoryNames.has(repository.name.toLowerCase()),
    verified: verificationUrl !== null,
    verificationUrl,
    featured,
    rating: computeRating({
      stars: repository.stargazers_count,
      pushedAt: repository.pushed_at,
      featured,
      archived: repository.archived,
      fork: repository.fork,
    }),
    status: {
      discovery: 'topic-listed',
      verification: verificationUrl ? 'verified' : 'not-verified',
    },
  }
}

export function buildCatalog(
  repositories: GitHubRepository[],
  generatedAt = new Date().toISOString(),
  reportedByGitHub = repositories.length,
  awesomeRepositoryNames: ReadonlySet<string> = new Set(),
  verifiedRepositoryNames: ReadonlySet<string> = new Set(),
): Catalog {
  const uniqueRepositories = new Map<number, GitHubRepository>()
  for (const repository of repositories) {
    if (!uniqueRepositories.has(repository.id)) uniqueRepositories.set(repository.id, repository)
  }

  const normalizedAwesomeNames = new Set(
    [...awesomeRepositoryNames].map((name) => name.toLowerCase()),
  )
  const normalizedVerifiedNames = new Set(
    [...verifiedRepositoryNames].map((name) => name.toLowerCase()),
  )
  const entries = sortCatalogEntries(
    [...uniqueRepositories.values()].map((repository) => createCatalogEntry(
      repository,
      normalizedAwesomeNames,
      normalizedVerifiedNames,
    )),
    'recommended',
  )
  const categoryCounts: Partial<Record<Category, number>> = {}
  const typeCounts: Partial<Record<ProjectType, number>> = {}

  for (const entry of entries) {
    categoryCounts[entry.category] = (categoryCounts[entry.category] ?? 0) + 1
    typeCounts[entry.projectType] = (typeCounts[entry.projectType] ?? 0) + 1
  }

  return {
    schemaVersion: 1,
    generatedAt,
    source: {
      label: 'GitHub Topic',
      topic: 'dsh-plugin',
    },
    stats: {
      fetched: entries.length,
      reportedByGitHub,
      verified: entries.filter((entry) => entry.verified).length,
      categories: categoryCounts,
      projectTypes: typeCounts,
    },
    repositories: entries,
  }
}

export function sortCatalogEntries(entries: CatalogEntry[], sort: CatalogSort): CatalogEntry[] {
  const compareStatus = (left: CatalogEntry, right: CatalogEntry) => {
    const featuredPriority = Number(right.awesomeListed || right.verified)
      - Number(left.awesomeListed || left.verified)
    const verifiedPriority = Number(right.verified) - Number(left.verified)
    return featuredPriority || verifiedPriority
  }
  const compareStars = (left: CatalogEntry, right: CatalogEntry) => (
    right.stars - left.stars
    || compareStatus(left, right)
    || left.fullName.localeCompare(right.fullName)
  )

  if (sort === 'recommended') {
    const priority = entries
      .filter((entry) => entry.awesomeListed || entry.verified)
      .sort(compareStars)
    const discovery = entries
      .filter((entry) => !entry.awesomeListed && !entry.verified)
      .sort(compareStars)
    const mixed: CatalogEntry[] = []
    let priorityIndex = 0
    let discoveryIndex = 0

    while (priorityIndex < priority.length || discoveryIndex < discovery.length) {
      for (let slot = 0; slot < 2 && priorityIndex < priority.length; slot += 1) {
        mixed.push(priority[priorityIndex])
        priorityIndex += 1
      }
      if (discoveryIndex < discovery.length) {
        mixed.push(discovery[discoveryIndex])
        discoveryIndex += 1
      }
    }

    return mixed
  }

  return [...entries].sort((left, right) => {
    const statusPriority = compareStatus(left, right)
    if (sort === 'rating') {
      return right.rating.total - left.rating.total
        || right.stars - left.stars
        || statusPriority
        || left.fullName.localeCompare(right.fullName)
    }
    if (sort === 'updated') {
      return Date.parse(right.pushedAt) - Date.parse(left.pushedAt)
        || statusPriority
        || left.fullName.localeCompare(right.fullName)
    }
    if (sort === 'name') {
      return left.name.localeCompare(right.name)
        || statusPriority
        || left.fullName.localeCompare(right.fullName)
    }
    return right.stars - left.stars
      || statusPriority
      || left.fullName.localeCompare(right.fullName)
  })
}

export function formatCompactNumber(value: number): string {
  if (value < 1_000) return String(value)
  if (value < 1_000_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`
}

export function getEmptyCatalog(): Catalog {
  return buildCatalog([], new Date(0).toISOString(), 0)
}

export function getCatalogDefinitions() {
  return { categories: CATEGORIES, projectTypes: PROJECT_TYPES }
}
