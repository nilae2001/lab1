// /frontend/src/routes/expenses.list.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

export type Expense = {
  id: number;
  title: string;
  amount: number;
  fileUrl?: string | null;
};

const API = "http://localhost:3000/api";

export default function ExpensesListPage() {
  const qc = useQueryClient();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const res = await fetch(`${API}/expenses`);
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${txt || res.statusText}`);
      }
      return (await res.json()) as { expenses: Expense[] };
    },
    staleTime: 5_000,
    retry: 1,
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API}/expenses/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete expense");
      return id;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["expenses"] });
      const previous = qc.getQueryData<{ expenses: Expense[] }>(["expenses"]);
      if (previous) {
        qc.setQueryData(["expenses"], {
          expenses: previous.expenses.filter((item) => item.id !== id),
        });
      }
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(["expenses"], ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
  });

  if (isLoading) {
    return (
      <section className="mx-auto max-w-3xl p-6">
        <header className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Expenses</h2>
        </header>
        <ul className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <li
              key={i}
              className="h-16 w-full animate-pulse rounded border bg-slate-200"
            />
          ))}
        </ul>
      </section>
    );
  }
  if (isError)
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">
          Failed to fetch: {(error as Error).message}
        </p>
        <button
          className="mt-3 rounded border px-3 py-1"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          Retry
        </button>
      </div>
    );

  const items = data?.expenses ?? [];

  return (
    <section className="mx-auto max-w-3xl p-6">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Expenses</h2>
        <button
          className="rounded border px-3 py-1 text-sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {items.length === 0 ? (
        <div className="rounded border bg-background p-6">
          <p className="text-sm text-muted-foreground">No expenses yet.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between rounded border bg-background text-foreground p-3 shadow-sm"
            >
              <div className="flex flex-col">
                <Link
                  to="/expenses/$id"
                  params={{ id: e.id.toString() }}
                  className="font-medium underline hover:text-primary"
                >
                  {e.title}
                </Link>
                <span className="text-sm text-muted-foreground">
                  ${e.amount}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {e.fileUrl && (
                  <a
                    href={e.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 underline hover:text-blue-800"
                  >
                    Download
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => deleteExpense.mutate(e.id)}
                  disabled={deleteExpense.isPending}
                  className="text-sm text-red-600 underline hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleteExpense.isPending ? "Removing…" : "Delete"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
