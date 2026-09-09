import Ajv from 'ajv';
import { documentSchema, legacyDocumentSchema } from './schema';
import { fromFile, migrateLegacy, toFile } from './documents';
import type { AovDocument, Graph, Issue, Schema } from './types';
const ajv = new Ajv({ allErrors: true, strict: false, strictNumbers: true, validateFormats: false });
const validateShape = ajv.compile(documentSchema);
const validateLegacy = ajv.compile(legacyDocumentSchema);
export function schemaError(value: Schema): string | null {
  try { if (!ajv.validateSchema(value)) return ajv.errorsText(); }
  catch { return '不支援此 Schema 版本，請使用 JSON Schema Draft 7'; }
  return null;
}
export function hasPath(graph: Graph, source: string, target: string): boolean {
  const seen = new Set<string>(); const queue = [source];
  const adjacency = new Map<string, string[]>();
  for (const e of graph.edges) if (e.kind === 'forward') adjacency.set(e.source, [...(adjacency.get(e.source) ?? []), e.target]);
  while (queue.length) { const id = queue.pop()!; if (id === target) return true; if (seen.has(id)) continue; seen.add(id); queue.push(...(adjacency.get(id) ?? [])); }
  return false;
}
export function structuralIssues(value: unknown): Issue[] {
  let candidate: unknown;
  try { candidate = (value as AovDocument)?.documentType === 'workflow' && Array.isArray((value as AovDocument)?.graphs) ? toFile(value as AovDocument) : value; }
  catch { return [{ message: 'Workflow 節點或連線結構不合法' }]; }
  if (!validateShape(candidate)) return (validateShape.errors ?? []).slice(0, 30).map(e => ({ message: `格式不符 ${e.instancePath || '/'}：${e.message}` }));
  const doc = value as AovDocument; const issues: Issue[] = [];
  const add = (message: string, graphId?: string, itemId?: string) => issues.push({ message, graphId, itemId });
  const allIds = new Set<string>();
  const unique = (id: string, graphId?: string) => { if (['__proto__', 'constructor', 'prototype'].includes(id)) add('識別碼不可使用系統保留名稱', graphId); if (allIds.has(id)) add(`識別碼重複：${id}`, graphId); allIds.add(id); };
  const owners = new Map<string, string>();
  const workflowLinks = new Set<string>();
  if (doc.documentType === 'workflow' && doc.graphs.length !== 1) add('Workflow 使用一張業務流程畫布');
  if (!doc.graphs.some(g => g.id === doc.rootGraphId)) add('找不到主流程');
  for (const graph of doc.graphs) {
    unique(graph.id, graph.id);
    const boundaryMappings = new Set<string>();
    if (!doc.layout[graph.id]) add('缺少畫布布局', graph.id);
    for (const n of graph.nodes) {
      unique(n.id, graph.id);
      if (n.workflowNodeId) {
        if (n.kind !== 'group' || graph.id !== doc.rootGraphId) add('Workflow 對應只可設定於主畫布群組', graph.id, n.id);
        if (workflowLinks.has(n.workflowNodeId)) add('同一 Workflow 步驟不可對應重複群組', graph.id, n.id);
        workflowLinks.add(n.workflowNodeId);
      }
      if (n.kind === 'group' && (!n.childGraphId || graph.id !== doc.rootGraphId)) add('群組必須位於主畫布並有專屬細項圖', graph.id, n.id);
      if (n.kind === 'node' && n.inputs.length !== 1) add('一般節點需要一個輸入定義', graph.id, n.id);
      const ports = [...n.inputs, ...n.outputs];
      if (new Set(ports.map(p => p.id)).size !== ports.length) add('同節點連接埠 ID 不可重複', graph.id, n.id);
      for (const s of [n.parameters, n.variables, ...ports.map(p => p.schema)]) {
        const error = schemaError(s); if (error) add(`資料 Schema 不合法：${error}`, graph.id, n.id);
      }
      if (!doc.layout[graph.id]?.positions[n.id]) add('節點缺少座標', graph.id, n.id);
      if (n.childGraphId) {
        if (!['node', 'buffer', 'group'].includes(n.kind)) add('邊界節點不可擁有子圖', graph.id, n.id);
        if (owners.has(n.childGraphId)) add('子圖不可共用', graph.id, n.id);
        owners.set(n.childGraphId, graph.id);
        if (!doc.graphs.some(g => g.id === n.childGraphId)) add('子图引用不存在', graph.id, n.id);
      }
      if (['node', 'buffer', 'group'].includes(n.kind) && n.boundaryPortId !== null) add('一般與緩衝節點不可有邊界映射', graph.id, n.id);
      if (['entry', 'exit'].includes(n.kind)) {
        const mapping = `${n.kind}/${n.boundaryPortId}`;
        if (boundaryMappings.has(mapping)) add('同一父連接埠不可有重複邊界', graph.id, n.id);
        boundaryMappings.add(mapping);
        const parent = doc.graphs.flatMap(g => g.nodes).find(p => p.childGraphId === graph.id);
        const contract = (n.kind === 'entry' ? parent?.inputs : parent?.outputs)?.find(p => p.id === n.boundaryPortId);
        const active = n.kind === 'entry' ? n.outputs : n.inputs;
        const inactive = n.kind === 'entry' ? n.inputs : n.outputs;
        if (!contract || active.length !== 1 || inactive.length || JSON.stringify(active[0]) !== JSON.stringify(contract)) add('邊界入口／出口必須對應父節點契約', graph.id, n.id);
      }
    }
    const occupied = new Set<string>(); const connections = new Set<string>();
    const indegree = new Map(graph.nodes.map(n => [n.id, 0])); const adjacency = new Map<string, string[]>();
    for (const e of graph.edges) {
      unique(e.id, graph.id);
      const source = graph.nodes.find(n => n.id === e.source); const target = graph.nodes.find(n => n.id === e.target);
      if (!source?.outputs.some(p => p.id === e.sourcePort) || !target?.inputs.some(p => p.id === e.targetPort)) add('連線引用不存在或跨圖，請重新連接', graph.id, e.id);
      const key = `${e.kind}/${e.source}/${e.sourcePort}/${e.target}/${e.targetPort}`;
      if (connections.has(key)) add('相同連線重複', graph.id, e.id); connections.add(key);
      if (e.kind === 'forward') {
        const input = `${e.target}/${e.targetPort}`;
        if (occupied.has(input) && !(doc.documentType === 'workflow' && target?.kind === 'buffer')) add('每個輸入只能接一條正向線；請使用緩衝節點', graph.id, e.id); occupied.add(input);
        indegree.set(e.target, (indegree.get(e.target) ?? 0) + 1); adjacency.set(e.source, [...(adjacency.get(e.source) ?? []), e.target]);
      }
    }
    const queue = [...indegree].filter(([, degree]) => degree === 0).map(([id]) => id); let visited = 0;
    while (queue.length) { const id = queue.pop()!; visited++; for (const next of adjacency.get(id) ?? []) { indegree.set(next, indegree.get(next)! - 1); if (indegree.get(next) === 0) queue.push(next); } }
    if (visited !== indegree.size) add('正向連線禁止循環，請改用返回線', graph.id);
  }
  if (owners.has(doc.rootGraphId)) add('主流程不可作為子圖');
  for (const graph of doc.graphs) {
    if (graph.id !== doc.rootGraphId && !owners.has(graph.id)) add('子圖沒有父節點', graph.id);
    const seen = new Set<string>(); let id: string | undefined = graph.id;
    while (id) { if (seen.has(id)) { add('子圖引用形成循環', graph.id); break; } seen.add(id); id = owners.get(id); }
  }
  return issues;
}
export function completeness(doc: AovDocument): Issue[] {
  const issues: Issue[] = []; const add = (message: string, graphId?: string, itemId?: string) => issues.push({ message, graphId, itemId });
  if (!doc.project.name.trim() || doc.project.name === '未命名專案') add('請命名專案');
  if (!doc.project.description.trim()) add('請描述專案目的');
  for (const g of doc.graphs) {
    if (!g.nodes.some(n => n.kind === 'node' || n.kind === 'buffer' || n.kind === 'group')) add('畫布尚未定義功能節點', g.id);
    for (const n of g.nodes) {
      if (n.kind === 'entry' || n.kind === 'exit') continue;
      if (!n.name.trim()) add('請命名節點', g.id, n.id);
      if (doc.documentType === 'workflow') {
        const labels = { description: '步驟說明', role: '負責角色', start: '開始條件', completion: '完成條件', exceptions: '例外處理' };
        for (const k of Object.keys(labels) as (keyof typeof labels)[]) if (!n.business?.[k].trim()) add(`${n.name}：尚未定義${labels[k]}`, g.id, n.id);
        continue;
      }
      if (n.external) for (const key of ['name', 'location', 'version', 'usage'] as const) if (!n.external[key].trim()) add(`${n.name}：外部引用缺少 ${key}`, g.id, n.id);
      const labels = { purpose: '用途', preconditions: '前置條件', steps: '處理步驟', rules: '規則', postconditions: '完成條件', errors: '錯誤處理' };
      for (const k of Object.keys(labels) as (keyof typeof labels)[]) if (!n.function[k].trim()) add(`${n.name}：尚未定義${labels[k]}`, g.id, n.id);
      if (n.kind === 'buffer' && !n.buffer.rules.trim()) add(`${n.name}：尚未定義整合／讀寫規則`, g.id, n.id);
      for (const p of [...n.inputs, ...n.outputs]) {
        if (!p.name.trim() || !p.description.trim()) add(`${n.name}：請補齊連接埠名稱與說明`, g.id, n.id);
        if (typeof p.schema === 'object' && p.schema.type === 'object' && !Object.keys(p.schema.properties ?? {}).length) add(`${n.name} / ${p.name}：尚未定義資料欄位（無資料可使用 null 型別）`, g.id, n.id);
      }
      for (const p of n.outputs) if (!p.condition.trim()) add(`${n.name} / ${p.name}：尚未定義輸出條件`, g.id, n.id);
      const child = doc.graphs.find(c => c.id === n.childGraphId);
      if (child) for (const p of [...n.inputs, ...n.outputs]) if (!child.nodes.some(b => b.boundaryPortId === p.id)) add(`${n.name}：子圖缺少邊界，請重建入口／出口`, child.id);
    }
    for (const e of g.edges) {
      if (!e.condition.trim()) add('連線尚未定義觸發條件', g.id, e.id);
      if (doc.documentType === 'dataflow' && !e.mapping.trim()) add('連線尚未定義傳遞資料／欄位對應', g.id, e.id);
      if (e.kind === 'return') {
        if (!e.reason.trim()) add('返回線必須描述返回原因', g.id, e.id);
        if (e.loop.mode !== 'once' && (e.loop.maxIterations === null || !e.loop.onLimit.trim())) add('Loop 需要次數上限與超限處理', g.id, e.id);
        if (e.loop.mode === 'until' && !e.loop.stopCondition.trim()) add('條件式 Loop 需要停止條件', g.id, e.id);
        if (!hasPath(g, e.target, e.source)) add('返回目標目前不是正向流程的上游，請確認返回語意', g.id, e.id);
      }
    }
    for (const n of g.nodes.filter(n => n.kind === 'entry' || n.kind === 'exit')) if (!g.edges.some(e => e.kind === 'forward' && (n.kind === 'entry' ? e.source === n.id : e.target === n.id))) add(`${n.name}：邊界尚未連接內部流程`, g.id, n.id);
  }
  return issues;
}
export function encode(doc: AovDocument): string {
  const errors = structuralIssues(doc); if (errors.length) throw new Error(errors[0].message);
  const issues = completeness(doc).map(i => i.message);
  return JSON.stringify(toFile({ ...doc, definition: { status: issues.length ? 'draft' : 'complete', issues } }), null, 2);
}
export function decode(text: string): AovDocument {
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('無法解析 JSON，請檢查檔案的括號與逗號。'); }
  const version = (value as { schemaVersion?: string })?.schemaVersion;
  if (version === '1.0') {
    if (!validateLegacy(value)) throw new Error('1.0 檔案格式不合法，無法升級');
    value = migrateLegacy(value);
  } else if (version !== '1.1') throw new Error('不支援此檔案版本；支援 1.1 與 1.0 升級。');
  if (!validateShape(value)) throw new Error(`檔案格式不合法：${ajv.errorsText(validateShape.errors)}`);
  const doc = fromFile(value);
  const errors = structuralIssues(doc); if (errors.length) throw new Error(errors.map(e => e.message).slice(0, 5).join('\n'));
  const issues = completeness(doc).map(i => i.message);
  doc.definition = { status: issues.length ? 'draft' : 'complete', issues }; return doc;
}
