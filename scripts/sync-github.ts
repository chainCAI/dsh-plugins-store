import { readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// 本地 .env 兜底：仅在进程环境变量未设置时读取（CI 注入的 GITHUB_TOKEN 优先级更高）。
// 零依赖实现，避免为同步脚本引入 dotenv。
const envFilePath = resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env')
try {
  for (const line of readFileSync(envFilePath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (match && !(match[1] in process.env)) {
      process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2')
    }
  }
} catch {
  // 没有 .env 文件时保持原样（未提供 Token 也能以公共额度运行）
}

import {
  buildCatalog,
  VERIFIED_REPOSITORY_OVERRIDES,
  type GitHubRepository,
} from '../src/lib/catalog'
import { CURATED_PICKS } from '../src/data/curated'
import {
  extractAwesomeRepositoryNames,
  extractVerifiedRepositoryNames,
} from '../src/lib/github-content'

const SEARCH_URL = 'https://api.github.com/search/repositories'
const API_URL = 'https://api.github.com'
const AWESOME_REPOSITORY = 'AdamPlatin123/awesome-dsh-plugins'
const VERIFY_REPOSITORY = 'qing3a/dsh-plugin-verify'
const PAGE_SIZE = 100
/** 只收录公测后创建的仓库：DeepSeek Harness 本体创建于 2026-08-13，此前的仓库都是蹭标签的老项目。
 *  站长收藏清单（src/data/curated.ts）中的仓库不受此过滤，经 collectCurated 白名单补充收录。 */
const MIN_CREATED_AT = '2026-08-13'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = resolve(root, 'src/data/catalog.json')

interface SearchResponse {
  total_count: number
  incomplete_results: boolean
  items: GitHubRepository[]
}

function getHeaders(accept = 'application/vnd.github+json'): HeadersInit {
  const headers: Record<string, string> = {
    Accept: accept,
    'User-Agent': 'dsh-plugin-store-sync',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

async function fetchRenderedReadme(fullName: string): Promise<Response> {
  const repositoryPath = fullName.split('/').map(encodeURIComponent).join('/')
  return fetch(`${API_URL}/repos/${repositoryPath}/readme`, {
    headers: getHeaders('application/vnd.github.html+json'),
  })
}

async function fetchPage(page: number, query: string): Promise<SearchResponse> {
  const searchParams = new URLSearchParams({
    q: query,
    sort: 'stars',
    order: 'desc',
    per_page: String(PAGE_SIZE),
    page: String(page),
  })
  const response = await throttledFetch(`${SEARCH_URL}?${searchParams}`)
  if (!response.ok) {
    const remaining = response.headers.get('x-ratelimit-remaining')
    throw new Error(`GitHub API 请求失败：${response.status} ${response.statusText}，剩余额度 ${remaining ?? '未知'}`)
  }
  return response.json() as Promise<SearchResponse>
}

/** 简单节流：Search API 限额 30 次/分钟，请求间隔至少 1.2 秒 */
let lastRequestAt = 0
async function throttledFetch(url: string): Promise<Response> {
  const wait = 1_200 - (Date.now() - lastRequestAt)
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
  lastRequestAt = Date.now()

  let lastError: unknown
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      return await fetch(url, { headers: getHeaders() })
    } catch (error) {
      lastError = error
      if (attempt < 4) {
        await new Promise((resolve) => setTimeout(resolve, 2_000 * attempt))
      }
    }
  }
  throw lastError
}

/**
 * star 区间分段。
 * GitHub Search 单查询最多返回 1000 条，分段必须保证每段 < 1000。
 * 实测（2026-08-15）：topic:dsh-plugin created:>=2026-08-13 共约 2300 个仓库，
 * 各星段数量：1★=536、2★=591、3★=336、4★=115、5-9★=152、0★=485、≥10★=96。
 * （不能按 created 日期分段：大量仓库的 created_at 是 GitHub 导入时间，集中在同一天）
 */
const STAR_SEGMENTS: ReadonlyArray<{ min: number; max?: number }> = [
  { min: 10 },
  { min: 5, max: 9 },
  { min: 3, max: 4 },
  { min: 2, max: 2 },
  { min: 1, max: 1 },
  { min: 0, max: 0 },
]

function buildStarQuery(segment: { min: number; max?: number }): string {
  const { min, max } = segment
  const base = `topic:dsh-plugin created:>=${MIN_CREATED_AT}`
  if (max === undefined) return `${base} stars:>=${min}`
  if (min === max) return `${base} stars:${min}`
  return `${base} stars:${min}..${max}`
}

async function collectSegment(
  query: string,
  repositories: Map<number, GitHubRepository>,
  incompleteSegments: { count: number },
): Promise<void> {
  const firstPage = await fetchPage(1, query)
  const pageCount = Math.ceil(firstPage.total_count / PAGE_SIZE)
  if (pageCount > 10) {
    throw new Error(`分段 ${query} 返回 ${firstPage.total_count} 个仓库，超出单查询 1000 条上限，需要更细的分段`)
  }

  let incomplete = firstPage.incomplete_results
  for (const repository of firstPage.items) repositories.set(repository.id, repository)
  for (let page = 2; page <= pageCount; page += 1) {
    const response = await fetchPage(page, query)
    incomplete ||= response.incomplete_results
    for (const repository of response.items) repositories.set(repository.id, repository)
  }

  if (incomplete) incompleteSegments.count += 1
}

/**
 * 站长收藏补充收录。
 * 站长收藏清单（src/data/curated.ts）里的仓库可能早于公测创建，
 * 不满足 MIN_CREATED_AT 搜索过滤，这里按白名单经 REST 接口单独收录，
 * 保证「站长收藏」区块在目录中都能解析到详情页。
 */
async function collectCurated(repositories: Map<number, GitHubRepository>): Promise<number> {
  let collected = 0
  for (const fullName of new Set(CURATED_PICKS.map(({ fullName }) => fullName))) {
    const [owner, repo] = fullName.split('/')
    const response = await throttledFetch(`${API_URL}/repos/${owner}/${repo}`)
    if (!response.ok) {
      throw new Error(
        `站长收藏仓库请求失败：${fullName} → ${response.status} ${response.statusText}，请检查清单或仓库是否可访问`,
      )
    }
    const repository = (await response.json()) as GitHubRepository
    repositories.set(repository.id, repository)
    collected += 1
  }
  return collected
}

const EXCLUDED_REPOSITORIES: ReadonlySet<string> = new Set(['ZASENJC/dsh-plugins-store'])

async function fetchRepositories() {
  const repositories = new Map<number, GitHubRepository>()
  const firstPage = await fetchPage(1, `topic:dsh-plugin created:>=${MIN_CREATED_AT}`)
  const reportedByGitHub = firstPage.total_count
  const incompleteSegments = { count: 0 }

  for (const segment of STAR_SEGMENTS) {
    await collectSegment(buildStarQuery(segment), repositories, incompleteSegments)
  }

  const curatedCount = await collectCurated(repositories)

  if (incompleteSegments.count > 0) {
    console.warn(`有 ${incompleteSegments.count} 个分段搜索不完整，目录可能缺少少量仓库`)
  }
  console.log(`站长收藏补充收录 ${curatedCount} 个仓库`)
  const repositoriesList = [...repositories.values()].filter(
    (repository) => !EXCLUDED_REPOSITORIES.has(repository.full_name),
  )
  return { repositories: repositoriesList, reportedByGitHub }
}

async function sync() {
  const { repositories, reportedByGitHub } = await fetchRepositories()
  const [awesomeResponse, verifyResponse] = await Promise.all([
    fetchRenderedReadme(AWESOME_REPOSITORY),
    fetchRenderedReadme(VERIFY_REPOSITORY),
  ])
  if (!awesomeResponse.ok || !verifyResponse.ok) {
    throw new Error(
      `目录清单请求失败：Awesome ${awesomeResponse.status}，Verify ${verifyResponse.status}`,
    )
  }
  const awesomeRepositoryNames = extractAwesomeRepositoryNames(await awesomeResponse.text())
  const verifiedRepositoryNames = extractVerifiedRepositoryNames(await verifyResponse.text())
  const generatedAt = new Date().toISOString()
  const catalog = buildCatalog(
    repositories,
    generatedAt,
    reportedByGitHub,
    awesomeRepositoryNames,
    verifiedRepositoryNames,
  )
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8')

  console.log(`Awesome 有效收录 ${awesomeRepositoryNames.size} 个仓库名；商店匹配 ${catalog.repositories.filter((repository) => repository.awesomeListed).length} 个`)
  console.log(`Verified 有效收录 ${verifiedRepositoryNames.size} 个仓库；站内覆盖 ${VERIFIED_REPOSITORY_OVERRIDES.size} 个；商店匹配 ${catalog.stats.verified} 个`)
  console.log(`已同步 ${catalog.stats.fetched}/${reportedByGitHub} 个仓库到 ${outputPath}`)
}

await sync()
