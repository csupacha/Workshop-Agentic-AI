(() => {
  const history = [], messages = document.querySelector('#messages'), form = document.querySelector('#form'), input = document.querySelector('#input'), provider = document.querySelector('#provider'), model = document.querySelector('#model'), customModelWrap = document.querySelector('#custom-model-wrap'), customModel = document.querySelector('#custom-model');
  const models = { gemini: ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'], openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'], 'openai-compat': ['gpt-4o-mini', 'gpt-4o', 'กำหนดเอง...'] };
  function updateModels() {
    model.replaceChildren(...models[provider.value].map((name) => new Option(name, name)));
    customModelWrap.hidden = provider.value !== 'openai-compat' || model.value !== 'กำหนดเอง...';
  }
  provider.addEventListener('change', updateModels);
  model.addEventListener('change', () => { customModelWrap.hidden = model.value !== 'กำหนดเอง...'; });
  updateModels();
  function render(role, content) { const bubble = document.createElement('div'); bubble.className = `bubble ${role}`; bubble.textContent = content; messages.appendChild(bubble); messages.scrollTop = messages.scrollHeight; }
  form.addEventListener('submit', async (event) => { event.preventDefault(); const message = input.value.trim(); if (!message) return; render('user', message); input.value = ''; const oldHistory = history.slice(); history.push({ role: 'user', content: message });
    const selectedModel = model.value === 'กำหนดเอง...' ? customModel.value.trim() : model.value;
    try { const response = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message, history: oldHistory, provider: provider.value, model: selectedModel || undefined }) }); const data = await response.json(); const reply = data.reply || data.error || 'ไม่ได้รับข้อความตอบกลับ'; render('assistant', reply); history.push({ role: 'assistant', content: reply }); }
    catch { const reply = 'เชื่อมต่อ backend ไม่สำเร็จ กรุณาลองใหม่'; render('assistant', reply); history.push({ role: 'assistant', content: reply }); }
  });
})();