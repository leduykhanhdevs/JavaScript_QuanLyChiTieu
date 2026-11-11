# Bóc tách đề tài cuối khóa môn JavaScript

> **Nguồn chính:** PDF đề cuối khóa do người dùng cung cấp: `ĐỀ TÀI CUỐI KHÓA MÔN JAVASCRIPT.pdf` (23 mục, 16 trang). Đây là bản diễn giải để lập kế hoạch cho website Quản lý chi tiêu cá nhân; khi có mâu thuẫn, đề PDF là căn cứ gốc. Các mục Node.js, PostgreSQL và SMTP được ghi riêng là phần mở rộng đã được giảng viên duyệt.

## 1. Hình thức và mục tiêu môn học

- Làm cá nhân một website hoàn chỉnh, chọn đề tài trong danh sách được giảng viên duyệt và mô phỏng sản phẩm có thể dùng trong thực tế.
- Sinh viên phải tự hiểu toàn bộ mã nguồn và có thể trình bày, sửa đổi trực tiếp khi bảo vệ.
- Sản phẩm cần thể hiện được: phân tích bài toán, cấu trúc website, thiết kế UI, nghiệp vụ JavaScript, ES6+, DOM, event, form/validation, Array/Object, CRUD, tìm kiếm/lọc/sắp xếp, trạng thái ứng dụng, LocalStorage và chia module.
- Đề tài được chọn: **Website Quản lý chi tiêu cá nhân**, thuộc nhóm website quản lý trong đề gốc.

## 2. Công nghệ bắt buộc, được phép và không được sử dụng

### Phần giao diện theo đề gốc

- Bắt buộc: HTML5, CSS3, JavaScript thuần, JavaScript ES6+.
- Có thể dùng CSS thuần để thiết kế giao diện.
- Không dùng React, Vue, Angular, Svelte, jQuery, Bootstrap JavaScript, UI framework dựa trên JavaScript, thư viện CRUD dựng sẵn hoặc mã nguồn/template website hoàn chỉnh của người khác.
- Không dùng thư viện biểu đồ; biểu đồ tự dựng bằng SVG/canvas và JavaScript.

### Phần mở rộng đã được giảng viên duyệt

- Backend Node.js, cơ sở dữ liệu PostgreSQL (quản trị bằng pgAdmin) và SMTP thật cho xác minh email/đặt lại mật khẩu.
- Phần mở rộng này không thay thế yêu cầu JavaScript thuần, ES6+, CRUD, DOM, Array/Object và LocalStorage ở frontend.
- Chạy demo local trước. Ứng dụng hỗ trợ nhiều tài khoản; PostgreSQL là nguồn dữ liệu chính, LocalStorage là cache/trạng thái giao diện theo từng tài khoản.

## 3. Thành phần website tối thiểu và cách áp dụng

Đề yêu cầu tối thiểu trang chủ, danh sách, chi tiết, thêm, chỉnh sửa, thông tin/liên hệ và trang quản lý phù hợp. Tương ứng trong dự án:

| Yêu cầu chung | Màn hình/luồng của dự án |
|---|---|
| Trang chủ | Dashboard tổng quan tài chính |
| Trang danh sách | Giao dịch, tài khoản, danh mục, ngân sách, định kỳ, mục tiêu |
| Trang chi tiết | Chi tiết giao dịch, tài khoản và mục tiêu |
| Thêm dữ liệu | Form tạo giao dịch/tài khoản/danh mục/ngân sách/quy tắc/mục tiêu |
| Chỉnh sửa dữ liệu | Form cập nhật giao dịch, tài khoản, danh mục và cấu hình nghiệp vụ |
| Quản lý dữ liệu | Các trang CRUD nói trên |
| Thông tin/liên hệ | Trang giới thiệu, trợ giúp và thông tin liên hệ |
| Đăng nhập/đăng ký | Đăng ký, xác minh email, đăng nhập, đăng xuất, quên/đặt lại mật khẩu |
| Dashboard/thống kê | Tổng thu, tổng chi, chênh lệch, ngân sách, xu hướng và phân bổ chi tiêu |

Các trạng thái cần có: đang tải, dữ liệu, chưa có dữ liệu, không tìm thấy kết quả, lỗi mạng/API, thành công, lỗi validation và xác nhận thao tác quan trọng.

