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

