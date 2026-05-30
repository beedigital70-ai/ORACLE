import { useState } from 'react'

export default function LoginGateway({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const endpoint = apiUrl ? `${apiUrl}/auth/login` : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      const data = await res.json()
      if (res.ok) {
        onLogin(data.token)
      } else {
        setError(data.error || 'Invalid credentials')
      }
    } catch (err) {
      setError('Server unreachable')
    }
    setLoading(false)
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      <div className="glass-panel" style={{ width: '400px', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '8px', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '2px' }}>System Secured</h1>
        <p style={{ color: '#8b949e', marginBottom: '32px', fontSize: '14px', lineHeight: '1.5' }}>
          Enter clearance code to access the automated sports analytics prediction engine.
        </p>
        
        <form onSubmit={handleSubmit}>
          <input 
            type="password" 
            className="glass-input" 
            placeholder="Password..."
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ marginBottom: '24px' }}
          />
          {error && <div style={{ color: 'var(--accent-red)', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}
          <button type="submit" className="glass-button" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Authenticating...' : 'Initialize'}
          </button>
        </form>
      </div>
    </div>
  )
}
