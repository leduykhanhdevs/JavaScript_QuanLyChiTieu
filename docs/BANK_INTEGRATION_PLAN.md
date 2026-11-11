# Kế hoạch tích hợp dữ liệu giao dịch ngân hàng

**Trạng thái:** người dùng đã duyệt bộ SVG cục bộ cho Settings (16/10/2026) và ngoại lệ bảo mật hẹp cho HTTP 303 dùng một lần đến Hosted Link. Đã triển khai backend SePay Bank Hub sandbox cho tạo link, mã hóa secret, redirect một lần, lưu consent riêng và kiểm tra trạng thái link. Migration 007 đã áp dụng vào PostgreSQL local. Chưa có client credentials/Company XID do SePay cấp, nên nút vẫn khóa cho tới khi người vận hành cấu hình `.env`. Chưa có sync/import giao dịch hay production connection. Phần P2 không thay thế yêu cầu JavaScript của môn học.

## 1. Mục tiêu

Cho người dùng liên kết tài khoản ngân hàng để lấy lịch sử giao dịch chỉ đọc. Giao dịch mới được đưa vào sổ tài chính của Ví Mình; người dùng có thể phân loại chúng vào danh mục phù hợp. Khi mô tả giao dịch có mã hóa đơn/mã tham chiếu, hệ thống có thể phân loại tự động nếu mã đó khớp chính xác một quy tắc người dùng đã tạo và bật tự động áp dụng.

Phạm vi không cho phép website khởi tạo thanh toán, chuyển tiền hoặc thay đổi dữ liệu ở ngân hàng. Người dùng chỉ xác thực/chấp thuận trong trang ngân hàng hoặc Hosted Link của provider nếu flow này được thẩm định và thông báo rõ trước đó; không giả định mọi provider đều chuyển thẳng tới domain ngân hàng.

## 2. Luồng người dùng

1. Người dùng mở Cài đặt → Liên kết ngân hàng, xem trạng thái kết nối, phạm vi dữ liệu và danh sách ngân hàng đang được hỗ trợ rồi chọn một ngân hàng.
2. Backend tạo attempt có thời hạn và chỉ dùng một lần. Nếu kết nối Open API trực tiếp bằng OAuth thì dùng redirect URI cố định, state và PKCE theo giao thức; nếu dùng aggregator thì backend tạo link token một lần và mở Hosted Link theo hợp đồng/API provider.
3. Người dùng xác thực và chấp thuận quyền đọc ở trang ngân hàng hoặc Hosted Link đã được công bố rõ ràng. Website không nhận mật khẩu, PIN hay OTP ngân hàng.
4. Backend xác nhận kết quả bằng callback OAuth đã kiểm tra state/code hoặc bằng webhook/chất vấn trạng thái server-to-server của provider. Chỉ luồng OAuth mới đổi authorization code lấy token; Hosted Link không được giả định có callback/token model giống ngân hàng trực tiếp.
5. Người dùng chọn tài khoản ngân hàng, ghép với tài khoản Ví Mình có sẵn hoặc tạo tài khoản ngân hàng nội bộ mới, đồng thời chọn mốc bắt đầu import. Tài khoản nội bộ không bị tạo trùng khi người dùng liên kết lại.
6. Backend đồng bộ theo cursor/thời điểm cuối đã nhận và khử trùng lặp theo ID ngân hàng. Lần import đầu dò các transaction nhập tay có cùng account/ngày/số tiền/chiều; nếu có ứng viên, không ghi thêm ngay mà yêu cầu user ghép vào giao dịch cũ hoặc xác nhận import thêm.
7. Giao dịch có quy tắc khớp duy nhất được phân loại theo cấu hình của người dùng. Những giao dịch còn lại hiển thị ở trạng thái Cần phân loại; người dùng chọn loại giao dịch và danh mục ngay trên danh sách, không cần nhập lại số tiền/ngày/nội dung.
8. Nếu hai giao dịch có dấu hiệu là chuyển giữa các tài khoản của chính người dùng, ứng dụng đề xuất ghép thành Chuyển tiền. Chỉ khi người dùng xác nhận hoặc dữ liệu ngân hàng đủ chắc chắn theo quy tắc đã bật thì mới thay các bản ghi thu/chi tạm bằng một transfer; nếu mơ hồ, giữ trạng thái cần xem lại.
9. Người dùng có thể xem thời điểm đồng bộ gần nhất, đồng bộ lại, thu hồi liên kết và xóa thông tin token của kết nối. Việc xóa lịch sử đã nhập cần xác nhận riêng và phải bảo toàn quy tắc lưu giữ dữ liệu đã chốt.

## 3. Phân loại giao dịch và mã hóa đơn

