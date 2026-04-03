export type BankAccount = {
  id: string;
  userId: string;
  name: string;
  accountNumber: string;
  balance: number;
  currency: string;
};

export type BankTransaction = {
  id: string;
  accountId: string;
  userId: string;
  amount: number;
  type: string;
  description: string;
  date: string;
};
