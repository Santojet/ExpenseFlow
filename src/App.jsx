import React from "react";

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gray-900 text-white px-6 py-4">
        <h1 className="text-xl font-bold">ExpenseFlow Pro</h1>
      </nav>

      <main className="p-6">
        <h2 className="text-3xl font-bold text-gray-800">
          Dashboard
        </h2>

        <p className="mt-2 text-gray-600">
          Welcome to ExpenseFlow Pro
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white p-6 rounded-xl shadow">
            <p className="text-gray-500">Total Salary</p>
            <h3 className="text-2xl font-bold mt-2">৳0</h3>
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            <p className="text-gray-500">Total Expense</p>
            <h3 className="text-2xl font-bold mt-2">৳0</h3>
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            <p className="text-gray-500">Balance</p>
            <h3 className="text-2xl font-bold mt-2">৳0</h3>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;