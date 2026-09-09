export type Schema = boolean | { [key: string]: any };
export type Port = { id: string; name: string; description: string; condition: string; schema: Schema };
export type AovNode = {
  id: string; kind: 'node' | 'buffer' | 'entry' | 'exit' | 'group'; name: string;
  function: { purpose: string; preconditions: string; steps: string; rules: string; postconditions: string; errors: string };
  inputs: Port[]; outputs: Port[]; parameters: Schema; variables: Schema;
  buffer: { mode: 'all' | 'any' | 'latest' | 'storage'; rules: string };
  childGraphId: string | null; boundaryPortId: string | null;
  style: { color: string }; workflowNodeId: string | null;
  business?: { description: string; role: string; start: string; completion: string; exceptions: string };
  external: null | { category: 'api' | 'package' | 'project' | 'document'; name: string; provider: string; location: string; version: string; usage: string; method: string; path: string; symbol: string; license: string; authentication: string; credentialRef: string; limits: string };
};
export type AovEdge = {
  id: string; kind: 'forward' | 'return'; source: string; sourcePort: string; target: string; targetPort: string;
  name: string; condition: string; mapping: string; reason: string;
  loop: { mode: 'once' | 'fixed' | 'until'; maxIterations: number | null; stopCondition: string; onLimit: string };
};
export type Graph = { id: string; name: string; nodes: AovNode[]; edges: AovEdge[] };
export type Position = { x: number; y: number };
export type AovDocument = {
  format: 'aov'; schemaVersion: '1.1'; documentType: 'workflow' | 'dataflow';
  project: { id: string; name: string; description: string };
  rootGraphId: string; graphs: Graph[];
  layout: { [graphId: string]: { positions: { [nodeId: string]: Position }; viewport: Position & { zoom: number } } };
  definition: { status: 'draft' | 'complete'; issues: string[] };
};
export type Issue = { message: string; graphId?: string; itemId?: string };
