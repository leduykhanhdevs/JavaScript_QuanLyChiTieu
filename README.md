# Ví Mình — Hệ Thống Quản Lý Chi Tiêu Cá Nhân Thông Minh
> **Đồ án cuối khóa môn Lập trình JavaScript**  
> **Giải pháp quản lý tài chính cá nhân toàn diện, minh bạch, bảo mật và thông minh.**

---

## 1. Giới thiệu đề tài

### 1.1. Bối cảnh và Tính cấp thiết
Trong xã hội hiện đại, việc quản lý tài chính cá nhân ngày càng trở nên quan trọng đối với sinh viên, người đi làm và các gia đình trẻ. Thiếu kiểm soát trong thu chi hàng ngày, không có kế hoạch ngân sách cụ thể và thiếu công cụ theo dõi trực quan thường dẫn đến tình trạng "cháy túi" vào cuối tháng, không thể hoàn thành các mục tiêu tiết kiệm dài hạn hoặc rơi vào khủng hoảng tài chính bất ngờ.

Đa số các ứng dụng quản lý chi tiêu hiện nay trên thị trường thường gặp phải các nhược điểm:
- Quá phức tạp, nhiều quảng cáo gây phiền toái.
- Tiềm ẩn rủi ro lộ lọt dữ liệu tài chính cá nhân khi lưu trữ trên dịch vụ đám mây của bên thứ ba không rõ ràng.
- Thiếu các cảnh báo thông minh, trực quan và khả năng hỗ trợ quét tự động từ hóa đơn sinh hoạt thực tế.

### 1.2. Mục tiêu của Đề tài
**Ví Mình** được xây dựng như một nền tảng Web Application quản lý tài chính cá nhân chuẩn mực, thân thiện, bảo mật cao và dễ sử dụng. Hệ thống hỗ trợ người dùng:
1. **Quản lý đa ví / tài khoản linh hoạt:** Tiền mặt, tài khoản ngân hàng, ví điện tử và ví tiết kiệm mục tiêu.
2. **Ghi nhận thu chi nhanh chóng & chính xác:** Hỗ trợ phân loại danh mục, ngày thực hiện, ghi chú, và ngăn chặn tuyệt đối tình trạng số dư âm bất hợp lý.
3. **Chuyển tiền nội bộ (Transfers):** Di chuyển tiền giữa các tài khoản nguyên tử (Atomic Transaction), tự động cân bằng số dư mà không làm sai lệch báo cáo doanh thu hay chi phí.
4. **Lập ngân sách chi tiêu hàng tháng (Budgets):** Đặt hạn mức chi cho từng danh mục, tự động cảnh báo trực quan khi vượt 80% hoặc chạm ngưỡng 100%.
5. **Giao dịch định kỳ tự động (Recurring Rules):** Thiết lập các khoản cố định (tiền nhà, tiền điện, lương...) lặp lại theo ngày/tuần/tháng/năm với cơ chế chống trùng lặp (Idempotent).
6. **Mục tiêu tiết kiệm (Savings Goals):** Đặt kế hoạch tài chính cho tương lai, theo dõi tiến độ hoàn thành trực quan và cơ chế nạp/rút tiền bảo toàn thống kê.
7. **Thống kê & Biểu đồ trực quan:** Render biểu đồ Cột, Tròn (Donut), Đường xu hướng hoàn toàn bằng SVG thuần mà không phụ thuộc bất kỳ thư viện bên ngoài nào.
8. **Quét hóa đơn bằng OCR tại trình duyệt (Receipt Scanner):** Sử dụng Tesseract.js WebAssembly xử lý hình ảnh trực tiếp trên máy người dùng, trích xuất số tiền, ngày tháng, gợi ý danh mục và tự động điền form giao dịch mà không gửi ảnh lên máy chủ (Privacy First).
9. **Cảnh báo thông minh & AI Coach:** Tự động phát hiện giao dịch nghi vấn nhập trùng, cảnh báo chi tiêu đột biến, dự báo dòng tiền 90 ngày và trợ lý giải đáp câu hỏi tài chính cá nhân.
10. **Quản trị hệ thống (Admin Portal):** Phân quyền vai trò (RBAC), theo dõi tổng quan sức khỏe hệ thống, khóa/mở khóa tài khoản người dùng và nhật ký kiểm toán (Audit Logs) minh bạch.
11. **Tiền tệ VND/USD:** Đổi đơn vị nhập/hiển thị, theo dõi tỷ giá tham khảo USD/VND theo ngày; sổ giao dịch luôn lưu VND.

---

