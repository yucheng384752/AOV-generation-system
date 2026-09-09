import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyDocument, node, edge, addWorkflowGroup, inheritedColor, syncWorkflowColors, createChild, deleteItems } from '../src/domain/model';
import { encode, decode, structuralIssues } from '../src/domain/validate';
import { referenceIssues, newExternal } from '../src/domain/documents';
import { loadDraft, saveDraft, draftKey, DRAFT_KEY } from '../src/persistence';
function pair() {
  const workflow = emptyDocument('workflow'); const root = workflow.graphs[0]; const step = node('node', 'workflow');
  step.name = '入庫'; step.style.color = '#147d64'; root.nodes.push(step); workflow.layout[root.id].positions[step.id] = { x: 100, y: 100 };
  const dataflow = emptyDocument('dataflow', workflow.project.id);
  return { workflow, dataflow, step };
}
test('workflow file contains only business fields and round trips independently', () => {
  const { workflow, dataflow, step } = pair(); const before = encode(dataflow);
  step.business!.description = '收到貨物後登錄庫存';
  const wire = JSON.parse(encode(workflow)); const item = wire.graphs[0].nodes[0];
  for (const key of ['function', 'inputs', 'outputs', 'parameters', 'variables', 'external']) assert.ok(!(key in item));
  assert.equal(wire.documentType, 'workflow'); assert.equal(wire.schemaVersion, '1.1');
  assert.deepEqual(JSON.parse(encode(decode(JSON.stringify(wire)))), wire);
  assert.equal(encode(dataflow), before);
  item.function = {}; assert.throws(() => decode(JSON.stringify(wire)), /格式/);
});
test('workflow joins retain control semantics without technical port fields', () => {
  const { workflow, step } = pair(); const join = node('buffer', 'workflow'); const b = node('node', 'workflow'); const g = workflow.graphs[0];
  g.nodes.push(join, b); for (const n of [join, b]) workflow.layout[g.id].positions[n.id] = { x: 200, y: 100 };
  g.edges.push(edge(step, join), edge(b, join)); assert.deepEqual(structuralIssues(workflow), []);
  const wire = JSON.parse(encode(workflow)); assert.ok(!('mapping' in wire.graphs[0].edges[0]));
  assert.deepEqual(structuralIssues(decode(JSON.stringify(wire))), []);
});
test('group creation is idempotent and colors synchronize only on explicit request', () => {
  const { workflow, dataflow, step } = pair(); const id = addWorkflowGroup(dataflow, workflow, step);
  assert.equal(addWorkflowGroup(dataflow, workflow, step), id); assert.equal(dataflow.graphs[0].nodes.length, 1);
  const group = dataflow.graphs[0].nodes[0]; const child = dataflow.graphs.find(g => g.id === group.childGraphId)!;
  const fn = node(); child.nodes.push(fn); dataflow.layout[child.id].positions[fn.id] = { x: 300, y: 100 };
  createChild(dataflow, fn);
  assert.equal(inheritedColor(dataflow, child.id, fn), '#147d64');
  assert.equal(inheritedColor(dataflow, fn.childGraphId!, dataflow.graphs.at(-1)!.nodes[0]), '#147d64');
  step.style.color = '#aa2233'; assert.equal(group.style.color, '#147d64'); syncWorkflowColors(dataflow, workflow); assert.equal(group.style.color, '#aa2233');
  assert.deepEqual(structuralIssues(dataflow), []);
});
test('deleting workflow step leaves full dataflow and reports stale mapping', () => {
  const { workflow, dataflow, step } = pair(); addWorkflowGroup(dataflow, workflow, step); const before = encode(dataflow);
  deleteItems(workflow, workflow.rootGraphId, [step.id]); assert.equal(encode(dataflow), before);
  assert.match(referenceIssues(dataflow, workflow)[0].message, /不存在/); assert.deepEqual(structuralIssues(dataflow), []);
  assert.doesNotThrow(() => decode(encode(dataflow)));
});
test('external reference survives independent dataflow import without resolving URLs', () => {
  const { workflow, dataflow, step } = pair(); addWorkflowGroup(dataflow, workflow, step);
  const g = dataflow.graphs[1]; const item = node(); item.external = { ...newExternal(), name: '庫存 API', location: 'https://example.invalid', version: 'v2', method: 'POST', path: '/stock', usage: '引用庫存功能', credentialRef: 'inventory-token' };
  g.nodes.push(item); dataflow.layout[g.id].positions[item.id] = { x: 100, y: 100 };
  assert.deepEqual(decode(encode(dataflow)).graphs[1].nodes.at(-1)!.external, item.external);
});
test('1.0 migration preserves technical definitions and does not fabricate workflow', () => {
  const current = emptyDocument(); const g = current.graphs[0]; const item = node(); g.nodes.push(item); current.layout[g.id].positions[item.id] = { x: 100, y: 100 };
  const wire: any = JSON.parse(encode(current)); delete wire.documentType; wire.schemaVersion = '1.0';
  for (const n of wire.graphs[0].nodes) { delete n.style; delete n.workflowNodeId; delete n.external; }
  const restored = decode(JSON.stringify(wire)); assert.equal(restored.documentType, 'dataflow'); assert.equal(restored.schemaVersion, '1.1'); assert.deepEqual(restored.graphs[0].nodes[0].function, item.function); assert.equal(restored.project.id, current.project.id);
  wire.graphs[0].edges.push({ ...edge(item, item), target: 'missing' }); assert.throws(() => decode(JSON.stringify(wire)));
});
test('drafts are separate and loading legacy does not overwrite the original', () => {
  const values = new Map<string, string>(); const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v) } });
  try {
    const { workflow, dataflow } = pair(); saveDraft(workflow); const saved = values.get(draftKey('workflow')); saveDraft(dataflow); assert.equal(values.get(draftKey('workflow')), saved);
    assert.equal(loadDraft('workflow')?.documentType, 'workflow'); assert.equal(loadDraft('dataflow')?.documentType, 'dataflow');
    assert.ok(!values.has(DRAFT_KEY));
  } finally { if (original) Object.defineProperty(globalThis, 'localStorage', original); else Reflect.deleteProperty(globalThis, 'localStorage'); }
});