- Dữ liệu nguồn được chuẩn hóa thành: tài khoản liên kết, chiều tiền vào/ra, số tiền VND, ngày hạch toán, nội dung chuyển khoản, mã giao dịch ngoài ngân hàng và thông tin đối tác nếu ngân hàng trả về.
- Chiều tiền vào/ra chỉ cho biết tiền ghi có/ghi nợ; nó không tự chứng minh đó là thu nhập/chi phí. Hoàn tiền, phí, giao dịch đảo và chuyển giữa hai tài khoản của người dùng cần được nhận diện hoặc xác nhận để không làm sai báo cáo.
- Không suy đoán danh mục chỉ từ một dãy số hóa đơn. Mã hóa đơn chỉ phân loại được khi có thông tin để ánh xạ nó: quy tắc do người dùng tạo, metadata đáng tin cậy từ ngân hàng/nhà cung cấp, hoặc nguồn hóa đơn được tích hợp hợp lệ.
- Quy tắc do người dùng tạo có thể khớp theo mã tham chiếu chính xác, tiền tố mã, hoặc cụm từ người nhận/nội dung. Không cho người dùng nhập regex tùy ý ở phiên bản đầu để tránh biểu thức tốn tài nguyên hoặc khó giải thích.
- Mỗi quy tắc có danh mục, loại giao dịch, cách xử lý (gợi ý hoặc tự áp dụng), trạng thái bật/tắt và độ ưu tiên. Chỉ tự áp dụng khi có đúng một kết quả khớp có độ tin cậy cao; không khớp hoặc nhiều quy tắc xung đột thì để Cần phân loại.
- Tự phân loại có thể sửa lại. Giữ nội dung ngân hàng gốc bất biến; ghi riêng danh mục do người dùng chọn và quy tắc đã áp dụng để truy vết.
- Các giao dịch đã được đối chiếu chưa phân loại vẫn phải phản ánh đúng số dư tài khoản bằng danh mục hệ thống Chưa phân loại riêng cho thu và chi; danh mục này không được đổi tên, lưu trữ hay xóa. Báo cáo phải thể hiện phần chưa phân loại rõ ràng. Ngoại lệ `potential_duplicate` chờ người dùng đối chiếu: giao dịch nhập tay đang là ứng viên vẫn giữ nguyên trong ledger, chưa tạo bút toán import thứ hai.

## 4. Đồng bộ và hành vi near-real-time

- Adapter riêng cho từng ngân hàng/đối tác chuyển phản hồi của họ về một mô hình giao dịch nội bộ thống nhất; không gọi API ngân hàng trực tiếp từ trình duyệt.
- Ưu tiên webhook/sự kiện đẩy nếu đối tác hỗ trợ; nếu không, dùng đồng bộ theo yêu cầu và lịch polling được ngân hàng cho phép. Luôn có nút Đồng bộ ngay và hiển thị thời điểm dữ liệu gần nhất.
- Không quảng cáo realtime tức thời cho mọi ngân hàng. Tần suất, độ trễ, thời gian lưu lịch sử và việc có webhook hay chỉ truy vấn đều phụ thuộc hợp đồng/API của nhà cung cấp.
- Đồng bộ dùng cursor hoặc mốc thời gian chồng lấn an toàn; khóa duy nhất theo tài khoản liên kết + mã giao dịch của ngân hàng bảo đảm retry không tạo giao dịch trùng.
- Nếu API hết hạn token, bị thu hồi, mất kết nối hoặc giới hạn tần suất, báo trạng thái Cần xác thực lại/Lỗi đồng bộ; không xóa dữ liệu đã đồng bộ và không giả báo thành công.

## 5. Dữ liệu bổ sung

Thiết kế chi tiết và ràng buộc đề xuất nằm trong DATABASE_DESIGN.md. Các thực thể mới:

- bank_link_attempts: state hash và PKCE verifier mã hóa, hết hạn nhanh, dùng một lần.
- bank_connections: người dùng, mã ngân hàng/nhà cung cấp, trạng thái consent, scope, thời hạn và lần đồng bộ gần nhất.
- bank_connection_secrets: access/refresh token dạng ciphertext, khóa phiên bản và hạn token; client_secret của ứng dụng không nằm ở đây.
- linked_bank_accounts: tài khoản ngoài được chọn, mã tài khoản ngoài được mã hóa/hash để đối chiếu, số tài khoản đã che và mapping tới accounts nội bộ cùng user.
- bank_sync_runs: trạng thái từng lần đồng bộ, cursor, số bản ghi mới/trùng và mã lỗi an toàn để chẩn đoán.
- bank_feed_transactions: giao dịch nguồn đã chuẩn hóa, mã định danh ngoài duy nhất, trạng thái phân loại, rule khớp và liên kết tới transaction hoặc transfer đã ghi sổ.
- transaction_classification_rules: quy tắc của từng user, gắn category cùng loại và có hành động gợi ý/tự áp dụng.
- categories: thêm category hệ thống Chưa phân loại cho từng user và từng loại thu/chi.

Mọi bảng đều gắn user_id; composite FK ngăn liên kết chéo chủ tài khoản. Bản ghi nguồn ngân hàng được giữ để khử trùng lặp/truy vết; transaction hoặc transfer mới là bút toán ảnh hưởng tới công thức số dư hiện hành. Migrations 005–006 đã dành cho avatar/OTP và siết constraint hồ sơ; không sửa migrations 001–006. Migration 007 hiện lưu consent và lần tạo Hosted Link; schema cho account/feed/sync giao dịch sẽ bắt đầu từ migration 008 trở lên sau khi API transaction được chốt.

## 6. Bảo mật và quyền riêng tư

- Chỉ xin quyền đọc. Không thu mật khẩu, PIN, OTP, cookie hay mã đăng nhập của ngân hàng; không dùng screen scraping.
- Chỉ dùng luồng được provider/ngân hàng công bố và phê duyệt: OAuth/consent redirect với state, redirect URI chính xác, PKCE và callback một lần nếu là Open API trực tiếp; Hosted Link và link token dùng một lần nếu là aggregator. Chống replay cho cả hai luồng.
- Client ID/secret và provider access token cấp ứng dụng chỉ ở backend/secret manager; không gửi xuống frontend. Chỉ mã hóa token cấp user nếu ứng dụng thực sự nhận và cần giữ token đó; khóa mã hóa tách khỏi DB. Không ghi bearer token vào log, analytics hoặc LocalStorage.
- LocalStorage chỉ cache dữ liệu cần render theo user namespace; PostgreSQL vẫn là nguồn chuẩn. Khi đổi user/logout, không thể đọc cache người khác.
- Yêu cầu phạm vi tối thiểu; lưu consent, thời hạn, trạng thái revoke và lịch sử đồng bộ. Có thao tác ngắt kết nối và thu hồi quyền tại ngân hàng nếu API hỗ trợ.
- Mọi import/categorization đều kiểm tra session và user_id; webhook phải xác minh chữ ký/mTLS theo hợp đồng, có chống gửi lại; giới hạn tốc độ và giới hạn khoảng lịch sử.
- Nội dung giao dịch là dữ liệu riêng tư: che số tài khoản đối tác ở UI/log, không cho Admin đọc mô tả giao dịch, không đưa nội dung vào telemetry.

