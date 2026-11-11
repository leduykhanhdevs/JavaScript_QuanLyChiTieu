# Deploy AWS backend + Cloudflare Pages frontend

## Kiến trúc

- Cloudflare Pages phục vụ website tĩnh từ thư mục `public/`.
- Pages Function tại `functions/api/[[path]].js` chuyển tiếp `/api/*` tới API AWS qua HTTPS và giữ nguyên session cookie.
- AWS ECS Express chạy Node.js 22 trong Fargate; endpoint HTTPS `*.ecs.ap-southeast-1.on.aws` làm origin cho Pages Function.
- Amazon RDS for PostgreSQL là nguồn dữ liệu chuẩn. Database mới bắt đầu rỗng; không sao chép giao dịch hoặc tài khoản từ máy local.
- RDS không công khai. Chỉ Security Group của ECS được phép kết nối TCP/5432.

`apprunner.yaml` đã bị bỏ khỏi cấu hình vì AWS thông báo App Runner không nhận khách hàng mới từ 30-04-2026. Thay thế đã chọn là ECS Express Mode, vốn tự tạo Fargate service, HTTPS load balancer và theo dõi sức khỏe.

## Chi phí cần cân nhắc

Cấu hình tối thiểu dự kiến giữ chạy liên tục gồm một task Fargate (0.25 vCPU, 512 MiB), một Application Load Balancer, một RDS PostgreSQL `db.t4g.micro` Single-AZ với 20 GiB storage, public IPv4, log và lưu lượng thấp. Ước tính sơ bộ khoảng **50–65 USD/tháng**; giá thực tế thay đổi theo Singapore Region, số IP, tải, log, backup, lưu lượng và thuế. Giá tính theo tài nguyên nền như Fargate, ALB, RDS và IPv4; ECS Express không có phí dịch vụ riêng.

Tài khoản hiện còn workload MySQL khác, nên khoản đó cũng tiêu thụ credit. AWS Budgets chỉ gửi cảnh báo, không tự dừng tài nguyên. Kiểm tra Credits/Billing và chốt mức chi phí tối đa trước khi tạo database, load balancer hoặc task chạy lâu dài.

