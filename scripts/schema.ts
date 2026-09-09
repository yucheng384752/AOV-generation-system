import { mkdirSync, writeFileSync } from 'node:fs';
import { documentSchema, dataflowSchema, workflowSchema } from '../src/domain/schema';
import { emptyDocument, node, edge, createChild, addWorkflowGroup } from '../src/domain/model';
import { newExternal } from '../src/domain/documents';
import { encode } from '../src/domain/validate';
mkdirSync('public', { recursive: true });
writeFileSync('public/aov.schema.json', JSON.stringify(documentSchema, null, 2));
writeFileSync('public/workflow.schema.json', JSON.stringify(workflowSchema, null, 2));
writeFileSync('public/dataflow.schema.json', JSON.stringify(dataflowSchema, null, 2));
const doc = emptyDocument(); doc.project.name = '訂單處理示例'; doc.project.description = '描述訂單檢查與需補正時的返回流程；不執行業務功能。';
const graph = doc.graphs[0]; const a = node(), b = node(); a.name = '接收訂單'; b.name = '驗證訂單';
for (const [index, n] of [a, b].entries()) {
  n.function = { purpose: n.name, preconditions: '收到訂單資料', steps: '讀取訂單\n檢查必要欄位\n輸出結果', rules: '商品數量必須大於零', postconditions: '輸出訂單與檢查結果', errors: '資料不完整時返回接收步驟' };
  for (const p of [...n.inputs, ...n.outputs]) { p.description = '訂單資料'; p.condition = '收到資料後'; p.schema = { type: 'object', properties: { orderId: { type: 'string', description: '訂單識別碼', minLength: 1 }, quantity: { type: 'integer', minimum: 1 } }, required: ['orderId', 'quantity'] }; }
  graph.nodes.push(n); doc.layout[graph.id].positions[n.id] = { x: 160 + index * 420, y: 200 };
}
const forward = edge(a, b); forward.name = '提交檢查'; forward.condition = '訂單已接收'; forward.mapping = '完整訂單物件原樣傳遞';
const back = edge(b, a, 'return'); back.name = '補正資料'; back.reason = '訂單資料缺漏'; back.condition = '必要欄位不存在'; back.mapping = '傳回原訂單與缺漏欄位說明'; back.loop = { mode: 'until', maxIterations: 3, stopCondition: '必要欄位完整', onLimit: '交由人工處理' }; graph.edges.push(forward, back);
createChild(doc, b);
writeFileSync('public/example.aov.json', encode(doc));
const workflow = emptyDocument('workflow', 'example-project-11'); workflow.project.name = '工單與入庫'; workflow.project.description = '面向業務人員的作業流程';
const wf = workflow.graphs[0];
for (const [i, name] of ['開工單', '入庫', '等待檢驗'].entries()) {
  const item = node('node', 'workflow'); item.id = `step-${i}`; item.name = name; item.style.color = ['#4364d9', '#147d64', '#b66b22'][i];
  item.business = { description: `${name}的作業說明`, role: '現場人員', start: '前一步完成', completion: '作業記錄完成', exceptions: '通知負責人確認' };
  wf.nodes.push(item); workflow.layout[wf.id].positions[item.id] = { x: 80 + i * 360, y: 160 };
  if (i) { const connection = edge(wf.nodes[i - 1], item); connection.condition = '前一步完成'; wf.edges.push(connection); }
}
const dataflow = emptyDocument('dataflow', workflow.project.id); dataflow.project = { ...workflow.project, description: '面向工程師與 Agent 的實作契約' };
for (const step of wf.nodes) {
  const id = addWorkflowGroup(dataflow, workflow, step); const group = dataflow.graphs[0].nodes.find(n => n.id === id)!; const detail = dataflow.graphs.find(g => g.id === group.childGraphId)!;
  const item = node(); item.name = `${step.name}資料處理`; item.function.purpose = `定義${step.name}的資料轉換`;
  if (step.name === '入庫') item.external = { ...newExternal(), name: '外部庫存服務', location: 'https://example.invalid/inventory', version: 'v1', usage: '庫存異動介面契約', method: 'POST', path: '/stock' };
  detail.nodes.push(item); dataflow.layout[detail.id].positions[item.id] = { x: 390, y: 160 };
  detail.edges.push(edge(detail.nodes[0], item), edge(item, detail.nodes[1]));
}
writeFileSync('public/example.workflow.aov.json', encode(workflow));
writeFileSync('public/example.dataflow.aov.json', encode(dataflow));
