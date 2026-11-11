# Deploy AWS backend + Cloudflare frontend

## Architecture

- Cloudflare Pages serves the static website from `public/`.
- A Pages Function at `functions/api/[[path]].js` forwards `/api/*` to AWS App Runner. The browser therefore keeps using same-origin requests and the session cookie remains on the Pages hostname.
- AWS App Runner runs the Node.js 22 API. Its `pre-run` step applies the PostgreSQL migrations before the server starts.
- Amazon RDS for PostgreSQL is the database source of truth. The deployment starts with an empty database; local financial records are not copied.

## Before creating cloud resources

1. Sign in to the AWS and Cloudflare accounts and select an AWS Region. Singapore (`ap-southeast-1`) is the nearest default for Vietnam; reuse an existing RDS instance only after checking its region, engine/version, size, and backup settings.
2. Check AWS Billing because the account screenshot showed USD 96.03 remaining and 153 days left, while RDS was already showing USD 6.93 for the current month. This is a snapshot, not a monthly forecast.
3. App Runner needs a VPC connector to reach a private RDS instance. When attached to a custom VPC, App Runner egress no longer has public internet access by default. SMTP and the optional CurrencyAPI therefore need a NAT gateway, a supported VPC endpoint/alternate provider, or another network design. A NAT gateway has an hourly charge plus data processing; price varies by Region. Review the calculator before provisioning it.
4. For an initial demo, select the smallest App Runner instance supported by the account and one provisioned instance. Review the projected monthly total (App Runner, RDS, NAT, backups, logs, transfer, and storage) before creating the service. Set AWS Budgets alerts below the credit balance; alerts do not automatically stop spend.

## AWS App Runner

1. Connect the GitHub repository to App Runner, deploy from the `main` branch, and use the repository-root `apprunner.yaml`.
2. Configure outbound VPC access to the VPC where RDS is located. Allow inbound PostgreSQL only from the App Runner VPC connector security group. Do not make the database publicly accessible.
3. Set the App Runner health check to HTTP `GET /healthz`.
4. Set the App Runner auto-scaling maximum to one instance for the initial demo. The server pool allows up to ten database connections per instance; raise the cap only after checking RDS connection limits and actual traffic.
5. Configure the following environment values. Put passwords, mail credentials, and the proxy secret in AWS Secrets Manager; do not commit them.

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `APP_BASE_URL` | Exact HTTPS Cloudflare Pages URL, for example `https://<project>.pages.dev` |
| `PORT` | `3000` |
| `DATABASE_HOST` | RDS endpoint |
| `DATABASE_PORT` | `5432` |
| `DATABASE_NAME` | Database name |
| `DATABASE_USER` / `DATABASE_PASSWORD` | RDS credentials; store password as a secret |
| `DATABASE_SSL` | `true` |
| `EDGE_PROXY_SECRET` | Secret shared with the Cloudflare Pages Function |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_NAME`, `SMTP_FROM_EMAIL` | Verified SMTP provider settings |
| `CURRENCYAPI_API_KEY` | Optional secret; omit/leave empty if not configured |

The first App Runner startup applies migrations `001` through the latest migration using the existing advisory lock. It does not seed a user or copy local financial data.

## Cloudflare Pages

1. Create a Pages project connected to the same GitHub repository and `main` branch.
2. Use no build command and set the output directory to `public`.
3. Add `AWS_API_ORIGIN` as the HTTPS origin shown by App Runner (origin only, no path), and `EDGE_PROXY_SECRET` as a Pages Function secret. The secret must match App Runner's value.
4. Deploy and open the Pages URL. The Function forwards the original `Origin` and session cookie, sets a private no-cache response, and adds the origin secret and client IP header for AWS.

## Secrets and operations

- Generate a unique random `EDGE_PROXY_SECRET`; set it directly in AWS Secrets Manager and Cloudflare Pages secrets. Never add its value to `.env.example`, Git, logs, or chat.
- Keep `APP_BASE_URL` equal to the public Pages URL so the backend validates write request origins.
- Register and verify a new account after deployment. Promote an administrator only after confirming the intended account; do not copy a local admin or finance dataset implicitly.
- Verify the Pages homepage, Pages `/api/auth/me` response, App Runner `/healthz`, migrations, SMTP delivery, and a signed-in user flow before announcing deployment complete.
- Remove cloud resources and snapshots that are no longer needed; stopping RDS alone still leaves storage/backup charges.

## Pricing references

- AWS App Runner charges depend on Region, instance size, active compute, provisioned memory, and logs.
- A private App Runner-to-RDS connection plus public SMTP/CurrencyAPI calls can add NAT gateway charges. The example US East NAT gateway rate is USD 0.045/hour plus processing and transfer; verify the selected Region in AWS Pricing Calculator.
- The MongoDB Atlas Free tier is not used by this deployment. The application currently uses PostgreSQL and SQL migrations.
