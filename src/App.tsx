import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import type { Connection, ReactFlowInstance } from '@xyflow/react';
import type { AovNode, AovEdge, AovDocument } from './domain/types';
import { node, edge, createChild, deleteItems, pruneEdges, syncBoundaries, emptyDocument, addWorkflowGroup, syncWorkflowColors, inheritedColor, owningGroup } from './domain/model';
import { referenceIssues } from './domain/documents';
import { completeness, decode, structuralIssues } from './domain/validate';
import { download } from './persistence';
import { useEditor, type Editor } from './useEditor';
import Canvas from './components/Canvas';
import { NodeInspector, EdgeInspector, TextField, WorkflowInspector } from './components/Inspector';
import Dialog from './components/Dialog';
export default function App() {
  const workflow = useEditor('workflow'); const dataflow = useEditor('dataflow');
  const [active, setActive] = useState<AovDocument['documentType']>(() => {
    const mode = location.hash.split('/')[0].slice(1);
    return mode === 'workflow' || (!dataflow.exists && workflow.exists) ? 'workflow' : 'dataflow';
  });
  const importDocument = (doc: AovDocument) => { (doc.documentType === 'workflow' ? workflow : dataflow).replace(doc); setActive(doc.documentType); };
  return <>{([workflow, dataflow]).map(editor => <div key={editor.doc.documentType} hidden={active !== editor.doc.documentType}>
    <DocumentEditor editor={editor} companion={editor === workflow ? dataflow : workflow} active={active === editor.doc.documentType} onSwitch={setActive} onImport={importDocument} />
  </div>)}</>;
}
function DocumentEditor({ editor, companion, active, onSwitch, onImport }: { editor: Editor; companion: Editor; active: boolean; onSwitch: (type: AovDocument['documentType']) => void; onImport: (doc: AovDocument) => void }) {
  const { doc, update, setStatus } = editor;
  const workflow = doc.documentType === 'workflow';
  const [graphId, setGraphId] = useState(() => { const id = location.hash.slice(1).split('/').at(-1); return doc.graphs.some(g => g.id === id) ? id! : doc.rootGraphId; });
  const [selected, select] = useState<string | null>(null); const [panel, setPanel] = useState<'project' | 'issues' | null>(null);
  const [mode, setMode] = useState<AovEdge['kind']>('forward'); const [busy, setBusy] = useState(false);
  const [addTo, setAddTo] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => { try { return localStorage.getItem('aov-theme') === 'dark' ? 'dark' : 'light'; } catch { return 'light'; } });
  const [modal, setModal] = useState<{ title: string; text: string; action: () => void; label?: string } | null>(null);
  const [saveAs, setSaveAs] = useState(false); const [filename, setFilename] = useState('');
  const file = useRef<HTMLInputElement>(null); const instance = useRef<ReactFlowInstance<any> | null>(null);
  const graph = doc.graphs.find(g => g.id === graphId) ?? doc.graphs[0];
  const itemGraph = doc.graphs.find(g => g.nodes.some(n => n.id === selected) || g.edges.some(e => e.id === selected)) ?? graph;
  const activeNode = itemGraph.nodes.find(n => n.id === selected); const activeEdge = itemGraph.edges.find(e => e.id === selected);
  const issues = [...structuralIssues(doc), ...completeness(doc)];
  const references = !workflow ? referenceIssues(doc, companion.exists ? companion.doc : undefined) : [];
  const displayedGraphs = [graph, ...(!workflow && graph.id === doc.rootGraphId ? graph.nodes.filter(n => n.kind === 'group').flatMap(n => doc.graphs.filter(g => g.id === n.childGraphId)) : [])];
  useEffect(() => { if (!doc.graphs.some(g => g.id === graphId)) { setGraphId(doc.rootGraphId); select(null); } }, [doc, graphId]);
  useEffect(() => { if (active) history.replaceState(null, '', `#${doc.documentType}/${graphId}`); }, [graphId, active, doc.documentType]);
  useEffect(() => { if (!active) return; try { setTheme(localStorage.getItem('aov-theme') === 'dark' ? 'dark' : 'light'); } catch {} }, [active]);
  useEffect(() => { if (!active) return; document.documentElement.dataset.theme = theme; try { localStorage.setItem('aov-theme', theme); } catch { setStatus('主題已切換，但瀏覽器無法記住偏好。'); } }, [theme, setStatus, active]);
  const go = (id: string) => { setGraphId(id); select(null); setPanel(null); };
  const openChild = (id: string) => { if (workflow) return; const owner = doc.graphs.find(g => g.nodes.some(n => n.id === id)); const item = owner?.nodes.find(n => n.id === id); if (!item || ['entry', 'exit'].includes(item.kind)) return; let child = item.childGraphId; if (!child) update(d => { child = createChild(d, d.graphs.find(g => g.id === owner!.id)!.nodes.find(n => n.id === id)!); }); if (child) go(child); };
  const addNode = (kind: 'node' | 'buffer') => { const item = node(kind, doc.documentType); const targetId = doc.graphs.some(g => g.id === addTo) && graph.id === doc.rootGraphId ? addTo : graph.id;
    const target = doc.graphs.find(g => g.id === targetId)!; const position = { x: 340 + (target.nodes.length % 2) * 280, y: 140 + Math.floor(target.nodes.length / 2) * 220 };
    update(d => { d.graphs.find(g => g.id === targetId)!.nodes.push(item); d.layout[targetId].positions[item.id] = position; }); select(item.id); setPanel(null); };
  const connect = (c: Connection) => {
    const sourceGraph = doc.graphs.find(g => g.nodes.some(n => n.id === c.source)); const targetGraph = doc.graphs.find(g => g.nodes.some(n => n.id === c.target));
    if (sourceGraph?.id !== targetGraph?.id) { setStatus('不可直接跨群組連線，請透過群組入口／出口連接。'); return; }
    const source = sourceGraph?.nodes.find(n => n.id === c.source); const target = sourceGraph?.nodes.find(n => n.id === c.target); if (!source || !target || !c.sourceHandle || !c.targetHandle) return;
    const positions = doc.layout[sourceGraph!.id].positions;
    if (mode === 'forward' && positions[source.id].x >= positions[target.id].x) { setStatus('正向線需由左方節點連至右方節點。'); return; }
    if (mode === 'return' && positions[source.id].x <= positions[target.id].x) { setStatus('返回線需由右方節點連回左方節點。'); return; }
    const item = { ...edge(source, target, mode), sourcePort: c.sourceHandle, targetPort: c.targetHandle };
    if (update(d => d.graphs.find(g => g.id === sourceGraph!.id)!.edges.push(item))) { select(item.id); setPanel(null); setStatus(mode === 'return' ? '已新增返回線，請定義原因與條件。' : '已新增正向連線，請補上條件。'); }
  };
  const updateNode = (next: AovNode) => {
    const previous = itemGraph.nodes.find(n => n.id === next.id)!;
    const apply = () => update(d => { const g = d.graphs.find(g => g.id === itemGraph.id)!; g.nodes = g.nodes.map(n => n.id === next.id ? next : n); pruneEdges(g); if (JSON.stringify([previous.inputs, previous.outputs]) !== JSON.stringify([next.inputs, next.outputs])) syncBoundaries(d, next.id); });
    const ids = new Set([...next.inputs, ...next.outputs].map(p => p.id));
    if ([...previous.inputs, ...previous.outputs].some(p => !ids.has(p.id))) setModal({ title: '移除連接埠與相關連線？', text: '此操作也會移除對應子圖邊界與其相關連線。可使用復原恢復。', action: apply, label: '移除連接埠' });
    else apply();
  };
  const remove = (all: boolean) => {
    const graph = all ? doc.graphs.find(g => g.id === graphId)! : itemGraph;
    const ids = all ? [...graph.nodes, ...graph.edges].map(n => n.id) : selected ? [selected] : []; if (!ids.length) return;
    const preview = structuredClone(doc); const descendants = deleteItems(preview, graph.id, ids);
    const nodeCount = doc.graphs.reduce((sum, g) => sum + g.nodes.length, 0) - preview.graphs.reduce((sum, g) => sum + g.nodes.length, 0);
    const edgeCount = doc.graphs.reduce((sum, g) => sum + g.edges.length, 0) - preview.graphs.reduce((sum, g) => sum + g.edges.length, 0);
    setModal({ title: all ? '是否清除整個畫布' : '是否刪除選取項目', text: `「${graph.name}」將移除 ${nodeCount} 個節點、${edgeCount} 條連線及 ${descendants} 張子孫圖。其他畫布保留，操作後可按復原。`, label: all ? '清除目前畫布' : '刪除項目', action: () => { update(d => { deleteItems(d, graph.id, ids); }); select(null); setStatus('已移除項目，可使用復原恢復。'); } });
  };
  const exportFile = (name: string) => { try { download(doc, name); editor.markExported(); setStatus(`已交由瀏覽器下載${issues.length ? '草稿' : '完整定義'}，請確認本地檔案。`); } catch (error) { setStatus((error as Error).message); setPanel('issues'); } };
  const importFile = async (selectedFile: File | undefined) => {
    if (!selectedFile) return; setBusy(true);
    try {
      if (selectedFile.size > 10 * 1024 * 1024) throw new Error('檔案超過 10 MB，請縮小描述檔後重試。');
      const imported = decode(await selectedFile.text());
      const target = imported.documentType === doc.documentType ? editor : companion;
      const apply = () => { onImport(imported); if (imported.documentType === doc.documentType) go(imported.rootGraphId); setStatus('已匯入文件，另一份文件保持原內容。'); };
      setModal({ title: `匯入 ${imported.documentType} 文件？`, text: `即將載入「${imported.project.name}」，只取代 ${imported.documentType}。${target.dirty ? '該文件有尚未輸出的變更，建議先匯出。' : ''}另一份文件不變；專案 ID 不符會提示對應無法核對。`, action: apply, label: '匯入專案' });
    } catch (error) { setStatus(`匯入失敗：${(error as Error).message} 原專案已保留。`); } finally { setBusy(false); if (file.current) file.current.value = ''; }
  };
  const path = [graph]; let cursor = graph;
  while (cursor.id !== doc.rootGraphId) { const parent = doc.graphs.find(g => g.nodes.some(n => n.childGraphId === cursor.id)); if (!parent) break; path.unshift(parent); cursor = parent; }
  const guardUnapplied = (event: SyntheticEvent) => { const pending = document.querySelector('[data-unapplied=true]'); if (pending && !pending.contains(event.target as Node)) { event.preventDefault(); event.stopPropagation(); setStatus('進階 Schema 尚未套用，請先套用或放棄變更。'); } };
  return <div className="app-shell" id={`${doc.documentType}-editor`} onClickCapture={guardUnapplied} onDoubleClickCapture={guardUnapplied}>
    <header><div className="brand"><span className="brand-icon">a</span><div><strong>AOV <span>Studio 1.1.4</span></strong><small>定義系統架構</small></div></div>
      <div className="mode-switch" aria-label="文件模式">{(['workflow', 'dataflow'] as const).map(type => <button key={type} aria-pressed={doc.documentType === type} onClick={() => onSwitch(type)}>{type === 'workflow' ? 'Workflow' : 'Dataflow'}</button>)}</div>
      <button className="project-title" onClick={() => { select(null); setPanel(panel === 'project' ? null : 'project'); }}>{doc.project.name} <span>⌄</span></button>
      <div className="header-actions"><button title={`切換${theme === 'light' ? '深色' : '淺色'}主題`} aria-label={`切換${theme === 'light' ? '深色' : '淺色'}主題`} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? '☾' : '☀'}</button>
        <details className="save-menu"><summary className="primary">儲存 ⌄</summary><div><button disabled={!editor.exists} onClick={() => { setFilename(doc.project.name); setSaveAs(true); }}>另存新檔</button><button disabled={!editor.exists} onClick={() => { if (editor.autosave) editor.save(); else setModal({ title: '重新啟用暫存？', text: '這將以目前文件取代原先無法讀取的草稿。', action: () => { editor.setAutosave(true); editor.save(); } }); }}>暫存畫布</button></div></details>
        <button disabled={busy} onClick={() => file.current?.click()}>{busy ? '讀取中…' : '匯入'}</button><button disabled={!editor.exists} onClick={() => exportFile(doc.project.name)}>匯出</button><button className="danger" disabled={!graph.nodes.length && !graph.edges.length} onClick={() => remove(true)}>清除</button>
      </div><input ref={file} hidden type="file" accept=".json,.aov.json,application/json" onChange={e => void importFile(e.target.files?.[0])} /></header>
    <div className="workspace-bar"><nav aria-label="畫布路徑">{path.map((g, i) => <span key={g.id}>{i > 0 && <span className="separator">/</span>}<button className={g.id === graph.id ? 'current' : ''} onClick={() => go(g.id)}>{g.name}</button></span>)}</nav><div><span className="draft-badge">{issues.length ? `草稿 · ${issues.length} 項待補` : '定義完整'}</span><button className="subtle" onClick={() => { select(null); setPanel(panel === 'issues' ? null : 'issues'); }}>檢查定義 ↗</button></div></div>
    {!editor.exists ? <main className="welcome"><h1>{workflow ? 'Workflow · 描述業務流程' : 'Dataflow · 定義工程細節'}</h1><p>此文件尚未建立。可獨立使用，或與另一份文件搭配。</p><button className="primary" onClick={() => { const next = emptyDocument(doc.documentType, companion.exists ? companion.doc.project.id : undefined); if (companion.exists) next.project = { ...companion.doc.project }; editor.replace(next); go(next.rootGraphId); }}>建立 {workflow ? 'Workflow' : 'Dataflow'} 文件</button><button onClick={() => file.current?.click()}>匯入現有文件</button></main> : <>
    {!workflow && graph.id === doc.rootGraphId && <div className="group-controls"><label>新增節點至<select value={addTo} onChange={e => setAddTo(e.target.value)}><option value="">獨立區域</option>{graph.nodes.filter(n => n.kind === 'group').map(n => <option key={n.id} value={n.childGraphId!}>{n.name}</option>)}</select></label>
      {companion.exists && companion.doc.project.id === doc.project.id && <><button onClick={() => update(d => { for (const step of companion.doc.graphs.flatMap(g => g.nodes)) addWorkflowGroup(d, companion.doc, step); })}>建立缺少的 Workflow 群組</button><button onClick={() => { update(d => syncWorkflowColors(d, companion.doc)); setStatus('已同步 Workflow 配色；僅修改 Dataflow。'); }}>同步 Workflow 配色</button></>}
      {references.length > 0 && <span role="status">{references[0].message}</span>}</div>}
    <main className="workspace"><section className="canvas-area" aria-label="AOV 編輯畫布">
      <Canvas key={graph.id} doc={doc} graphId={graph.id} selected={selected} theme={theme} select={id => { select(id); setPanel(null); }} update={update} connect={connect} openChild={openChild} instance={i => { instance.current = i; }} mode={mode} />
      <div className="canvas-caption"><span className="eyebrow">{workflow ? 'WORKFLOW' : mode === 'return' ? 'RETURN CONNECTION' : 'DATAFLOW'}</span><span>{displayedGraphs.reduce((count, g) => count + g.nodes.length, 0)} 節點／群組 · {displayedGraphs.reduce((count, g) => count + g.edges.length, 0)} 連線</span></div>
      <div className="toolbar" role="toolbar" aria-label="畫布工具">
        <Tool label={workflow ? '新增流程步驟' : '新增一般節點'} icon={workflow ? '▢' : 'ƒ'} onClick={() => addNode('node')} /><Tool label={workflow ? '新增等待彙整' : '新增緩衝節點'} icon="▤" onClick={() => addNode('buffer')} /><span className="tool-divider" />
        <Tool label={mode === 'forward' ? '切換返回線模式' : '切換正向線模式'} icon="⇠" active={mode === 'return'} onClick={() => setMode(mode === 'forward' ? 'return' : 'forward')} /><span className="tool-divider" />
        <Tool label="復原" icon="↶" disabled={!editor.canUndo} onClick={editor.undo} /><Tool label="重做" icon="↷" disabled={!editor.canRedo} onClick={editor.redo} /><Tool label="刪除選取項目" icon="⌫" disabled={!selected} onClick={() => remove(false)} /><Tool label="顯示完整畫布" icon="⛶" onClick={() => void instance.current?.fitView({ padding: 0.25, duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 250 })} />
      </div>
    </section>
    {(activeNode || activeEdge || panel) && <aside className="inspector" key={selected ?? panel}><button className="close-panel" aria-label="關閉設定面板" onClick={() => { select(null); setPanel(null); }}>×</button>
      {activeNode && (workflow ? <WorkflowInspector node={activeNode} update={updateNode} /> : <NodeInspector node={activeNode} update={updateNode} openChild={() => openChild(activeNode.id)} color={inheritedColor(doc, itemGraph.id, activeNode)} inherited={!!owningGroup(doc, itemGraph.id)} workflowSteps={companion.exists && companion.doc.project.id === doc.project.id ? companion.doc.graphs.flatMap(g => g.nodes) : []} />)}
      {activeEdge && <EdgeInspector edge={activeEdge} workflow={workflow} update={next => update(d => { const g = d.graphs.find(g => g.id === itemGraph.id)!; g.edges = g.edges.map(e => e.id === next.id ? next : e); })} />}
      {panel === 'project' && <><span className="eyebrow">PROJECT DEFINITION</span><h2>專案設定</h2><TextField label="專案名稱" required value={doc.project.name} onChange={name => update(d => { d.project.name = name; })} /><TextField label="系統目的與範圍" value={doc.project.description} multiline onChange={description => update(d => { d.project.description = description; })} /><TextField label="目前畫布名稱" value={graph.name} onChange={name => update(d => { d.graphs.find(g => g.id === graph.id)!.name = name; })} /><p className="note">本工具只定義架構，不實作或執行所描述的功能。</p><small>草稿儲存在此瀏覽器。本地 .aov.json 才是可攜的長期保存檔。</small>{graph.id !== doc.rootGraphId && <button onClick={() => update(d => syncBoundaries(d))}>重建／同步邊界入口出口</button>}</>}
      {panel === 'issues' && <><span className="eyebrow">DEFINITION REVIEW</span><h2>檢查定義</h2><p>{issues.length ? `${issues.length} 項描述尚待完成。可以匯出草稿。` : '定義欄位已完整；這不代表業務邏輯已驗證。'}</p>{issues.map((i, index) => <button className="issue" key={index} onClick={() => { if (i.graphId) setGraphId(i.graphId); if (i.itemId) { select(i.itemId); setPanel(null); } else setPanel('project'); }}>{i.message}<span>→</span></button>)}</>}
    </aside>}</main></>}
    <footer><span role="status" aria-live="polite">{editor.status}</span><span>{!editor.exists ? '尚未建立文件' : editor.dirty ? '尚有未輸出變更' : '已送出下載'} <span className="separator">·</span> 僅定義，不執行</span></footer>
    {modal && <Dialog title={modal.title} close={() => setModal(null)} confirm={() => { modal.action(); setModal(null); }} label={modal.label}><p>{modal.text}</p></Dialog>}
    {saveAs && <Dialog title="另存文件" close={() => setSaveAs(false)} confirm={() => { exportFile(filename); setSaveAs(false); }} label="下載此文件"><TextField label="檔案名稱" value={filename} onChange={setFilename} /><p>僅輸出目前 {doc.documentType} 文件與其布局，不包含另一份文件。</p></Dialog>}
  </div>;
}
function Tool({ label, icon, onClick, disabled = false, active = false }: { label: string; icon: string; onClick: () => void; disabled?: boolean; active?: boolean }) {
  return <button className={`tool ${active ? 'active' : ''}`} aria-label={label} aria-pressed={active} disabled={disabled} onClick={onClick}><span aria-hidden="true">{icon}</span><span className="tooltip">{label}</span></button>;
}
