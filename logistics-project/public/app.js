const API = '/api';

// ---------- Tab switching ----------
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'metrics') loadMetrics();
  });
});

function showMessage(elId, text, isError) {
  const el = document.getElementById(elId);
  el.textContent = text;
  el.className = 'message ' + (isError ? 'error' : 'success');
}

// ---------- Locations ----------
async function loadLocations() {
  const res = await fetch(`${API}/locations`);
  const locations = await res.json();

  const tbody = document.querySelector('#locations-table tbody');
  tbody.innerHTML = locations
    .map(
      (l) => `<tr>
        <td>${l.id}</td><td>${l.name}</td>
        <td>${new Date(l.created_at).toLocaleString()}</td>
        <td><button class="icon-btn" onclick="deleteLocation(${l.id})">Delete</button></td>
      </tr>`
    )
    .join('');

  const selects = ['conn-from', 'conn-to', 'route-from', 'route-to', 'reachable-from', 'task-location'];
  selects.forEach((id) => {
    const sel = document.getElementById(id);
    const current = sel.value;
    sel.innerHTML =
      '<option value="">Select location…</option>' +
      locations.map((l) => `<option value="${l.id}">${l.name} </option>`).join('');
    if (current) sel.value = current;
  });

  return locations;
}

document.getElementById('location-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('location-name').value.trim();
  const res = await fetch(`${API}/locations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  const data = await res.json();
  if (res.ok) {
    showMessage('location-message', `Added "${data.name}"`, false);
    document.getElementById('location-name').value = '';
    loadLocations();
  } else {
    showMessage('location-message', data.error, true);
  }
});

async function deleteLocation(id) {
  const res = await fetch(`${API}/locations/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (res.ok) loadLocations();
  else alert(data.error);
}

// ---------- Connections ----------
async function loadConnections() {
  const res = await fetch(`${API}/connections`);
  const connections = await res.json();
  const tbody = document.querySelector('#connections-table tbody');
  tbody.innerHTML = connections
    .map(
      (c) => `<tr>
        <td>${c.id}</td><td>${c.from_name}</td><td>${c.to_name}</td>
        <td>${c.weight}</td><td>${c.bidirectional ? 'Yes' : 'No'}</td>
        <td><button class="icon-btn" onclick="deleteConnection(${c.id})">Delete</button></td>
      </tr>`
    )
    .join('');
}

document.getElementById('connection-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    fromId: Number(document.getElementById('conn-from').value),
    toId: Number(document.getElementById('conn-to').value),
    weight: Number(document.getElementById('conn-weight').value),
    bidirectional: document.getElementById('conn-bidirectional').checked
  };
  const res = await fetch(`${API}/connections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (res.ok) {
    showMessage('connection-message', `Connection #${data.id} created.`, false);
    loadConnections();
  } else {
    showMessage('connection-message', data.error, true);
  }
});

async function deleteConnection(id) {
  const res = await fetch(`${API}/connections/${id}`, { method: 'DELETE' });
  if (res.ok) loadConnections();
}

// ---------- Route finder ----------
document.getElementById('route-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const from = document.getElementById('route-from').value;
  const to = document.getElementById('route-to').value;
  const box = document.getElementById('route-result');
  box.textContent = 'Calculating…';
  const res = await fetch(`${API}/route?from=${from}&to=${to}`);
  const data = await res.json();
  if (!res.ok) {
    box.textContent = `Error: ${data.error}`;
    return;
  }
  box.textContent = data.reachable
    ? `Distance: ${data.distance}\nPath: ${data.path.join(' → ')}\n(from cache: ${data.fromCache})`
    : `No route exists between these locations.`;
});

document.getElementById('reachable-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const from = document.getElementById('reachable-from').value;
  const box = document.getElementById('reachable-result');
  const res = await fetch(`${API}/reachable/${from}`);
  const data = await res.json();
  if (!res.ok) {
    box.textContent = `Error: ${data.error}`;
    return;
  }
  box.textContent = data.reachableCount
    ? `${data.reachableCount} reachable location(s):\n` + data.reachable.map((r) => `• ${r.name}`).join('\n')
    : 'No other locations are reachable from here.';
});

// ---------- Tasks ----------
async function loadTasks() {
  const res = await fetch(`${API}/tasks`);
  const tasks = await res.json();
  const tbody = document.querySelector('#tasks-table tbody');
  tbody.innerHTML = tasks
    .map(
      (t, i) => `<tr>
        <td>${i + 1}</td><td>${t.location_name}</td><td>${t.description || '—'}</td>
        <td>${t.priority}</td><td>${t.deadline ? new Date(t.deadline).toLocaleString() : '—'}</td>
        <td><button class="icon-btn" onclick="markDone(${t.id})">Mark done</button></td>
      </tr>`
    )
    .join('');
}

