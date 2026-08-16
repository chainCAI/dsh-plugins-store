/**
 * 社区发布 · 提交接口（Cloudflare Pages Function）
 *
 * POST /api/community/submit
 * body: { fullName: string, url?: string, repo?: Record<string, unknown> }
 *
 * - fullName 格式校验 + 每日每 IP 限流 + 按仓库去重；
 * - 服务端复核 GitHub 仓库存在性（404 直接拒绝）；
 *   复核失败（限流/网络异常）时改用客户端提交的 repo 快照兜底（sanitizeRepoSnapshot），
 *   由 scripts/sync-community.ts 在 CI 中用 GITHUB_TOKEN 复核补全；
 * - 依赖 KV 绑定 COMMUNITY_KV（Cloudflare Pages 项目 → Settings → Functions
 *   → KV namespace bindings，变量名必须为 COMMUNITY_KV）。KV 未绑定时返回 501。
 */

import { sanitizeRepoSnapshot } from '../../../src/lib/community'

interface CommunityKV {
  get(key: string, type?: 'json'): Promise<unknown>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
}

interface Env {
  COMMUNITY_KV?: CommunityKV
}

interface SubmissionRepo {
  id: number
  name: string
  full_name: string
  html_url: string
  owner: { login: string; avatar_url: string } | null
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

interface Submission {
  id: string
  fullName: string
  url: string
  submittedAt: string
  note: string
  validated: boolean
  repo: SubmissionRepo | null
}

const SUBMISSIONS_KEY = 'community:submissions'
const DAILY_LIMIT = 5

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function normalizeFullName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().toLowerCase().replace(/\/+$/, '')
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\/[a-z0-9_.-]+$/.test(trimmed)) return null
  return trimmed
}

export const onRequestPost = async (context: { request: Request; env: Env }): Promise<Response> => {
  const kv = context.env.COMMUNITY_KV
  if (!kv) {
    return json({ ok: false, error: '提交服务暂未配置，请联系站长启用社区发布。' }, 501)
  }

  let body: Record<string, unknown>
  try {
    body = await context.request.json() as Record<string, unknown>
  } catch {
    return json({ ok: false, error: '请求格式无效。' }, 400)
  }

  const fullName = normalizeFullName(body.fullName)
  if (!fullName) {
    return json({ ok: false, error: '请填写有效的 GitHub 仓库链接（owner/repo）。' }, 400)
  }

  // 简单限流：同一 IP 每天最多提交 5 次
  const ip = context.request.headers.get('CF-Connecting-IP') ?? 'unknown'
  const today = new Date().toISOString().slice(0, 10)
  const rateKey = `community:ratelimit:${today}:${ip}`
  const current = Number(await kv.get(rateKey).catch(() => '0')) || 0
  if (current >= DAILY_LIMIT) {
    return json({ ok: false, error: '今日提交次数已达上限，请明天再试。' }, 429)
  }

  const list = (await kv.get(SUBMISSIONS_KEY, 'json').catch(() => null)) as Submission[] | null
  const submissions = Array.isArray(list) ? list : []
  if (submissions.some((submission) => submission.fullName.toLowerCase() === fullName)) {
    return json({ ok: false, error: '该仓库已经提交过了，无需重复提交。' }, 409)
  }

  // 服务端复核仓库是否存在（404 直接拒绝；GitHub 限流/网络异常时用客户端快照兜底，
  // 交由同步脚本在 CI 里用 GITHUB_TOKEN 复核补全）
  let repo: SubmissionRepo | null = null
  let validated = false
  try {
    const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(fullName)}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'dsh-plugin-store',
      },
    })
    if (response.status === 404) {
      return json({ ok: false, error: 'GitHub 上找不到该仓库，请检查链接是否正确。' }, 404)
    }
    if (response.ok) {
      repo = await response.json() as SubmissionRepo
      validated = true
    }
  } catch {
    // 网络异常时保留提交，标记为未校验，由同步脚本兜底
  }
  if (!repo) {
    repo = sanitizeRepoSnapshot(body.repo, fullName)
  }

  const submission: Submission = {
    id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fullName,
    url: typeof body.url === 'string' && body.url ? body.url : `https://github.com/${fullName}`,
    submittedAt: new Date().toISOString(),
    note: typeof body.note === 'string' ? body.note.slice(0, 500) : '',
    validated,
    repo,
  }
  submissions.push(submission)
  await kv.put(SUBMISSIONS_KEY, JSON.stringify(submissions))
  await kv.put(rateKey, String(current + 1), { expirationTtl: 86_400 }).catch(() => undefined)

  return json({
    ok: true,
    submission: { id: submission.id, fullName: submission.fullName, submittedAt: submission.submittedAt },
  }, 201)
}
