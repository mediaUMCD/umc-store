import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { CartProvider } from './lib/CartContext'
import StoreHome from './pages/store/StoreHome'
import ProductDetail from './pages/store/ProductDetail'
import Cart from './pages/store/Cart'
import OrderConfirmation from './pages/store/OrderConfirmation'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminProducts from './pages/admin/AdminProducts'
import AdminDesigns from './pages/admin/AdminDesigns'
import AdminColors from './pages/admin/AdminColors'
import AdminOrders from './pages/admin/AdminOrders'
import PrintOrder from './pages/admin/PrintOrder'
import RequireAdmin from './components/RequireAdmin'
import './index.css'

export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <Routes>
          {/* Public store */}
          <Route path="/" element={<StoreHome />} />
          <Route path="/product/:productId" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/order/confirmation/:orderNumber" element={<OrderConfirmation />} />

          {/* Admin */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminDashboard />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/products"
            element={
              <RequireAdmin>
                <AdminProducts />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/designs"
            element={
              <RequireAdmin>
                <AdminDesigns />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/colors"
            element={
              <RequireAdmin>
                <AdminColors />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <RequireAdmin>
                <AdminOrders />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/orders/:orderId/print"
            element={
              <RequireAdmin>
                <PrintOrder />
              </RequireAdmin>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </CartProvider>
    </BrowserRouter>
  )
}

function NotFound() {
  return (
    <div className="container">
      <div className="card" style={{ textAlign: 'center', marginTop: 60 }}>
        <h2>Page not found</h2>
        <p><Link to="/">Return to the store</Link></p>
      </div>
    </div>
  )
}