## 2. Điểm nổi bật & Tuân thủ Chuẩn môn học

Dự án được xây dựng bám sát 100% các tiêu chí khắt khe của Đề tài cuối khóa môn JavaScript:

| Tiêu chuẩn môn học | Triển khai thực tế trong Dự án |
| :--- | :--- |
| **Không dùng Framework / Thư viện UI** | Giao diện viết 100% bằng **HTML5, CSS3 và Vanilla JavaScript ES6+**. Không sử dụng React, Vue, Angular, jQuery, Bootstrap JS hay Tailwind runtime. |
| **Biểu đồ tự dựng (No Chart Lib)** | Tự tính toán toán học và dựng biểu đồ SVG động (Donut Chart, Bar Chart, Line Chart) bằng JavaScript DOM API. |
| **Xử lý Mảng & Đối tượng (Array/Object)** | Khai thác triệt để các phương thức hiện đại: `map()`, `filter()`, `reduce()`, `find()`, `findIndex()`, `some()`, `every()`, `sort()`, `Object.entries()`, `Object.values()`. |
| **Cơ chế LocalStorage & State Management** | Quản lý trạng thái bằng kiến trúc Store phản ứng (Reactive Store). Cache LocalStorage được phân chia theo namespace từng người dùng (`vi-minh:v1:user:<uuid>`), phục hồi tức thì khi F5 hoặc mở lại trình duyệt, tuân thủ nguyên tắc không lưu mật khẩu/token nhạy cảm. |
| **Kiến trúc Module ES Modules** | Chia tách mã nguồn rõ ràng theo trách nhiệm: `api/`, `components/`, `features/`, `state/`, `utils/`, mã nguồn trong sáng, dễ thuyết trình và chỉnh sửa trực tiếp khi bảo vệ đồ án. |
| **Backend & Cơ sở dữ liệu chuẩn** | Backend dùng **Node.js Native HTTP Server** (không Express); khi deploy, Cloudflare Worker bọc cùng HTTP server bằng adapter tương thích Node. PostgreSQL là nguồn dữ liệu chuẩn, dự kiến host trên Neon và kết nối qua Hyperdrive; local vẫn chạy bằng Node.js. |

---

## 3. Kiến trúc Công nghệ (Tech Stack)

### 3.1. Frontend
- **Ngôn ngữ:** Pure JavaScript (ECMAScript 2022+ / ES Modules).
- **Cấu trúc & Giao diện:** HTML5 ngữ nghĩa, CSS3 hiện đại (CSS Variables, Flexbox, CSS Grid).
- **Thiết kế & Bảng màu:** Bám sát Design System Royal Blue (`#2563EB`, `#1E3A8A`, `#EFF6FF`, `#DC2626`).
- **Xử lý OCR Client-side:** Tesseract.js v7.0.0 (WebAssembly & Web Worker cục bộ), tập dữ liệu tiếng Việt `vie.traineddata.gz` offline.
- **Biểu đồ & Đồ họa:** Native SVG generation engine.

### 3.2. Backend
- **Server local:** Node.js v20+ với module chuẩn `node:http`, `node:fs`, `node:crypto`.
- **Server cloud:** Cloudflare Workers với `nodejs_compat` và `cloudflare:node` HTTP adapter; Worker chỉ nhận API, Cloudflare Pages phục vụ frontend.
- **Cơ sở dữ liệu:** PostgreSQL qua driver `pg`; Neon là database cloud, Hyperdrive là lớp kết nối/pooling. Migration chạy bằng Node.js trực tiếp tới Neon.
- **Bảo mật & Phiên:** HttpOnly, SameSite=Lax/Strict Session Cookie; SHA-256 Hashing cho phiên và mã xác thực; AES-256-GCM cho dữ liệu nhạy cảm.
- **Gửi Email SMTP:** Nodemailer (Gửi mã OTP 6 số xác minh tài khoản và đặt lại mật khẩu).
- **Xuất dữ liệu báo cáo:** ExcelJS (báo cáo .xlsx nhiều sheet kèm thống kê) và PDFKit (báo cáo .pdf bảng biểu tự phân trang).

---

## 4. Cấu trúc Thư mục Dự án

