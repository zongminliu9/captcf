# CapTCF 上线收费 — 你只需要做的事

价格：**$19 / 月**，或 **$39 / 3 个月**（约省 32%）。两种都自动续费，用户可以随时在「设置」里取消，取消后用到已付费期结束为止。
钱的走法：顾客刷卡 → Stripe → 自动转到你绑定的 Chase 账户。

代码已经全部做好。网站在拿到你的 Stripe 密钥后，会**自己**在你的 Stripe 账户里建好商品和这两个价格、付款通知、以及用户自助管理订阅的页面。你不需要在 Stripe 后台做任何设置。

---

## 一次性设置：在 Render 填 4 个值（约 5 分钟）

打开 <https://dashboard.render.com> → 点服务 **captcf** → 左边 **Environment** → 逐个填写（已有的就点编辑改值）：

| 名字 | 填什么 | 去哪里拿 |
| --- | --- | --- |
| `DATABASE_URL` | Neon 的连接地址 | Neon 网站 → 你的项目 → **Connect** 按钮 → 复制那一长串 `postgresql://…`（原样粘贴就行） |
| `STRIPE_SECRET_KEY` | Stripe 密钥 | Stripe 网站 → 右上 **Developers** → **API keys** → **Secret key**，点 Reveal 后复制（`sk_…` 开头） |
| `ADMIN_EMAILS` | 你自己的邮箱 | 用这个邮箱在网站注册，就自动成为管理员 |
| `SUPPORT_EMAIL` | 顾客联系你的邮箱 | 显示在网站页脚和服务条款里，可以和上面一样 |

点 **Save Changes**，Render 会自动重新部署，几分钟后网站就能收钱了。

### 建议先试一次（不花钱）

Stripe 网站左上角打开 **Test mode**，复制那里的密钥（`sk_test_…`）先填进去。然后：

1. 在网站注册 → 打开「Tarifs / 价格」页，能看到 $19 和 $39 两个按钮；
2. 点一个 → 卡号填 `4242 4242 4242 4242`，日期填任意未来日期，CVC 任意 → 付款；
3. 自动回到网站，侧边栏显示 Premium，4 套模考都能打开 —— 就成功了。

确认没问题后，把 `STRIPE_SECRET_KEY` 换成正式密钥（`sk_live_…`，关掉 Test mode 后在同一个页面复制），保存即可。

---

## 关于数据库

旧的 Render 免费数据库 8 月已过期，不需要也没法迁移：题库（600 多道题、模考、词汇）都在代码里，新数据库第一次启动时会**自动装好**。旧库里只有 Beta 测试期间的几个测试账号。

## 现在还没有的（以后可以加）

- **找回密码邮件**：目前不会真的发出去。顾客忘了密码会写信到你的 `SUPPORT_EMAIL`。
- **口语录音**：免费服务器每次更新都会清空录音文件（练习记录和分数不受影响）。
- **销售税**：目前不额外收税。要不要收取决于你的所在地和收入，建议问一下会计。

## 费用

- Render：免费（另有一个每 10 分钟访问一次网站的自动任务，让它不休眠，也免费）
- Neon：免费（0.5 GB，题库远远用不完）
- Stripe：没有月费，每笔成交抽成（美国卡约 2.9% + $0.30）

---

### 技术说明（给开发者）

- 价格定义在 `src/lib/billing/plans.ts`；改价格只需改这里并部署，Stripe 里会自动生成新价格，老用户保持原价。
- 自动配置在 `src/lib/billing/provision.ts`（商品、价格、Webhook 端点及其签名密钥（加密存库）、Customer Portal 配置）；每 6 小时自检一次，在 Stripe 后台被删掉或停用的会自动重建。
- Neon 连接串（带 `-pooler` 和 `channel_binding`）在 `src/db/url.ts` 里自动规范化。
- 测试：`pnpm test`，`pnpm test:integration`（含 `tests/integration/billing.test.ts`、`provision.test.ts`）。
