# AOV Studio 1.1

Workflow 面向一般使用者，Dataflow 面向工程師／Agent，兩份 JSON 各自編輯、顯示、保存與匯入匯出。只定義，不執行或生成節點功能實作。

上方切換文件模式；尚未建立的模式可建立或匯入。Dataflow 透過「建立缺少的 Workflow 群組」展開全部業務步驟的工程細項，再以「新增節點至」選擇群組。NODE DEFINITION 提供定義／樣式分頁；群組內節點繼承同色，Workflow 改色後以明確的同步按鈕更新 Dataflow。

Dataflow 的「功能類型」可標示外部 API、套件、程式碼或文件引用。匯入 1.0 會升級為 Dataflow 1.1，不生成業務流程。

## 啟動

需要 Node.js 22.12+（已使用 Node 24 驗證）。

```sh
npm install
npm run dev
```

開啟終端顯示的本機網址。正式建置：`npm run build`；核心測試：`npm test`。

## 使用

- 下方新增一般／緩衝節點，從右側輸出點拖曳至左側輸入點。
- 選取節點或連線，在右側補齊定義；返回線模式由下方虛線圖示切換。
- 双擊功能節點或按「建立子 AOV」進入子圖，頂端路徑返回上層。
- 資料定義支援欄位表單及進階 JSON Schema。進階文字修改後按「套用 Schema」。
- 瀏覽器自動暫存；另存／匯出完整專案成為本地檔案。瀏覽器草稿不取代本地備份。
- 清除及刪除提供確認、影響數量與復原；歷史只保留本次工作階段最近 50 步。
- 右上切換淺／深色，支援減少動態效果偏好。
- [範例檔](public/example.aov.json) 可直接匯入，其中子圖刻意保留草稿缺漏供檢查示範。

## 文件

- [系統設計](docs/system-design.md)
- [1.1 雙文件設計與契約](docs/version-1.1.md)
- [Workflow 範例](public/example.workflow.aov.json) / [Dataflow 範例](public/example.dataflow.aov.json)：兩份共用相同專案 ID，可一起匯入。
- [Agent 檔案契約](docs/aov-format.md)
- [JSON Schema](public/aov.schema.json)
- [驗證紀錄](docs/verification.md)

## 驗證

`npm test` 測試循環、輸入限制、父子映射、刪除、格式驗證與往返。`npm run schema` 從來源重新產生 Schema 及示例。

1.1 瀏覽器操作腳本為 `tests/browser-1.1.js`，使用 Playwright CLI 的 `run-code --filename` 執行。測試會匯入取代資料，務必使用獨立測試瀏覽器。`browser-smoke.js`、`browser-connections.js` 與 `browser-final.js` 為 1.0 歷史腳本，其選擇器尚未調整為雙文件畫面。

匯入上限 10 MB。第一版以單一分頁編輯，不含多人同步、跨連線 Schema 型別推理或遠端參照載入。