```
JavaScript_QuanLyChiTieu/
├── .env.example                      # Cấu hình biến môi trường mẫu
├── .dev.vars.example                 # Biến mẫu cho Wrangler local
├── wrangler.toml                     # Cloudflare Worker, Hyperdrive và Cron
├── AGENTS.md                         # Quy tắc và hướng dẫn kỹ thuật đồ án
├── API_DOCUMENT.md                   # Tài liệu đặc tả toàn bộ RESTful API
├── database.md                       # Tài liệu thiết kế CSDL PostgreSQL chi tiết
├── package.json                      # Thông tin dự án và dependencies
├── README.md                         # Tài liệu giới thiệu tổng quan đề tài
├── solfware_architecture_design.md   # Thiết kế kiến trúc phần mềm
├── workflow.md                       # Sơ đồ và mô tả luồng nghiệp vụ các chức năng
│
├── docs/                             # Tài liệu phân tích nghiệp vụ & kế hoạch
│   ├── ADMIN_DASHBOARD_PLAN.md       # Kế hoạch và phạm vi trang Quản trị Admin
│   ├── AI_AGENT_PLAN.md              # Kế hoạch trợ lý AI Coach và Admin Agent
│   ├── ASSIGNMENT_REQUIREMENTS.md    # Bóc tách yêu cầu đề tài môn học
│   ├── BANK_INTEGRATION_PLAN.md      # Kế hoạch tích hợp ngân hàng (P2)
│   ├── DATABASE_DESIGN.md            # Thiết kế cơ sở dữ liệu ban đầu
│   ├── DEPLOYMENT_CLOUDFLARE_NEON.md # Hướng dẫn Cloudflare Pages/Workers + Neon
│   ├── LEGAL_CONSENT.md              # Quy chuẩn Điều khoản & Quyền riêng tư
│   └── SMART_FINANCE_PLAN.md         # Đặc tả chức năng Tài chính thông minh & OCR
│
├── public/                           # Frontend Single Page Application (SPA)
│   ├── index.html                    # Trang giao diện chính của ứng dụng
│   ├── legal.html                    # Trang Điều khoản & Chính sách quyền riêng tư
│   ├── assets/                       # Hình ảnh thương hiệu, icon, font BeVietnamPro
│   ├── css/                          # Hệ thống Stylesheet CSS thuần
│   │   ├── admin.css                 # Giao diện khu vực Quản trị Admin
│   │   ├── ai-agent.css              # Giao diện hộp thoại AI Coach & Agent
│   │   ├── app.css                   # Giao diện ứng dụng chính
│   │   ├── responsive.css            # Tối ưu hóa hiển thị Mobile/Tablet
│   │   ├── smart-finance.css         # Giao diện Dự báo & Quét hóa đơn OCR
│   │   └── tokens.css                # CSS Variables (Màu sắc, Typography, Spacing)
│   ├── js/                           # Mã nguồn JavaScript thuần (ES Modules)
│   │   ├── app.js                    # Entry point khởi tạo ứng dụng Frontend
│   │   ├── api/                      # Giao tiếp HTTP với Backend (client.js, admin-client.js)
│   │   ├── components/               # UI Components thuần (charts.js, toast.js, icons.js)
│   │   ├── features/                 # Các màn hình nghiệp vụ (pages.js, forms.js, ai-agent.js,...)
│   │   ├── state/                    # Quản lý trạng thái (store.js, cache.js)
│   │   └── utils/                    # Các hàm tiện ích (dates.js, money.js, smart-finance.js,...)
│   └── vendor/                       # Thư viện Tesseract.js & dữ liệu ngôn ngữ tiếng Việt offline
│
├── worker/                           # Entry point và tài sản Worker
│   ├── index.js                      # Adapter Cloudflare cho HTTP server hiện có
│   └── report-assets.js              # Font và logo được đóng gói cho Worker
│
└── server/                           # Nghiệp vụ và API dùng chung cho Node/Worker
    ├── app.js                        # HTTP handler, routing, rate limit và security headers
    ├── local.js                      # Khởi chạy server local, timer và graceful shutdown
    ├── jobs.js                       # Tác vụ bảo trì dùng chung cho local/Cron
    ├── config/                       # Cấu hình môi trường (env.js, legal.js)
    ├── db/                           # Database Pool, Seed, Scripts
    │   ├── pool.js                   # Kết nối PostgreSQL Client Pool
    │   ├── migrate.js                # Bộ thực thi Database Migrations tự động
    │   ├── promote-admin.js          # CLI phân quyền Admin cho tài khoản
    │   └── migrations/               # Các tệp SQL Migration (001 -> 011)
    ├── lib/                          # Tiện ích máy chủ (http.js, security.js, errors.js, validation.js, mail.js)
    ├── routes/                       # Định tuyến API (auth, finance, admin, bank-hub)
    └── services/                     # Tầng nghiệp vụ xử lý logic (auth, finance, admin, export)
```

### Tài liệu triển khai Cloudflare + Neon

