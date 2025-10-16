import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type Expense = {
  id: number;
  title: string;
  amount: number;
  fileUrl?: string | null;
};

export function ExpensesList() {
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery<{
    expenses: Expense[];
  }>({
    queryKey: ["expenses"],
    queryFn: async () => {
      const res = await fetch("/api/expenses", {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch expenses");
      return (await res.json()) as { expenses: Expense[] };
    },
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/expenses/${id}`, {
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

  if (isError) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        <p>Could not load expenses. Please try again.</p>
        <button
          className="mt-2 rounded border border-red-300 px-3 py-1 text-xs text-red-700"
          onClick={() => refetch()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data || data.expenses.length === 0) {
    return (
      <div className="rounded border bg-background p-6 text-center">
        <h3 className="text-lg font-semibold">No expenses yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Start by adding your first expense using the form above.
        </p>
      </div>
    );
  }

  return (
    <ul className="mt-4 space-y-2">
      {data.expenses.map((expense) => (
        <li
          key={expense.id}
          className="flex items-center justify-between rounded border bg-white p-3 shadow-sm"
        >
          <div className="flex flex-col">
            <span className="font-medium">{expense.title}</span>
            <span className="text-sm text-gray-600">${expense.amount}</span>
          </div>
          <div className="flex items-center gap-3">
            {expense.fileUrl && (
              <a
                href={expense.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 underline hover:text-blue-800"
              >
                Download
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                console.log("Delete clicked:", expense.id);
                deleteExpense.mutate(expense.id);
              }}
              disabled={deleteExpense.isPending}
              className="text-sm text-red-600 underline hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleteExpense.isPending ? "Removing…" : "Delete"}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