## 4. JavaScript bắt buộc: DOM và event

JavaScript phải tạo và cập nhật nội dung động, hiển thị dữ liệu, thay đổi nội dung/class, ẩn/hiện thành phần, tạo/xóa phần tử HTML và render danh sách. Không nhúng toàn bộ dữ liệu nghiệp vụ cố định vào HTML.

Các tương tác dùng event phù hợp: `click`, `submit`, `input`, `change`, `mouseover`/`mouseout` hoặc cách tương đương; keyboard event khi hữu ích (ví dụ Escape đóng modal, Enter gửi tìm kiếm). Nghiệp vụ áp dụng gồm mở/đóng form/modal, gửi form, thay đổi bộ lọc, tìm kiếm, sắp xếp, xác nhận xóa, chuyển tiền, xem chi tiết và thông báo.

## 5. Quản lý dữ liệu và CRUD

- Dùng Array, Object và Array of Objects để biểu diễn, biến đổi và render dữ liệu trong frontend.
- Có thao tác tạo, đọc, cập nhật và xóa/lưu trữ cho dữ liệu phù hợp; UI phải đồng bộ sau thao tác.
- Cấu trúc module đề xuất: `api/`, `components/`, `features/`, `services/`, `state/`, `utils/` trong `public/js/`; schema/migration ở `server/db/`.
- Phân biệt xóa cứng và lưu trữ: danh mục/tài khoản đã được dùng không bị xóa làm hỏng lịch sử; giao dịch xóa phải xác nhận và có phản hồi.

## 6. Tìm kiếm, lọc, sắp xếp và phương thức mảng

Phải cung cấp tìm kiếm có kết quả hiển thị thực tế, bộ lọc phù hợp với đề tài, và sắp xếp mới nhất/cũ nhất cùng tiêu chí phù hợp. Giao dịch cần hỗ trợ ít nhất tìm theo mô tả, lọc theo loại thu/chi, tài khoản, danh mục, khoảng ngày và khoảng tiền; sắp xếp theo ngày/số tiền.

Thể hiện có chủ đích các phương thức đề yêu cầu:

- `map()` để dựng dữ liệu hiển thị;
- `filter()` để lọc giao dịch và tính tập con;
- `find()`/`findIndex()` để tìm bản ghi và vị trí cập nhật;
- `some()`/`every()` để kiểm tra điều kiện tổng hợp hoặc trạng thái;
- `reduce()` để tính tổng, số dư và thống kê;
- `sort()` để sắp xếp bản sao, không làm thay đổi state gốc ngoài ý muốn;
- `forEach()` để áp dụng cập nhật/side effect có chủ đích.

Tìm kiếm không phân biệt chữ hoa/chữ thường và xử lý dấu tiếng Việt theo thiết kế; giá trị lọc phải phối hợp được, nút xóa bộ lọc phải trả lại danh sách đầy đủ.

## 7. Form và validation

Mỗi form phải xử lý submit thật, kiểm tra dữ liệu trước khi gửi, hiển thị lỗi cạnh trường và tóm tắt lỗi dễ hiểu khi cần. Tối thiểu kiểm tra bắt buộc, kiểu/định dạng, độ dài, phạm vi và điều kiện nghiệp vụ.

Áp dụng cho dự án: email chuẩn, mật khẩu tối thiểu theo chính sách cấu hình, tên không rỗng và giới hạn độ dài, số tiền là số nguyên VND dương, ngày hợp lệ, danh mục đúng loại, tài khoản còn hoạt động và thuộc chủ tài khoản, ngày trong kỳ hợp lệ, ngày kết thúc không trước ngày bắt đầu, ngân sách dương, mục tiêu có số tiền đích dương, chuyển tiền có hai tài khoản khác nhau. Server phải kiểm tra lại mọi dữ liệu; validation phía client không phải ranh giới bảo mật.

Không thay validation bằng `alert("OK")`. Có lỗi trường, trạng thái gửi, lỗi server, thông báo thành công và giữ dữ liệu hợp lệ đã nhập khi lỗi không nhạy cảm.

## 8. LocalStorage và quản lý trạng thái

Đề bắt buộc dữ liệu còn sau reload, đóng và mở lại website. Dự án duy trì yêu cầu này bằng cache có khóa namespace theo `userId`:

