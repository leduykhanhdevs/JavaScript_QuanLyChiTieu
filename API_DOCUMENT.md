# Tài Liệu Đặc Tả API (RESTful API Specification)
## Dự án: Hệ Thống Quản Lý Chi Tiêu Cá Nhân — "Ví Mình"

---

## 1. Quy Chuẩn Kỹ Thuật Chung

### 1.1. Base URL & Giao Thức
- **Base URL:** `http://localhost:3000` (hoặc domain production của ứng dụng).
- **Giao thức:** HTTP/1.1 hoặc HTTP/2 over TLS (HTTPS trên Production).
- **Định dạng dữ liệu mặc định:** `application/json; charset=utf-8`.

### 1.2. Cơ Chế Xác Thực & Quản Lý Phiên (Authentication)
- Hệ thống sử dụng cơ chế xác thực dựa trên **HttpOnly Cookie** mang tên `qlct_session`.
- Thuộc tính Cookie thiết lập:
  ```http
  Set-Cookie: qlct_session=<secure_random_token>; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000
  ```
- Trên môi trường production, cờ `; Secure` tự động được kích hoạt.
- Cookie được trình duyệt tự động đính kèm trong các request cùng nguồn (`credentials: 'same-origin'`).

### 1.3. Cơ Chế Bảo Mật & Rate Limiting
- **Chống CSRF / Kiểm tra Origin:** Mọi request phương thức thay đổi trạng thái (`POST`, `PATCH`, `PUT`, `DELETE`) đều được máy chủ kiểm tra header `Origin` hoặc `Referer` hợp lệ.
- **Rate Limiting (Chống tấn công Brute-force & DoS):**
  - Đăng nhập (`/api/auth/login`): Tối đa 20 lần / 15 phút trên mỗi địa chỉ IP.
  - Đăng ký (`/api/auth/register`): Tối đa 8 lần / 60 phút trên mỗi IP.
  - Gửi mã OTP xác minh (`/api/auth/resend-verification`): Tối đa 5 lần / 15 phút.
  - Xác thực OTP (`/api/auth/verify-email-code`): Tối đa 10 lần / 15 phút (khóa sau 5 lần nhập sai mã).
  - Quên mật khẩu (`/api/auth/forgot-password`): Tối đa 5 lần / 15 phút.

### 1.4. Cấu Trúc Phản Hồi Chuẩn (Standard Response Format)

#### Phản hồi Thành công (2xx)
Dữ liệu JSON trả về trực tiếp theo tài nguyên nghiệp vụ:
```json
{
  "message": "Thao tác thành công",
  "data": { ... }
}
```

#### Phản hồi Lỗi Chuẩn (4xx, 5xx)
Mọi lỗi nghiệp vụ và hệ thống đều tuân thủ cấu trúc đồng nhất:
```json
{
  "error": {
    "status": 400,
    "code": "INVALID_AMOUNT",
    "message": "Số tiền giao dịch phải là số nguyên dương lớn hơn 0.",
    "details": null
  }
}
```

### 1.5. Các Mã Trạng Thái HTTP (Status Codes)
| Mã | Ý Nghĩa | Mô Tả |
| :---: | :--- | :--- |
| `200` | OK | Yêu cầu thành công, trả về dữ liệu. |
| `201` | Created | Bản ghi mới đã được tạo thành công trong CSDL. |
| `400` | Bad Request | Dữ liệu đầu vào sai cú pháp, không hợp lệ hoặc vi phạm quy tắc nghiệp vụ. |
| `401` | Unauthorized | Chưa đăng nhập hoặc phiên làm việc đã hết hạn. |
| `403` | Forbidden | Bị từ chối truy cập (Ví dụ: user thường gọi API admin, hoặc tài khoản bị khóa). |
| `404` | Not Found | Không tìm thấy tài nguyên theo ID yêu cầu. |
| `409` | Conflict | Dữ liệu đã tồn tại (Ví dụ: email trùng, ngân sách tháng trùng). |
| `429` | Too Many Requests | Gửi request quá tần suất cho phép (Rate Limited). |
| `500` | Internal Server Error | Lỗi nội bộ không lường trước từ phía máy chủ. |
| `503` | Service Unavailable | Dịch vụ cơ sở dữ liệu tạm thời không khả dụng. |

