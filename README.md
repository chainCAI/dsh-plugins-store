# DeepSeek Harness插件市场

<p align="center">
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-165DFF" alt="License" />
  </a>
  <a href="https://astro.build/">
    <img src="https://img.shields.io/badge/Astro-built-BC52EE?logo=astro&logoColor=white" alt="Astro" />
  </a>
</p>

自动收录并整理 GitHub `dsh-plugin` Topic 项目，按使用场景分类，提供搜索、筛选与**本地收藏**。纯静态站点，可部署到 Cloudflare Pages。

## 功能

- **自动收录**：构建时通过 GitHub Search API 拉取全部 `dsh-plugin` Topic 仓库（仅公测后创建的），无人工收录门槛
- **收录统计**：首页实时展示已收录插件数、数据更新时间（含年份）、精选数与分类数
- **最新排序**：默认按 Star 从多到少展示；也支持按最新创建（卡片显示相对创建时间，如“5 分钟前创建”）/ 最近更新 / 名称排序
- **官方标签**：只有 DeepSeek Harness 本体（`deepseek-ai/deepseek-harness`）打「官方」标签
- **分类引擎**：基于仓库 Topics 的加权规则分类（项目类型 + 功能分类），按使用场景筛选
- **精选机制**：Star 数 ≥ 100 即标记为"精选"（蓝色徽章），规则简单透明
- **社群精选**：社区推荐的头部项目与官方项目并附推荐理由（编辑内容维护于 `src/data/curated.ts`）；首页筛选 tab 与独立页面均可进入，Star 实时取自目录
- **社区发布**：首页「社区发布」按钮打开玻璃拟态弹窗，用户填写 GitHub 链接后自动抓取仓库信息（名称、描述、Star、语言、Topics 等），配合简单验证码与每日限流防滥用；提交数据单独归类为「社群发布」类型，与 GitHub Topic 自动收录完全分开，审核通过后随同步合并进目录
- **状态徽章**：精选 / 已归档，颜色语义克制明确（社群发布条目另有绿色「社群发布」徽章）
- **搜索筛选**：支持名称、作者、描述、标签搜索；按类型（含「社群发布」）、分类筛选；按创建时间 / Star / 更新时间 / 名称排序
- **本地收藏**：点击书签收藏插件，首页可筛选"我的收藏"，数据保存在浏览器 localStorage
- **标签跳转**：卡片标签可点击，跳转到对应标签聚合页
- **自动更新**：GitHub Actions 每天北京时间凌晨 0:00 同步一次，catalog.json / community.json 有变化即提交，push 自动触发 Cloudflare Pages 重建

## 技术栈

- [Astro](https://astro.build/)（SSG 纯静态输出）
- [Lucide](https://lucide.dev/) 线性图标（无 emoji）
- 字节极简设计系统：Arco Design 中性色板 + 品牌蓝，浅色主题

## 本地运行

需要 Node.js 22 或更高版本。

```bash
npm ci
npm run dev
```

默认访问地址：`http://localhost:4321/`。

重新同步目录：

```bash
npm run sync
```

同步脚本支持读取 `GITHUB_TOKEN` 或 `GH_TOKEN`。未提供 Token 时会受到 GitHub API 较低请求限额约束（完整同步可能需要 Token）。

拉取社群发布提交（需要 `COMMUNITY_API_URL`，见下文）：

```bash
npm run sync:community
```

## 部署到 Cloudflare Pages

1. **推送代码到 GitHub 仓库**（Cloudflare Pages 需要从仓库构建）；
2. Cloudflare Dashboard → Workers & Pages → **Create → Pages → Connect to Git**，选择该仓库；
3. 构建配置：

   | 配置项 | 值 |
   | --- | --- |
   | Framework preset | Astro |
   | Build command | `npm ci && npm run sync && npm run build` |
   | Build output directory | `dist` |
   | Environment variable | `GITHUB_TOKEN`（你的 GitHub Token，用于提高 API 限额） |

4. 部署完成后，把 `src/lib/seo.ts` 里的 `SITE_URL` 改成你的正式域名，重新构建一次（canonical / OG 链接使用）。

### 社区发布功能（可选但推荐）

「社区发布」弹窗的提交数据存放在 Cloudflare KV 中，由 Pages Functions（`functions/api/community/*`）读写，需两步配置：

1. **创建 KV 命名空间**：Cloudflare Dashboard → Workers & Pages → KV → Create a namespace，名称随意（如 `dsh-community`）；
2. **绑定到 Pages 项目**：Pages 项目 → Settings → Functions → **KV namespace bindings** → Add binding，变量名必须填 **`COMMUNITY_KV`**，选择刚创建的命名空间；保存后重新部署一次。

之后：

- 用户提交会写入 KV（`POST /api/community/submit`，含简单验证码交互、每日每 IP 5 次限流与 GitHub 仓库存活复核）；
- 在仓库 Settings → **Variables** 中添加 `COMMUNITY_API_URL = https://你的域名`（如 `https://dsh.pages.dev`）；
- `.github/workflows/sync-catalog.yml` 会在每次同步时拉取 KV 中的提交（`npm run sync:community`），转换为「社群发布」条目写入 `src/data/community.json`，提交后触发站点重建，用户提交的插件即出现在「社群发布」类型下。

本地开发 Functions 可参考：

```bash
npx wrangler pages dev dist --kv COMMUNITY_KV
```

### 自动更新（可选但推荐）

仓库内置 `.github/workflows/sync-catalog.yml`：每天北京时间凌晨 0:00 运行一次同步（GitHub Actions cron 为 UTC，故配置为 `0 16 * * *`），`src/data/catalog.json` / `src/data/community.json` 有变化时自动提交并推送，从而触发 Cloudflare Pages 自动重建。启用后无需手动操作。也可在 Actions 页面手动触发（Run workflow）。

> 提示：`sync` 步骤失败不会阻断 workflow（会跳过提交），站点继续使用仓库里已有的 catalog.json。

## 验证与构建

```bash
npm test
npm run build
```

## 数据说明

- 收录仅表示仓库出现在 `dsh-plugin` Topic，不代表项目通过安装、兼容性、安全性或质量验证；站点不会下载、构建或执行第三方仓库代码；
- 分类优先使用仓库公开的 GitHub Topics，并与站内词典和词根规则比对；标签不足时保留为"其他"或"待识别"，不会根据名称强行推断；
- 只收录 DeepSeek Harness 公测（2026-08-13）之后创建的仓库，公测前创建的蹭标签项目不收录；例外是「社群精选」清单（`src/data/curated.ts`）中的仓库，它们经白名单由同步脚本单独补充收录，不受公测时间过滤；
- 社群发布条目（`src/data/community.json`）由用户自行提交，属于独立数据类型（「社群发布」），与 GitHub Topic 自动收录分开统计与展示；已收录的仓库不会重复展示；
- "精选"指 Star 数达到 100 的仓库。

## 许可证

[MIT License](LICENSE)
