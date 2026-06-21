import { createContext, useContext, useEffect, useState } from 'react'

const CartContext = createContext(null)
const STORAGE_KEY = 'umcd-store-cart'

function loadInitialCart() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(loadInitialCart)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
    } catch {
      // localStorage unavailable — cart just won't persist across reloads
    }
  }, [cart])

  function addItem(item) {
    setCart((prev) => [...prev, { ...item, cartId: crypto.randomUUID() }])
  }

  function removeItem(cartId) {
    setCart((prev) => prev.filter((item) => item.cartId !== cartId))
  }

  function updateQuantity(cartId, quantity) {
    setCart((prev) =>
      prev.map((item) =>
        item.cartId === cartId
          ? { ...item, quantity, line_total: item.unit_price * quantity }
          : item
      )
    )
  }

  function clearCart() {
    setCart([])
  }

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const total = cart.reduce((sum, item) => sum + item.line_total, 0)

  return (
    <CartContext.Provider value={{ cart, addItem, removeItem, updateQuantity, clearCart, itemCount, total }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
