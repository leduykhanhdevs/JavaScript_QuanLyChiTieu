# Tự review plan theo đề cuối khóa

**Cách review:** đọc lại `docs/PROJECT_PLAN.md`, đối chiếu từng nhóm yêu cầu với `docs/ASSIGNMENT_REQUIREMENTS.md` và PDF gốc, sau đó kiểm tra trạng thái source và bằng chứng chạy được. Những mục chưa qua trình duyệt hoặc chưa có cấu hình bên ngoài được đánh dấu riêng.

## 1. Ma trận yêu cầu đề → kế hoạch → bằng chứng nghiệm thu

| Nhóm/mục trong đề | Áp dụng trong plan | Cách nghiệm thu dự kiến | Kết quả review |
|---|---|---|---|
| Hình thức cá nhân, sản phẩm thực tế, hiểu source | Mục tiêu, người dùng, kịch bản demo và tiêu chí hoàn thành | Sinh viên trực tiếp demo, giải thích và sửa một thay đổi | Đủ |
| HTML5/CSS3/JavaScript thuần/ES6+; framework bị cấm | Kiến trúc và `.md` quy định frontend thuần; no UI/chart/CRUD framework | Đọc dependency tree và source; review `AGENTS.md` | Đủ; Node/PostgreSQL tách riêng phía server |
| Mục tiêu năng lực 1–15 | Mục tiêu, kiến trúc, nghiệp vụ, UI, data, cache, module, demo | Ma trận source/API và checklist kiểm chứng | Có source cho các mục tiêu; nghiệm thu cuối cần demo đủ luồng |
| Màn hình tối thiểu: chủ/list/detail/add/edit/info/manage | Bảng màn hình auth, dashboard, CRUD nghiệp vụ, chi tiết, thông tin | Đi theo navigation; mọi thao tác có route/màn hình/response | Đủ |
| DOM: nội dung động, render, class, ẩn/hiện, tạo/xóa node | Frontend dùng DOM API và các module `features/`, `components/` | Renderer dựng 10 trang, 11 modal, 7 trạng thái auth | Đã kiểm tra render; tương tác trình duyệt còn cần demo |
| Event click/submit/input/change/hover/keyboard phù hợp | Event delegation, form submit, bộ lọc, dialog và Escape | Kiểm tra qua code/render; thao tác submit CRUD thực tế trong trình duyệt còn mở | Có xử lý trong source; chưa nghiệm thu e2e trình duyệt |
| Array/Object, CRUD | CRUD giao dịch/tài khoản/danh mục/ngân sách và state arrays | 26 kiểm tra API bao gồm create/read/update/delete các nghiệp vụ chính | API/DB đã kiểm chứng trên DB cô lập; UI CRUD còn cần demo |
| Search/filter/sort; phương thức mảng bắt buộc | Giao dịch có search/filter/sort; source sử dụng các phương thức trong đề | Kiểm tra source; truy vấn API nằm trong 26 luồng DB | Có triển khai; thao tác bộ lọc trên UI cần demo |
| Form/validation | Validation client/server theo loại nghiệp vụ | API checks xác nhận điều kiện số tiền, loại, quyền sở hữu và số dư | Server validation đã kiểm chứng; form trực tiếp còn cần demo |
| Chấp thuận điều khoản và xử lý dữ liệu trước auth | Hai checkbox riêng ở đăng nhập/đăng ký; kiểm tra client/server, lưu version, source, thời điểm trong `user_consents` | Thử bỏ trống, gửi sai phiên bản và đọc lại migration/API | Có trong source và migration 004; UI thật và hành vi API cần được demo cùng auth |
| OTP xác minh email khi đăng ký | Tự gửi mã 6 số sau khi tạo tài khoản; đăng nhập đúng mật khẩu khi chưa xác minh sẽ mở màn hình OTP và gửi/đảm bảo có mã mới; gửi lại thủ công chỉ khi hết hạn | Mã hash scrypt, hết hạn, một lần, tối đa 5 lần sai; login resend có cooldown 60 giây; SMTP không trả mã vào API/log | Source và migration 008 đã triển khai; SMTP handshake đã kiểm tra, nhưng vẫn cần demo gửi thư và nhận thư thật |
| Hồ sơ: avatar, đổi email hai bước, xác nhận đăng xuất | Migrations 005–006 lưu ảnh JPEG/OTP và siết constraint; migration 011 thêm xác minh email hiện tại, grant và OTP email mới; email chỉ đổi khi bấm Lưu hồ sơ | Đọc schema/API, kiểm tra 5 lần sai, hết hạn, email trùng, ảnh sai MIME/size và xem avatar chỉ qua route auth | **Source đã triển khai; migration 011 đã áp dụng.** SMTP thật, UI tương tác và các lỗi biên vẫn cần demo |
| LocalStorage còn sau reload/mở lại | Cache có namespace user; chỉ ghi sau API thành công; logout xóa cache | Module cache/store đã có; kịch bản reload/mở lại và đổi user chưa chạy trực tiếp | Đã triển khai theo source; hành vi trình duyệt còn cần nghiệm thu |
| Nghiệp vụ hoàn chỉnh | Transaction, transfer, budget, recurring, goal, reports | API integration có 26 checks trên PostgreSQL cô lập | Nghiệp vụ server đã kiểm chứng; mẫu email đặt lại mật khẩu đã cập nhật, nhưng gửi SMTP thật và UI vẫn cần cấu hình/demo |
| Kết nối ngân hàng và phân loại giao dịch (P2, mở rộng mới) | BANK_INTEGRATION_PLAN.md mục 11, PROJECT_PLAN.md mục 12/mốc 9, DATABASE_DESIGN.md mục 3 | Chỉ nghiệm thu sau khi provider/bank sandbox xác nhận quyền đọc hợp lệ: consent, sync idempotent, inbox, phân loại rule/manual, transfer reconciliation, revoke | Settings có bộ chọn 10 ngân hàng cá nhân SePay Bank Hub công bố và thông tin năng lực; Vietcombank bị loại vì không có trong danh sách hiện tại. CTA kết nối khóa do chưa onboarding/sandbox và chưa hoàn tất rà soát token/Hosted Link. API công bố chưa nêu cách preselect ngân hàng. SePay chưa được chọn/onboard; chưa có hợp đồng, migration hay API. P2 chưa được giảng viên xác nhận; không tính bộ chọn là kết nối đã triển khai |
| Dashboard/thống kê (Trang Admin trong đề) | ADMIN_DASHBOARD_PLAN.md, ADMIN_DATABASE_DESIGN.md; migration 003 đã áp dụng; source có RBAC, aggregate API, directory, audit và SVG | Sau khi có Admin đã bootstrap: demo 401/403, so sánh số liệu với DB, xác nhận không trả financial details và chạy luồng khóa/mở | **Source/API/UI đã triển khai; migrations 001–011 có trên DB. Demo role thật còn chờ tài khoản đã xác minh; MCP Figma chạm giới hạn nên UI dựa trên SVG duyệt trong repo.** |
| ES6+: cú pháp và import/export | Frontend ES modules, cú pháp ES6+ và phương thức đề yêu cầu | `node --check` trên 27 module; không dùng framework giao diện | Đã kiểm tra cú pháp và dependency audit |
| Chia source, responsive | Cấu trúc `public/`/`server/`; CSS desktop/tablet/mobile | CSS responsive có; login desktop đã xem trực tiếp | Desktop đã xem; tablet/mobile chưa kiểm tra trực tiếp |
| Hoàn thiện: link/button/form, success/failure, confirm, empty/error | Trạng thái từng màn và checklist | Renderer xác nhận trang/modal/auth state; API checks xác nhận lỗi nghiệp vụ | Các trạng thái chính đã render; checklist mọi nút/link và console còn cần demo |
| Bảo vệ và dùng AI minh bạch | Kịch bản demo/sửa trực tiếp, yêu cầu tự giải thích source | Giảng viên hỏi và giao thay đổi tại chỗ | Đủ |
| Hồ sơ nộp source `.rar` | Scope yêu cầu README, tài liệu, migrations, source | Đóng gói theo mẫu đề khi kết thúc | Đủ; mã số sinh viên chưa được cung cấp, điền khi đóng gói |

