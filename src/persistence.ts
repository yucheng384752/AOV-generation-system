import type { AovDocument } from './domain/types';
import { decode, encode } from './domain/validate';
export const DRAFT_KEY = 'aov-studio-draft-v1';
export const draftKey = (type: AovDocument['documentType']) => `aov-studio-${type}-v1.1`;
export function loadDraft(type: AovDocument['documentType'] = 'dataflow'): AovDocument | null {
  const text = localStorage.getItem(draftKey(type)) ?? (type === 'dataflow' ? localStorage.getItem(DRAFT_KEY) : null);
  const result = text ? decode(text) : null;
  if (result && result.documentType !== type) throw new Error('草稿種類不符');
  return result;
}
export function saveDraft(doc: AovDocument) { localStorage.setItem(draftKey(doc.documentType), encode(doc)); }
export function download(doc: AovDocument, name: string) {
  const content = encode(doc); const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `${name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') || 'project'}.${doc.documentType}.aov.json`;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
