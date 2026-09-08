(() => {
  const history = [];
  const messages = document.querySelector('#messages');
  const welcome = document.querySelector('#welcome');
  const form = document.querySelector('#form');
  const input = document.querySelector('#input');
  const send = document.querySelector('#send');
  const newChat = document.querySelector('#new-chat');
  const provider = document.querySelector('#provider');
  const model = document.querySelector('#model');
  const customModelWrap = document.querySelector('#custom-model-wrap');
  const customModel = document.querySelector('#custom-model');
  const models = {
    gemini: ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'],
    openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'],
    'openai-compat': ['gpt-4o-mini', 'gpt-4o', 'กำหนดเอง...'],
  };

  function updateModels() {
    model.replaceChildren(...models[provider.value].map((name) => new Option(name, name)));
    customModelWrap.hidden = provider.value !== 'openai-compat' || model.value !== 'กำหนดเอง...';
  }

  function render(role, content, typing = false) {
    if (welcome) welcome.hidden = true;
    const item = document.createElement('div');
    item.className = `message ${role}`;
    item.innerHTML = `<div class="avatar">${role === 'user' ? 'คุณ' : '✦'}</div><div class="message-body"><div class="message-meta">${role === 'user' ? 'คุณ' : 'AI Desk'}</div><div class="bubble${typing ? ' typing' : ''}">${typing ? '<span></span><span></span><span></span>' : ''}</div></div>`;
    if (!typing) item.querySelector('.bubble').textContent = content;
    messages.appendChild(item);
    messages.scrollTop = messages.scrollHeight;
    return item;
  }

  function clearChat() {
    history.length = 0;
    messages.querySelectorAll('.message').forEach((message) => message.remove());
    welcome.hidden = false;
    input.focus();
  }

  provider.addEventListener('change', updateModels);
  model.addEventListener('change', () => { customModelWrap.hidden = model.value !== 'กำหนดเอง...'; });
  newChat.addEventListener('click', clearChat);
  input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 140)}px`; });
  input.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); } });
  updateModels();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message || send.disabled) return;
    const oldHistory = history.slice();
    render('user', message);
    history.push({ role: 'user', content: message });
    input.value = '';
    input.style.height = 'auto';
    send.disabled = true;
    const typing = render('assistant', '', true);
    const selectedModel = model.value === 'กำหนดเอง...' ? customModel.value.trim() : model.value;
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message, history: oldHistory, provider: provider.value, model: selectedModel || undefined }) });
      const data = await response.json();
      const reply = data.reply || data.error || 'ไม่ได้รับข้อความตอบกลับ';
      typing.remove();
      render('assistant', reply);
      history.push({ role: 'assistant', content: reply });
    } catch {
      typing.remove();
      const reply = 'เชื่อมต่อ backend ไม่สำเร็จ กรุณาลองใหม่';
      render('assistant', reply);
      history.push({ role: 'assistant', content: reply });
    } finally {
      send.disabled = false;
      input.focus();
    }
  });
})();