/**
 * Genera el código fuente completo en un único archivo index.html
 * listo para ejecutar en cualquier navegador mediante CDN y Vanilla JS.
 */
export function generateStandaloneHTML(): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notificador de Pedidos WhatsApp</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- PapaParse CDN para lectura de CSV robusta -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"></script>
  <style>
    .whatsapp-btn {
      background-color: #25D366;
      transition: all 0.2s ease;
    }
    .whatsapp-btn:hover {
      background-color: #128C7E;
      transform: translateY(-1px);
    }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 min-h-screen p-4 md:p-8 font-sans">
  <div class="max-w-6xl mx-auto space-y-6">
    
    <!-- Encabezado Principal -->
    <header class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-2xl">
          💬
        </div>
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Notificador de Pedidos por WhatsApp</h1>
          <p class="text-sm text-slate-500">Carga tus clientes desde CSV o Google Sheets y avisa de retiros en 1 clic</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button id="btnSampleData" class="px-4 py-2 text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition">
          🧪 Cargar Ejemplo
        </button>
        <button id="btnClearData" class="px-4 py-2 text-sm font-medium bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition">
          🗑️ Limpiar Lista
        </button>
      </div>
    </header>

    <!-- Panel de Métricas Rápidas -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <span class="text-xs font-semibold text-slate-400 uppercase">Total Clientes</span>
        <div id="statTotal" class="text-2xl font-bold text-slate-800 mt-1">0</div>
      </div>
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <span class="text-xs font-semibold text-amber-500 uppercase">Pendientes</span>
        <div id="statPending" class="text-2xl font-bold text-amber-600 mt-1">0</div>
      </div>
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <span class="text-xs font-semibold text-emerald-500 uppercase">Enviados</span>
        <div id="statSent" class="text-2xl font-bold text-emerald-600 mt-1">0</div>
      </div>
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <span class="text-xs font-semibold text-rose-500 uppercase">Tel. Inválidos</span>
        <div id="statInvalid" class="text-2xl font-bold text-rose-600 mt-1">0</div>
      </div>
    </div>

    <!-- Sección 1: Carga de Datos -->
    <section class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
      <h2 class="text-lg font-semibold text-slate-900 flex items-center gap-2">
        <span>📂</span> 1. Importar Hoja de Cálculo
      </h2>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Opción A: Archivo CSV -->
        <div class="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-emerald-500 transition cursor-pointer bg-slate-50/50" id="dropZone">
          <input type="file" id="csvFileInput" accept=".csv,text/csv" class="hidden" />
          <div class="space-y-2">
            <div class="text-3xl">📄</div>
            <p class="font-medium text-slate-700">Subir archivo CSV local</p>
            <p class="text-xs text-slate-400">Arrastra tu archivo aquí o haz clic para seleccionarlo</p>
          </div>
        </div>

        <!-- Opción B: Google Sheets URL -->
        <div class="space-y-3 bg-slate-50/50 p-6 rounded-xl border border-slate-200">
          <label class="block text-sm font-medium text-slate-700">
            Enlace de Google Sheets (Público)
          </label>
          <div class="flex gap-2">
            <input 
              type="text" 
              id="sheetUrlInput" 
              placeholder="https://docs.google.com/spreadsheets/d/.../edit" 
              class="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button id="btnFetchSheet" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium whitespace-nowrap transition">
              Cargar
            </button>
          </div>
          <p class="text-xs text-slate-500">
            Tip: La hoja debe estar en "Cualquier persona con el enlace" o "Publicada como CSV".
          </p>
        </div>
      </div>

      <!-- Configuración de Prefijo de País -->
      <div class="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100 text-sm">
        <label class="font-medium text-slate-700">Prefijo de País por defecto si falta el (+):</label>
        <select id="countryPrefixSelect" class="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="auto">🌐 Automático (Detectar de cada número)</option>
          <option value="none">🚫 Sin prefijo (Conservar original)</option>
          <option value="54">🇦🇷 Argentina (+54)</option>
          <option value="52">🇲🇽 México (+52)</option>
          <option value="34">🇪🇸 España (+34)</option>
          <option value="57">🇨🇴 Colombia (+57)</option>
          <option value="56">🇨🇱 Chile (+56)</option>
          <option value="51">🇵🇪 Perú (+51)</option>
          <option value="1">🇺🇸 USA / Canadá (+1)</option>
        </select>
        <span class="text-xs text-slate-400">Se usará si el número no incluye código internacional.</span>
      </div>
    </section>

    <!-- Sección 2: Plantilla de Mensaje -->
    <section class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <span>✍️</span> 2. Plantilla de Mensaje Personalizado
        </h2>
        <div class="flex gap-2">
          <button type="button" onclick="insertTag('{nombre}')" class="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-mono">+{nombre}</button>
          <button type="button" onclick="insertTag('{pedido}')" class="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-mono">+{pedido}</button>
          <button type="button" onclick="insertTag('{horario}')" class="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-mono">+{horario}</button>
        </div>
      </div>

      <textarea 
        id="messageTemplate" 
        rows="3" 
        class="w-full p-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans leading-relaxed"
      >¡Hola {nombre}! 👋 Te avisamos que tu pedido {pedido} ya está listo para ser retirado. Nuestro horario de atención es de 09:00 a 19:00 hs. ¡Te esperamos!</textarea>

      <!-- Previsualización en vivo -->
      <div class="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4">
        <span class="text-xs font-bold text-emerald-800 uppercase tracking-wide">Vista Previa (Simulación WhatsApp):</span>
        <div class="mt-2 bg-[#EFEAE2] p-3 rounded-xl max-w-lg">
          <div id="previewBox" class="bg-white p-3 rounded-lg shadow-sm text-sm text-slate-800 rounded-tr-none border border-slate-200">
            Vista previa no disponible
          </div>
        </div>
      </div>
    </section>

    <!-- Sección 3: Tabla Interactiva de Contactos -->
    <section class="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 class="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <span>📋</span> 3. Lista de Clientes & Envío de Pedidos
        </h2>
        <div class="flex items-center gap-2 w-full sm:w-auto">
          <input 
            type="text" 
            id="searchInput" 
            placeholder="Buscar por nombre o pedido..." 
            class="text-sm px-3 py-1.5 border border-slate-300 rounded-lg w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <!-- Tabla -->
      <div class="overflow-x-auto rounded-xl border border-slate-200">
        <table class="w-full text-left text-sm text-slate-600">
          <thead class="bg-slate-100/75 text-xs text-slate-700 uppercase font-semibold border-b border-slate-200">
            <tr>
              <th class="px-4 py-3">Nombre</th>
              <th class="px-4 py-3">Teléfono / WhatsApp</th>
              <th class="px-4 py-3">Pedido / Detalle</th>
              <th class="px-4 py-3 text-center">Estado</th>
              <th class="px-4 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody id="contactsTableBody" class="divide-y divide-slate-100">
            <tr>
              <td colspan="5" class="px-4 py-8 text-center text-slate-400">
                No hay clientes cargados. Sube un archivo CSV o haz clic en "Cargar Ejemplo".
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

  </div>

  <script>
    // Estado de la aplicación
    let contacts = [];
    const defaultTemplate = "¡Hola {nombre}! 👋 Te avisamos que tu pedido {pedido} ya está listo para ser retirado. Nuestro horario de atención es de 09:00 a 19:00 hs. ¡Te esperamos!";

    // Elementos del DOM
    const dropZone = document.getElementById('dropZone');
    const csvFileInput = document.getElementById('csvFileInput');
    const sheetUrlInput = document.getElementById('sheetUrlInput');
    const btnFetchSheet = document.getElementById('btnFetchSheet');
    const btnSampleData = document.getElementById('btnSampleData');
    const btnClearData = document.getElementById('btnClearData');
    const messageTemplate = document.getElementById('messageTemplate');
    const previewBox = document.getElementById('previewBox');
    const contactsTableBody = document.getElementById('contactsTableBody');
    const countryPrefixSelect = document.getElementById('countryPrefixSelect');
    const searchInput = document.getElementById('searchInput');

    const statTotal = document.getElementById('statTotal');
    const statPending = document.getElementById('statPending');
    const statSent = document.getElementById('statSent');
    const statInvalid = document.getElementById('statInvalid');

    // Inicializar eventos
    window.addEventListener('DOMContentLoaded', () => {
      updatePreview();
      messageTemplate.addEventListener('input', updatePreview);
      searchInput.addEventListener('input', renderTable);
      countryPrefixSelect.addEventListener('change', reformatAllPhones);

      // Drag and drop CSV
      dropZone.addEventListener('click', () => csvFileInput.click());
      csvFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleFile(e.target.files[0]);
        }
      });
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-emerald-500', 'bg-emerald-50/20');
      });
      dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-emerald-500', 'bg-emerald-50/20');
      });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-emerald-500', 'bg-emerald-50/20');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFile(e.dataTransfer.files[0]);
        }
      });

      // Google Sheets
      btnFetchSheet.addEventListener('click', handleFetchGoogleSheet);

      // Botón muestra
      btnSampleData.addEventListener('click', loadSampleData);
      btnClearData.addEventListener('click', () => {
        if (confirm('¿Deseas limpiar todos los contactos de la lista?')) {
          contacts = [];
          renderTable();
          updateStats();
          updatePreview();
        }
      });
    });

    // Sanitización y formateo de teléfono según requerimiento de wa.me
    const KNOWN_CODES = ['593','598','595','591','502','503','504','505','506','507','54','52','57','34','56','51','58','55','1'];
    
    function formatPhone(rawPhone, defaultCountry = 'auto') {
      if (!rawPhone) return { formatted: '', isValid: false, error: 'Vacío' };
      const rawStr = String(rawPhone).trim();
      let digits = rawStr.replace(/\D/g, '');

      if (!digits) return { formatted: '', isValid: false, error: 'Sin dígitos' };
      if (digits.startsWith('00')) digits = digits.substring(2);

      let finalPhone = digits;
      const startsWithKnown = KNOWN_CODES.find(code => digits.startsWith(code) && digits.length >= (code.length + 7));

      if (startsWithKnown) {
        if (startsWithKnown === '54' && digits.startsWith('54') && !digits.startsWith('549') && digits.length >= 12) {
          finalPhone = '549' + digits.substring(2);
        }
      } else if (defaultCountry && defaultCountry !== 'auto' && defaultCountry !== 'none') {
        if (defaultCountry === '54') {
          let local = digits;
          if (local.startsWith('15')) local = local.substring(2);
          if (local.startsWith('0')) local = local.substring(1);
          finalPhone = '549' + local;
        } else if (defaultCountry === '52') {
          finalPhone = '52' + digits;
        } else {
          finalPhone = defaultCountry + digits;
        }
      }

      const isValid = finalPhone.length >= 8 && finalPhone.length <= 16;
      return {
        formatted: finalPhone,
        isValid,
        error: isValid ? null : 'Longitud inválida (' + finalPhone.length + ' dígitos)'
      };
    }

    function reformatAllPhones() {
      const code = countryPrefixSelect.value;
      contacts = contacts.map(c => {
        const res = formatPhone(c.telefonoRaw, code);
        return { ...c, telefono: res.formatted, isValid: res.isValid, phoneError: res.error };
      });
      renderTable();
      updateStats();
    }

    function insertTag(tag) {
      const cursorPos = messageTemplate.selectionStart;
      const text = messageTemplate.value;
      messageTemplate.value = text.slice(0, cursorPos) + tag + text.slice(cursorPos);
      messageTemplate.focus();
      updatePreview();
    }

    function generateMessageForContact(template, contact) {
      return template
        .replace(/{nombre}/gi, contact.nombre || 'Cliente')
        .replace(/{pedido}/gi, contact.pedido || '#000')
        .replace(/{horario}/gi, '09:00 a 19:00 hs');
    }

    function updatePreview() {
      const first = contacts.find(c => c.isValid) || contacts[0] || { nombre: 'Carlos Rodríguez', pedido: 'ORD-8492' };
      previewBox.innerText = generateMessageForContact(messageTemplate.value, first);
    }

    function updateStats() {
      const total = contacts.length;
      const sent = contacts.filter(c => c.status === 'Enviado').length;
      const pending = contacts.filter(c => c.status === 'Pendiente').length;
      const invalid = contacts.filter(c => !c.isValid).length;

      statTotal.innerText = total;
      statPending.innerText = pending;
      statSent.innerText = sent;
      statInvalid.innerText = invalid;
    }

    function handleFile(file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          processRawRows(results.data, results.meta.fields || []);
        },
        error: (err) => {
          alert('Error al leer el archivo CSV: ' + err.message);
        }
      });
    }

    async function handleFetchGoogleSheet() {
      let url = sheetUrlInput.value.trim();
      if (!url) {
        alert('Ingresa una URL de Google Sheets.');
        return;
      }

      // Conversión automática a exportación CSV
      const sheetMatch = url.match(/\\/spreadsheets\\/d\\/([a-zA-Z0-9-_]+)/);
      if (sheetMatch && sheetMatch[1]) {
        let gid = '0';
        const gidMatch = url.match(/[#&?]gid=([0-9]+)/);
        if (gidMatch && gidMatch[1]) gid = gidMatch[1];
        url = \`https://docs.google.com/spreadsheets/d/\${sheetMatch[1]}/export?format=csv&gid=\${gid}\`;
      }

      btnFetchSheet.disabled = true;
      btnFetchSheet.innerText = 'Cargando...';

      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Estado HTTP ' + response.status);
        const text = await response.text();
        Papa.parse(text, {
          header: true,
          skipEmptyLines: 'greedy',
          complete: (results) => {
            processRawRows(results.data, results.meta.fields || []);
            alert('¡Hoja de cálculo importada con éxito!');
          }
        });
      } catch (err) {
        alert('No se pudo descargar la hoja. Asegúrate de que el documento esté en "Cualquier persona con el enlace" o usa la opción de "Publicar en la web" como CSV. Detalle: ' + err.message);
      } finally {
        btnFetchSheet.disabled = false;
        btnFetchSheet.innerText = 'Cargar';
      }
    }

    function processRawRows(rows, fields) {
      if (!rows || rows.length === 0) {
        alert('El archivo no contiene filas de datos.');
        return;
      }

      // Autodetectar columnas
      const clean = str => str.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').trim();
      let nombreCol = fields.find(f => ['nombre', 'name', 'cliente', 'customer'].some(k => clean(f).includes(k))) || fields[0];
      let telCol = fields.find(f => ['tel', 'cel', 'phone', 'whats'].some(k => clean(f).includes(k))) || fields[1];
      let pedidoCol = fields.find(f => ['pedid', 'order', 'prod', 'item'].some(k => clean(f).includes(k))) || fields[2];

      const prefix = countryPrefixSelect.value;
      contacts = rows.map((r, i) => {
        const rawPhone = r[telCol] || '';
        const phoneData = formatPhone(rawPhone, prefix);
        return {
          id: 'c_' + Date.now() + '_' + i,
          nombre: (r[nombreCol] || '').trim(),
          telefonoRaw: rawPhone,
          telefono: phoneData.formatted,
          isValid: phoneData.isValid,
          phoneError: phoneData.error,
          pedido: (r[pedidoCol] || '').trim(),
          status: 'Pendiente'
        };
      });

      renderTable();
      updateStats();
      updatePreview();
    }

    function renderTable() {
      const q = searchInput.value.toLowerCase().trim();
      const filtered = contacts.filter(c => 
        c.nombre.toLowerCase().includes(q) || c.pedido.toLowerCase().includes(q) || c.telefono.includes(q)
      );

      if (filtered.length === 0) {
        contactsTableBody.innerHTML = \`
          <tr>
            <td colspan="5" class="px-4 py-8 text-center text-slate-400">
              \${contacts.length === 0 ? 'No hay contactos cargados. Sube un CSV o carga el ejemplo.' : 'No se encontraron contactos coincidentes.'}
            </td>
          </tr>
        \`;
        return;
      }

      contactsTableBody.innerHTML = filtered.map(c => {
        const statusBadge = c.status === 'Enviado' 
          ? '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">✓ Enviado</span>'
          : '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">⏳ Pendiente</span>';

        const phoneDisplay = c.isValid
          ? \`<span class="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-1 rounded">+\${c.telefono}</span>\`
          : \`<span class="text-xs text-rose-600 font-semibold" title="\${c.phoneError}">⚠️ Inválido (\${c.telefonoRaw})</span>\`;

        const actionBtn = c.isValid
          ? \`<button onclick="sendWhatsApp('\${c.id}')" class="whatsapp-btn text-white px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm">
               <span>💬</span> \${c.status === 'Enviado' ? 'Reenviar' : 'Enviar por WhatsApp'}
             </button>\`
          : \`<span class="text-xs text-slate-400 italic">No disponible</span>\`;

        return \`
          <tr class="hover:bg-slate-50 transition \${c.status === 'Enviado' ? 'bg-emerald-50/20' : ''}">
            <td class="px-4 py-3 font-medium text-slate-900">\${escapeHtml(c.nombre || 'Sin nombre')}</td>
            <td class="px-4 py-3">\${phoneDisplay}</td>
            <td class="px-4 py-3 text-slate-600">\${escapeHtml(c.pedido || 'N/A')}</td>
            <td class="px-4 py-3 text-center">\${statusBadge}</td>
            <td class="px-4 py-3 text-right">\${actionBtn}</td>
          </tr>
        \`;
      }).join('');
    }

    function sendWhatsApp(contactId) {
      const contact = contacts.find(c => c.id === contactId);
      if (!contact || !contact.isValid) {
        alert('El número no es válido para enviar por WhatsApp.');
        return;
      }

      const msg = generateMessageForContact(messageTemplate.value, contact);
      const url = \`https://wa.me/\${contact.telefono}?text=\${encodeURIComponent(msg)}\`;

      // Abrir en nueva pestaña
      window.open(url, '_blank', 'noopener,noreferrer');

      // Marcar automáticamente como enviado
      contact.status = 'Enviado';
      renderTable();
      updateStats();
    }

    function loadSampleData() {
      const sample = [
        { nombre: 'Carlos Rodríguez', tel: '+54 9 11 4512-8890', pedido: 'ORD-8492 (Zapatillas Talle 42)' },
        { nombre: 'María Fernanda López', tel: '+52 55 4123 9901', pedido: 'ORD-8493 (Cafetera Espresso)' },
        { nombre: 'Alejandro Gómez', tel: '+34 612 34 56 78', pedido: 'ORD-8494 (Auriculares Pro)' },
        { nombre: 'Sofía Martínez', tel: '+57 300 456 7890', pedido: 'ORD-8495 (Kit Skincare Facial)' },
        { nombre: 'Lucas Silva', tel: '+56 9 8765 4321', pedido: 'ORD-8496 (Smartwatch Fit)' },
        { nombre: 'Valeria Morales', tel: '+51 912 345 678', pedido: 'ORD-8497 (Campera Negra)' },
        { nombre: 'Número Incompleto', tel: '1123', pedido: 'ORD-8498 (Prueba Error)' }
      ];

      contacts = sample.map((s, idx) => {
        const phoneData = formatPhone(s.tel, countryPrefixSelect.value);
        return {
          id: 'sample_' + idx,
          nombre: s.nombre,
          telefonoRaw: s.tel,
          telefono: phoneData.formatted,
          isValid: phoneData.isValid,
          phoneError: phoneData.error,
          pedido: s.pedido,
          status: idx === 0 ? 'Enviado' : 'Pendiente'
        };
      });

      renderTable();
      updateStats();
      updatePreview();
    }

    function escapeHtml(str) {
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
  </script>
</body>
</html>`;
}
