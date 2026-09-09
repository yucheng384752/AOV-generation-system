import type { AovNode, AovEdge, Port } from '../domain/types';
import { useState } from 'react';
import { newExternal } from '../domain/documents';
import SchemaEditor from './SchemaEditor';
import { port } from '../domain/model';
export function TextField({ label, value, onChange, multiline = false, required = false }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; required?: boolean }) {
  return <label><span>{label}{required && <b className="required" aria-hidden="true"> *</b>}</span>{multiline ? <textarea rows={3} value={value} required={required} placeholder="尚未定義" onChange={e => onChange(e.target.value)} /> : <input value={value} required={required} onChange={e => onChange(e.target.value)} />}</label>;
}
function Ports({ ports, onChange, input, limited }: { ports: Port[]; onChange: (p: Port[]) => void; input: boolean; limited: boolean }) {
  return <>{ports.map((p, index) => {
    const update = (patch: Partial<Port>) => onChange(ports.map(x => x.id === p.id ? { ...x, ...patch } : x));
    return <details className="field-card" key={p.id} open={ports.length === 1}><summary>{p.name || `連接埠 ${index + 1}`}</summary>
      <TextField label="連接埠名稱" required value={p.name} onChange={name => update({ name })} />
      <TextField label="資料用途與說明" value={p.description} multiline onChange={description => update({ description })} />
      {!input && <TextField label="產生此輸出的條件" value={p.condition} multiline onChange={condition => update({ condition })} />}
      <SchemaEditor value={p.schema} onChange={schema => update({ schema })} />
      {!limited && <button className="danger subtle" onClick={() => onChange(ports.filter(x => x.id !== p.id))}>移除此連接埠及相關連線</button>}
    </details>;
  })}{!limited && <button onClick={() => onChange([...ports, port(input ? '輸入' : '輸出')])}>＋ 新增{input ? '輸入' : '輸出'}</button>}</>;
}
function StyleEditor({ node, update, color, inherited = false }: { node: AovNode; update: (n: AovNode) => void; color?: string; inherited?: boolean }) {
  return <><label>{inherited ? '所屬 Workflow 群組顏色' : '節點／群組主題色'}<input type="color" value={color ?? node.style.color} disabled={inherited} onChange={e => update({ ...node, style: { color: e.target.value } })} /></label><p className="note">{inherited ? '此節點繼承群組配色，請選取所屬群組修改。' : '顏色用於邊框與標記。群組內所有 Dataflow 節點沿用此色；跨文件配色須明確同步。'}</p></>;
}
export function WorkflowInspector({ node, update }: { node: AovNode; update: (n: AovNode) => void }) {
  const [tab, setTab] = useState('definition');
  const labels = { description: '步驟說明', role: '負責角色', start: '開始條件', completion: '完成條件', exceptions: '例外與返回處理' };
  return <><span className="eyebrow">NODE DEFINITION</span><h2>流程步驟</h2><div className="inspector-tabs" role="tablist"><button role="tab" aria-selected={tab === 'definition'} onClick={() => setTab('definition')}>定義</button><button role="tab" aria-selected={tab === 'style'} onClick={() => setTab('style')}>樣式</button></div>
    {tab === 'style' ? <StyleEditor node={node} update={update} /> : <><TextField label="步驟名稱" required value={node.name} onChange={name => update({ ...node, name })} />{(Object.keys(labels) as (keyof typeof labels)[]).map(key => <TextField key={key} label={labels[key]} multiline value={node.business![key]} onChange={value => update({ ...node, business: { ...node.business!, [key]: value } })} />)}<small>此文件描述業務流程。工程細節請切換至 Dataflow。</small></>}
  </>;
}
export function NodeInspector({ node, update, openChild, color, inherited = false, workflowSteps = [] }: { node: AovNode; update: (n: AovNode) => void; openChild: () => void; color?: string; inherited?: boolean; workflowSteps?: AovNode[] }) {
  const [tab, setTab] = useState('definition');
  if (node.kind === 'entry' || node.kind === 'exit') return <><h2>{node.name}</h2><p>此邊界對應父節點的連接埠，資料契約在父節點編輯。</p><pre>{JSON.stringify([...node.inputs, ...node.outputs][0], null, 2)}</pre></>;
  const labels = { purpose: '功能用途', preconditions: '前置條件', steps: '處理步驟（依序描述）', rules: '業務規則與限制', postconditions: '完成條件', errors: '錯誤處理與恢復方式' };
  return <>
    <span className="eyebrow">NODE DEFINITION</span><h2>{node.kind === 'group' ? 'Workflow 細項群組' : '定義節點'}</h2>
    <div className="inspector-tabs" role="tablist"><button role="tab" aria-selected={tab === 'definition'} onClick={() => setTab('definition')}>定義</button><button role="tab" aria-selected={tab === 'style'} onClick={() => setTab('style')}>樣式</button></div>
    {tab === 'style' ? <StyleEditor node={node} update={update} color={color} inherited={inherited} /> : <>
    <TextField label="節點名稱" required value={node.name} onChange={name => update({ ...node, name })} />
    {node.kind === 'group' && <label>對應 Workflow 步驟<select value={node.workflowNodeId ?? ''} onChange={e => update({ ...node, workflowNodeId: e.target.value || null })}><option value="">未對應（獨立群組）</option>{node.workflowNodeId && !workflowSteps.some(n => n.id === node.workflowNodeId) && <option value={node.workflowNodeId}>未載入／失效：{node.workflowNodeId}</option>}{workflowSteps.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}</select></label>}
    {node.kind !== 'group' && <label>功能類型<select value={node.external ? 'external' : 'local'} onChange={e => update({ ...node, external: e.target.value === 'external' ? newExternal() : null })}><option value="local">一般功能</option><option value="external">引用外部內容</option></select></label>}
    {node.external && <ExternalEditor node={node} update={update} />}
    <details open><summary>功能定義</summary>{(Object.keys(labels) as (keyof typeof labels)[]).map(k => <TextField key={k} label={labels[k]} value={node.function[k]} multiline onChange={v => update({ ...node, function: { ...node.function, [k]: v } })} />)}</details>
    {node.kind === 'buffer' && <details open><summary>緩衝與倉儲</summary><label>整合模式<select value={node.buffer.mode} onChange={e => update({ ...node, buffer: { ...node.buffer, mode: e.target.value as AovNode['buffer']['mode'] } })}>{Object.entries({ all: '等待全部', any: '任一到達', latest: '保留最新', storage: '倉儲' }).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label><TextField label="整合／讀寫規則" multiline value={node.buffer.rules} onChange={rules => update({ ...node, buffer: { ...node.buffer, rules } })} /></details>}
    <details><summary>輸入契約 · {node.inputs.length}</summary><Ports ports={node.inputs} input limited={node.kind === 'node'} onChange={inputs => update({ ...node, inputs })} /></details>
    <details><summary>輸出與分支 · {node.outputs.length}</summary><Ports ports={node.outputs} input={false} limited={false} onChange={outputs => update({ ...node, outputs })} /></details>
    <details><summary>參數 · 固定設定</summary><SchemaEditor value={node.parameters} onChange={parameters => update({ ...node, parameters })} /></details>
    <details><summary>變數 · 中間資料</summary><SchemaEditor value={node.variables} onChange={variables => update({ ...node, variables })} /></details>
    <button className="wide" onClick={openChild}>{node.childGraphId ? '開啟子 AOV →' : '建立子 AOV →'}</button><small>以獨立畫布描述此功能的內部流程。</small></>}
  </>;
}
export function EdgeInspector({ edge, update, workflow = false }: { edge: AovEdge; update: (e: AovEdge) => void; workflow?: boolean }) {
  return <><span className="eyebrow">CONNECTION DEFINITION</span><h2>{edge.kind === 'return' ? (workflow ? '返回與重複' : '返回與 Loop') : workflow ? '流程銜接' : '定義資料流'}</h2>
    <TextField label="連線名稱" value={edge.name} onChange={name => update({ ...edge, name })} />
    <TextField label="觸發／分支條件" multiline value={edge.condition} onChange={condition => update({ ...edge, condition })} />
    {!workflow && <TextField label="傳遞資料與欄位對應" multiline value={edge.mapping} onChange={mapping => update({ ...edge, mapping })} />}
    {edge.kind === 'return' && <><TextField label="返回原因" required multiline value={edge.reason} onChange={reason => update({ ...edge, reason })} />
      <label>{workflow ? '重複方式' : 'Loop 模式'}<select value={edge.loop.mode} onChange={e => update({ ...edge, loop: { ...edge.loop, mode: e.target.value as AovEdge['loop']['mode'] } })}><option value="once">單次返回</option><option value="fixed">固定次數</option><option value="until">條件式重複</option></select></label>
      {edge.loop.mode !== 'once' && <><label><span>{edge.loop.mode === 'fixed' ? '固定返回次數' : '最多返回次數'}<b className="required" aria-hidden="true"> *</b></span><input type="number" required min={1} step={1} value={edge.loop.maxIterations ?? ''} onChange={e => { const value = e.target.value === '' ? null : Number(e.target.value); if (value === null || (Number.isInteger(value) && value > 0)) update({ ...edge, loop: { ...edge.loop, maxIterations: value } }); }} /></label>
        {edge.loop.mode === 'until' && <TextField label="停止條件" required multiline value={edge.loop.stopCondition} onChange={stopCondition => update({ ...edge, loop: { ...edge.loop, stopCondition } })} />}
        <TextField label="達到次數上限後的處理" required multiline value={edge.loop.onLimit} onChange={onLimit => update({ ...edge, loop: { ...edge.loop, onLimit } })} /></>}
    </>}<p className="note">條件與 Loop 僅供架構描述，不會求值或執行。</p></>;
}
function ExternalEditor({ node, update }: { node: AovNode; update: (n: AovNode) => void }) {
  const value = node.external!; const change = (patch: Partial<typeof value>) => update({ ...node, external: { ...value, ...patch } });
  const fields = { name: '來源名稱', provider: '提供者', location: '來源網址／儲存庫／位置', version: '版本或 Commit', usage: '引用範圍與用途', license: '使用授權', authentication: '認證方式', credentialRef: '憑證引用名稱（不填真實密鑰）', limits: '限制與失敗處理' };
  return <details open className="external-definition"><summary>↗ 外部引用</summary><label>引用類別<select value={value.category} onChange={e => change({ category: e.target.value as typeof value.category })}><option value="api">外部 API</option><option value="package">套件／函式庫</option><option value="project">外部專案／程式碼</option><option value="document">文件／資料</option></select></label>
    {Object.entries(fields).map(([key, label]) => <TextField key={key} label={label} required={key === 'name' || key === 'location'} value={value[key as keyof typeof fields]} multiline={key === 'usage' || key === 'limits'} onChange={text => change({ [key]: text })} />)}
    {value.category === 'api' ? <><TextField label="HTTP 方法" value={value.method} onChange={method => change({ method })} /><TextField label="API 路徑" value={value.path} onChange={path => change({ path })} /></> : <TextField label="套件符號／引用位置" value={value.symbol} onChange={symbol => change({ symbol })} />}
    <small>只記錄來源與介面，不下載、呼叫或執行外部內容。</small></details>;
}
