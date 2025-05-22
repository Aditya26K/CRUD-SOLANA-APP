"use client";
import { useEffect, useState } from 'react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { useWallet, useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Program, BN, AnchorProvider, setProvider } from '@coral-xyz/anchor';
import { idl } from './idl.js';

export default function Home() {
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();
  const provider = new AnchorProvider(connection, anchorWallet, {});
  setProvider(provider);
  const wallet = useWallet();
  const [expenses, setExpenses] = useState([]);
  const [expenseId, setExpenseId] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [amount, setAmount] = useState('');
  const [isFetching, setIsFetching] = useState(false); // Loading state for fetching
  const [isTransacting, setIsTransacting] = useState(false); // Loading state for transactions
  const programId = new PublicKey("5EEpojrJiksc97xwZzcKttwV3TgvSEzaj2Ybw5WbPCrC");
  const program = new Program(idl, provider);

  const getExpensePDA = async (userPubkey, expenseId) => {
    const [expensePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('expense'), userPubkey.toBuffer(), new BN(expenseId).toArrayLike(Buffer, 'le', 8)],
      programId
    );
    return expensePDA;
  };

  const fetchExpenseData = async (expenseId) => {
    try {
      const expensePDA = await getExpensePDA(wallet.publicKey, expenseId);
      const data = await program.account.expenseAccount.fetch(expensePDA);
      return {
        id: expenseId,
        merchantName: data.merchantName,
        amount: data.amount.toString(),
      };
    } catch (error) {
      console.error("Error fetching expense data:", error);
      return null;
    }
  };

  // Fetch all expenses for the connected user
  const fetchExpenses = async () => {
    if (!wallet.connected) return;
    setIsFetching(true);
    const userExpenses = [];
    try {
      for (let expenseId = 1; expenseId <= 10; expenseId++) {
        const expense = await fetchExpenseData(expenseId);
        if (expense) userExpenses.push(expense);
      }
      setExpenses(userExpenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
    } finally {
      setIsFetching(false);
    }
  };

  // Fetch expenses on initial load and when wallet connects
  useEffect(() => {
    fetchExpenses();
  }, [wallet.connected]);

  const initializeExpense = async () => {
    if (!wallet.connected) {
      alert("Please connect your wallet");
      return;
    }
    if (!expenseId || !merchantName || !amount) {
      alert("Please fill in all fields");
      return;
    }

    setIsTransacting(true);
    try {
      const pda = await getExpensePDA(wallet.publicKey, expenseId);
      const txSig = await program.methods
        .initialize(new BN(expenseId), merchantName, new BN(amount))
        .accountsStrict({
          expenseAccount: pda,
          signer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        {
          signature: txSig,
          ...latestBlockhash,
        },
        "finalized"
      );

      console.log("Transaction finalized on chain.");
      await fetchExpenses();
    } catch (error) {
      console.error("Error initializing expense:", error);
      alert("Failed to initialize expense. Please try again.");
    } finally {
      setIsTransacting(false);
    }
  };

  const updateExpense = async () => {
    // Placeholder for update functionality
  };

  const deleteExpense = async () => {
    // Placeholder for delete functionality
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      {!wallet.connected ? (
        <WalletMultiButton />
      ) : (
        <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-black">Expense Manager</h1>
            <WalletMultiButton />
          </div>
          <label className="block mb-2">
            <span className="text-gray-700">Expense ID</span>
            <input
              type="number"
              value={expenseId}
              onChange={(e) => setExpenseId(e.target.value)}
              className="mt-1 text-black block w-full p-2 border rounded-md"
              disabled={isTransacting}
            />
          </label>

          <label className="block mb-2">
            <span className="text-gray-700">Merchant Name</span>
            <input
              type="text"
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              className="mt-1 text-black block w-full p-2 border rounded-md"
              disabled={isTransacting}
            />
          </label>

          <label className="block mb-4">
            <span className="text-gray-700">Amount</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 text-black block w-full p-2 border rounded-md"
              disabled={isTransacting}
            />
          </label>

          <div className="flex justify-between space-x-2">
            <button
              onClick={initializeExpense}
              className={`flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 ${
                isTransacting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={isTransacting}
            >
              {isTransacting ? 'Processing...' : 'Initialize'}
            </button>
            <button
              onClick={updateExpense}
              className={`flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 ${
                isTransacting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={isTransacting}
            >
              Update
            </button>
            <button
              onClick={deleteExpense}
              className={`flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 ${
                isTransacting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={isTransacting}
            >
              Delete
            </button>
          </div>
        </div>
      )}
      {wallet.connected && (
        <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-md mt-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-black">Your Expenses</h2>
            <button
              onClick={fetchExpenses}
              className={`px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 ${
                isFetching ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={isFetching}
            >
              {isFetching ? 'Fetching...' : '🔄'}
            </button>
          </div>
          {isFetching ? (
            <p className="text-gray-500">Loading expenses...</p>
          ) : expenses.length === 0 ? (
            <p className="text-gray-500">No expenses found.</p>
          ) : (
            <ul className="space-y-2">
              {expenses.map((e) => (
                <li
                  key={e.id}
                  className="flex justify-between p-2 text-black border rounded-md"
                >
                  <span>#{e.id}</span>
                  <span>{e.merchantName}</span>
                  <span>{e.amount}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}