/* Pelus Salon – Admin Panel JS */
(function () {
  'use strict';

  const API   = pelusAdmin.apiUrl;
  const NONCE = pelusAdmin.nonce;

  const STATUS_LABELS = {
    pending:   'Pendiente',
    confirmed: 'Confirmada',
    cancelled: 'Cancelada',
    completed: 'Completada',
  };

  function api(path, opts = {}) {
    return fetch(API + path, {
      headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': NONCE },
      ...opts,
    }).then(r => r.json());
  }

  // ── APPOINTMENTS ──────────────────────────────────────────────

  function loadAppointments() {
    const date   = document.getElementById('pelus-filter-date')?.value || '';
    const status = document.getElementById('pelus-filter-status')?.value || '';
    let qs = [];
    if (date)   qs.push('date='   + date);
    if (status) qs.push('status=' + status); // note: server doesn't filter by status currently; done client-side
    const query = qs.length ? '?' + qs.join('&') : '';

    const tbl = document.getElementById('pelus-appointments-table');
    if (!tbl) return;
    tbl.innerHTML = '<p style="color:#8b5cf6">Cargando…</p>';

    api('/appointments' + query).then(rows => {
      if (!Array.isArray(rows) || !rows.length) {
        tbl.innerHTML = '<p class="pelus-empty">No hay citas para mostrar.</p>';
        return;
      }

      const filtered = status ? rows.filter(r => r.status === status) : rows;
      if (!filtered.length) { tbl.innerHTML = '<p class="pelus-empty">No hay citas con ese filtro.</p>'; return; }

      tbl.innerHTML = `
        <table class="pelus-table">
          <thead>
            <tr>
              <th>#</th><th>Cliente</th><th>Servicio</th><th>Estilista</th>
              <th>Fecha</th><th>Hora</th><th>Estado</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(a => `
              <tr>
                <td>${a.id}</td>
                <td>
                  <strong>${esc(a.client_name)}</strong><br>
                  <small style="color:#6b7280">${esc(a.client_email)}</small>
                </td>
                <td>${esc(a.service_name)}</td>
                <td>${esc(a.employee_name)}</td>
                <td>${a.date}</td>
                <td>${a.start_time}–${a.end_time}</td>
                <td>
                  <select class="pelus-status-select" onchange="pelusAdminApp.updateStatus(${a.id}, this.value)">
                    ${Object.entries(STATUS_LABELS).map(([val, label]) =>
                      `<option value="${val}" ${a.status === val ? 'selected' : ''}>${label}</option>`
                    ).join('')}
                  </select>
                </td>
                <td>
                  <button class="button button-small" style="color:#dc2626"
                    onclick="pelusAdminApp.deleteAppointment(${a.id})">Eliminar</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>`;
    }).catch(() => {
      tbl.innerHTML = '<p style="color:#dc2626">Error al cargar las citas.</p>';
    });
  }

  function updateStatus(id, status) {
    api('/appointments/' + id, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }).then(() => {
      loadAppointments();
    });
  }

  function deleteAppointment(id) {
    if (!confirm('¿Eliminar esta cita?')) return;
    api('/appointments/' + id, { method: 'DELETE' }).then(loadAppointments);
  }

  // ── SERVICES ──────────────────────────────────────────────────

  function loadServices() {
    const tbl = document.getElementById('pelus-services-table');
    if (!tbl) return;
    api('/services').then(rows => {
      if (!rows.length) { tbl.innerHTML = '<p class="pelus-empty">No hay servicios.</p>'; return; }
      tbl.innerHTML = `
        <table class="pelus-table">
          <thead><tr><th>#</th><th>Nombre</th><th>Duración</th><th>Precio</th><th>Acciones</th></tr></thead>
          <tbody>
            ${rows.map(s => `
              <tr>
                <td>${s.id}</td>
                <td><strong>${esc(s.name)}</strong><br><small style="color:#6b7280">${esc(s.description||'')}</small></td>
                <td>${s.duration} min</td>
                <td>$${parseFloat(s.price).toFixed(2)}</td>
                <td>
                  <button class="button button-small" onclick="pelusAdminApp.openServiceModal(${s.id})">Editar</button>
                  <button class="button button-small" style="color:#dc2626;margin-left:4px"
                    onclick="pelusAdminApp.deleteService(${s.id})">Eliminar</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>`;
      window._pelusServices = rows;
    });
  }

  function openServiceModal(id) {
    const modal = document.getElementById('pelus-service-modal');
    if (!modal) return;
    document.getElementById('svc-id').value = '';
    document.getElementById('svc-name').value = '';
    document.getElementById('svc-desc').value = '';
    document.getElementById('svc-duration').value = '60';
    document.getElementById('svc-price').value = '0';
    document.getElementById('pelus-service-modal-title').textContent = id ? 'Editar servicio' : 'Nuevo servicio';

    if (id) {
      const svc = (window._pelusServices || []).find(s => s.id == id);
      if (svc) {
        document.getElementById('svc-id').value       = svc.id;
        document.getElementById('svc-name').value     = svc.name;
        document.getElementById('svc-desc').value     = svc.description || '';
        document.getElementById('svc-duration').value = svc.duration;
        document.getElementById('svc-price').value    = svc.price;
      }
    }
    modal.style.display = 'flex';
  }

  function closeServiceModal() {
    const modal = document.getElementById('pelus-service-modal');
    if (modal) modal.style.display = 'none';
  }

  function saveService() {
    const id       = document.getElementById('svc-id').value;
    const payload  = {
      name:        document.getElementById('svc-name').value.trim(),
      description: document.getElementById('svc-desc').value.trim(),
      duration:    parseInt(document.getElementById('svc-duration').value),
      price:       parseFloat(document.getElementById('svc-price').value),
    };
    if (!payload.name) { alert('El nombre es requerido.'); return; }

    const req = id
      ? api('/services/' + id, { method: 'PUT', body: JSON.stringify(payload) })
      : api('/services',       { method: 'POST', body: JSON.stringify(payload) });

    req.then(() => { closeServiceModal(); loadServices(); });
  }

  function deleteService(id) {
    if (!confirm('¿Eliminar este servicio?')) return;
    api('/services/' + id, { method: 'DELETE' }).then(loadServices);
  }

  // ── EMPLOYEES ─────────────────────────────────────────────────

  function loadEmployees() {
    const tbl = document.getElementById('pelus-employees-table');
    if (!tbl) return;
    api('/employees').then(rows => {
      if (!rows.length) { tbl.innerHTML = '<p class="pelus-empty">No hay empleados.</p>'; return; }
      tbl.innerHTML = `
        <table class="pelus-table">
          <thead><tr><th>#</th><th>Nombre</th><th>Email</th><th>Especialidad</th><th>Acciones</th></tr></thead>
          <tbody>
            ${rows.map(e => `
              <tr>
                <td>${e.id}</td>
                <td><strong>${esc(e.name)}</strong></td>
                <td>${esc(e.email||'')}</td>
                <td>${esc(e.specialty||'')}</td>
                <td>
                  <button class="button button-small" onclick="pelusAdminApp.openEmployeeModal(${e.id})">Editar</button>
                  <button class="button button-small" style="color:#dc2626;margin-left:4px"
                    onclick="pelusAdminApp.deleteEmployee(${e.id})">Eliminar</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>`;
      window._pelusEmployees = rows;
    });
  }

  function openEmployeeModal(id) {
    const modal = document.getElementById('pelus-employee-modal');
    if (!modal) return;
    document.getElementById('emp-id').value = '';
    document.getElementById('emp-name').value = '';
    document.getElementById('emp-email').value = '';
    document.getElementById('emp-phone').value = '';
    document.getElementById('emp-specialty').value = '';
    document.getElementById('pelus-employee-modal-title').textContent = id ? 'Editar empleado' : 'Nuevo empleado';

    if (id) {
      const emp = (window._pelusEmployees || []).find(e => e.id == id);
      if (emp) {
        document.getElementById('emp-id').value        = emp.id;
        document.getElementById('emp-name').value      = emp.name;
        document.getElementById('emp-email').value     = emp.email || '';
        document.getElementById('emp-phone').value     = emp.phone || '';
        document.getElementById('emp-specialty').value = emp.specialty || '';
      }
    }
    modal.style.display = 'flex';
  }

  function closeEmployeeModal() {
    const modal = document.getElementById('pelus-employee-modal');
    if (modal) modal.style.display = 'none';
  }

  function saveEmployee() {
    const id      = document.getElementById('emp-id').value;
    const payload = {
      name:      document.getElementById('emp-name').value.trim(),
      email:     document.getElementById('emp-email').value.trim(),
      phone:     document.getElementById('emp-phone').value.trim(),
      specialty: document.getElementById('emp-specialty').value.trim(),
    };
    if (!payload.name) { alert('El nombre es requerido.'); return; }

    const req = id
      ? api('/employees/' + id, { method: 'PUT', body: JSON.stringify(payload) })
      : api('/employees',       { method: 'POST', body: JSON.stringify(payload) });

    req.then(() => { closeEmployeeModal(); loadEmployees(); });
  }

  function deleteEmployee(id) {
    if (!confirm('¿Eliminar este empleado?')) return;
    api('/employees/' + id, { method: 'DELETE' }).then(loadEmployees);
  }

  // ── Utils ─────────────────────────────────────────────────────

  function esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Init ──────────────────────────────────────────────────────

  window.pelusAdminApp = {
    loadAppointments, updateStatus, deleteAppointment,
    openServiceModal, closeServiceModal, saveService, deleteService,
    openEmployeeModal, closeEmployeeModal, saveEmployee, deleteEmployee,
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('pelus-appointments-table')) loadAppointments();
    if (document.getElementById('pelus-services-table'))    loadServices();
    if (document.getElementById('pelus-employees-table'))   loadEmployees();
  });

})();
