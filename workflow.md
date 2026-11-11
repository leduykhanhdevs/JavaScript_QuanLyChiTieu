# Tài liệu Đặc tả Luồng Hoạt động (Workflow Specification)
## Dự án: Hệ Thống Quản Lý Chi Tiêu Cá Nhân — "Ví Mình"

---

## Mục lục
1. [Luồng 1: Đăng ký, Xác minh Email OTP & Khởi tạo Dữ liệu](#luồng-1-đăng-ký-xác-minh-email-otp--khởi-tạo-dữ-liệu)
2. [Luồng 2: Đăng nhập, Phiên Cookie HttpOnly & Đăng xuất](#luồng-2-đăng-nhập-phiên-cookie-httponly--đăng-xuất)
3. [Luồng 3: Quên mật khẩu & Đặt lại mật khẩu](#luồng-3-quên-mật-khẩu--đặt-lại-mật-khẩu)
4. [Luồng 4: Quản lý Hồ sơ cá nhân, Avatar & Đổi Email qua OTP](#luồng-4-quản-lý-hồ-sơ-cá-nhân-avatar--đổi-email-qua-otp)
5. [Luồng 5: Quản lý Ví & Tài khoản thanh toán (Accounts)](#luồng-5-quản-lý-ví--tài-khoản-thanh-toán-accounts)
6. [Luồng 6: Quản lý Danh mục Thu / Chi (Categories)](#luồng-6-quản-lý-danh-mục-thu--chi-categories)
7. [Luồng 7: Quản lý Giao dịch Thu / Chi (Transactions)](#luồng-7-quản-lý-giao-dịch-thu--chi-transactions)
8. [Luồng 8: Chuyển tiền nội bộ giữa các Ví (Transfers)](#luồng-8-chuyển-tiền-nội-bộ-giữa-các-ví-transfers)
9. [Luồng 9: Quản lý Ngân sách & Cảnh báo chi tiêu (Budgets)](#luồng-9-quản-lý-ngân-sách--cảnh-báo-chi-tiêu-budgets)
10. [Luồng 10: Giao dịch Định kỳ & Tự động sinh giao dịch (Recurring Rules)](#luồng-10-giao-dịch-định-kỳ--tự-động-sinh-giao-dịch-recurring-rules)
11. [Luồng 11: Quản lý Mục tiêu Tiết kiệm (Savings Goals)](#luồng-11-quản-lý-mục-tiêu-tiết-kiệm-savings-goals)
12. [Luồng 12: Dashboard Thống kê & Vẽ Biểu đồ SVG thuần](#luồng-12-dashboard-thống-kê--vẽ-biểu-đồ-svg-thuần)
13. [Luồng 13: Quét Hóa đơn Thông minh (Client-side OCR Receipt Scanner)](#luồng-13-quét-hóa-đơn-thông-minh-client-side-ocr-receipt-scanner)
14. [Luồng 14: Trợ lý Tài chính Cá nhân AI Coach & Cảnh báo](#luồng-14-trợ-lý-tài-chính-cá-nhân-ai-coach--cảnh-báo)
15. [Luồng 15: Dự báo Dòng tiền 90 ngày (Cashflow Forecasting)](#luồng-15-dự-báo-dòng-tiền-90-ngày-cashflow-forecasting)
16. [Luồng 16: Xuất Báo cáo Dữ liệu (Export Excel & PDF)](#luồng-16-xuất-báo-cáo-dữ-liệu-export-excel--pdf)
17. [Luồng 17: Quản trị Hệ thống dành cho Admin](#luồng-17-quản-trị-hệ-thống-dành-cho-admin)
18. [Luồng 18: Quản lý Trạng thái & Đồng bộ LocalStorage Cache](#luồng-18-quản-lý-trạng-thái--đồng-bộ-localstorage-cache)

---

## Luồng 1: Đăng ký, Xác minh Email OTP & Khởi tạo Dữ liệu

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant View as Client (Auth View)
    participant API as Server (Auth Service)
    participant DB as PostgreSQL
    participant Mail as SMTP Mailer

    User->>View: Nhập Họ tên, Email, Mật khẩu & Chọn Consent Điều khoản
    View->>View: Validate Form (Client-side)
    View->>API: POST /api/auth/register
    API->>API: Chuẩn hóa email, hash mật khẩu
    API->>DB: INSERT INTO users (status='pending_email')
    API->>DB: INSERT INTO user_consents (terms_of_use, privacy_notice)
    API->>API: Sinh mã OTP 6 số, hash SHA-256
    API->>DB: INSERT INTO registration_email_codes
    API->>Mail: Gửi email chứa OTP 6 chữ số
    API-->>View: 201 Created (Yêu cầu nhập OTP)
    View-->>User: Mở màn hình xác minh OTP 6 số
    
    User->>View: Nhập mã OTP 6 số
    View->>API: POST /api/auth/verify-email-code
    API->>DB: Kiểm tra mã OTP & Hạn dùng (chưa hết hạn, < 5 lần thử)
    alt OTP Hợp lệ
        API->>DB: UPDATE users SET status='active', email_verified_at=now()
        API->>DB: Tự động khởi tạo Ví Tiền mặt mặc định (opening_balance = 0)
        API->>DB: Tự động khởi tạo Bộ Danh mục Thu/Chi chuẩn (Ăn uống, Lương,...)
        API-->>View: 200 OK (Xác minh thành công)
        View-->>User: Hiển thị thông báo thành công & Chuyển sang Đăng nhập
    else OTP Sai hoặc Quá hạn
        API-->>View: 400 Bad Request (Mã OTP không đúng hoặc hết hạn)
        View-->>User: Báo lỗi & Cho phép gửi lại OTP sau 60 giây
    end
```

---

## Luồng 2: Đăng nhập, Phiên Cookie HttpOnly & Đăng xuất

```mermaid
flowchart TD
    Start([Bắt đầu đăng nhập]) --> Input[Nhập Email, Password & Consent]
    Input --> ValidateClient{Hợp lệ Form?}
    ValidateClient -- Không --> ShowClientErr[Báo lỗi tại trường nhập]
    ValidateClient -- Có --> CallAPI[POST /api/auth/login]
    
    CallAPI --> CheckUser{Tìm thấy user & password đúng?}
    CheckUser -- Không --> ErrAuth[Trả lỗi 401: Sai email hoặc mật khẩu]
    CheckUser -- Có --> CheckStatus{Trạng thái tài khoản?}
    
    CheckStatus -- pending_email --> SendOTP[Tự động gửi lại OTP & Chuyển sang màn hình xác minh]
    CheckStatus -- disabled --> ErrDisabled[Trả lỗi 403: Tài khoản đã bị khóa bởi Admin]
    CheckStatus -- active --> GenSession[Sinh Secure Token & Hash SHA-256]
    
    GenSession --> SaveSession[Lưu session vào DB]
    SaveSession --> SetCookie[Đặt Set-Cookie HttpOnly; SameSite=Lax]
    SetCookie --> Boot[Gọi GET /api/bootstrap tải dữ liệu]
    Boot --> SaveCache[Lưu snapshot vào LocalStorage theo namespace user]
    SaveCache --> RenderUI[Render Dashboard chính] --> End([Hoàn tất])

    subgraph Luồng Đăng xuất
        LogoutClick[Người dùng nhấn Đăng xuất] --> CallLogout[POST /api/auth/logout]
        CallLogout --> RevokeDB[Thu hồi session trong DB]
        RevokeDB --> ClearCookie[Xóa Cookie HttpOnly Max-Age=0]
        ClearCookie --> ClearLocal[Xóa dữ liệu tài chính trong LocalStorage]
        ClearLocal --> ResetState[Khôi phục state bộ nhớ về rỗng]
        ResetState --> ShowLogin[Chuyển về màn hình Đăng nhập]
    end
```

---

## Luồng 3: Quên mật khẩu & Đặt lại mật khẩu

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant App as Ứng dụng Frontend
    participant Server as Node.js Server
    participant DB as PostgreSQL
    participant Mail as SMTP Service

    User->>App: Nhập email tại "Quên mật khẩu"
    App->>Server: POST /api/auth/forgot-password { email }
    Server->>DB: Tra cứu tài khoản theo email_normalized
    alt Email tồn tại & active
        Server->>Server: Sinh ngẫu nhiên token 32 bytes (crypto.randomBytes)
        Server->>DB: INSERT INTO email_tokens (purpose='password_reset', token_hash, expires_at = now() + 1h)
        Server->>Mail: Gửi link đặt lại mật khẩu chứa token
    end
    Server-->>App: 200 OK (Luôn phản hồi thành công để chống dò quét email)
    App-->>User: "Nếu email tồn tại, đường dẫn khôi phục đã được gửi"

    User->>App: Mở liên kết khôi phục mật khẩu từ email
    App-->>User: Hiển thị form đặt mật khẩu mới
    User->>App: Nhập mật khẩu mới & xác nhận mật khẩu
    App->>Server: POST /api/auth/reset-password { token, password, passwordConfirmation }
    Server->>DB: Tra cứu token_hash hợp lệ, chưa sử dụng, chưa hết hạn
    alt Token hợp lệ
        Server->>DB: Cập nhật password_hash mới cho user
        Server->>DB: UPDATE email_tokens SET consumed_at = now()
        Server->>DB: Thu hồi toàn bộ sessions cũ (đăng xuất khỏi mọi thiết bị)
        Server-->>App: 200 OK ("Đặt lại mật khẩu thành công")
        App-->>User: Điều hướng về màn hình Đăng nhập
    else Token sai hoặc hết hạn
        Server-->>App: 400 Bad Request ("Liên kết đã hết hạn hoặc không hợp lệ")
        App-->>User: Báo lỗi & hướng dẫn gửi lại yêu cầu
    end
```

---

## Luồng 4: Quản lý Hồ sơ cá nhân, Avatar & Đổi Email qua OTP

```mermaid
flowchart TD
    StartProfile([Vào Cài đặt Tài khoản]) --> ChooseAction{Chọn hành động}

    ChooseAction -- Đổi Tên/Hồ sơ --> InputName[Nhập Họ và Tên mới]
    InputName --> CallUpdateProfile[PATCH /api/settings/profile]
    CallUpdateProfile --> DBUpdateProfile[Cập nhật bảng users]
    DBUpdateProfile --> SyncCache1[Đồng bộ LocalStorage & Cập nhật Header UI]

    ChooseAction -- Đổi Ảnh đại diện --> SelectImg[Chọn ảnh JPEG/PNG từ máy tính]
    SelectImg --> ClientResize[Resize trên Canvas: Max 256KB, MIME image/jpeg]
    ClientResize --> SendAvatar[PATCH /api/settings/profile kèm avatar_data Base64]
    SendAvatar --> DBStoreAvatar[Lưu BYTEA vào cột avatar_data bảng users]
    DBStoreAvatar --> RefreshAvatar[Tải lại ảnh đại diện qua URL /api/settings/profile/avatar]

    ChooseAction -- Đổi Email --> InputNewEmail[Nhập email mới cần thay đổi]
    InputNewEmail --> CallSendEmailCode[POST /api/settings/profile/email-verification]
    CallSendEmailCode --> CheckEmailUnique{Email đã tồn tại?}
    CheckEmailUnique -- Có --> ErrEmailExists[Báo lỗi: Email đã được sử dụng]
    CheckEmailUnique -- Không --> GenEmailOTP[Sinh mã OTP 6 số & Lưu vào email_change_codes]
    GenEmailOTP --> SendNewMail[Gửi OTP tới địa chỉ email mới]
    SendNewMail --> ModalOTP[Mở modal nhập mã xác thực OTP]
    ModalOTP --> InputEmailCode[Nhập mã OTP 6 số]
    InputEmailCode --> ConfirmEmailChange[POST /api/settings/profile/email-verification/confirm]
    ConfirmEmailChange --> VerifyCode{Mã đúng & Còn hạn?}
    VerifyCode -- Không --> ErrCode[Báo lỗi mã xác thực sai]
    VerifyCode -- Có --> UpdateNewEmailDB[Cập nhật email_normalized trong bảng users]
    UpdateNewEmailDB --> MarkConsumed[Đánh dấu mã đã sử dụng consumed_at=now]
    MarkConsumed --> ToastDone[Thông báo đổi email thành công & Cập nhật UI]
```

---

## Luồng 5: Quản lý Ví & Tài khoản thanh toán (Accounts)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant View as Màn hình Tài khoản
    participant Store as State / Cache Store
    participant API as Finance API
    participant DB as PostgreSQL

    Note over User, DB: Thêm mới Ví / Tài khoản
    User->>View: Nhập Tên ví, Loại (cash/bank/e_wallet), Số dư ban đầu, Màu sắc, Icon
    View->>API: POST /api/accounts
    API->>DB: INSERT INTO accounts (user_id, name, kind, opening_balance, color, icon_key)
    DB-->>API: Trả về bản ghi Account vừa tạo
    API-->>View: 201 Created { account }
    View->>Store: Cập nhật Account vào Store & LocalStorage Cache
    View-->>User: Hiển thị Ví mới trên danh sách & tính lại tổng tài sản

    Note over User, DB: Xóa hoặc Lưu trữ Ví
    User->>View: Nhấn nút "Lưu trữ" hoặc "Xóa" ví
    View-->>User: Hiển thị Modal cảnh báo xác nhận
    User->>View: Xác nhận thao tác
    View->>API: DELETE /api/accounts/:id
    API->>DB: Kiểm tra xem Ví đã phát sinh Giao dịch / Chuyển khoản chưa
    alt Đã có phát sinh giao dịch lịch sử
        API->>DB: UPDATE accounts SET is_archived = true (Lưu trữ an toàn)
        API-->>View: 200 OK ("Đã lưu trữ tài khoản để bảo toàn lịch sử")
    else Chưa có giao dịch nào
        API->>DB: DELETE FROM accounts WHERE id = :id (Xóa cứng)
        API-->>View: 200 OK ("Đã xóa tài khoản")
    end
    View->>Store: Xóa hoặc cập nhật cờ is_archived trong Cache
    View-->>User: Refresh giao diện danh sách ví
```

---

## Luồng 6: Quản lý Danh mục Thu / Chi (Categories)

```mermaid
flowchart TD
    StartCat([Quản lý Danh mục]) --> ActionCat{Chọn thao tác}

    ActionCat -- Thêm danh mục --> FormAddCat[Nhập tên, chọn loại Thu/Chi, màu sắc, biểu tượng]
    FormAddCat --> ValidateCat{Tên không rỗng & Loại hợp lệ?}
    ValidateCat -- Không --> ShowErrCat[Báo lỗi validation]
    ValidateCat -- Có --> APICreateCat[POST /api/categories]
    APICreateCat --> DBCreateCat[INSERT INTO categories]
    DBCreateCat --> CacheAddCat[Thêm vào Cache & Re-render danh sách danh mục]

    ActionCat -- Chỉnh sửa --> FormEditCat[Sửa tên, màu sắc, icon của danh mục]
    FormEditCat --> APIUpdateCat[PATCH /api/categories/:id]
    APIUpdateCat --> DBUpdateCat[UPDATE categories WHERE id = :id AND user_id = :userId]
    DBUpdateCat --> CacheUpdateCat[Cập nhật Cache & Render lại]

    ActionCat -- Xóa/Lưu trữ --> ConfirmDeleteCat[Xác nhận xóa danh mục]
    ConfirmDeleteCat --> APIDeleteCat[DELETE /api/categories/:id]
    APIDeleteCat --> CheckUsage{Đã dùng trong Giao dịch/Ngân sách?}
    CheckUsage -- Đã sử dụng --> SoftArchive[UPDATE categories SET is_archived=true]
    CheckUsage -- Chưa từng dùng --> HardDelete[DELETE FROM categories]
    SoftArchive --> SyncCat[Cập nhật Store & Ẩn khỏi các dropdown tạo mới]
    HardDelete --> SyncCat
```

---

## Luồng 7: Quản lý Giao dịch Thu / Chi (Transactions)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant UI as Form Giao dịch
    participant Service as Finance Service
    participant DB as PostgreSQL (Transaction block)
    participant Cache as LocalStorage Cache

    User->>UI: Điền Số tiền, Loại (Thu/Chi), Ngày, Ví, Danh mục, Ghi chú
    UI->>UI: Kiểm tra Client-side (tiền > 0, ngày hợp lệ, đủ ví/danh mục)
    UI->>Service: POST /api/transactions
    Service->>DB: BEGIN TRANSACTION (Cách ly mức độ cao)
    
    Service->>DB: Kiểm tra quyền sở hữu Ví & Danh mục (khóa `FOR SHARE`)
    alt Giao dịch Chi (Expense)
        Service->>DB: Tính toán số dư hiện tại của Ví = (opening_balance + sum_thu - sum_chi + sum_transfer)
        alt Số dư hiện tại < Số tiền chi
            Service->>DB: ROLLBACK
            Service-->>UI: 400 Bad Request ("Số dư ví không đủ để chi tiêu khoản này")
            UI-->>User: Hiển thị cảnh báo số dư không đủ
        end
    end

    Service->>DB: INSERT INTO transactions (id, user_id, kind, amount, account_id, category_id, transaction_date, note)
    Service->>DB: COMMIT TRANSACTION
    DB-->>Service: Bản ghi Transaction đã lưu
    Service-->>UI: 201 Created { transaction }
    
    UI->>Cache: Bổ sung giao dịch vào mảng transactions trong Cache LocalStorage
    UI->>UI: Cập nhật số dư Ví hiển thị
    UI->>UI: Kiểm tra xem có vượt hạn mức Ngân sách không
    UI-->>User: Đóng modal, hiển thị Toast thông báo thành công
```

---

## Luồng 8: Chuyển tiền nội bộ giữa các Ví (Transfers)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant View as Modal Chuyển tiền
    participant API as Server (Finance Service)
    participant DB as PostgreSQL (ACID Engine)

    User->>View: Chọn Ví chuyển (Nguồn), Ví nhận (Đích), Số tiền, Ngày, Ghi chú
    View->>View: Validate (Ví nguồn khác Ví đích, Số tiền > 0)
    View->>API: POST /api/transfers
    API->>DB: BEGIN TRANSACTION
    
    API->>DB: Khóa và kiểm tra Ví nguồn, Ví đích (cùng thuộc user_id)
    API->>DB: Tính toán số dư khả dụng của Ví nguồn
    alt Số dư Ví nguồn < Số tiền chuyển
        API->>DB: ROLLBACK
        API-->>View: 400 Bad Request ("Số dư ví nguồn không đủ để thực hiện chuyển tiền")
        View-->>User: Báo lỗi số dư nguồn không đủ
    else Số dư hợp lệ
        API->>DB: INSERT INTO transfers (source_account_id, target_account_id, amount, transfer_date, note)
        API->>DB: COMMIT TRANSACTION
        API-->>View: 201 Created { transfer }
        Note over API, View: Lưu ý nghiệp vụ: Chuyển tiền KHÔNG tạo giao dịch Thu hay Chi!
        View->>View: Cập nhật đồng thời số dư 2 ví trong Store & Cache
        View-->>User: Báo chuyển tiền thành công & Cập nhật Dashboard
    end
```

---

## Luồng 9: Quản lý Ngân sách & Cảnh báo chi tiêu (Budgets)

```mermaid
flowchart TD
    StartBudget([Lập & Theo dõi Ngân sách]) --> CreateBudget[Chọn Danh mục chi, Tháng & Hạn mức ngân sách]
    CreateBudget --> SaveBudgetAPI[POST /api/budgets]
    SaveBudgetAPI --> DBSaveBudget[Lưu vào bảng budgets với ràng buộc period_start ngày 01]
    DBSaveBudget --> CalcSpent[Hệ thống tự động tính Tổng chi trong tháng của danh mục]
    
    CalcSpent --> Formula["Tỷ lệ = (Tổng đã chi / Hạn mức) * 100%"]
    Formula --> CheckThreshold{So sánh tỷ lệ sử dụng}
    
    CheckThreshold -- "Tỷ lệ < 80%" --> NormalState[Trạng thái Bình thường - Thanh tiến độ Xanh]
    CheckThreshold -- "80% <= Tỷ lệ < 100%" --> WarningState[Trạng thái Cảnh báo - Thanh tiến độ Cam]
    CheckThreshold -- "Tỷ lệ >= 100%" --> ExceededState[Trạng thái Vượt ngân sách - Thanh tiến độ Đỏ]

    WarningState --> RenderCard[Hiển thị thẻ Cảnh báo trên Dashboard & Trang Ngân sách]
    ExceededState --> RenderCard
    NormalState --> RenderCard
    RenderCard --> EndBudget([Người dùng theo dõi trực quan])
```

---

## Luồng 10: Giao dịch Định kỳ & Tự động sinh giao dịch (Recurring Rules)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant App as Ứng dụng Client
    participant Server as Server Backend
    participant DB as PostgreSQL

    User->>App: Thiết lập quy tắc: "Tiền nhà 5 triệu, ngày 05 hàng tháng từ Ví Ngân hàng"
    App->>Server: POST /api/recurring-rules
    Server->>DB: INSERT INTO recurring_rules (frequency='monthly', day_of_month=5, next_occurrence_on=...)
    Server-->>App: 201 Created { recurringRule }

    Note over App, Server: Cơ chế Tự động sinh Giao dịch đến hạn (Run Due)
    App->>Server: POST /api/recurring-rules/run-due (Kích hoạt khi mở Dashboard)
    Server->>DB: BEGIN TRANSACTION
    Server->>DB: Truy vấn quy tắc có is_active = true VÀ next_occurrence_on <= CURRENT_DATE
    loop Từng quy tắc đến hạn
        Server->>DB: Kiểm tra xem đã sinh giao dịch cho (recurring_rule_id, scheduled_for) chưa (Chống trùng lặp)
        alt Chưa sinh
            Server->>DB: INSERT INTO transactions (kind, amount, account_id, category_id, transaction_date, recurring_rule_id, scheduled_for)
            Server->>DB: Tính toán ngày tiếp theo next_occurrence_on dựa trên chu kỳ (daily/weekly/monthly/yearly)
            Server->>DB: UPDATE recurring_rules SET next_occurrence_on = :nextDate
        end
    end
    Server->>DB: COMMIT TRANSACTION
    Server-->>App: 200 OK { generatedCount, transactions }
    App->>App: Đồng bộ các giao dịch mới sinh vào Store & Thông báo người dùng
```

---

## Luồng 11: Quản lý Mục tiêu Tiết kiệm (Savings Goals)

```mermaid
flowchart TD
    StartGoal([Tạo Mục tiêu tiết kiệm]) --> InputGoal[Nhập Tên mục tiêu, Số tiền đích, Ngày hoàn thành dự kiến]
    InputGoal --> APICreateGoal[POST /api/savings-goals]
    APICreateGoal --> DBAutoCreateWallet[Tự động tạo một Tài khoản Ví loại 'goal' tương ứng]
    DBAutoCreateWallet --> DBCreateGoal[Tạo bản ghi trong savings_goals liên kết với account_id]
    DBCreateGoal --> RefreshGoalUI[Hiển thị Thẻ Mục tiêu với tiến độ 0%]

    subgraph Luồng Nạp / Rút Quỹ Tiết Kiệm
        ActionGoal[Người dùng nhấn Nạp tiền hoặc Rút tiền] --> SelectSource[Chọn ví đối ứng & Số tiền nạp/rút]
        SelectSource --> APIGoalMove[POST /api/savings-goals/:id/contributions]
        APIGoalMove --> ExecTransfer[Thực thi Chuyển tiền nội bộ giữa Ví thường và Ví Goal]
        ExecTransfer --> CalcProgress["Tính tiến độ = (Số dư ví Goal / Số tiền đích) * 100%"]
        CalcProgress --> CheckAchieve{Tiến độ >= 100%?}
        CheckAchieve -- Có --> MarkAchieved[UPDATE savings_goals SET status = 'achieved']
        CheckAchieve -- Chưa --> KeepActive[Giữ status = 'active']
        MarkAchieved --> UpdateGoalCard[Hiển thị Badge: Đã hoàn thành mục tiêu 🎉]
        KeepActive --> UpdateGoalCard
    end
```

---

## Luồng 12: Dashboard Thống kê & Vẽ Biểu đồ SVG thuần

```mermaid
flowchart TD
    LoadPage([Vào trang Dashboard]) --> ReadCache[Đọc Snapshot từ LocalStorage Cache]
    ReadCache --> InitialRender[Render ngay số liệu & biểu đồ tạm thời để tránh nhấp nháy]
    InitialRender --> FetchAPI[Gọi GET /api/bootstrap hoặc /api/dashboard]
    FetchAPI --> SyncDBData[Nhận dữ liệu mới nhất từ PostgreSQL]
    SyncDBData --> OverwriteCache[Cập nhật lại LocalStorage Cache]

    subgraph Tính toán Số liệu Tài chính
        SyncDBData --> CalcKPI["Tổng thu = sum(Thu), Tổng chi = sum(Chi), Dòng tiền ròng = Thu - Chi"]
        SyncDBData --> FilterAccounts[Tính số dư từng ví & Tổng tài sản ròng]
        SyncDBData --> FilterBudgetAlerts[Lọc ngân sách vượt ngưỡng >= 80%]
    end

    subgraph Dựng Biểu đồ SVG thuần (Pure JS DOM)
        CalcKPI --> DonutChart["Tạo <svg> Donut: Tính tỷ lệ góc, vẽ <path> hình cung phân bổ danh mục"]
        CalcKPI --> BarChart["Tạo <svg> Cột: So sánh Thu vs Chi theo từng tháng"]
        CalcKPI --> LineChart["Tạo <svg> Đường: Vẽ đường biến thiên số dư/dòng tiền"]
    end

    DonutChart --> RenderDOM[Chèn các thẻ SVG trực tiếp vào container DOM]
    BarChart --> RenderDOM
    LineChart --> RenderDOM
    RenderDOM --> DoneDashboard([Dashboard hoàn chỉnh sẵn sàng tương tác])
```

---

## Luồng 13: Quét Hóa đơn Thông minh (Client-side OCR Receipt Scanner)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant Scanner as UI Receipt Scanner
    participant Worker as Tesseract.js WebAssembly Worker (Local)
    participant Classifier as Bộ phân loại Danh mục (smart-finance.js)
    participant Server as Node.js Backend

    User->>Scanner: Chọn ảnh hóa đơn (JPG, PNG, WebP)
    Scanner->>Scanner: Scale ảnh trên Canvas (tối đa 2600px để tối ưu OCR)
    Scanner->>Worker: Khởi tạo Worker tải WASM & vie.traineddata.gz từ bộ nhớ local
    Note over Scanner, Worker: ẢNH KHÔNG ĐƯỢC GỬI LÊN SERVER (Bảo mật 100%)
    
    Scanner->>Worker: Gửi ImageData xử lý nhận dạng chữ
    Worker-->>Scanner: Trả về chuỗi Text đã nhận dạng
    
    Scanner->>Classifier: Phân tích chuỗi Text:
    Classifier->>Classifier: Trích xuất Số tiền (regex nhận dạng VND / số thập phân)
    Classifier->>Classifier: Trích xuất Ngày giao dịch (regex YYYY-MM-DD, DD/MM/YYYY)
    Classifier->>Classifier: Quét từ khóa mặt hàng -> Gợi ý Danh mục chi phù hợp
    
    Classifier-->>Scanner: Kết quả: { amount, date, suggestedCategoryId, merchant }
    Scanner-->>User: Tự động điền dữ liệu vào Form Giao dịch xem trước
    
    User->>Scanner: Kiểm tra, chỉnh sửa nếu cần & Nhấn "Lưu giao dịch"
    Scanner->>Server: POST /api/transactions (Lưu giao dịch chuẩn vào DB)
    Server-->>Scanner: 201 Created
    Scanner-->>User: Đóng scanner, thông báo thành công
```

---

## Luồng 14: Trợ lý Tài chính Cá nhân AI Coach & Cảnh báo

```mermaid
flowchart TD
    UserQuery[Người dùng gõ câu hỏi vào AI Coach] --> ParseInput[Phân tích cú pháp ngôn ngữ tự nhiên tại Trình duyệt]
    ParseInput --> MatchIntent{Nhận diện Ý định (Intent)}

    MatchIntent -- "Chi tiêu / Thu nhập theo kỳ" --> ExecFinanceCalc[Lọc giao dịch theo ngày/tháng/danh mục từ Snapshot]
    MatchIntent -- "Kiểm tra giao dịch trùng" --> ExecDuplicateCheck[Dò tìm giao dịch chi trùng ngày, ví, danh mục, số tiền]
    MatchIntent -- "Dự báo dòng tiền" --> ExecForecast[Chạy thuật toán dự báo 90 ngày]
    MatchIntent -- "Tiến độ mục tiêu / Ngân sách" --> ExecProgressCheck[Đọc tiến độ các mục tiêu và ngân sách hiện hữu]

    ExecFinanceCalc --> BuildAnswer[Định dạng câu trả lời bằng tiếng Việt thân thiện]
    ExecDuplicateCheck --> BuildAnswer
    ExecForecast --> BuildAnswer
    ExecProgressCheck --> BuildAnswer

    BuildAnswer --> GenCTA[Sinh Nút Hành Động - Action CTA]
    GenCTA --> ExampleCTA["Ví dụ: Nút 'Xem giao dịch tháng 10' (tự điền bộ lọc ngày)"]
    ExampleCTA --> RenderChat[Hiển thị tin nhắn của AI Coach kèm CTA trong khung chat]
    RenderChat --> UserClickCTA[Người dùng nhấp CTA -> Điều hướng thẳng tới màn hình tương ứng]
```

---

## Luồng 15: Dự báo Dòng tiền 90 ngày (Cashflow Forecasting)

```mermaid
flowchart TD
    StartForecast([Bắt đầu Dự báo Dòng tiền]) --> GetCurrentBal[Lấy Tổng số dư hiện tại của các Ví cá nhân]
    GetCurrentBal --> GetRecurring[Lấy các Quy tắc định kỳ còn hiệu lực trong 90 ngày tới]
    GetRecurring --> GetHistoricalExp[Tính Mức chi tiêu biến đổi trung bình 90 ngày qua]
    
    GetHistoricalExp --> ExcludeFixed[Loại bỏ các khoản định kỳ khỏi mẫu chi biến đổi để không tính trùng]
    ExcludeFixed --> LoopDays[Duyệt từng ngày từ Ngày mai đến Ngày thứ 90]

    LoopDays --> DayCalc["Số dư ngày (T) = Số dư ngày (T-1) + Thu định kỳ - Chi định kỳ - Chi biến đổi trung bình"]
    DayCalc --> CheckRisk{Số dư dự kiến < 0?}
    CheckRisk -- Có --> MarkRiskDay[Ghi nhận Ngày có nguy cơ thâm hụt tài chính]
    CheckRisk -- Không --> NextDay[Tiếp tục tính toán cho các ngày tiếp theo]

    NextDay --> EndLoop{Đã đủ 90 ngày?}
    EndLoop -- Chưa --> LoopDays
    EndLoop -- Rồi --> RenderChart[Vẽ biểu đồ đường xu hướng dòng tiền tương lai & Thống kê rủi ro]
```

---

## Luồng 16: Xuất Báo cáo Dữ liệu (Export Excel & PDF)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant View as Trang Báo cáo
    participant Server as Server (Export Service)
    participant DB as PostgreSQL
    participant Lib as ExcelJS / PDFKit Engine

    User->>View: Chọn Khoảng thời gian (From - To) & Định dạng (.xlsx hoặc .pdf)
    View->>Server: GET /api/exports/user?dataset=transactions&format=xlsx&from=...&to=...
    Server->>Server: Xác thực phiên người dùng (HttpOnly Cookie)
    Server->>DB: Truy vấn dữ liệu: Thông tin User, Danh sách Giao dịch, Danh mục, Ví
    
    alt Định dạng Excel (.xlsx)
        Server->>Lib: Khởi tạo Workbook ExcelJS
        Lib->>Lib: Sheet 1 'Tổng quan': Thêm KPIs (Tổng thu, chi, chênh lệch) & Bảng thống kê danh mục
        Lib->>Lib: Sheet 2 'Giao dịch': Thêm bảng dữ liệu chi tiết (Loại, Số tiền, Ngày, Ví, Danh mục, Ghi chú)
        Lib->>Lib: Định dạng Header, Cột số tiền VND (#,##0 VND), viền bảng
        Lib-->>Server: Trả về Binary Buffer file .xlsx
    else Định dạng PDF (.pdf)
        Server->>Lib: Khởi tạo Document PDFKit (A4, font hỗ trợ tiếng Việt)
        Lib->>Lib: Vẽ Tiêu đề báo cáo, Thông tin người lập, Kỳ báo cáo
        Lib->>Lib: Vẽ Bảng tóm tắt tài chính & Vẽ bảng danh sách giao dịch tự động phân trang (Pagination)
        Lib-->>Server: Trả về Binary Buffer file .pdf
    end

    Server-->>View: 200 OK kèm Header Content-Disposition: attachment; filename="bao-cao-tai-chinh.xlsx"
    View-->>User: Kích hoạt tải file xuống máy tính của người dùng
```

---

## Luồng 17: Quản trị Hệ thống dành cho Admin

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Quản trị viên
    participant UI as Admin Dashboard
    participant API as Admin Service
    participant DB as PostgreSQL

    Admin->>UI: Truy cập khu vực Admin (/api/admin)
    UI->>API: GET /api/admin/overview
    API->>API: Kiểm tra quyền: user.role === 'admin'
    alt Không phải Admin
        API-->>UI: 403 Forbidden ("Bạn không có quyền truy cập khu vực quản trị")
        UI-->>Admin: Chặn truy cập & Chuyển về Dashboard thường
    else Là Admin
        API->>DB: Thống kê: Tổng user, Active user, Disabled user, Tổng số giao dịch
        API-->>UI: 200 OK { metrics, systemHealth }
        UI-->>Admin: Hiển thị giao diện Quản trị viên
    end

    Note over Admin, DB: Thao tác Khóa / Mở khóa Tài khoản người dùng
    Admin->>UI: Chọn người dùng & Nhấn "Khóa tài khoản" (status='disabled')
    UI->>API: PATCH /api/admin/users/:id/status { status: 'disabled' }
    API->>DB: BEGIN TRANSACTION
    API->>DB: UPDATE users SET status = 'disabled' WHERE id = :targetId
    API->>DB: Xóa toàn bộ sessions của user mục tiêu (buộc đăng xuất ngay lập tức)
    API->>DB: INSERT INTO admin_audit_logs (actor_user_id, target_user_id, action='user.status_changed', old_status, new_status)
    API->>DB: COMMIT TRANSACTION
    API-->>UI: 200 OK ("Cập nhật trạng thái thành công")
    UI-->>Admin: Cập nhật danh sách & Hiển thị nhật ký kiểm toán mới
```

---

## Luồng 18: Quản lý Trạng thái & Đồng bộ LocalStorage Cache

```mermaid
flowchart TD
    AppInit([Khởi chạy Ứng dụng]) --> GetUserId{Đã có phiên đăng nhập?}
    GetUserId -- Chưa --> RenderGuest[Render màn hình Đăng ký / Đăng nhập]
    GetUserId -- Có --> CheckCache{Có Cache LocalStorage của User này?}

    CheckCache -- Có Cache --> ParseCache["Đọc JSON từ khóa 'vi-minh:v1:user:<uuid>'"]
    ParseCache --> ValidateJSON{JSON hợp lệ?}
    ValidateJSON -- Hợp lệ --> FastRender[Hiển thị giao diện ngay lập tức trong < 50ms]
    ValidateJSON -- Hỏng/Lỗi --> ClearBrokenCache[Xóa cache lỗi & Hiển thị Loading Skeleton]

    CheckCache -- Không có Cache --> ShowSkeleton[Hiển thị hiệu ứng Loading Skeleton]

    FastRender --> SyncAPI[Gọi API nền GET /api/bootstrap]
    ShowSkeleton --> SyncAPI
    ClearBrokenCache --> SyncAPI

    SyncAPI --> APIResult{Kết quả API?}
    APIResult -- Thành công --> DeepEqual{Dữ liệu mới có khác Cache?}
    DeepEqual -- Có khác --> UpdateMemoryStore[Cập nhật State Store trong bộ nhớ]
    UpdateMemoryStore --> WriteLocalStorage[Ghi snapshot mới vào LocalStorage]
    WriteLocalStorage --> ReRenderUI[Re-render lại các thành phần thay đổi]
    DeepEqual -- Không khác --> KeepUI[Giữ nguyên UI mượt mà]

    APIResult -- Thất bại/Mất mạng --> OfflineBanner[Hiển thị biểu tượng Cảnh báo Ngoại tuyến, vẫn giữ giao diện từ cache để xem]
```

---

## Luồng 19: Chọn đơn vị hiển thị và theo dõi USD/VND

```mermaid
flowchart TD
    OpenSettings[User mở Cài đặt tiền tệ] --> ReadPreference[Đọc tùy chọn VND/USD từ hồ sơ API]
    ReadPreference --> FetchRate[Gọi GET /api/fx/rates]
    FetchRate --> RateFound{Có tỷ giá dùng được?}
    RateFound -- Không --> KeepVND[Giữ VND; nêu thiếu API key hoặc tỷ giá quá cũ]
    RateFound -- Có --> ShowRates[Hiển thị USD/VND, chiều nghịch đảo và lịch sử đã ghi]
    ShowRates --> Choose{User chọn đơn vị}
    Choose -- VND --> SaveVND[PATCH preferences: VND]
    Choose -- USD --> SaveUSD[PATCH preferences: USD]
    SaveVND --> Render[Render số tiền từ sổ VND]
    SaveUSD --> RenderUSD[Render số tiền quy đổi theo tỷ giá mới nhất]
    RenderUSD --> EnterMoney[User nhập số tiền USD tối đa 2 chữ số lẻ]
    EnterMoney --> SendCurrency[Gửi số tiền kèm currency=USD]
    SendCurrency --> ServerConvert[Backend kiểm tra tỷ giá và quy đổi sang VND]
    ServerConvert --> Persist[Service lưu số nguyên VND vào PostgreSQL]
    Persist --> Cache[Chỉ cập nhật LocalStorage sau khi API thành công]
```

Tỷ giá gói miễn phí cập nhật theo ngày. Lịch sử biểu đồ được thu thập từ khi server bắt đầu lưu dữ liệu, không biểu diễn dữ liệu giả cho các ngày trước đó.