## 2. Đối chiếu thang điểm 100

| Nhóm | Điểm | Nơi plan bao phủ | Trạng thái |
|---|---:|---|---|
| A. Phân tích và thiết kế | 10 | Mục tiêu, vai trò, phạm vi, luồng, màn hình/kiến trúc | Đủ |
| B. Giao diện và UX | 10 | Figma, trạng thái, responsive | Layout đã được duyệt; desktop login đã xem; tablet/mobile còn chờ kiểm tra |
| C. JavaScript và DOM | 15 | Vanilla JS, event, dynamic rendering, ES6+, module | Source có; 27 module qua kiểm tra cú pháp và bộ renderer đã chạy |
| D. Quản lý dữ liệu/CRUD | 15 | Giao dịch, account, category, budgets/goals/rules CRUD | API/DB qua 26 integration checks trên cluster cô lập; UI cần demo |
| E. Search/filter/sort/stats | 10 | Giao dịch lọc đa điều kiện; dashboard cá nhân và Admin aggregate theo ADMIN_DASHBOARD_PLAN.md; schema tại ADMIN_DATABASE_DESIGN.md | Dashboard cá nhân có; Admin API/UI đã triển khai. Cần tài khoản Admin để demo số liệu và thao tác trên DB |
| F. Form/validation | 10 | Form và validation nghiệp vụ cả client/server, gồm chấp thuận Điều khoản/Thông báo quyền riêng tư | Auth có kiểm tra riêng ở client/server và lưu bằng chứng chấp thuận; thao tác form trực tiếp còn mở |
| G. LocalStorage/state | 10 | Cache có namespace, reload, empty/corrupt, logout | Source đã có; persistence/reload chưa được nghiệm thu trên trình duyệt |
| H. ES6+ và tổ chức source | 10 | Module, array methods và frontend thuần | 27 module qua cú pháp; dependency audit không phát hiện lỗ hổng đã biết |
| I. Hoàn thiện/bảo vệ | 10 | Link/state/error/responsive/demo/hot change | Có trang, trạng thái và README; còn cấu hình DB/SMTP và kiểm tra UI cuối |
| **Tổng** | **100** | Đã đối chiếu cả 9 nhóm | **Trang Admin và migration đã triển khai; còn chờ bootstrap tài khoản Admin và demo quyền thực tế** |

