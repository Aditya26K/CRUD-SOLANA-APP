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
  const [isFetching, setIsFetching] = useState(false);
  const [isTransacting, setIsTransacting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const programId = new PublicKey("B6Mes3SydVQ9CYjRxxvwoTAo3AyDR7n7EVrsk4gvv6WQ");
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

  useEffect(() => {
    fetchExpenses();
  }, [wallet.connected]);

  const resetForm = () => {
    setExpenseId('');
    setMerchantName('');
    setAmount('');
    setEditMode(false);
  };

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

      await connection.confirmTransaction(txSig, "finalized");
      await fetchExpenses();
      resetForm();
      alert('Expense created successfully!');
    } catch (error) {
      console.error("Error initializing expense:", error);
      alert(error.message || "Failed to initialize expense. Please try again.");
    } finally {
      setIsTransacting(false);
    }
  };

  const handleUpdateFields = (expense) => {
    setExpenseId(expense.id.toString());
    setMerchantName(expense.merchantName);
    setAmount(expense.amount.toString());
    setEditMode(true);
  };

  const updateExpense = async () => {
    if (!editMode) return;
    
    setIsTransacting(true);
    try {
      const pda = await getExpensePDA(wallet.publicKey, expenseId);
      const txSig = await program.methods
        .update(new BN(expenseId), merchantName, new BN(amount))
        .accountsStrict({
          expenseAccount: pda,
          signer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        }).rpc();
      
      await connection.confirmTransaction(txSig, "finalized");
      await fetchExpenses();
      resetForm();
      alert('Expense updated successfully!');
    } catch (error) {
      console.error("Error updating expense:", error);
      alert(error.message || "Failed to update expense. Please try again.");
    } finally {
      setIsTransacting(false);
    }
  };

  const deleteExpense = async (expenseId) => {
    if (!window.confirm("Are you sure you want to delete this expense?")) return;
    
    setIsTransacting(true);
    try {
      const pda = await getExpensePDA(wallet.publicKey, expenseId);
      const txSig = await program.methods
        .delete(new BN(expenseId))
        .accountsStrict({
          expenseAccount: pda,
          signer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        }).rpc();

      await connection.confirmTransaction(txSig, "finalized");
      await fetchExpenses();
      alert('Expense deleted successfully!');
    } catch (error) {
      console.error("Error deleting expense:", error);
      alert(error.message || "Failed to delete expense. Please try again.");
    } finally {
      setIsTransacting(false);
    }
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
          <div className="space-y-4">
            <label className="block">
              <span className="text-gray-700">Expense ID</span>
              <input
                type="number"
                value={expenseId}
                onChange={(e) => setExpenseId(e.target.value)}
                className="mt-1 text-black block w-full p-2 border rounded-md disabled:opacity-75"
                disabled={isTransacting || editMode}
              />
            </label>

            <label className="block">
              <span className="text-gray-700">Merchant Name</span>
              <input
                type="text"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                className="mt-1 text-black block w-full p-2 border rounded-md disabled:opacity-75"
                disabled={isTransacting}
              />
            </label>

            <label className="block">
              <span className="text-gray-700">Amount</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 text-black block w-full p-2 border rounded-md disabled:opacity-75"
                disabled={isTransacting}
              />
            </label>

            <div className="flex gap-2">
              <button
                onClick={editMode ? updateExpense : initializeExpense}
                className={`flex-1 py-2 ${
                  editMode ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600'
                } text-white rounded-lg transition-colors disabled:opacity-50`}
                disabled={isTransacting}
              >
                {isTransacting ? 'Processing...' : editMode ? 'Update Expense' : 'Create Expense'}
              </button>
              
              {editMode && (
                <button
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
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
              {isFetching ? 'Fetching...' : 'Refresh'}
            </button>
          </div>
          
          {isFetching ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading expenses...</p>
            </div>
          ) : expenses.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No expenses found.</p>
          ) : (
            <ul className="space-y-2">
              {expenses.map((e) => (
                <div
                  key={e.id}
                  className="group relative hover:bg-gray-50 rounded-md transition-colors border"
                >
                  <li className="flex justify-between items-center p-3 text-black">
                    <div className="flex-1">
                      <span className="font-medium">#{e.id}</span>
                      <span className="mx-2 text-gray-400">-</span>
                      <span className="text-gray-600">{e.merchantName}</span>
                    </div>
                    <span className="font-semibold">${e.amount}</span>
                    
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm p-1 rounded">
                      <button
                        onClick={() => {
                          handleUpdateFields(e);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-2 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-sm transition-colors disabled:opacity-50"
                        disabled={isTransacting}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteExpense(e.id)}
                        className="px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm transition-colors disabled:opacity-50"
                        disabled={isTransacting}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                </div>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}