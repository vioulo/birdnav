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
DATABASE_URL="mysql://birdnav:replace-with-db-password@db:3306/birdnav"
MYSQL_DATABASE="birdnav"
MYSQL_USER="birdnav"
MYSQL_PASSWORD="replace-with-db-password"
MYSQL_ROOT_PASSWORD="replace-with-root-password"
ADMIN_USERNAME="admin"
# ADMIN_PASSWORD="replace-with-a-strong-password"
```

说明：

- `DATABASE_URL` 是 app 和 Prisma 使用的数据库连接。
- Docker 部署时，`DATABASE_URL` 使用 Compose 服务名 `db` 作为主机名；本机直连数据库时可改成 `127.0.0.1`。
- `MYSQL_DATABASE` / `MYSQL_USER` / `MYSQL_PASSWORD` / `MYSQL_ROOT_PASSWORD` 用于初始化随 compose 启动的 MySQL 容器。
- 使用内置 MySQL 时，`DATABASE_URL` 里的数据库名、用户名、密码需要和 `MYSQL_DATABASE` / `MYSQL_USER` / `MYSQL_PASSWORD` 保持一致。
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

## 直接部署

生产环境建议使用 Prisma migration：

```bash
bun run db:migrate:deploy
bun run db:seed
bun run build
bun run start
```

站点图标自动抓取仅支持公网 `80/443` 站点。

## Docker 部署

项目提供 `Dockerfile` 和 `docker-compose.yml`。部署时建议先写入 `.env`：

```bash
DATABASE_URL='mysql://birdnav:replace-with-db-password@db:3306/birdnav'
MYSQL_DATABASE='birdnav'
MYSQL_USER='birdnav'
MYSQL_PASSWORD='replace-with-db-password'
MYSQL_ROOT_PASSWORD='replace-with-root-password'
ADMIN_USERNAME='admin'
ADMIN_PASSWORD='replace-with-a-strong-password'
```

然后启动：

```bash
docker compose up -d --build
```

容器启动时默认执行：

- `bun run db:migrate:deploy`
- `bun run db:seed`，仅补齐缺失的初始化数据，不覆盖已有站点配置
- `bun run icons:migrate`，仅在 `RUN_ICON_MIGRATION=true` 时执行
- `bun run start`

应用容器不再保存本地图标文件，icon 由远程链接直接引用。

如果需要把数据库里已有站点的本地 icon 路径或缺失 icon 批量迁移为可访问的远程 icon 链接，可以执行：

```bash
bun run icons:migrate
```

这个脚本会遍历现有站点，尝试重新抓取可访问的 icon 链接，并把数据库中的 `iconUrl` 更新为该远程链接。

如果希望在容器启动时自动执行一次迁移，可以在 `.env` 中设置：

```bash
RUN_ICON_MIGRATION=true

or

RUN_ICON_MIGRATION=true docker compose up -d --no-deps --build app

```

这样重建 `app` 容器时会自动运行 `bun run icons:migrate`。默认值为 `false`，避免每次发布都触发全量 icon 同步。

查看日志：

```bash
docker compose logs -f app
```

使用外部数据库时：

```bash
DATABASE_URL='mysql://user:password@host:3306/birdnav' \
RUN_MIGRATIONS=false \
RUN_SEED=false \
RUN_ICON_MIGRATION=false \
docker compose up -d --no-deps --build app
```

## 宿主 Nginx 反代

`docker-compose.yml` 默认把 app 暴露到宿主 `3000` 端口。宿主 Nginx 可以反代到 `127.0.0.1:3000`：

```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

检查并重载 Nginx：

```bash
nginx -t
nginx -s reload
```

## 维护与升级

升级前建议先备份数据库：

```bash
cd /var/www/birdnav
docker exec birdnav-db-1 sh -c 'mysqldump -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' > birdnav-backup-$(date +%F-%H%M).sql
```

然后更新代码并重建 app 容器：

```bash
cd /var/www/birdnav
docker compose stop app
git pull
docker compose config --quiet
docker compose up -d --no-deps --build app
docker compose logs -f app
```

如果需要恢复备份：

```bash
docker exec -i birdnav-db-1 sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' < birdnav-backup.sql
```

注意不要执行 `docker compose down -v`，除非确认可以删除数据库数据；`-v` 会删除 MySQL volume。

## 更换 Favicon

替换 `src/app/favicon.ico` 后重建 app 容器：

```bash
docker compose up -d --no-deps --build app
```

重建 app 会重新执行 migration 和 seed；seed 只补齐缺失的初始化数据，不会覆盖后台已有配置。

浏览器可能会缓存 favicon，替换后可清理缓存或强制刷新。

## 发布版本
```
bun pm version patch   # 0.1.0 -> 0.1.1，修复
bun pm version minor   # 0.1.0 -> 0.2.0，小功能
bun pm version major   # 0.1.0 -> 1.0.0，大版本

```