---

## 2. Nhóm API Kiểm Tra Hệ Thống (Health Check)

### `GET /healthz`
Kiểm tra trạng thái kết nối máy chủ và cơ sở dữ liệu PostgreSQL.

- **Yêu cầu xác thực:** Không.
- **Response `200 OK`:**
  ```json
  {
    "status": "healthy",
    "database": "connected",
    "timestamp": "2026-11-05T07:15:00.000Z"
  }
  ```
- **Response `503 Service Unavailable`:** Khi mất kết nối PostgreSQL.

---

## 3. Nhóm API Xác Thực & Người Dùng (Authentication & Profile)

### 3.1. `POST /api/auth/register`
Đăng ký tài khoản người dùng mới.

- **Yêu cầu xác thực:** Không.
- **Request Body (JSON):**
  ```json
  {
    "fullName": "Nguyễn Văn A",
    "email": "nguyenvana@example.com",
    "password": "Password123!",
    "consentTerms": true,
    "consentPrivacy": true,
    "consentVersion": "1.0.0"
  }
  ```
- **Validation:**
  - `fullName`: 1 - 120 ký tự.
  - `email`: Định dạng email chuẩn, duy nhất.
  - `password`: Tối thiểu 8 ký tự, gồm ít nhất 1 chữ cái và 1 chữ số.
  - `consentTerms`, `consentPrivacy`: Bắt buộc `true` với phiên bản pháp lý khớp hệ thống.
- **Response `201 Created`:**
  ```json
  {
    "message": "Đăng ký thành công. Mã xác minh 6 chữ số đã được gửi tới email của bạn.",
    "email": "nguyenvana@example.com",
    "status": "pending_email"
  }
  ```

---

### 3.2. `POST /api/auth/verify-email-code`
Xác minh tài khoản bằng mã OTP 6 số nhận qua email.

- **Request Body:**
  ```json
  {
    "email": "nguyenvana@example.com",
    "verificationCode": "482910"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "message": "Xác minh email thành công. Tài khoản của bạn đã được kích hoạt."
  }
  ```

---

### 3.3. `POST /api/auth/resend-verification`
Gửi lại mã OTP kích hoạt tài khoản.

- **Request Body:**
  ```json
  {
    "email": "nguyenvana@example.com"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "message": "Mã xác minh mới đã được gửi tới email của bạn."
  }
  ```

---

### 3.4. `POST /api/auth/login`
Đăng nhập vào hệ thống và thiết lập Session Cookie.

- **Request Body:**
  ```json
  {
    "email": "nguyenvana@example.com",
    "password": "Password123!",
    "consentTerms": true,
    "consentPrivacy": true,
    "consentVersion": "1.0.0"
  }
  ```
- **Response `200 OK` (kèm Set-Cookie `qlct_session`):**
  ```json
  {
    "user": {
      "id": "e895c256-4b92-4161-8ee4-2a6c8e3cf205",
      "email": "nguyenvana@example.com",
      "fullName": "Nguyễn Văn A",
      "role": "user",
      "status": "active",
      "currency": "VND",
      "timezone": "Asia/Ho_Chi_Minh"
    }
  }
  ```

---

### 3.5. `POST /api/auth/logout`
Đăng xuất, hủy phiên trên máy chủ và xóa Cookie trình duyệt.

- **Yêu cầu xác thực:** Có.
- **Response `200 OK` (kèm Set-Cookie xóa `Max-Age=0`):**
  ```json
  {
    "message": "Bạn đã đăng xuất."
  }
  ```

---

### 3.6. `GET /api/auth/me`
Lấy thông tin người dùng hiện tại của phiên đăng nhập.

