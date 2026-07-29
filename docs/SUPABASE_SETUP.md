# 栖时账号服务部署

栖时客户端只需要 Supabase 的项目地址和公开 Publishable key。不要把 Secret key 或
`service_role` key 放进网页、Android 安装包、Git 仓库或聊天记录。

## 1. 创建项目

1. 在 Supabase Dashboard 创建一个项目，区域选离主要内测用户较近的位置。
2. 在项目的 Connect 面板复制 Project URL 和 Publishable key。
3. 从 `.env.example` 复制出本机 `.env.local`，填写：

```dotenv
VITE_SUPABASE_URL=https://你的项目.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_你的公开密钥
```

## 2. 初始化数据库

在 SQL Editor 中执行
`supabase/migrations/202607290001_qishi_accounts_invites_presence.sql`。

然后在 Authentication → Hooks 中启用 **Before User Created**，选择 Postgres
Function `public.hook_require_qishi_invite`。这个 Hook 会在账号创建之前拒绝无效邀请码。

在 Realtime Settings 中关闭 Allow public access；客户端使用私有 Presence 频道，
数据库策略只允许已登录用户进入 `qishi:scene-presence`。

## 3. 创建首枚邀请码和管理员

在 SQL Editor 生成一枚只可使用一次、7 天后过期的初始化邀请码：

```sql
select private.bootstrap_first_invite(
  'QISHI-替换成随机字符',
  now() + interval '7 days'
);
```

用这枚邀请码注册主理人账号。注册完成后，在 SQL Editor 将该账号提升为管理员：

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where email = '替换成你的邮箱'
);
```

此后管理员通过 `admin_create_invite` 创建新码，通过 `admin_list_invites` 查看使用状态，
通过 `admin_revoke_invite` 立即停用。数据库只保存邀请码 SHA-256 摘要，不保存可再次查看的
明文；因此创建后应立即复制给对应内测用户。

## 4. 邮件与回调

- 保持 Email confirmation 开启，正式内测前配置自有 SMTP。
- 在 Authentication → URL Configuration 添加正式站点地址与密码找回回调地址。
- Android 邮件深链需要在上架前配置 App Links；未配置前可先在网页完成邮箱验证和改密。

## 5. 数据定义

- `public.profiles`：昵称、角色、会员等级和会员到期时间。
- `private.invite_codes`：邀请码摘要、次数、有效期和停用状态，仅安全函数可访问。
- `private.invite_redemptions`：邀请码与注册用户的核销记录。
- `qishi:scene-presence`：只包含当前场景、开始时间和心跳时间，不上传学习目标。

