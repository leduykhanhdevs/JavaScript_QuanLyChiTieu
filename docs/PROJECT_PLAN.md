# Project plan — Website Quản lý chi tiêu cá nhân

**Tên sản phẩm dự kiến:** Ví Mình  
**Mục tiêu tài liệu:** chốt phạm vi, luồng nghiệp vụ, kiến trúc và tiêu chí nghiệm thu trước khi lập trình.  
**Nguồn yêu cầu:** [`ASSIGNMENT_REQUIREMENTS.md`](ASSIGNMENT_REQUIREMENTS.md).  
**Trạng thái:** người dùng đã duyệt layout Figma public, Admin và Agent export; với phần ngôn ngữ, Mini app và email hiện tại, đã duyệt mockup local do giới hạn lượt Figma. Source sản phẩm cốt lõi, trang Admin và Mini app đã được triển khai. Xuất Excel/PDF hiện có trong Agent cá nhân và Agent Admin; API kiểm tra phiên/quyền ở server. Migration 011 lưu ngôn ngữ giao diện `vi`/`en`/`zh` và dữ liệu cho quy trình đổi email hai bước; migrations 001–011 được quản lý theo version. Trang Điều khoản/Thông báo quyền riêng tư và ghi nhận chấp thuận đã được thêm; nội dung là bản dự thảo cho đồ án. Kết nối ngân hàng là phạm vi P2 trong [BANK_INTEGRATION_PLAN.md](BANK_INTEGRATION_PLAN.md); Settings có bộ chọn 10 ngân hàng cá nhân Bank Hub công bố, nhưng CTA kết nối vẫn khóa do chưa có onboarding/provider sandbox và dữ liệu giao dịch ngân hàng thật. Email SMTP end-to-end, demo quyền Admin thật và kiểm tra viewport vẫn còn mở.

## 1. Tầm nhìn và mục tiêu

Ví Mình giúp một người ghi nhận thu/chi, theo dõi tiền ở nhiều tài khoản, lập ngân sách và mục tiêu tiết kiệm, rồi hiểu dòng tiền qua dashboard/báo cáo. Sản phẩm là website chạy local để demo môn JavaScript, hỗ trợ nhiều tài khoản người dùng và có thể giải thích từng module khi bảo vệ.

Mục tiêu nghiệm thu:

1. Đạt toàn bộ điều kiện bắt buộc của đề: website thực sự tương tác, CRUD, DOM/event, form/validation, search/filter/sort, LocalStorage, ES6+, module, responsive, nghiệp vụ và demo.
2. Bổ sung phần backend đã được giảng viên duyệt: Node.js, PostgreSQL và SMTP thật cho xác minh email/đặt lại mật khẩu.
3. Không làm sai báo cáo bằng cách tính chuyển tiền hoặc nạp/rút mục tiêu thành thu/chi.
4. Giữ code đơn giản, dễ đọc và dễ thay đổi trực tiếp trong buổi bảo vệ.

## 2. Người dùng và quyền

| Vai trò | Nhu cầu | Quyền |
|---|---|---|
| Chủ tài khoản | Theo dõi dữ liệu tài chính cá nhân; tạo/sửa/xóa dữ liệu của mình | Chỉ đọc và thay đổi bản ghi thuộc `user_id` trong phiên hiện tại |
| Admin | Quản trị tài khoản và xem số liệu vận hành tổng hợp | Khóa/mở tài khoản, xem nhật ký và số liệu đếm; không xem giao dịch hay tiền của user khác |
| Giảng viên/người demo | Chạy ứng dụng và kiểm tra các luồng | Dùng tài khoản demo user và Admin riêng để trình bày |