Tài liệu giá chính thức: [Fargate](https://aws.amazon.com/fargate/pricing/), [Application Load Balancer](https://aws.amazon.com/elasticloadbalancing/pricing/), [RDS PostgreSQL](https://aws.amazon.com/rds/postgresql/pricing/), [public IPv4](https://aws.amazon.com/vpc/pricing/).

## Cấu hình container

`Dockerfile` cài production dependencies, chép `server/` và `public/`, sau đó chạy migrations trước khi khởi động API. Migration hiện hành dùng advisory lock và chạy lặp an toàn. `.dockerignore` loại `.env`, cache, dữ liệu local và thư mục Git khỏi image.

Workflow `.github/workflows/deploy-aws.yml` dùng GitHub OIDC để nhận quyền ngắn hạn từ AWS, đóng gói image và cập nhật ECS Express. Workflow **bị khóa mặc định**; chỉ chạy khi GitHub repository variable `AWS_ECS_DEPLOY_ENABLED` được đặt chính xác là `true`.

## Chuẩn bị AWS

1. Dùng region `ap-southeast-1` và chọn các public subnet thuộc cùng VPC cho ECS Express. Cần subnet ở ít nhất hai Availability Zone; không dùng subnet từ VPC khác với RDS.
2. Tạo Security Group riêng cho task ECS, không thêm inbound rule và cho phép egress ra ngoài để gửi SMTP/tải tỷ giá. Tạo Security Group riêng cho RDS, đặt `Publicly accessible` thành `No`, tạo subnet group trong cùng VPC và chỉ mở inbound TCP/5432 với source là Security Group ECS. Không mở cổng DB cho `0.0.0.0/0`.
3. Tạo PostgreSQL Single-AZ `db.t4g.micro`, storage gp3 20 GiB, bật mã hóa và backup retention phù hợp. Dùng database/user riêng cho ứng dụng; không đụng tới RDS MySQL của dự án khác.
4. Tạo một AWS Secrets Manager secret dạng JSON với các khóa:

   `DATABASE_PASSWORD`, `EDGE_PROXY_SECRET`, `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `CURRENCYAPI_API_KEY`.

   Giá trị `EDGE_PROXY_SECRET` phải là chuỗi ngẫu nhiên mạnh và cũng được nhập làm Cloudflare Pages secret. Có thể để `CURRENCYAPI_API_KEY` là chuỗi rỗng nếu chưa cấu hình; tỷ giá USD/VND sẽ không tải được. SMTP cần thông tin máy chủ gửi mail hợp lệ để đăng ký, OTP và đặt lại mật khẩu hoạt động.
5. Tạo IAM task execution role với `AmazonECSTaskExecutionRolePolicy` và quyền `secretsmanager:GetSecretValue` chỉ trên runtime secret; nếu secret dùng customer-managed KMS key thì thêm `kms:Decrypt` chỉ trên key đó. Tạo ECS infrastructure role với policy `AmazonECSInfrastructureRoleforExpressGatewayServices` và GitHub deployment role với trust OIDC chỉ cho repo `leduykhanhdevs/JavaScript_QuanLyChiTieu`. Giới hạn quyền deployment vào ECR repo, ECS service và các role/resources cần thiết.
6. Tạo ECR repository cho image API. Lưu endpoint RDS, ARN secret JSON, account ID, subnet IDs, role ARNs, tên ECR repo và tên ECS service vào GitHub repository variables; không lưu password/token vào GitHub variables.
7. Tạo ECS Express service với port `3000`, health check `/healthz`, 256 CPU units, 512 MiB, min/max task count bằng `1`, và dùng task Security Group cùng các subnet đã chọn. Security Group cho ECS phải được tạo trước để rule inbound TCP/5432 của RDS trỏ tới đúng Security Group ngay từ lần khởi động đầu.

GitHub variables workflow dùng:

| Variable | Giá trị |
|---|---|
| `AWS_ECS_DEPLOY_ENABLED` | Để trống hoặc `false` cho tới khi đã xác nhận chi phí và cấu hình AWS |
| `AWS_REGION` | `ap-southeast-1` |
| `AWS_ACCOUNT_ID` | AWS account ID mong đợi để workflow xác minh |
| `AWS_DEPLOY_ROLE_ARN` | ARN GitHub OIDC deployment role |
| `AWS_ECR_REPOSITORY` | ECR repository của API |
| `AWS_ECS_SERVICE_NAME` | Tên ECS Express service |
| `AWS_ECS_CLUSTER` | `default` hoặc cluster đã chọn |
| `AWS_TASK_EXECUTION_ROLE_ARN` | ARN ECS task execution role |
| `AWS_ECS_INFRASTRUCTURE_ROLE_ARN` | ARN ECS Express infrastructure role |
| `AWS_ECS_SUBNET_IDS` | ID subnet public, cách nhau bằng dấu phẩy |
| `AWS_ECS_TASK_SECURITY_GROUP_ID` | Security Group ECS task không có inbound rule |
| `AWS_RUNTIME_SECRET_ARN` | ARN Secrets Manager JSON; workflow chọn từng JSON key |
| `AWS_DATABASE_HOST` | Endpoint RDS PostgreSQL |
| `AWS_DATABASE_NAME` | Database name |
| `AWS_DATABASE_USER` | Database user riêng cho ứng dụng |
| `APP_BASE_URL` | URL Pages chính thức, ví dụ `https://javascript-quanlychitieu.pages.dev` |

## Cloudflare Pages

1. Kết nối GitHub repository `leduykhanhdevs/JavaScript_QuanLyChiTieu`, production branch `main`.
2. Để trống build command, đặt build output directory là `public`.
3. Thêm biến `AWS_API_ORIGIN` bằng HTTPS origin trả về từ ECS Express, chỉ gồm origin và không có path.
4. Thêm `EDGE_PROXY_SECRET` trong Pages Settings → Variables and Secrets dưới dạng secret. Giá trị phải trùng với khóa `EDGE_PROXY_SECRET` ở AWS Secrets Manager.
5. Deploy Pages sau khi backend sẵn sàng. Cập nhật `APP_BASE_URL` ở ECS bằng URL Pages cuối cùng; sau đó chạy deployment workflow lại để backend kiểm tra đúng Origin.

## Kiểm tra sau deploy

- Mở trang Pages và xác nhận asset được tải từ `public/`.
- Gọi Pages `/api/auth/me` để xác nhận proxy nối đến backend.
- Gọi endpoint ECS `/healthz`; kỳ vọng HTTP 200 với `database: connected`.
- Xác nhận migrations đã áp dụng trên database mới; không seed admin mặc định và không nhập dữ liệu cá nhân local.
- Gửi thử đăng ký/OTP bằng tài khoản do chủ dự án tạo sau khi SMTP đã cấu hình; kiểm tra inbox thật trước khi xem auth email là hoạt động.
- Đăng nhập, tạo dữ liệu thử không nhạy cảm và kiểm tra session cookie qua Pages.
- Nếu cần tạm dừng chi phí, scale task về 0 không dừng phí ALB/RDS; muốn ngừng hoàn toàn phải backup dữ liệu cần giữ rồi xóa những tài nguyên có phí.