- **Yêu cầu xác thực:** Có.
- **Response `200 OK`:**
  ```json
  {
    "user": {
      "id": "e895c256-4b92-4161-8ee4-2a6c8e3cf205",
      "email": "nguyenvana@example.com",
      "fullName": "Nguyễn Văn A",
      "role": "user",
      "status": "active"
    }
  }
  ```

---

### 3.7. `POST /api/auth/forgot-password`
Yêu cầu gửi liên kết đặt lại mật khẩu qua email.

- **Request Body:**
  ```json
  {
    "email": "nguyenvana@example.com"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "message": "Nếu email tồn tại trên hệ thống, hướng dẫn khôi phục đã được gửi."
  }
  ```

---

### 3.8. `POST /api/auth/reset-password`
Đặt lại mật khẩu mới thông qua token khôi phục.

- **Request Body:**
  ```json
  {
    "token": "d748f93...base64url",
    "password": "NewPassword456!",
    "passwordConfirmation": "NewPassword456!"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "message": "Mật khẩu của bạn đã được cập nhật thành công."
  }
  ```

---

### 3.9. `PATCH /api/settings/profile`
Cập nhật thông tin hồ sơ người dùng (Tên và Ảnh đại diện).

- **Yêu cầu xác thực:** Có.
- **Request Body:**
  ```json
  {
    "fullName": "Nguyễn Văn B",
    "avatarData": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "user": {
      "id": "e895c256-4b92-4161-8ee4-2a6c8e3cf205",
      "fullName": "Nguyễn Văn B",
      "avatarUpdatedAt": "2026-11-05T07:30:00.000Z"
    }
  }
  ```

---

### 3.10. `GET /api/settings/profile/avatar`
Tải trực tiếp tệp ảnh đại diện của người dùng.

- **Yêu cầu xác thực:** Có.
- **Response `200 OK`:** Trả về file nhị phân `image/jpeg`.

---

### 3.11. `POST /api/settings/profile/email-verification` & `confirm`
Gửi mã OTP đổi email và Xác nhận đổi email mới.

- **Gửi OTP:** `POST /api/settings/profile/email-verification` kèm `{ "email": "new@example.com" }`.
- **Xác nhận:** `POST /api/settings/profile/email-verification/confirm` kèm:
  ```json
  {
    "email": "new@example.com",
    "code": "729104"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "message": "Địa chỉ email của bạn đã được cập nhật thành công."
  }
  ```

---

### 3.12. `PATCH /api/settings/preferences`
Cập nhật tùy chọn đơn vị tiền tệ của tài khoản đang đăng nhập. Tùy chọn chỉ đổi cách nhập/hiển thị; sổ tài chính trong PostgreSQL tiếp tục lưu VND.

- **Yêu cầu xác thực:** Có.
- **Request Body:** `{ "currency": "VND" }` hoặc `{ "currency": "USD" }`.
- **Response `200 OK`:** `{ "user": { "id": "...", "currency": "USD" } }`.
- **Lỗi:** `400 INVALID_CURRENCY` nếu giá trị ngoài `VND`/`USD`; `503 FX_RATE_UNAVAILABLE` hoặc `FX_RATE_STALE` nếu chọn USD nhưng máy chủ chưa có tỷ giá dùng được.

### 3.13. `GET /api/fx/rates?days=30`
Lấy tỷ giá tham khảo USD/VND hai chiều và lịch sử đã được máy chủ ghi nhận. `days` được giới hạn từ 1 đến 365.

- **Yêu cầu xác thực:** Có.
- **Nguồn:** CurrencyAPI `/v3/latest`, API key chỉ nằm trong biến môi trường backend `CURRENCYAPI_API_KEY`.
- **Response `200 OK`:** `provider`, `refreshCadence: "daily"`, `usdVnd`, `vndUsd`, ngày/giờ cập nhật, trạng thái `stale` và mảng `history` gồm `{ date, usdVnd }`.
- **Lỗi `503 FX_RATE_UNAVAILABLE` / `FX_RATE_STALE`:** Chưa cấu hình/chưa có tỷ giá hoặc tỷ giá cũ quá 72 giờ; server từ chối ghi số tiền USD cho tới khi có tỷ giá dùng được.
- Tỷ giá miễn phí cập nhật hằng ngày; đây không phải báo giá thời gian thực. Lịch sử biểu đồ bắt đầu từ khi máy chủ bắt đầu lưu tỷ giá; không giả lập dữ liệu trước đó.

