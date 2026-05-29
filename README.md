# BirdNav

BirdNav 是一个基于 Next.js、Prisma 和 MySQL 的导航站项目，包含前台展示、主题切换、站点详情、申请收录和后台管理。

## 技术栈

- Next.js 16 App Router
- React 19
- Prisma
- MySQL
- Tailwind CSS 4
- Zod
- Bun

## 配置

复制 `.env.example` 并按环境修改：

```bash
DATABASE_URL="mysql://user:password@127.0.0.1:3306/birdnav"
ADMIN_USERNAME="admin"
# ADMIN_PASSWORD="replace-with-a-strong-password"
```

说明：

- `DATABASE_URL` 是必须配置的数据库连接。
- `ADMIN_USERNAME` 用于首次初始化管理员账号，默认可用 `admin`。
- `ADMIN_PASSWORD` 只在 `db:seed` 首次创建管理员时使用；不设置时会生成随机密码并输出到日志。

## 本地运行

```bash
bun install
bun run db:generate
bun run db:migrate
bun run db:seed
bun run dev
```

后台入口：

```text
/admin/login
```

## 部署

生产环境建议使用 Prisma migration：

```bash
bun run db:migrate:deploy
bun run db:seed
bun run build
bun run start
```

站点图标自动抓取仅支持公网 `80/443` 站点。

## Docker 部署

项目提供 `Dockerfile` 和 `docker-compose.yml`。管理员初始账号不写入镜像，部署时通过环境变量传入：

```bash
ADMIN_USERNAME=admin \
ADMIN_PASSWORD='replace-with-a-strong-password' \
MYSQL_PASSWORD='replace-with-db-password' \
MYSQL_ROOT_PASSWORD='replace-with-root-password' \
docker compose up -d --build
```

容器启动时默认执行：

- `bun run db:migrate:deploy`
- `bun run db:seed`
- `bun run start`

使用外部数据库时：

```bash
DATABASE_URL='mysql://user:password@host:3306/birdnav' \
RUN_MIGRATIONS=false \
RUN_SEED=false \
docker compose up -d --build app
```
