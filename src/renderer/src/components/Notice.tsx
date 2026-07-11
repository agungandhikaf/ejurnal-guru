import { AlertCircle, CheckCircle2, X } from 'lucide-react'

interface Props {
  message: string
  type?: 'success' | 'error'
  onClose?: () => void
}

export default function Notice({ message, type = 'success', onClose }: Props): JSX.Element {
  const success = type === 'success'
  return (
    <div className={`fixed right-6 top-6 z-[80] flex max-h-[70vh] max-w-xl items-start gap-3 overflow-y-auto rounded-2xl border px-4 py-3 shadow-xl ${success ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
      {success ? <CheckCircle2 size={20} className="mt-0.5 shrink-0" /> : <AlertCircle size={20} className="mt-0.5 shrink-0" />}
      <p className="whitespace-pre-line text-sm font-medium">{message}</p>
      {onClose && <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X size={16} /></button>}
    </div>
  )
}
