# AOV 1.0：Agent 交換契約

本頁為舊版契約記錄。目前 1.1 的雙文件格式、相容升級與引用規則見 [1.1 契約](version-1.1.md)。`public` 下 Schema 與範例已更新為 1.1。

## 定位

此格式描述架構，不是可執行程式。條件、步驟、資料對應與 loop 都是規格文字；不得推定編輯器會執行、求值或驗證業務邏輯。

機器格式定義：[`public/aov.schema.json`](../public/aov.schema.json)。範例：[`public/example.aov.json`](../public/example.aov.json)。Schema 由 `src/domain/schema.ts` 生成；更動後執行 `npm run schema`。

## 文件結構

| 欄位 | 定義 |
| --- | --- |
| format | 固定 `aov` |
| schemaVersion | 固定 `1.0`，目前拒絕其他版本，不做隱式遷移 |
| project | 專案 id、name、description（系統目的與範圍） |
| rootGraphId | 根圖 ID |
| graphs | 所有圖的陣列；每圖有 id、name、nodes、edges |
| layout | 以圖 ID 對應 positions（節點 ID → x/y）與 viewport（x/y/zoom） |
| definition | status 為 draft/complete；issues 為缺漏訊息陣列，匯入／匯出時重新計算 |

圖、節點與連線 ID 全文件唯一。連接埠 ID 在同節點內唯一，子圖邊界刻意沿用父節點的連接埠 ID。ID 只用英數字、底線與連字號，禁止系統保留名稱。ID 不隨顯示名稱改變。

## 節點

`kind` 為 node（一般功能）、buffer（緩衝）、entry（子圖入口）或 exit（子圖出口）。一個功能節點只有一份 `function`：

| 欄位 | 應描述的內容 |
| --- | --- |
| purpose | 功能目的、責任邊界 |
| preconditions | 執行該功能之前應成立的條件；無條件需明寫 |
| steps | 依序描述處理步驟 |
| rules | 業務限制與判斷規則 |
| postconditions | 功能完成後的保證 |
| errors | 失敗情境、錯誤輸出與恢復策略 |

`inputs`、`outputs` 是具名連接埠陣列。一般節點恰有一個輸入定義，但可以沒有輸入連線，作為起點。緩衝可有多個輸入，每個具名輸入最多接一條正向線；返回線另計。輸出可有多個，每個可連到多個下游。

每個連接埠都有 id、name、description、condition、schema。`condition` 用於描述輸出產生條件；連線條件另外描述何時走該連線。多條分支是否互斥，須在條件或功能規則寫明，不依圖形位置推定。

`schema`、`parameters`、`variables` 使用 JSON Schema Draft 7；參數代表固定設定，變數代表中間資料。可描述巢狀 properties、required、items、enum、範圍、default 與 examples。未知限制保留，表單只修改使用者變更的欄位。複合型別、布林 Schema、$ref 等透過進階編輯；不自動抓取遠端參照，也不做完整的跨連線型別推理。

`buffer.mode`：all（等待全部）、any（任一到達）、latest（保留最新）、storage（倉儲）。`buffer.rules` 描述資料整合、欄位衝突、讀寫與保存語意；模式本身不執行上述動作。

## 連線與 Loop

每條線的 `source` / `target` 指向同圖節點，`sourcePort` / `targetPort` 指向輸出／輸入 ID。

- `kind: forward`：正向依賴，整張圖的正向線必須無環。
- `kind: return`：返回控制關係，以虛線顯示；不占用正向輸入名額。
- `name`：顯示標籤。
- `condition`：觸發／分支條件。
- `mapping`：傳遞哪些資料與欄位如何對應；若原樣傳遞需明寫。
- `reason`：返回原因，返回線完整性檢查必填。
- `loop.mode`：once（單次返回）、fixed（固定次數）、until（條件式重複）。
- `loop.maxIterations`：正整數，計算返回線被走過的次數，不包含初次正向處理；once 可為 null。
- `loop.stopCondition`：until 的停止條件。
- `loop.onLimit`：達到次數上限後的處理；重複模式必填。

返回目標不是正向上游時列為需確認的語意缺漏，不靠名稱推定流程合法。`once` 表示單次返回描述；不代表整張架構不存在其他迴圈。

## 子圖邊界

父節點 `childGraphId` 引用其專屬子圖，無子圖則為 null。子圖不可共用、孤立或循環引用。一般功能的 `boundaryPortId` 為 null。

子圖 entry 的 `boundaryPortId` 指向父輸入 ID，entry 只有一個輸出且契約與父輸入相同。exit 相反：指向父輸出 ID，只有一個輸入且契約相同。此映射明確表達父子間資料交換，禁止跨圖直接連線。入口可以分送，出口多來源先經緩衝合併。

刪除父節點連帶刪除所屬子孫圖。清除子圖只清除該圖 items 與其所屬子孫圖，保留目前圖與父節點引用。缺少邊界可作為草稿保存，完整性檢查必須指出。

## Agent 修改規則

1. 保留未修改內容、既有 ID 與布局；新元素產生新 ID 並補上座標。
2. 修改父連接埠時同步子圖邊界契約；刪除節點／連接埠時清理所有相關引用。
3. 以連線及明確條件解讀流程；座標、陣列順序與顏色不代表執行順序。
4. 不把空白描述當作已定義，不猜測預設業務規則；未完成內容列入草稿缺漏。
5. 不在描述檔放置真實憑證；描述憑證引用名稱即可。
6. 修改後通過 JSON Schema 與圖關係驗證，再交回編輯器匯入。JSON Schema 本身無法表達所有圖關係規則。

## 完整性與結構

結構錯誤阻擋匯入／匯出，包含重複 ID、失效連接埠、正向循環、輸入超額、非法父子關係、缺少布局與不合法 Schema。語意缺漏仍可匯出 draft，例如用途空白、未定義資料、缺少返回原因／loop 上限、未連接子圖邊界。

complete 只表示本版完整性檢查無缺漏，不能取代工程師對需求、演算法或業務正確性的審查。
