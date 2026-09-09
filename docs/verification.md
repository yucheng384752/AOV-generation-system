# 驗證紀錄

## 1.1.3 驗證（2026-09-09）

- `npm test`：17/17 通過。`npm run build`：TypeScript 與 Vite 正式建置通過；JS 554.49 KB／gzip 178.95 KB，保留既有 bundle 大小提示。
- 實際 Chromium 畫布：返回模式的 output 位於節點左側、input 位於右側；返回 edge 保持虛線並在節點下方繞行。正向模式會隱藏返回接點，返回模式會隱藏正向接點。
- node 卡片不含「前一步／下一步」文字；新 Workflow node 的 port 預設名稱改為「輸入／輸出」，契約名稱只在設定面板編輯。
- 節點與連接埠名稱等 required input 具有原生 `required`，欄位標題顯示紅色 `*`；說明性欄位沒有星號。

## 1.1.2 驗證（2026-09-09）

- 實際 Chromium 畫布驗證：左方 A 往右方 B 拖曳返回線時，edge 數量不變並顯示「返回線需由右方節點連回左方節點」；右方 B 往左方 C 拖曳後，edge 數量增加且開啟返回與 Loop 設定。
- 既有正向線仍由右側 output 指向左側 input；返回線使用單一下方接點與虛線，箭頭位於左方目標。
- `npm test`：17/17 通過。`npm run build`：TypeScript 與 Vite 正式建置通過；JS 553.80 KB／gzip 178.87 KB，保留既有 bundle 大小提示。

## 1.1.1 驗證（2026-09-09）

- `npm test`：17/17 通過；新增驗證說明欄位可留空，名稱、外部引用定位與 Loop 安全欄位仍會被完整性檢查。
- `npm run build`：TypeScript 與 Vite 正式建置通過；保留既有 bundle 大小提示。
- 實際瀏覽器畫布：建立兩個一般 node，確認每個 node 只有一個下方返回接點；由 B 拖至 A 成功新增返回線，連線為 `7px, 5px` 虛線，接點位於節點底邊。左右正向輸入／輸出接點仍保留。
- Playwright CLI 的最後一次重跑受 Codex 使用額度限制，改以同一 Chromium 控制介面完成實際拖曳與 DOM／樣式檢查；不是只做靜態程式碼判讀。

## 1.1 驗證（2026-09-09）

- `npm test`：16 項通過，含原有圖結構驗證，以及雙文件往返、Workflow 無技術欄位、群組建立冪等、明確配色同步、子孫繼承、失效跨檔引用、外部引用、1.0 遷移與獨立草稿。
- `npm run build`：TypeScript 與 Vite 正式建置通過；JS 553.51 KB／gzip 178.90 KB，仍有 500 KB bundle 提示。
- `tests/browser-1.1.js`：實際 Chromium 操作通過。驗證兩份檔案分別匯入／匯出、業務欄位獨立修改、三組工程細項同時展開、明確同步配色、群組色不可個別覆寫、外部 API 編輯、向指定群組新增節點、跨文件刪除不連帶刪除、獨立復原，以及重新載入後兩份草稿內容保留。
- 瀏覽器測試沒有應用程式 JavaScript 錯誤。截圖：`output/playwright/v11-workflow.png`、`output/playwright/v11-dataflow.png`；匯出檔也保存於同目錄。
- 本輪未重跑下列 1.0 全部瀏覽器案例；跨瀏覽器、觸控、完整輔助技術與大型圖壓力測試仍未驗證。

## 1.0 歷史驗證

日期：2026-09-09。環境：Windows、Node.js 24、Chromium（Playwright CLI）。

## 自動檢查

- TypeScript 嚴格型別檢查與 Vite 正式建置。
- 核心測試：JSON 往返保留 Schema／布局、正向循環／自環、單輸入與多具名緩衝輸入、返回另計、失效引用／重複 ID／不支援版本、子圖邊界映射與同步、子孫圖連帶刪除／快照恢復、清空子圖保留父引用、共享／孤立／循環子圖、Loop 缺漏、Schema 語法、非有限座標與重複邊界。

## 實際瀏覽器操作

- 新增與拖曳節點，從輸出點拖至輸入點建立連線。
- 重複正向輸入及正向循環遭阻擋，顯示具體原因。
- 返回線建立與 Loop 模式、上限、停止條件、超限處理編輯。
- 建立子 AOV 與父子圖切換。
- 清除取消、確認、復原，確認影響數量與圖內容恢復。
- 自動暫存後重新載入，恢復草稿；淺／深色偏好保留。
- 匯入完整範例、下載匯出檔；不合法 JSON 匯入時原專案保留。
- 進階 Schema 套用後用表單修改，保留 additionalProperties 與 minLength。
- 無效 Schema 顯示錯誤，未套用內容阻擋切換面板，可明確放棄。
- 模擬 localStorage 額度失敗，介面顯示失敗與本地匯出建議；恢复儲存能力後成功暫存。
- 1440px 淺／深色、800px 窄版畫面檢查；減少動態效果時動畫停用。

截圖位於 `output/playwright/`，包含 `light-final.png`、`dark-final.png`、`inspector.png` 與 `compact.png`。測試過程無應用程式 JavaScript 錯誤。開發熱更新曾產生 React Flow 類型物件更新提示；類型表在模組層宣告，非每次渲染重建。

## UX / UI Review

### Overall Verdict

- UX maturity level: Good。
- 主流程可完成；多分頁同時編輯與大圖效能不是本次交付的保證範圍。

### Critical Issues (Must Fix)

- 本次已驗證流程未發現未解決的阻斷或靜默資料覆蓋問題。

### Improvement Suggestions (Should Fix)

- 進一步依真實大型專案測量每次完整文件驗證與快照復原的成本。
- 未驗證 Firefox、Safari、觸控裝置與螢幕閱讀器完整操作流程。

### Nice-to-Have Enhancements (Optional)

- 在實際需求出現後增加跨連線 Schema 相容性推理、多人同步與分頁衝突處理。

### UX/UI Checklist Result

- Passed：明確標題／路徑、空畫布指引、欄位標籤、工具 hover／focus 說明、主題切換、錯誤回饋、刪除確認與復原、未套用內容保護、減少動畫偏好。
- 未驗證：完整輔助技術認證、跨瀏覽器一致性與大型圖壓力測試。

## 已知限制

- 正式建置單一 JS bundle 約 538 KB（gzip 約 174 KB），Vite 會提示超過 500 KB；目前主要內容是 React、React Flow 與 Ajv，未為消除提示而額外拆分。
- 瀏覽器暫存受網站資料清除與容量限制；本地完整檔才是長期保存依據。
- 描述完整不等於業務正確，所有 function／條件／Loop 都不執行。
