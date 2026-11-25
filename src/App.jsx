import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [status, setStatus] = useState({ loading: true, supported: false })
  const [notice, setNotice] = useState(null)
  const [messages, setMessages] = useState(null)
  const [capturing, setCapturing] = useState(false)

  useEffect(() => {
    if (!window.chrome?.runtime) {
      setStatus({ loading: false, supported: false })
      return
    }

    chrome.runtime.sendMessage({ type: 'GET_ACTIVE_TAB' }, (response) => {
      if (chrome.runtime.lastError) {
        setStatus({ loading: false, supported: false })
        return
      }
      setStatus({
        loading: false,
        supported: Boolean(response?.supported),
        platform: response?.platform || null,
        hasConversation: Boolean(response?.hasConversation),
        title: response?.title || null,
        status: response?.status,
      })
    })
  }, [])

  const captureConversation = () => {
    setCapturing(true)
    setMessages(null)
    setNotice({ tone: 'loading', text: 'Checking this conversation…' })
    chrome.runtime.sendMessage({ type: 'CAPTURE_CONVERSATION' }, (response) => {
      setCapturing(false)
      if (chrome.runtime.lastError) {
        setNotice({ tone: 'error', text: 'MemVault could not reach the page.' })
        return
      }
      if (response?.ok) {
        setMessages(response.messages || [])
      }
      setNotice({
        tone: response?.ok ? 'success' : 'error',
        text: response?.message || 'Unable to capture this conversation.',
      })
    })
  }

  return (
    <main className="popup">
      <header className="popup-header">
        <div className="brand-mark" aria-hidden="true">M</div>
        <div>
          <h1>MemVault</h1>
          <p>Local AI memory</p>
        </div>
      </header>

      {status.loading ? (
        <section className="card state-card">
          <div className="spinner" aria-label="Loading" />
          <p>Detecting platform…</p>
        </section>
      ) : status.supported ? (
        <>
          <section className="card platform-card">
            <div>
              <span className="eyebrow">Detected platform</span>
              <strong>{status.platform}</strong>
            </div>
            <span className="status-dot" title="Supported platform" />
          </section>

          {status.status === 'connection_pending' && (
            <section className="notice warning">
              The page is still loading. Refresh this popup after the conversation loads.
            </section>
          )}

          {status.title && <p className="conversation-title">{status.title}</p>}

          <button
            className="capture-button"
            type="button"
            onClick={captureConversation}
            disabled={capturing || status.status === 'connection_pending'}
          >
            {capturing ? 'Reading visible messages…' : 'Capture conversation'}
          </button>

          {messages && (
            <section className="captured-messages" aria-live="polite">
              <h2>Visible messages ({messages.length})</h2>
              <div className="message-list">
                {messages.map((message, index) => (
                  <article className={`message-card ${message.role}`} key={`${message.role}-${index}`}>
                    <span className="message-role">
                      {message.role === 'user' ? 'You' : 'Assistant'}
                    </span>
                    <p>{message.content}</p>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <section className="card state-card unsupported">
          <span className="state-icon" aria-hidden="true">!</span>
          <h2>Unsupported website</h2>
          <p>Open ChatGPT or Google Gemini to capture a conversation.</p>
        </section>
      )}

      {notice && <div className={`notice ${notice.tone}`}>{notice.text}</div>}

      <footer>
        <span>Local-first</span>
        <span className="privacy-dot" />
        <span>No automatic uploads</span>
      </footer>
    </main>
  )
}

export default App
