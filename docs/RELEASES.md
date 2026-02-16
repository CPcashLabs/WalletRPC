# 发布记录（Releases）

本文件用于记录“每次正式发布”的事实信息，确保可追溯、可复现、可对齐。
它与 `docs/CHANGELOG.md` 的分工如下：
- `docs/CHANGELOG.md`：面向用户/产品的关键变更（新增/修复/变更）。
- `docs/RELEASES.md`：面向交付的发布元数据与发布区间（版本号、时间、commit hash、变更范围摘要、致命 bug 修复说明）。

---

## 记录规则（必须）
- 进入发布阶段即自增版本号（并同步到代码中的版本字段，例如 `package.json`、`config/app.ts` 等）。
- 发布时必须记录：`版本号`、`发布时间`、`commit hash`。
- 必须检查并记录自上一次发布以来的“代码级变更范围”（至少提供提交列表或 PR 列表的摘要）。
- 必须说明：
  - 本次关键新增功能（面向用户/产品）
  - 最近提交的致命 bug 修复（崩溃/资金风险/阻断主流程/数据损坏/严重安全问题）

---

## v0.1.0（Beta）- 发布候选
- 发布时间：2026-02-16 11:21（+08:00）
- 发布 commit：`待发布（提交后填写 git rev-parse --short HEAD）`
- 版本号变更：v0.0.2 -> v0.1.0

### 代码级变更范围（自上次发布以来）
- 基准（上次发布 commit）：`d9e999f`
- 本次区间：`d9e999f..HEAD` + 当前工作区未提交变更（发布候选）
- 提交摘要（已入库）：
  - `7f6be62 docs: require English commit messages`
  - `43e55fb docs: add verification gates and release record`
- 关键文件范围（本次候选）：
  - `features/wallet/hooks/useWalletData.ts`
  - `features/wallet/components/WalletDashboard.tsx`
  - `features/wallet/components/SendForm.tsx`
  - `services/tronService.ts`
  - `package.json`
  - `locales/en/index.ts`
  - `locales/zh-SG/index.ts`

### 关键新增功能说明（面向用户/产品）
- 节点切换体验升级：目标节点有历史数据时显示旧值并标记更新中；无历史数据时显示占位态，避免把“未知”误显示为 `0`。
- 首页定位升级：产品文案从性能导向切换为隐私导向，强调“以隐私为默认”。

### 致命 bug 修复说明（最近提交/候选）
- Bug 1：切换节点时余额先归零再恢复，造成资产感知抖动与误判。
  - 现象/影响：用户在节点切换瞬间看到错误的 `0` 余额，误以为资产丢失。
  - 触发条件：目标节点尚未返回余额数据或请求失败。
  - 修复方式：引入节点级缓存与同步状态，失败时不再把请求异常伪装成 `0`，改为“更新中/更新失败请刷新”。
  - 回归测试：`tests/ui/wallet-dashboard.test.tsx`、`tests/ui/send-form.test.tsx`、`tests/unit/tronService.test.ts`

---

## 发布模板（复制后填写）

### vX.Y.Z（Beta/GA）
- 发布时间：YYYY-MM-DD HH:mm（本地时区）
- 发布 commit：`<git rev-parse HEAD>`
- 版本号变更：vA.B.C -> vX.Y.Z

#### 代码级变更范围（自上次发布以来）
- 基准（上次发布 commit）：`<prev_release_commit>`
- 本次区间：`<prev_release_commit>.. <release_commit>`
- 提交摘要（示例）：`git log --oneline <prev>..<release>`
  - `<commit> <message>`

#### 关键新增功能说明（面向用户/产品）
- 功能 1：一句话说明价值与影响面
- 功能 2：一句话说明价值与影响面

#### 致命 bug 修复说明（最近提交）
- Bug 1：
  - 现象/影响：
  - 触发条件：
  - 修复方式：
  - 回归测试：`<test name / file>`（如无自动化需写豁免原因与补测计划）