Hướng dẫn tạo Neon database, Hyperdrive, đặt secrets và cấu hình Pages nằm trong [`docs/DEPLOYMENT_CLOUDFLARE_NEON.md`](docs/DEPLOYMENT_CLOUDFLARE_NEON.md). Workers Free có giới hạn CPU có thể ảnh hưởng đến đăng nhập và kết xuất Excel/PDF; bundle thành công không chứng minh các luồng đó chạy trong giới hạn production.

---

## 5. Hướng dẫn Cài đặt & Chạy Ứng dụng

### 5.1. Yêu cầu Tiền đề (Prerequisites)
- **Node.js**: Phiên bản `>= 20.0.0`
- **PostgreSQL**: Phiên bản 15 trở lên (Khuyến nghị PostgreSQL 16 hoặc 18)
- **Công cụ quản lý DB**: pgAdmin 4 hoặc DBeaver / psql CLI

### 5.2. Các bước Cài đặt chi tiết

#### Bước 1: Chuẩn bị mã nguồn
Mở terminal tại thư mục dự án:
```powershell
cd "D:\Mon hoc ITC\JavaScript\DoAnCuoiKy\JavaScript_QuanLyChiTieu"
npm install
```

#### Bước 2: Thiết lập Cơ sở dữ liệu PostgreSQL
Mở pgAdmin hoặc `psql` và tạo database mới:
```sql
CREATE DATABASE quan_ly_chi_tieu_dev;
```

#### Bước 3: Cấu hình Biến môi trường (.env)
Tạo file `.env` từ file mẫu `.env.example`:
```powershell
Copy-Item .env.example .env
```
Mở file `.env` và cập nhật thông tin kết nối Database cùng tài khoản SMTP gửi mail:
```env
PORT=3000
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=quan_ly_chi_tieu_dev
DATABASE_USER=postgres
DATABASE_PASSWORD=your_postgres_password

# Cấu hình SMTP gửi mã OTP (Gmail App Password hoặc Ethereal Mail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_gmail_app_password
SMTP_FROM_NAME=Ví Mình
SMTP_FROM_EMAIL=no-reply@example.com
CURRENCYAPI_API_KEY=your_private_api_key
```