Các API ghi giao dịch, tài khoản, chuyển tiền, ngân sách, giao dịch định kỳ và mục tiêu nhận thêm trường `currency`. Với `USD`, server quy đổi các trường tiền liên quan sang VND theo tỷ giá mới nhất trước khi gọi service nghiệp vụ; dữ liệu trả về và PostgreSQL vẫn là VND. Số USD nhập tối đa hai chữ số thập phân; kết quả được làm tròn đến VND nguyên.

## 4. Nhóm API Khởi Tạo Dữ Liệu & Tổng Quan (Bootstrap & Dashboard)

### `GET /api/bootstrap` hoặc `GET /api/dashboard`
Tải toàn bộ snapshot dữ liệu tài chính của người dùng cho phiên làm việc hiện tại để đồng bộ Cache LocalStorage và dựng giao diện.

- **Yêu cầu xác thực:** Có.
- **Response `200 OK`:**
  ```json
  {
    "user": { ... },
    "accounts": [
      {
        "id": "account-uuid-1",
        "name": "Tiền mặt",
        "kind": "cash",
        "openingBalance": 1000000,
        "currentBalance": 3500000,
        "color": "#10B981",
        "iconKey": "wallet",
        "isArchived": false
      }
    ],
    "categories": [
      {
        "id": "cat-uuid-1",
        "name": "Ăn uống",
        "kind": "expense",
        "color": "#EF4444",
        "iconKey": "utensils",
        "isArchived": false
      }
    ],
    "transactions": [ ... ],
    "transfers": [ ... ],
    "budgets": [ ... ],
    "recurringRules": [ ... ],
    "goals": [ ... ],
    "summary": {
      "totalIncome": 15000000,
      "totalExpense": 8500000,
      "netCashflow": 6500000,
      "totalBalance": 18200000
    }
  }
  ```

---

## 5. Nhóm API Quản Lý Giao Dịch (Transactions)

### 5.1. `GET /api/transactions`
Lấy danh sách giao dịch có hỗ trợ tìm kiếm, lọc và sắp xếp.

- **Query Parameters:**
  - `from` *(date, YYYY-MM-DD)*: Từ ngày.
  - `to` *(date, YYYY-MM-DD)*: Đến ngày.
  - `kind` *(string)*: `'income'` hoặc `'expense'`.
  - `accountId` *(uuid)*: Lọc theo ví.
  - `categoryId` *(uuid)*: Lọc theo danh mục.
  - `search` *(string)*: Tìm kiếm không phân biệt dấu trong ghi chú.
  - `sort` *(string)*: `'date_desc'` (mặc định), `'date_asc'`, `'amount_desc'`, `'amount_asc'`.
  - `limit` *(integer)*: Số bản ghi tối đa (mặc định 500).
- **Response `200 OK`:**
  ```json
  {
    "transactions": [
      {
        "id": "tx-uuid-1",
        "kind": "expense",
        "amount": 45000,
        "accountId": "account-uuid-1",
        "accountName": "Tiền mặt",
        "categoryId": "cat-uuid-1",
        "categoryName": "Ăn uống",
        "transactionDate": "2026-11-05",
        "note": "Ăn trưa cơm sườn",
        "createdAt": "2026-11-05T05:30:00.000Z"
      }
    ]
  }
  ```

---

### 5.2. `POST /api/transactions`
Thêm một giao dịch thu hoặc chi mới.

