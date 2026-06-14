import { getStore } from './lib/main.js';
import { ADMIN_KEY as LOCAL_ADMIN_KEY } from './admin-config.mjs';

const STORE_NAME = 'rolling-paper';
const BLOB_KEY = 'messages';
const MAX_MESSAGES = 200;
const MAX_LENGTH = 300;
const MIN_LENGTH = 2;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

async function readMessages(store) {
  const data = await store.get(BLOB_KEY, { type: 'json' });
  return Array.isArray(data) ? data : [];
}

async function writeMessages(store, messages) {
  await store.setJSON(BLOB_KEY, messages.slice(0, MAX_MESSAGES));
}

function getAdminKey(req, body) {
  const auth = req.headers.get('authorization') || '';
  if (auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  const headerKey = req.headers.get('x-admin-key');
  if (headerKey) return headerKey.trim();
  if (body?.adminKey) return String(body.adminKey).trim();
  return '';
}

function getExpectedAdminKey() {
  return (
    Netlify.env.get('ROLLING_PAPER_ADMIN_KEY')
    || (typeof process !== 'undefined' ? process.env?.ROLLING_PAPER_ADMIN_KEY : '')
    || LOCAL_ADMIN_KEY
    || ''
  );
}

function isAdmin(key) {
  const expected = getExpectedAdminKey();
  if (!expected) return false;
  return Boolean(key) && key === expected;
}

function unauthorized() {
  return jsonResponse({ error: 'unauthorized' }, 401);
}

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  let store;
  try {
    store = getStore({ name: STORE_NAME, consistency: 'strong' });
  } catch (err) {
    return jsonResponse({ error: 'storage unavailable', detail: String(err?.message || err) }, 500);
  }

  if (req.method === 'GET') {
    try {
      const messages = await readMessages(store);
      return jsonResponse({ messages });
    } catch (err) {
      return jsonResponse({ error: 'read failed', detail: String(err?.message || err) }, 500);
    }
  }

  let body = {};
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
    try {
      body = await req.json();
    } catch {
      body = {};
    }
  }

  if (req.method === 'POST' && body?.action === 'verifyAdmin') {
    if (!getExpectedAdminKey()) {
      return jsonResponse({ error: 'admin not configured' }, 503);
    }
    if (!isAdmin(getAdminKey(req, body))) {
      return unauthorized();
    }
    return jsonResponse({ ok: true });
  }

  if (req.method === 'POST') {
    const text = String(body?.text || '').trim().slice(0, MAX_LENGTH);
    if (text.length < MIN_LENGTH) {
      return jsonResponse({ error: 'message too short' }, 400);
    }

    try {
      const messages = await readMessages(store);
      const entry = {
        id: crypto.randomUUID(),
        text,
        createdAt: new Date().toISOString(),
        color: Math.floor(Math.random() * 5),
      };

      messages.unshift(entry);
      await writeMessages(store, messages);
      return jsonResponse({ ok: true, message: entry }, 201);
    } catch (err) {
      return jsonResponse({ error: 'write failed', detail: String(err?.message || err) }, 500);
    }
  }

  if (req.method === 'PUT') {
    if (!isAdmin(getAdminKey(req, body))) {
      return unauthorized();
    }

    const id = String(body?.id || '').trim();
    const text = String(body?.text || '').trim().slice(0, MAX_LENGTH);
    if (!id) return jsonResponse({ error: 'missing id' }, 400);
    if (text.length < MIN_LENGTH) return jsonResponse({ error: 'message too short' }, 400);

    try {
      const messages = await readMessages(store);
      const index = messages.findIndex((item) => item.id === id);
      if (index < 0) return jsonResponse({ error: 'not found' }, 404);

      messages[index] = {
        ...messages[index],
        text,
        updatedAt: new Date().toISOString(),
      };
      await writeMessages(store, messages);
      return jsonResponse({ ok: true, message: messages[index] });
    } catch (err) {
      return jsonResponse({ error: 'update failed', detail: String(err?.message || err) }, 500);
    }
  }

  if (req.method === 'DELETE') {
    if (!isAdmin(getAdminKey(req, body))) {
      return unauthorized();
    }

    const id = String(body?.id || '').trim();
    if (!id) return jsonResponse({ error: 'missing id' }, 400);

    try {
      const messages = await readMessages(store);
      const next = messages.filter((item) => item.id !== id);
      if (next.length === messages.length) {
        return jsonResponse({ error: 'not found' }, 404);
      }
      await writeMessages(store, next);
      return jsonResponse({ ok: true, id });
    } catch (err) {
      return jsonResponse({ error: 'delete failed', detail: String(err?.message || err) }, 500);
    }
  }

  return jsonResponse({ error: 'method not allowed' }, 405);
};
