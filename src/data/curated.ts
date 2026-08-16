/**
 * 站长精选：站长为每个分类按 Star 精选的前 3 个插件，附推荐理由。
 *
 * - 分类采用社区精选清单（awesome-dsh-plugin）的口径（UI 增强 / 主题与外观 / …），
 *   与站内自动分类（src/lib/classification.ts）相互独立；
 * - fullName 必须与 catalog.json 中的条目一致；同步脚本会把本清单中的仓库
 *   作为白名单补充收录（不受“仅公测后创建”过滤），保证目录内可查；
 * - Star 数不在此硬编码，页面渲染时实时取 catalog.json 的最新值。
 */
export interface CuratedPick {
  /** 社区分类标签，如 “🎨 UI 增强” */
  category: string
  /** 分类内排名 1-3 */
  rank: number
  /** 仓库全名，须与 catalog.json 的 fullName 一致 */
  fullName: string
  /** 站长推荐理由 */
  reason: string
}

export const CURATED_PICKS: CuratedPick[] = [
  // 🎨 UI 增强
  {
    category: '🎨 UI 增强',
    rank: 1,
    fullName: 'zhu1090093659/dsh-web-ui',
    reason: 'UI 全家桶：任务看板、Git 图、右侧面板、桌宠、实时 token 统计与皮肤中心一站集齐，Star 断层第一。',
  },
  {
    category: '🎨 UI 增强',
    rank: 2,
    fullName: 'ccch1mneyyy/dsh-TUI',
    reason: 'Claude Code 风格全屏终端 UI：像素鲸鱼顶栏、实时工作状态行、思考流式展开，终端党首选。',
  },
  {
    category: '🎨 UI 增强',
    rank: 3,
    fullName: 'omdsh-dev/DSH-better-sidebar',
    reason: '侧边栏升级成完整工作台：文件编辑、终端、Git 与子代理全内置，且开放三方插件注册新 Tab。',
  },
  // 🎭 主题与外观
  {
    category: '🎭 主题与外观',
    rank: 1,
    fullName: 'Small-tailqwq/dsh-deep-whale',
    reason: '鲸鱼娘皮肤系列（深海女仆工坊），主题类人气最高。',
  },
  {
    category: '🎭 主题与外观',
    rank: 2,
    fullName: 'KinGao294/dsh-skin',
    reason: 'Codex 风格皮肤切换器 + 自定义壁纸层，透明度与模糊可调。',
  },
  {
    category: '🎭 主题与外观',
    rank: 3,
    fullName: 'wsxwj123/dsh-plugins',
    reason: '内置 theme-gallery：15 个精选主题家族，浅深配色完整，跟随系统模式。',
  },
  // 💬 会话与消息
  {
    category: '💬 会话与消息',
    rank: 1,
    fullName: 'Anionex/dsh-turn-rewind',
    reason: '基于持久 Change Ledger 回滚会话与工作区状态，对话界的“后悔药”。',
  },
  {
    category: '💬 会话与消息',
    rank: 2,
    fullName: 'Chinesezjc/dsh-interconnect',
    reason: '跨实例互联：经 interconnect 服务在多台 DSH 之间转发消息与事件，多机协作刚需。',
  },
  {
    category: '💬 会话与消息',
    rank: 3,
    fullName: 'Moeblack/dsh-message-edit',
    reason: '分支式消息编辑、reroll、重试与版本时间线，改错消息不再翻车。',
  },
  // 🧠 记忆
  {
    category: '🧠 记忆',
    rank: 1,
    fullName: 'LoserFox/distill',
    reason: '自动对话蒸馏：后台 subagent 反省并自动沉淀/更新技能，记忆随使用进化。',
  },
  {
    category: '🧠 记忆',
    rank: 2,
    fullName: 'omdsh-dev/dsh-mnemon',
    reason: 'Mnemon 深度集成：Runtime Memory / Documents / Memory Spaces 三层本地记忆。',
  },
  {
    category: '🧠 记忆',
    rank: 3,
    fullName: 'modusensus/dsh-mneme',
    reason: 'SQLite + 可人工编辑 Markdown 镜像，后台自动去重合并、冲突裁决，提供 6 个记忆工具。',
  },
  // 🛠️ 工具与能力
  {
    category: '🛠️ 工具与能力',
    rank: 1,
    fullName: 'liustack/modlens',
    reason: '给纯文本模型架视觉桥梁：粘贴图片输出结构化 JSON 证据（OCR/版面/语义）。',
  },
  {
    category: '🛠️ 工具与能力',
    rank: 2,
    fullName: 'Anionex/dsh-vision-toolkit',
    reason: '带意图图片问答、长截图 OCR、UI 还原，让纯文本模型真正能看图干活。',
  },
  {
    category: '🛠️ 工具与能力',
    rank: 3,
    fullName: 'zhaoolee/notes',
    reason: '对话导出锤子便签风格 PNG，或同步到账号工作区写 Markdown 便签，沉淀分享两用。',
  },
  // 🧩 技能包
  {
    category: '🧩 技能包',
    rank: 1,
    fullName: 'creght-dev/skills',
    reason: '本分类唯一插件：Creght 建站技能包，CLI 同步、页面组件、CMS/表单/Auth/SEO 全流程。',
  },
  // 🔁 工作流与自动化
  {
    category: '🔁 工作流与自动化',
    rank: 1,
    fullName: 'NanmiCoder/dsh-agent-teams',
    reason: 'AgentTeams 多智能体团队，工作流类人气最高。',
  },
  {
    category: '🔁 工作流与自动化',
    rank: 2,
    fullName: 'omdsh-dev/dsh_workflow',
    reason: 'UltraCode 式多 Agent 调度：可生成、可保存、可治理、可观察、可恢复的 Workflow 层（原 icetomoyo 仓库，已迁移至 omdsh-dev）。',
  },
  {
    category: '🔁 工作流与自动化',
    rank: 3,
    fullName: 'btspoony/mstar-harness',
    reason: '技能驱动的 harness/loop 工程化工作流插件。',
  },
  // 🔔 通知与集成
  {
    category: '🔔 通知与集成',
    rank: 1,
    fullName: 'omdsh-dev/dsh-open-in-vscode',
    reason: '从 Web 一键在 VS Code 打开工作区目录，日常开发最高频刚需。',
  },
  {
    category: '🔔 通知与集成',
    rank: 2,
    fullName: 'omdsh-dev/dsh-notification',
    reason: '回合完成桌面通知，按结果分控 + 关键词过滤，跑长任务不用盯屏。',
  },
  {
    category: '🔔 通知与集成',
    rank: 3,
    fullName: 'bobleer/dsh-acp-for-bitfun',
    reason: 'BitFun 与 DSH 的 ACP 交互对接。',
  },
  // 🔌 模型与账号接入
  {
    category: '🔌 模型与账号接入',
    rank: 1,
    fullName: 'omdsh-dev/Qwen-MM-Plugins',
    reason: 'Qwen 多模态插件支持，补齐官方生态的视觉能力。',
  },
  {
    category: '🔌 模型与账号接入',
    rank: 2,
    fullName: 'dylan121322/llm-adaptive',
    reason: '请求级复杂度分类的自适应模型路由，按配置链自动选择后端 provider。',
  },
  {
    category: '🔌 模型与账号接入',
    rank: 3,
    fullName: 'omdsh-dev/dsh-llm-fallbacks',
    reason: '角色级模型重试与备用策略，稳定性兜底（原 btspoony 仓库，已迁移至 omdsh-dev）。',
  },
  // 🧑‍💻 开发与运行时
  {
    category: '🧑‍💻 开发与运行时',
    rank: 1,
    fullName: 'hust-open-atom-club/oh-dsh',
    reason: '社区发行版：TUI、桌面端与 Web UI 统一体验，分层安装一步到位。',
  },
  {
    category: '🧑‍💻 开发与运行时',
    rank: 2,
    fullName: 'Jayden-X-L/forkprobe',
    reason: '同一任务并行试跑多个技能、对比结果择优，选 prompt/技能的最优解。',
  },
  {
    category: '🧑‍💻 开发与运行时',
    rank: 3,
    fullName: 'vlln/plugin-registry',
    reason: '插件生态基建：浏览器面板管理官方插件（0 patch）+ make-dsh-plugin 开发引导。',
  },
  // 🎮 娱乐
  {
    category: '🎮 娱乐',
    rank: 1,
    fullName: 'Nagi-ovo/dsh-ads',
    reason: '2005 中文站点风格整活广告（侧栏/信息流/弹窗 + 假关闭叉），社区最受欢迎整活。',
  },
  {
    category: '🎮 娱乐',
    rank: 2,
    fullName: 'vlln/whale-girl',
    reason: 'QQ 宠物形态桌宠：右下角悬浮、可拖拽/投喂/玩耍。',
  },
  {
    category: '🎮 娱乐',
    rank: 3,
    fullName: 'lhh010/dsh-minigames',
    reason: '右侧小游戏面板：18 款离线小游戏，等模型回复时的摸鱼神器。',
  },
]

export interface CuratedGroup {
  category: string
  picks: CuratedPick[]
}

/** 按社区分类分组，保持 CURATED_PICKS 中的书写顺序 */
export function getCuratedGroups(): CuratedGroup[] {
  const groups = new Map<string, CuratedPick[]>()
  for (const pick of CURATED_PICKS) {
    const list = groups.get(pick.category) ?? []
    list.push(pick)
    groups.set(pick.category, list)
  }
  return [...groups.entries()].map(([category, picks]) => ({ category, picks }))
}
