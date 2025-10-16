// frontend/src/routes/expenses.detail.tsx
import { useQuery, useQueryClient } from '@tanstack/react-query'
import UploadExpenseForm from '../components/ui/UploadExpenseForm'

type Expense = {
  id: number
  title: string
  amount: number
  fileUrl?: string | null
}

const API = '/api' // use Vite proxy or your backend URL

export default function ExpenseDetailPage({ id }: { id: number }) {
  const queryClient = useQueryClient()

  // 1️⃣ Fetch the expense details
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['expenses', id],
    queryFn: async () => {
      const res = await fetch(`${API}/expenses/${id}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`Failed to fetch expense with id ${id}`)
      return res.json() as Promise<{ expense: Expense }>
    },
  })

  if (isLoading)
    return <p className="p-6 text-sm text-muted-foreground">Loading…</p>

  if (isError)
    return <p className="p-6 text-sm text-red-600">{(error as Error).message}</p>

  const item = data?.expense
  if (!item) {
    return <p className="p-6 text-sm text-muted-foreground">Expense not found.</p>
  }

  // 2️⃣ Handle refetch after upload
  const handleUploadSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['expenses', id] })
  }

  return (
    <section className="mx-auto max-w-3xl p-6 space-y-6">
      <div className="rounded border bg-background text-foreground p-6">
        <h2 className="text-xl font-semibold">{item.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">Amount</p>
        <p className="text-lg tabular-nums">${item.amount}</p>
      </div>

      {/* 3️⃣ Show Upload Form */}
      <UploadExpenseForm expenseId={String(item.id)} onSuccess={handleUploadSuccess} />

      {/* 4️⃣ Conditional download link */}
      {item.fileUrl ? (
        <a
          href={item.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
        >
          Download Receipt
        </a>
      ) : (
        <p className="text-sm text-muted-foreground">No receipt uploaded yet.</p>
      )}
    </section>
  )
}
