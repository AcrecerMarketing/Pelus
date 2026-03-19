/* Pelus Salon – Booking Widget
   Vanilla JS, zero dependencies, mounts into #pelus-booking-app */
(function () {
  'use strict';

  const API   = pelusBooking.apiUrl;
  const NONCE = pelusBooking.nonce;
  const CUR   = pelusBooking.currency || '$';

  const state = {
    step: 1,          // 1 service · 2 employee+date+slot · 3 contact · 4 confirm
    services:  [],
    employees: [],
    slots:     [],
    selected: {
      service:   null,
      employee:  null,
      date:      '',
      slot:      null,
      name:      '',
      email:     '',
      phone:     '',
      notes:     '',
    },
    loading: false,
    error:   '',
    success: false,
  };

  // ── Utils ─────────────────────────────────────────────────────

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }

  function api(path, opts = {}) {
    return fetch(API + path, {
      headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': NONCE },
      ...opts,
    }).then(r => r.json());
  }

  function fmt(price) { return CUR + parseFloat(price).toFixed(2); }

  function minDate() {
    return new Date().toISOString().split('T')[0];
  }

  // ── Render ────────────────────────────────────────────────────

  function render() {
    const root = document.getElementById('pelus-booking-app');
    if (!root) return;

    if (state.success) { root.innerHTML = renderSuccess(); return; }

    root.innerHTML = `
      ${renderSteps()}
      ${state.error ? `<div class="pelus-error">${state.error}</div>` : ''}
      ${state.loading ? renderLoader() : renderStep()}
    `;
    attachEvents();
  }

  function renderSteps() {
    const labels = ['Servicio', 'Horario', 'Datos', 'Confirmar'];
    return `<div class="pelus-steps">
      ${labels.map((l, i) => {
        const n = i + 1;
        const cls = n < state.step ? 'done' : n === state.step ? 'active' : '';
        return `<div class="pelus-step ${cls}">${n === state.step || n < state.step ? (n < state.step ? '✓ ' : '') : ''}${l}</div>`;
      }).join('')}
    </div>`;
  }

  function renderLoader() {
    return `<div class="pelus-loader"><span class="pelus-spinner"></span> Cargando…</div>`;
  }

  function renderStep() {
    switch (state.step) {
      case 1: return renderServices();
      case 2: return renderSchedule();
      case 3: return renderContact();
      case 4: return renderSummary();
    }
  }

  // Step 1 – Services
  function renderServices() {
    if (!state.services.length) return '<p style="color:#6b7280;text-align:center">No hay servicios disponibles.</p>';
    return `
      <p class="pelus-section-title">¿Qué servicio deseas?</p>
      ${state.services.map(s => `
        <div class="pelus-card ${state.selected.service?.id == s.id ? 'selected' : ''}"
             data-action="select-service" data-id="${s.id}">
          <h3>${s.name}</h3>
          <p>${s.description || ''}</p>
          <div class="pelus-meta">
            <span>⏱ ${s.duration} min</span>
            <span>${fmt(s.price)}</span>
          </div>
        </div>`).join('')}
      <div class="pelus-btn-row">
        <span></span>
        <button class="pelus-btn pelus-btn-primary" data-action="next-step"
          ${!state.selected.service ? 'disabled style="opacity:.5;cursor:not-allowed"' : ''}>
          Siguiente →
        </button>
      </div>`;
  }

  // Step 2 – Employee + date + slot
  function renderSchedule() {
    const empCards = state.employees.map(e => `
      <div class="pelus-card ${state.selected.employee?.id == e.id ? 'selected' : ''}"
           data-action="select-employee" data-id="${e.id}">
        <h3>${e.name}</h3>
        <p>${e.specialty || ''}</p>
      </div>`).join('');

    const slotGrid = state.slots.length
      ? state.slots.map(sl => `
          <div class="pelus-slot ${state.selected.slot?.start === sl.start ? 'selected' : ''}"
               data-action="select-slot" data-start="${sl.start}" data-end="${sl.end}">
            ${sl.start}
          </div>`).join('')
      : (state.selected.employee && state.selected.date
          ? `<p class="pelus-no-slots">Sin horarios disponibles para esta fecha.</p>`
          : '');

    return `
      <p class="pelus-section-title">Elige estilista y horario</p>
      <p style="font-size:.85rem;color:#6b7280;margin-bottom:8px">Estilista</p>
      ${empCards}
      <p style="font-size:.85rem;color:#6b7280;margin:12px 0 8px">Fecha</p>
      <input type="date" class="pelus-date-picker" id="pelus-date"
             value="${state.selected.date}" min="${minDate()}" />
      ${state.selected.employee && state.selected.date ? `
        <p style="font-size:.85rem;color:#6b7280;margin:12px 0 8px">Hora disponible</p>
        <div class="pelus-slots">${slotGrid}</div>` : ''}
      <div class="pelus-btn-row">
        <button class="pelus-btn pelus-btn-secondary" data-action="prev-step">← Atrás</button>
        <button class="pelus-btn pelus-btn-primary" data-action="next-step"
          ${!state.selected.slot ? 'disabled style="opacity:.5;cursor:not-allowed"' : ''}>
          Siguiente →
        </button>
      </div>`;
  }

  // Step 3 – Contact info
  function renderContact() {
    const s = state.selected;
    return `
      <p class="pelus-section-title">Tus datos de contacto</p>
      <div class="pelus-form">
        <label>Nombre completo *</label>
        <input type="text" id="pelus-name" value="${s.name}" placeholder="María García" />
        <label>Email *</label>
        <input type="email" id="pelus-email" value="${s.email}" placeholder="maria@ejemplo.com" />
        <label>Teléfono</label>
        <input type="tel" id="pelus-phone" value="${s.phone}" placeholder="+1 555-0100" />
        <label>Notas adicionales</label>
        <textarea id="pelus-notes" rows="3" placeholder="Alergias, preferencias, etc.">${s.notes}</textarea>
      </div>
      <div class="pelus-btn-row">
        <button class="pelus-btn pelus-btn-secondary" data-action="prev-step">← Atrás</button>
        <button class="pelus-btn pelus-btn-primary" data-action="next-step">Revisar →</button>
      </div>`;
  }

  // Step 4 – Summary + confirm
  function renderSummary() {
    const s = state.selected;
    return `
      <p class="pelus-section-title">Confirmar reserva</p>
      <div class="pelus-summary">
        <h3>Resumen</h3>
        <div class="pelus-summary-row"><span>Servicio</span><strong>${s.service.name}</strong></div>
        <div class="pelus-summary-row"><span>Duración</span><strong>${s.service.duration} min</strong></div>
        <div class="pelus-summary-row"><span>Precio</span><strong>${fmt(s.service.price)}</strong></div>
        <div class="pelus-summary-row"><span>Estilista</span><strong>${s.employee.name}</strong></div>
        <div class="pelus-summary-row"><span>Fecha</span><strong>${s.date}</strong></div>
        <div class="pelus-summary-row"><span>Hora</span><strong>${s.slot.start} – ${s.slot.end}</strong></div>
        <hr style="border:none;border-top:1px solid #ddd6fe;margin:10px 0"/>
        <div class="pelus-summary-row"><span>Nombre</span><strong>${s.name}</strong></div>
        <div class="pelus-summary-row"><span>Email</span><strong>${s.email}</strong></div>
        ${s.phone ? `<div class="pelus-summary-row"><span>Teléfono</span><strong>${s.phone}</strong></div>` : ''}
        ${s.notes ? `<div class="pelus-summary-row"><span>Notas</span><strong>${s.notes}</strong></div>` : ''}
      </div>
      <div class="pelus-btn-row">
        <button class="pelus-btn pelus-btn-secondary" data-action="prev-step">← Editar</button>
        <button class="pelus-btn pelus-btn-primary" data-action="confirm-booking">Confirmar cita</button>
      </div>`;
  }

  function renderSuccess() {
    const s = state.selected;
    return `
      <div class="pelus-success">
        <div class="pelus-success-icon">🎉</div>
        <h2>¡Cita reservada!</h2>
        <p>Recibirás un email de confirmación en <strong>${s.email}</strong>.</p>
        <br/>
        <p>${s.service.name} · ${s.date} · ${s.slot.start}</p>
        <br/>
        <button class="pelus-btn pelus-btn-primary" data-action="new-booking">Reservar otra cita</button>
      </div>`;
  }

  // ── Events ────────────────────────────────────────────────────

  function attachEvents() {
    const root = document.getElementById('pelus-booking-app');
    if (!root) return;

    root.addEventListener('click', handleClick);

    const dateInput = root.querySelector('#pelus-date');
    if (dateInput) {
      dateInput.addEventListener('change', e => {
        state.selected.date = e.target.value;
        state.selected.slot = null;
        if (state.selected.employee && state.selected.date) loadSlots();
        else render();
      });
    }
  }

  function handleClick(e) {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;

    if (action === 'select-service') {
      const svc = state.services.find(s => s.id == el.dataset.id);
      state.selected.service = svc;
      state.error = '';
      render();
    } else if (action === 'select-employee') {
      state.selected.employee = state.employees.find(s => s.id == el.dataset.id);
      state.selected.slot = null;
      state.error = '';
      if (state.selected.date) loadSlots();
      else render();
    } else if (action === 'select-slot') {
      state.selected.slot = { start: el.dataset.start, end: el.dataset.end };
      state.error = '';
      render();
    } else if (action === 'next-step') {
      if (!validateStep()) return;
      state.step++;
      state.error = '';
      if (state.step === 2 && !state.employees.length) loadEmployees();
      else render();
    } else if (action === 'prev-step') {
      state.step--;
      state.error = '';
      render();
    } else if (action === 'confirm-booking') {
      submitBooking();
    } else if (action === 'new-booking') {
      Object.assign(state, {
        step: 1, loading: false, error: '', success: false,
        selected: { service: null, employee: null, date: '', slot: null, name: '', email: '', phone: '', notes: '' },
      });
      render();
    }
  }

  function validateStep() {
    if (state.step === 1 && !state.selected.service) {
      state.error = 'Por favor selecciona un servicio.'; render(); return false;
    }
    if (state.step === 2 && (!state.selected.employee || !state.selected.date || !state.selected.slot)) {
      state.error = 'Selecciona estilista, fecha y hora.'; render(); return false;
    }
    if (state.step === 3) {
      const name  = $('#pelus-name')?.value.trim() || '';
      const email = $('#pelus-email')?.value.trim() || '';
      if (!name || !email) { state.error = 'Nombre y email son requeridos.'; render(); return false; }
      // Check basic email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        state.error = 'Por favor ingresa un email válido.'; render(); return false;
      }
      state.selected.name  = name;
      state.selected.email = email;
      state.selected.phone = $('#pelus-phone')?.value.trim() || '';
      state.selected.notes = $('#pelus-notes')?.value.trim() || '';
    }
    return true;
  }

  // ── API calls ─────────────────────────────────────────────────

  function loadServices() {
    state.loading = true; render();
    api('/services').then(data => {
      state.services = data;
      state.loading = false;
      render();
    }).catch(() => {
      state.loading = false;
      state.error = 'Error al cargar los servicios.';
      render();
    });
  }

  function loadEmployees() {
    state.loading = true; render();
    api('/employees').then(data => {
      state.employees = data;
      state.loading = false;
      render();
    }).catch(() => {
      state.loading = false;
      state.error = 'Error al cargar los empleados.';
      render();
    });
  }

  function loadSlots() {
    const { employee, date, service } = state.selected;
    state.loading = true; render();
    api(`/slots?employee_id=${employee.id}&date=${date}&duration=${service?.duration || 60}`)
      .then(data => {
        state.slots = data;
        state.loading = false;
        render();
      }).catch(() => {
        state.loading = false;
        state.error = 'Error al cargar los horarios.';
        render();
      });
  }

  function submitBooking() {
    const { service, employee, date, slot, name, email, phone, notes } = state.selected;
    state.loading = true; state.error = ''; render();

    api('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        service_id:   service.id,
        employee_id:  employee.id,
        client_name:  name,
        client_email: email,
        client_phone: phone,
        date,
        start_time: slot.start,
        end_time:   slot.end,
        notes,
      }),
    }).then(res => {
      state.loading = false;
      if (res.id) {
        state.success = true;
        render();
      } else {
        state.error = res.message || 'Error al confirmar la cita.';
        render();
      }
    }).catch(() => {
      state.loading = false;
      state.error = 'Error de conexión. Por favor intenta de nuevo.';
      render();
    });
  }

  // ── Init ──────────────────────────────────────────────────────

  function init() {
    if (!document.getElementById('pelus-booking-app')) return;
    loadServices();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
