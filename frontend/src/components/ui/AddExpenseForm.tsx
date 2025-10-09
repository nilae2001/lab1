import { useState } from 'react'
import { api } from '../../lib/api'

export function AddExpenseForm({ onAdded }: { onAdded?: () => void }) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState<number | ''>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title || typeof amount !== 'number') return
    setSubmitting(true)
    setError(null)
    try {
      await api.createExpense({ title, amount })
      setTitle('')
      setAmount('')
      onAdded?.()
    } catch (e: any) {
      setError(e.message ?? 'Failed to add expense')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 flex gap-2">
      <input className="w-1/2 rounded border p-2" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input
        className="w-40 rounded border p-2"
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
      />
      <button className="rounded bg-black px-4 py-2 text-white disabled:opacity-50" disabled={submitting}>
        {submitting ? 'Adding…' : 'Add'}
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </form>
  )
}