## 3. Quyết định mở rộng và giới hạn của đối chiếu

- Đề PDF giới hạn stack bắt buộc ở HTML/CSS/JavaScript thuần phía website và yêu cầu LocalStorage; Node.js, PostgreSQL, SMTP là phần mở rộng được người dùng xác nhận giảng viên đã duyệt. Kế hoạch giữ nguyên JavaScript thuần ở frontend và LocalStorage làm cache thực, không lấy backend thay điểm môn học.
- Kết nối ngân hàng là P2 mới, không có trong rubric gốc và chưa có bằng chứng giảng viên duyệt. P0/P1 vẫn phải chạy độc lập; API ngân hàng không thay bài tập JavaScript/LocalStorage. Xin xác nhận phạm vi môn học và provider sandbox trước khi triển khai.
- Đề có các mục C, E, H chỉ ghi tên nhóm và số điểm, không cung cấp rubric con. Plan vì vậy lập minh chứng chức năng cụ thể nhưng không tự gán điểm con cho các nhóm này.
- Đề nêu “website” có thể có trang chủ/list/detail/add/edit; plan dùng SPA-style shell với các màn/route/biểu mẫu tương ứng. Không bị giới hạn phải có một tệp HTML riêng cho mỗi trang.
- LocalStorage chứa cache tài chính theo user để đáp ứng đề, nhưng không chứa credential/token. Đăng xuất xóa namespace đó; dữ liệu chuẩn trên PostgreSQL còn nguyên.

## 4. Kết quả tự review và chỉnh sửa đã chốt

Plan bao phủ từng mục chức năng và toàn bộ A–I. Khi tự rà lại plan và source, đã làm rõ các điểm dễ sai nghiệp vụ:

1. Transfer và thao tác goal dùng bảng chuyển riêng, bị loại khỏi tổng income/expense.
2. Số dư là giá trị dẫn xuất từ ledger, không lưu hai nguồn số dư cạnh tranh.
3. Recurring có khóa idempotent theo rule/ngày và xử lý ngày cuối tháng.
4. Cache chỉ cập nhật sau API thành công, phân namespace và xử lý JSON/storage lỗi.
5. Xác minh/reset dùng token một lần chỉ lưu hash; SMTP chưa cấu hình thì không báo gửi giả.
6. Migration chứng minh ownership bằng composite foreign keys và ràng buộc riêng cho nghiệp vụ.
7. PostgreSQL DATE được parse giữ dạng `YYYY-MM-DD` để so sánh kỳ định kỳ không lệch do timezone; kiểm tra tích hợp bắt được lỗi và xác nhận bản sửa.

Khi đối chiếu lại, phát hiện dashboard cá nhân không thay thế được yêu cầu “DASHBOARD / THỐNG KÊ (Trang Admin)”. Đã bổ sung plan, DB design, migration, layout Figma và sau đó triển khai RBAC/API/UI Admin; database `quan_ly_chi_tieu_dev` hiện ghi nhận migrations 001–011. Admin chỉ đọc số lượng và metadata tài khoản đã che email, không trả transaction details hay số tiền. Layout SVG trong `docs/figma/` đã được người dùng duyệt; lần này Figma MCP chạm giới hạn Starter nên triển khai dùng SVG đã lưu làm tham chiếu. Snapshot ngày 16/10/2026 có 1 tài khoản active, 0 Admin và 2 bản ghi chấp thuận; cần xác nhận đúng tài khoản rồi bootstrap Admin trước khi demo quyền thật. Mẫu email đặt lại mật khẩu tại `server/lib/mail.js` đã được thay theo thiết kế; SMTP handshake không thay thế kiểm chứng email tới inbox, nên demo gửi/nhận email thật và kiểm tra UI/CRUD tổng thể vẫn là hạng mục nghiệm thu riêng.

## 5. Trạng thái Figma

