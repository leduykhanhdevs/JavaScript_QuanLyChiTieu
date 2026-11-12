# Triển khai Cloudflare Workers + Neon

## Kiến trúc

- Cloudflare Pages phục vụ frontend thuần trong `public/`.
- Pages Function tại `functions/api/[[path]].js` chuyển tiếp `/api/*` tới API Worker qua HTTPS, thêm secret dùng chung và IP client do Cloudflare cung cấp.
- API Worker dùng `cloudflare:node` để chuyển request vào Node.js HTTP server hiện có. Local Node và Worker gọi chung router/nghiệp vụ trong `server/app.js`.
- Node local gửi email bằng Nodemailer. Cloudflare Worker gửi SMTP qua `cloudflare:sockets`, hỗ trợ implicit TLS hoặc STARTTLS; cấu hình hiện tại dùng cổng 587 với STARTTLS.
- `new_module_registry` được bật cùng `nodejs_compat` vì PDFKit dùng `import.meta.url`; Cloudflare cho phép bật cờ này trước ngày mặc định 2026-11-17. Khi cập nhật compatibility date hoặc Wrangler, cần chạy lại dry-run và smoke check.
- `pg` kết nối PostgreSQL Neon qua binding Hyperdrive `HYPERDRIVE`. Hyperdrive quản lý pool kết nối ở phía Cloudflare.
- Migration chạy từ Node.js trực tiếp tới Neon, không chạy qua Hyperdrive: script đang giữ khóa migration bằng session-level advisory lock, tính năng Hyperdrive không hỗ trợ.
- Hai Cron Trigger chạy dọn Hosted Link hết hạn mỗi 5 phút và cập nhật lịch sử tỷ giá một lần mỗi ngày.

## Chuẩn bị PostgreSQL Neon

1. Tạo project PostgreSQL mới trên Neon Free và database riêng cho Ví Mình.
2. Lấy **direct connection string** từ Neon; không dùng chuỗi có hậu tố `-pooler` cho bước migration.
3. Lưu chuỗi đó vào `.env` local dưới tên `DATABASE_URL` (hoặc đặt biến môi trường PowerShell tạm thời). Không đưa chuỗi, mật khẩu, dump hay dữ liệu tài chính cá nhân vào Git.
4. Chạy migration trên database mới:

   ```powershell
   $env:DATABASE_URL = "postgresql://..."
   npm run db:migrate
   Remove-Item Env:DATABASE_URL
   ```

   Nếu đã lưu trong `.env`, chỉ cần chạy `npm run db:migrate`. Lệnh này chỉ tạo schema trên database được chỉ định; nó **không chuyển dữ liệu từ PostgreSQL local**.

## Tạo Hyperdrive và deploy Worker

1. Cài dependencies bằng `npm ci` rồi đăng nhập Wrangler bằng `npx wrangler login`.
2. Tạo Hyperdrive trỏ tới cùng database Neon:

   ```powershell
   npx wrangler hyperdrive create vi-minh-neon --connection-string="postgresql://..."
   ```

3. Thay ID mẫu toàn số 0 trong `wrangler.toml` bằng Hyperdrive ID vừa tạo. Cập nhật `APP_BASE_URL` trong `[vars]` thành HTTPS origin Pages thực tế, không thêm path.
4. Đặt `EDGE_PROXY_SECRET` cho Worker và nhập **cùng giá trị** làm Pages secret. Tạo chuỗi ngẫu nhiên mạnh trên máy; không gửi hoặc commit nó.
5. Đặt secrets SMTP `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`. `SMTP_PORT=587` và `SMTP_SECURE=false` chọn SMTP STARTTLS; không dùng port 25. `CURRENCYAPI_API_KEY` tùy chọn. Chỉ cấu hình các giá trị `SEPAY_BANKHUB_*` sau khi đã có sandbox credentials hợp lệ.

   Ví dụ nhập từng secret (Wrangler sẽ hỏi giá trị trong terminal):

   ```powershell
   npx wrangler secret put EDGE_PROXY_SECRET
   npx wrangler secret put SMTP_HOST
   npx wrangler secret put SMTP_USER
   npx wrangler secret put SMTP_PASSWORD
   npx wrangler secret put SMTP_FROM_EMAIL
   ```

