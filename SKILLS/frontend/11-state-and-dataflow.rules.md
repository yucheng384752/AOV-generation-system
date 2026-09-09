# Frontend Skill｜狀態與資料流（State & Data Flow）

## 目的
避免狀態分散、資料不一致、畫面顯示過期結果。

---

## 狀態分類（Must）

- UI State：loading / empty / error / success / disabled
- Query State：idle / fetching / stale
- Form State：dirty / valid / submitting / submitted

---

## 強制規則

- 查詢條件影響結果時：
  - 必須反映在 URL（可分享、可回復）
- 非同步資料必須有快取與失效策略
- 表單送出時不得同時存在多個 submission state

---

## 禁止行為（Forbidden）

- UI 顯示舊資料卻未標示
- 狀態存放位置不明（到處 useState）
- 切換條件後瞬間顯示錯誤結果