import type { AovDocument, AovNode, AovEdge, Port, Graph } from './types';
export const uid = () => crypto.randomUUID();
export const emptySchema = () => ({ type: 'object', properties: {}, required: [] });
export const port = (name = '資料'): Port => ({ id: uid(), name, description: '', condition: '', schema: emptySchema() });
export function node(kind: AovNode['kind'] = 'node', documentType: AovDocument['documentType'] = 'dataflow'): AovNode {
  return { id: uid(), kind, name: kind === 'buffer' ? '緩衝節點' : '一般節點',
    function: { purpose: '', preconditions: '', steps: '', rules: '', postconditions: '', errors: '' },
    inputs: [port('輸入')], outputs: [port('輸出')], parameters: emptySchema(), variables: emptySchema(),
    buffer: { mode: 'all', rules: '' }, childGraphId: null, boundaryPortId: null,
    style: { color: '#4364d9' }, workflowNodeId: null, external: null,
    ...(documentType === 'workflow' ? { name: kind === 'buffer' ? '等待彙整' : '新步驟', business: { description: '', role: '', start: '', completion: '', exceptions: '' }, inputs: [{ ...port('輸入'), id: 'in' }], outputs: [{ ...port('輸出'), id: 'out' }] } : {}) };
}
export function emptyDocument(documentType: AovDocument['documentType'] = 'dataflow', projectId: string = uid()): AovDocument {
  const id = uid();
  return { format: 'aov', schemaVersion: '1.1', documentType, project: { id: projectId, name: '未命名專案', description: '' },
    rootGraphId: id, graphs: [{ id, name: '主流程', nodes: [], edges: [] }],
    layout: { [id]: { positions: {}, viewport: { x: 0, y: 0, zoom: 1 } } }, definition: { status: 'draft', issues: [] } };
}
export function addWorkflowGroup(doc: AovDocument, workflow: AovDocument, step: AovNode) {
  if (doc.documentType !== 'dataflow' || workflow.documentType !== 'workflow' || doc.project.id !== workflow.project.id) throw new Error('請載入相同專案的 Workflow 與 Dataflow');
  const existing = doc.graphs.flatMap(g => g.nodes).find(n => n.workflowNodeId === step.id);
  if (existing) return existing.id;
  const group = node('group'); group.name = step.name; group.workflowNodeId = step.id; group.style = { ...step.style };
  const root = doc.graphs.find(g => g.id === doc.rootGraphId)!;
  doc.layout[root.id].positions[group.id] = { x: (root.nodes.filter(n => n.kind === 'group').length % 2) * 1100, y: Math.floor(root.nodes.filter(n => n.kind === 'group').length / 2) * 700 };
  root.nodes.push(group); createChild(doc, group); return group.id;
}
export function inheritedColor(doc: AovDocument, graphId: string, item: AovNode): string {
  return owningGroup(doc, graphId)?.style.color ?? item.style.color;
}
export function owningGroup(doc: AovDocument, graphId: string): AovNode | undefined {
  let current = graphId;
  while (current !== doc.rootGraphId) {
    const ownerGraph = doc.graphs.find(g => g.nodes.some(n => n.childGraphId === current));
    const owner = ownerGraph?.nodes.find(n => n.childGraphId === current);
    if (!owner || !ownerGraph) break;
    if (owner.kind === 'group') return owner;
    current = ownerGraph.id;
  }
  return undefined;
}
export function syncWorkflowColors(doc: AovDocument, workflow: AovDocument) {
  if (doc.project.id !== workflow.project.id) throw new Error('專案 ID 不一致，無法同步配色');
  const steps = new Map(workflow.graphs.flatMap(g => g.nodes).map(n => [n.id, n]));
  for (const n of doc.graphs.flatMap(g => g.nodes)) if (n.kind === 'group' && n.workflowNodeId && steps.has(n.workflowNodeId)) n.style.color = steps.get(n.workflowNodeId)!.style.color;
}
export function edge(source: AovNode, target: AovNode, kind: AovEdge['kind'] = 'forward'): AovEdge {
  return { id: uid(), kind, source: source.id, sourcePort: source.outputs[0].id, target: target.id, targetPort: target.inputs[0].id,
    name: '', condition: '', mapping: '', reason: '', loop: { mode: 'once', maxIterations: null, stopCondition: '', onLimit: '' } };
}
export function createChild(doc: AovDocument, parent: AovNode): string {
  if (parent.childGraphId) return parent.childGraphId;
  const id = uid(); parent.childGraphId = id;
  doc.graphs.push({ id, name: parent.name, nodes: [], edges: [] });
  doc.layout[id] = { positions: {}, viewport: { x: 0, y: 0, zoom: 1 } };
  syncBoundaries(doc); return id;
}
// Boundary contracts are derived from their owner's stable port IDs, never copied as independent contracts.
export function syncBoundaries(doc: AovDocument, ownerId?: string) {
  for (const graph of doc.graphs) for (const parent of graph.nodes) {
    if (ownerId && parent.id !== ownerId) continue;
    const child = doc.graphs.find(g => g.id === parent.childGraphId); if (!child) continue;
    const specifications = [...parent.inputs.map(p => ({ p, kind: 'entry' as const })), ...parent.outputs.map(p => ({ p, kind: 'exit' as const }))];
    const old = child.nodes.filter(n => n.kind === 'entry' || n.kind === 'exit');
    const keep = child.nodes.filter(n => n.kind !== 'entry' && n.kind !== 'exit');
    const boundaries = specifications.map(({ p, kind }, index) => {
      const item = old.find(n => n.kind === kind && n.boundaryPortId === p.id) ?? node(kind);
      item.name = `${kind === 'entry' ? '入口' : '出口'} · ${p.name}`; item.boundaryPortId = p.id;
      item.inputs = kind === 'exit' ? [structuredClone(p)] : []; item.outputs = kind === 'entry' ? [structuredClone(p)] : [];
      doc.layout[child.id].positions[item.id] ??= { x: kind === 'entry' ? 60 : 740, y: 100 + index * 160 };
      return item;
    });
    child.nodes = [...boundaries, ...keep];
    pruneEdges(child);
    const ids = new Set(child.nodes.map(n => n.id));
    for (const key of Object.keys(doc.layout[child.id].positions)) if (!ids.has(key)) delete doc.layout[child.id].positions[key];
  }
}
export function pruneEdges(graph: Graph) {
  graph.edges = graph.edges.filter(e => graph.nodes.some(n => n.id === e.source && n.outputs.some(p => p.id === e.sourcePort)) && graph.nodes.some(n => n.id === e.target && n.inputs.some(p => p.id === e.targetPort)));
}
export function deleteItems(doc: AovDocument, graphId: string, ids: string[]) {
  const graph = doc.graphs.find(g => g.id === graphId)!;
  const descendants = new Set<string>(); const pending = graph.nodes.filter(n => ids.includes(n.id)).flatMap(n => n.childGraphId ? [n.childGraphId] : []);
  while (pending.length) { const id = pending.pop()!; if (descendants.has(id)) continue; descendants.add(id); pending.push(...doc.graphs.find(g => g.id === id)!.nodes.flatMap(n => n.childGraphId ? [n.childGraphId] : [])); }
  graph.nodes = graph.nodes.filter(n => !ids.includes(n.id)); graph.edges = graph.edges.filter(e => !ids.includes(e.id)); pruneEdges(graph);
  doc.graphs = doc.graphs.filter(g => !descendants.has(g.id));
  for (const id of descendants) delete doc.layout[id];
  for (const id of ids) delete doc.layout[graphId].positions[id];
  return descendants.size;
}
