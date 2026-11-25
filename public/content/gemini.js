(() => {
  function isOnScreen(element) {
    const bounds = element.getBoundingClientRect()
    return bounds.width > 0 &&
      bounds.height > 0 &&
      bounds.bottom > 0 &&
      bounds.right > 0 &&
      bounds.top < window.innerHeight &&
      bounds.left < window.innerWidth
  }

  function getMessageText(element) {
    const copy = element.cloneNode(true)
    copy.querySelectorAll(
      'button, textarea, input, form, nav, svg, [contenteditable="true"], [role="toolbar"]',
    ).forEach((item) => item.remove())
    return (copy.innerText || copy.textContent || '').trim()
  }

  function getMessages() {
    const root = document.querySelector('main') || document.body
    const messages = []
    const seen = new Set()
    const selectors = [
      {
        selector: 'user-query, [data-test-id*="user-query"], [data-testid*="user-query"]',
        role: 'user',
      },
      {
        selector: 'model-response, [data-test-id*="model-response"], [data-testid*="model-response"]',
        role: 'assistant',
      },
    ]

    selectors.forEach(({ selector, role }) => {
      root.querySelectorAll(selector).forEach((element) => {
        if (!isOnScreen(element)) return

        const content = getMessageText(element)
        const key = `${role}:${content}`
        if (content && !seen.has(key)) {
          seen.add(key)
          messages.push({
            role,
            content,
            position: element.getBoundingClientRect().top,
          })
        }
      })
    })

    return messages
      .sort((first, second) => first.position - second.position)
      .map(({ role, content }) => ({ role, content }))
  }

  function getStatus() {
    const title = document.title?.replace(/ - Google Gemini$/, '').trim()
    const messages = getMessages()
    return {
      platform: 'Gemini',
      hasConversation: messages.length > 0,
      title: title && title !== 'Gemini' ? title : null,
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'GET_PLATFORM_STATUS') {
      sendResponse(getStatus())
      return true
    }

    if (message?.type === 'CAPTURE_CONVERSATION') {
      const status = getStatus()
      const messages = getMessages()
      sendResponse({
        ok: messages.length > 0,
        platform: status.platform,
        title: status.title,
        messages,
        message: messages.length > 0
          ? `Found ${messages.length} visible message${messages.length === 1 ? '' : 's'}.`
          : 'No user or assistant messages are visible. Scroll to the messages you want to view and try again.',
      })
      return true
    }

    return false
  })
})()
