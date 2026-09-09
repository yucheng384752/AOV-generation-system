import { useEffect, useRef, type ReactNode } from 'react';
export default function Dialog({ title, children, close, confirm, label = '確認操作' }: { title: string; children: ReactNode; close: () => void; confirm: () => void; label?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const previous = document.activeElement as HTMLElement; ref.current?.showModal(); return () => { previous?.focus(); }; }, []);
  return <dialog ref={ref} onCancel={e => { e.preventDefault(); close(); }} aria-labelledby="dialog-title"><h2 id="dialog-title">{title}</h2><div>{children}</div><div className="dialog-actions"><button autoFocus onClick={close}>取消</button><button className="primary" onClick={confirm}>{label}</button></div></dialog>;
}