- **Request Body:**
  ```json
  {
    "kind": "expense",
    "amount": 150000,
    "accountId": "account-uuid-1",
    "categoryId": "cat-uuid-1",
    "transactionDate": "2026-11-05",
    "note": "Mua sách lập trình JavaScript"
  }
  ```
- **Quy tắc kiểm tra:**
  - `amount > 0`.
  - `transactionDate` đúng định dạng `YYYY-MM-DD`.
  - Đối với giao dịch `expense`: Số dư hiện tại của `accountId` phải $\ge$ `amount` (Chống số dư âm).
- **Response `201 Created`:**
  ```json
  {
    "transaction": {
      "id": "tx-uuid-new",
      "kind": "expense",
      "amount": 150000,
      "accountId": "account-uuid-1",
      "categoryId": "cat-uuid-1",
      "transactionDate": "2026-11-05",
      "note": "Mua sách lập trình JavaScript"
    }
  }
  ```

---

### 5.3. `PATCH /api/transactions/:id`
Chỉnh sửa thông tin một giao dịch đã ghi nhận.

- **Request Body:** Tương tự `POST /api/transactions` (các trường muốn sửa đổi).
- **Response `200 OK`:** Bản ghi `transaction` đã cập nhật.

---

### 5.4. `DELETE /api/transactions/:id`
Xóa một giao dịch và tự động hoàn trả số dư ví.

- **Response `200 OK`:**
  ```json
  {
    "message": "Giao dịch đã được xóa thành công."
  }
  ```

---

## 6. Nhóm API Quản Lý Ví & Tài Khoản (Accounts)

### 6.1. `POST /api/accounts`
Tạo một tài khoản ví mới.

- **Request Body:**
  ```json
  {
    "name": "Ví MoMo",
    "kind": "e_wallet",
    "openingBalance": 500000,
    "color": "#D82D8B",
    "iconKey": "smartphone"
  }
  ```
- **Response `201 Created`:** Bản ghi `account` mới.

---

### 6.2. `PATCH /api/accounts/:id`
Sửa thông tin ví (Tên, màu sắc, biểu tượng).

- **Response `200 OK`:** Bản ghi `account` cập nhật.

---

### 6.3. `DELETE /api/accounts/:id`
Xóa ví (Xóa cứng nếu chưa từng có giao dịch, hoặc tự động chuyển `isArchived = true` nếu đã có dữ liệu lịch sử liên kết).

- **Response `200 OK`:**
  ```json
  {
    "message": "Đã lưu trữ tài khoản để bảo toàn lịch sử giao dịch."
  }
  ```

---

## 7. Nhóm API Quản Lý Danh Mục (Categories)

### 7.1. `POST /api/categories`
Tạo danh mục mới.
- **Request Body:**
  ```json
  {
    "name": "Tiền Thưởng",
    "kind": "income",
    "color": "#10B981",
    "iconKey": "gift"
  }
  ```
- **Response `201 Created`:** Bản ghi `category` mới.

---

### 7.2. `PATCH /api/categories/:id` & `DELETE /api/categories/:id`
Sửa và Xóa/Lưu trữ danh mục tương ứng.

---

## 8. Nhóm API Chuyển Tiền Nội Bộ (Transfers)

### `POST /api/transfers`
Chuyển tiền nguyên tử giữa hai tài khoản ví của cùng một người dùng.

- **Request Body:**
  ```json
  {
    "sourceAccountId": "account-uuid-bank",
    "targetAccountId": "account-uuid-cash",
    "amount": 1000000,
    "transferDate": "2026-11-05",
    "note": "Rút tiền ATM về ví tiền mặt"
  }
  ```
- **Validation:**
  - `sourceAccountId <> targetAccountId`.
  - Số dư Ví nguồn phải $\ge$ `amount`.
- **Response `201 Created`:**
  ```json
  {
    "transfer": {
      "id": "transfer-uuid-1",
      "sourceAccountId": "account-uuid-bank",
      "targetAccountId": "account-uuid-cash",
      "amount": 1000000,
      "transferDate": "2026-11-05",
      "note": "Rút tiền ATM về ví tiền mặt"
    }
  }
  ```

