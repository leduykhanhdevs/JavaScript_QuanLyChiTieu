# Kế hoạch tích hợp AI Agent cho Ví Mình

**Trạng thái (2026-11-11):** đã triển khai widget gọn, hướng dẫn nội bộ, CTA điều hướng, phân tích câu lệnh giao dịch/danh mục trong trình duyệt, ghi qua API hiện có và xuất Excel/PDF từ Agent. AI Coach hiện trả lời một số câu hỏi về chi/thu, danh mục, tài khoản, ngân sách, mục tiêu, dự báo và cảnh báo từ snapshot người dùng. Chưa kết nối nhà cung cấp AI sinh nội dung. Layout Agent export tại [Figma node 83:2](https://www.figma.com/design/vvXG33wbITaw5QZgGOKAgZ/V%C3%AD-M%C3%ACnh-%E2%80%94-Qu%E1%BA%A3n-l%C3%BD-chi-ti%C3%AAu-c%C3%A1-nh%C3%A2n?node-id=83-2) đã được duyệt.

## 0. Đã triển khai

- Widget 52 × 52 px khi thu gọn; panel nổi desktop 340 × 470 px, mobile tối đa khoảng 350 × 416 px/55vh, không có backdrop và không làm thay đổi bố cục trang. Hỗ trợ đóng, xóa hội thoại, Escape, Enter/Shift+Enter, focus và trạng thái reduced-motion.
- Nội dung trợ giúp cục bộ cho các màn hình chính, khu vực Admin theo vai trò, quy tắc số dư/chuyển khoản nội bộ, mục tiêu, ngân sách, định kỳ, báo cáo, danh mục và giới hạn SePay. CTA chỉ dùng view/action allowlist có sẵn.
- Parser tại trình duyệt nhận các mẫu số tiền VND, ngày/giờ, thu/chi và tên/alias danh mục. Nếu tài khoản hoặc danh mục còn mơ hồ, hỏi người dùng; nếu rõ, tạo giao dịch qua `/api/transactions`. Câu lệnh tạo danh mục cần tên và loại thu/chi rõ, sau đó dùng `/api/categories`.
- Chỉ báo thành công sau response API có id. Thời điểm trong ngày được giữ trong ghi chú vì bảng giao dịch hiện chỉ lưu ngày. Lỗi hiển thị thành khối đỏ nhạt; thành công là khối xanh lá nhạt.
- AI Coach xử lý snapshot tại trình duyệt: tổng hợp theo hôm nay/hôm qua/7 ngày gần nhất/tuần này/tháng này/tháng trước/tháng-năm cụ thể; lọc theo danh mục/tài khoản; đọc số dư có dấu; trả lời về ngân sách, mục tiêu, dự báo và cảnh báo kèm CTA.
- Agent Admin được triển khai riêng trong khu vực Admin, chỉ phân tích số liệu tổng hợp từ API được bảo vệ. Xem `docs/SMART_FINANCE_PLAN.md`; không có quyền đọc chi tiết giao dịch cá nhân và không được bịa doanh thu.
- Hội thoại ở RAM trình duyệt, được giữ khi thu gọn panel và xóa khi đăng xuất, tải lại trang hoặc nhấn Xóa cuộc trò chuyện. Không lưu transcript vào LocalStorage/PostgreSQL và không gửi câu hỏi/lệnh cho model bên ngoài.
- Chưa có generative AI, endpoint `/api/assistant/chat`, câu trả lời mở rộng cho câu hỏi ngoài catalog, hay consent/API key nhà cung cấp. Đây là giới hạn hiện tại và cần một bước riêng trước khi bật dịch vụ AI bên ngoài.

## 1. Mục tiêu

Thêm bong bóng trợ lý cố định ở góc dưới bên phải để người dùng hỏi cách sử dụng Ví Mình bằng tiếng Việt. Trợ lý hiểu các màn hình, quy tắc nghiệp vụ, giới hạn tính năng và hướng dẫn trong tài liệu trợ giúp; câu trả lời đưa ra đường dẫn hoặc nút mở đúng trang/chức năng.

Ví dụ: khi người dùng hỏi “Tôi muốn đặt mục tiêu tiết kiệm tiền”, Agent giải thích các bước ngắn gọn và đưa hai lựa chọn **Xem mục tiêu** / **Tạo mục tiêu**. CTA hướng dẫn vẫn chỉ mở form hiện có; người dùng tự nhập và xác nhận lưu.

**Mở rộng theo yêu cầu ghi dữ liệu bằng câu lệnh tự nhiên:** Agent nhận các câu rõ ý như “Hôm nay 10h tôi đi ăn hết 100k” hoặc “Tạo danh mục chi tiêu Thú cưng”. Bộ phân tích lệnh chạy cục bộ, chuyển thành payload có kiểu cố định, rồi dùng API giao dịch/danh mục hiện có. Khi đủ tin cậy và đủ trường bắt buộc, Agent tự ghi rồi đọc lại chính xác dữ liệu đã được server lưu; không báo thành công trước response API. Nếu số tiền, ngày, danh mục hoặc tài khoản còn mơ hồ thì hỏi người dùng trước khi ghi. Lệnh tài chính không được gửi tới model/nhà cung cấp AI bên ngoài.

## 2. Phạm vi hiểu biết và điều hướng

Kho kiến thức phải được biên soạn từ nội dung đang có trong source và tài liệu dự án, rồi chia theo chủ đề để câu trả lời bám đúng sản phẩm. Đây không phải quyền cho Agent tự đọc toàn bộ database hoặc tự chạy các thao tác.

| Chủ đề | Trang đích | Gợi ý thao tác được phép |
|---|---|---|
| Tổng quan, số dư và cách tính | `dashboard` | Mở tổng quan; giải thích thu, chi, số dư và kỳ thống kê |
| Giao dịch, tìm kiếm/lọc, ghi khoản thu/chi | `transactions` | Mở danh sách; câu lệnh thu/chi rõ ràng được phân tích cục bộ, sau đó ghi qua API hiện có nếu đủ trường và không mơ hồ |
| Tài khoản, ví, chuyển tiền | `accounts` | Xem tài khoản; mở form tài khoản hoặc chuyển tiền nếu người dùng bấm |
| Ngân sách và hạn mức | `budgets` | Xem ngân sách; mở form tạo ngân sách |
| Giao dịch định kỳ | `recurring` | Xem, tạo hoặc giải thích bật/tắt; không tự bật/tắt |
| Mục tiêu tiết kiệm | `goals` | Xem mục tiêu; mở form tạo mục tiêu; giải thích nạp/rút qua chức năng hiện có |
| Báo cáo, danh mục | `reports`, `categories` | Mở báo cáo/danh mục; tạo danh mục qua API hiện có khi người dùng nói rõ tên và loại thu/chi |
| Hồ sơ, bảo mật, tùy chỉnh và dữ liệu | `settings` với section hash hiện có | Dẫn tới `settings-profile`, `settings-security`, `settings-preferences`, `settings-data` |
| Liên kết ngân hàng | `settings` tại `settings-bank` | Giải thích trạng thái sandbox, consent và giới hạn; không khởi chạy kết nối thay người dùng |
| Trợ giúp, quyền riêng tư, điều khoản | `help`, `/legal.html#privacy`, `/legal.html#terms` | Trả lời theo nội dung đã công bố và dẫn nguồn nội bộ |
| Admin | `/admin`, `/admin/users`, `/admin/audit-logs` | Chỉ hiện cho phiên có vai trò Admin; không cấp thêm quyền hoặc tiết lộ dữ liệu tài chính người dùng |

Các `view` và `data-action` phải được xác minh lại với source ở lúc triển khai. CTA và lệnh ghi dữ liệu đi qua allowlist cứng; parser chỉ có thể tạo `create_transaction` hoặc `create_category` với schema đã định nghĩa. Agent không được trả URL tùy ý, HTML, tên action tùy ý hay mã JavaScript. Nếu ý định hoặc trường nghiệp vụ không rõ, hỏi ngắn gọn và không ghi dữ liệu.

## 3. UX compact đã duyệt

- **Theo phản hồi mới:** khi thu gọn chỉ hiện bong bóng chat tròn 52 × 52 px ở góc dưới bên phải; không chiếm một vùng nội dung thường trực.
- Khi mở, desktop dùng panel khoảng 340 × 470 px; điện thoại dùng panel khoảng 350 × 416 px hoặc co theo chiều rộng màn hình, tối đa khoảng 55vh. Panel nổi trên nội dung, không mở toàn màn hình, không làm reflow trang và phải tránh toast/nút hành động.
- Nút đóng/thu gọn nằm trên header của panel; nhấn lại sẽ trở về đúng bong bóng nhỏ.
- Khung mở gồm header ngắn, lời chào/câu hỏi gợi ý, vài message, CTA phù hợp và ô nhập. Không mở rộng khung chỉ để hiển thị lịch sử dài; lịch sử phiên chỉ cuộn bên trong panel.
- Trạng thái: lời chào và câu hỏi gợi ý, đang xử lý, câu trả lời kèm các bước, CTA điều hướng/chọn tài khoản/danh mục, lỗi API và thành công. Consent/cấu hình provider chỉ thuộc giai đoạn tích hợp AI sinh nội dung sau này.
- Hỗ trợ bàn phím: nút có tên truy cập, focus nhìn thấy được, gửi bằng Enter theo quy tắc rõ ràng, không khóa focus ngoài panel và đóng bằng Escape.
- Câu trả lời ưu tiên: trả lời trực tiếp → tối đa vài bước → CTA phù hợp. Không giả lập typing hoặc báo đã làm xong thao tác khi mới mở form.
- Dùng đúng design system Ví Mình và thông báo hiện hành: thông báo thành công là toàn khối xanh lá nhạt, lỗi là toàn khối đỏ nhạt, không có viền nhấn ở cạnh.

## 4. Kiến trúc

### Đang chạy trong bản hiện tại

```text
Trình duyệt (HTML/CSS/vanilla ES modules)
  bong bóng + panel + transcript tạm trong RAM
  nội dung trợ giúp cục bộ + parser lệnh cục bộ + CTA allowlist
  câu lệnh rõ -> endpoint giao dịch/danh mục same-origin hiện có
        |
        v
Node server: POST /api/transactions hoặc POST /api/categories
  xác thực phiên, quyền sở hữu, trường nghiệp vụ và số dư như các form hiện tại
  PostgreSQL authoritative; cache chỉ thay đổi sau response thành công
```

### Mở rộng nhà cung cấp AI sau này

Nếu cần sinh câu trả lời tự do ngoài catalog, có thể thêm endpoint server và provider như OpenAI Responses API. Khi đó API key chỉ ở `.env` phía server, không trong mã trình duyệt, LocalStorage, response body hoặc log; cần consent AI riêng và cập nhật thông báo quyền riêng tư trước khi gửi câu hỏi. Không được gửi transcript tài chính, snapshot, số dư, giao dịch hoặc thông tin ngân hàng. Mặc định phải có fallback khi thiếu key/dịch vụ lỗi và không giả câu trả lời AI.

Đề xuất đặt `store: false` cho Responses API và không lưu hội thoại vào PostgreSQL, LocalStorage, analytics hoặc log ứng dụng. `store: false` tắt lưu application state của Responses, nhưng không có nghĩa là không có lưu giữ dữ liệu cho mục đích giám sát lạm dụng mặc định; OpenAI công bố dữ liệu giám sát lạm dụng có thể được giữ tối đa 30 ngày. Phải trình bày điều này rõ ràng trong thông báo riêng tư trước khi bật cho người dùng. Xem [Responses API](https://developers.openai.com/api/docs/guides/text) và [Data controls](https://platform.openai.com/docs/guides/your-data).

## 5. Ranh giới dữ liệu và an toàn

1. Với câu hỏi hướng dẫn, chỉ gửi câu hỏi và đoạn hướng dẫn sản phẩm tối thiểu cần thiết. Không gửi tên/email, số dư, giao dịch, số tài khoản, nội dung chuyển khoản, avatar, token ngân hàng hoặc dữ liệu Admin. Câu lệnh ghi thu/chi và tạo danh mục được nhận diện/phân tích cục bộ; không chuyển nội dung hoặc payload nghiệp vụ này tới nhà cung cấp AI.
2. Nếu người dùng hỏi dữ liệu cá nhân như “tháng này tôi chi bao nhiêu?”, Agent không đưa dữ liệu riêng sang nhà cung cấp AI. Agent hướng dẫn tới Báo cáo/Giao dịch. Có thể xem xét một bộ xử lý cục bộ riêng ở phiên bản sau, nhưng cần review bảo mật và thiết kế lại trước.
3. Bản hiện tại không gọi provider nên chưa cần consent AI. Nếu bật provider, trước lần gửi đầu phải có consent AI tùy chọn và riêng biệt: nêu rõ câu hỏi được gửi, phạm vi dữ liệu, khả năng lưu giữ abuse-monitoring và cách dừng sử dụng. Không gộp consent này với hai checkbox Điều khoản/Thông báo quyền riêng tư khi đăng nhập.
4. Chỉ khi bổ sung provider mới cập nhật `public/legal.html`, `docs/LEGAL_CONSENT.md` và phiên bản privacy client/server theo `AGENTS.md` mục 13; không thay đổi nội dung pháp lý cho bản local hiện tại.
5. Giới hạn body, rate limit, timeout, lỗi provider và prompt injection. Nội dung do người dùng nhập hoặc đoạn kiến thức truy xuất là dữ liệu, không phải quyền ghi đè chính sách. Parser giao dịch phải từ chối trường không hợp lệ; backend hiện có vẫn là nơi xác thực quyền sở hữu, số tiền, danh mục, tài khoản, ngày và số dư.
6. Câu trả lời không phải tư vấn tài chính. Không hứa “realtime” hay kết nối ngân hàng hoạt động; hiện trạng Bank Hub trong project là sandbox, chưa đồng bộ lịch sử giao dịch thật.
7. Bản hiện tại không có backend chat; session chat giữ trong RAM trình duyệt và bị xóa khi đăng xuất, tải lại trang hoặc dùng Xóa cuộc trò chuyện. Thu gọn panel chỉ ẩn panel để người dùng tiếp tục phiên chat khi mở lại.

## 6. Các giai đoạn

1. **Chuẩn bị:** hoàn tất mapping route/action và ranh giới dữ liệu.
2. **Thiết kế:** người dùng đã duyệt layout Agent export trên frame `83:2` trong file Figma hiện có.
3. **Nền tảng:** hoàn tất widget, catalog cục bộ và lệnh ghi qua API hiện có; chưa có endpoint/provider AI.
4. **Tích hợp hướng dẫn:** hoàn tất phiên bản cục bộ với CTA route/action allowlist.
5. **Ghi dữ liệu qua câu lệnh:** đã triển khai parser cục bộ và câu hỏi chọn tài khoản/danh mục khi còn mơ hồ; ghi qua API hiện có.
6. **Rà soát:** đã kiểm tra thủ công desktop cho Coach, OCR và Agent Admin; tablet/mobile chưa kiểm tra trong lượt triển khai 2026-10-28. Nếu thêm AI provider, phải làm consent/privacy/server controls ở một giai đoạn riêng.

## 7. Tiêu chí nghiệm thu

- Từ mỗi khu vực chính, Agent trả hướng dẫn phù hợp và nút mở đúng view/section.
- Câu “muốn đặt mục tiêu tiết kiệm” mở được trang mục tiêu; nút tạo chỉ mở modal `new-goal`, không lưu nếu người dùng chưa hoàn thành form.
- Câu hỏi thu/chi nhận các phạm vi ngày được ghi rõ trong mục 0, lọc đúng giao dịch của snapshot hiện tại và theo tài khoản/danh mục khi tên khớp; câu hỏi ngoài phạm vi nêu giới hạn và CTA Báo cáo.
- Câu lệnh rõ “Hôm nay 10h tôi đi ăn hết 100k” được phân tích ở client, chuẩn hóa thành khoản chi 100.000 VND, ngày hôm nay, giờ 10:00 được giữ trong ghi chú, danh mục Ăn uống và tài khoản hợp lệ; sau khi API thành công Agent đọc lại dữ liệu và có nút mở giao dịch.
- Câu “Tạo danh mục chi tiêu Thú cưng” chỉ tạo qua API khi tên/loại rõ; nếu đã tồn tại thì không tạo trùng. Nếu thiếu loại, tài khoản cần thiết, hoặc ánh xạ danh mục không chắc chắn thì hỏi trước khi ghi.
- Kiểm tra message lệnh tài chính không được gửi tới nhà cung cấp AI; server vẫn xác thực payload và cache chỉ cập nhật sau API thành công.
- Không có URL/action do model tự quyết định được thực thi nếu chưa qua allowlist; admin route được bảo vệ theo role hiện tại.
- Khi thêm provider AI trong tương lai, thiếu cấu hình/mất kết nối phải có trạng thái lỗi rõ ràng; consent AI tách biệt và có đường từ chối.
- Bản hiện tại không gọi AI bên ngoài, không gửi dữ liệu tài chính cá nhân cho provider và không lưu transcript.
- Desktop đã được smoke check cho các chức năng nêu trong mục 0; chưa xác nhận tablet/mobile hoặc toàn bộ thao tác bàn phím. Đây không phải nghiệm thu đầy đủ toàn bộ ứng dụng.
- Đối chiếu `docs/ASSIGNMENT_REQUIREMENTS.md` và `docs/PLAN_REVIEW.md`: frontend vẫn HTML/CSS/vanilla ES6, chia module theo trách nhiệm, responsive, có state loading/error, không thêm framework.

## 8. Trạng thái và blocker hiện tại

Các trang/action đã được đối chiếu với `public/js/features/pages.js`, `public/js/app.js` và `public/js/features/admin-view.js`. Layout xuất Agent được duyệt nằm tại node `83:2`; desktop và mobile thể hiện các nút tải Excel/PDF. Source hiện tại gồm `public/js/features/ai-agent.js`, `public/js/features/admin-view.js`, `public/js/api/download.js`, `public/css/ai-agent.css`, `public/css/admin.css`, `server/services/export-service.js` và hai route tương ứng. Trả lời trợ giúp và phân tích tài chính vẫn dùng intent/rule cục bộ; chưa triển khai provider AI.

### Xuất dữ liệu qua Agent

- User dùng `GET /api/exports/user?dataset=&format=&from=&to=&kind=&categoryId=`. Các bộ dữ liệu gồm báo cáo dòng tiền, giao dịch thu/chi, quy tắc định kỳ và danh mục; truy vấn luôn lấy `user.id` từ phiên đã xác thực. Nếu chọn danh mục cụ thể, máy chủ kiểm tra danh mục thuộc tài khoản đó.
- Admin dùng `GET /api/admin/exports?dataset=&format=&from=&to=`. Các bộ dữ liệu gồm chỉ số hệ thống, tăng trưởng, người dùng, nhật ký quản trị và phân tích hoạt động aggregate. Route yêu cầu role Admin; email chỉ xuất ở dạng che một phần, không có số tiền hay nội dung giao dịch cá nhân.
- File XLSX được tạo ở backend bằng [ExcelJS](https://github.com/exceljs/exceljs); PDF được tạo bằng [PDFKit](https://pdfkit.org/docs/getting_started.html) và font Be Vietnam Pro cục bộ. Trình duyệt tải binary cùng origin qua `Blob` và URL tạm; không ghi file xuất vào LocalStorage.
- Xuất theo kỳ và các tập dữ liệu Admin giới hạn 5.000 dòng chi tiết. User có thể yêu cầu toàn bộ giao dịch đã lưu; chỉ dataset `transactions` bỏ giới hạn này và vẫn bị ràng buộc theo user trong session. XLSX dùng chuỗi văn bản cho nội dung không phải số/ngày, tránh chuyển dữ liệu người dùng thành ô công thức. Admin overview chỉ xuất số đếm, xu hướng đăng ký, trạng thái dịch vụ và hoạt động quản trị đã che email.
- Nếu người dùng hỏi chung “giao dịch của tháng trước” mà không nêu thu hay chi, Agent tổng hợp cả hai loại. Câu xuất tiếp theo kế thừa kỳ và loại dữ liệu của câu phân tích gần nhất; ngày/kỳ được gắn trực tiếp vào nút tải để nội dung phản hồi trùng với query gửi API.
- Kiểm tra ngày 2026-11-04: `node --check` các module thay đổi; smoke check tạo và đọc lại workbook XLSX cho User/Admin, kiểm tra header PDF; kiểm tra hội thoại mẫu từ 04/11/2026 truyền `2026-10-01` đến `2026-10-31` vào URL tải; `GET /healthz` trả database connected. Chưa chạy bộ test tự động hoặc xác nhận tương tác tải file trên phiên đăng nhập trình duyệt.

## 9. Cập nhật Agent và Mini app (2026-11-11)

- User Agent hiểu yêu cầu xuất toàn bộ lịch sử giao dịch nếu người dùng nói “toàn bộ”, “tất cả”, “lịch sử” hoặc “mọi giao dịch” mà không chỉ định kỳ. Khi có tháng/khoảng ngày rõ ràng, Agent giữ đúng kỳ đó. Câu xuất tiếp theo kế thừa dataset, loại thu/chi, danh mục và kỳ.
- API User vẫn ràng buộc `user_id` theo phiên; `all=true` chỉ áp dụng cho `dataset=transactions` không có `from/to`. Xuất toàn bộ không áp trần 5.000 dòng kỳ hạn; truy vấn vẫn chỉ lấy dữ liệu của chủ tài khoản. Xuất theo kỳ giữ giới hạn 5.000 dòng.
- Bảng giao dịch theo thứ tự: Loại giao dịch, Số tiền (VND), Ngày giao dịch, Tài khoản, Danh mục, Ghi chú. PDF vẽ biểu đồ cột vector bằng PDFKit; XLSX có sheet `Tổng quan`, `Thống kê` (số liệu và thanh dữ liệu trong ô) và các sheet chi tiết. PDF có biểu đồ cột và bảng chi tiết phân trang.
- Admin Agent nhận thêm dataset `analytics`: DAU/WAU/MAU, gắn kết, hoạt động theo ngày, mức dùng tính năng, số lượt giao dịch/chuyển khoản và funnel liên kết Bank Hub tổng hợp. Không xuất số tiền, ghi chú hoặc giao dịch của từng người dùng. Overview và tăng trưởng cũng có biểu đồ.
- `ExcelJS` không tạo biểu đồ native; sheet `Thống kê` thể hiện thanh cột ngay trong ô bên cạnh số liệu, còn PDF dùng cột vector. Không thêm thư viện biểu đồ.
- Mini app: selector số tiền ghi đè border input chung để chỉ còn một khung; thẻ mục tiêu bỏ nền hộp lồng cho số dư, giảm padding và tăng cỡ chữ theo mockup local đã duyệt.
- Mã thay đổi trong `public/desktop/mini.css`, `public/js/features/ai-agent.js`, `public/js/features/admin-view.js`, `public/js/utils/smart-finance.js`, `server/services/export-service.js`. `node --check` đạt cho 5 module JavaScript; `/healthz` trả HTTP 200 và database connected; trang Mini app/CSS trả HTTP 200 với cache version mới. Đã khởi động lại máy chủ bằng `npm run dev`. Chưa tải file trên phiên đăng nhập thật nên cần xác minh trực tiếp Excel/PDF User/Admin trong trình duyệt.
