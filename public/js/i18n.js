const translations = [
  ['Tên ngân hàng', 'Bank name', '银行名称'], ['Tên ví điện tử', 'E-wallet name', '电子钱包名称'], ['Số tài khoản / số ví', 'Account or wallet number', '账户或钱包号码'],
  ['Tự nhập tên', 'Enter a name', '自行输入名称'],
  ['Số tài khoản được mã hóa khi lưu; chỉ 4 số cuối hiển thị lại. Chỉ lưu thông tin nhận diện thủ công, không kết nối ngân hàng/ví và không yêu cầu mật khẩu hay OTP.', 'The number is encrypted when saved; only its last four digits are shown. This is manual identification only, with no bank or wallet connection, password or OTP.', '账户号码保存时会加密；仅显示末四位。这些信息仅用于手动识别，不连接银行或钱包，也不会索取密码或验证码。'],
  ['Chọn hoặc nhập tên', 'Choose or enter a name', '选择或输入名称'], ['Nhập số tài khoản hoặc số ví', 'Enter an account or wallet number', '输入账户或钱包号码'],
  ['Để trống để giữ nguyên.', 'Leave blank to keep it.', '留空以保留原号码。'],
  ['Có thể bỏ trống. Số tài khoản được mã hóa khi lưu; chỉ 4 số cuối hiển thị lại.', 'Optional. The number is encrypted at rest; only its last four digits are shown.', '可选。号码保存时会加密；仅显示末四位。'],
  ['Xóa số tài khoản đã lưu', 'Remove saved account number', '删除已保存的账户号码'],
  ['Chỉ lưu thông tin nhận diện thủ công; không kết nối ngân hàng/ví và không yêu cầu mật khẩu hay OTP.', 'These are manual labels only; no bank or wallet connection, password or OTP is requested.', '此处仅保存手动填写的信息；不会连接银行或钱包，也不会索取密码或验证码。'],
  ['Đây là ví Tiền mặt mặc định. Không thể xóa hoặc lưu trữ.', 'This is the default Cash wallet. It cannot be deleted or archived.', '这是默认现金钱包，无法删除或归档。'],
  ['Tài khoản chưa có dữ liệu liên quan; có thể xóa hẳn.', 'This account has no linked data and can be deleted permanently.', '此账户没有关联数据，可以永久删除。'],
  ['Tài khoản đã có lịch sử hoặc dữ liệu liên quan. Xóa hẳn sẽ bị khóa; lưu trữ sẽ giữ nguyên giao dịch và báo cáo cũ.', 'This account has linked history. Permanent deletion is blocked; archiving preserves its transactions and reports.', '此账户已有历史或关联数据，无法永久删除；归档会保留原交易和报告。'],
  ['Tài khoản được lưu trữ và ẩn khỏi biểu mẫu mới. Lịch sử được giữ; giao dịch định kỳ gắn với tài khoản sẽ được tạm dừng.', 'The account will be hidden from new forms. History is retained and linked recurring rules will be paused.', '账户将从新表单中隐藏。历史记录会保留，关联的定期规则将暂停。'],
  ['Tài khoản mặc định hoặc đã có dữ liệu liên quan', 'Default account or account with linked data', '默认账户或已有相关数据的账户'],
  ['Xóa tài khoản', 'Delete account', '删除账户'], ['Mặc định', 'Default', '默认'],
  ['Số tài khoản cần có từ 6 đến 34 chữ số.', 'Account number must contain 6 to 34 digits.', '账户号码必须为 6 至 34 位数字。'],
  ['Nhập tên ngân hàng hoặc ví điện tử.', 'Enter the bank or e-wallet name.', '请输入银行或电子钱包名称。'],
  ['Ví Mình — Quản lý chi tiêu cá nhân', 'Ví Mình — Personal finance manager', 'Ví Mình — 个人财务管理'],
  ['Menu chính', 'Main menu', '主菜单'], ['Quản trị', 'Administration', '管理'],
  ['Tổng quan', 'Overview', '总览'], ['Giao dịch', 'Transactions', '交易'], ['Tài khoản', 'Accounts', '账户'],
  ['Ngân sách', 'Budgets', '预算'], ['Định kỳ', 'Recurring', '周期交易'], ['Mục tiêu', 'Goals', '储蓄目标'],
  ['Báo cáo', 'Reports', '报告'], ['Danh mục', 'Categories', '分类'], ['Thông tin & trợ giúp', 'Information & help', '信息与帮助'],
  ['Khu vực Admin', 'Admin area', '管理后台'], ['Cài đặt tài khoản', 'Account settings', '账户设置'],
  ['Quản lý hồ sơ, bảo mật và tùy chọn hiển thị của bạn.', 'Manage your profile, security and display preferences.', '管理个人资料、安全和显示偏好。'],
  ['Thông tin cá nhân', 'Personal information', '个人信息'], ['Cập nhật tên, ảnh đại diện và email hiển thị trên tài khoản', 'Update your account name, profile photo and email', '更新账户姓名、头像和邮箱'],
  ['Chỉnh sửa hồ sơ', 'Edit profile', '编辑资料'], ['Họ và tên', 'Full name', '姓名'], ['Email hiện tại', 'Current email', '当前邮箱'],
  ['Email mới', 'New email', '新邮箱'], ['Đã xác nhận', 'Verified', '已验证'], ['Chưa xác nhận', 'Not verified', '未验证'],
  ['Đổi email', 'Change email', '更换邮箱'], ['Thêm email', 'Add email', '添加邮箱'], ['Đổi email an toàn', 'Change email securely', '安全更换邮箱'],
  ['Bước 1 · Xác minh email hiện tại', 'Step 1 · Verify your current email', '第 1 步 · 验证当前邮箱'],
  ['Bước 2 · Xác minh email mới', 'Step 2 · Verify your new email', '第 2 步 · 验证新邮箱'],
  ['Bước 3 · Xác nhận và lưu', 'Step 3 · Confirm and save', '第 3 步 · 确认并保存'],
  ['Mã xác nhận email hiện tại', 'Current email verification code', '当前邮箱验证码'], ['Mã xác nhận email mới', 'New email verification code', '新邮箱验证码'],
  ['Gửi mã xác nhận đổi', 'Send email change code', '发送更换邮箱验证码'], ['Gửi mã đến email mới', 'Send code to new email', '向新邮箱发送验证码'],
  ['Gửi lại mã', 'Resend code', '重新发送验证码'], ['Xác minh mã', 'Verify code', '验证验证码'], ['Xác nhận mã', 'Confirm code', '确认验证码'],
  ['Nhập mã 6 số', 'Enter the 6-digit code', '请输入 6 位验证码'], ['Hủy đổi email', 'Cancel email change', '取消更换邮箱'],
  ['Email hiện tại đã xác minh. Nhập email mới và xác nhận mã gửi đến địa chỉ đó.', 'Your current email is verified. Enter a new address and verify the code sent there.', '当前邮箱已验证。请输入新邮箱并验证发送到该地址的验证码。'],
  ['Email mới đã được xác minh. Bấm Lưu hồ sơ để áp dụng thay đổi.', 'The new email is verified. Select Save profile to apply the change.', '新邮箱已验证。点击保存资料以应用更改。'],
  ['Email tài khoản chỉ đổi sau khi bạn bấm Lưu hồ sơ.', 'Your account email changes only after you select Save profile.', '只有点击保存资料后，账户邮箱才会更改。'],
  ['Mã 6 chữ số sẽ được gửi đến email đã xác nhận của bạn. Email tài khoản chưa thay đổi ở bước này.', 'A six-digit code will be sent to your verified email. Your account email does not change at this step.', '验证码将发送到已验证邮箱。此步骤不会更改账户邮箱。'],
  ['Bảo mật & mật khẩu', 'Security & password', '安全与密码'], ['Bảo vệ quyền truy cập vào tài khoản của bạn', 'Protect access to your account', '保护账户访问安全'],
  ['Mật khẩu', 'Password', '密码'], ['Gửi liên kết đặt lại', 'Send reset link', '发送重置链接'],
  ['Tùy chỉnh hiển thị', 'Display preferences', '显示偏好'], ['Tùy chỉnh ứng dụng', 'App preferences', '应用偏好'],
  ['Cài đặt tiền tệ và ngôn ngữ được đồng bộ trong tài khoản của bạn', 'Currency and language settings are synced with your account', '货币和语言设置会同步到您的账户'],
  ['Đơn vị tiền tệ', 'Currency', '货币单位'], ['Ngôn ngữ giao diện', 'Interface language', '界面语言'],
  ['Áp dụng cho website, khu vực Admin và Mini app.', 'Applies to the website, Admin area and Mini app.', '应用于网站、管理后台和迷你应用。'],
  ['Tháng dashboard mặc định', 'Default dashboard month', '默认总览月份'], ['Chọn kỳ được hiển thị khi mở trang tổng quan', 'Choose the period shown when you open the overview', '选择打开总览时显示的月份'],
  ['Tài khoản & dữ liệu', 'Account & data', '账户与数据'], ['PostgreSQL là nguồn dữ liệu chuẩn; LocalStorage giữ cache trên thiết bị', 'PostgreSQL is the source of truth; LocalStorage keeps a device cache', 'PostgreSQL 是数据源；LocalStorage 在设备上保存缓存'],
  ['Đồng bộ', 'Sync', '同步'], ['Đã kết nối với máy chủ', 'Connected to the server', '已连接到服务器'], ['Chưa kết nối máy chủ', 'Server is unavailable', '服务器未连接'],
  ['Đồng bộ ngay', 'Sync now', '立即同步'], ['Cache cục bộ', 'Local cache', '本地缓存'], ['Đăng xuất', 'Sign out', '退出登录'],
  ['Xóa cache tài chính của tài khoản hiện tại trên thiết bị này', 'Remove this account’s finance cache from this device', '从此设备删除当前账户的财务缓存'],
  ['Mini app', 'Mini app', '迷你应用'], ['Liên kết ngân hàng', 'Bank connection', '银行连接'], ['Trợ giúp & liên hệ', 'Help & contact', '帮助与联系'],
  ['Cần trợ giúp?', 'Need help?', '需要帮助吗？'], ['Xem trang', 'See the', '查看'], ['để hiểu quy tắc tính số liệu và cách sử dụng.', 'page for calculation rules and usage instructions.', '页面了解计算规则和使用方法。'],
  ['Tạo giao dịch', 'Add transaction', '添加交易'], ['Thêm giao dịch', 'Add transaction', '添加交易'], ['Sửa giao dịch', 'Edit transaction', '编辑交易'],
  ['Khoản thu', 'Income', '收入'], ['Khoản chi', 'Expense', '支出'], ['Số tiền', 'Amount', '金额'], ['Ngày giao dịch', 'Transaction date', '交易日期'],
  ['Ngày', 'Date', '日期'], ['Loại', 'Type', '类型'], ['Tài khoản nguồn', 'Source account', '来源账户'], ['Danh mục chi', 'Expense category', '支出分类'],
  ['Ghi chú', 'Note', '备注'], ['không bắt buộc', 'optional', '可选'], ['Ví dụ: Ăn trưa', 'Example: Lunch', '例如：午餐'],
  ['Chọn tài khoản', 'Choose an account', '选择账户'], ['Chọn danh mục', 'Choose a category', '选择分类'], ['Lưu giao dịch', 'Save transaction', '保存交易'],
  ['Lưu hồ sơ', 'Save profile', '保存资料'], ['Lưu thay đổi', 'Save changes', '保存更改'], ['Lưu', 'Save', '保存'], ['Hủy', 'Cancel', '取消'],
  ['Đang lưu…', 'Saving…', '正在保存…'], ['Đang tải…', 'Loading…', '正在加载…'], ['Đang gửi…', 'Sending…', '正在发送…'],
  ['Đang xác nhận…', 'Verifying…', '正在验证…'], ['Đang đồng bộ…', 'Syncing…', '正在同步…'], ['Thử lại', 'Try again', '重试'],
  ['Tìm kiếm', 'Search', '搜索'], ['Tìm nhanh giao dịch…', 'Quick transaction search…', '快速搜索交易…'], ['Lọc', 'Filter', '筛选'], ['Xóa bộ lọc', 'Clear filters', '清除筛选'],
  ['Tất cả', 'All', '全部'], ['Từ ngày', 'From', '开始日期'], ['Đến ngày', 'To', '结束日期'], ['Tháng này', 'This month', '本月'],
  ['Tháng trước', 'Last month', '上个月'], ['Tùy chỉnh', 'Custom', '自定义'], ['Mới nhất', 'Newest', '最新'], ['Cũ nhất', 'Oldest', '最早'],
  ['Tổng quan tài chính', 'Financial overview', '财务总览'], ['Tổng thu', 'Total income', '总收入'], ['Tổng chi', 'Total expenses', '总支出'],
  ['Dòng tiền ròng', 'Net cash flow', '净现金流'], ['Số dư hiện tại', 'Current balance', '当前余额'], ['Giao dịch gần đây', 'Recent transactions', '最近交易'],
  ['Xem tất cả', 'View all', '查看全部'], ['Không có dữ liệu', 'No data', '暂无数据'], ['Chưa có giao dịch nào.', 'No transactions yet.', '暂无交易。'],
  ['Không tìm thấy giao dịch phù hợp.', 'No matching transactions found.', '未找到匹配的交易。'], ['Không có giao dịch trong kỳ này.', 'No transactions in this period.', '此期间没有交易。'],
  ['Báo cáo thu chi', 'Income and expense report', '收支报告'], ['Khoảng thời gian', 'Date range', '时间范围'], ['Từ', 'From', '从'], ['Đến', 'To', '至'],
  ['Tải Excel', 'Download Excel', '下载 Excel'], ['Tải PDF', 'Download PDF', '下载 PDF'], ['Xuất Excel', 'Export Excel', '导出 Excel'], ['Xuất PDF', 'Export PDF', '导出 PDF'],
  ['Mục tiêu tiết kiệm', 'Savings goals', '储蓄目标'], ['Tạo mục tiêu', 'Create goal', '创建目标'], ['Chỉnh sửa mục tiêu', 'Edit goal', '编辑目标'],
  ['Nạp tiền', 'Add funds', '存入资金'], ['Rút tiền', 'Withdraw', '取出资金'], ['Lưu trữ', 'Archive', '归档'], ['Tiến độ mục tiêu', 'Goal progress', '目标进度'],
  ['Ngân sách tháng', 'Monthly budget', '月度预算'], ['Đã dùng', 'Spent', '已使用'], ['Còn lại', 'Remaining', '剩余'], ['Vượt ngân sách', 'Over budget', '超出预算'],
  ['Danh mục thu chi', 'Income and expense categories', '收支分类'], ['Thêm danh mục', 'Add category', '添加分类'], ['Sửa danh mục', 'Edit category', '编辑分类'],
  ['Tài khoản & ví', 'Accounts & wallets', '账户与钱包'], ['Thêm tài khoản', 'Add account', '添加账户'], ['Chuyển tiền', 'Transfer', '转账'],
  ['Giao dịch định kỳ', 'Recurring transactions', '周期交易'], ['Tạo quy tắc định kỳ', 'Create recurring rule', '创建周期规则'], ['Tạm dừng', 'Pause', '暂停'], ['Tiếp tục', 'Resume', '继续'],
  ['Thông tin & trợ giúp', 'Information & help', '信息与帮助'], ['Gửi yêu cầu hỗ trợ', 'Send a support request', '提交支持请求'], ['Lịch sử yêu cầu hỗ trợ', 'Support request history', '支持请求历史'],
  ['Admin', 'Admin', '管理'], ['Chỉ số hệ thống', 'System metrics', '系统指标'], ['Người dùng', 'Users', '用户'], ['Nhật ký quản trị', 'Admin audit log', '管理审计日志'],
  ['Trạng thái dịch vụ', 'Service status', '服务状态'], ['Trạng thái các thành phần hạ tầng', 'Infrastructure component status', '基础设施组件状态'],
  ['Kiểm tra lúc', 'Checked at', '检查时间'], ['Sẵn sàng', 'Ready', '就绪'], ['Chưa sẵn sàng', 'Not ready', '未就绪'], ['Đang hoạt động', 'Active', '运行中'],
  ['Chờ xác minh', 'Awaiting verification', '等待验证'], ['Đã khóa', 'Locked', '已锁定'], ['Đã giải quyết', 'Resolved', '已解决'], ['Đang xử lý', 'In progress', '处理中'],
  ['Đăng nhập thành công', 'Sign-in successful', '登录成功'], ['Đăng nhập thất bại', 'Sign-in failed', '登录失败'], ['Yêu cầu khôi phục mật khẩu', 'Password recovery requested', '已请求找回密码'],
  ['Thời gian', 'Time', '时间'], ['Người thực hiện', 'Performed by', '操作人'], ['Hoạt động', 'Activity', '活动'], ['Đối tượng', 'Subject', '对象'], ['Chi tiết thay đổi', 'Change details', '更改详情'],
  ['Trợ lý Ví Mình', 'Ví Mình Assistant', 'Ví Mình 助手'], ['Ghi nhanh và theo dõi thu chi', 'Quickly record and track income and expenses', '快速记录和跟踪收支'],
  ['Mở website', 'Open website', '打开网站'], ['Mở website trên trình duyệt', 'Open website in browser', '在浏览器中打开网站'], ['Thêm nhanh', 'Quick add', '快速添加'],
  ['5 giao dịch mới nhất', '5 most recent transactions', '最近 5 笔交易'], ['Cập nhật gần đây', 'Recent updates', '最近更新'], ['Đang đồng bộ số dư…', 'Syncing balances…', '正在同步余额…'],
  ['Tổng tài sản hiện tại', 'Current total assets', '当前总资产'], ['Số dư các ví chi tiêu', 'Spending wallet balance', '日常钱包余额'], ['Số dư mục tiêu tiết kiệm', 'Savings goal balance', '储蓄目标余额'],
  ['Không đặt ngày hoàn thành', 'No target date', '未设置完成日期'], ['Mục tiêu đến', 'Goal date', '目标日期'], ['hoàn thành', 'complete', '已完成'], ['Đã đạt mục tiêu', 'Goal reached', '已达成目标'],
  ['Chưa có mục tiêu tiết kiệm.', 'No savings goals yet.', '暂无储蓄目标。'], ['Chưa có giao dịch nào. Hãy thêm giao dịch đầu tiên.', 'No transactions yet. Add your first transaction.', '暂无交易。请添加第一笔交易。'],
  ['Đăng nhập để tiếp tục', 'Sign in to continue', '登录以继续'], ['Đăng ký', 'Sign up', '注册'], ['Đăng nhập', 'Sign in', '登录'], ['Mật khẩu', 'Password', '密码'],
  ['Quên mật khẩu?', 'Forgot password?', '忘记密码？'], ['Xác minh email', 'Verify email', '验证邮箱'], ['Gửi mã xác nhận', 'Send verification code', '发送验证码'],
  ['Xác minh email đã gửi đến', 'Verification email sent to', '验证邮件已发送至'], ['Tạo tài khoản', 'Create account', '创建账户'], ['Họ tên', 'Name', '姓名'],
  ['Mật khẩu xác nhận', 'Confirm password', '确认密码'], ['Điều khoản sử dụng', 'Terms of use', '使用条款'], ['Thông báo quyền riêng tư', 'Privacy notice', '隐私声明'],
  ['Không thể kết nối với Ví Mình.', 'Could not connect to Ví Mình.', '无法连接到 Ví Mình。'], ['Máy chủ chưa sẵn sàng.', 'The server is not ready.', '服务器尚未就绪。'],
  ['Đã lưu thành công.', 'Saved successfully.', '保存成功。'], ['Đã cập nhật hồ sơ.', 'Profile updated.', '资料已更新。'], ['Email đã được xác nhận thành công.', 'Email verified successfully.', '邮箱验证成功。'],
  ['Email này đã được sử dụng bởi một tài khoản khác.', 'This email is already used by another account.', '此邮箱已被其他账户使用。'],
  ['Nhập địa chỉ email hợp lệ.', 'Enter a valid email address.', '请输入有效的邮箱地址。'], ['Mã không đúng, đã hết hạn hoặc đã được sử dụng. Hãy gửi mã mới.', 'The code is incorrect, expired or already used. Request a new code.', '验证码错误、已过期或已使用。请重新获取。'],
  ['Không tìm thấy kết quả phù hợp', 'No matching results', '未找到匹配结果'], ['Thử đổi từ khóa hoặc xóa một số bộ lọc.', 'Try a different search or remove some filters.', '请尝试更换关键词或清除部分筛选条件。'],
  ['Chọn kỳ', 'Choose period', '选择期间'], ['Hôm nay', 'Today', '今天'], ['Tuần này', 'This week', '本周'], ['Tuần trước', 'Last week', '上周'],
  ['Tổng cộng', 'Total', '总计'], ['Số giao dịch', 'Transaction count', '交易笔数'], ['Tỷ lệ', 'Rate', '比率'], ['Trạng thái', 'Status', '状态'],
  ['Có lỗi xảy ra.', 'Something went wrong.', '发生错误。'], ['Thao tác thành công.', 'Action completed.', '操作成功。'], ['Không có dữ liệu trong kỳ này.', 'No data for this period.', '此期间暂无数据。'],
  ['Làm mới dữ liệu', 'Refresh data', '刷新数据'], ['Làm mới', 'Refresh', '刷新'], ['Chi tiết tài sản và mục tiêu tiết kiệm', 'Asset and savings goal details', '资产和储蓄目标详情'],
  ['Mở chi tiết tổng tài sản và mục tiêu tiết kiệm', 'Open total assets and savings goals', '打开总资产和储蓄目标详情'], ['Tạo mục tiêu đầu tiên để bắt đầu theo dõi.', 'Create your first goal to start tracking.', '创建第一个目标以开始跟踪。'],
  ['Trợ lý dùng cùng tài khoản và dữ liệu với website Ví Mình.', 'The assistant uses the same account and data as the Ví Mình website.', '助手与 Ví Mình 网站使用相同账户和数据。'],
  ['Giao dịch', 'Transactions', '交易'], ['Tạo giao dịch', 'Add transaction', '添加交易'], ['Mở website trên trình duyệt', 'Open website in browser', '在浏览器中打开网站'],
  ['Dữ liệu đồng bộ với tài khoản Ví Mình', 'Data is synced with your Ví Mình account', '数据与您的 Ví Mình 账户同步'], ['Tên mục tiêu', 'Goal name', '目标名称'],
  ['Số tiền cần đạt', 'Target amount', '目标金额'], ['Ngày mục tiêu', 'Target date', '目标日期'], ['Màu nhận diện', 'Goal color', '目标颜色'],
  ['Từ tài khoản', 'From account', '转出账户'], ['Chuyển đến tài khoản', 'Transfer to account', '转入账户'], ['Ngày mục tiêu', 'Target date', '目标日期'],
  ['Mục tiêu tiết kiệm', 'Savings goals', '储蓄目标'], ['Lưu mục tiêu', 'Save goal', '保存目标'], ['Đóng', 'Close', '关闭'], ['Đang đồng bộ số dư…', 'Syncing balances…', '正在同步余额…'],
  ['Chưa có tài khoản hoạt động', 'No active accounts', '没有可用账户'], ['Chưa có danh mục phù hợp', 'No matching categories', '没有匹配的分类'], ['Chưa có tài khoản thu/chi hoạt động', 'No active income or expense accounts', '没有可用的收入或支出账户'],
  ['Chỉnh sửa', 'Edit', '编辑'], ['＋ Nạp tiền', '＋ Add funds', '＋ 存入资金'], ['Nạp tiền mục tiêu', 'Add funds to goal', '向目标存入资金'],
  ['Cập nhật thông tin và tiến độ mục tiêu tiết kiệm.', 'Update the savings goal details and progress.', '更新储蓄目标信息和进度。'], ['Tạo ví riêng để theo dõi số dư mục tiêu.', 'Create a separate wallet to track this goal balance.', '创建独立钱包以跟踪目标余额。'],
  ['Nạp tiền vào', 'Add funds to', '存入'], ['Rút tiền từ', 'Withdraw from', '取出'], ['Thao tác này không tính vào thu hoặc chi.', 'This action is not counted as income or expense.', '此操作不计入收入或支出。'],
  ['Nhập tên mục tiêu từ 1 đến 100 ký tự.', 'Enter a goal name between 1 and 100 characters.', '请输入 1 到 100 个字符的目标名称。'], ['Chọn tài khoản để tiếp tục.', 'Choose an account to continue.', '请选择账户以继续。'],
  ['Chọn ngày giao dịch.', 'Choose a transaction date.', '请选择交易日期。'], ['Tỷ giá USD/VND đã cũ. Hãy mở website Cài đặt để kiểm tra tỷ giá trước khi ghi số tiền USD.', 'The USD/VND rate is outdated. Open Settings on the website to check the rate before entering USD amounts.', 'USD/VND 汇率已过期。输入美元金额前，请打开网站设置检查汇率。'],
  ['Chưa tải được tỷ giá USD/VND. Hãy mở website Cài đặt để kiểm tra.', 'Could not load the USD/VND rate. Open Settings on the website to check it.', '无法加载 USD/VND 汇率。请打开网站设置检查。'],
  ['Chưa đăng nhập vào Ví Mình.', 'You are not signed in to Ví Mình.', '您尚未登录 Ví Mình。'], ['Không mở được website trong trình duyệt mặc định.', 'Could not open the website in your default browser.', '无法在默认浏览器中打开网站。'],
  ['Đã cập nhật mục tiêu.', 'Goal updated.', '目标已更新。'], ['Đã tạo mục tiêu tiết kiệm.', 'Savings goal created.', '储蓄目标已创建。'], ['Đã nạp tiền vào mục tiêu.', 'Funds added to the goal.', '已向目标存入资金。'],
  ['Đã rút tiền mục tiêu.', 'Funds withdrawn from the goal.', '已从目标取出资金。'], ['Đã lưu trữ mục tiêu. Số dư và lịch sử vẫn được giữ.', 'Goal archived. Its balance and history are preserved.', '目标已归档，余额和历史记录将保留。'],
  ['Nhập số tiền lớn hơn 0 và đúng định dạng USD.', 'Enter an amount greater than zero in the correct USD format.', '请输入大于零且格式正确的美元金额。'],
  ['Chọn tài khoản, danh mục và ngày giao dịch.', 'Choose an account, category and transaction date.', '请选择账户、分类和交易日期。'], ['Đã lưu giao dịch thành công.', 'Transaction saved successfully.', '交易已成功保存。'],
  ['Bước 1 · Xác minh email hiện tại', 'Step 1 · Verify your current email', '第 1 步 · 验证当前邮箱'], ['Bước 2 · Xác minh email mới', 'Step 2 · Verify your new email', '第 2 步 · 验证新邮箱'],
  ['Email hiện tại đã xác minh. Nhập email mới và xác nhận mã gửi đến địa chỉ đó.', 'Your current email is verified. Enter a new address and verify the code sent there.', '当前邮箱已验证。请输入新邮箱并验证发送到该地址的验证码。'],
  ['Admin tổng quan', 'Admin overview', '管理后台总览'], ['Tổng quan hệ thống', 'System overview', '系统总览'], ['Chỉ số hệ thống', 'System metrics', '系统指标'],
  ['Người dùng', 'Users', '用户'], ['Nhật ký quản trị', 'Admin audit log', '管理审计日志'], ['Trạng thái dịch vụ', 'Service status', '服务状态'],
  ['Trạng thái các thành phần hạ tầng', 'Infrastructure component status', '基础设施组件状态'], ['Kiểm tra lúc', 'Checked at', '检查时间'],
  ['Tài khoản chờ xác minh email', 'Accounts awaiting email verification', '等待邮箱验证的账户'], ['Danh sách tài khoản chờ xác minh email', 'Accounts awaiting email verification', '等待邮箱验证的账户列表'],
  ['Ngày đăng ký', 'Registration date', '注册日期'], ['Thời gian chờ', 'Waiting time', '等待时间'], ['Trạng thái OTP gần nhất', 'Latest OTP status', '最近验证码状态'],
  ['Thao tác', 'Action', '操作'], ['Chi tiết', 'Details', '详情'], ['Chưa có mã', 'No code', '暂无验证码'], ['Còn hạn', 'Valid', '有效'],
  ['Đã hết hạn', 'Expired', '已过期'], ['Khóa OTP', 'OTP locked', '验证码已锁定'], ['Đã tắt', 'Disabled', '已停用'], ['Đang hiển thị', 'Visible', '显示中'],
  ['Mới tiếp nhận', 'New', '新提交'], ['Đang xử lý', 'In progress', '处理中'], ['Đã giải quyết', 'Resolved', '已解决'], ['Quản lý người dùng', 'User management', '用户管理'],
  ['Tìm người dùng', 'Search users', '搜索用户'], ['Trạng thái tài khoản', 'Account status', '账户状态'], ['Vai trò', 'Role', '角色'], ['Admin', 'Admin', '管理员'],
  ['Quản trị hệ thống', 'System administration', '系统管理'], ['Dịch vụ email', 'Email service', '邮件服务'], ['Cơ sở dữ liệu', 'Database', '数据库'], ['Máy chủ API', 'API server', 'API 服务器'],
  ['Dịch vụ Email SMTP', 'SMTP email service', 'SMTP 邮件服务'], ['Yêu cầu khôi phục MK', 'Password recovery request', '密码找回请求'], ['Đăng nhập thành công', 'Sign-in successful', '登录成功'],
  ['Đăng nhập thất bại', 'Sign-in failed', '登录失败'], ['Xem thêm', 'View more', '查看更多'], ['Không có kết quả', 'No results', '没有结果'], ['Không tìm thấy dữ liệu phù hợp.', 'No matching data found.', '未找到匹配数据。'],
  ['GIÁM SÁT & PHÂN TÍCH', 'MONITORING & ANALYTICS', '监控与分析'], ['Công cụ quản trị', 'Administration tools', '管理工具'], ['Phân tích hoạt động & tính năng', 'Activity and feature analytics', '活动与功能分析'],
  ['Phân tích từ số liệu tổng hợp', 'Analyze aggregated metrics', '分析汇总指标'], ['Số liệu tổng hợp Admin', 'Aggregated Admin metrics', '管理后台汇总指标'], ['Admin API không truy xuất số tiền cá nhân.', 'The Admin API does not access personal amounts.', '管理后台 API 不读取个人金额。'],
  ['Agent không tự khóa hoặc đổi quyền tài khoản.', 'The Agent does not lock accounts or change roles automatically.', '智能助手不会自动锁定账户或更改权限。'], ['Agent phân tích theo quy tắc cục bộ; chưa kết nối mô hình AI bên ngoài.', 'The Agent uses local rules and is not connected to an external AI model.', '智能助手依据本地规则分析，尚未连接外部 AI 模型。'],
  ['Quản lý tài chính của riêng bạn', 'Manage your personal finances', '管理您的个人财务'], ['Cá nhân', 'Personal', '个人'], ['Quản trị hệ thống', 'System administration', '系统管理'], ['Quy trình hoạt động', 'Operational workflow', '运行流程'],
  ['Cờ tính năng hệ thống (Feature Flags)', 'System feature flags', '系统功能开关'], ['Tài khoản chờ xác minh email', 'Accounts awaiting email verification', '等待邮箱验证的账户'], ['Danh sách yêu cầu hỗ trợ', 'Support request list', '支持请求列表'],
  ['Bạn chưa có yêu cầu hỗ trợ nào được gửi.', 'You have not submitted any support requests.', '您尚未提交支持请求。'], ['Ghi chú phản hồi cho người dùng', 'Response note for the user', '给用户的回复备注'],
  ['Chọn trạng thái để lọc hoặc cập nhật ghi chú phản hồi cho người dùng', 'Choose a status to filter or update the response note for the user', '选择状态以筛选或更新给用户的回复备注'],
  ['Người dùng hoạt động 14 ngày qua', 'Users active in the last 14 days', '过去 14 天活跃的用户'], ['Phiên đang hoạt động', 'Active sessions', '活跃会话'], ['Hoạt động gần nhất', 'Last activity', '最近活动'],
  ['Hoạt động quản trị gần đây', 'Recent administrative activity', '最近的管理活动'], ['Nhật ký sự kiện bảo mật', 'Security event log', '安全事件日志'], ['Lịch sử tác động quản trị', 'Admin action history', '管理操作历史'],
  ['Lịch sử thay đổi trạng thái, vai trò và vận hành', 'History of status, role and operational changes', '状态、角色和运维变更历史'], ['Lịch sử Database Migrations', 'Database migration history', '数据库迁移历史'],
  ['Bảng schema_migrations trong PostgreSQL', 'PostgreSQL schema_migrations table', 'PostgreSQL schema_migrations 表'], ['Mô tả Migration', 'Migration description', '迁移说明'], ['Phiên bản', 'Version', '版本'],
  ['Endpoint', 'Endpoint', '接口路径'], ['Giới hạn dữ liệu', 'Data limits', '数据限制'], ['IP Bucket (HMAC ngày)', 'IP bucket (daily HMAC)', 'IP 分组（每日 HMAC）'], ['Mã khóa:', 'Lock code:', '锁定代码：'],
  ['Cảnh báo / Bảo trì (Vàng cam)', 'Warning / Maintenance (Amber)', '警告 / 维护（橙黄色）'], ['Chưa triển khai', 'Not implemented', '尚未实现'], ['Chưa xác nhận', 'Not confirmed', '尚未确认'], ['Chưa có kết nối thật', 'No live connection', '尚无真实连接'],
  ['Kiểm tra kết nối ở thời điểm hiện tại', 'Check the current connection status', '检查当前连接状态'], ['Kiểm tra lại', 'Check again', '重新检查'], ['Đồng bộ gần nhất', 'Last sync', '最近同步'],
  ['Lượt tạo link Bank Hub', 'Bank Hub link attempts', 'Bank Hub 链接尝试次数'], ['Giám sát chuyển đổi liên kết ngân hàng và điều khoản', 'Monitor bank link and consent conversion', '监控银行连接与同意转化'],
  ['Phễu SePay Bank Hub & Đồng thuận pháp lý', 'SePay Bank Hub and legal consent funnel', 'SePay Bank Hub 与法律同意漏斗'], ['Luồng mở Hosted Link đã được nối với backend sandbox.', 'The Hosted Link flow is connected to the sandbox backend.', 'Hosted Link 流程已连接到沙盒后端。'],
  ['Sandbox; chỉ xác nhận bước liên kết, chưa đồng bộ giao dịch', 'Sandbox; confirms linking only and does not sync transactions', '沙盒；仅确认连接步骤，不同步交易'], ['Import giao dịch, phân loại và đồng bộ định kỳ chưa được bật trong mốc này.', 'Transaction import, classification and scheduled sync are not enabled in this milestone.', '此阶段未启用交易导入、分类和定期同步。'],
  ['Chọn một ngân hàng trong danh sách SePay Bank Hub đang công bố.', 'Choose a bank from the current SePay Bank Hub list.', '从当前 SePay Bank Hub 列表中选择银行。'], ['Mở cửa sổ mini app ngay trên máy đang chạy website.', 'Open the mini app window on the computer running the website.', '在运行网站的电脑上打开迷你应用窗口。'],
  ['. Mở mini app một lần để đăng ký liên kết mở từ trình duyệt.', '. Open the mini app once to register the browser launch link.', '. 首次打开迷你应用以注册浏览器启动链接。'],
  ['Bộ lọc nâng cao', 'Advanced filters', '高级筛选'], ['Lọc số liệu báo cáo theo ngày', 'Filter report data by date', '按日期筛选报告数据'], ['Phù hợp với bộ lọc', 'Matching the filters', '符合筛选条件'], ['Không có dữ liệu biểu đồ.', 'No chart data.', '暂无图表数据。'],
  ['Biểu đồ sẽ có điểm dữ liệu sau lần đồng bộ hằng ngày tiếp theo.', 'The chart will show data after the next daily sync.', '下次每日同步后，图表将显示数据。'], ['Lưu lượng bản ghi thu/chi theo tháng', 'Monthly income and expense record volume', '每月收支记录数量'],
  ['Số tài khoản đăng ký trong từng tháng', 'Accounts registered each month', '每月注册账户数'], ['Đếm từ bảng sessions.last_seen_at', 'Counted from sessions.last_seen_at', '根据 sessions.last_seen_at 统计'],
  ['Chỉ đếm số lượng giao dịch (Xanh: Thu · Cam: Chi)', 'Counts transactions only (blue: income · orange: expenses)', '仅统计交易笔数（蓝色：收入 · 橙色：支出）'],
  ['Các khoản thu chi đã ghi nhận trong tháng', 'Income and expenses recorded this month', '本月记录的收入和支出'], ['Phân bố hiện tại', 'Current distribution', '当前分布'], ['Chuyển nội bộ không làm thay đổi tổng thu hoặc chi', 'Internal transfers do not change total income or expenses', '内部转账不会改变收入或支出总额'],
  ['Chuyển tiền giữa tài khoản được loại trừ', 'Transfers between accounts are excluded', '账户间转账不计入'], ['Không đọc nội dung giao dịch cá nhân.', 'Personal transaction details are not accessed.', '不会读取个人交易详情。'], ['Không lưu mật khẩu, OTP hay địa chỉ IP thô', 'Passwords, OTPs and raw IP addresses are not stored', '不存储密码、验证码或原始 IP 地址'],
  ['Người dùng đã đồng thuận', 'Users who accepted', '已同意的用户'], ['Đồng thuận pháp lý', 'Legal consent', '法律同意'], ['Quyền riêng tư luôn được ưu tiên', 'Privacy comes first', '隐私始终优先'], ['Có thể tạm tắt hoặc xóa thông báo bất kỳ lúc nào', 'Notifications can be disabled or removed at any time', '可随时关闭或删除通知'],
  ['Hiển thị ngay trên đầu giao diện người dùng nếu đang bật', 'Shown at the top of the user interface when enabled', '启用后显示在用户界面顶部'], ['Mở màn hình thao tác có kiểm soát', 'Open the controlled action screen', '打开受控操作页面'], ['Mọi thay đổi vẫn cần xác nhận trong màn quản trị.', 'All changes still require confirmation in the Admin panel.', '所有更改仍需在管理后台确认。'],
  ['Đăng thông báo mới', 'Publish a new announcement', '发布新公告'], ['Lưu xử lý', 'Save handling', '保存处理结果'], ['Mật khẩu Admin xác nhận *', 'Confirm Admin password *', '管理员密码确认 *'], ['Vui lòng nhập mật khẩu Admin hiện tại để xác thực.', 'Enter your current Admin password to authenticate.', '请输入当前管理员密码以验证身份。'],
  ['Bạn sắp đổi vai trò của', 'You are about to change the role of', '您即将更改以下用户的角色：'], ['Bạn kiểm soát quyền truy cập và từng khoản được nhập.', 'You control access and every recorded transaction.', '您可以控制访问权限和每笔录入的交易。'], ['Đồng bộ sẽ làm sau', 'Sync later', '稍后同步'], ['Đang cập nhật số liệu…', 'Updating metrics…', '正在更新指标…'],
  ['Quy đổi nhanh', 'Quick conversion', '快速换算'], ['₫ / 1 USD', '₫ / 1 USD', '₫ / 1 美元'], ['Phản hồi từ Ban Quản Trị:', 'Response from the administration:', '管理团队回复：'], ['Nội dung yêu cầu từ người dùng:', 'Request from the user:', '用户请求内容：'],
  ['Mức độ hiển thị', 'Visibility level', '显示级别'], ['Khẩn cấp', 'Urgent', '紧急'], ['Khóa', 'Lock', '锁定'], ['Mở khóa', 'Unlock', '解锁'], ['Giới hạn dữ liệu', 'Data limits', '数据限制'],
  ['Khác', 'Other', '其他'], ['Đã dành dụm', 'Saved so far', '已存入'], ['＋ Tạo mục tiêu', '＋ Create goal', '＋ 创建目标'], ['Từ', 'From', '从'], ['Đang tải chỉ số tài khoản…', 'Loading account metrics…', '正在加载账户指标…'],
  ['Cài đặt', 'Settings', '设置'], ['Quản lý thông tin cá nhân và dữ liệu của bạn.', 'Manage your personal information and data.', '管理您的个人信息和数据。'],
  ['Cách sử dụng Ví Mình và quy tắc tính số liệu', 'How to use Ví Mình and calculation rules', '如何使用 Ví Mình 及其计算规则'], ['Theo dõi dòng tiền và quản lý mục tiêu của bạn', 'Track your cash flow and manage your goals', '跟踪现金流并管理您的目标'],
  ['Thêm giao dịch đầu tiên hoặc thay đổi bộ lọc để xem dữ liệu.', 'Add your first transaction or change filters to see data.', '添加第一笔交易或更改筛选条件以查看数据。'],
  ['Tháng này chưa có giao dịch', 'No transactions this month', '本月暂无交易'], ['Ghi nhận khoản thu hoặc chi đầu tiên để bắt đầu theo dõi.', 'Record your first income or expense to start tracking.', '记录第一笔收入或支出以开始跟踪。'],
  ['Thu chi · Sổ giao dịch cá nhân', 'Income and expenses · Personal ledger', '收支 · 个人账本'], ['Toàn bộ giao dịch trong danh mục, sắp xếp từ mới nhất.', 'All transactions in this category, newest first.', '此分类中的所有交易，按最新排序。'],
  ['Các khoản thu hoặc chi thuộc danh mục này sẽ xuất hiện tại đây.', 'Income or expenses in this category will appear here.', '此分类中的收入或支出会显示在这里。'],
  ['Đặt hạn mức chi theo danh mục và theo dõi tiến độ.', 'Set category spending limits and track progress.', '按分类设置支出限额并跟踪进度。'], ['Theo dõi tích lũy mục tiêu.', 'Track your savings progress.', '跟踪储蓄进度。'],
  ['Các khoản lặp lại được tạo tự động theo lịch.', 'Recurring transactions are created automatically on schedule.', '周期交易会按计划自动创建。'], ['Lịch sử danh mục', 'Category history', '分类历史'],
  ['Tháng thống kê', 'Statistics month', '统计月份'], ['Tháng ngân sách', 'Budget month', '预算月份'], ['Tháng dashboard mặc định', 'Default dashboard month', '默认总览月份'],
  ['Tất cả tháng', 'All months', '所有月份'], ['Tất cả tài khoản', 'All accounts', '所有账户'], ['Tất cả danh mục', 'All categories', '所有分类'], ['Tất cả loại', 'All types', '所有类型'],
  ['Tất cả giao dịch', 'All transactions', '所有交易'], ['Tất cả hạn mức', 'All limits', '所有限额'], ['Sắp đến hạn', 'Due soon', '即将到期'], ['Trong 7 ngày tới', 'In the next 7 days', '未来 7 天内'],
  ['Quy tắc đã tạo', 'Rules created', '已创建规则'], ['Quy tắc chưa hoạt động', 'Inactive rules', '未启用的规则'], ['Giao dịch đến hạn được tạo tối đa một lần cho mỗi ngày.', 'Each due transaction is created at most once per day.', '每笔到期交易每天最多创建一次。'],
  ['Tài khoản không đủ số dư sẽ làm toàn bộ lượt chạy dừng và không lưu dở.', 'If an account has insufficient funds, the run stops without a partial save.', '账户余额不足时，本次运行会停止且不会部分保存。'],
  ['Tạo ngân sách theo danh mục để theo dõi giới hạn chi tiêu.', 'Create category budgets to track spending limits.', '按分类创建预算以跟踪支出限额。'], ['Tạo hạn mức theo danh mục để theo dõi chi tiêu rõ hơn.', 'Create category limits to track spending more clearly.', '按分类设置限额以便更清楚地跟踪支出。'],
  ['Đặt hạn mức chi theo danh mục và theo dõi tiến độ.', 'Set category spending limits and track progress.', '按分类设置支出限额并跟踪进度。'], ['Chuyển tiền và tài khoản', 'Transfers and accounts', '转账与账户'],
  ['Số dư được tính từ sổ thu chi và chuyển tiền.', 'Balances are calculated from income, expenses and transfers.', '余额根据收支和转账计算。'], ['Thêm ví để bắt đầu ghi nhận thu chi.', 'Add a wallet to start recording income and expenses.', '添加钱包以开始记录收支。'],
  ['Chưa có lần chuyển tiền nào', 'No transfers yet', '暂无转账记录'], ['Chuyển tiền giữa các tài khoản hoặc nạp tiền vào mục tiêu tiết kiệm.', 'Transfer between accounts or add funds to a savings goal.', '在账户之间转账或向储蓄目标存入资金。'],
  ['Tạo mục tiêu đầu tiên và dành riêng một ví cho khoản tiết kiệm đó.', 'Create your first goal and dedicate a wallet to those savings.', '创建第一个目标并为储蓄专门设置一个钱包。'],
  ['Các khoản thu chi đã ghi nhận trong tháng', 'Income and expenses recorded this month', '本月记录的收入和支出'], ['Khoản thu đã ghi nhận', 'Recorded income', '已记录收入'], ['Khoản chi đã ghi nhận', 'Recorded expenses', '已记录支出'],
  ['Tổng số dư hiện tại', 'Current total balance', '当前总余额'], ['Thu trừ chi tháng này:', 'Income minus expenses this month:', '本月收入减支出：'], ['Ngân hàng', 'Bank', '银行'], ['Ví điện tử', 'E-wallet', '电子钱包'], ['Ví mục tiêu', 'Goal wallet', '目标钱包'], ['Ví tiền mặt', 'Cash wallet', '现金钱包'],
  ['Số dư ban đầu', 'Opening balance', '期初余额'], ['Số dư được tính từ sổ thu chi và chuyển tiền.', 'Balances are calculated from the income and expense ledger and transfers.', '余额根据收支账本和转账计算。'],
  ['Tạo quy tắc cho tiền nhà, hóa đơn, lương hoặc khoản thu chi lặp lại.', 'Create a rule for rent, bills, salary or recurring income and expenses.', '为房租、账单、工资或周期收支创建规则。'],
  ['Cài đặt → Mini app', 'Settings → Mini app', '设置 → 迷你应用'], ['Mở mini app', 'Open mini app', '打开迷你应用'], ['Cài đặt Mini app', 'Mini app settings', '迷你应用设置'],
  ['Ngôn ngữ giao diện được áp dụng cho các mục và nhãn của hệ thống.', 'The interface language applies to system pages and labels.', '界面语言适用于系统页面和标签。'], ['Tiếng Việt', 'Vietnamese', '越南语'], ['Tiếng Trung giản thể', 'Simplified Chinese', '简体中文'],
  ['Giao dịch thu chi', 'Income and expense transactions', '收支交易'], ['Tạo, tìm kiếm, lọc và sắp xếp giao dịch theo loại, tài khoản, danh mục, khoảng ngày và số tiền. Chuyển khoản nội bộ không được tính thành thu hoặc chi.', 'Create, search, filter and sort transactions by type, account, category, date range and amount. Internal transfers are not counted as income or expenses.', '按类型、账户、分类、日期范围和金额创建、搜索、筛选和排序交易。内部转账不计为收入或支出。'],
  ['Số dư và tài khoản', 'Balances and accounts', '余额和账户'], ['Số dư được tính từ số dư ban đầu, các khoản thu, chi và chuyển khoản. Tổng tài sản có bao gồm các ví mục tiêu đang hoạt động.', 'Balances are calculated from opening balances, income, expenses and transfers. Total assets include active goal wallets.', '余额根据期初余额、收入、支出和转账计算。总资产包括启用中的目标钱包。'],
  ['Mỗi mục tiêu có ví riêng. Nạp/rút mục tiêu là chuyển tiền nội bộ để báo cáo thu chi không bị sai.', 'Each goal has its own wallet. Deposits and withdrawals are internal transfers, keeping income and expense reports accurate.', '每个目标都有独立钱包。目标存取款属于内部转账，以确保收支报告准确。'],
  ['Đã dùng là tổng khoản chi theo đúng danh mục trong tháng. Nếu vượt hạn mức, thanh tiến độ hiển thị tối đa 100% và số vượt được ghi riêng.', 'Spent is the monthly total for the selected category. Progress is capped at 100%, with any overage shown separately.', '已使用金额为该分类本月支出总额。进度条最高显示 100%，超出部分会单独显示。'],
  ['Quy tắc định kỳ chỉ tạo giao dịch khi đến hạn. Có thể xem, chỉnh sửa, tạm dừng hoặc bật lại quy tắc trong trang Định kỳ.', 'Recurring rules create transactions only when due. View, edit, pause or resume rules on the Recurring page.', '周期规则仅在到期时创建交易。可在周期页面查看、编辑、暂停或恢复规则。'],
  ['Trong Agent tài chính trên web, nêu kỳ, loại thống kê và định dạng cần xuất. File chỉ chứa dữ liệu thuộc tài khoản đang đăng nhập.', 'In the web finance Agent, specify the period, statistics type and export format. Files contain only the signed-in account data.', '在网页财务助手中说明期间、统计类型和导出格式。文件仅包含当前登录账户的数据。'],
  ['Mở Cài đặt → Liên kết ngân hàng. Hiện có luồng Hosted Link SePay Bank Hub sandbox để xác nhận bước liên kết; cần credential do SePay cấp. Chưa đồng bộ hoặc nhập lịch sử giao dịch.', 'Open Settings → Bank connection. The SePay Bank Hub sandbox Hosted Link flow confirms account linking only; SePay credentials are required. Transaction history is not imported or synced.', '打开设置 → 银行连接。目前 SePay Bank Hub 沙盒 Hosted Link 仅用于确认连接步骤；需要 SePay 提供凭据。尚未导入或同步交易历史。'],
  ['Phân tích, dự báo và nhận diện hóa đơn hỗ trợ tham khảo. Kiểm tra lại thông tin trước khi lưu giao dịch hoặc ra quyết định.', 'Analysis, forecasts and receipt recognition are for reference. Review details before saving a transaction or making a decision.', '分析、预测和票据识别仅供参考。保存交易或作出决定前请核对信息。'],
  ['Cập nhật hồ sơ, ảnh đại diện và email đã xác minh trong Cài đặt. Xem Điều khoản sử dụng và Thông báo quyền riêng tư tại trang pháp lý.', 'Update your profile, photo and verified email in Settings. Read the Terms of Use and Privacy Notice on the legal page.', '在设置中更新资料、头像和已验证邮箱。请在法律页面查看使用条款和隐私声明。'],
  ['Trình duyệt giữ cache theo từng tài khoản để mở lại giao diện nhanh. Server phải xác nhận thành công trước khi cache được cập nhật; PostgreSQL là nguồn chuẩn.', 'The browser keeps a per-account cache for faster reloads. The server must confirm success before the cache updates; PostgreSQL is the source of truth.', '浏览器为每个账户保存缓存以加快重新打开界面。服务器确认成功后才更新缓存；PostgreSQL 是数据源。'],
  ['Mật khẩu được băm ở server. Cookie phiên có HttpOnly; token xác minh và đặt lại mật khẩu không lưu vào LocalStorage.', 'Passwords are hashed on the server. Session cookies are HttpOnly; verification and password reset tokens are not stored in LocalStorage.', '密码在服务器端进行哈希处理。会话 Cookie 使用 HttpOnly；验证和重置密码令牌不会存入 LocalStorage。'],
  ['Đã cập nhật ngôn ngữ giao diện.', 'Interface language updated.', '界面语言已更新。'], ['Chưa lưu được ngôn ngữ giao diện.', 'Could not save the interface language.', '无法保存界面语言。'],
  ['Đã đổi đơn vị hiển thị sang USD.', 'Display currency changed to USD.', '显示货币已更改为 USD。'], ['Đã đổi đơn vị hiển thị sang VND.', 'Display currency changed to VND.', '显示货币已更改为 VND。']
];