6. Đóng gói để kiểm tra hoặc deploy thủ công:

   ```powershell
   npm run worker:dry-run
   npm run worker:deploy
   ```

   `wrangler.toml` giữ ID Hyperdrive mẫu cho tới khi người triển khai thay nó; chưa thể deploy API hoạt động trước khi có ID thật và secrets.

## Cloudflare Pages và GitHub Actions

1. Tạo Pages project nối repository, để trống build command và đặt output directory là `public`.
2. Trong Pages → Settings → Functions, thêm `WORKER_API_ORIGIN` là origin HTTPS của Worker, ví dụ `https://vi-minh-api.<subdomain>.workers.dev`.
3. Thêm Pages secret `EDGE_PROXY_SECRET` với cùng giá trị đã đặt cho Worker. Thiết lập trên cả Production và Preview nếu dùng Preview; `APP_BASE_URL` của Worker phải khớp origin đang dùng để kiểm tra.
4. Workflow `.github/workflows/deploy-cloudflare.yml` chỉ deploy Worker khi repository variable `CLOUDFLARE_WORKER_DEPLOY_ENABLED` là `true`. Cấu hình GitHub secrets `CLOUDFLARE_API_TOKEN` và `CLOUDFLARE_ACCOUNT_ID`; token cần quyền deploy Workers trong đúng account.
5. Cloudflare Pages có thể tự deploy frontend khi GitHub Integration được bật. Workflow trên chỉ deploy API Worker.

## Local development

- Website và mini app Electron vẫn dùng `npm start` / `npm run desktop`; hai lệnh khởi chạy `server/local.js` và đọc `.env`.
- Có thể chạy Worker adapter bằng `Copy-Item .dev.vars.example .dev.vars` (nếu chưa có `.dev.vars`), sửa các giá trị local rồi chạy `npm run worker:dev`. Wrangler cần URL DB trực tiếp, không nên commit connection string. Đặt biến PowerShell `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` trước khi chạy; Worker local sẽ kết nối trực tiếp tới URL đó và không dùng Hyperdrive pooling/cache.
- Migration dùng `DATABASE_URL` trực tiếp; không chạy migration production trên `wrangler dev --remote` hoặc database production khi chưa chủ ý.

## Phạm vi Free và giới hạn chưa nghiệm thu