- Cache được render trước để khôi phục giao diện, sau đó đồng bộ dữ liệu mới nhất từ API/PostgreSQL.
- Chỉ ghi cache sau khi server xác nhận mutation thành công; API lỗi thì không giả vờ đã lưu.
- Cache chứa snapshot dữ liệu hiển thị cần thiết và tùy chọn giao diện; không chứa mật khẩu, session cookie/token, email verification/reset token hay SMTP/DB secret.
- Đăng xuất xóa namespace cache tài chính của user hiện tại và state trong bộ nhớ; không đọc cache của user khác.
- Xử lý LocalStorage trống, JSON hỏng, quota/security exception, API offline và dữ liệu cache cũ; có trạng thái lỗi/khôi phục rõ ràng.
- PostgreSQL là nguồn chuẩn cho đồng bộ đa phiên và nhiều thiết bị; ứng dụng local-demo chưa hứa chế độ ghi offline.

## 9. Nghiệp vụ website

Nghiệp vụ lõi là ghi nhận thu/chi, phân loại và hiểu dòng tiền theo thời gian. Phạm vi đã chốt gồm:

1. Quản lý giao dịch thu và chi, ngày, danh mục, tài khoản, ghi chú; tạo/xem/sửa/xóa có xác nhận.
2. Quản lý tài khoản/ví; hiển thị số dư tính từ số dư ban đầu, giao dịch và chuyển khoản.
3. Chuyển tiền giữa hai tài khoản; ghi nhận nguyên tử, không tính chuyển tiền thành thu nhập/chi phí.
4. Danh mục thu/chi; chỉ dùng danh mục đúng loại; lưu trữ thay vì xóa khi đã được tham chiếu.
5. Ngân sách theo tháng và danh mục chi; theo dõi đã dùng, còn lại, phần trăm và cảnh báo.
6. Giao dịch định kỳ; tạo kỳ đến hạn lặp lại an toàn, không sinh trùng cho cùng quy tắc/ngày.
7. Mục tiêu tiết kiệm; tiến độ so với số tiền đích. Nạp/rút mục tiêu là chuyển khoản tới/từ tài khoản goal, không làm sai báo cáo thu/chi.
8. Báo cáo theo khoảng thời gian, loại, danh mục và tài khoản.

## 10. Dashboard/thống kê

Trang dashboard phải tính bằng JavaScript từ dữ liệu API/cache: tổng thu, tổng chi, dòng tiền ròng, số dư các tài khoản, tiến độ ngân sách, giao dịch gần đây và phân bổ/xu hướng theo thời gian. Chọn khoảng thời gian rõ ràng (tháng hiện tại/một tháng/khoảng tùy chọn). Chuyển khoản giữa tài khoản và nạp/rút goal bị loại khỏi tổng thu/chi. Trạng thái không có giao dịch phải giải thích rõ thay vì hiển thị số giả.

## 11. ES6+ bắt buộc

Phải dùng và có thể giải thích: `let`, `const`, arrow function, template literal, destructuring, spread operator, rest parameter, default parameter, Array methods, Object methods và `import`/`export` dạng ES modules. Có thể sử dụng Promise, async/await và class nếu làm code rõ hơn; chúng không phải lý do để thêm framework.

## 12. Tổ chức mã nguồn

Không viết cả ứng dụng trong một file JavaScript. Cấu trúc được phép điều chỉnh theo dự án, nhưng cần có ranh giới rõ giữa frontend và API, module theo trách nhiệm, CSS responsive, tài nguyên, migration và tài liệu. Tên file/hàm/biến phải giải thích được khi bảo vệ.

## 13. Responsive

Giao diện phải dùng được trên desktop, tablet và điện thoại. Các bảng cần phương án trình bày mobile; menu, form, modal, biểu đồ, điều khiển lọc và vùng thao tác không được tràn màn hình. Responsive là tiêu chí chấm độc lập.

## 14. Tính hoàn chỉnh và bảo vệ

