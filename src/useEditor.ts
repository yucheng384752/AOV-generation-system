import { useCallback, useEffect, useRef, useState } from 'react';
import type { AovDocument } from './domain/types';
import { emptyDocument } from './domain/model';
import { loadDraft, saveDraft } from './persistence';
import { structuralIssues } from './domain/validate';
export function useEditor(type: AovDocument['documentType'] = 'dataflow') {
  const [initial] = useState(() => { try { const loaded = loadDraft(type); return { doc: loaded ?? emptyDocument(type), exists: !!loaded, error: '' }; } catch { return { doc: emptyDocument(type), exists: false, error: '草稿無法讀取。已保留原暫存，請先匯出目前工作，再選擇重新啟用暫存。' }; } });
  const [exists, setExists] = useState(initial.exists);
  const [doc, setDoc] = useState(initial.doc); const current = useRef(doc); current.current = doc;
  const [status, setStatus] = useState(initial.error || (initial.exists ? '草稿已就緒' : '尚未建立此文件')); const [autosave, setAutosave] = useState(!initial.error);
  const [history, setHistory] = useState<AovDocument[]>([]); const [future, setFuture] = useState<AovDocument[]>([]);
  const [exported, setExported] = useState('');
  const update = useCallback((change: (draft: AovDocument) => void, remember = true) => {
    const previous = current.current; const next = structuredClone(previous); change(next);
    const errors = structuralIssues(next); if (errors.length) { setStatus(`無法套用：${errors[0].message}`); return false; }
    // ponytail: 50 full-document snapshots; use operation patches if large graphs exceed memory needs.
    if (remember) { setHistory(h => [...h.slice(-49), previous]); setFuture([]); }
    current.current = next; setDoc(next); setExists(true); return true;
  }, []);
  const replace = (next: AovDocument) => { if (next.documentType !== type) throw new Error('文件種類不符'); setHistory(h => [...h.slice(-49), current.current]); setFuture([]); current.current = next; setDoc(next); setExists(true); };
  const undo = () => { const previous = history.at(-1); if (!previous) return; setFuture(f => [...f, current.current]); setHistory(h => h.slice(0, -1)); current.current = previous; setDoc(previous); setStatus('已復原'); };
  const redo = () => { const next = future.at(-1); if (!next) return; setHistory(h => [...h, current.current]); setFuture(f => f.slice(0, -1)); current.current = next; setDoc(next); setStatus('已重做'); };
  const save = useCallback(() => { try { saveDraft(current.current); setStatus(`已暫存於此瀏覽器 · ${new Date().toLocaleTimeString()}`); return true; } catch { setStatus('暫存失敗：儲存空間不足或被瀏覽器阻擋，請匯出本地檔案保存。'); return false; } }, []);
  useEffect(() => { if (!autosave || !exists) return; const timer = setTimeout(save, 700); return () => clearTimeout(timer); }, [doc, autosave, save, exists]);
  useEffect(() => {
    const flush = () => { if (autosave && exists) save(); };
    const leave = (event: BeforeUnloadEvent) => { flush(); if ((exists && JSON.stringify(current.current) !== exported) || document.querySelector('[data-unapplied=true]')) { event.preventDefault(); event.returnValue = ''; } };
    const hidden = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('beforeunload', leave); document.addEventListener('visibilitychange', hidden);
    return () => { window.removeEventListener('beforeunload', leave); document.removeEventListener('visibilitychange', hidden); };
  }, [autosave, exported, save, exists]);
  return { doc, exists, update, replace, undo, redo, canUndo: !!history.length, canRedo: !!future.length, status, setStatus, save, autosave, setAutosave, dirty: exists && JSON.stringify(doc) !== exported, markExported: () => setExported(JSON.stringify(current.current)) };
}
export type Editor = ReturnType<typeof useEditor>;
