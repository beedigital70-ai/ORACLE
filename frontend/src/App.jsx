import { useState } from 'react'
import './index.css'
import LoginGateway from './components/LoginGateway'
import Dashboard from './components/Dashboard'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null)

  const handleLogin = (newToken) => {
    setToken(newToken);
    localStorage.setItem('token', newToken);
  }

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
  }

  return (
    <div className="app-container">
      {!token ? (
        <LoginGateway onLogin={handleLogin} />
      ) : (
        <Dashboard token={token} onLogout={handleLogout} />
      )}
    </div>
  )
}

export default App
