/**
 * 社区发布 · 列表接口（Cloudflare Pages Function）
 *
 * GET /api/community/submissions
 * 返回全部社群发布提交，供 scripts/sync-community.ts 拉取后合并进静态数据。
 * 依赖 KV 绑定 COMMUNITY_KV。
 */

interface CommunityKV {
  get(key: string, type?: 'json'): Promise<unknown>
}

interface Env {
  COMMUNITY_KV?: CommunityKV
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

export const onRequestGet = async (context: { env: Env }): Promise<Response> => {
  const kv = context.env.COMMUNITY_KV
  if (!kv) {
    return json({ ok: false, error: '存储未配置。' }, 501)
  }
  const list = (await kv.get('community:submissions', 'json').catch(() => null)) as unknown
  return json({
    ok: true,
    submissions: Array.isArray(list) ? list : [],
  })
}
