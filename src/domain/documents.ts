import type { AovDocument, AovNode, Issue } from './types';
import { node } from './model';

// Canvas adapters are internal. Workflow files never contain technical node contracts.
export function toFile(doc: AovDocument): unknown {
  if (doc.documentType === 'dataflow') return doc;
  return { ...doc, graphs: doc.graphs.map(g => ({ ...g,
    nodes: g.nodes.map(n => ({ id: n.id, kind: n.kind, name: n.name, style: n.style, business: n.business })),
    edges: g.edges.map(e => ({ id: e.id, kind: e.kind, source: e.source, target: e.target, name: e.name, condition: e.condition, reason: e.reason, loop: e.loop })),
  })) };
}
export function fromFile(value: any): AovDocument {
  if (value.documentType !== 'workflow') return value;
  return { ...value, graphs: value.graphs.map((g: any) => ({ ...g,
    nodes: g.nodes.map((n: any) => ({ ...node(n.kind, 'workflow'), ...n })),
    edges: g.edges.map((e: any) => ({ ...e, sourcePort: 'out', targetPort: 'in', mapping: '' })),
  })) };
}
export function migrateLegacy(value: any): AovDocument {
  return { ...value, schemaVersion: '1.1', documentType: 'dataflow', graphs: value.graphs.map((g: any) => ({ ...g, nodes: g.nodes.map((n: any) => ({ ...n, style: { color: '#4364d9' }, workflowNodeId: null, external: null })) })) };
}
export function referenceIssues(dataflow: AovDocument, workflow?: AovDocument): Issue[] {
  const groups = dataflow.graphs.flatMap(g => g.nodes.filter(n => n.workflowNodeId).map(n => ({ graphId: g.id, node: n })));
  if (!groups.length) return [];
  if (!workflow || dataflow.project.id !== workflow.project.id) return [{ message: '未載入相同專案的 Workflow，跨文件對應尚未核對；Dataflow 可獨立使用。' }];
  const ids = new Set(workflow.graphs.flatMap(g => g.nodes.map(n => n.id)));
  return groups.filter(({ node }) => !ids.has(node.workflowNodeId!)).map(({ graphId, node }) => ({ graphId, itemId: node.id, message: `${node.name}：對應的 Workflow 步驟不存在，原 Dataflow 已保留。` }));
}
export function newExternal(): NonNullable<AovNode['external']> {
  return { category: 'api', name: '', provider: '', location: '', version: '', usage: '', method: '', path: '', symbol: '', license: '', authentication: '', credentialRef: '', limits: '' };
}
