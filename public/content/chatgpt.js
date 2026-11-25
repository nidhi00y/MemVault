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

  function getRole(element) {
    let current = element
    while (current && current !== document.body) {
      const role = current.getAttribute('data-message-author-role')
      if (role === 'user' || role === 'assistant') return role

      const labels = [
        current.getAttribute('aria-label'),
        current.getAttribute('data-testid'),
        current.className?.baseVal,
        typeof current.className === 'string' ? current.className : '',
      ]
      const label = labels.filter(Boolean).join(' ').toLowerCase()
      if (/\b(user|you)\b|user-message-bubble/.test(label)) return 'user'
      if (/\b(assistant|chatgpt)\b|markdown/.test(label)) return 'assistant'
      current = current.parentElement
    }
    return null
  }

  function collectMessages(elements) {
    const candidates = [...elements]
      .filter((element) => isOnScreen(element))
      .map((element) => ({
        element,
        content: getMessageText(element),
        position: element.getBoundingClientRect().top,
      }))
      .filter(({ content }) => content.length >= 2 && content.length < 30000)
      .sort((first, second) => first.position - second.position)

    const unique = candidates.filter((candidate, index) => (
      !candidates.some((other, otherIndex) => (
        otherIndex !== index &&
        other.content === candidate.content &&
        other.element.contains(candidate.element)
      ))
    ))
    const messages = []
    const seen = new Set()
    let nextFallbackRole = 'user'

    unique.forEach(({ element, content }) => {
      const detectedRole = getRole(element)
      const role = detectedRole || nextFallbackRole
      nextFallbackRole = role === 'user' ? 'assistant' : 'user'
      const key = `${role}:${content}`
      if (seen.has(key)) return
      seen.add(key)

      const previous = messages[messages.length - 1]

      if (previous?.role === role && previous.content === content) return
      messages.push({ role, content })
    })

    return messages
  }

  function getMessages() {
    const root = document.querySelector('main') || document.body
    const selectorGroups = [
      '[data-message-author-role]',
      '[data-testid*="conversation-turn"]',
      'article, [role="article"]',
      '[dir="auto"], .markdown, p',
    ]

    for (const selector of selectorGroups) {
      const elements = [...root.querySelectorAll(selector)]
      const messages = collectMessages(elements)
      if (messages.length) return messages
    }
    return []
  }

  function getStatus() {
    const title = document.title?.replace(/ - ChatGPT$/, '').trim()
    const messages = getMessages()

    return {
      platform: 'ChatGPT',
      hasConversation: messages.length > 0,
      title: title && title !== 'ChatGPT' ? title : null,
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
          : 'MemVault could not recognize visible messages on this page. Refresh the ChatGPT tab, then try again.',
      })
      return true
    }

    return false
  })
})()
