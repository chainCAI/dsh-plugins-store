// 部署到 Cloudflare Pages 后，把这里改成你的正式域名（用于 canonical / OG 链接）
export const SITE_URL = 'https://dsh.886365.xyz'

export function getCanonicalUrl(currentUrl: URL): string {
  const pathname = currentUrl.pathname === '/' ? '/' : currentUrl.pathname.replace(/\/+$/, '')
  return new URL(pathname, SITE_URL).toString()
}
