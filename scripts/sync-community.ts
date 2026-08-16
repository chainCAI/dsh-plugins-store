import { readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  toCommunityEntry,
  type CommunityEntry,
  type CommunitySubmission,
} from '../src/lib/community'

/**
 * 拉取社群发布提交（GET {COMMUNITY_API_URL}/api/community/submissions），
 * 转换为目录条目后写入 src/data/community.json，供构建时合并展示。
 *
 * 需要环境变量 COMMUNITY_API_URL（站点域名，如 https://dsh.pages.dev）。
 * 未配置或接口暂不可用时静默跳过，不阻塞 GitHub Topic 主同步。
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = resolve(root, 'src/data/community.json')
const catalogPath = resolve(root, 'src/data/catalog.json')

interface SubmissionsResponse {
  ok?: boolean
  submissions?: CommunitySubmission[]
  error?: string
}

async function fetchSubmissions(): Promise<CommunitySubmission[]> {
  const baseUrl = (process.env.COMMUNITY_API_URL || '').trim().replace(/\/+$/, '')
  if (!baseUrl) {
    console.log('未配置 COMMUNITY_API_URL，跳过社群发布同步')
    return []
  }

  const response = await fetch(`${baseUrl}/api/community/submissions`, {
    headers: { Accept: 'application/json', 'User-Agent': 'dsh-plugin-store-sync' },
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    console.warn(`拉取社群发布失败：${response.status} ${text.slice(0, 200)}，跳过`)
    return []
  }
  const data = (await response.json()) as SubmissionsResponse
  if (!data.ok || !Array.isArray(data.submissions)) {
    console.warn(`社群发布接口返回异常：${data.error ?? '未知错误'}，跳过`)
    return []
  }
  return data.submissions
}

function readCatalogFullNames(): Set<string> {
  try {
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as {
      repositories?: Array<{ fullName?: string }>
    }
    return new Set((catalog.repositories ?? [])
      .map((repository) => repository.fullName?.toLowerCase())
      .filter((name): name is string => Boolean(name)))
  } catch {
    return new Set()
  }
}

async function sync() {
  const submissions = await fetchSubmissions()
  if (submissions.length === 0) return

  const catalogNames = readCatalogFullNames()

  // 按提交时间保留每个仓库的最新一条，且跳过已被 GitHub Topic 收录的仓库
  const byFullName = new Map<string, CommunitySubmission>()
  for (const submission of submissions) {
    const key = submission.fullName.toLowerCase()
    if (catalogNames.has(key)) continue
    const existing = byFullName.get(key)
    if (!existing || submission.submittedAt > existing.submittedAt) {
      byFullName.set(key, submission)
    }
  }

  const entries = [...byFullName.values()]
    .map(toCommunityEntry)
    .filter((entry): entry is CommunityEntry => entry !== null)
    .sort((left, right) => Date.parse(right.submittedAt) - Date.parse(left.submittedAt))

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(entries, null, 2)}\n`, 'utf8')
  console.log(`已同步 ${entries.length} 个社群发布条目到 ${outputPath}`)
}

await sync()
