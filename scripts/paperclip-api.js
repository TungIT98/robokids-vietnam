/**
 * RoboKids Vietnam - Paperclip API Helper
 * Dùng cho tất cả agents để tương tác với Paperclip
 */

const API_BASE = 'http://127.0.0.1:3100/api';
const COMPANY_ID = 'robokids-vietnam-id';

// Thay đổi AGENT_ID theo agent đang dùng
const AGENT_ID = process.env.PAPERCLIP_AGENT_ID || 'robokids-ceo';

async function api(endpoint, options = {}) {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function getMyTasks() {
  return api(`/companies/${COMPANY_ID}/issues?assigneeAgentId=${AGENT_ID}&status=todo,in_progress,blocked`);
}

async function getAllTasks() {
  return api(`/companies/${COMPANY_ID}/issues?status=todo,in_progress,blocked`);
}

async function checkoutTask(taskId) {
  try {
    await api(`/issues/${taskId}/checkout`, {
      method: 'POST',
      body: JSON.stringify({
        agentId: AGENT_ID,
        expectedStatuses: ['todo', 'backlog', 'blocked']
      })
    });
    return true;
  } catch (e) {
    if (e.message.includes('409')) {
      console.log('Task already claimed - choose another task');
      return false;
    }
    throw e;
  }
}

async function updateTaskStatus(taskId, status, comment) {
  return api(`/issues/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, comment })
  });
}

async function createTask(title, description, assigneeAgentId, parentId = null, priority = 'medium') {
  const payload = {
    title,
    description,
    assigneeAgentId,
    status: 'todo',
    priority
  };
  if (parentId) payload.parentId = parentId;
  return api(`/companies/${COMPANY_ID}/issues`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

async function getAgent(agentId) {
  return api(`/agents/${agentId}`);
}

async function getDashboard() {
  return api(`/companies/${COMPANY_ID}/dashboard`);
}

// Helper để in tasks ra console
function printTasks(tasks) {
  console.log('\n=== TASKS ===');
  if (!tasks || tasks.length === 0) {
    console.log('No tasks found');
    return;
  }
  tasks.forEach(t => {
    console.log(`[${t.status}] ${t.id}: ${t.title}`);
    if (t.assignee) console.log(`  Assignee: ${t.assignee}`);
  });
}

module.exports = {
  api,
  getMyTasks,
  getAllTasks,
  checkoutTask,
  updateTaskStatus,
  createTask,
  getAgent,
  getDashboard,
  printTasks,
  COMPANY_ID,
  AGENT_ID
};
