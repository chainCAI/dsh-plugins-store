/**
 * 社群精选：社区投票选出的重点推荐项目 + 官方项目，附推荐理由。
 *
 * - 与站内自动分类（src/lib/classification.ts）相互独立；
 * - fullName 必须与 catalog.json 中的条目一致；同步脚本会把本清单中的仓库
 *   作为白名单补充收录（不受“仅公测后创建”过滤），保证目录内可查；
 * - Star 数不在此硬编码，页面渲染时实时取 catalog.json 的最新值。
 */
export interface CuratedPick {
  /** 社区分类标签，如 “🖥️ 桌面端” */
  category: string
  /** 分类内排名 1-3 */
  rank: number
  /** 仓库全名，须与 catalog.json 的 fullName 一致 */
  fullName: string
  /** 推荐理由 */
  reason: string
}

export const CURATED_PICKS: CuratedPick[] = [
  // 🖥️ 桌面端
  {
    category: '🖥️ 桌面端',
    rank: 1,
    fullName: 'anywhere-labs/deepseek-harness-desktop',
    reason: 'DeepSeek Harness 桌面客户端：原生桌面体验，Star 断层第一。',
  },
  // 🎨 UI 增强
  {
    category: '🎨 UI 增强',
    rank: 1,
    fullName: 'zhu1090093659/dsh-web-ui',
    reason: 'UI 全家桶：任务看板、Git 图、右侧面板、桌宠、实时 token 统计与皮肤中心一站集齐。',
  },
  // 🏆 官方项目
  {
    category: '🏆 官方项目',
    rank: 1,
    fullName: 'deepseek-ai/deepseek-harness',
    reason: 'DeepSeek Harness 官方本体：Agent 开发框架与运行时，一切插件的宿主。',
  },
]

export interface CuratedGroup {
  category: string
  picks: CuratedPick[]
}

/** 按分类分组，保持 CURATED_PICKS 中的书写顺序 */
export function getCuratedGroups(): CuratedGroup[] {
  const groups = new Map<string, CuratedPick[]>()
  for (const pick of CURATED_PICKS) {
    const list = groups.get(pick.category) ?? []
    list.push(pick)
    groups.set(pick.category, list)
  }
  return [...groups.entries()].map(([category, picks]) => ({ category, picks }))
}
