# CapTCF 正式上线收费 — 操作手册

代码已经支持**真实收款**（Stripe）。剩下的是只有你本人能做的事：开 Stripe 账号、填密钥、把 Render 升级成付费方案。
按顺序做完下面 8 步，用户就能在网站上直接付钱、立即解锁 Premium 刷题。

> 付费用户实际得到的（和免费用户相比）：**不限次数的练习**（免费每天 5 次）+ **全部 4 套完整模考**（免费只有 1 套试卷）。
> 定价页上的「AI 批改」宣传已删除——代码里没有 AI 批改功能，不能拿它收钱。

---

## 0. 先检查：Beta 期的免费数据库可能已经没了

Render 免费 Postgres 在 **2026-08-18** 到期（见 `BETA_LAUNCH_REPORT.md`）。到 Render 控制台看 `captcf-db` 的状态：

- 还在宽限期 → 第 6 步同步 Blueprint 时会直接升级成付费库，数据保留。
- 已被删除 → 同步时会新建一个空库；题库内容会在启动时自动重新导入，但 **Beta 期间注册的用户账号无法恢复**。

## 1. 开 Stripe 账号（只有你能做）

1. 在 <https://stripe.com> 注册（美国或加拿大账户均可）并完成商户认证（身份、银行账户）。
2. Settings → Business：填好公开的商家名称、**客服邮箱**、网站地址。

Stripe 没有月费，只按每笔成交抽成（美国卡约 2.9% + $0.30，以 Stripe 价格页为准）。

## 2. 创建商品和价格

Stripe Dashboard → **Product catalog → Add product**，名称例如 `CapTCF Premium`，然后**二选一**：

| 模式 | 怎么建价格 | 适合 |
| --- | --- | --- |
| **订阅**（自动续费） | Recurring，例如 `CAD 29.99 / month` | 长期备考 |
| **一次性通行证**（不续费） | One-off，例如 `CAD 49`，并在价格的 **metadata** 里加 `access_days = 60` | 考前冲刺；**想让中国用户用支付宝/微信付款就选这个**（这两种方式不支持自动续费） |

代码会根据价格类型自动判断模式，网站上显示的价格也直接读 Stripe——**以后改价只需在 Stripe 里改，不用改代码**。
复制价格 ID（`price_…`）。

支付方式：Settings → Payment methods 里开启 Card、Apple Pay / Google Pay；做一次性通行证的话可以开 Alipay、WeChat Pay。

## 3. 配置 Webhook（付款成功、续费失败、取消、退款都靠它同步）

Developers → **Webhooks → Add endpoint**

- URL：`https://<你的域名>/api/billing/webhook`（没有自定义域名就是 `https://captcf.onrender.com/api/billing/webhook`）
- 勾选事件：
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `charge.refunded`
- 保存后复制 **Signing secret**（`whsec_…`）。

## 4. 打开 Customer Portal（用户自助改卡、看发票、取消订阅）

Settings → Billing → **Customer portal**：开启「取消订阅」「更新支付方式」「发票历史」，点 **Save**。
（Live 模式下必须保存一次，否则「Gérer mon abonnement / 管理订阅」按钮会报错。）

## 5. 邮件（找回密码）

付费用户忘了密码必须能收到重置邮件。在 <https://resend.com> 注册 → 验证你的域名 → 创建 API key。

## 6. Render：合并代码 + 升级方案 + 填密钥

1. 把这个分支合并到 `main`。
2. Render → 你的 Blueprint → **Manual Sync**。`render.yaml` 现在是：
   - Web 服务：**免费方案**。免费方案闲置 15 分钟会休眠（下一个访客要等约 1 分钟），所以
     `.github/workflows/keep-awake.yml` 每 10 分钟访问一次 `/api/health` 让它保持唤醒
     （公开仓库的 GitHub Actions 免费；一个常驻服务用量在 Render 每月 750 免费小时以内）。
   - 数据库：Render 的免费 Postgres 30 天后过期，所以这里是最便宜的付费方案 **basic-256mb（约 $6/月）**。
     想完全免费：改用 Neon 免费 Postgres（0.5 GB，不过期，题库远用不完），把 Neon 的连接串填进
     `DATABASE_URL` 即可。
   - 免费方案没有持久磁盘：口语录音在每次部署后会被清空（练习记录和分数不受影响）。
