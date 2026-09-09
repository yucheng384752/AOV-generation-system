# 專案協作規則

- `main` 僅保存已驗證的穩定版本；初始穩定基線為 1.1.0。
- 日常開發提交與推送使用 `dev`，不得直接在 `main` 開發。
- 功能與修正分支從最新 `origin/dev` 建立，完成後合併回 `dev`。
- 發布前在 `dev` 執行 `npm test`、`npm run build`，並完成變更涉及的瀏覽器操作驗證；確認穩定後透過 `dev → main` PR 發布。
- 不使用 force push 覆寫共享分支歷史。
- 版本採 `大方向.中等功能.小功能`：大方向／核心架構變更增加第一碼並將後兩碼歸零；中等功能變更增加第二碼並將第三碼歸零；小 function、修正與局部介面調整增加第三碼。同次包含多種修改時取最高層級，不為每個 commit 累加版本。例如 1.1.0 → 1.1.1（返回線接點）、1.1.1 → 1.2.0（中等功能）、1.2.0 → 2.0.0（大方向變更）。同步 package.json、package-lock.json 與修改紀錄；schemaVersion 僅在檔案契約變更時另行調整。
- 修改紀錄放在 `.codex-claude-mailbox/threads/`，同步更新 `index.md`。不得將未實際進行的 Claude 審查記為已完成。
- 系統契約以 `docs/version-1.1.md` 為準；Workflow 與 Dataflow 各自保存，function、外部引用與 Loop 僅定義、不執行。
