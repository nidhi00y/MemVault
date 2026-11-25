const SUPPORTED_HOSTS = {
  'chatgpt.com': 'ChatGPT',
  'chat.openai.com': 'ChatGPT',
  'gemini.google.com': 'Gemini',
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'GET_ACTIVE_TAB') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]
      if (!tab?.url) {
        sendResponse({ ok: false, error: 'No active tab is available.' })
        return
      }

      try {
        const url = new URL(tab.url)
        const platform = SUPPORTED_HOSTS[url.hostname]
        if (!platform) {
          sendResponse({ ok: true, supported: false, platform: null, tabId: tab.id })
          return
        }

        chrome.tabs.sendMessage(tab.id, { type: 'GET_PLATFORM_STATUS' }, (status) => {
          if (chrome.runtime.lastError) {
            sendResponse({
              ok: true,
              supported: true,
              platform,
              tabId: tab.id,
              status: 'connection_pending',
            })
            return
          }
          sendResponse({ ok: true, supported: true, platform, tabId: tab.id, ...status })
        })
      } catch {
        sendResponse({ ok: false, error: 'Unable to read the active tab URL.' })
      }
    })
    return true
  }

  if (message?.type === 'CAPTURE_CONVERSATION') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]
      if (!tab?.id) {
        sendResponse({ ok: false, error: 'No active tab is available.' })
        return
      }

      chrome.tabs.sendMessage(tab.id, { type: 'CAPTURE_CONVERSATION' }, (response) => {
        if (chrome.runtime.lastError) {
          sendResponse({ ok: false, error: 'MemVault could not connect to this page.' })
          return
        }
        sendResponse(response)
      })
    })
    return true
  }

  return false
})
