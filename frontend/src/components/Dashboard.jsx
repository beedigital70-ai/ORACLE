import { useState, useEffect } from 'react'

export default function Dashboard({ token, onLogout }) {
  const [activeTab, setActiveTab] = useState('today') // 'today' or 'history'
  const [todayData, setTodayData] = useState({ predictions: [], slips: [] })
  const [historyData, setHistoryData] = useState({ predictions: [], slips: [] })
  const [stats, setStats] = useState({ accuracy: 0, totalProfit: 0, totalPicks: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const headers = { 'Authorization': `Bearer ${token}` }
      
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const endpointPrefix = apiUrl ? `${apiUrl}/data` : '/api/data';
      const [todayRes, perfRes, histRes] = await Promise.all([
        fetch(`${endpointPrefix}/predictions/today`, { headers }),
        fetch(`${endpointPrefix}/performance`, { headers }),
        fetch(`${endpointPrefix}/predictions/history`, { headers })
      ])

      if (todayRes.ok) setTodayData(await todayRes.json())
      if (perfRes.ok) {
        const perfData = await perfRes.json()
        setStats(perfData.runningStats)
      }
      if (histRes.ok) setHistoryData(await histRes.json())
      
    } catch (err) {
      console.error('Failed to fetch data', err)
    }
    setLoading(false)
  }

  return (
    <div className="animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h2 style={{ margin: 0, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ display: 'inline-block', width: '12px', height: '12px', background: 'var(--accent-green)', borderRadius: '50%', boxShadow: '0 0 10px var(--success-glow)' }}></span>
          SYSTEM ONLINE
        </h2>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div className="glass-panel" style={{ padding: '8px 16px', borderRadius: '30px', display: 'flex', gap: '16px' }}>
            <span style={{ fontSize: '14px', color: '#8b949e' }}>Accuracy: <strong style={{ color: 'white' }}>{stats.accuracy}%</strong></span>
            <span style={{ fontSize: '14px', color: '#8b949e' }}>P/L: <strong style={{ color: stats.totalProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{stats.totalProfit > 0 ? '+' : ''}{stats.totalProfit} U</strong></span>
          </div>
          <button onClick={onLogout} className="glass-button" style={{ padding: '8px 16px', fontSize: '14px' }}>Logout</button>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
        <button 
          className="glass-button"
          onClick={() => setActiveTab('today')}
          style={{ background: activeTab === 'today' ? 'rgba(56,189,248,0.3)' : '' }}
        >
          Today's Insights
        </button>
        <button 
          className="glass-button"
          onClick={() => setActiveTab('history')}
          style={{ background: activeTab === 'history' ? 'rgba(56,189,248,0.3)' : '' }}
        >
          History & Performance
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#8b949e' }}>Loading parameters...</div>
      ) : activeTab === 'today' ? (
        <TodayTab data={todayData} />
      ) : (
        <HistoryTab data={historyData} />
      )}
    </div>
  )
}

