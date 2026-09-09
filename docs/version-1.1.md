# AOV Studio 1.1 系統設計與檔案契約

本文件取代 1.0 中「以單一文件同時描述 Workflow／Dataflow」的規則。系統持續只做架構定義，不產生功能實作、不執行 Function、API、條件或 Loop。

## 兩份獨立文件

| 文件 | 使用者 | 節點內容 | 本地檔名 |
| --- | --- | --- | --- |
| Workflow | 一般使用者、流程負責人 | 步驟名稱、說明、負責角色、開始／完成條件、例外處理 | `名稱.workflow.aov.json` |
| Dataflow | 工程師、Agent | Function、Input／Output、參數、變數、轉換、外部引用 | `名稱.dataflow.aov.json` |

兩者可單獨存在，也可同時載入。共用 `project.id` 表示同一專案，並不代表名稱、說明或內容自動同步。文件切換只改變顯示，保留各自選取、畫布位置、縮放、未輸出變更與復原歷史。

尚不存在的模式顯示建立／匯入入口，不自動生成另一份文件。按建立另一份文件時才沿用目前專案 ID。匯入依 `documentType` 取代對應文件，先確認未輸出變更，另一份文件保持原內容。不同專案 ID 可獨立載入，但不啟用群組建立／配色同步，也不假裝引用已核對。

## 文件格式

兩者具有 `format: "aov"`、`schemaVersion: "1.1"`、`documentType`、`project`、`rootGraphId`、`graphs`、`layout`、`definition`。JSON Schema 分別為：

- [Workflow Schema](../public/workflow.schema.json)
- [Dataflow Schema](../public/dataflow.schema.json)
- [聯合 Schema](../public/aov.schema.json)

Workflow 節點只有 `id/kind/name/style/business`，`kind` 為一般步驟 node 或等待彙整 buffer。`business` 為 description、role、start、completion、exceptions。Workflow 檔案沒有 function、inputs、outputs、parameters、variables 或 external。

Workflow 連線保留 id、kind、source、target、name、condition、reason、loop，不含技術連接埠與 mapping。一般步驟最多一個正向前置來源；等待彙整可有多個，等待全部或任一成立等語意由開始條件明確描述。正向流程禁止循環，返回線及重複處理另行定義。

Dataflow 延續 1.0 技術欄位，所有節點新增 `style: {color: "#RRGGBB"}`、`workflowNodeId: string|null`、`external: object|null`。新增 group 類型承載某個 Workflow 步驟的工程細項，其餘一般、緩衝、入口、出口節點與連線驗證保持原規則。

編輯器內部共用畫布操作模型；Workflow 經明確的讀寫轉接，輸出只保留業務契約，不把內部畫布用的技術欄位寫入 Workflow 文件。

## 全圖展開與父子邊界

Dataflow 主畫布同時展開所有 Workflow 群組的直屬工程細項。每個 group 保存自己的 `workflowNodeId` 與 `childGraphId`；同一 Workflow 步驟最多對應一個群組。主畫布也允許沒有 Workflow 對應的獨立技術節點。

按「建立缺少的 Workflow 群組」明確建立缺少的群組，複製步驟名稱與顏色作為初始值，不複製或推定 function。這個動作不會將業務先後線直接轉換成資料傳遞線；工程師需明確定義群組間的資料契約與連線。

每個群組包含入口與出口；群組間透過外部連接點連線，再由內部邊界映射到工程節點。畫布與匯入皆禁止直接跨圖連到另一群組內部。從「新增節點至」指定群組，再新增一般／緩衝節點。

個別 function 仍可有更深層子 AOV；雙擊或按開啟子 AOV 進入深入編輯，所有層級都保留在同一 Dataflow 文件。主畫布預設展開各 Workflow 群組的第一層細項，更深層採深入編輯，避免無限巢狀畫布。

刪除 Dataflow 群組會連帶刪除其所屬子孫圖，並提供確認與復原。刪除 Workflow 步驟不會刪除任何 Dataflow 資料，只標示對應失效。缺少另一份文件或步驟 ID 不存在時仍允許 Dataflow 獨立開啟／匯出，警告不會改寫或清理引用。

