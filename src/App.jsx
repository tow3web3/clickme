import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api'

// Generate or retrieve persistent user ID
function getUid() {
  let uid = localStorage.getItem('clickme_uid')
  if (!uid) {
    uid = crypto.randomUUID()
    localStorage.setItem('clickme_uid', uid)
  }
  return uid
}

function getUserName() {
  return localStorage.getItem('clickme_name') || ''
}

function buildTweetUrl(userClicks) {
  const text = `I clicked in the correct place.\n\nYou do on average 1,007 clicks per day. Make sure you $CLICK here once a day and it might just change your life\n\nMy clicks: ${userClicks}\n\n👉 clickme.fun`
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
}

function timeAgo(dateStr) {
  const now = new Date()
  const then = new Date(dateStr + 'Z')
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function App() {
  const [count, setCount] = useState(null)
  const [userClicks, setUserClicks] = useState(0)
  const [leaderboard, setLeaderboard] = useState([])
  const [bumping, setBumping] = useState(false)
  const [particles, setParticles] = useState([])
  const [ripples, setRipples] = useState([])
  const [showNameInput, setShowNameInput] = useState(!getUserName())
  const [nameValue, setNameValue] = useState(getUserName())
  const particleId = useRef(0)
  const rippleId = useRef(0)
  const uid = useRef(getUid())

  // Fetch initial data
  useEffect(() => {
    fetch(`${API_URL}/clicks`)
      .then(r => r.json())
      .then(data => setCount(data.count))
      .catch(() => setCount(0))

    fetch(`${API_URL}/user/${uid.current}`)
      .then(r => r.json())
      .then(data => setUserClicks(data.userClicks))
      .catch(() => {})

    fetch(`${API_URL}/leaderboard`)
      .then(r => r.json())
      .then(data => setLeaderboard(data.leaderboard))
      .catch(() => {})
  }, [])

  // Poll for updates every 5s
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`${API_URL}/clicks`)
        .then(r => r.json())
        .then(data => setCount(data.count))
        .catch(() => {})

      fetch(`${API_URL}/leaderboard`)
        .then(r => r.json())
        .then(data => setLeaderboard(data.leaderboard))
        .catch(() => {})
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Ripple on any click
  const handlePageClick = useCallback((e) => {
    const id = rippleId.current++
    setRipples(prev => [...prev, { id, x: e.clientX, y: e.clientY }])
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 500)
  }, [])

  useEffect(() => {
    document.addEventListener('click', handlePageClick)
    return () => document.removeEventListener('click', handlePageClick)
  }, [handlePageClick])

  const handleClick = (e) => {
    const name = localStorage.getItem('clickme_name') || 'anon'

    fetch(`${API_URL}/clicks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: uid.current, name })
    })
      .then(r => r.json())
      .then(data => {
        setCount(data.count)
        setUserClicks(data.userClicks)
      })
      .catch(() => {
        setCount(prev => (prev || 0) + 1)
        setUserClicks(prev => prev + 1)
      })

    // Bump animation
    setBumping(true)
    setTimeout(() => setBumping(false), 150)

    // Spawn particles
    const words = ['+1', 'CLICK', '✓', '$CLICK', 'OK']
    const newParticles = Array.from({ length: 3 }, (_, i) => {
      const id = particleId.current++
      return {
        id,
        text: words[Math.floor(Math.random() * words.length)],
        x: e.clientX + (Math.random() - 0.5) * 100,
        y: e.clientY - 10,
        delay: i * 50
      }
    })
    setParticles(prev => [...prev, ...newParticles])
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)))
    }, 900)
  }

  const handleNameSubmit = (e) => {
    e.preventDefault()
    const name = nameValue.trim() || 'anon'
    localStorage.setItem('clickme_name', name)
    setShowNameInput(false)
  }

  const formatNumber = (n) => {
    if (n === null) return '---'
    return n.toLocaleString()
  }

  return (
    <>
      {/* Ripples */}
      <div className="ripple-container">
        {ripples.map(r => (
          <div
            key={r.id}
            className="ripple"
            style={{
              width: 40, height: 40,
              left: r.x - 20, top: r.y - 20
            }}
          />
        ))}
      </div>

      {/* Particles */}
      {particles.map(p => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: p.x, top: p.y,
            animationDelay: `${p.delay}ms`
          }}
        >
          {p.text}
        </div>
      ))}

      {/* Menu Bar */}
      <div className="menu-bar">
        <span className="apple">&#63743;</span>
        <span>File</span>
        <span>Edit</span>
        <span>View</span>
        <span>Special</span>
      </div>

      {/* Desktop */}
      <div className="desktop">
        <div className="windows-row">
          {/* Main Window */}
          <div className="window main-window">
            <div className="title-bar">
              <div className="close-box" />
              <div className="title-bar-lines" />
              <div className="title-bar-text">clickme.fun</div>
              <div className="title-bar-lines" />
            </div>

            <div className="window-body">
              <div className="ticker">$CLICK</div>
              <div className="subtitle">Click Me</div>

              <div className="sep" />

              <p className="tagline">
                The best coins are the simplest.<br />
                Every computer in the world has a mouse.<br />
                Every mouse <em>clicks</em>.<br />
                The problem is most people click in the wrong places.<br /><br />
                All you need to do is click once per day<br />
                and I will make you <em>filthy rich</em>.
              </p>

              {/* Name input */}
              {showNameInput && (
                <form className="name-form" onSubmit={handleNameSubmit}>
                  <input
                    type="text"
                    value={nameValue}
                    onChange={e => setNameValue(e.target.value)}
                    placeholder="Enter your name..."
                    className="name-input"
                    maxLength={30}
                    autoFocus
                  />
                  <button type="submit" className="name-btn">OK</button>
                </form>
              )}

              {!showNameInput && (
                <div className="user-info" onClick={() => setShowNameInput(true)}>
                  clicking as <strong>{localStorage.getItem('clickme_name') || 'anon'}</strong> · {formatNumber(userClicks)} clicks
                </div>
              )}

              <div className="counter-section">
                <div className={`counter-number ${bumping ? 'bump' : ''} ${count === null ? 'loading' : ''}`}>
                  {formatNumber(count)}
                </div>
                <div className="counter-label">Total clicks worldwide</div>
              </div>

              <a
                href={buildTweetUrl(userClicks)}
                target="_blank"
                rel="noopener noreferrer"
                className="click-btn"
                onClick={handleClick}
              >
                CLICK THIS
              </a>
              <p className="sub-cta">↑ this is the right place</p>

              <div className="stats">
                <div className="stat">
                  <div className="stat-num">1,007</div>
                  <div className="stat-label">Avg clicks / day</div>
                </div>
                <div className="stat">
                  <div className="stat-num">{formatNumber(userClicks)}</div>
                  <div className="stat-label">Your clicks</div>
                </div>
              </div>
            </div>

            <div className="status-bar">
              <span>not financial advice. just click.</span>
              <span>{formatNumber(count)} clicks</span>
            </div>
          </div>

          {/* Leaderboard Window */}
          <div className="window leaderboard-window">
            <div className="title-bar">
              <div className="close-box" />
              <div className="title-bar-lines" />
              <div className="title-bar-text">Leaderboard</div>
              <div className="title-bar-lines" />
            </div>

            <div className="leaderboard-header">
              <span>#</span>
              <span>Name</span>
              <span>Clicks</span>
              <span>Last</span>
            </div>

            <div className="leaderboard-body">
              {leaderboard.length === 0 && (
                <div className="leaderboard-empty">No clicks yet. Be first.</div>
              )}
              {leaderboard.map((entry, i) => (
                <div key={i} className={`leaderboard-row ${i < 3 ? 'top-three' : ''}`}>
                  <span className="lb-rank">{i + 1}</span>
                  <span className="lb-name">{entry.name}</span>
                  <span className="lb-clicks">{entry.clicks.toLocaleString()}</span>
                  <span className="lb-time">{timeAgo(entry.last_click)}</span>
                </div>
              ))}
            </div>

            <div className="status-bar">
              <span>Top 50 clickers</span>
              <span>{leaderboard.length} users</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default App
