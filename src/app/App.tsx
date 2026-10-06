import { Routes, Route } from 'react-router-dom';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import AdminHub from "../pages/adminHub/AdminHub";
import AdminProducts from "../pages/adminProducts/AdminProducts"
import Dashboard from "../pages/dashboard/Dashboard";
import Customers from "../pages/customers/CustomersPage"
import Expenses from "../pages/adminHub/Expenses"
import { FinancialDashboardPage } from "../pages/adminHub/FinancialDashboardPage";

function App() {

  return (
    <>
    
      <Routes>

        <Route
          path="/admin"
          element={<AdminHub />}
        />

        <Route
          path="/products"
          element={<AdminProducts />}
        />

        <Route
          path="/"
          element={<Dashboard />}
        />

        <Route
          path="/customers"
          element={<Customers />}
        />

        <Route
          path="/expenses"
          element={<Expenses />}
        />

        <Route
          path="/admin/financial"
          element={<FinancialDashboardPage />}
        />

      </Routes>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />

    </>

  )
}

export default App
