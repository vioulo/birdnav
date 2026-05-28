# BirdNav

BirdNav 是一个基于 Next.js 16、React 19、Prisma 和 MySQL 的导航站项目，包含前台展示与后台管理。

## 当前整改清单

已完成：

- 移除后台登录页中的默认账号密码回显
- 生产环境强制要求配置 `SESSION_SECRET`
- 为后台会话增加签名校验与过期检查
- 将后台分类、站点、配置表单补充为服务端校验
- 为后台新增成功/失败反馈消息
- 为删除分类、删除站点增加确认操作
- 移除 `next/font/google` 构建期外网依赖，避免受限网络构建失败
- 种子脚本首次创建管理员时改为随机密码或读取环境变量
- 修复主题切换跳转参数的安全问题，避免开放跳转
- 增加管理员修改密码页面
- 增加后台操作审计日志

建议后续继续做：

- 增加真正的密码重置流程
- 增加测试覆盖，优先覆盖认证与后台表单
- 完善前台卡片信息和推广区展示能力

## 技术栈

- Next.js 16 App Router
- React 19
- Prisma
- MySQL
- Tailwind CSS 4
- Zod
- Bun

## 本地开发

1. 安装依赖：

```bash
bun install
```

2. 配置环境变量，至少包含：

```bash
DATABASE_URL="mysql://user:password@127.0.0.1:3306/birdnav"
SESSION_SECRET="replace-with-a-long-random-secret"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="change-me"
```

3. 生成 Prisma Client：

```bash
bun run db:generate
```

4. 初始化或更新数据库结构：

```bash
bun run db:migrate
```

如果你当前是一个已经通过 `db push` 跑起来的旧库，请先阅读下面的“迁移说明”。

5. 初始化数据：

```bash
bun run db:seed
```

如果没有设置 `ADMIN_PASSWORD`，种子脚本在首次创建管理员时会输出一条随机密码。

6. 启动开发环境：

```bash
bun run dev
```

## 可用脚本

```bash
bun run dev
bun run build
bun run start
bun run lint
bun run db:generate
bun run db:migrate
bun run db:migrate:deploy
bun run db:migrate:status
bun run db:push
bun run db:seed
```

## 后台说明

- 后台入口：`/admin/login`
- 所有后台写操作都在服务端再次做管理员校验
- 分类删除会级联删除该分类下的站点，请谨慎操作
- 账户安全页：`/admin/account`
- 操作日志页：`/admin/logs`

## 迁移说明

项目现在已经切换到 Prisma migration 工作流，基线迁移文件位于：

- `prisma/migrations/20260528143000_init_baseline/migration.sql`

推荐用法：

- 本地开发改 schema：`bun run db:migrate -- --name <migration_name>`
- 生产环境部署迁移：`bun run db:migrate:deploy`
- 查看迁移状态：`bun run db:migrate:status`

兼容说明：

- `bun run db:push` 仍然保留，只建议在临时原型阶段或修复本地实验库时使用
- 对于已经存在、且过去通过 `db push` 创建的数据库，不要直接执行 `prisma migrate dev` 让 Prisma 重置库
- 正确做法是先将基线迁移标记为已应用，再继续增量迁移

如果你要把当前存量库纳入 migration 管理，建议顺序如下：

```bash
bun run db:generate
prisma migrate resolve --applied 20260528143000_init_baseline
bun run db:migrate:status
```

完成这一步后，后续 schema 变更就可以通过新的 migration 文件持续演进。

## 构建说明

项目已移除 Google Fonts 构建依赖，受限网络环境下也应能完成 `build`。当前字体通过系统字体栈回退实现。

## 部署注意

- 生产环境必须设置 `SESSION_SECRET`
- 建议单独配置正式数据库账号，不要复用本地数据库
- 如果需要审计能力，建议为后台操作补充日志