## 7. API nội bộ dự kiến

- GET /api/bank-providers: ngân hàng/đối tác được cấu hình cho môi trường hiện tại.
- POST /api/bank-connections/:provider/connect: tạo OAuth attempt (state/PKCE theo giao thức) hoặc Hosted Link token một lần. Chỉ trả/open URL Hosted Link khi đã qua cổng token/browser tại mục 11.5; nếu không thì provider này chưa đủ điều kiện triển khai.
- GET /api/bank-connections/callback/:provider: nhận browser return nếu flow dùng callback; chỉ cập nhật trạng thái sau xác minh server-side, không trả code/token cho frontend.
- POST /api/bank-connections/webhooks/:provider: nhận webhook, kiểm tra chữ ký/replay và xử lý idempotent; chỉ bật cho provider đã cấu hình.
- GET /api/bank-connections; DELETE /api/bank-connections/:id: liệt kê/ngắt kết nối và thu hồi consent.
- GET /api/bank-connections/:id/accounts; POST /api/bank-accounts/:id/link: chọn tài khoản và mapping tới tài khoản nội bộ.
- POST /api/bank-connections/:id/sync: đồng bộ thủ công; webhook/scheduled job là các đầu vào bổ sung cùng service.
- GET /api/bank-feed?status=&from=&to=: xem giao dịch nhập và lọc trạng thái.
- PATCH /api/bank-feed/:id/classification: chọn loại/danh mục hoặc xác nhận chuyển tiền; server cập nhật ledger nguyên tử.
- GET/POST/PATCH/DELETE /api/transaction-classification-rules: CRUD rule theo user.

Danh sách ngân hàng chỉ lấy từ cấu hình server đã được onboarding, không nhận base URL tùy ý từ client để tránh SSRF và giả mạo nhà cung cấp.

## 8. Giai đoạn và cổng triển khai

| Giai đoạn | Phạm vi | Điều kiện qua cổng |
|---|---|---|
| P2.1 — Chốt tích hợp | Chọn ngân hàng/đối tác, rà API AIS, consent, sandbox, giới hạn lịch sử và yêu cầu hợp đồng/TPP | Đã đối chiếu danh sách 10 ngân hàng Bank Hub công bố và năng lực cá nhân; chưa chốt provider/ngân hàng kết nối đầu tiên, chưa có tài liệu onboarding/sandbox cho Ví Mình; hỏi giảng viên trước khi đưa phần này thành bắt buộc |
| P2.2 — Chốt cơ sở dữ liệu | Rà ERD, ràng buộc ownership, giao dịch chưa phân loại, deduplication, rules và token storage; tự review trước khi viết migration | Thiết kế chi tiết ở DATABASE_DESIGN.md; vẫn là bản provider-neutral cho tới khi chốt ngân hàng |
| P2.3 — Thiết kế Figma | Bộ SVG review cục bộ theo UI xanh dương: Settings, consent, chọn ngân hàng, connected, re-auth và mobile | Người dùng đã duyệt bản SVG cục bộ; file Figma thật chưa được cập nhật do quota/seat; SVG chọn ngân hàng được cập nhật theo catalog Bank Hub và kiểu chọn một ngân hàng, chưa đủ để giả định provider hoặc triển khai kết nối thật |
| P2.4 — Sandbox | Migration 007 cho consent/attempt Hosted Link đã áp dụng; API giao dịch, webhook và sync sẽ dùng migration 008+ | Chỉ dùng sandbox; rà callback/webhook giả mạo/replay, giao dịch trùng, quyền chéo user, sửa phân loại và chuyển tiền trước các mốc sau |
| P2.5 — Dữ liệu thật | Tích hợp production, token mã hóa, lịch sync/webhook theo hợp đồng, vận hành/giám sát | TPP-ID/hợp đồng/credentials/certificates và phê duyệt bảo mật của ngân hàng/đối tác đã có; không demo thật trước cổng này |

Không bắt đầu luồng kết nối thật hoặc migration vào DB đang dùng trước khi user review thiết kế và xác nhận ngân hàng/đối tác đích. Sau khi người dùng duyệt SVG review cục bộ và yêu cầu dùng danh sách Bank Hub, Settings có thể hiển thị một bộ chọn duy nhất với phạm vi từng ngân hàng. Catalog tĩnh này không phải danh sách server allowlist để kết nối; không mở luồng kết nối giả và không giả lập kết nối thành công.

## 9. Tiêu chí nghiệm thu tính năng

- Người dùng chỉ thấy kết nối, tài khoản và feed của mình; Admin không xem thông tin giao dịch.
- Với Open API trực tiếp, redirect đúng domain chính thức của ngân hàng; với aggregator, chỉ mở domain Hosted Link đã xác nhận và thông báo cho người dùng trước. App không có trường nhập password/PIN/OTP ngân hàng.
- Callback từ chối state sai/hết hạn, code replay hoặc provider không nằm trong allowlist.
- Sync lặp lại cùng dữ liệu không tạo transaction/transfer trùng; phát hiện ứng viên có thể trùng với giao dịch nhập tay và yêu cầu xác nhận ghép/import; cursor/lỗi được hiển thị trung thực.
- Mọi giao dịch chưa phân loại đã qua đối chiếu hiện rõ và ảnh hưởng balance đúng một lần; giao dịch tiềm năng trùng chờ quyết định không tạo bút toán thứ hai; đổi category cập nhật báo cáo/ngân sách; chuyển nội bộ không bị tính thành thu/chi.
- Rule chính xác duy nhất hoạt động theo chế độ gợi ý/tự áp dụng; xung đột/thiếu thông tin vẫn cần người dùng xem.
- Thu hồi liên kết chặn lần đồng bộ tiếp theo, xóa token theo chính sách và giữ lịch sử theo lựa chọn đã công bố.
- LocalStorage không chứa credential/token; cache tách user; UI dùng JavaScript thuần ES6+ và responsive.
- Thử nghiệm được trên sandbox của nhà cung cấp; không nhận nghiệm thu production từ screenshot/mock data.

