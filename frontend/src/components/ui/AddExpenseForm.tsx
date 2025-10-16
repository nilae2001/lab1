import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

type Expense = { id: number; title: string; amount: number; fileUrl?: string | null }

export function AddExpenseForm({ onAdded }: { onAdded?: () => void }) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState<number | ''>('')
  const [formError, setFormError] = useState<string | null>(null)
  const qc = useQueryClient()

  // Mutation to add expense
  const mutation = useMutation({
    mutationFn: async (payload: { title: string; amount: number }) => {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const msg = await res.text().catch(() => 'Failed to add expense')
        throw new Error(msg)
      }
      return (await res.json()) as { expense: Expense }
    },
    onMutate: async (newItem) => {
      await qc.cancelQueries({ queryKey: ['expenses'] })
      const previous = qc.getQueryData<{ expenses: Expense[] }>(['expenses'])
      if (previous) {
        const optimistic: Expense = {
          id: Date.now(),
          title: newItem.title,
          amount: newItem.amount,
          fileUrl: null,
        }
        qc.setQueryData(['expenses'], {
          expenses: [...previous.expenses, optimistic],
        })
      }
      return { previous }
    },
    onError: (_err, _newItem, ctx) => {
      if (ctx?.previous) qc.setQueryData(['expenses'], ctx.previous)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] })
      setTitle('')
      setAmount('')
      onAdded?.()
    },
  })

  // Real-time inline validation for amount
  const amountError =
    typeof amount === 'number' && amount <= 0 ? 'Amount must be greater than 0' : null

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormError(null)
    if (!title.trim()) return setFormError('Title is required')
    if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
      return setFormError('Amount must be greater than 0')
    }
    mutation.mutate({ title: title.trim(), amount })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-2 w-full max-w-md">
      <div className="flex gap-2">
        <input
          className="flex-1 rounded border p-2"
          placeholder="Title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            setFormError(null)
          }}
          disabled={mutation.isPending}
        />
        <input
          className="w-40 rounded border p-2"
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
          disabled={mutation.isPending}
        />
      </div>

      {amountError && <p className="text-sm text-red-600">{amountError}</p>}
      {formError && <p className="text-sm text-red-600">{formError}</p>}
      {mutation.isError && (
        <p className="text-sm text-red-600">{mutation.error?.message ?? 'Could not add expense.'}</p>
      )}

      <button
        type="submit"
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        disabled={mutation.isPending || !!amountError}
      >
        {mutation.isPending ? (
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Adding…
          </span>
        ) : (
          'Add Expense'
        )}
      </button>
    </form>
  )
}
