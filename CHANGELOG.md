# Changelog

## v0.4.0 - 2026-06-02

### Added
- 新增站点 icon 本地缓存能力，自动将抓取到的图标保存到 `public/uploads/icons`，前台优先读取站内路径。
- Docker 新增 `birdnav-icons` 持久化卷，用于保存本地图标资源。
- 新增 `bun run icons:migrate` 脚本，可将已有站点的外链 icon 批量迁移为本地图标。
- 新增 `RUN_ICON_MIGRATION` 启动开关，可在容器启动时按需自动执行 icon 迁移。

### Changed
- 后台 `sites`、`cats`、`options` 页面拆分为 `page + actions + schema + service` 结构，降低页面文件中的业务耦合。
- 站点 icon 抓取流程增强，支持 `apple-touch-icon`、`manifest icons`、`data/base64` icon，并移除 `og:image` 作为图标兜底来源。
- 更新首页 feature 块的间距和样式，调整 link-item 的布局

### Fixed
- 改善部分站点无法获取真实 icon 的情况，增加多级抓取与本地保存兜底。

## v0.3.0 - 2026-06-02

### Added
- 站点详情支持使用可编辑唯一 Slug 作为前台 URL，新建、申请收录和批量导入默认按主域名生成。
- 站点详情保留数字 ID 旧链接兼容跳转到 Slug 地址。

### Changed
- 新建、申请收录和批量导入站点的默认排序按全局最大排序值 +10 追加，便于后续手动插队。
- 首页链接列表改为固定尺寸 Grid 布局，长名称省略显示并适配移动端。
- 首页推广块装饰调整为右下角米字射线效果。
- 首页 link item 的筛选方块加大，移动端 Footer 友情链接显示在版权信息上方。

### Fixed
- 修复 link item 名称区域高度过低导致文字被压缩的问题。

## v0.2.0 - 2026-06-01

### Added
- 后台站点列表支持分类、推广状态、发布状态筛选。
- 前台支持配置展示分页大小和推广数量。
- 前台链接列表支持加载更多。

### Changed
- 全站表单和按钮改为更紧凑的布局。
- 后台分页默认调整为每页 20 条。

### Fixed
- Seed 不再覆盖已有站点配置。
- 申请收录分类下拉显示全部分类。