---

## 9. Nhóm API Quản Lý Ngân Sách (Budgets)

### `POST /api/budgets`
Thiết lập hạn mức chi tiêu cho một danh mục trong tháng.

- **Request Body:**
  ```json
  {
    "categoryId": "cat-uuid-dining",
    "periodStart": "2026-11-01",
    "limitAmount": 3000000,
    "alertAtPercent": 80,
    "note": "Hạn mức ăn uống tháng 11"
  }
  ```
- **Response `201 Created`:** Bản ghi `budget` mới.

---

## 10. Nhóm API Giao Dịch Định Kỳ (Recurring Rules)

### 10.1. `POST /api/recurring-rules`
Tạo quy tắc thu chi định kỳ.

- **Request Body:**
  ```json
  {
    "title": "Tiền thuê căn hộ",
    "kind": "expense",
    "amount": 4500000,
    "accountId": "account-uuid-bank",
    "categoryId": "cat-uuid-house",
    "frequency": "monthly",
    "dayOfMonth": 5,
    "startOn": "2026-11-01"
  }
  ```
- **Response `201 Created`:** Bản ghi `recurringRule` mới.

---

### 10.2. `POST /api/recurring-rules/run-due`
Kích hoạt tự động quét và sinh các giao dịch đến hạn.

- **Response `200 OK`:**
  ```json
  {
    "generatedCount": 1,
    "transactions": [ ... ]
  }
  ```

---

## 11. Nhóm API Mục Tiêu Tiết Kiệm (Savings Goals)

### 11.1. `POST /api/savings-goals`
Lập kế hoạch mục tiêu tiết kiệm mới.

- **Request Body:**
  ```json
  {
    "title": "Mua Laptop Mới",
    "targetAmount": 25000000,
    "targetDate": "2027-06-30"
  }
  ```
- **Response `201 Created`:** Trả về thông tin goal kèm ví mục tiêu (`goal account`) vừa tự động tạo.

---

### 11.2. `POST /api/savings-goals/:id/contributions`
Nạp tiền vào quỹ tiết kiệm hoặc Rút tiền từ quỹ tiết kiệm về ví thông thường.

- **Request Body:**
  ```json
  {
    "direction": "deposit",
    "sourceAccountId": "account-uuid-bank",
    "amount": 2000000,
    "date": "2026-11-05",
    "note": "Trích lương tháng 11 gửi tiết kiệm laptop"
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "message": "Nạp tiền vào mục tiêu thành công.",
    "currentAmount": 8000000,
    "targetAmount": 25000000,
    "progressPercent": 32.0
  }
  ```

---

## 12. Nhóm API Báo Cáo & Xuất Dữ Liệu (Reports & Exports)

### 12.1. `GET /api/reports`
Lấy dữ liệu tổng hợp tài chính phục vụ vẽ biểu đồ và phân tích.

- **Query Parameters:** `from`, `to`, `accountId`, `categoryId`.
- **Response `200 OK`:** Dữ liệu thống kê tổng thu, tổng chi, phân bổ tỷ lệ %, xu hướng theo ngày/tháng.

---

### 12.2. `GET /api/exports/user`
Xuất dữ liệu thuộc tài khoản đang đăng nhập ra Excel (.xlsx) hoặc PDF (.pdf). Server lấy `userId` từ phiên, không nhận chủ sở hữu từ query.

- **Query Parameters:**
  - `dataset`: `'report'`, `'transactions'`, `'recurring'` hoặc `'categories'`.
  - `format`: `'xlsx'` hoặc `'pdf'`.
  - `from`, `to`: Ngày bắt đầu/kết thúc (`YYYY-MM-DD`) cho dữ liệu theo kỳ.
  - `kind`: `'all'`, `'income'` hoặc `'expense'`.
  - `categoryId`: UUID danh mục thuộc chính tài khoản hiện tại.
  - `all=true`: chỉ dành cho `dataset=transactions`, bỏ lọc ngày để xuất tất cả giao dịch đã lưu. Không truyền `from` hoặc `to` cùng tham số này.
