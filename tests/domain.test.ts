import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyDocument, node, edge, createChild, deleteItems, syncBoundaries, port } from '../src/domain/model';
import { structuralIssues, completeness, encode, decode } from '../src/domain/validate';
function fixture() {
  const doc = emptyDocument(); const graph = doc.graphs[0]; const a = node(), b = node(), c = node('buffer');
  graph.nodes.push(a, b, c); for (const [index, item] of graph.nodes.entries()) doc.layout[graph.id].positions[item.id] = { x: index * 300, y: 100 };
  return { doc, graph, a, b, c };
}
test('JSON round trip preserves nested schemas and layout, recalculates draft status', () => {
  const { doc, a } = fixture(); a.inputs[0].schema = { type: 'object', properties: { items: { type: 'array', minItems: 1, items: { type: 'integer', minimum: 0 } } }, additionalProperties: false };
  const restored = decode(encode(doc)); assert.deepEqual(restored.graphs, doc.graphs); assert.deepEqual(restored.layout, doc.layout); assert.equal(restored.definition.status, 'draft'); assert.ok(restored.definition.issues.length);
});
test('reject forward cycles including self cycles, accept explicit return', () => {
  const { doc, graph, a, b } = fixture(); graph.edges.push(edge(a, b), edge(b, a)); assert.ok(structuralIssues(doc).some(i => i.message.includes('循環')));
  graph.edges[1].kind = 'return'; assert.deepEqual(structuralIssues(doc), []); assert.ok(completeness(doc).some(i => i.message.includes('返回原因')));
  graph.edges = [edge(a, a)]; assert.ok(structuralIssues(doc).some(i => i.message.includes('循環')));
});
test('single positive input and named buffer inputs, returns counted separately', () => {
  const { doc, graph, a, b, c } = fixture(); graph.edges.push(edge(a, b), edge(c, b)); assert.ok(structuralIssues(doc).some(i => i.message.includes('一條正向')));
  graph.edges[1].kind = 'return'; assert.deepEqual(structuralIssues(doc), []);
  c.inputs.push(port('second')); graph.edges = [edge(a, c), { ...edge(b, c), targetPort: c.inputs[1].id }]; assert.deepEqual(structuralIssues(doc), []);
});
test('invalid reference, duplicate ID, unsupported version, malformed input rejected', () => {
  const { doc, graph, a, b } = fixture(); graph.edges.push({ ...edge(a, b), target: 'missing' }); assert.throws(() => encode(doc));
  graph.edges = []; b.id = a.id; assert.throws(() => encode(doc)); assert.throws(() => decode('{bad')); assert.throws(() => decode('{"schemaVersion":"2"}'));
  assert.ok(structuralIssues({}).length);
});
test('child boundaries map parent ports, nested cascade deletion is recoverable by snapshot', () => {
  const { doc, graph, a } = fixture(); const id = createChild(doc, a); const child = doc.graphs.find(g => g.id === id)!;
  assert.equal(child.nodes.length, 2); assert.deepEqual(structuralIssues(doc), []);
  const inner = node(); child.nodes.push(inner); doc.layout[id].positions[inner.id] = { x: 300, y: 100 }; createChild(doc, inner);
  const snapshot = structuredClone(doc); assert.equal(deleteItems(doc, graph.id, [a.id]), 2); assert.equal(doc.graphs.length, 1); assert.deepEqual(structuralIssues(doc), []); assert.equal(snapshot.graphs.length, 3); assert.deepEqual(structuralIssues(snapshot), []);
});
test('clearing child keeps parent ownership and allows empty draft, sync restores explicit boundaries', () => {
  const { doc, a } = fixture(); const id = createChild(doc, a); const child = doc.graphs.find(g => g.id === id)!;
  deleteItems(doc, id, child.nodes.map(n => n.id)); assert.equal(a.childGraphId, id); assert.equal(child.nodes.length, 0); assert.deepEqual(structuralIssues(doc), []);
  assert.ok(completeness(doc).some(i => i.message.includes('缺少邊界'))); syncBoundaries(doc, a.id); assert.equal(child.nodes.length, 2);
  a.inputs[0].schema = { type: 'integer' }; syncBoundaries(doc, a.id); assert.deepEqual(child.nodes[0].outputs[0].schema, { type: 'integer' });
});
test('shared, orphan and cyclic child graphs rejected', () => {
  const { doc, a, b } = fixture(); const id = createChild(doc, a); b.childGraphId = id; assert.ok(structuralIssues(doc).some(i => i.message.includes('共用')));
  b.childGraphId = null; a.childGraphId = null; assert.ok(structuralIssues(doc).some(i => i.message.includes('沒有父')));
  a.childGraphId = doc.rootGraphId; assert.ok(structuralIssues(doc).some(i => i.message.includes('循環')));
});
test('loop completeness and schema grammar checked', () => {
  const { doc, graph, a, b } = fixture(); graph.edges.push(edge(a, b), edge(b, a, 'return')); graph.edges[1].loop.mode = 'until';
  assert.ok(completeness(doc).some(i => i.message.includes('停止條件'))); a.parameters = { type: 'invalid' }; assert.ok(structuralIssues(doc).some(i => i.message.includes('Schema')));
});
test('nonfinite coordinates, unsupported schema dialect and duplicate boundaries rejected', () => {
  const { doc, graph, a } = fixture(); doc.layout[graph.id].positions[a.id].x = Infinity; assert.ok(structuralIssues(doc).length);
  doc.layout[graph.id].positions[a.id].x = 0; a.parameters = { $schema: 'https://unknown.invalid/schema' }; assert.ok(structuralIssues(doc).some(i => i.message.includes('不支援')));
  a.parameters = {}; const id = createChild(doc, a); const child = doc.graphs.find(g => g.id === id)!;
  const duplicate = { ...structuredClone(child.nodes[0]), id: 'duplicate-boundary' }; child.nodes.push(duplicate); doc.layout[id].positions[duplicate.id] = { x: 0, y: 0 };
  assert.ok(structuralIssues(doc).some(i => i.message.includes('重複邊界')));
});