const localeIndex = { en: 1, zh: 2 };
const phraseMaps = Object.fromEntries(Object.entries(localeIndex).map(([locale, index]) => [
  locale,
  new Map(translations.map(([source, ...targets]) => [source, targets[index - 1]]))
]));
const reverseMaps = Object.fromEntries(Object.keys(localeIndex).map((locale) => [
  locale,
  new Map(translations.map(([source, en, zh]) => [locale === 'en' ? en : zh, source]))
]));
const sortedPhrases = Object.fromEntries(Object.entries(phraseMaps).map(([locale, map]) => [
  locale,
  [...map.keys()].sort((left, right) => right.length - left.length)
]));
const textNodeFilter = NodeFilter.SHOW_TEXT;
const skipTags = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE']);
const textNodeTranslations = new WeakMap();
const attributeTranslations = new WeakMap();

function translateText(value, language) {
  if (!value) return value;
  let normalized = value;
  for (const otherLanguage of Object.keys(reverseMaps)) {
    if (otherLanguage === language) continue;
    const reverse = reverseMaps[otherLanguage];
    for (const phrase of [...reverse.keys()].sort((left, right) => right.length - left.length)) {
      const source = reverse.get(phrase);
      if (phrase && phrase !== source && normalized.includes(phrase)) normalized = normalized.split(phrase).join(source);
    }
  }
  const map = phraseMaps[language];
  if (!map) return normalized;
  let translated = normalized;
  for (const phrase of sortedPhrases[language]) {
    if (translated.includes(phrase)) translated = translated.split(phrase).join(map.get(phrase));
  }
  return translated;
}

