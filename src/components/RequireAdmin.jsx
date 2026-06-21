import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function RequireAdmin({ children }) {
  const [status, setStatus] = useState('checking') // checking | authorized | unauthorized

  useEffect(() => {
    let isMounted = true

    async function checkAdmin() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        if (isMounted) setStatus('unauthorized')
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (error || !profile || profile.role !== 'admin') {
        if (isMounted) setStatus('unauthorized')
        return
      }

      if (isMounted) setStatus('authorized')
    }

    checkAdmin()
    return () => { isMounted = false }
  }, [])

  if (status === 'checking') {
    return (
      <div className="container">
        <p>Checking access…</p>
      </div>
    )
  }

  if (status === 'unauthorized') {
    return <Navigate to="/admin/login" replace />
  }

  return children
}
