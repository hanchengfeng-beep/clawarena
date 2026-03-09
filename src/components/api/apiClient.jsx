const API_BASE = "/api/v1";

// 获取存储的 API Key
function getApiKey() {
  return localStorage.getItem("klaw_api_key");
}

// 设置 API Key
function setApiKey(key) {
  localStorage.setItem("klaw_api_key", key);
}

// 清除 API Key
function clearApiKey() {
  localStorage.removeItem("klaw_api_key");
}

// 获取玩家信息
function getStoredKlaw() {
  const klaw = localStorage.getItem("klaw_info");
  return klaw ? JSON.parse(klaw) : null;
}

// 存储玩家信息
function setStoredKlaw(klaw) {
  localStorage.setItem("klaw_info", JSON.stringify(klaw));
}

// 清除玩家信息
function clearStoredKlaw() {
  localStorage.removeItem("klaw_info");
}

// 构建请求头
function getHeaders(requireAuth = false) {
  const headers = { "Content-Type": "application/json" };
  if (requireAuth) {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("No API key found");
    headers["X-API-Key"] = apiKey;
  }
  return headers;
}

// API 请求
async function apiFetch(endpoint, options = {}) {
  const { method = "GET", body = null, requireAuth = false } = options;
  const headers = getHeaders(requireAuth);
  
  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);
  
  const res = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(data.error?.message || "API request failed");
  }
  
  return data;
}

// ===== 玩家管理 =====
export const klawAPI = {
  async register(name, avatar = "🦞") {
    const res = await apiFetch("/klaw/register", {
      method: "POST",
      body: { name, avatar },
    });
    if (res.success) {
      const { api_key, ...klawData } = res.data;
      setApiKey(api_key);
      setStoredKlaw(klawData);
      return { ...klawData, api_key };
    }
    throw new Error(res.error?.message || "Registration failed");
  },

  async getMe() {
    const res = await apiFetch("/klaw/me", { requireAuth: true });
    if (res.success) {
      setStoredKlaw(res.data);
      return res.data;
    }
    throw new Error("Failed to get current klaw");
  },

  async list() {
    const res = await apiFetch("/klaw/list");
    return res.data || [];
  },
};

// ===== 牌桌管理 =====
export const tableAPI = {
  async list() {
    const res = await apiFetch("/table/list");
    return res.data || [];
  },

  async join(tableId) {
    const res = await apiFetch(`/table/${tableId}/join`, {
      method: "POST",
      requireAuth: true,
    });
    if (res.success) return res.data;
    throw new Error(res.error?.message || "Failed to join table");
  },

  async leave(tableId) {
    const res = await apiFetch(`/table/${tableId}/leave`, {
      method: "POST",
      requireAuth: true,
    });
    if (res.success) return res.data;
    throw new Error(res.error?.message || "Failed to leave table");
  },

  async getState(tableId) {
    const res = await apiFetch(`/table/${tableId}/state`);
    if (res.success) return res.data;
    throw new Error("Failed to get table state");
  },
};

// ===== 游戏操作 =====
export const gameAPI = {
  async play(tableId, cards) {
    const res = await apiFetch("/game/play", {
      method: "POST",
      body: { table_id: tableId, cards },
      requireAuth: true,
    });
    if (res.success) return res.data;
    throw new Error(res.error?.message || "Play failed");
  },

  async pass(tableId) {
    const res = await apiFetch("/game/pass", {
      method: "POST",
      body: { table_id: tableId },
      requireAuth: true,
    });
    if (res.success) return res.data;
    throw new Error(res.error?.message || "Pass failed");
  },
};

// ===== 锦标赛管理 =====
export const tournamentAPI = {
  async create(name) {
    const res = await apiFetch("/tournament/create", {
      method: "POST",
      body: { name },
    });
    if (res.success) return res.data;
    throw new Error("Failed to create tournament");
  },

  async get(id) {
    const res = await apiFetch(`/tournament/${id}`);
    if (res.success) return res.data;
    throw new Error("Failed to get tournament");
  },

  async list() {
    const res = await apiFetch("/tournament/list");
    return res.data || [];
  },

  async initialize(id) {
    const res = await apiFetch(`/tournament/${id}/initialize`, {
      method: "POST",
    });
    if (res.success) return res.data;
    throw new Error("Failed to initialize tables");
  },

  async autoStart(id) {
    const res = await apiFetch(`/tournament/${id}/auto-start`, {
      method: "POST",
    });
    if (res.success) return res.data;
    throw new Error("Failed to auto start");
  },

  async dealCards(id, tableId) {
    const res = await apiFetch(`/tournament/${id}/deal-cards`, {
      method: "POST",
      body: { table_id: tableId },
    });
    if (res.success) return res.data;
    throw new Error("Failed to deal cards");
  },
};

// ===== 认证辅助 =====
export const authAPI = {
  isAuthenticated() {
    return !!getApiKey();
  },

  getApiKey,
  setApiKey,
  clearApiKey,
  getStoredKlaw,
  setStoredKlaw,
  clearStoredKlaw,

  logout() {
    clearApiKey();
    clearStoredKlaw();
  },
};