function translateElement(element, language) {
  if (!(element instanceof Element) || skipTags.has(element.tagName) || element.isContentEditable || element.closest('[data-no-translate]')) return;
  const walker = document.createTreeWalker(element, textNodeFilter, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || skipTags.has(parent.tagName) || parent.isContentEditable || parent.closest('[data-no-translate]')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const current = node.nodeValue;
    const previous = textNodeTranslations.get(node);
    const source = previous && current === previous.rendered ? previous.source : current;
    const translated = translateText(source, language);
    if (translated !== node.nodeValue) node.nodeValue = translated;
    textNodeTranslations.set(node, { source, rendered: translated });
  }
  const elements = [element, ...element.querySelectorAll('*')];
  for (const target of elements) {
    if (skipTags.has(target.tagName) || target.isContentEditable || target.closest('[data-no-translate]')) continue;
    let translations = attributeTranslations.get(target);
    if (!translations) { translations = new Map(); attributeTranslations.set(target, translations); }
    for (const attribute of ['aria-label', 'aria-description', 'placeholder', 'title']) {
      if (!target.hasAttribute(attribute)) continue;
      const current = target.getAttribute(attribute);
      const previous = translations.get(attribute);
      const source = previous && current === previous.rendered ? previous.source : current;
      const translated = translateText(source, language);
      if (translated !== current) target.setAttribute(attribute, translated);
      translations.set(attribute, { source, rendered: translated });
    }
  }
}

export function applyTranslations(root = document, language = 'vi') {
  const locale = ['en', 'zh'].includes(language) ? language : 'vi';
  document.documentElement.lang = locale === 'zh' ? 'zh-CN' : locale;
  document.title = translateText(document.title, locale);
  if (root instanceof Document) {
    for (const child of root.body?.children || []) translateElement(child, locale);
  } else if (root instanceof Element) translateElement(root, locale);
}

export function observeTranslations(root = document.body, getLanguage = () => 'vi') {
  const observer = new MutationObserver((records) => {
    const language = getLanguage();
    const locale = ['en', 'zh'].includes(language) ? language : 'vi';
    for (const record of records) {
      if (record.type === 'characterData') translateElement(record.target.parentElement, locale);
      for (const node of record.addedNodes || []) {
        if (node instanceof Element) translateElement(node, locale);
        else if (node instanceof Text && node.parentElement) translateElement(node.parentElement, locale);
      }
    }
  });
  observer.observe(root, { childList: true, characterData: true, subtree: true });
  return () => observer.disconnect();
}
