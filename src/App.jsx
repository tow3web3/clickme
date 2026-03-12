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

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n.toLocaleString() + (s[(v - 20) % 10] || s[v] || s[0])
}

function buildTweetUrl(globalCount) {
  const text = `I clicked in the correct place.\n\nYou do on average 1,007 clicks per day. Make sure you $CLICK here once a day and it might just change your life\n\nI'm the ${ordinal(globalCount)} clicker\n\n👉 clickme.fun`
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
  const [activeTab, setActiveTab] = useState('readme')
  const [introPhase, setIntroPhase] = useState('start') // start, sliding, clicking, ripple, done

  // Intro animation sequence — runs once on mount
  useEffect(() => {
    const t1 = setTimeout(() => setIntroPhase('sliding'), 200)       // cursor starts moving
    const t2 = setTimeout(() => setIntroPhase('clicking'), 1800)    // cursor presses down
    const t3 = setTimeout(() => setIntroPhase('ripple'), 2300)      // shockwave + flash
    const t4 = setTimeout(() => setIntroPhase('done'), 3100)        // site opens
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [])
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
      {/* Intro Animation */}
      {introPhase !== 'done' && (
        <div className="intro-overlay" onClick={() => setIntroPhase('done')}>
          {/* Click target word */}
          <div className={`intro-target ${introPhase}`}>
            CLICK
          </div>

          {/* Mouse cursor — starts off-screen left, slides to the word, clicks */}
          <div className={`intro-cursor ${introPhase}`}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M5 3L19 12L12 13L15 21L12 22L9 14L5 17V3Z" fill="#000" stroke="#fff" strokeWidth="0.8"/>
            </svg>
          </div>

          {/* Shockwave rings on click */}
          {(introPhase === 'clicking' || introPhase === 'ripple') && (
            <>
              <div className="intro-shockwave ring1" />
              <div className="intro-shockwave ring2" />
              <div className="intro-shockwave ring3" />
            </>
          )}

          {/* Flash */}
          <div className={`intro-flash ${introPhase === 'ripple' ? 'active' : ''}`} />

          <div className="intro-skip">click anywhere to skip</div>
        </div>
      )}

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
        <span
          className={`menu-item ${activeTab === 'readme' ? 'active' : ''}`}
          onClick={() => setActiveTab('readme')}
        >
          Read Me
        </span>
        <span
          className={`menu-item ${activeTab === 'click' ? 'active' : ''}`}
          onClick={() => setActiveTab('click')}
        >
          $CLICK
        </span>
        <span
          className={`menu-item ${activeTab === 'view' ? 'active' : ''}`}
          onClick={() => setActiveTab('view')}
        >
          View
        </span>
        <span
          className={`menu-item ${activeTab === 'goal' ? 'active' : ''}`}
          onClick={() => setActiveTab('goal')}
        >
          The Goal
        </span>
      </div>

      {/* Desktop */}
      <div className="desktop">
        <div className="windows-row">

          {/* README Window */}
          {activeTab === 'readme' && (
            <div className="window readme-window">
              <div className="title-bar">
                <div className="close-box" onClick={() => setActiveTab('click')} />
                <div className="title-bar-lines" />
                <div className="title-bar-text">Read Me</div>
                <div className="title-bar-lines" />
              </div>

              <div className="window-body readme-body">
                <div className="ticker">$CLICK</div>
                <div className="subtitle">Read This First</div>

                <div className="sep" />

                <div className="readme-text">
                  <p>
                    Every single person reading this right now is sitting in front of a computer. We are all using a mouse.
                  </p>
                  <p>
                    There are approximately <strong>2-3 BILLION</strong> computers around the world.
                  </p>
                  <p>
                    There are around <strong>14 TRILLION</strong> clicks daily and YOU personally do <strong>10,000 - 20,000</strong> clicks per day.
                  </p>
                  <p>
                    I want you to see the vision here.
                  </p>
                  <p>
                    If you can make just <strong>ONE</strong> of them clicks worthwhile, you can click your way to millions.
                  </p>
                  <p>
                    So stop using your clicks for porn, gambling, reading news articles.
                  </p>
                  <p className="readme-highlight">
                    JUST USE ONE CLICK ON OUR WEBSITE AND POST THE TWEET.
                  </p>
                  <p>
                    You can see a live tracker of all the tweets posted on <strong onClick={() => setActiveTab('view')} className="readme-link">View</strong>.
                  </p>
                </div>

                <button className="click-btn" onClick={() => setActiveTab('click')}>
                  I UNDERSTAND, LET ME CLICK
                </button>
              </div>

              <div className="status-bar">
                <span>clickme.fun</span>
                <span>step 1 of 2: read</span>
              </div>
            </div>
          )}

          {/* Main Click Window */}
          {activeTab === 'click' && (
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
                  Make just <em>ONE</em> of your daily clicks worthwhile.<br />
                  Click your way to millions.
                </p>

                {/* Name input */}
                {showNameInput && (
                  <form className="name-form" onSubmit={handleNameSubmit}>
                    <input
                      type="text"
                      value={nameValue}
                      onChange={e => setNameValue(e.target.value)}
                      placeholder="Enter your @handle..."
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
                  href={buildTweetUrl(count || 0)}
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
                    <div className="stat-num">14T</div>
                    <div className="stat-label">Daily clicks worldwide</div>
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
          )}

          {/* View / Leaderboard Window */}
          {activeTab === 'view' && (
            <div className="window leaderboard-window">
              <div className="title-bar">
                <div className="close-box" onClick={() => setActiveTab('click')} />
                <div className="title-bar-lines" />
                <div className="title-bar-text">Live Tracker</div>
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
                <span>Live · updates every 5s</span>
                <span>{leaderboard.length} clickers</span>
              </div>
            </div>
          )}

          {/* The Goal Window */}
          {activeTab === 'goal' && (
            <div className="window readme-window">
              <div className="title-bar">
                <div className="close-box" onClick={() => setActiveTab('click')} />
                <div className="title-bar-lines" />
                <div className="title-bar-text">The Goal</div>
                <div className="title-bar-lines" />
              </div>

              <div className="window-body readme-body">
                <div className="ticker">THE GOAL</div>
                <div className="subtitle">Why This Works</div>

                <div className="sep" />

                <div className="readme-text">
                  <p>
                    All you need to do is give me <strong>one click</strong>.
                  </p>
                  <p>
                    If everyone does it — we create a snowball effect of clicks with tweets rolling in from everyone.
                  </p>
                  <p>
                    Do you understand? We create a <strong>self-marketing project</strong>, with a click sending a tweet to EVERY single person's X.
                  </p>
                  <p className="readme-highlight">
                    DO YOU SEE THE VISION?
                  </p>
                  <p>
                    All you need to do is use one of your <strong>10,000 clicks per day</strong> in the right place.
                  </p>
                  <p>
                    The higher we go, the more people click. The more people click, the more tweets. The more tweets, the more exposure. It's an infinite loop.
                  </p>
                  <p>
                    Use your clicks wisely. Click <strong>ONCE</strong> here <strong>EVERY</strong> day and I guarantee you we will all be filthy rich.
                  </p>
                </div>

                <button className="click-btn" onClick={() => setActiveTab('click')}>
                  I SEE THE VISION
                </button>
              </div>

              <div className="status-bar">
                <span>clickme.fun</span>
                <span>snowball effect activated</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}

export default App
