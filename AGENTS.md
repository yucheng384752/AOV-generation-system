# 專案協作規則

- `main` 僅保存已驗證的穩定版本；初始穩定基線為 1.1.0。
- 日常開發提交與推送使用 `dev`，不得直接在 `main` 開發。
- 功能與修正分支從最新 `origin/dev` 建立，完成後合併回 `dev`。
- 發布前在 `dev` 執行 `npm test`、`npm run build`，並完成變更涉及的瀏覽器操作驗證；確認穩定後透過 `dev → main` PR 發布。
- 不使用 force push 覆寫共享分支歷史。
- 修改紀錄放在 `.codex-claude-mailbox/threads/`，同步更新 `index.md`。不得將未實際進行的 Claude 審查記為已完成。
- 系統契約以 `docs/version-1.1.md` 為準；Workflow 與 Dataflow 各自保存，function、外部引用與 Loop 僅定義、不執行。