- **Response `200 OK`:**
  - `Content-Type`: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` hoặc `application/pdf`.
  - `Content-Disposition`: tên file do server tạo.
  - Body: Binary tệp tải về. Báo cáo giao dịch có tóm tắt, thống kê theo thời gian và các cột Loại giao dịch, Số tiền, Ngày giao dịch, Tài khoản, Danh mục, Ghi chú.
- Theo tùy chọn tài khoản, user export dùng VND hoặc quy đổi giá trị tiền sang USD bằng tỷ giá tham khảo gần nhất và ghi ngày tỷ giá trong báo cáo. Lựa chọn hiển thị không thay đổi sổ VND.

---

## 13. Nhóm API Quản Trị Hệ Thống (Admin Portal)

> **Lưu ý:** Tất cả các endpoint trong nhóm này đều yêu cầu người dùng đăng nhập có `role === 'admin'`. Nếu không thỏa mãn, máy chủ trả về lỗi `403 Forbidden`.

### 13.1. `GET /api/admin/overview`
Lấy số liệu thống kê tổng quan toàn hệ thống.

- **Response `200 OK`:**
  ```json
  {
    "metrics": {
      "totalUsers": 142,
      "activeUsers": 128,
      "pendingUsers": 10,
      "disabledUsers": 4,
      "totalTransactions": 3840
    },
    "systemHealth": {
      "api": "available",
      "database": "available"
    }
  }
  ```

---

### 13.2. `GET /api/admin/users`
Lấy danh sách người dùng trong hệ thống có phân trang và bộ lọc trạng thái.

- **Query Parameters:** `status` (`all`, `active`, `pending_email`, `disabled`), `search`, `page`, `limit`.
- **Response `200 OK`:** Danh sách tài khoản người dùng kèm ngày đăng ký, trạng thái và vai trò.

---

### 13.3. `PATCH /api/admin/users/:id/status`
Khóa hoặc Kích hoạt lại tài khoản người dùng (Ghi nhận vào `admin_audit_logs`).

- **Request Body:**
  ```json
  {
    "status": "disabled"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "message": "Trạng thái người dùng đã được cập nhật thành công.",
    "user": {
      "id": "target-user-uuid",
      "status": "disabled"
    }
  }
  ```

---

### 13.4. `GET /api/admin/audit-logs`
Xem lịch sử nhật ký kiểm toán hành động của các quản trị viên.

- **Response `200 OK`:** Danh sách các sự kiện kiểm toán kèm thông tin Admin thực hiện, đối tượng bị tác động, trạng thái cũ và mới.

---

### 13.5. `GET /api/admin/exports`
Xuất dữ liệu quản trị hệ thống ra file Excel hoặc PDF. `dataset` hỗ trợ `overview`, `growth`, `users`, `audit` và `analytics`; `format` hỗ trợ `xlsx` hoặc `pdf`; `from/to` giới hạn kỳ phù hợp.

Dataset `analytics` gồm số đếm DAU/WAU/MAU, hoạt động theo ngày, mức dùng tính năng, lưu lượng giao dịch/chuyển khoản theo số lượng và funnel Bank Hub. Dataset này không xuất số tiền, ghi chú hoặc chi tiết giao dịch của người dùng. Email trong bộ dữ liệu quản trị được che một phần.

---

### 13.6. `GET /api/admin/analytics`
Lấy thống kê mở rộng (Group A): tỷ lệ đăng ký theo cohort, retention rates, tỷ lệ sử dụng tính năng (budgets, goals, recurring, transfers, bank hub), và tỷ lệ chuyển đổi xác thực email.

---

### 13.7. `GET /api/admin/verification-queue` & `POST /api/admin/verification-queue/purge`
- `GET`: Danh sách tài khoản chưa xác minh email quá 24h và OTP gần nhất.
- `POST`: Dọn dẹp hàng loạt tài khoản unverified quá hạn (`days >= 7`).

---

### 13.8. `GET /api/admin/health/detailed`
Giám sát hiệu năng hệ thống chuyên sâu:
- Database uptime, pool connections (total, idle, waiting).
- Dung lượng lưu trữ PostgreSQL, kích thước top tables, cache hit ratio.
- Tiến trình Node.js: RSS, heap memory, process uptime, event loop lag.

---

### 13.9. `GET /api/admin/users/:id`
Lấy chi tiết tài khoản phục vụ Drawer quản trị:
- Thống kê phiên đăng nhập hoạt động.
- Lịch sử chấp thuận pháp lý (ToS, Privacy Policy).
- Lịch sử kiểm toán gắn với tài khoản này.
*(Lưu ý: Không trả về số dư cá nhân, số tiền giao dịch hay ghi chú tài chính).*

---

### 13.10. `POST /api/admin/users/:id/revoke-sessions`
Thu hồi toàn bộ phiên đăng nhập đang hoạt động của người dùng (buộc đăng nhập lại ngay lập tức).

---

### 13.11. `PATCH /api/admin/users/:id/role`
Thay đổi vai trò người dùng (`admin` <-> `user`).
- **Yêu cầu bảo mật:** Bắt buộc gửi kèm `adminPassword` để xác thực danh tính Quản trị viên trước khi thăng cấp/hạ cấp vai trò. Không cho phép tự hạ quyền của chính mình.

---

### 13.12. `GET /api/admin/security-events`
Xem nhật ký an toàn thông tin: các lần đăng nhập thành công/thất bại, OTP sai, tài khoản bị tạm khóa, request bị rate limited. Đi kèm `ip_bucket_hash` (HMAC hàng ngày) và `email_masked`.

---

### 13.13. `GET /api/admin/announcements` & `POST /api/admin/announcements`
Quản lý thông báo toàn hệ thống:
- `POST`: `{ title, message, tone, isActive, startsAt, endsAt }`.
- `PATCH /api/admin/announcements/:id`: Bật/tắt hoặc sửa nội dung thông báo.
- `DELETE /api/admin/announcements/:id`: Xóa thông báo.

---

### 13.14. `GET /api/admin/settings` & `PATCH /api/admin/settings/:key`
Cấu hình cờ tính năng động (Feature flags):
- `allow_registration`, `maintenance_mode`, `enable_ocr_scanner`, `enable_ai_coach`, `enable_bank_hub`.
- Quản lý thư viện mẫu danh mục mặc định: `POST /api/admin/category-templates`, `PATCH /api/admin/category-templates/:id`.

---

### 13.15. `GET /api/admin/support-tickets` & `PATCH /api/admin/support-tickets/:id`
Quản lý và phản hồi yêu cầu hỗ trợ từ người dùng:
- `GET`: Lọc theo `status` (`open`, `in_progress`, `resolved`, `closed`), `priority`.
- `PATCH`: `{ status, adminResponse }` gửi câu trả lời chính thức tới người dùng.

---

## 14. Nhóm API Hỗ Trợ Người Dùng (Support Tickets)

### `POST /api/support-tickets`
Người dùng gửi phiếu yêu cầu trợ giúp tới Quản trị viên.

- **Request Body:**
  ```json
  {
    \"subject\": \"Không nhận diện được hóa đơn nhà hàng\",
    \"message\": \"Hóa đơn bị mờ phần tổng tiền, hệ thống báo lỗi không tìm thấy số tiền.\",
    \"priority\": \"normal\"
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    \"message\": \"Yêu cầu hỗ trợ đã được gửi tới Quản trị viên.\",
    \"ticket\": {
      \"id\": \"st_uuid\",
      \"subject\": \"...\",
      \"status\": \"open\",
      \"priority\": \"normal\",
      \"createdAt\": \"2026-11-05T16:00:00.000Z\"
    }
  }
  ```