## 配色與樣式

NODE DEFINITION 提供「定義／樣式」分頁。

- Workflow 步驟、自主 Dataflow 節點與群組可設定主題色。
- 同一 Workflow 群組的全部 Dataflow 內容，包含更深層子 AOV，繼承群組顏色。局部節點 style 保留，但群組內的有效顏色以祖先群組為準，介面禁止個別覆寫。
- Dataflow 群組在自己的文件中保存顏色，沒有 Workflow 文件仍能完整顯示。
- Workflow 改色不會自動改寫 Dataflow。按「同步 Workflow 配色」只更新同專案、有效對應群組的顏色，失效對應保持原色。
- 色彩用於節點標記、邊框與群組背景，文字維持淺／深色主題對比。外部引用使用圖示與文字，避免占用群組色。

## 外部引用 Function

Dataflow 一般／緩衝節點可選擇「引用外部內容」。以 `external` 保存：

| 欄位 | 意義 |
| --- | --- |
| category | api、package、project、document |
| name / provider / location | 名稱、提供者、來源網址／儲存庫／位置 |
| version / usage | 版本或 commit、引用範圍與用途 |
| method / path | API 的 HTTP 方法與路徑 |
| symbol | 套件符號、程式碼或文件引用位置 |
| license | 使用授權描述 |
| authentication / credentialRef | 認證方式與憑證引用名稱；不填真實密鑰 |
| limits | 限制與失敗處理 |

輸入、輸出及錯誤處理沿用原節點契約。畫布標示「↗ 外部引用」。不請求來源網址、不下載或安裝內容、不呼叫 API。版本與來源未定義時列入草稿缺漏。

## 儲存、升級與恢復

- 分別使用 `aov-studio-workflow-v1.1`、`aov-studio-dataflow-v1.1` 瀏覽器草稿鍵，各自自動暫存；未建立的模式不寫入草稿。
- 匯出與另存只輸出目前文件，含其全部圖及布局，不打包另一份文件。
- 1.0 檔案先經舊版 Schema 驗證，再升級為 Dataflow 1.1；保留所有 ID、技術內容與布局，補上樣式／引用欄位，不推測或生成 Workflow。
- 舊草稿 `aov-studio-draft-v1` 僅作相容讀取，不覆寫；新草稿寫入新的 Dataflow 鍵。
- 每份文件各有 50 步記憶體復原／重做。清除、匯入與配色同步都只進入被修改文件的歷史。
- JSON 結構錯誤阻擋匯入／匯出，定義缺漏可保存草稿。跨文件對應警告另外呈現，不冒充本地文件結構錯誤。
- 1.0 的 10 MB 匯入上限、未套用 Schema 保護、深／淺色主題、動畫與減少動態效果支援保持有效。

## Agent 修改原則

先判斷 documentType，再使用對應 Schema；業務描述不要寫入 Dataflow 的 function 以取代 Workflow，也不要把技術欄位塞進 Workflow。保留穩定 ID 與未知的進階資料 Schema 限制。更動父連接埠須同步 Dataflow 子圖邊界。引用失效只回報，不自行刪除另一份文件資料；跨文件配色同步必須是明確操作。
## 1.1.1 介面修正

每個節點下方中央只有一個返回接點，同一點可作為起點或終點；虛線朝下延伸後連回目標下方。正向線保留左入右出，中間節點可同時接受左側輸入並向右輸出。新增返回線沿用來源第一個輸出與目標第一個輸入契約，既有返回線則保留原本 port ID；視覺上均使用單一下方接點。無輸出的邊界不能作為返回起點，無輸入的邊界不能作為返回終點。既有返回原因、Loop、輸入限制與資料映射不變，檔案 schemaVersion 維持 1.1。

完整性必填縮減為專案、節點與連接埠名稱；外部引用的名稱與位置；返回原因；重複 Loop 的次數上限、停止條件與超限處理。專案目的、Workflow 業務說明、function 各項描述、緩衝規則、資料欄位、輸出／連線條件及欄位映射均為選填。這些欄位仍保留在格式與表單中，不填不再使文件保持草稿。