document.getElementById('task-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    locationId: Number(document.getElementById('task-location').value),
    description: document.getElementById('task-description').value.trim() || null,
    priority: Number(document.getElementById('task-priority').value),
    deadline: document.getElementById('task-deadline').value || null
  };
  const res = await fetch(`${API}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (res.ok) {
    showMessage('task-message', `Task #${data.id} added.`, false);
    e.target.reset();
    loadTasks();
  } else {
    showMessage('task-message', data.error, true);
  }
});

async function markDone(id) {
  await fetch(`${API}/tasks/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'done' })
  });
  loadTasks();
}

// ---------- Bulk import ----------
let currentImportJobId = null;
let importPollTimer = null;

document.getElementById('import-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fileInput = document.getElementById('import-file');
  if (!fileInput.files.length) return;

  const formData = new FormData();
  formData.append('file', fileInput.files[0]);

  showMessage('import-message', 'Uploading…', false);
  const res = await fetch(`${API}/bulk-import`, { method: 'POST', body: formData });
  const data = await res.json();
  if (!res.ok) {
    showMessage('import-message', data.error, true);
    return;
  }
  currentImportJobId = data.jobId;
  showMessage('import-message', `Job #${data.jobId} started.`, false);
  document.getElementById('import-status-card').style.display = 'block';
  pollImportStatus();
});

async function pollImportStatus() {
  if (!currentImportJobId) return;
  const res = await fetch(`${API}/bulk-import/${currentImportJobId}`);
  const job = await res.json();
  const el = document.getElementById('import-status');
  el.innerHTML = `
    <p><strong>Status:</strong> ${job.status}</p>
    <p><strong>Processed:</strong> ${job.processed} &nbsp; <strong>Success:</strong> ${job.success} &nbsp; <strong>Failed:</strong> ${job.failed}</p>
    <p><strong>Rows/sec:</strong> ${job.rows_per_sec ?? '—'}</p>
    ${job.sampleErrors.length ? `<p><strong>Sample errors:</strong></p><ul>${job.sampleErrors.map((er) => `<li>Row ${er.row_number}: ${er.error_message}</li>`).join('')}</ul>` : ''}
  `;
  clearTimeout(importPollTimer);
  if (job.status === 'running') {
    importPollTimer = setTimeout(pollImportStatus, 1500);
  } else {
    loadLocations();
    loadTasks();
  }
}

document.getElementById('cancel-import-btn').addEventListener('click', async () => {
  if (!currentImportJobId) return;
  await fetch(`${API}/bulk-import/${currentImportJobId}/cancel`, { method: 'POST' });
});

// ---------- Bulk route ----------
document.getElementById('bulk-route-btn').addEventListener('click', async () => {
  const raw = document.getElementById('bulk-route-input').value.trim();
  const box = document.getElementById('bulk-route-result');
  if (!raw) return;

  const pairs = raw
    .split('\n')
    .map((line) => line.split(',').map((s) => Number(s.trim())))
    .filter(([from, to]) => from && to)
    .map(([from, to]) => ({ from, to }));

  if (!pairs.length) {
    box.textContent = 'No valid "from,to" pairs found.';
    return;
  }

  box.textContent = `Calculating ${pairs.length} route(s)…`;
  const res = await fetch(`${API}/bulk-route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pairs })
  });
  const data = await res.json();
  if (!res.ok) {
    box.textContent = `Error: ${data.error}`;
    return;
  }
  const lines = data.results.map((r) =>
    r.error
      ? `${r.from} → ${r.to}: ERROR (${r.error})`
      : r.reachable
      ? `${r.from} → ${r.to}: distance ${r.distance}`
      : `${r.from} → ${r.to}: unreachable`
  );
  box.textContent = `Computed in ${data.durationMs}ms${data.stale ? ' (⚠ graph changed mid-computation)' : ''}\n\n` + lines.join('\n');
});

// ---------- Metrics ----------
async function loadMetrics() {
  const res = await fetch(`${API}/metrics`);
  const data = await res.json();
  document.getElementById('metrics-output').textContent = JSON.stringify(data, null, 2);
}
document.getElementById('refresh-metrics-btn').addEventListener('click', loadMetrics);

// ---------- Init ----------
loadLocations();
loadConnections();
loadTasks();