3. Render → `captcf` 服务 → **Environment**，填入：

| 变量 | 值 |
| --- | --- |
| `STRIPE_SECRET_KEY` | `sk_test_…`（先测试）→ 之后换 `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | 第 3 步的 `whsec_…` |
| `STRIPE_PRICE_PREMIUM` | 第 2 步的 `price_…` |
| `RESEND_API_KEY` | 第 5 步的 key |
| `EMAIL_FROM` | `CapTCF <no-reply@你的域名>` |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | 客服邮箱（显示在页脚和服务条款里；Stripe 要求网站上有客服联系方式） |
| `APP_URL` | 绑定了自定义域名才需要填，例如 `https://captcf.com` |

保存后 Render 会自动重新部署。**三个 Stripe 变量缺任何一个，购买按钮都会保持隐藏**（不会出现「收了钱却开不了通」的情况），日志里会写明缺哪个。

## 7. 先用测试模式完整走一遍

在 Stripe 的 **Test mode** 下（test 的 key、price、webhook secret）：

1. 注册一个新账号 → 打开 `/pricing`，确认显示的价格正确。
2. 点「Passer à Premium」→ 用测试卡 `4242 4242 4242 4242`（任意未来日期、任意 CVC）付款。
3. 自动跳回 → 仪表盘 → 侧栏显示 Premium；「Examens blancs」里 4 套模考都能开始。
4. Réglages（设置）→「Gérer mon abonnement」能打开 Stripe 页面。
5. 在 Stripe 里取消该订阅 → Premium 在付费周期结束时（或立即取消时立即）失效。
6. Stripe → Webhooks → 你的 endpoint：所有事件都是 `200`。

全部通过后，把 3 个 Stripe 变量换成 **Live** 的值（live key、live price、live webhook 的 secret），再用自己的真卡买一次、然后在 Stripe 里退款，确认退款后访问权限被收回（一次性通行证）。

## 8. 税和条款（请自己确认）

- **销售税**（加拿大 GST/HST、其他国家 VAT 等）：是否需要收取取决于你的所在地和营业额，建议咨询会计。需要的话在 Stripe Tax 里配置好注册信息，再把 `STRIPE_AUTOMATIC_TAX` 改为 `true`。
- **服务条款** `/terms` 第 8 节已写入：付款由 Stripe 处理、订阅自动续费、可随时取消（用到周期结束）、一次性通行证不续费、退款「逐案处理」、全额退款即终止对应权限。**请按你实际的退款政策修改措辞**（`src/app/(marketing)/terms/page.tsx`）。
- 隐私政策已加上 Stripe 作为支付处理方的说明。

---

## 代码层面做了什么

- `POST /api/billing/checkout`：创建真实的 Stripe Checkout 会话（订阅或一次性通行证），游客先注册；已有订阅的用户不会被重复扣费。
- `GET /api/billing/success`：付款回跳时立即开通（不用等 webhook），且只认属于当前登录用户的会话。
- `POST /api/billing/webhook`：**校验 Stripe 签名**（之前没校验，任何人都能伪造「付款成功」白拿 Premium）；按事件 ID 去重；订阅事件一律回源 Stripe 重新读取，乱序到达也不会出错；续费失败的重试期内保留权限，最终失败/取消即收回；全额退款收回一次性通行证。
- `POST /api/billing/portal`：跳转 Stripe Customer Portal。
- 删除账号前会先在 Stripe 取消订阅（否则会对已删除的账号继续扣款）；取消失败则不删除并提示用户。
- 管理员「撤销 Beta」不会再覆盖付费用户的 Stripe 订阅记录。
- 找回密码邮件通过 Resend 真实发送。
- 测试：`src/lib/billing/*.test.ts`（签名、编码、规则）+ `tests/integration/billing.test.ts`（真实 webhook 路由 + Postgres + 模拟的 Stripe API）。
