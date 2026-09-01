export function calculateFinance(
  transactions = []
) {
  let income = 0;
  let expenses = 0;

  for (const transaction of transactions) {
    const amount =
      Number(transaction.amount) || 0;

    if (transaction.type === "income") {
      income += amount;
    }

    if (transaction.type === "expense") {
      expenses += amount;
    }
  }

  return {
    income,
    expenses,
    balance: income - expenses,
  };
}