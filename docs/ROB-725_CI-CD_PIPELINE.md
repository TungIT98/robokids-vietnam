# ROB-725: Setup GitHub Actions CI/CD for Cloudflare Pages deployment with env vars

**Priority:** high
**Owner:** Platform Engineer
**Status:** todo

## Vấn đề hiện tại
- Cloudflare Pages không cho phép set env vars qua wrangler CLI
- Env vars chỉ set được qua Dashboard (cần quyền truy cập)
- Mỗi lần rebuild phải làm thủ công

## Giải pháp
Tạo GitHub Actions workflow để:
1. Build frontend với env vars đúng từ `.env.production`
2. Deploy lên Cloudflare Pages production

## File cần tạo
- `.github/workflows/cloudflare-pages.yml`

## File cần kiểm tra
- `platform/client/.env.production` (đã có đúng giá trị)
- `platform/client/wrangler.toml` (đã có `[env.production.vars]`)
