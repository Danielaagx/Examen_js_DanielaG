const API_URL = 'https://jsonplaceholder.typicode.com/todos';
const STORAGE_KEY = 'app_tareas_data';
const STORAGE_CAT = 'app_categorias_data';
 
class TodoApp extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.tareas = this.cargar();
    this.filtro = 'todas';
    this.busqueda = '';
    this.editandoId = null;
    this.categorias = this.cargarCategorias();
    this.editandoCatId = null; 
  }

 
  connectedCallback() {
    try {
      const plantilla = document.getElementById('todo-app-template');
      if (!plantilla) throw new Error("No se encontró la plantilla <template id='todo-app-template'>");
 
      const linkEstilos = document.createElement('link');
      linkEstilos.setAttribute('rel', 'stylesheet');
      linkEstilos.setAttribute('href', 'style.css');
      this.shadowRoot.appendChild(linkEstilos);
 
      this.shadowRoot.appendChild(plantilla.content.cloneNode(true));
      this.setup();
    } catch (error) {
      console.error("Error al inicializar el componente de tareas:", error);
      this.shadowRoot.innerHTML = `<div style="padding: 20px; color: red;">Error crítico de interfaz: ${error.message}</div>`;
    }
  }
 
  cargar() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } }
 
  guardar() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.tareas)); } catch(e) { console.error(e); }
    this.render();
  }
 
  setup() {
    const s = this.shadowRoot;
    s.getElementById('nva').onclick = () => {
      this.editandoId = null;
      s.getElementById('frm').reset();
      s.getElementById('fch').value = new Date().toISOString().split('T')[0];
      s.getElementById('mdl-f').showModal();
    };
    s.getElementById('imp').onclick = () => this.cargarAPI();
    s.getElementById('mar').onclick = () => { this.tareas.forEach(t => t.completado = true); this.guardar(); };
    s.getElementById('vac').onclick = () => { if(confirm('¿Vaciar?')) { this.tareas = []; this.guardar(); } };
    s.getElementById('flt').onchange = (e) => { this.filtro = e.target.value; this.render(); };
    s.getElementById('bus').oninput = (e) => { this.busqueda = e.target.value.toLowerCase().trim(); this.render(); };
    s.getElementById('cnf').onclick = () => this.confirmarImportar();
    s.getElementById('cat-btn').onclick = () => {
      this.editandoCatId = null;
      s.getElementById('frm-cat').reset();
      this.renderCategoriasModal();
      s.getElementById('mdl-cat').showModal();
    };
  s.getElementById('frm-cat').onsubmit = (e)=> {
      e.preventDefault();
      const nombreInput = s.getElementById('cat-nombre').value.trim().toLowerCase();
      if (!nombreInput) return; 
      if (this.editandoCatId){
        this.categorias = this.categorias.map( c => c.id === this.editandoCatId ? {...c, nombre:nombreInput, id: nombreInput }: c);
        this.editandoCatId = null;
      } else{
        if (!this.categorias.some(c => c.id === nombreInput)){
          this.categorias.push({ id: nombreInput, nombre: nombreInput});
        }
      }
    s.getElementById('frm-cat').reset();
    this.guardarCategorias();
    };
    s.getElementById('cat-lst').onclick = (e) =>{
      const id = e.target.dataset.id;
      if(!id) return;
      if (e.target.classList.contains('del-cat')){
        if (confirm('¿Eliminar la categoría?')){
          this.categorias = this.categorias.filter(c => c.id !==id);
          this.guardarCategorias();
        }
      } else if (e.target.classList.contains('edi-cat')){
        const cat = this.categorias.find( c => c.id === id);
          if (cat) {
            {
            this.editandoCatId = cat.id;
            s.getElementById('cat-nombre').value = cat.nombre;
          }
        }
      };
    this.renderCategoriasSelects();
  
    s.getElementById('frm').onsubmit = (e) => {
      e.preventDefault();
      const titulo = s.getElementById('ttl').value, completado = s.getElementById('cmp').checked, fecha = s.getElementById('fch').value;
      const categoria = s.getElementById('cat').value;
      if (this.editandoId) {
        this.tareas = this.tareas.map(t => t.id === this.editandoId ? { ...t, titulo, completado, fecha } : t);
      } else {
        this.tareas.push({ id: 'm_' + Date.now(), titulo, completado, fecha, importada: false });
      }
      s.getElementById('mdl-f').close();
      this.guardar();
    };
 
    s.getElementById('lst').onclick = (e) => {
      const id = e.target.dataset.id;
      if (!id) return;
      if (e.target.classList.contains('del')) { this.tareas = this.tareas.filter(t => t.id !== id); this.guardar(); }
      if (e.target.classList.contains('edi')) {
        const t = this.tareas.find(x => x.id === id);
        this.editandoId = id;
        s.getElementById('ttl').value = t.titulo;
        s.getElementById('cmp').checked = t.completado;
        s.getElementById('fch').value = t.fecha || new Date().toISOString().split('T')[0];
        s.getElementById('mdl-f').showModal();
      }
    };
   
    s.getElementById('lst').onchange = (e) => {
      if (e.target.classList.contains('chk')) {
        const id = e.target.dataset.id;
        this.tareas = this.tareas.map(t => t.id === id ? { ...t, completado: e.target.checked } : t);
        this.guardar();
      }
    };
 
    this.render();
  }
}
  async cargarAPI() {
    const s = this.shadowRoot, ul = s.getElementById('api-lst');
    ul.innerHTML = 'Cargando...';
    s.getElementById('mdl-i').showModal();
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error();
      const datos = await res.json();
      ul.innerHTML = datos.map(t => `
        <li style="padding: 10px; border-bottom: 1px solid #ececec; list-style: none;">
          <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
            <input type="checkbox" class="api-chk" data-ttl="${t.title}" ${t.completed ? 'data-cmp="1"' : ''}>
            <span>${t.title}</span>
          </label>
        </li>
      `).join('');
    } catch (err) {
      ul.innerHTML = '<span style="color:red">Error al cargar datos de la API</span>';
    }
  }
 
  confirmarImportar() {
    const fechaHoy = new Date().toISOString().split('T')[0];
    this.shadowRoot.querySelectorAll('.api-chk:checked').forEach(c => {
      const idRand = 'a_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
      this.tareas.push({ id: idRand, titulo: c.dataset.ttl, completado: !!c.dataset.cmp, fecha: fechaHoy, importada: true });
    });
    this.shadowRoot.getElementById('mdl-i').close();
    this.guardar();
  }
 
  render() {
    const ul = this.shadowRoot.getElementById('lst');
    ul.innerHTML = '';
 
    const plantillaItem = document.getElementById('tarea-item-template');
    if (!plantillaItem) return;
 
    const filtradas = this.tareas.filter(t => {
      const coincideFiltro = this.filtro === 'todas' ||
        (this.filtro === 'completadas' && t.completado) ||
        (this.filtro === 'pendientes' && !t.completado);
      const coincideBusqueda = t.titulo.toLowerCase().includes(this.busqueda);
      return coincideFiltro && coincideBusqueda;
    });
 
    if (filtradas.length === 0) {
      ul.innerHTML = `<li style="padding: 25px; color: #777; text-align: center; list-style: none;">No hay tareas en esta sección.</li>`;
      return;
    }
 
    filtradas.forEach(t => {
      const clon = plantillaItem.content.cloneNode(true);
      const li = clon.querySelector('li');
      const chk = clon.querySelector('.chk');
      const tituloDiv = clon.querySelector('.titulo');
      const txtFecha = clon.querySelector('.fecha-txt');
      const etiquetaSmall = clon.querySelector('.categoria small');
      const btnEdi = clon.querySelector('.edi');
      const btnDel = clon.querySelector('.del');
      const spanCat = clon.querySelector('.categoria span');
      const divCategoriaInfo = clon.querySelector('.categoria');
      if (spanCat) spanCat.textContent = t.categoria || 'general';
      if (divCategoriaInfo) divCategoriaInfo.className = `categoria ${ t.categoria || ''}`;
 
      chk.dataset.id = t.id;
      chk.checked = t.completado;
      if (btnEdi) btnEdi.dataset.id = t.id;
      if (btnDel) btnDel.dataset.id = t.id;
 
      if (tituloDiv) tituloDiv.textContent = t.titulo;
      if (txtFecha && t.fecha) txtFecha.textContent = t.fecha.split('-').reverse().join('/');
      if (etiquetaSmall) etiquetaSmall.textContent = t.importada ? 'Importada (API)' : 'Creada Local';
 
      if (t.completado) {
        if (li) li.classList.add('completada');
        if (tituloDiv) {
          tituloDiv.style.textDecoration = 'line-through';
          tituloDiv.style.color = '#777';
        }
      }
 
      if (t.importada && btnEdi) {
        btnEdi.style.display = 'none';
      }
 
      ul.appendChild(clon);
    });
  }
  cargarCategorias(){
    try{
      const guardadas = JSON.parse(localStorage.getItem(STORAGE_CAT_KEY));
      if (guardadas && guardadas.length > 0) return guardadas;
    } catch {}
    return [
      {id: 'product', nombre: 'product'},
      {id: 'desing', nombre: 'desing'},
      {id: 'operations', nombre: 'operations'},
      {id: 'research', nombre: 'research'}
    ];
  }
  guardarCategorias(){
    try{
      localStorage.setItem(STORAGE_CAT_KEY, JSON.stringify(this.categorias));
    } catch (e){
      console.error(e);
    }
    this.renderCategoriasSelects();
    this.renderCategoriasModal();
  }
  renderCategoriasSelects(){
    const s = this.shadowRoot;
    const selectTask = s.getElementById('cat');
    const selectApi = s.getElementById('api-cat');
    if (selectTask) return;
    const optionsHTML = this.categorias.map(c => `<option value ="${c.id}">${c.nombre}</option>`).join('');
    selectTask.innerHTML =optionsHTML;
    if (selectApi) selectApi.innerHTML = optionsHTML;
  }
  renderCategoriasModal(){
    const s = this.shadowRoot;
    const ul = s.getElementById('cat-lst');
    if (!ul) return;
    if (this.categorias.length === 0){
      ul.innerHTML ='<li style="padding: 10px; text-aling: center; color: #777;">No hay categorias disponibles</li>';
      return;
    }
    ul.innerHTML = this.categorias.map(c => `
      <li style="display: flex; justify.content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #ececec;">
        <span><strong> ${c.nombre}</strong> </span>
        <div>
          <button type="button" class="btn-import edi-cat" data-id="${c.id}" style="padding: 4px 10px; font-size: 12px; margin-right: 5px;">
            Editar </button>
          <button type="button" class="btn-import edi-cat" data-id="${c.id}" style="padding: 4px 10px; font-size: 12px color: #cf6d4d; border-color: #cf6d4d;">
            Eliminar </button>
        </div>
      </li>
    `).join('');
  }
}
 
if (!customElements.get('todo-app')) customElements.define('todo-app', TodoApp);
 