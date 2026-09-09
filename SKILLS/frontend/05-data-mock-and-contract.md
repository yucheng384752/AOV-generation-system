# Frontend Skill｜資料模擬與契約（Mock Data & Contract）

## 目的
在無後端或後端未完成時，仍可完整驗證前端互動流程。

## 強制規則
- 所有資料結構必須定義型別（TypeScript）
- mock data 必須符合實際預期 schema

## 建議作法
- 使用 local mock（JSON / in-memory）
- 或使用 mock service（如 MSW）

## 契約規範
- 資料欄位命名需穩定
- UI 不得依賴未定義欄位

## 禁止行為
- 任意 hardcode 資料格式
- UI 與資料結構強耦合