## 10. Thuật ngữ và nguồn

- **Open API/AIS:** API ngân hàng cho phép bên thứ ba truy vấn thông tin tài khoản/giao dịch trong phạm vi đã được khách hàng chấp thuận.
- **TPP-ID:** mã định danh bên thứ ba; Phụ lục kỹ thuật Thông tư 64 nêu mã số thuế hợp lệ, còn hoạt động ở Việt Nam.
- **OAuth 2.0 Authorization Code + PKCE:** luồng đưa người dùng sang ngân hàng cấp quyền, rồi trả authorization code dùng một lần về callback; backend đổi code lấy token.
- **Webhook:** ngân hàng/đối tác chủ động gọi endpoint đã đăng ký khi phát sinh sự kiện; chỉ coi là realtime nếu nhà cung cấp hỗ trợ và SLA xác nhận.
- **Idempotency:** nhận lại cùng một bản ghi do retry nhưng chỉ ghi một lần nhờ mã giao dịch ngoài và unique constraint.

Nguồn kỹ thuật/pháp lý đã tham khảo (ngày truy cập 15/10/2026):

1. [Thông tư 64/2024/TT-NHNN — Cơ sở dữ liệu văn bản pháp luật](https://vbpl.vn/nganhangnhanuoc/Pages/vbpq-toanvan.aspx?ItemID=174547): danh mục Open API AIS và hợp đồng giữa ngân hàng với bên thứ ba; văn bản đang có hiệu lực theo trang nguồn.
2. [Phụ lục kỹ thuật Open API — Cổng dữ liệu Chính phủ](https://datafiles.chinhphu.vn/cpp/files/vbpq/2025/01/64-nhnn-kem.pdf): TPP-ID, client_id/client_secret, OAuth 2.0 và PKCE theo phạm vi API.
3. [OCB Developer Portal — Thông tin tài khoản & giao dịch](https://developer.api.ocb.com.vn/corporates/v2/vi/product/3272): ví dụ API đối tác truy vấn tài khoản, số dư và lịch sử giao dịch; điều kiện chính thức phụ thuộc onboarding OCB.
4. [VietinBank Open API](https://openapi.vietinbank.vn/): ví dụ API thông báo biến động số dư theo thời gian thực trong tích hợp khách hàng/đối tác.

Các trang ngân hàng là ví dụ về khả năng API, không chứng minh dự án Ví Mình đã được cấp quyền, có hợp đồng, sandbox credential hoặc có thể đọc tài khoản người dùng.

## 11. Lộ trình triển khai chi tiết được đề xuất

### 11.1 Hướng tích hợp cần thẩm định

**Ứng viên ưu tiên để khảo sát:** SePay Bank Hub, chưa phải provider đã được chọn hoặc onboard. Tài liệu của SePay mô tả Hosted Link/WebView do SePay cung cấp, API tạo link token một lần, REST API và webhook. Vì giao diện Hosted Link là của SePay, hành trình thực tế có thể là Ví Mình → Hosted Link SePay → bước xác thực/ủy quyền của ngân hàng → quay lại Ví Mình; không được cam kết người dùng luôn chuyển thẳng tới một trang do ngân hàng sở hữu cho đến khi xác minh từng ngân hàng.

| Phương án | Điểm phù hợp | Điều kiện/giới hạn phải xác minh | Đánh giá ban đầu |
|---|---|---|---|
| SePay Bank Hub | Một Hosted Link và API tập trung phù hợp ý tưởng bấm “Liên kết ngân hàng”, chọn ngân hàng, xác thực rồi quay lại ứng dụng; tài liệu có nêu sandbox, webhook và hỗ trợ tài khoản cá nhân ở một số ngân hàng | Hợp đồng/onboarding, quyền đọc lịch sử tài khoản cá nhân, độ sâu lịch sử, sandbox thực tế, cơ chế thu hồi, thời gian webhook, phí và domain/branding của Hosted Link. Danh sách và khả năng theo ngân hàng có thể thay đổi | Khảo sát đầu tiên; chỉ tiến tiếp nếu xác minh được dữ liệu ghi nợ lẫn ghi có cho loại tài khoản người dùng cần |
| Open API trực tiếp từng ngân hàng | Luồng chấp thuận có thể do chính ngân hàng cung cấp; ít phụ thuộc aggregator | Mỗi ngân hàng có API, hợp đồng, sandbox, chứng thư và quy trình onboarding riêng. Thông tư 64/2024/TT-NHNN yêu cầu hợp đồng giữa ngân hàng và bên thứ ba, quy định mục đích/phạm vi xử lý và bảo mật | Phương án thay thế nếu Bank Hub không đáp ứng; phạm vi MVP phải giới hạn vào một ngân hàng |

Theo tài liệu công khai **SePay Bank Hub** đã kiểm tra ngày 16/10/2026, các ngân hàng dưới đây được công bố với loại tài khoản cá nhân. Danh sách này là snapshot tài liệu, không phải allowlist hay xác nhận rằng Ví Mình đã được cấp quyền kết nối.

| Ngân hàng | Phạm vi tài khoản cá nhân được công bố | Ý nghĩa với quản lý chi tiêu |
|---|---|---|
| VPBank | VPBank NEO; tài khoản chính; đồng bộ tiền vào | Chưa có giao dịch tiền ra theo phạm vi tài liệu |
| TPBank | Tài khoản chính; tiền vào, tiền ra và số dư | Có thể theo dõi cả thu và chi nếu sandbox/onboarding xác nhận |
| VietinBank | Tài khoản chính; tiền vào, tiền ra và số dư | Có thể theo dõi cả thu và chi nếu sandbox/onboarding xác nhận |
| ACB | Tài khoản chính; tiền vào và tiền ra | Có thể theo dõi cả thu và chi nếu sandbox/onboarding xác nhận |
| BIDV | Chỉ tiền vào qua Virtual Account (VA); không phải tài khoản chính | Không đủ để tự động theo dõi chi từ tài khoản chính |
| MBBank | Tài khoản chính; tiền vào và tiền ra | Có thể theo dõi cả thu và chi nếu sandbox/onboarding xác nhận |
| OCB | Chỉ tiền vào qua VA | Không đủ để tự động theo dõi chi từ tài khoản chính |
| KienLongBank | Chỉ tiền vào qua VA | Không đủ để tự động theo dõi chi từ tài khoản chính |
| MSB | Chỉ tiền vào qua VA | Không đủ để tự động theo dõi chi từ tài khoản chính |
| Sacombank | Tài khoản chính; tiền vào và tiền ra | Có thể theo dõi cả thu và chi nếu sandbox/onboarding xác nhận |

Vietcombank (VCB) không xuất hiện trong danh sách Bank Hub được công bố hiện tại nên không có trong bộ chọn. Tài liệu công khai không mô tả endpoint catalog để app lấy danh sách ngân hàng tự động; Settings hiện dùng catalog tĩnh được đối chiếu với trang tổng quan và cần cập nhật khi SePay thay đổi công bố. Nút **Kết nối [ngân hàng]** giữ khóa cho tới khi provider cấp quyền/sandbox và hoàn tất rà soát. API tạo Link Token được công bố không có trường bank code; chưa có căn cứ hứa rằng Hosted Link sẽ mở thẳng ngân hàng đã chọn, nên người dùng có thể phải chọn lại trong Hosted Link nếu provider không hỗ trợ preselect.

### 11.2 Cổng P2.1 — xác minh provider và ngân hàng đầu tiên

Trước khi vẽ flow chi tiết hoặc viết integration, lấy câu trả lời và tài liệu chính thức cho các mục sau:

1. **Đối tượng và quyền truy cập:** tài khoản cá nhân của người dùng có được hỗ trợ không; quyền là AIS/read-only; có trả đủ ghi nợ, ghi có, phí, hoàn tiền và giao dịch đảo không; không yêu cầu quyền tạo thanh toán/chuyển tiền.
2. **Dữ liệu:** độ sâu lịch sử import lần đầu, định nghĩa ngày giao dịch/ngày hạch toán, mã giao dịch ngoài ổn định, nội dung/mã tham chiếu, số dư, tiền tệ, phân trang và cursor.
3. **Sandbox:** có sandbox truy cập được cho tài khoản cá nhân và đúng ngân hàng dự kiến không; có mô phỏng hủy, từ chối consent, hết hạn link, lỗi sync, giao dịch trùng, hoàn tiền và revoke không.
4. **Độ trễ/vận hành:** webhook có cho mọi giao dịch debit/credit hay không; độ trễ/SLA, retry, xác minh chữ ký, sự kiện lặp, polling được phép, rate limit và cách phát hiện sự kiện bị bỏ lỡ.
5. **Consent và vòng đời:** người dùng thấy tên bên nhận dữ liệu và scopes nào; consent hết hạn khi nào; người dùng thu hồi ở đâu; provider báo trạng thái revoke thế nào; cần xác thực lại trong tình huống nào.
6. **Hosted Link:** domain hiển thị, giao diện/branding, desktop/mobile, redirect URI, callback/webhook xác nhận cuối cùng, link hết hạn/dùng một lần, có được mở bằng top-level redirect hay SDK/WebView không, URL có chứa bearer/link token không và các biện pháp hạn chế lộ qua history/referrer/analytics.
7. **Điều kiện dự án:** tài khoản thử nghiệm/đối tác có thể cấp cho đồ án cá nhân không; yêu cầu pháp lý/hợp đồng/đánh giá bảo mật; chi phí, giới hạn sử dụng, lưu giữ/xóa dữ liệu và hỗ trợ khiếu nại. So với quy tắc hiện tại trong `AGENTS.md`, đặc biệt việc không đưa bank/link token vào response browser.

**Điều kiện qua cổng:** có credential/Company XID sandbox thật; xác nhận ngân hàng/tài khoản test, quyền, độ trễ, lịch sử, revoke và hostname Hosted Link trả về; xác định điều kiện giảng viên nếu P2 được đưa vào bài chấm. Người dùng đã duyệt ngoại lệ hẹp: chỉ URL Hosted Link vừa tạo được gửi tới browser qua HTTP 303 one-time, không JSON; Link Token/access token/client secret vẫn backend-only. Code kiểm tra HTTPS, host `bankhub.sepay.vn` và path `/link/<id>`; nếu sandbox trả host khác, redirect sẽ bị từ chối tới khi host đó được xác minh. Không dùng dữ liệu thật ở mốc sandbox.

### 11.3 Hành trình kỹ thuật mục tiêu khi provider được chọn

1. Người dùng mở **Cài đặt → Liên kết ngân hàng**. Trước khi chuyển đi, Ví Mình giải thích dữ liệu sẽ đọc, mục đích, phạm vi, thời gian đồng bộ và cách ngắt liên kết. Consent ngân hàng là lựa chọn riêng, không gộp với checkbox Điều khoản/Thông báo quyền riêng tư lúc đăng ký. Quản lý trạng thái/revoke ở Settings; giao dịch đã nhập và việc phân loại nằm ở Giao dịch.
2. Frontend gọi API same-origin. Backend kiểm tra session, bank trong allowlist, consent riêng, redirect URI cố định và attempt đang chờ. Backend tạo attempt ngắn hạn, lưu hash của launch handle và mã hóa Link Token/Hosted Link URL. Browser nhận cookie HttpOnly một lần cùng đường dẫn same-origin cố định; endpoint launch tiêu thụ handle rồi trả 303 tới URL SePay đã allowlist. Không nhận base URL/redirect URL tùy ý từ browser; ngoại lệ redirect được ghi trong `AGENTS.md` và [BANK_CONSENT.md](BANK_CONSENT.md).
3. Trình duyệt mở Hosted Link hoặc trang ủy quyền chính thức theo phương thức provider/ngân hàng đã xác nhận. Ví Mình không hiển thị hoặc nhận password, PIN, OTP, cookie hay mã đăng nhập ngân hàng.
4. Redirect về ứng dụng chỉ là trạng thái giao diện. Backend xác minh kết quả qua webhook chữ ký hợp lệ hoặc truy vấn trạng thái server-to-server; không coi tham số query/ảnh chụp màn hình là bằng chứng liên kết thành công. Callback sai, lặp, hết hạn hoặc không khớp attempt bị từ chối.
5. Sau khi xác nhận, người dùng chọn tài khoản ngân hàng, ghép với tài khoản Ví Mình hoặc tạo tài khoản nội bộ, rồi chọn ngày bắt đầu import. Hiển thị rõ chỉ tiền vào, chỉ tiền ra hay cả hai được provider trả.
6. Sync nhận webhook nếu được hỗ trợ và có thao tác **Đồng bộ ngay**. Job/API server chuẩn hóa bản ghi, deduplicate theo ID ngoài, đánh dấu lần chạy; redirect thành công không tự đồng nghĩa là lịch sử đã đồng bộ đủ.
7. Giao dịch không khớp quy tắc vào inbox **Cần phân loại**. Người dùng phân loại trực tiếp và có thể tạo quy tắc theo mã tham chiếu chính xác. Xung đột, hoàn tiền, phí, giao dịch đảo, giao dịch có thể trùng và chuyển nội bộ đều cần xử lý riêng; không suy ra danh mục chỉ từ một chuỗi số.
8. Người dùng có thể đồng bộ lại, xem lỗi/cần xác thực lại, thu hồi liên kết, xóa credentials server theo chính sách và tùy chọn xóa dữ liệu đã import sau cảnh báo riêng.

### 11.4 Kế hoạch công việc và tiêu chí hoàn thành từng mốc

| Mốc | Công việc | Tài liệu/kết quả tạo ra | Điều kiện hoàn tất |
|---|---|---|---|
| P2.1A — khảo sát | So sánh Bank Hub với API ngân hàng trực tiếp; xác nhận tài khoản cá nhân, sandbox, consent, webhook, SLA, chi phí và onboarding; hỏi giảng viên về phạm vi mở rộng | Đã có ma trận sơ bộ cho 10 ngân hàng Bank Hub công bố. Câu trả lời onboarding, API trực tiếp cho tài khoản cá nhân và quyết định provider vẫn chưa có | Chưa qua cổng cho tới khi có tài liệu API, sandbox và ngân hàng đầu tiên được provider xác nhận |
| P2.1B — chốt nghiệp vụ | Chốt chỉ đọc, giao dịch nào được import, ngày bắt đầu, ngân sách lịch sử, trùng, chưa phân loại, rule hóa đơn, hoàn tiền và transfer | Decision log/luồng nghiệp vụ cập nhật trong tài liệu này | Mỗi chiều giao dịch, ngoại lệ và cách người dùng sửa tự động phân loại đều rõ |
| P2.2 — rà DB | Đối chiếu `DATABASE_DESIGN.md` với API thật; xác định provider credential cấp ứng dụng so với secret từng kết nối người dùng; kiểm tra ID sự kiện ngoài, consent, trạng thái revoke, retention, mapping và unique/FK | DB design provider-specific, ERD và migration checklist | Không giả định SePay token là token ngân hàng của từng user; không tạo migration cho tới khi mô hình được duyệt |
| P2.3 — thiết kế Figma | Dựng desktop/tablet/mobile trong Cài đặt → Liên kết ngân hàng: giới thiệu quyền và consent; chọn provider/ngân hàng; Hosted Link/redirect; quay lại thành công/hủy/lỗi; chọn tài khoản; trạng thái sync; liên kết sang inbox Giao dịch; rule; nghi trùng/ghép transfer; re-auth; revoke và xóa dữ liệu | SVG review draft hiện có: Settings overview, consent, chọn ngân hàng minh họa, connected, mobile và re-auth/error; còn thiếu redirect/provider-specific, inbox/rule/duplicate states và bản nhập vào Figma. Người dùng đã duyệt bộ SVG cục bộ ngày 16/10/2026 | Đã đủ điều kiện triển khai trạng thái Settings chưa khả dụng; file Figma thật chưa được cập nhật và không có nghĩa provider/luồng kết nối đã được chọn hoặc xác nhận |
| P2.4 — nền tảng DB | Đã tạo migration 007 cho consent và attempt Hosted Link; migration mới 008+ sẽ dành cho account/feed/sync sau khi chốt API transaction | Migration versioned; migration 007 chưa tạo dữ liệu tài chính hay bảng feed | Không sửa 001–006; xác minh constraint ownership, thời hạn và one-time handle |
| P2.5 — backend sandbox | Viết provider adapter server-side; tạo link; validate webhook; lưu state/token theo đúng model; sync cursor/paging; chống replay và retry; mapping; import nguyên tử; API inbox/rule/revoke; giới hạn quyền và log sạch | API và adapter cho đúng một provider/ngân hàng; `.env.example` chỉ có tên biến | Chỉ dùng sandbox; không log secrets/raw payload; callback/webhook và job retry không ghi trùng hay ghi chéo user |
| P2.6 — UI và nghiệp vụ | Đã thêm consent riêng, readiness API, CTA khóa theo config và lựa chọn bank; sau khi link được xác nhận mới triển khai quản lý kết nối, sync/revoke và inbox phân loại | Settings mở Hosted Link sandbox qua backend; transaction import/inbox/rules chưa triển khai | Không có nút giả; browser không nhận access token/Link Token trong JSON; chỉ URL Hosted Link qua redirect ngoại lệ đã duyệt |
| P2.7 — nghiệm thu sandbox | Đối chiếu DB và giao diện qua liên kết, hủy, revoke, reauth, sync lại, webhook lặp, lỗi mạng, phân loại, duplicate, transfer và đổi user | Bảng bằng chứng theo kịch bản, không dùng screenshot giả làm bằng chứng provider | Từng tình huống có kết quả server/DB nhất quán; chỉ báo dữ liệu sandbox là sandbox |
| P2.8 — cổng production | Hoàn tất hợp đồng/phê duyệt, credential production, domain HTTPS/callback, quản lý khóa, retention/deletion, privacy/security review, vận hành sự cố và support | Checklist phát hành và quy trình vận hành | Chỉ mở cho dữ liệu thật khi provider và các bên liên quan duyệt; nếu không đủ điều kiện thì giữ P2 ở sandbox |

### 11.5 DB và bảo mật — điểm cần chốt trước migrations giao dịch 008+

- Tách **credential ứng dụng Ví Mình ↔ provider** (client secret/access token cấp công ty) khỏi **định danh liên kết của từng người dùng**. Chỉ thêm `bank_connection_secrets` cho token cấp user nếu tài liệu API xác nhận Ví Mình thực sự nhận và phải giữ token đó; nếu provider giữ ủy quyền thì lưu provider connection/account IDs và trạng thái, không nhân bản credential cấp công ty vào mỗi connection.
- Hosted Link URL/Link Token có thể là thông tin bearer dùng một lần. Người dùng đã duyệt ngoại lệ hẹp cho redirect top-level. Không trả URL/Link Token qua JSON; endpoint launch lấy URL mã hóa từ DB, tiêu thụ cookie handle một lần, validate host/path, xóa URL ciphertext và trả 303 kèm `Referrer-Policy: no-referrer`, `Cache-Control: no-store`. Không ghi log/analytics/LocalStorage/referrer. Exact sandbox host cần xác nhận khi có credentials; code fail closed nếu khác host allowlist.
- Lưu consent riêng gồm provider/bank, scopes đã cấp, phiên bản nội dung, thời điểm, nguồn/attempt, thời điểm revoke và bằng chứng provider. Không lấy checkbox chấp nhận Terms/Privacy lúc signup làm consent ngân hàng.
- Webhook cần xác minh đúng theo tài liệu provider (chữ ký, timestamp, key rotation, IP allowlist hoặc mTLS nếu hợp đồng quy định), khóa idempotency và chống replay. Không đưa nội dung giao dịch vào log, telemetry hoặc Admin.
- Giữ dữ liệu LocalStorage theo yêu cầu đồ án nhưng ở mức tối thiểu để render; không cache credential, link token, raw response, mã tài khoản ngoài hay số tài khoản chưa che. Dữ liệu giao dịch đã nhập dùng cache namespace user và phải xóa khi logout theo quy tắc hiện tại.
- Kiểm tra chính sách lưu/xóa giao dịch sau unlink và yêu cầu quyền riêng tư trước khi thu thập dữ liệu thật. Admin chỉ nhận số liệu tổng hợp cần thiết và không được xem feed cá nhân.

### 11.6 Ranh giới với đề môn học và nguồn đã kiểm tra

Bank linking là **P2 mở rộng**, chưa phải chức năng bắt buộc của đề và chưa có xác nhận giảng viên cho phần này. Frontend vẫn dùng HTML/CSS/JavaScript ES6+ thuần, DOM, Array/Object và LocalStorage như `ASSIGNMENT_REQUIREMENTS.md`; API, provider adapter và PostgreSQL chỉ bổ sung phía server. Toàn bộ yêu cầu P0/P1 hiện có phải tiếp tục hoạt động nếu provider sandbox không dùng được.

Thông tư 64/2024/TT-NHNN liệt kê API lấy sự đồng ý, danh sách/chi tiết tài khoản và lịch sử giao dịch; quy định quan hệ hợp đồng giữa ngân hàng với bên thứ ba, mục đích/phạm vi dữ liệu, bảo mật và chức năng tra cứu/thu hồi consent. Trước dữ liệu thật cần đối chiếu văn bản hiện hành, hợp đồng và yêu cầu provider/ngân hàng với người có trách nhiệm; phần này không thay cho rà soát pháp lý chính thức. Luật Bảo vệ dữ liệu cá nhân cũng là cổng privacy bắt buộc phải rà soát trước production.

Nguồn provider/pháp lý đã kiểm tra ngày 16/10/2026:

1. [SePay Bank Hub — tổng quan, Hosted Link, hỗ trợ ngân hàng và sandbox](https://developer.sepay.vn/vi/bankhub/tong-quan). Trang ghi rõ phạm vi ngân hàng thay đổi và yêu cầu liên hệ SePay để biết thông tin cập nhật.
2. [SePay Bank Hub — API tạo Link Token](https://developer.sepay.vn/vi/bankhub/api/link-token/tao-link-token). Backend gọi API tạo link; Link Token một lần/có hạn; dùng `hosted_link_url`; tài liệu mô tả redirect và webhook thông báo kết quả.
3. [SePay Bank Hub — bắt đầu nhanh](https://developer.sepay.vn/vi/bankhub/bat-dau-nhanh). Tích hợp yêu cầu `client_id`, `client_secret`, `company_xid` và backend; Hosted Link URL được nhúng/mở ở frontend. Payload API được công bố không có trường chọn sẵn ngân hàng.
4. [SePay Bank Hub — sandbox](https://developer.sepay.vn/vi/bankhub/thong-tin-sandbox). Sandbox tách khỏi production; quyền client sandbox cần được provider cấp.
5. [SePay Bank Hub API — danh sách endpoint](https://developer.sepay.vn/vi/bankhub/api/tong-quan-api). Danh sách endpoint công khai không có API catalog để liệt kê các ngân hàng được hỗ trợ; cần cập nhật catalog tĩnh theo tài liệu tổng quan hoặc câu trả lời trực tiếp từ SePay.
6. [SePay Webhooks — ngân hàng nào được hỗ trợ](https://developer.sepay.vn/vi/sepay-webhooks/tai-khoan-ngan-hang). Tài liệu về webhook có thể khác với phạm vi Bank Hub/AIS; không dùng thay xác nhận quyền truy cập feed.
7. [SePay changelog](https://developer.sepay.vn/vi/changelog). VCB được nhắc ở phạm vi sản phẩm/tài khoản khác, không dùng làm bằng chứng feed cá nhân trong Bank Hub.
8. [Thông tư 64/2024/TT-NHNN — toàn văn PDF chính thức](https://datafiles.chinhphu.vn/cpp/files/vbpq/2025/01/64-nhnn.pdf), đặc biệt Điều 3, 4, 6, 8, 11 và ngày hiệu lực ở Điều 14.
9. [Luật 91/2025/QH15 — Luật Bảo vệ dữ liệu cá nhân](https://vanban.chinhphu.vn/?classid=1&docid=214590&pageid=27160&typegroup=).

10. [SePay — API tạo Access Token](https://developer.sepay.vn/vi/bankhub/api/tao-token): Basic Auth từ `client_id/client_secret`; access token ngắn hạn, chỉ gọi ở backend.
11. [SePay — Sandbox Bank Hub](https://developer.sepay.vn/vi/bankhub/thong-tin-sandbox): base URL sandbox, credential riêng do SePay cấp và catalog tài khoản mẫu.
12. [SePay — API lấy chi tiết Link Token](https://developer.sepay.vn/vi/bankhub/api/link-token/thong-tin-link-token): server có thể kiểm tra trạng thái, phiên và events bằng Link Token.
13. [SePay — Webhook Events](https://developer.sepay.vn/vi/bankhub/webhook-event): `BANK_ACCOUNT_LINKED` và trạng thái phiên; webhook cần endpoint công khai/chữ ký trước production.

### 11.7 Trạng thái triển khai SePay Bank Hub sandbox

- `server/routes/bank-hub-routes.js`: status, bắt đầu link, cookie launch handle một lần, redirect 303 và kiểm tra trạng thái Link Token server-to-server.
- `server/services/sepay-bankhub-service.js`: access token Basic Auth ở backend, create/get Link Token, AES-256-GCM, upstream redirect bị tắt và Hosted Link allowlist.
- `server/db/migrations/007_bank_hub_link_flow.sql`: consent version `1.0.0`, attempt ownership/FK, expiry, one-time handle, trạng thái và tối đa 4 số cuối.
- `docs/BANK_CONSENT.md`: nội dung consent riêng theo ngân hàng; `public/legal.html` và `LEGAL_VERSIONS` đã nâng lên `1.1.0` để mô tả mốc sandbox.
- Nút vẫn khóa nếu thiếu `SEPAY_BANKHUB_CLIENT_ID`, `SEPAY_BANKHUB_CLIENT_SECRET`, `SEPAY_BANKHUB_COMPANY_XID` hoặc khóa mã hóa 32 byte. Các giá trị do SePay cấp/tạo và phải cấu hình tại máy local, không gửi trong chat.
- Tài khoản sandbox hiện có mẫu cho MBBank, ACB, BIDV, VietinBank, OCB, KienLongBank, VPBank và Sacombank. TPBank/MSB có trong catalog Bank Hub công bố nhưng chưa có tài khoản mẫu sandbox; backend từ chối hai ngân hàng này ở môi trường sandbox.
- Ngoài phạm vi mốc: webhook public/chữ ký, danh sách tài khoản, sync giao dịch, inbox phân loại, revoke/unlink trong Ví Mình và production. Không gọi kết quả link là đồng bộ/realtime giao dịch.

**Trạng thái hiện tại:** Settings có catalog 10 ngân hàng được Bank Hub công bố; VCB không có trong catalog. Backend sandbox chỉ cho phép 8 ngân hàng có tài khoản mẫu. API start/redirect/status và migration 007 đã được tạo. Nút tự bật sau khi đủ biến SEPAY_BANKHUB và consent riêng; file `.env` hiện tại chưa có các biến này. Sau khi có SePay credentials, lần gọi thật mới xác minh response/host allowlist. Người dùng có thể phải chọn lại ngân hàng trong Hosted Link vì API tạo link không có trường preselect. Có thể xác nhận link, nhưng chưa đồng bộ giao dịch. Bộ SVG cục bộ `docs/figma/08*.svg` đã được duyệt; không có thay đổi Figma MCP ở mốc này.



