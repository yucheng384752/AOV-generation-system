import { useEffect, useState } from 'react';
import type { Schema } from '../domain/types';
import { schemaError } from '../domain/validate';
import Dialog from './Dialog';

function JsonInput({ value, onChange }: { value: Schema; onChange: (value: Schema) => void }) {
  const [text, setText] = useState(JSON.stringify(value, null, 2)); const [error, setError] = useState('');
  const serialized = JSON.stringify(value, null, 2);
  useEffect(() => { setText(serialized); setError(''); }, [serialized]);
  return <div data-schema-draft data-unapplied={text !== serialized ? 'true' : undefined}><label>JSON Schema（Draft 7）<textarea className="code" value={text} rows={12} onChange={e => setText(e.target.value)} /></label>
    <button type="button" onClick={() => { try { const next = JSON.parse(text); const problem = schemaError(next); if (problem) throw new Error(problem); onChange(next); setError(''); } catch { setError('Schema 格式不合法，請檢查型別、括號與限制值。尚未套用，原定義仍保留。'); } }}>套用 Schema</button>
    {text !== serialized && <><button onClick={() => { setText(serialized); setError(''); }}>放棄未套用變更</button><small>尚未套用；套用或放棄後才能切換項目與匯出。</small></>}
    {error && <p role="alert" className="error">{error}</p>}<small>修改後請按「套用 Schema」。此區不執行程式或載入遠端參照。</small></div>;
}

export default function SchemaEditor({ value, onChange, depth = 0 }: { value: Schema; onChange: (value: Schema) => void; depth?: number }) {
  const [error, setError] = useState('');
  const [remove, setRemove] = useState<string | null>(null);
  const advanced = typeof value === 'boolean' || ['$ref', 'oneOf', 'anyOf', 'allOf', 'if', 'not'].some(k => typeof value === 'object' && k in value) || (typeof value === 'object' && Array.isArray(value.type));
  if (advanced || depth > 6) return <><p className="muted">此結構使用進階 Schema 編輯，保留全部限制。</p><JsonInput value={value} onChange={onChange} /></>;
  const schema = value as Exclude<Schema, boolean>;
  const update = (patch: Record<string, unknown>) => onChange({ ...schema, ...patch });
  const properties = schema.properties ?? {};
  return <div className="schema-fields">
    <label>資料型別<select value={schema.type ?? ''} onChange={e => update({ type: e.target.value })}><option value="" disabled>尚未定義</option>{['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'].map(t => <option key={t}>{t}</option>)}</select></label>
    <label>資料說明<input value={schema.description ?? ''} onChange={e => update({ description: e.target.value })} /></label>
    {schema.type === 'object' && <>
      {Object.entries(properties).map(([key, child]) => <details key={key} className="field-card"><summary>{key} <small>{(child as any)?.type ?? '進階'}</small></summary>
        <label>欄位名稱<input defaultValue={key} onBlur={e => {
          const name = e.target.value.trim(); if (name === key) return;
          if (!name || Object.hasOwn(properties, name)) { setError('欄位名稱不可空白或重複'); e.target.value = key; return; }
          const next = Object.fromEntries(Object.entries(properties).map(([k, v]) => [k === key ? name : k, v]));
          update({ properties: next, required: (schema.required ?? []).map((k: string) => k === key ? name : k) }); setError('');
        }} /></label>
        <label className="check"><input type="checkbox" checked={(schema.required ?? []).includes(key)} onChange={e => update({ required: e.target.checked ? [...(schema.required ?? []), key] : (schema.required ?? []).filter((k: string) => k !== key) })} />必要欄位</label>
        <SchemaEditor depth={depth + 1} value={child as Schema} onChange={next => update({ properties: { ...properties, [key]: next } })} />
        <button className="danger subtle" onClick={() => setRemove(key)}>移除欄位</button>
      </details>)}
      <button onClick={() => { let i = 1; while (Object.hasOwn(properties, `field${i}`)) i++; update({ properties: { ...properties, [`field${i}`]: { type: 'string', description: '' } } }); }}>＋ 新增欄位</button>
    </>}
    {schema.type === 'array' && <details open className="field-card"><summary>陣列元素</summary>{Array.isArray(schema.items) ? <JsonInput value={schema} onChange={onChange} /> : <SchemaEditor value={schema.items ?? { type: 'string' }} depth={depth + 1} onChange={items => update({ items })} />}</details>}
    <label>預設值（JSON，失焦套用）<input key={JSON.stringify(schema.default)} defaultValue={schema.default === undefined ? '' : JSON.stringify(schema.default)} onBlur={e => {
      try { const next = { ...schema }; if (e.target.value.trim()) next.default = JSON.parse(e.target.value); else delete next.default; onChange(next); setError(''); } catch { setError('預設值必須是 JSON，例如 3、true 或 "文字"。尚未套用。'); }
    }} /></label>
    {error && <p role="alert" className="error">{error}</p>}
    <details><summary>進階限制與範例 · JSON Schema</summary><JsonInput value={value} onChange={onChange} /></details>
    {remove !== null && <Dialog title="移除此資料欄位？" close={() => setRemove(null)} label="移除欄位" confirm={() => { const next = Object.fromEntries(Object.entries(properties).filter(([k]) => k !== remove)); update({ properties: next, required: (schema.required ?? []).filter((k: string) => k !== remove) }); setRemove(null); }}><p>將移除「{remove}」及其巢狀定義，操作後可以復原。</p></Dialog>}
  </div>;
}