Admin chỉ xem số liệu tổng hợp và metadata tài khoản cần thiết, không xem tài chính cá nhân. Mỗi API route kiểm tra session và quyền sở hữu; mọi API /api/admin/* kiểm tra role Admin tại server.

## 3. Phạm vi tính năng

### P0 — bắt buộc để demo bài toán hoàn chỉnh

- Đăng ký, xác minh email, đăng nhập, đăng xuất, quên/đặt lại mật khẩu.
- Dashboard cá nhân: tổng thu, tổng chi, dòng tiền ròng, số dư tài khoản, tình hình ngân sách, giao dịch gần đây.
- Dashboard Admin riêng: tổng user, trạng thái tài khoản, đăng ký theo tháng và số lượng giao dịch theo kỳ; chỉ số lượng, không tổng tiền.
- CRUD giao dịch thu/chi; chi tiết; xác nhận xóa; lọc/tìm kiếm/sắp xếp.
- CRUD tài khoản/ví và danh mục; danh mục đúng loại; lưu trữ bản ghi đã được dùng.
- Ngân sách theo tháng/danh mục chi; tiến độ và cảnh báo.
- PostgreSQL là nguồn chuẩn; LocalStorage cache theo người dùng, phục hồi giao diện sau reload.
- Form validation, trạng thái tải/rỗng/lỗi/thành công, responsive và điều hướng hoàn chỉnh.

### P1 — phạm vi nghiệp vụ đã chốt

- Chuyển tiền giữa tài khoản, ghi nhận nguyên tử và không tính là thu/chi.
- Quy tắc giao dịch định kỳ, sinh kỳ đến hạn có khóa chống trùng.
- Mục tiêu tiết kiệm dùng tài khoản goal; nạp/rút là chuyển khoản, không phải expense/income.
- Báo cáo theo kỳ, loại, danh mục và tài khoản; tổng hợp bằng dữ liệu thật.
- Trang cài đặt/hồ sơ và thông tin/trợ giúp/liên hệ.
- Admin P1: danh sách user có search/filter/sort/pagination; khóa/mở tài khoản, thu hồi session và audit log. Không có UI tự cấp role Admin.

### P2 — Mở rộng kết nối ngân hàng và phân loại giao dịch (mới bổ sung)

- Người dùng chọn một ngân hàng từ các ngân hàng cá nhân đang được SePay Bank Hub công bố: VPBank, TPBank, VietinBank, ACB, BIDV, MBBank, OCB, KienLongBank, MSB hoặc Sacombank. Catalog hiện là snapshot tài liệu tĩnh; chỉ đọc lịch sử giao dịch từ ngân hàng/đối tác được onboarding. Hosted Link có thể là trang của provider; tài liệu API hiện chưa chỉ cách truyền ngân hàng đã chọn để mở thẳng đúng ngân hàng.
- Nạp giao dịch vào sổ của user, khử trùng lặp; user phân loại loại thu/chi và danh mục ngay trong inbox, không nhập lại số tiền/ngày/nội dung.
- Quy tắc người dùng tạo có thể gợi ý hoặc tự áp dụng danh mục khi mã hóa đơn/mã tham chiếu hoặc cụm từ người nhận khớp duy nhất. Không suy ra danh mục từ một mã hóa đơn không có ánh xạ.
- Dữ liệu chưa phân loại vẫn được ghi sổ vào category hệ thống Chưa phân loại để số dư không bị thiếu; chuyển khoản giữa các tài khoản của chính user phải được gợi ý/ghép thành transfer, không tính là thu/chi sau khi xác nhận.
- Đồng bộ gần thời gian thực chỉ khi ngân hàng/đối tác cung cấp webhook/sự kiện phù hợp; nếu không, dùng sync thủ công hoặc lịch truy vấn được cho phép và hiển thị thời điểm đồng bộ.
- Đây là phần mở rộng mới, chưa được ghi nhận là đã được giảng viên duyệt. Giữ P0/P1 hoàn chỉnh độc lập; trước khi đưa P2 vào demo môn học cần hỏi giảng viên và có API sandbox/quyền tích hợp. Kết nối production cần TPP onboarding, hợp đồng và credentials từ ngân hàng/đối tác.
- Không thu mật khẩu/OTP ngân hàng, không screen scraping, không khởi tạo thanh toán/chuyển tiền ngân hàng.
- Khảo sát sơ bộ SePay Bank Hub: danh sách công bố có 10 ngân hàng, năng lực cá nhân khác nhau; BIDV/OCB/KienLongBank/MSB chỉ được nêu tiền vào qua VA, VPBank chỉ tiền vào, một số ngân hàng có cả tiền vào/ra. VCB không thuộc danh sách được công bố hiện tại. Settings cho chọn một ngân hàng và khóa CTA đến khi có onboarding/sandbox cùng rà soát Hosted Link; xem ma trận và nguồn trong `BANK_INTEGRATION_PLAN.md`.

### Ngoài phạm vi phiên bản demo

- Khởi tạo thanh toán/chuyển tiền thật tại ngân hàng, quản lý cổ phiếu/vay nợ.
- Ứng dụng native, triển khai Internet, quản trị nhiều tổ chức/tenant hoặc phân cấp nhiều cấp Admin.
- Chế độ ghi offline nhiều thiết bị. Cache chỉ giúp khôi phục và hiển thị; khi API lỗi, mutation không được giả là đã lưu.

## 4. Luồng nghiệp vụ chi tiết

### 4.1 Tạo tài khoản và phiên

1. Trước khi đăng ký hoặc đăng nhập, người dùng đọc và chọn riêng hai ô: đồng ý Điều khoản sử dụng và đồng ý xử lý dữ liệu theo Thông báo quyền riêng tư.
2. Người dùng đăng ký với tên, email, mật khẩu và xác nhận mật khẩu; client và API cùng kiểm tra hai lựa chọn và phiên bản tài liệu hiện hành.
3. API chuẩn hóa email, kiểm tra trùng, băm mật khẩu bằng scrypt, tạo user chưa xác minh và ghi hai bản ghi chấp thuận trong cùng transaction.
4. Sau khi tạo tài khoản, API tạo OTP 6 số, chỉ lưu hash scrypt và gửi ngay qua SMTP. Tài khoản ở trạng thái `pending_email` cho đến khi người dùng nhập đúng OTP.
5. Nếu người dùng đăng nhập đúng mật khẩu nhưng email còn chờ xác minh, API gửi OTP mới (giới hạn gửi lại một lần mỗi phút), frontend chuyển thẳng đến màn hình nhập OTP. Nút gửi lại thủ công chỉ cấp mã mới khi OTP hết hạn hoặc lần gửi trước thất bại.
6. OTP hết hạn/đã dùng/bị khóa sau 5 lần nhập sai sẽ bị từ chối; xác minh thành công đánh dấu email và khởi tạo danh mục mặc định trong transaction DB.
7. Khi đăng nhập, API chỉ tạo session nếu xác thực thông tin đăng nhập và chấp thuận hiện hành thành công; lưu hash session và hai bản ghi chấp thuận, cookie `HttpOnly`, `SameSite=Lax`, `Secure` ngoài localhost.
8. Người dùng xác nhận lần cuối trong modal trước khi đăng xuất; API thu hồi session và frontend xóa cache namespace của user hiện tại.
9. Trong Cài đặt, người dùng đổi tên và ảnh đại diện. Ảnh PNG/JPEG/WebP được trình duyệt crop/thu nhỏ thành JPEG 256 × 256; API kiểm tra MIME, chữ ký, kích thước và byte length trước khi lưu PostgreSQL. Avatar chỉ phục vụ qua route cùng origin có xác thực; không đưa nội dung ảnh vào LocalStorage.
10. Đổi email yêu cầu gửi mã OTP 6 chữ số đến địa chỉ mới. API chỉ lưu hash scrypt có salt, hạn dùng mặc định 10 phút (cấu hình 1–30 phút), giới hạn 5 lần nhập sai và rate-limit endpoint; email chỉ được cập nhật trong transaction sau khi mã đúng và địa chỉ chưa được tài khoản khác sử dụng.

### 4.2 Ghi thu/chi

1. Người dùng chọn loại, tài khoản đang hoạt động, danh mục cùng loại, ngày, số tiền VND nguyên dương và ghi chú tùy chọn.
2. Client kiểm tra form và gửi JSON; API xác thực phiên, chủ sở hữu và điều kiện nghiệp vụ.
3. Ghi PostgreSQL thành công rồi trả bản ghi chuẩn hóa; client cập nhật state và LocalStorage, render lại danh sách/dashboard.
4. Sửa làm thay đổi cùng bản ghi và tính lại dashboard/budget; xóa phải có xác nhận và cập nhật cache sau khi API xác nhận.
5. Lỗi API giữ form, hiển thị lỗi phù hợp và không tạo dữ liệu giả ở LocalStorage.

### 4.3 Tài khoản và số dư

- Một tài khoản có loại tiền VND, tên, loại (tiền mặt/ngân hàng/ví điện tử), số dư ban đầu và trạng thái lưu trữ.
- Số dư hiện tại được tính: `opening_balance + income - expense + transfer_in - transfer_out`.
- Không lưu số dư dẫn xuất như một con số có thể lệch sổ giao dịch. Chặn mutation trên tài khoản đã lưu trữ.
- Xóa mềm/lưu trữ tài khoản có lịch sử; số dư lịch sử vẫn tính được.

### 4.4 Chuyển tiền

- Chọn nguồn, đích, số tiền nguyên dương, ngày và ghi chú.
- Nguồn và đích phải khác nhau và cùng thuộc user hiện tại. Phiên bản này không hỗ trợ thấu chi: server khóa hai tài khoản theo thứ tự ID ổn định, tính số dư dẫn xuất và từ chối expense/transfer làm số dư âm, rồi ghi thay đổi trong một DB transaction.
- Transfer không tạo hai transaction thu/chi; dashboard và báo cáo loại transfer ra khỏi tổng thu/chi.
- Chuyển tiền tới/từ goal account là cách nạp/rút mục tiêu; rút không được làm số dư goal âm.

### 4.5 Ngân sách

- Một hạn mức theo tháng và danh mục chi; mỗi cặp user/category/tháng chỉ có một ngân sách.
- Chi tiêu đã dùng được tính từ expense cùng user, đúng category, trong tháng. Chuyển tiền bị loại.
- `remaining = limit - spent`; tiến độ hiển thị có thể vượt 100% nhưng phần tiền còn lại không được trình bày như âm tiền khả dụng. Cảnh báo khi vượt ngưỡng cấu hình.

### 4.6 Định kỳ

- Người dùng định kỳ hóa một thu/chi với số tiền, loại, tài khoản, danh mục, tần suất, ngày bắt đầu/kết thúc và trạng thái.
- Khi tải dữ liệu hoặc gọi tác vụ đồng bộ, server xử lý các ngày đến hạn trong transaction; unique `(rule_id, scheduled_date)` bảo đảm chạy lại không tạo bản ghi trùng.
- Sinh kỳ phải tôn trọng ngày kết thúc, lịch tháng thiếu ngày (dùng ngày cuối tháng) và trạng thái bật/tắt.
- Sinh transaction không gửi email và không sinh kỳ tương lai trước hạn.

### 4.7 Mục tiêu tiết kiệm

- Mỗi mục tiêu có tài khoản goal riêng, tiêu đề, số tiền đích, hạn tùy chọn và trạng thái.
- Tiến độ hiện tại lấy từ số dư tài khoản goal. Nạp/rút thông qua transfer giữa tài khoản chi tiêu và goal.
- Đạt mục tiêu khi số dư goal >= số tiền đích; tiến độ không cộng thêm thu nhập hoặc expense.

### 4.8 Dashboard và báo cáo

- Bộ lọc thời gian mặc định là tháng hiện tại, có đổi tháng/khoảng ngày.
- Thu = tổng transaction `income`; chi = tổng `expense`; ròng = thu - chi.
- Số dư cộng theo ledger: số dư ban đầu + thu - chi + transfer đến - transfer đi.
- Biểu đồ tự dựng bằng SVG/canvas; chart chỉ trình bày truy vấn/tổng hợp, không là nguồn dữ liệu thứ hai.
- Empty state nói rõ chưa có giao dịch trong kỳ và gợi ý thao tác tạo giao dịch.

### 4.9 Liên kết ngân hàng và phân loại giao dịch nhập

1. User chỉ chọn provider có trong allowlist server. Backend tạo yêu cầu consent có state dùng một lần và PKCE khi provider hỗ trợ/yêu cầu, sau đó trả redirect URL chính thức.
2. User xác thực và cấp quyền ở ngân hàng; backend kiểm tra callback/state và đổi authorization code. Website không nhận bank password hoặc OTP.
3. User chọn tài khoản ngoài và ghép với account nội bộ. Backend mã hóa token ở phía server, lưu tài khoản đã che để hiển thị và không trả token cho browser.
4. Sync lấy dữ liệu theo cursor/mốc an toàn, chuẩn hóa, rồi deduplicate bằng mã giao dịch ngoài. Trước khi tạo bút toán, lần import đầu dò giao dịch nhập tay có cùng account/ngày/số tiền/chiều; ứng viên có thể trùng phải được user ghép với bản cũ hoặc xác nhận import mới, không tự gộp.
5. Nếu không có ứng viên trùng, mỗi giao dịch mới tạo một transaction thu/chi tạm với category Chưa phân loại để ledger/số dư cập nhật đúng một lần. User đổi loại/danh mục; server cập nhật transaction và báo cáo trong cùng nghiệp vụ. Nếu có exact reference rule duy nhất được bật tự động, transaction nhận category tương ứng; kết quả vẫn có thể sửa lại.
6. Rule không khớp hoặc có xung đột thì giữ Cần phân loại. Chuyển khoản giữa các tài khoản đã liên kết là gợi ý riêng; user xác nhận ghép thành transfer để loại khỏi thu/chi.
7. UI hiển thị trạng thái kết nối, consent, tài khoản liên kết, lần sync gần nhất, lỗi/cần xác thực lại; user có thể sync lại hoặc ngắt kết nối/revoke.
8. Nếu provider không có push webhook, ứng dụng không hứa realtime; dùng sync theo yêu cầu/lịch cho phép. Thông tin gốc từ ngân hàng được giữ để giải quyết trùng lặp và truy vết.

## 5. Màn hình và điều hướng

| Khu vực | Nội dung và thao tác chính | Trạng thái cần thiết |
|---|---|---|
| Auth | Đăng nhập, đăng ký, OTP xác minh email, quên/đặt lại mật khẩu | Đang gửi, lỗi trường/API, OTP hết hạn hoặc sai mã, thành công |
| Dashboard | Thu/chi/ròng, số dư, ngân sách, xu hướng, giao dịch gần đây, CTA thêm giao dịch | Chưa có dữ liệu, tải, lỗi đồng bộ |
| Giao dịch | Danh sách, search/filter/sort, chi tiết, thêm/sửa, xác nhận xóa | Rỗng, không tìm thấy, validation, lỗi API |
| Tài khoản | Danh sách, số dư dẫn xuất, thêm/sửa/lưu trữ | Chưa có ví, tài khoản lưu trữ, xác nhận |
| Liên kết ngân hàng (P2) | Danh sách provider được hỗ trợ, consent redirect, chọn account ngoài và mapping account nội bộ, trạng thái/revoke | Chưa hỗ trợ provider, đang chờ xác nhận tại bank, thành công, bị từ chối, hết hạn, cần xác thực lại |
| Giao dịch ngân hàng (P2) | Inbox giao dịch đã import, tìm/lọc theo trạng thái, phân loại nhanh, tạo/ghép transfer, xem nội dung nguồn đã bảo vệ | Cần phân loại, đã gợi ý, tự phân loại, đã xác nhận, trùng, lỗi đồng bộ |
| Quy tắc phân loại (P2) | Tạo/sửa/tắt rule mã hóa đơn/người nhận → loại + category; chọn gợi ý hay tự áp dụng | Không khớp, nhiều rule xung đột, category đã lưu trữ |
| Chuyển tiền | Tạo và xem lịch sử chuyển | Không có 2 tài khoản, số dư không đủ, thành công |
| Danh mục | Danh sách thu/chi, tạo/sửa, lưu trữ | Danh mục dùng rồi không thể xóa cứng |
| Ngân sách | Danh sách tháng, tạo/sửa, tiến độ/cảnh báo | Chưa có ngân sách, vượt hạn mức |
| Định kỳ | Danh sách quy tắc, bật/tắt, tạo/sửa | Không có quy tắc, sinh kỳ lỗi/trùng an toàn |
| Mục tiêu | Danh sách, tiến độ, tạo/sửa, nạp/rút qua chuyển | Chưa có mục tiêu, đạt mục tiêu |
| Báo cáo | Bộ lọc kỳ, biểu đồ, phân rã và tổng | Kỳ không dữ liệu, lỗi tải |
| Cài đặt | Hồ sơ, ảnh đại diện, đổi email qua OTP email hiện tại rồi OTP email mới, VND/USD, Tiếng Việt/Anh/Trung, đăng xuất có xác nhận | Đang tải ảnh/mã, chờ xác minh từng bước, mã đã xác nhận nhưng chưa lưu, lỗi API, lưu thành công/lỗi |
| Thông tin/trợ giúp | Mô tả cách sử dụng, ý nghĩa thống kê và liên hệ | Link nội bộ hợp lệ |

Desktop dùng thanh điều hướng bên; tablet/mobile thu gọn menu và ưu tiên thao tác một tay. Bảng giao dịch chuyển thành danh sách/card hoặc cuộn có kiểm soát trên màn nhỏ.

## 6. Kiến trúc đề xuất

```text
Browser
  public/ (HTML, CSS, ES modules)
     UI components -> feature modules -> application services
       |                             |-> LocalStorage cache (per-user namespace)
       |-> SVG/canvas charts          |-> same-origin JSON API
                                     |
Node.js HTTP server (core http)
  routes -> middleware/session -> validation -> domain services -> repositories
                                          |                       |
                                          |                       +-> PostgreSQL 18
                                          +-> SMTP adapter -> mail provider
```

- Frontend: HTML/CSS/vanilla JS, ES modules, DOM API, event delegation khi phù hợp; không framework UI.
- Backend: Node.js built-in `http` và module nội bộ; package `pg` cho PostgreSQL, `nodemailer` cho SMTP, `dotenv` chỉ đọc cấu hình local. Không đưa bí mật vào repo.
- API và static assets cùng origin để demo local; JSON lỗi thống nhất `{ error: { code, message, fields? } }`.
- Repository layer luôn lọc theo `user_id`; dùng parameterized queries. DB constraint là lớp cuối cho quan hệ/range/duy nhất.
- Mật khẩu, OTP xác minh đăng ký và OTP đổi địa chỉ email lưu hash scrypt có salt; session/email link token lưu SHA-256 hash. OTP xác minh email tự gửi khi đăng ký, hết hạn sau 10 phút mặc định (cấu hình 1–30 phút), dùng một lần, khóa sau 5 lần nhập sai. Đăng nhập đúng mật khẩu với tài khoản chưa xác minh sẽ mở luồng OTP và cấp/gửi OTP mới, tối đa một lần mỗi phút cho mã hiện hành; nút gửi lại thủ công chỉ hoạt động khi mã hết hạn hoặc lần gửi trước thất bại. Mã/token thô chỉ tồn tại để gửi một lần và không lưu vào LocalStorage/log. Cookie `HttpOnly`, `SameSite`; HTTPS/Secure khi không chạy localhost.
- Ảnh đại diện bị crop/resize ở client và kiểm tra lại ở server (JPEG, tối đa 512 × 512 và 256 KiB); lưu PostgreSQL và chỉ trả qua route ảnh xác thực, không cache vào LocalStorage.
- Bank integration (P2) gọi từ backend qua adapter cho từng provider; allowlist endpoint cố định, callback xác thực state/PKCE, webhook xác minh chữ ký/mTLS theo hợp đồng. Access/refresh token được mã hóa AEAD tại server với key ngoài database; TPP client secret nằm trong secret manager/cấu hình backend. Không đưa token hoặc nội dung giao dịch vào frontend log/telemetry.
- Bảo vệ CSRF phù hợp cookie session: kiểm tra `Origin` cho mutation và token chống CSRF nếu topology yêu cầu; giới hạn tốc độ auth; không ghi mật khẩu/token/chi tiết tài chính vào log.

## 7. Cấu trúc thư mục mục tiêu

```text
public/
  index.html
  css/                 reset.css, tokens.css, app.css, responsive.css
  assets/              icon minh họa tĩnh có giấy phép
  js/
    app.js
    api/                http-client.js, auth-api.js, finance-api.js
    components/         dialog.js, toast.js, form-field.js, chart.js
    features/           auth/, dashboard/, transactions/, accounts/, budgets/, recurring/, goals/, reports/, bank-connections/, bank-feed/, classification-rules/
    services/           auth-service.js, transaction-service.js, report-service.js, bank-sync-service.js
    state/              store.js, cache.js
    utils/              money.js, dates.js, validation.js, dom.js
server/
  app.js
  routes/ controllers/ middleware/ services/ repositories/ mail/ bank-adapters/
  db/ migrations/ seed.sql
  config/
docs/
  ASSIGNMENT_REQUIREMENTS.md
  PROJECT_PLAN.md
  PLAN_REVIEW.md
  DATABASE_DESIGN.md
  BANK_INTEGRATION_PLAN.md
```

Chỉ tạo module khi có trách nhiệm thật. Không đẩy tất cả file vào một `app.js` hoặc một file JS frontend.

## 8. API dự kiến

### Xác thực

- `POST /api/auth/register` (tự gửi OTP), `POST /api/auth/verify-email-code`, `POST /api/auth/resend-verification` (chỉ khi OTP hết hạn); `POST /api/auth/login` với tài khoản pending gửi/đảm bảo có OTP rồi trả trạng thái `EMAIL_NOT_VERIFIED` để frontend mở trang nhập mã. `GET /api/auth/verify-email?token=...` chỉ giữ tương thích với liên kết cũ còn hạn.
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`

### Liên kết ngân hàng — P2, chỉ mở khi provider đã onboarding

- `GET /api/bank-providers`; `POST /api/bank-connections/:provider/connect`; callback server-side `GET /api/bank-connections/callback/:provider`.
- `GET /api/bank-connections`; `DELETE /api/bank-connections/:id` để ngắt kết nối/revoke.
- `GET /api/bank-connections/:id/accounts`; `POST /api/bank-accounts/:id/link`; `POST /api/bank-connections/:id/sync`.
- `GET /api/bank-feed?status=&from=&to=`; `PATCH /api/bank-feed/:id/classification`.
- `GET/POST/PATCH/DELETE /api/transaction-classification-rules`.
### Dữ liệu người dùng đã xác thực

- `GET/POST /api/accounts`, `PATCH/DELETE /api/accounts/:id` (DELETE thực hiện lưu trữ khi có lịch sử)
- `GET/POST /api/categories`, `PATCH/DELETE /api/categories/:id` (lưu trữ)
- `GET/POST /api/transactions`, `GET/PATCH/DELETE /api/transactions/:id`
- `GET/POST /api/transfers`, `GET /api/transfers/:id`
- `GET/POST /api/budgets`, `PATCH/DELETE /api/budgets/:id`
- `GET/POST /api/recurring-rules`, `PATCH/DELETE /api/recurring-rules/:id`, `POST /api/recurring-rules/run-due`
- `GET/POST /api/savings-goals`, `PATCH/DELETE /api/savings-goals/:id`, `POST /api/savings-goals/:id/contributions` (tạo transfer)
- `GET /api/dashboard?from=&to=`, `GET /api/reports?from=&to=&groupBy=`
- `GET /api/exports/user?dataset=&format=&from=&to=&kind=&categoryId=` (XLSX/PDF; luôn giới hạn theo user của phiên)
- `GET /api/admin/exports?dataset=&format=&from=&to=` (Admin only; tổng hợp hệ thống, user đã che email, tăng trưởng và nhật ký quản trị)

Endpoint chưa xác định sẽ không được dựng thành link chết; mọi mutation xác thực lại quyền sở hữu và điều kiện liên quan. Pagination/search/filter/sort nhận query parameters có whitelist, không nối raw SQL từ input.

Tệp Agent được tạo phía server bằng ExcelJS/PDFKit; phần giao diện chỉ tải binary same-origin. Dữ liệu User được truy vấn theo `user.id`; Admin export không có giao dịch cá nhân hoặc số tiền. Bảng chi tiết tối đa 5.000 dòng; email Admin được che một phần. Chi tiết route, loại báo cáo và kiểm tra hiện tại được ghi trong [`AI_AGENT_PLAN.md`](AI_AGENT_PLAN.md).

## 9. Quy tắc LocalStorage và state

- Namespace đề xuất: `vi-minh:v1:user:<uuid>:snapshot`, `vi-minh:v1:user:<uuid>:preferences`.
- Chỉ lưu bản dữ liệu cần để render, dấu thời điểm đồng bộ và preferences không nhạy cảm; response auth không ghi vào cache tài chính.
- Có thể cache giao dịch ngân hàng đã chuẩn hóa theo cùng user namespace; tuyệt đối không cache authorization code, state, PKCE verifier, access/refresh token, client secret hay dữ liệu xác thực ngân hàng.
- Chu trình GET: đọc/validate cache -> render stale-but-useful -> gọi API -> thay state/cache nếu thành công -> render trạng thái đồng bộ.
- Chu trình mutation: validate -> API -> nếu thành công cập nhật state/cache -> render + toast; nếu lỗi giữ form và state chuẩn.
- JSON hỏng/version cũ: bỏ snapshot lỗi, tải lại API, thông báo nếu dữ liệu tạm thời không sẵn sàng.
- LocalStorage có thể bị tắt/quota đầy: ứng dụng vẫn dùng API trong phiên và thông báo cache không lưu được, không báo dữ liệu đã mất ở server.
- Logout: revoke session rồi xóa namespace hiện tại trong `finally`; tránh xóa cache của user khác.

## 10. Quy tắc tiền và thời gian

- Tiền tệ duy nhất ở phiên bản này: VND; API/DB dùng số nguyên, không dùng float cho phép tính tiền.
- UI dùng `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })`.
- Ngày nghiệp vụ lưu `DATE` theo ngày người dùng chọn; timestamp kỹ thuật lưu `TIMESTAMPTZ` UTC. Kỳ báo cáo tính theo múi giờ `Asia/Ho_Chi_Minh`.
- Nguồn số liệu duy nhất là PostgreSQL; tổng hợp UI/API dùng quy tắc tính thống nhất và không cộng transfer vào income/expense.

## 11. Lỗi, trạng thái, bảo mật và khả năng tiếp cận

- Lỗi API có mã ổn định, thông báo tiếng Việt, field errors; không trả stack trace/SQL/secret cho browser.
- Form có label, lỗi gắn trường, focus vào lỗi đầu tiên; dialog có thể đóng bằng Escape, focus không bị mất; trạng thái có biểu đạt chữ/biểu tượng, không chỉ dựa màu.
- Nút xóa/đóng tài khoản/goal có xác nhận và mô tả hậu quả.
- Dữ liệu tài chính không đưa vào URL/log. Mọi list/detail/export sau này bắt buộc có giới hạn `user_id`.
- Email reset không tiết lộ email có tồn tại hay không; token một lần, hết hạn. SMTP thiếu cấu hình thì luồng được báo cấu hình chưa sẵn sàng trong local demo, không giả gửi email.

## 12. Kế hoạch thực hiện và cổng nghiệm thu

| Mốc | Công việc | Bằng chứng để qua mốc |
|---|---|---|
| 0. Yêu cầu và thiết kế dữ liệu | Đọc đề, docs, self-review, schema và migration | Schema core có; migrations 001–011 đã áp dụng theo trạng thái DB local sau lần migrate gần nhất; snapshot tài khoản/consent cũ vẫn mang ngày ghi nhận riêng |
| 1. Thiết kế Figma | Design system, dashboard, các trang nghiệp vụ/auth và responsive | Public và Admin đã được người dùng duyệt. Admin có overview desktop/tablet/mobile, users desktop/mobile và 6 trạng thái trên trang `08 · Admin`; SVG vector có thể chọn/sửa, chưa phải thư viện native Auto Layout/component |
| 2. Dựng vỏ ứng dụng | Server khởi động, static UI, navigation, CSS responsive, toast/dialog | Source đã có; server static trả trang 200; renderer xác nhận 10 trang, 11 modal và 7 trạng thái auth. Đã xem login desktop; tablet/mobile chưa kiểm tra trực tiếp |
| 3. Auth và tài khoản | Session, chấp thuận, đổi email hai bước, avatar, logout xác nhận, CRUD account/category | Migration 011 tách OTP xác minh email hiện tại và OTP email mới; email chỉ đổi khi lưu hồ sơ; SMTP thật vẫn cần demo |
| 4. Giao dịch và cache | Transaction CRUD, validation, search/filter/sort, LocalStorage | CRUD, validation server và ràng buộc số dư đã qua API checks; cache theo user đã triển khai. Chưa chạy kịch bản reload/cache trực tiếp trên trình duyệt |
| 5. Nghiệp vụ mở rộng | Transfer, budget, recurring, goals | Transfer nguyên tử, ngân sách trùng, recurring idempotent, mục tiêu và số dư không âm đã qua API checks |
| 6. Dashboard/báo cáo | Tổng hợp thực và biểu đồ SVG/canvas | API báo cáo, reducer thống kê và chart SVG đã có; kiểm tra đối chiếu UI với số liệu trên tài khoản demo còn chờ cấu hình môi trường chính |
| 7. Hoàn thiện và demo | Rà soát link/button/form, responsive, console, README/demo | Source có chọn locale, cập nhật icon Mini app và hoàn thiện profile email; kiểm tra cú pháp/health hiện tại được ghi trong `PLAN_REVIEW.md`. Email tới inbox và rà viewport vẫn cần demo |
| 8. Admin và thống kê hệ thống | Migration role/audit, API RBAC/aggregate, user management và dashboard responsive | Migration, routes, service và UI đã triển khai; frame Figma đã duyệt. Còn cần bootstrap user Admin để demo 401/403, đối chiếu dữ liệu và thao tác khóa/audit |
| 9. Kết nối ngân hàng P2 | Theo `BANK_INTEGRATION_PLAN.md` mục 11: quản lý consent/Hosted Link attempt ở Settings; khảo sát provider, sandbox, lịch sử/webhook và hợp đồng trước khi nhập dữ liệu/sync | Migration 007 có consent và attempt Hosted Link sandbox, nhưng chưa có onboarding, credentials, API provider, linked accounts/feed/sync hay dữ liệu thật. CTA vẫn khóa; P2 chưa được xác nhận là phạm vi chấm |
| 10. Tùy chọn hiển thị và hồ sơ email | Tiếng Việt/Anh/Trung cho User, Admin, Mini app; dùng chung logo website; đổi email xác minh hai bước | Mockup local đã được duyệt; migration 011 và source triển khai, trạng thái kiểm tra được ghi trong `PLAN_REVIEW.md` |

**Cổng hiện tại:** source cốt lõi, Admin, Mini app, avatar, đổi email hai bước, OTP xác minh đăng ký, locale và xác nhận đăng xuất đã được triển khai. DB migration 011 hỗ trợ locale/grant OTP; trạng thái DB và kiểm tra cụ thể được ghi trong `PLAN_REVIEW.md`. DB có một user active nhưng chưa có Admin; cần xác nhận đúng tài khoản trước khi bootstrap quyền Admin. OTP thật phụ thuộc SMTP; cần demo OTP/avatar ở UI và xác nhận thư đến hộp thư khi chạy thật. Không đưa credential vào chat hoặc commit.

## 13. Kịch bản demo bảo vệ

1. Mở ứng dụng và giải thích cấu trúc module.
2. Đăng nhập vào tài khoản demo; chỉ khi SMTP test được cấu hình mới trình diễn email xác minh/reset thật.
3. Tạo ví, danh mục, expense/income; tìm kiếm, lọc, sắp xếp; sửa rồi xóa có xác nhận.
4. Reload để chỉ ra cache LocalStorage và cách đồng bộ với API.
5. Tạo budget, chuyển tiền, recurring rule và savings goal; giải thích vì sao transfer/goal không là thu/chi.
6. Chọn tháng khác, giải thích reducer và số dashboard cá nhân; thử empty state.
7. Đăng nhập tài khoản Admin riêng; giải thích số liệu aggregate và vì sao không xem tài chính cá nhân.
7. Thực hiện yêu cầu sửa trực tiếp như normalize tìm kiếm tiếng Việt hoặc xử lý LocalStorage rỗng.

## 14. Các rủi ro và cách xử lý

| Rủi ro | Cách giảm thiểu |
|---|---|
| Backend mở rộng làm mờ yêu cầu JS thuần | Giữ ma trận minh chứng frontend; frontend không framework; LocalStorage và ES6+ có hiện diện thực |
| Ghi cache khác dữ liệu DB | API-first; chỉ cache sau phản hồi thành công; DB là nguồn chuẩn |
| Lộ dữ liệu giữa các user | Namespace cache; truy vấn user-scoped; composite FK; session kiểm tra server |
| Lộ dữ liệu qua Admin | requireAdmin ở server; chỉ trả aggregates và metadata cần thiết; audit log; không có API transaction detail |
| Transfer/goal làm sai thống kê | Bảng transfer riêng, quy tắc báo cáo rõ, test tính tổng |
| Recurring sinh trùng | unique `(rule_id, scheduled_date)` và transaction idempotent |
| Provider không có push realtime hoặc giới hạn API | Ghi rõ độ trễ theo provider, sync theo tần suất cho phép và hiển thị lần đồng bộ cuối |
| Một nội dung/mã hóa đơn khớp nhiều category | Rule xung đột phải chuyển về Cần phân loại; không auto apply khi không có một kết quả duy nhất |
| Chuyển nội bộ bị tính nhầm thu/chi | Gợi ý ghép giao dịch giữa account liên kết; chỉ chuyển thành transfer sau khi đủ điều kiện/xác nhận |
| Dữ liệu bank import bị trùng hoặc retry | Unique external transaction key, cursor và transaction DB idempotent; lần sync đầu hỏi xác nhận khi khớp khả năng với transaction nhập tay |
| Lộ token hoặc nội dung giao dịch | Token mã hóa phía server, secrets tách khỏi DB, không log/LocalStorage, user-scoped access và không cho Admin xem feed |
| Email chưa gửi thử | SMTP auth đã verify; sender cần khớp SMTP_USER hoặc là alias đã xác minh; chưa coi email là nghiệm thu |
| Chưa có tài khoản Admin | DB hiện rỗng; người dùng đăng ký/xác minh một tài khoản, sau đó dùng lệnh `db:promote-admin`; không cấp mật khẩu mặc định |
| Thiếu thời gian cho nhiều tính năng | P0 trước, P1 theo mốc; không lược bỏ điều kiện bắt buộc của môn |

## 15. Tiêu chí hoàn thành dự án

- Checklist [`ASSIGNMENT_REQUIREMENTS.md`](ASSIGNMENT_REQUIREMENTS.md) hoàn tất bằng bằng chứng chạy được.
- Có trang Admin riêng với role và middleware server-side; dashboard hiển thị số liệu tổng hợp, không lộ giao dịch/số tiền cá nhân. Cần bootstrap tài khoản Admin và demo quyền thật trước khi coi là đã nghiệm thu.
- Đăng ký/đăng nhập/verify/reset hoạt động với SMTP test đã cấu hình; mỗi người dùng chỉ thấy dữ liệu của mình.
- Các CRUD, search/filter/sort, LocalStorage, budget, transfers, recurring, goals, dashboard cá nhân và báo cáo đúng quy tắc nghiệp vụ.
- Admin RBAC, dashboard aggregates, user status management, audit log và responsive được nghiệm thu theo docs/ADMIN_DASHBOARD_PLAN.md.
- Bank P2 chỉ được coi là hoàn thành khi provider/sandbox thật đã onboarding, Figma mới được user duyệt, migration mới đã kiểm chứng, consent/revoke/sync/deduplicate/auto-rule/manual review chạy đúng và không lộ credential; không dùng mock làm bằng chứng production.
- DB migration và seed chạy được; constraint quan trọng có kiểm chứng.
- UI trên desktop/tablet/mobile, trạng thái lỗi/rỗng/thành công và điều hướng hoàn thiện.
- Không có secret trong Git; README có lệnh cài/chạy/migrate/seed, cấu hình môi trường và kịch bản demo.
- Người học giải thích được module/array methods/cache/API/schema và thực hiện được một thay đổi nhỏ trực tiếp.



