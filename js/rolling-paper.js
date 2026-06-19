/**
 * 츄르단 롤링페이퍼 — Netlify 서버 공유 저장
 * 관리자만 수정·삭제 (ROLLING_PAPER_ADMIN_KEY)
 */
(function () {
  const API_URL = '/.netlify/functions/rolling-paper';
  const ADMIN_SESSION_KEY = 'churudan_rp_admin_v1';
  const MAX_LENGTH = 300;
  const MIN_LENGTH = 2;
  const SUBMIT_COOLDOWN_MS = 15000;

  let messages = [];
  let adminKey = '';
  let lastSubmitAt = 0;

  document.addEventListener('DOMContentLoaded', initRollingPaper);

  function initRollingPaper() {
    const form = document.getElementById('rollingPaperForm');
    const board = document.getElementById('rollingPaperBoard');
    if (!form || !board) return;

    adminKey = sessionStorage.getItem(ADMIN_SESSION_KEY) || '';
    updateAdminUi();

    form.addEventListener('submit', onSubmit);

    const adminForm = document.getElementById('rollingPaperAdminForm');
    if (adminForm) {
      adminForm.addEventListener('submit', onAdminLogin);
    }

    const logoutBtn = document.getElementById('rollingPaperAdminLogout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', onAdminLogout);
    }

    loadMessages();
  }

  function updateAdminUi() {
    const panel = document.getElementById('rollingPaperAdminPanel');
    const loginFields = document.getElementById('rollingPaperAdminLogin');
    const loggedIn = document.getElementById('rollingPaperAdminLoggedIn');
    const logoutBtn = document.getElementById('rollingPaperAdminLogout');

    if (!panel) return;

    const isLoggedIn = Boolean(adminKey);
    panel.classList.toggle('rolling-paper__admin--active', isLoggedIn);
    if (loginFields) loginFields.hidden = isLoggedIn;
    if (loggedIn) loggedIn.hidden = !isLoggedIn;
    if (logoutBtn) logoutBtn.hidden = !isLoggedIn;
  }

  function formatDate(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  }

  function setStatus(text, type) {
    const el = document.getElementById('rollingPaperStatus');
    if (!el) return;
    el.textContent = text || '';
    el.classList.remove('rolling-paper__status--error', 'rolling-paper__status--ok');
    if (type) el.classList.add(`rolling-paper__status--${type}`);
  }

  function updateCount() {
    const el = document.getElementById('rollingPaperCount');
    if (el) el.textContent = `${messages.length}개의 쪽지`;
  }

  function adminHeaders() {
    if (!adminKey) return {};
    return { Authorization: `Bearer ${adminKey}` };
  }

  async function apiFetch(method, body) {
    const options = {
      method,
      headers: {
        Accept: 'application/json',
        ...adminHeaders(),
      },
    };

    if (body !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    const res = await fetch(API_URL, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || 'request failed');
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  async function loadMessages() {
    setStatus('메시지를 불러오는 중…');

    try {
      const data = await apiFetch('GET');
      messages = Array.isArray(data.messages) ? data.messages : [];
      setStatus('');
      renderMessages();
    } catch (err) {
      messages = [];
      renderMessages();
      if (location.protocol === 'file:') {
        setStatus('파일로 열면 서버에 연결되지 않습니다. Netlify에 배포한 사이트에서 이용해 주세요.', 'error');
      } else {
        setStatus('롤링페이퍼 서버에 연결할 수 없습니다. deploy.bat 실행 후 netlify-deploy 폴더를 다시 올려 주세요.', 'error');
      }
    }
  }

  function renderMessages() {
    const board = document.getElementById('rollingPaperBoard');
    const empty = document.getElementById('rollingPaperEmpty');
    if (!board || !empty) return;

    board.querySelectorAll('.rolling-paper__note').forEach((node) => node.remove());
    updateCount();

    if (!messages.length) {
      empty.hidden = false;
      return;
    }

    empty.hidden = true;

    messages.forEach((msg) => {
      const note = document.createElement('article');
      const color = Number(msg.color) || 0;
      note.className = `rolling-paper__note rolling-paper__note--${color % 5}`;
      note.dataset.id = msg.id;

      const text = document.createElement('p');
      text.className = 'rolling-paper__note-text';
      text.textContent = msg.text;

      const meta = document.createElement('p');
      meta.className = 'rolling-paper__note-meta';
      const edited = msg.updatedAt ? ' · 수정됨' : '';
      meta.textContent = `익명의 츄르단 · ${formatDate(msg.createdAt)}${edited}`;

      note.appendChild(text);
      note.appendChild(meta);

      if (adminKey) {
        const actions = document.createElement('div');
        actions.className = 'rolling-paper__note-actions';

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'rolling-paper__note-btn';
        editBtn.textContent = '수정';
        editBtn.addEventListener('click', () => editMessage(msg));

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'rolling-paper__note-btn rolling-paper__note-btn--danger';
        deleteBtn.textContent = '삭제';
        deleteBtn.addEventListener('click', () => deleteMessage(msg.id));

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        note.appendChild(actions);
      }

      board.appendChild(note);
    });
  }

  async function onSubmit(e) {
    e.preventDefault();

    const textarea = document.getElementById('rollingPaperMessage');
    const submitBtn = document.getElementById('rollingPaperSubmit');
    if (!textarea || !submitBtn) return;

    const text = textarea.value.trim().slice(0, MAX_LENGTH);
    if (text.length < MIN_LENGTH) {
      setStatus('메시지를 2자 이상 입력해 주세요.', 'error');
      return;
    }

    const now = Date.now();
    if (now - lastSubmitAt < SUBMIT_COOLDOWN_MS) {
      setStatus('잠시 후 다시 시도해 주세요.', 'error');
      return;
    }

    submitBtn.disabled = true;
    setStatus('등록 중…');

    try {
      const data = await apiFetch('POST', { text });
      if (data.message) {
        messages.unshift(data.message);
      }
      messages = messages.slice(0, 200);
      textarea.value = '';
      setStatus('응원 쪽지가 붙었어요! 고마워요 ♥', 'ok');
      renderMessages();
      lastSubmitAt = now;
    } catch {
      setStatus('등록에 실패했습니다. 잠시 후 다시 시도해 주세요.', 'error');
    } finally {
      submitBtn.disabled = false;
    }
  }

  async function onAdminLogin(e) {
    e.preventDefault();
    const input = document.getElementById('rollingPaperAdminKey');
    if (!input) return;

    const key = input.value.trim();
    if (!key) {
      setStatus('관리자 비밀번호를 입력해 주세요.', 'error');
      return;
    }

    setStatus('관리자 확인 중…');

    try {
      await apiFetch('POST', { action: 'verifyAdmin', adminKey: key });
      adminKey = key;
      sessionStorage.setItem(ADMIN_SESSION_KEY, adminKey);
      input.value = '';
      updateAdminUi();
      renderMessages();
      setStatus('관리자 모드입니다. 쪽지 수정·삭제가 가능합니다.', 'ok');
    } catch (err) {
      if (err.status === 401) {
        setStatus('관리자 비밀번호가 올바르지 않습니다.', 'error');
        return;
      }
      if (err.status === 503) {
        setStatus('관리자 비밀번호가 설정되지 않았습니다. admin-config.mjs에 비밀번호를 넣고 다시 배포해 주세요.', 'error');
        return;
      }
      setStatus('관리자 확인에 실패했습니다. 서버 설정을 확인해 주세요.', 'error');
    }
  }

  function onAdminLogout() {
    adminKey = '';
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    updateAdminUi();
    renderMessages();
    setStatus('관리자 모드가 해제되었습니다.');
  }

  async function editMessage(msg) {
    const next = window.prompt('메시지 수정', msg.text);
    if (next === null) return;

    const text = next.trim().slice(0, MAX_LENGTH);
    if (text.length < MIN_LENGTH) {
      setStatus('메시지는 2자 이상이어야 합니다.', 'error');
      return;
    }

    try {
      const data = await apiFetch('PUT', { id: msg.id, text });
      const index = messages.findIndex((item) => item.id === msg.id);
      if (index >= 0 && data.message) {
        messages[index] = data.message;
      }
      renderMessages();
      setStatus('쪽지를 수정했습니다.', 'ok');
    } catch (err) {
      if (err.status === 401) {
        onAdminLogout();
        setStatus('관리자 세션이 만료되었습니다. 다시 로그인해 주세요.', 'error');
        return;
      }
      setStatus('수정에 실패했습니다.', 'error');
    }
  }

  async function deleteMessage(id) {
    if (!window.confirm('이 쪽지를 삭제할까요?')) return;

    try {
      await apiFetch('DELETE', { id });
      messages = messages.filter((item) => item.id !== id);
      renderMessages();
      setStatus('쪽지를 삭제했습니다.', 'ok');
    } catch (err) {
      if (err.status === 401) {
        onAdminLogout();
        setStatus('관리자 세션이 만료되었습니다. 다시 로그인해 주세요.', 'error');
        return;
      }
      setStatus('삭제에 실패했습니다.', 'error');
    }
  }
})();
