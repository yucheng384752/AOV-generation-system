import { useEffect, useMemo, useState } from 'react';
import { ReactFlow, Background, Controls, MiniMap, Handle, Position, MarkerType, BaseEdge, EdgeLabelRenderer, useUpdateNodeInternals, applyNodeChanges, type EdgeProps, type NodeProps, type Node, type Connection, type ReactFlowInstance } from '@xyflow/react';
import type { AovDocument, AovNode, AovEdge } from '../domain/types';
import { inheritedColor } from '../domain/model';
import type { CSSProperties } from 'react';
import '@xyflow/react/dist/style.css';
type FlowNode = Node<{ item: AovNode; workflow: boolean; color: string; count?: number }, 'aov'>;
function Card({ id, data, selected }: NodeProps<FlowNode>) {
  const n = data.item; const update = useUpdateNodeInternals();
  useEffect(() => update(id), [id, n.inputs.length, n.outputs.length, update]);
  const labels = { node: 'FUNCTION', buffer: 'BUFFER', entry: 'INPUT BOUNDARY', exit: 'OUTPUT BOUNDARY', group: 'WORKFLOW GROUP' };
  const style = { '--node-color': data.color } as CSSProperties;
  if (n.kind === 'group') return <div className={`workflow-group ${selected ? 'selected' : ''}`} style={style}><strong>{n.name}</strong><small>{data.count ? `${data.count} 個工程細項` : '尚未定義 Dataflow · 從「新增節點至」選擇此群組'}</small>
    {n.inputs.map((p, i) => <Handle key={p.id} type="target" position={Position.Left} id={p.id} style={{ top: 36 + i * 24 }} title={`群組入口：${p.name}`} />)}
    {n.outputs.map((p, i) => <Handle key={p.id} type="source" position={Position.Right} id={p.id} style={{ top: 36 + i * 24 }} title={`群組出口：${p.name}`} />)}
  </div>;
  return <div className={`node-card ${n.kind} ${selected ? 'selected' : ''}`} style={style}>
    <div className="node-top"><span className="node-symbol">{data.workflow ? '▢' : n.kind === 'buffer' ? '▤' : n.kind === 'node' ? 'ƒ' : '⇥'}</span><span>{data.workflow ? (n.kind === 'buffer' ? '等待彙整' : '流程步驟') : labels[n.kind]}</span>{n.external && <span className="external-badge">↗ 外部引用</span>}{n.childGraphId && <span className="child-badge">子 AOV ↗</span>}</div>
    <strong>{n.name || '未命名節點'}</strong><p>{data.workflow ? (n.business?.description || '點選以描述此步驟') : n.function.purpose || (n.kind === 'entry' || n.kind === 'exit' ? '父節點資料契約' : '點選以定義此功能')}</p>
    <div className="port-rows">{Array.from({ length: Math.max(n.inputs.length, n.outputs.length) }, (_, index) => <div className="port-row" key={index}>
      <span>{n.inputs[index] && <><Handle type="target" position={Position.Left} id={n.inputs[index].id} /><span>{n.inputs[index].name}</span></>}</span>
      <span>{n.outputs[index] && <><span>{n.outputs[index].name}</span><Handle type="source" position={Position.Right} id={n.outputs[index].id} /></>}</span>
    </div>)}</div>
  </div>;
}
const nodeTypes = { aov: Card };
function ReturnEdge({ id, sourceX, sourceY, targetX, targetY, markerEnd, style, label }: EdgeProps) {
  const y = Math.max(sourceY, targetY) + 88;
  const path = `M ${sourceX} ${sourceY} C ${sourceX + 48} ${sourceY}, ${sourceX + 48} ${y}, ${sourceX} ${y} L ${targetX} ${y} C ${targetX - 48} ${y}, ${targetX - 48} ${targetY}, ${targetX} ${targetY}`;
  return <><BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} /><EdgeLabelRenderer><span className="return-label" style={{ transform: `translate(-50%, -50%) translate(${(sourceX + targetX) / 2}px,${y}px)` }}>{label}</span></EdgeLabelRenderer></>;
}
const edgeTypes = { return: ReturnEdge };
type Props = { doc: AovDocument; graphId: string; selected: string | null; theme: 'light' | 'dark'; select: (id: string | null) => void; update: (fn: (d: AovDocument) => void, remember?: boolean) => boolean; connect: (c: Connection) => void; openChild: (id: string) => void; instance: (i: ReactFlowInstance<FlowNode>) => void; mode: AovEdge['kind'] };
export default function Canvas(props: Props) {
  const { doc, graphId, selected, update } = props; const graph = doc.graphs.find(g => g.id === graphId)!;
  const expanded = graph.id === doc.rootGraphId ? graph.nodes.filter(n => n.kind === 'group') : [];
  const visibleGraphs = [graph, ...expanded.flatMap(n => doc.graphs.filter(g => g.id === n.childGraphId))];
  const mapped = useMemo<FlowNode[]>(() => {
    const make = (n: AovNode, id: string): FlowNode => ({ id: n.id, type: 'aov', position: doc.layout[id].positions[n.id], data: { item: n, workflow: doc.documentType === 'workflow', color: inheritedColor(doc, id, n) }, selected: n.id === selected });
    const roots = graph.nodes.map(n => {
      const result = make(n, graph.id);
      if (n.kind === 'group' && n.childGraphId) {
        const child = doc.graphs.find(g => g.id === n.childGraphId)!; const positions = Object.values(doc.layout[child.id].positions);
        result.style = { width: Math.max(1050, ...positions.map(p => p.x + 310)), height: Math.max(560, ...positions.map(p => p.y + 310)) };
        result.data.count = child.nodes.filter(n => n.kind !== 'entry' && n.kind !== 'exit').length;
      }
      return result;
    });
    const children = expanded.flatMap(parent => doc.graphs.find(g => g.id === parent.childGraphId)!.nodes.map(n => {
      const item = make(n, parent.childGraphId!); return { ...item, parentId: parent.id, extent: 'parent' as const, position: { x: item.position.x, y: item.position.y + 80 } };
    }));
    return [...roots, ...children];
  }, [doc, graphId, selected]);
  const [nodes, setNodes] = useState<FlowNode[]>(mapped); useEffect(() => setNodes(mapped), [mapped]);
  const edges = visibleGraphs.flatMap(g => g.edges).map(e => ({ id: e.id, type: e.kind === 'return' ? 'return' : 'default', source: e.source, target: e.target, sourceHandle: e.sourcePort, targetHandle: e.targetPort, selected: e.id === selected, label: e.name || (e.kind === 'return' ? '返回' : ''), style: { stroke: e.kind === 'return' ? 'var(--return)' : 'var(--edge)', strokeWidth: 2, strokeDasharray: e.kind === 'return' ? '7 5' : undefined }, markerEnd: { type: MarkerType.ArrowClosed, color: e.kind === 'return' ? 'var(--return)' : 'var(--edge)' } }));
  return <div className="canvas-transition" key={graphId}><ReactFlow<FlowNode>
    nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} colorMode={props.theme} defaultViewport={doc.layout[graphId].viewport}
    minZoom={0.1} maxZoom={4} onInit={props.instance} onNodesChange={changes => setNodes(n => applyNodeChanges(changes.filter(c => c.type !== 'remove'), n))}
    onNodeDragStop={(_, n) => update(d => { const owner = d.graphs.find(g => g.nodes.some(item => item.id === n.id))!; d.layout[owner.id].positions[n.id] = { x: Math.max(0, n.position.x), y: Math.max(0, n.position.y - (n.parentId ? 80 : 0)) }; })}
    onMoveEnd={(_, viewport) => update(d => { d.layout[graphId].viewport = viewport; }, false)}
    onConnect={props.connect} onNodeClick={(_, n) => props.select(n.id)} onEdgeClick={(_, e) => props.select(e.id)} onPaneClick={() => props.select(null)}
    onNodeDoubleClick={(_, n) => props.openChild(n.id)} deleteKeyCode={null} onEdgesChange={() => {}} connectionLineStyle={{ strokeDasharray: props.mode === 'return' ? '7 5' : undefined }}>
    <Background gap={24} size={1} /><Controls showInteractive={false} /><MiniMap pannable zoomable nodeColor="var(--primary)" />
  </ReactFlow>{!nodes.length && <div className="empty-canvas"><div className="empty-icon">◇</div><h2>從一個功能開始</h2><p>使用下方工具新增節點，再從輸出端拖曳箭頭連接。</p><span>你的架構，從這裡逐步清晰。</span></div>}</div>;
}
