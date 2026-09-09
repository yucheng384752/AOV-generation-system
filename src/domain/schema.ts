const text = { type: 'string' };
const id = { type: 'string', minLength: 1, pattern: '^[a-zA-Z0-9_-]+$' };
const nullableId = { anyOf: [id, { type: 'null' }] };
const object = (properties: Record<string, unknown>) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const array = (items: unknown) => ({ type: 'array', items });
const enumeration = (...values: string[]) => ({ enum: values });
const schema = { anyOf: [{ type: 'boolean' }, { type: 'object' }] };
const port = object({ id, name: text, description: text, condition: text, schema });
const position = object({ x: { type: 'number' }, y: { type: 'number' } });
export const legacyDocumentSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'urn:aov:schema:1.0', title: 'AOV architecture document 1.0',
  ...object({
    format: { const: 'aov' }, schemaVersion: { const: '1.0' },
    project: object({ id, name: text, description: text }), rootGraphId: id,
    graphs: array(object({ id, name: text,
      nodes: array(object({ id, kind: enumeration('node', 'buffer', 'entry', 'exit'), name: text,
        function: object({ purpose: text, preconditions: text, steps: text, rules: text, postconditions: text, errors: text }),
        inputs: array(port), outputs: array(port), parameters: schema, variables: schema,
        buffer: object({ mode: enumeration('all', 'any', 'latest', 'storage'), rules: text }),
        childGraphId: nullableId, boundaryPortId: nullableId,
      })),
      edges: array(object({ id, kind: enumeration('forward', 'return'), source: id, sourcePort: id, target: id, targetPort: id,
        name: text, condition: text, mapping: text, reason: text,
        loop: object({ mode: enumeration('once', 'fixed', 'until'), maxIterations: { anyOf: [{ type: 'integer', minimum: 1 }, { type: 'null' }] }, stopCondition: text, onLimit: text }),
      })),
    })),
    layout: { type: 'object', additionalProperties: object({ positions: { type: 'object', additionalProperties: position }, viewport: object({ x: { type: 'number' }, y: { type: 'number' }, zoom: { type: 'number', minimum: 0.1, maximum: 4 } }) }) },
    definition: object({ status: enumeration('draft', 'complete'), issues: array(text) }),
  }),
};
const color = object({ color: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' } });
const external = { anyOf: [{ type: 'null' }, object({ category: enumeration('api', 'package', 'project', 'document'), name: text, provider: text, location: text, version: text, usage: text, method: text, path: text, symbol: text, license: text, authentication: text, credentialRef: text, limits: text })] };
const legacyProperties = (legacyDocumentSchema as any).properties;
const legacyGraph = legacyProperties.graphs.items;
const legacyNode = legacyGraph.properties.nodes.items;
export const dataflowSchema = {
  ...legacyDocumentSchema, $id: 'urn:aov:dataflow:1.1', title: 'AOV Dataflow 1.1',
  ...object({ ...legacyProperties, schemaVersion: { const: '1.1' }, documentType: { const: 'dataflow' },
    graphs: array(object({ ...legacyGraph.properties, nodes: array(object({ ...legacyNode.properties, kind: enumeration('node', 'buffer', 'entry', 'exit', 'group'), style: color, workflowNodeId: nullableId, external })) })) }),
};
export const workflowSchema = {
  ...legacyDocumentSchema, $id: 'urn:aov:workflow:1.1', title: 'AOV Workflow 1.1',
  ...object({ ...legacyProperties, schemaVersion: { const: '1.1' }, documentType: { const: 'workflow' },
    graphs: array(object({ id, name: text,
      nodes: array(object({ id, kind: enumeration('node', 'buffer'), name: text, style: color,
        business: object({ description: text, role: text, start: text, completion: text, exceptions: text }) })),
      edges: array(object({ id, kind: enumeration('forward', 'return'), source: id, target: id, name: text, condition: text, reason: text, loop: legacyGraph.properties.edges.items.properties.loop })),
    })) }),
};
export const documentSchema = { $schema: legacyDocumentSchema.$schema, $id: 'urn:aov:schema:1.1', oneOf: [dataflowSchema, workflowSchema] };