- Không link chết, nút không hoạt động, form không xử lý hoặc dữ liệu giả chỉ để trưng bày.
- Chức năng chính không lỗi; không có lỗi JavaScript nghiêm trọng; thành công/thất bại có thông báo.
- Xác nhận trước thao tác quan trọng như xóa; hỗ trợ trạng thái rỗng/không có kết quả/lỗi.
- Sinh viên phải chạy demo, làm nghiệp vụ, giải thích cấu trúc, lưu trữ và hàm xử lý, rồi sửa một thay đổi trực tiếp (ví dụ tìm kiếm không phân biệt hoa thường, lọc, xác nhận xóa, xử lý LocalStorage trống).
- Sinh viên phải hiểu và giải thích được mã AI hỗ trợ; giảng viên có thể yêu cầu giải thích, bổ sung hoặc viết lại một đoạn code.

## 15. Thang điểm và điều kiện đạt

| Nhóm | Điểm | Các tiêu chí được nêu cụ thể trong đề |
|---|---:|---|
| A. Phân tích và thiết kế | 10 | Bài toán thực tế 2; đối tượng 1; chức năng 2; cấu trúc 2; luồng nghiệp vụ 2; tính hợp lý 1 |
| B. UI/UX | 10 | Bố cục 2; giao diện thống nhất 2; responsive 2; điều hướng 2; thông báo/trạng thái 2 |
| C. JavaScript và DOM | 15 | Đề nêu nhóm và điểm; không liệt kê bảng tiêu chí con trong PDF |
| D. Dữ liệu và CRUD | 15 | Array/Object 2; thêm 3; hiển thị 2; sửa 3; xóa 3; cập nhật sau thao tác 2 |
| E. Tìm kiếm/lọc/sắp xếp/thống kê | 10 | Đề nêu nhóm và điểm; không liệt kê bảng tiêu chí con trong PDF |
| F. Form và Validation | 10 | Thiết kế 2; bắt buộc 2; định dạng 2; thông báo lỗi 2; xử lý dữ liệu hợp lệ 2 |
| G. LocalStorage/trạng thái | 10 | Lưu 2; đọc 2; cập nhật 2; xóa 1; khôi phục sau reload 2; chưa có dữ liệu 1 |
| H. ES6+ và tổ chức source | 10 | Đề nêu nhóm và điểm; không liệt kê bảng tiêu chí con trong PDF |
| I. Hoàn thiện và bảo vệ | 10 | Ổn định 2; nghiệp vụ 2; không lỗi chức năng chính 1; demo 2; giải thích source 2; sửa trực tiếp 1 |
| **Tổng** | **100** | Điểm cuối khóa = tổng điểm / 10 |

Điều kiện đạt: website chạy được, đủ chức năng chính, có JavaScript thật, CRUD, form/validation, tìm kiếm/lọc/sắp xếp, LocalStorage, ES6+, giải thích được source và demo trực tiếp.

## 16. Hồ sơ nộp và minh bạch nguồn

Đề yêu cầu nộp source code với tên theo mẫu `MSSV_HoTen_TenDeTai.rar`. Tài liệu dự án, migration, seed, cấu hình mẫu và hướng dẫn demo được bổ sung để làm rõ sản phẩm, không thay thế source cần nộp. Mọi nguồn ngoài (nếu có) phải ghi rõ và không dùng template hoàn chỉnh để thay thế phần tự xây dựng.

## 17. Danh sách kiểm tra bắt buộc trước khi nghiệm thu sản phẩm

- [ ] Các màn hình tối thiểu và điều hướng hoạt động.
- [ ] Các thao tác tạo/đọc/sửa/xóa và trạng thái dữ liệu được phản ánh đúng.
- [ ] Search/filter/sort phối hợp, có clear filter và empty state.
- [ ] Form kiểm tra bắt buộc, định dạng, miền giá trị, điều kiện nghiệp vụ ở client và server.
- [ ] Dữ liệu khôi phục sau reload và mở lại; LocalStorage trống/hỏng được xử lý.
- [ ] Cache tách theo user và không chứa thông tin xác thực.
- [ ] Dashboard được tính từ dữ liệu thật; không cộng transfer/goal contribution thành thu/chi.
- [ ] ES6+ và các array methods được sử dụng thực chất, chia module.
- [ ] Không có link/nút/form bỏ trống; thao tác nguy hiểm có xác nhận; thông báo/empty/error/loading có đủ.
- [ ] Desktop/tablet/mobile được xem lại; không có lỗi console nghiêm trọng.
- [ ] Có thể trình bày kiến trúc, giải thích hàm và thực hiện yêu cầu sửa trực tiếp.