`CURRENCYAPI_API_KEY` bật lựa chọn USD và theo dõi USD/VND. Gói Free có 300 lượt gọi mỗi tháng và cập nhật tỷ giá theo ngày, nên đây là số liệu tham khảo chứ không phải realtime. VND vẫn là đơn vị lưu trong sổ cái. Chỉ đặt key thật trong `.env`; không đưa vào `.env.example`, mã frontend hoặc GitHub. Xem [CurrencyAPI latest endpoint](https://currencyapi.com/docs/latest/) và [pricing](https://currencyapi.com/pricing/) để biết giới hạn hiện hành.

#### Bước 4: Chạy Migration khởi tạo CSDL
Áp dụng toàn bộ cấu trúc bảng, ràng buộc và dữ liệu khởi tạo mặc định:
```powershell
npm run db:migrate
```

#### Bước 5: Khởi động Ứng dụng
Chạy ở chế độ phát triển (auto-reload khi sửa code server):
```powershell
npm run dev
```
Hoặc chế độ tiêu chuẩn:
```powershell
npm start
```

Mở trình duyệt web và truy cập địa chỉ: [http://localhost:3000](http://localhost:3000)

---

## 6. Hướng dẫn Kịch bản Demo & Thuyết trình Bảo vệ

Để kiểm chứng toàn bộ các tiêu chí chấm điểm của Đồ án, sinh viên thực hiện theo kịch bản:

### Kịch bản 1: Đăng ký & Xác thực Bảo mật
1. Nhấp **Đăng ký**, nhập Họ tên, Email hợp lệ và Mật khẩu (tối thiểu 8 ký tự, có chữ và số).
2. Tích chọn đồng ý **Điều khoản sử dụng** và **Thông báo quyền riêng tư**.
3. Hệ thống gửi mã OTP 6 số qua email. Nhập mã OTP để kích hoạt tài khoản.
4. Sau khi kích hoạt, hệ thống tự động sinh ví mặc định ("Tiền mặt") và bộ danh mục chuẩn (Ăn uống, Mua sắm, Di chuyển, Lương, Thưởng,...).

### Kịch bản 2: Nghiệp vụ Quản lý Thu/Chi & Chuyển tiền
1. Thêm giao dịch Thu: Tiền lương (nhập số tiền, chọn ngày, danh mục "Lương").
2. Thêm giao dịch Chi: Ăn uống (kiểm tra validation: số tiền phải là số dương, chọn ví, chọn danh mục chi).
3. Kiểm tra tính năng **Chuyển tiền**: Tạo thêm ví "Tài khoản Ngân hàng" -> Chuyển 500,000 VND từ "Ngân hàng" sang "Tiền mặt". Kiểm tra số dư 2 ví được cập nhật chính xác, báo cáo Thu/Chi không bị sai lệch.
4. Thử nhập giao dịch chi vượt quá số dư hiện tại của ví -> Hệ thống thông báo từ chối số dư âm.

### Kịch bản 3: Ngân sách & Giao dịch định kỳ
1. Thiết lập Ngân sách cho danh mục "Ăn uống" trong tháng: 3,000,000 VND.
2. Nhập các khoản chi ăn uống để vượt quá 80% hạn mức -> Kiểm tra trạng thái cảnh báo màu cam/đỏ trên Dashboard.
3. Thiết lập một Giao dịch định kỳ (ví dụ: Tiền thuê nhà lặp lại ngày 01 hàng tháng) -> Bấm chạy kiểm tra tự động tạo giao dịch đúng ngày.

### Kịch bản 4: Quét Hóa đơn OCR tại Trình duyệt
1. Chuyển sang tính năng **Quét hóa đơn**.
2. Tải lên một hình ảnh hóa đơn ăn uống/mua sắm.
3. Trình duyệt tự tải worker Tesseract.js WASM và bộ dữ liệu tiếng Việt cục bộ (không gửi ảnh lên server).
4. Hệ thống tự nhận dạng tổng tiền, ngày hóa đơn và gợi ý danh mục "Ăn uống" -> Người dùng nhấn xác nhận để lưu giao dịch vào DB.

### Kịch bản 5: Trợ lý Tài chính AI Coach & Dự báo
1. Mở cửa sổ chat AI Coach.
2. Đặt các câu hỏi: *"Tổng chi tiêu tháng này của tôi là bao nhiêu?"*, *"Kiểm tra giao dịch trùng"*, *"Dự báo dòng tiền sắp tới"*.
3. Trợ lý tính toán trực tiếp trên snapshot tài chính, phản hồi số liệu chính xác kèm nút điều hướng (CTA) tương ứng.

### Kịch bản 6: Quản trị Hệ thống (Admin Portal)
1. Dùng terminal cấp quyền Admin cho tài khoản:
   ```powershell
   npm run db:promote-admin -- email-cua-ban@example.com
   ```
2. Đăng nhập lại trên website -> Truy cập mục **Quản trị Admin**.
3. Xem thống kê người dùng, tình trạng hệ thống, danh sách tài khoản, thực hiện thao tác khóa/mở khóa người dùng và đối chiếu với **Nhật ký kiểm toán (Audit Logs)**.

### Kịch bản 7: Kiểm tra LocalStorage & Khôi phục Ngoại tuyến
1. Mở DevTools (`F12`) -> Tab Application -> Local Storage.
2. Quan sát khóa cache `vi-minh:v1:user:<uuid>`.
3. Tải lại trang (`F5`) -> Dữ liệu hiển thị tức thì không bị nhấp nháy (Flicker-free).
4. Đăng xuất -> Kiểm tra cache dữ liệu tài chính của tài khoản được dọn dẹp sạch sẽ.

---

## 7. Tài liệu Kỹ thuật Đi kèm

Dự án cung cấp bộ tài liệu hoàn chỉnh hỗ trợ hội đồng chấm thi và sinh viên bảo vệ đồ án:
- [workflow.md](workflow.md): Sơ đồ luồng (Flowchart & Sequence Diagram) chi tiết cho từng chức năng.
- [database.md](database.md): Thiết kế CSDL quan hệ PostgreSQL, ERD Diagram, ràng buộc và từ điển dữ liệu.
- [API_DOCUMENT.md](API_DOCUMENT.md): Đặc tả chi tiết toàn bộ các Endpoint RESTful API, Request/Response mẫu.
- [solfware_architecture_design.md](solfware_architecture_design.md): Bản vẽ kiến trúc phần mềm, phân tầng hệ thống và mô hình bảo mật.

---

## 8. Tác giả & Giấy phép

- **Môn học:** Lập trình JavaScript — Đồ án Cuối khóa
- **Sản phẩm:** Website Quản lý chi tiêu cá nhân "Ví Mình"
- **Bản quyền:** Dự án phục vụ mục đích học tập và bảo vệ đồ án môn học. Các bên thứ ba sử dụng cần tuân thủ giấy phép mã nguồn mở (MIT / Apache-2.0 đối với các module phụ trợ).