- Cloudflare Workers Free hiện áp dụng giới hạn 100.000 request/ngày và 10 ms CPU/request. Băm mật khẩu bằng scrypt và kết xuất ExcelJS/PDFKit là các luồng có thể vượt 10 ms; không giảm tham số băm hoặc cắt báo cáo để né giới hạn. Cần smoke test trên Cloudflare thật; nếu các luồng này vượt ngưỡng, Worker cần gói CPU cao hơn để dùng ổn định.
- Bộ giới hạn đăng nhập hiện tại là `Map` trong bộ nhớ của từng isolate; đây không phải bộ đếm dùng chung giữa các isolate. Cần bổ sung rate-limit binding hoặc kho dùng chung trước khi mở rộng ra lượng truy cập công khai.
- SMTP đi ra qua TCP/TLS ở port 587; Cloudflare chặn cổng 25. Worker đã gửi OTP thật, relay nhận thư, người dùng nhập mã và API xác minh thành công.
- Theo thông tin Neon công bố ngày 2026-10-02, gói Free có tối đa 100 project, mỗi project 100 CU-hour/tháng và 1 GB lưu trữ; quota có thể đổi, cần xem [thông tin gói Free của Neon](https://neon.com/blog/neon-free-plan-1-gb-per-project) trước khi triển khai.
- Theo [giới hạn Workers hiện hành](https://developers.cloudflare.com/workers/platform/limits/), Free có 100.000 request/ngày và 10 ms CPU mỗi request. Scrypt và xuất Excel/PDF có thể vượt ngưỡng; cần runtime smoke test trên Cloudflare thật.
- `wrangler deploy --dry-run` chỉ kiểm tra bundle, không thay thế việc deploy và xác minh health check, database, OTP, phiên đăng nhập và xuất báo cáo.

## Trạng thái triển khai hiện tại (2026-11-12)

- Neon project `vi-minh` (`icy-flower-28555258`) được tạo trên AWS Singapore (`aws-ap-southeast-1`), PostgreSQL 17, database `vi_minh`. Các migrations `001`–`011` đã áp dụng; đọc lại `schema_migrations` xác nhận đủ 11 phiên bản. Hiện có một tài khoản active, email verified, role Admin và 0 giao dịch; không nhập dữ liệu tài chính local.
- Cloudflare Hyperdrive `vi-minh-neon` (`61a6778821414a298e51f0e1428eaffe`) trỏ tới Neon, giới hạn 5 kết nối gốc và tắt query cache để tránh đọc số dư cũ.
- API Worker `vi-minh-api` đã deploy tại `https://vi-minh-api.khanhdevs19.workers.dev`. `/healthz` trả HTTP 200 và database `connected`.
- Pages project `vi-minh-leduykhanh` đã deploy tại `https://vi-minh-leduykhanh.pages.dev` (deployment hiện tại: `https://b869f08b.vi-minh-leduykhanh.pages.dev`). Trang `/` trả HTTP 200. `/api/auth/me` qua Pages trả 401 khi chưa đăng nhập; gọi trực tiếp Worker trả 403 do thiếu shared proxy secret, xác nhận proxy gate đang hoạt động.
- Worker secrets gồm `EDGE_PROXY_SECRET` được sinh ngẫu nhiên và các trường SMTP lấy từ `.env` local; Pages có secret `EDGE_PROXY_SECRET` và `WORKER_API_ORIGIN`. Wrangler liệt kê tên secret nhưng không đọc lại giá trị. `.env` không bị sửa và không có secret nào được ghi vào Git. Worker resend OTP trả HTTP 200; người dùng nhập mã thành công; Neon xác nhận tài khoản `active`, `role=admin`, `email_verified=true`. Script ghi audit log khi nâng quyền.
- Pages được deploy bằng Direct Upload, chưa gắn Git provider; workflow GitHub Actions vẫn khóa bằng `CLOUDFLARE_WORKER_DEPLOY_ENABLED` và chưa được bật. Chưa cấu hình domain riêng.
- `npm run worker:dry-run` đạt với Hyperdrive ID thật (bundle 3,810.80 KiB; gzip 886.36 KiB). Worker SMTP đã deploy và resend OTP qua Pages nhận HTTP 200; xác minh OTP cùng trạng thái Admin đã được đọc lại từ Neon. Chưa kiểm tra xuất Excel/PDF hoặc Cron trên Worker.

Cloudflare Free hiện giới hạn Workers ở 100.000 request/ngày và 10 ms CPU cho mỗi request/Cron; Hyperdrive có giới hạn 100.000 câu lệnh database/ngày. OTP đã chạy end-to-end một lần; các luồng scrypt khác, xuất Excel/PDF và Cron vẫn cần kiểm tra riêng vì có thể vượt CPU quota. Xem [giới hạn Workers](https://developers.cloudflare.com/workers/platform/limits/) và [giá/giới hạn Hyperdrive](https://developers.cloudflare.com/hyperdrive/platform/pricing/).

## Cập nhật quản lý tài khoản (2026-11-12)

- Worker vi-minh-api deploy phiên bản 7949325f-df71-42d7-9a17-f945051f3efc; secret ACCOUNT_DETAILS_ENCRYPTION_KEY đã được cấu hình. Giá trị khóa nằm trong .env bị ignore và không được commit.
- Pages vi-minh-leduykhanh đã Direct Upload bản giao diện tại https://87eee43a.vi-minh-leduykhanh.pages.dev; URL chính vẫn là https://vi-minh-leduykhanh.pages.dev.
- Neon migrations 013–016 đã được đọc lại. /healthz trả 200 và database=connected; Pages trả 200, còn /api/auth/me trả 401 khi chưa đăng nhập.

- 2026-11-12 UI refinement: Pages Direct Upload 41f8ef3f.vi-minh-leduykhanh.pages.dev; homepage returned HTTP 200 and serves account-safety-v2 assets.