- File: https://www.figma.com/design/vvXG33wbITaw5QZgGOKAgZ
- Palette đã được cập nhật theo review của người dùng: Royal Blue `#2563EB` làm màu chính, navy `#1E3A8A` cho thẻ số dư, pale blue `#EFF6FF` cho trạng thái chọn/tích cực; san hô giữ vai trò khoản chi/lỗi. Tương phản chữ trắng trên màu chính là 5.17:1.
- Bảy trang: desktop core; planning/reports; authentication; design system; responsive layouts; settings/profile; application states.
- Lối thay thế: mở bằng tài khoản Editor hiện có và nhập từng SVG qua File → Place image. Kiểm tra layer tree cho thấy mỗi bảng có các nhóm màn hình riêng và vector layer.
- Các SVG nguồn và PNG preview nằm trong `docs/figma/`. Chữ trong SVG có thể được chuyển thành vector bởi Figma; chỉnh sửa nội dung dễ nhất bằng cách sửa SVG nguồn rồi nhập lại.
- Người dùng đã review và duyệt layout trước khi source sản phẩm được triển khai.
- Thiết kế Admin đã lưu trong file: [Overview, users và responsive](https://www.figma.com/design/vvXG33wbITaw5QZgGOKAgZ/V%C3%AD-M%C3%ACnh-%E2%80%94-Qu%E1%BA%A3n-l%C3%BD-chi-ti%C3%AAu-c%C3%A1-nh%C3%A2n?node-id=16-2), [trạng thái giao diện](https://www.figma.com/design/vvXG33wbITaw5QZgGOKAgZ/V%C3%AD-M%C3%ACnh-%E2%80%94-Qu%E1%BA%A3n-l%C3%BD-chi-ti%C3%AAu-c%C3%A1-nh%C3%A2n?node-id=17-2). Đây là SVG vector tree có text/shape chỉnh sửa được; chưa phải component/Auto Layout native. Số liệu mẫu chỉ để minh họa.

## 6. Kết luận review

**Plan, schema, review, Admin source/API/UI, avatar, OTP đổi email hai bước, tùy chọn ngôn ngữ và xác nhận đăng xuất đã được triển khai; migrations 001–011 đã áp dụng.** Layout Admin đã được duyệt. Ma trận vẫn phân biệt phần đã triển khai với phần chưa demo: DB có 1 user active nhưng chưa có Admin, do đó chưa khẳng định đã kiểm chứng luồng role Admin thật. Figma MCP bị giới hạn lượt đọc trong lượt triển khai; source UI đối chiếu với SVG vector đã lưu.

## 7. Trạng thái implementation và bằng chứng

- Migration `001`–`006` đã chạy trên PostgreSQL local; migration `005_profile_avatar_email_otp.sql` bổ sung avatar và OTP email, còn `006_profile_constraint_hardening.sql` siết kiểm tra MIME ảnh và chuẩn hóa email. Snapshot ngày 16/10/2026 có 1 user active, 0 Admin, 0 audit log và 2 consent record.
- 26 kiểm tra API đã qua: xác thực/session, cách ly tài khoản, CRUD, transfer, ngân sách trùng, định kỳ idempotent, mục tiêu, báo cáo, rollback số dư âm và hai request chi đồng thời.
- `node --check` đạt trên 27 module JavaScript; renderer đạt 10 trang, 11 modal và 7 trạng thái auth.
- `npm audit --omit=dev` báo 0 lỗ hổng đã biết.
- Server mở trang đăng nhập tại `http://localhost:3000`; ảnh kiểm tra trực tiếp xác nhận giao diện desktop hiển thị. Trình duyệt có autofill, không coi nội dung đó là fixture hay bằng chứng login thành công.
- Admin source/API/UI đã được triển khai; `schema_migrations` hiện ghi nhận migrations `001`–`011`; truy vấn chỉ lấy số lượng cho dữ liệu môi trường và thấy DB có 1 user active, 0 audit log, 0 Admin.
- Còn mở: xác nhận đúng tài khoản active rồi bootstrap Admin; demo 401/403, khóa/mở và audit bằng tài khoản Admin thật; kiểm tra trực quan Admin ở desktop/tablet/mobile. Mẫu email đã cập nhật nhưng chưa gửi SMTP thật; SMTP, LocalStorage reload, link/nút và CRUD tổng thể vẫn cần nghiệm thu riêng.

## 9. Tự review điều khoản và chấp thuận

- Tài liệu pháp lý hiển thị tại `public/legal.html`, gồm Điều khoản sử dụng và Thông báo quyền riêng tư với hai phiên bản được ghi riêng.
- Đăng ký/đăng nhập yêu cầu hai lựa chọn tách biệt: chấp thuận Điều khoản và đồng ý xử lý dữ liệu cá nhân theo Thông báo quyền riêng tư. Không gộp consent ngân hàng vào hai mục này; tính năng ngân hàng chưa được triển khai.
- Client kiểm tra checkbox; API kiểm tra lại boolean và phiên bản hiện hành; database lưu `user_id`, loại tài liệu, version, nguồn (`registration`/`login`) và thời điểm do server ghi.
- Nội dung là bản dự thảo phù hợp phạm vi đồ án, không phải xác nhận tuân thủ đầy đủ cho dịch vụ thương mại. Cần cập nhật đầu mối liên hệ riêng, thông tin hạ tầng triển khai và rà soát pháp lý trước khi mở công khai.
- Đối chiếu nguồn pháp luật hiện hành: Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 và Luật Bảo vệ quyền lợi người tiêu dùng 19/2023/QH15; chi tiết nguồn tại `docs/LEGAL_CONSENT.md`.

## 8. Tự review phần tích hợp ngân hàng P2

Đã đối chiếu mô tả mới với các nguyên tắc hiện có trong đề và schema:

1. Giao dịch import chưa phân loại đã qua đối chiếu vẫn có category hệ thống để số dư theo ledger không bị thiếu; ứng viên trùng với nhập tay chờ xác nhận và không được tạo bút toán thứ hai.
2. Mã hóa đơn tự nó không đủ để suy ra danh mục. Tự áp dụng chỉ khi có rule người dùng/metadata đáng tin cậy ánh xạ mã sang category; khớp mơ hồ thì yêu cầu người dùng chọn.
3. Credit/debit không luôn đồng nghĩa thu/chi; chuyển tiền nội bộ được ghép thành transfer và loại khỏi báo cáo thu/chi trong cùng DB transaction.
4. Retry không tạo giao dịch trùng nhờ khóa external transaction; khả năng trùng với giao dịch nhập tay phải được user xác nhận ghép/import; API lỗi không làm mất dữ liệu đã đồng bộ.
5. “Realtime” chỉ ghi nhận khi provider có webhook/sự kiện hoặc cam kết độ trễ; nếu không, UI phải nêu rõ đồng bộ thủ công/theo lịch.
6. Redirect/consent diễn ra ở domain ngân hàng hoặc Hosted Link của provider đã được công bố rõ; app không thu password/OTP. Token và client secret chỉ ở backend, không trong LocalStorage/log/frontend.
7. Thiết kế DB vẫn provider-neutral và chưa có migration. Người dùng đã duyệt bộ SVG review cục bộ trong `docs/figma/08*.svg` ngày 16/10/2026; các SVG chưa được nhập vào file Figma do quota/seat. Yêu cầu hiện tại là dùng catalog Bank Hub và chọn một ngân hàng; Settings có bộ chọn 10 ngân hàng, hiện năng lực cá nhân, còn CTA bị khóa do chưa có onboarding/sandbox và chưa xong rà soát Hosted Link. VCB không có trong Bank Hub catalog. Cần xác nhận provider/API, khả năng preselect, và hỏi giảng viên trước khi bật luồng thật hoặc coi P2 là phạm vi chấm.

**Kết quả:** phần đề tài bổ sung có plan và thiết kế schema chi tiết; Settings có bộ chọn catalog 10 ngân hàng Bank Hub với trạng thái khảo sát và CTA khóa. Migration 007 chỉ lưu consent và attempt Hosted Link sandbox; chưa có onboarding/provider API, import/sync hay dữ liệu giao dịch thật. Tài liệu Link Token chưa mô tả preselect ngân hàng, nên thao tác chưa thể đảm bảo mở thẳng ngân hàng đã chọn. SVG review draft đã được duyệt trong hội thoại nhưng chưa được nhập vào file Figma. Các hàng điểm A–I không được đánh dấu hoàn thành thêm chỉ nhờ tài liệu hoặc UI P2.

## 10. Tự review avatar, đổi email hai bước và logout

- Avatar được trình duyệt crop thành JPEG 256 × 256; server kiểm tra signature JPEG, kích thước tối đa 512 × 512 và byte length tối đa 256 KiB. Ảnh lưu trong PostgreSQL, route trả ảnh yêu cầu session, cache response là `private, no-store`; `state.cache.js` không ghi user hoặc image vào LocalStorage.
- Mã OTP 6 số được sinh bằng `crypto.randomInt`, băm scrypt có salt; chỉ gửi qua SMTP. `email_change_codes` lưu địa chỉ đích chuẩn hóa, hash, expiry, attempts và trạng thái dùng/thu hồi; code hết hạn mặc định sau 10 phút, có thể cấu hình 1–30 phút, bị vô hiệu ở 5 lần sai, mỗi user/email chỉ có một code chờ và endpoint có rate limit.
- Đổi email gồm hai xác minh: OTP đầu tiên được gửi tới địa chỉ hiện tại đã xác minh; mã đúng tạo grant 15 phút để cho phép yêu cầu OTP tới email mới. Xác minh mã mới chỉ đánh dấu email đích là đã xác nhận; tài khoản chỉ đổi địa chỉ khi người dùng bấm **Lưu hồ sơ**, lúc đó API kiểm tra lại email chưa dùng, grant và OTP trong cùng transaction. SMTP fail thu hồi mã; hủy luồng thu hồi yêu cầu đang chờ.

## 11. OTP xác minh email đăng ký

- Đăng ký tạo tài khoản trạng thái `pending_email`, ghi OTP 6 số dạng scrypt hash vào `registration_email_codes`, rồi gửi ngay qua SMTP trước khi trả thành công. OTP không xuất hiện trong API, LocalStorage hay log.
- Mã hết hạn theo `EMAIL_OTP_TTL_MINUTES` (mặc định 10 phút), chỉ dùng một lần và bị thu hồi sau 5 lần sai. Khi nhập đúng mật khẩu của tài khoản chưa xác minh, login gửi OTP mới nếu mã gần nhất đã được gửi hơn 60 giây trước, rồi trả lỗi trạng thái để frontend chuyển thẳng sang màn hình OTP. Nút resend thủ công vẫn chỉ cấp mã mới sau hết hạn hoặc khi lần gửi trước thất bại; endpoint verify/resend có rate limit.
- Migration 008 đã áp dụng tại local DB. Module auth, route, email template và frontend qua `node --check`; server trả `/healthz` với PostgreSQL connected và trang `/` HTTP 200.
- Nodemailer tiếp tục được dùng khi chạy Node local. Worker Cloudflare dùng SMTP qua `cloudflare:sockets` và STARTTLS trên cổng 587; không lưu credential vào source. Sau deploy, gọi resend OTP thật qua Pages trả HTTP 200 và Worker log SMTP đã nhận thư cho một người nhận. Đây là xác nhận relay nhận thư, chưa xác nhận người dùng đã nhận trong inbox hay xác minh thành công.
- Logout trên trang cá nhân và Admin gọi cùng dialog xác nhận; chỉ sau nút xác nhận mới thu hồi session và xóa cache của tài khoản hiện tại.
- Đã kiểm tra cú pháp `node --check` cho module JavaScript thay đổi và áp migrations 005–006. Kiểm tra OTP thật trên Worker đã gửi được tới SMTP relay; tài khoản người dùng hiện vẫn chờ xác minh email, chưa cấp quyền Admin. Chưa hoàn tất visual QA desktop/tablet/mobile; không coi trạng thái relay nhận thư là nghiệm thu hộp thư hay toàn bộ luồng auth.

## 12. Dự báo, OCR và Agent thông minh (2026-10-28)

- Đã đối chiếu `docs/SMART_FINANCE_PLAN.md`, `docs/AI_AGENT_PLAN.md`, `docs/ASSIGNMENT_REQUIREMENTS.md` và các quy tắc `AGENTS.md` trước khi code. Layout đã duyệt là `docs/figma/14-smart-finance-review.svg`; đây là SVG cục bộ, không phải Figma export.
- Triển khai bằng HTML/CSS/vanilla ES modules, không thêm migration. Dự báo, cảnh báo và AI Coach đọc snapshot của user hiện tại; ảnh hóa đơn được OCR ngay trên thiết bị và chỉ tạo giao dịch sau khi người dùng sửa/kiểm tra rồi lưu qua API hiện có. Agent Admin chỉ nhận số liệu tổng hợp; không có doanh thu app hoặc chi tiết giao dịch cá nhân trong API.
- Kiểm tra cú pháp các module liên quan đã qua; `npm audit --omit=dev` báo 0 lỗ hổng; `/healthz` trả DB connected; worker, WASM và Vietnamese traineddata được phục vụ cục bộ với HTTP 200. Desktop smoke xác nhận dự báo/cảnh báo, AI Coach trả đúng kỳ tháng cụ thể, Agent Admin tạo phân tích tăng trưởng. Ảnh OCR tổng hợp được nhận diện thành 25.000 ₫ và ngày 28/10/2026; bản nháp đã hủy, không tạo giao dịch.
- Tablet/mobile chưa được kiểm tra trong lượt này. Chưa có test tự động riêng cho module thông minh; OCR tùy chất lượng ảnh, dự báo là ước tính, cảnh báo chỉ là tín hiệu rà soát. Không coi các kiểm tra thủ công này là nghiệm thu tài chính hoặc xác nhận độ chính xác ngoài mẫu đã thử.

## 13. Agent xuất dữ liệu và Mini app (2026-11-11)

- Người dùng duyệt mockup local thay cho Figma cho phần sửa ô tiền/mục tiêu và bố cục báo cáo User/Admin.
- Agent User mở rộng xuất toàn bộ lịch sử giao dịch khi yêu cầu rõ ràng, giữ kỳ đã hỏi nếu kỳ được nêu, và xuất bảng đủ sáu trường cùng biểu đồ thống kê. Agent Admin thêm dataset phân tích hoạt động tổng hợp cho export, giữ ranh giới không xuất giao dịch hay số tiền cá nhân.
- Giao diện Mini app giữ HTML/CSS/vanilla ES modules; không thêm framework hoặc thư viện biểu đồ. Trước khi nghiệm thu, chạy kiểm tra cú pháp module, xác nhận `/healthz`, và ghi rõ nếu chưa có phiên đăng nhập để tải file thật trong trình duyệt.
- Đã xác minh `node --check` cho 5 module JavaScript; `/healthz` trả HTTP 200 với database connected; trang Mini app và CSS mới trả HTTP 200. Máy chủ được khởi động lại bằng `npm run dev`. Chưa có kiểm tra tải file bằng phiên User/Admin đã đăng nhập.

## 14. Tùy chọn tiền tệ và tỷ giá USD/VND (2026-11-11)

- Mockup local cho mục chọn tiền tệ đã được người dùng duyệt trước khi sửa UI/source; giao diện dùng HTML/CSS/vanilla ES modules và biểu đồ lịch sử tỷ giá dựng bằng SVG thuần.
- User có thể chọn VND hoặc USD trong Cài đặt. VND vẫn là đơn vị sổ cái chuẩn trong PostgreSQL; khi nhập USD, backend quy đổi bằng tỷ giá đã lưu và làm tròn về VND nguyên. Báo cáo Excel/PDF của User đổi nhãn và số tiền theo đơn vị chọn, kèm ngày tỷ giá tham khảo. Báo cáo Admin là chỉ số hệ thống/số lượng, không có số tiền giao dịch cá nhân.
- CurrencyAPI Free cập nhật theo ngày, không phải thời gian thực; máy chủ cache và ghi lịch sử tỷ giá từ thời điểm bật tính năng. Agent User và Mini app gửi đơn vị nhập cùng payload; câu lệnh Agent nhận số tiền không ghi đơn vị theo cài đặt hiện tại, còn đơn vị VND/USD ghi tường minh sẽ được tôn trọng. API key để trống trong `.env.example`; người chạy local phải tự đặt `CURRENCYAPI_API_KEY` trong `.env` để tải tỷ giá. Không commit key.
- Migration mới là `010_currency_and_fx_history.sql`; migrations `001`–`009` không bị sửa.
- Bằng chứng lượt triển khai này: `node --check` qua 56 module JavaScript first-party; `npm run db:migrate` bỏ qua 001–009 và áp dụng 010; `/healthz` trả `ok` với PostgreSQL `connected`, `/` và `/desktop/mini.js` trả HTTP 200. Chưa coi đây là xác nhận tải tỷ giá thật vì `.env` hiện chưa có API key; chưa chạy test suite hoặc tải báo cáo bằng phiên đăng nhập trong lượt này.

## 15. Ngôn ngữ giao diện, logo Mini app và hồ sơ email (2026-11-11)

- Người dùng duyệt mockup local sau khi Figma Starter hết lượt. Scope giữ HTML/CSS/JavaScript thuần; không thêm framework UI. Cài đặt tài khoản cho phép chọn `vi`, `en` hoặc `zh`; lựa chọn được ghi vào `users.ui_language`, đồng bộ về namespace LocalStorage của user sau phản hồi API, và áp dụng vào trang User, Admin, nhãn/định dạng ngày-tiền cùng Mini app.
- `public/js/i18n.js` dùng từ điển nội bộ và DOM APIs để dịch văn bản giao diện/placeholder/accessible labels, gồm các nội dung render động. `public/desktop/mini.js` đọc `language` từ `/api/bootstrap`, theo dõi thay đổi tùy chọn cùng origin, và định dạng ngày/tiền theo locale. Tên danh mục/tài khoản do người dùng tự nhập được giữ nguyên.
- Admin bỏ chấm tròn trước nhãn trạng thái và trạng thái dịch vụ. Mini app vẫn dùng `public/assets/brand-mark.svg`; Electron dùng PNG raster hóa từ chính SVG đó vì tray/window icon nhận ảnh raster, không tạo logo thay thế.
- Migration mới `011_ui_language_and_two_step_email_change.sql` thêm `users.ui_language`, OTP xác minh email hiện tại và grant 15 phút ràng buộc với email hiện tại; `email_change_codes` được mở rộng để giữ OTP xác minh email mới và trạng thái xác minh. Migrations 001–010 không bị sửa.
- API preferences nhận `{language}` và trả `user.language`. Luồng hồ sơ dùng `POST /api/settings/profile/email-change/authorization`, `/authorization/confirm`, `/email-verification`, `/email-verification/confirm`, `/email-change/cancel`; mã/grant không xuất hiện trong API response. Xác minh email mới chưa đổi email tài khoản; việc đổi chỉ xảy ra trong `PATCH /api/settings/profile` khi người dùng lưu.
- Kiểm tra lượt triển khai: `node --check` đạt trên 16 module JavaScript đã sửa; `npm run db:migrate` bỏ qua 001–010 và áp dụng 011; schema readback xác nhận version 011, `users.ui_language` mặc định `vi`, cùng hai bảng authorization. `/healthz` trả HTTP 200 với PostgreSQL connected; website `/`, Mini app `/desktop/mini.html` và `/js/i18n.js` trả HTTP 200. Chưa xác nhận OTP tới inbox nếu chưa gửi thư thật; chưa nghiệm thu toàn bộ câu chữ bằng người dùng thông thạo tiếng Anh/Trung hoặc tất cả viewport; không chạy test suite.

## 16. Cập nhật đích triển khai (2026-11-12)

- Frontend tiếp tục dùng HTML5, CSS3 và JavaScript thuần; `public/` được Cloudflare Pages phục vụ.
- Node.js Native HTTP Server được giữ làm server local. Cloudflare Workers dùng `cloudflare:node` `httpServerHandler` để gọi cùng handler và nghiệp vụ; đây là thay đổi runtime triển khai, không thay yêu cầu coursework.
- PostgreSQL vẫn là nguồn dữ liệu chuẩn. Đích cloud đổi sang Neon PostgreSQL qua Cloudflare Hyperdrive; driver `pg` hiện trong lockfile là `8.23.1` (Hyperdrive yêu cầu tối thiểu `8.16.3`). Migration chạy trực tiếp tới Neon vì migration runner dùng session-level advisory lock.
- LocalStorage, API, schema và migrations hiện có được giữ nguyên; không nhập dữ liệu PostgreSQL local vào Neon.
- `server/local.js` giữ server/timer/shutdown cho local; Worker Cron thay thế timer cho cleanup bank link và cập nhật FX. Pages Function chỉ chuyển tiếp API tới Worker qua HTTPS và secret chia sẻ.
- **Chưa triển khai bên ngoài:** cần Neon database, Hyperdrive ID, Pages/Worker secrets và URL Pages thật. `wrangler.toml` hiện có placeholder; workflow Cloudflare đang khóa sau biến `CLOUDFLARE_WORKER_DEPLOY_ENABLED`.
- **Giới hạn Free cần runtime-smoke-test:** Cloudflare Workers Free hiện công bố 10 ms CPU mỗi request. Scrypt và export Excel/PDF có thể vượt ngưỡng; chưa tuyên bố chạy production cho các luồng này nếu chưa kiểm tra bằng Worker thật. Không hạ cấu hình hash hoặc cắt bớt dữ liệu xuất để lách giới hạn.
- **Bằng chứng kiểm tra mã trong lượt chuyển đổi:** `npm run worker:dry-run` thành công (bundle 3,800.89 KiB; gzip 883.63 KiB). `wrangler dev` với Hyperdrive trỏ tới DB giả ở `127.0.0.1:9` đã nạp ứng dụng/adapter mà không còn lỗi khởi tạo PDFKit; `/` trả 404 theo cấu hình API-only, `/healthz` trả 503 đúng vì DB giả không tồn tại. Chưa xác minh kết nối Neon, xuất PDF thật, SMTP, Cloudflare Pages proxy hoặc deploy; chưa chuyển dữ liệu tài chính local và chưa chạy test suite.

## 17. Triển khai Neon + Cloudflare thực tế (2026-11-12; cập nhật các bước chờ trong mục 16)

- Neon project `vi-minh` (`icy-flower-28555258`) dùng PostgreSQL 17 tại `aws-ap-southeast-1`, database `vi_minh`. Đã áp dụng migrations `001`–`011`; đọc lại schema xác nhận đủ 11 phiên bản. Ban đầu database trống; hiện có một tài khoản `pending_email` sau lần thử đăng ký/OTP, chưa có giao dịch và không sao chép dữ liệu tài chính local.
- Cloudflare Hyperdrive `vi-minh-neon` (`61a6778821414a298e51f0e1428eaffe`) giới hạn 5 kết nối gốc và tắt query cache. `wrangler.toml` đã có binding ID thật và origin Pages.
- API Worker đã deploy tại `https://vi-minh-api.khanhdevs19.workers.dev`; `/healthz` trả HTTP 200 và database `connected`. Gọi trực tiếp `/api/auth/me` trả 403 khi thiếu proxy header.
- Cloudflare Pages project `vi-minh-leduykhanh` phục vụ `https://vi-minh-leduykhanh.pages.dev`; deployment Direct Upload hiện tại là `https://b869f08b.vi-minh-leduykhanh.pages.dev`. Trang chủ trả HTTP 200; `/api/auth/me` qua Pages trả 401 đúng với người dùng chưa đăng nhập, xác nhận Pages Function proxy và shared-secret gate.
- Worker secrets gồm `EDGE_PROXY_SECRET` sinh ngẫu nhiên và các trường SMTP lấy từ `.env` hiện có; Pages secrets gồm cùng proxy secret và `WORKER_API_ORIGIN`. Giá trị không được in hoặc commit. `.env` vẫn ở máy và không đổi. SMTP OTP được Worker nhận thư thành công sau khi cập nhật transport; tài khoản còn chờ người dùng nhập OTP để xác minh.
- Cloudflare agent setup đã cài 22 skills vào `C:\Users\leduy\.agents\skills`, thêm Cloudflare HTTP MCP cạnh Neon trong `.codex/config.toml`, cài `cf` CLI `1.0.0-beta.30`, và thêm quy tắc ưu tiên `cf` vào hướng dẫn Codex cấp người dùng. Cần reload/restart Codex để nạp MCP. Wrangler OAuth và `cf auth whoami` đều xác nhận đã đăng nhập.
- Dự án deploy bằng Wrangler vì repo đã có `wrangler.toml`. Pages đang dùng Direct Upload, chưa kết nối Git provider; workflow Worker trên GitHub vẫn bị khóa sau biến `CLOUDFLARE_WORKER_DEPLOY_ENABLED`. Chưa có domain riêng.
- Phạm vi xác minh bổ sung: `npm run worker:dry-run` thành công, Worker đã deploy, `/healthz` và Neon hoạt động, resend OTP qua Pages trả HTTP 200, SMTP relay chấp nhận một thư. Chưa xác minh thư tới inbox, mã đã được nhập, tài khoản đã kích hoạt/cấp Admin, xuất báo cáo hoặc Cron trên runtime cloud. Cloudflare Free hiện giới hạn 100.000 request Worker/ngày, 10 ms CPU mỗi request/Cron và 100.000 truy vấn database Hyperdrive/ngày; scrypt và xuất Excel/PDF có thể vượt ngưỡng CPU. Nguồn: [giới hạn Workers](https://developers.cloudflare.com/workers/platform/limits/), [giá và giới hạn Hyperdrive](https://developers.cloudflare.com/hyperdrive/platform/pricing/).