function TodayTab({ data }) {
  const { predictions, slips } = data;

  if (predictions.length === 0) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '60px' }}>
        <h3 style={{ color: '#8b949e' }}>No high-confidence predictions generated for today.</h3>
        <p style={{ fontSize: '14px', color: '#666' }}>The engine operates strictly on 85%+ probability thresholds.</p>
      </div>
    )
  }

  return (
    <div>
      {slips.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px', marginBottom: '24px' }}>Sure Odds Accumulators</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {slips.map(slip => (
              <div key={slip.id} className="glass-panel animate-fade-in" style={{ border: '1px solid var(--accent-green)', background: 'linear-gradient(180deg, rgba(52,211,153,0.1), rgba(0,0,0,0.3))' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 style={{ margin: 0, fontSize: '20px', color: 'var(--accent-green)' }}>{slip.slip_type}</h4>
                  <span className={`badge ${slip.status.toLowerCase()}`}>{slip.status}</span>
                </div>
                
                <div style={{ fontSize: '32px', fontWeight: '800', marginBottom: '16px' }}>
                  {slip.total_odds.toFixed(2)}x
                </div>

                <div style={{ fontSize: '14px', color: '#8b949e', marginBottom: '12px' }}>Legs Included:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {slip.picks_included.map(pickId => {
                    const pick = predictions.find(p => p.id === pickId);
                    if (!pick) return null;
                    return (
                      <div key={pickId} style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>{pick.teams}</div>
                        <div style={{ color: 'var(--accent-blue)' }}>{pick.market_line} @ {pick.odds}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h3 style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '12px', marginBottom: '24px' }}>Single Value Picks</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
        {predictions.map(pick => (
          <div key={pick.id} className="glass-panel animate-fade-in" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: `linear-gradient(90deg, var(--accent-blue) ${pick.confidence_rating}%, transparent ${pick.confidence_rating}%)` }}></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', marginTop: '8px' }}>
              <span style={{ fontSize: '12px', color: '#8b949e' }}>{pick.date}</span>
              <span className={`badge ${pick.status.toLowerCase()}`}>{pick.status}</span>
            </div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>{pick.teams}</h3>
            
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Market Edge</div>
                <div style={{ fontWeight: 600 }}>{pick.market_line}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                 <div style={{ fontSize: '12px', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Odds</div>
                 <div style={{ fontWeight: 800 }}>{pick.odds}</div>
              </div>
            </div>
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#8b949e' }}>Calculated Confidence</span>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent-green)' }}>{pick.confidence_rating}%</span>
              </div>
              <details style={{ cursor: 'pointer' }}>
                <summary style={{ fontSize: '14px', color: 'var(--accent-blue)', outline: 'none' }}>View Analytics Data</summary>
                <p style={{ fontSize: '13px', color: '#aaa', lineHeight: '1.5', marginTop: '12px', paddingLeft: '12px', borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                  {pick.data_justification}
                </p>
              </details>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function HistoryTab({ data }) {
  const { predictions, slips } = data;
  const [view, setView] = useState('slips'); // 'slips' or 'singles'

  return (
    <div>
       <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
          <button 
             className="glass-button" 
             style={{ padding: '8px 16px', fontSize: '13px', background: view === 'slips' ? 'rgba(56,189,248,0.3)' : '' }}
             onClick={() => setView('slips')}
          >
             View Accumulators
          </button>
          <button 
             className="glass-button" 
             style={{ padding: '8px 16px', fontSize: '13px', background: view === 'singles' ? 'rgba(56,189,248,0.3)' : '' }}
             onClick={() => setView('singles')}
          >
             View Singles
          </button>
       </div>
       
       <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--glass-border)' }}>
                  <th style={{ padding: '16px 24px', color: '#8b949e', fontWeight: 600, fontSize: '14px' }}>Date</th>
                  <th style={{ padding: '16px 24px', color: '#8b949e', fontWeight: 600, fontSize: '14px' }}>
                     {view === 'slips' ? 'Slip Type' : 'Match'}
                  </th>
                  <th style={{ padding: '16px 24px', color: '#8b949e', fontWeight: 600, fontSize: '14px' }}>
                     {view === 'slips' ? 'Total Odds' : 'Market'}
                  </th>
                  <th style={{ padding: '16px 24px', color: '#8b949e', fontWeight: 600, fontSize: '14px' }}>Result</th>
                </tr>
              </thead>
              <tbody>
                {view === 'slips' ? (
                   slips.length === 0 ? (
                      <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#8b949e' }}>No accumulator history.</td></tr>
                   ) : slips.map(row => (
                      <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '16px 24px', fontSize: '14px', color: '#ccc' }}>{row.date}</td>
                        <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: 600, color: 'var(--accent-green)' }}>{row.slip_type}</td>
                        <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: 'bold' }}>{row.total_odds.toFixed(2)}</td>
                        <td style={{ padding: '16px 24px' }}>
                          <span className={`badge ${row.status.toLowerCase()}`}>{row.status}</span>
                        </td>
                      </tr>
                   ))
                ) : (
                   predictions.length === 0 ? (
                      <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#8b949e' }}>No single history.</td></tr>
                   ) : predictions.map(row => (
                      <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '16px 24px', fontSize: '14px', color: '#ccc' }}>{row.date}</td>
                        <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: 600 }}>{row.teams}</td>
                        <td style={{ padding: '16px 24px', fontSize: '14px', color: 'var(--accent-blue)' }}>{row.market_line} <span style={{ color: '#8b949e', fontSize: '12px' }}>@{row.odds}</span></td>
                        <td style={{ padding: '16px 24px' }}>
                          <span className={`badge ${row.status.toLowerCase()}`}>{row.status}</span>
                        </td>
                      </tr>
                   ))
                )}
              </tbody>
            </table>
          </div>
       </div>
    </div>
  )
}
