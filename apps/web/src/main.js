import './style.css'

const app = document.querySelector('#app')

const AUTH_KEY = 'tda_auth'
const COURSES_KEY = 'tda_courses'
const LECTURER = { username: 'lecturer', password: 'TdA26!' }

const uuid = () => (crypto && crypto.randomUUID) ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2, 9)

const API_BASE = '/api'

const saveCourses = (arr) => localStorage.setItem(COURSES_KEY, JSON.stringify(arr))
const loadCourses = () => JSON.parse(localStorage.getItem(COURSES_KEY) || 'null') || []

async function fetchCourses() {
  try {
    const res = await fetch(`${API_BASE}/courses`)
    if (!res.ok) throw new Error('Failed to fetch')
    return await res.json()
  } catch (e) {
    // fallback to local
    return loadCourses()
  }
}

async function fetchCourse(uuid) {
  try {
    const res = await fetch(`${API_BASE}/courses/${encodeURIComponent(uuid)}`)
    if (!res.ok) throw new Error('Not found')
    return await res.json()
  } catch (e) {
    const local = loadCourses()
    return local.find(c => c.id === uuid)
  }
}

async function createCourseOnServer(title, description) {
  try {
    const res = await fetch(`${API_BASE}/courses`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: title, description }) })
    if (!res.ok) throw new Error('Create failed')
    return await res.json()
  } catch (e) {
    const arr = loadCourses()
    const obj = { id: uuid(), title, description }
    arr.push(obj); saveCourses(arr); return obj
  }
}

async function updateCourseOnServer(uuid, title, description) {
  try {
    const res = await fetch(`${API_BASE}/courses/${encodeURIComponent(uuid)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: title, description }) })
    if (!res.ok) throw new Error('Update failed')
    return await res.json()
  } catch (e) {
    const arr = loadCourses()
    const idx = arr.findIndex(c => c.id === uuid)
    if (idx >= 0) { arr[idx].title = title; arr[idx].description = description; saveCourses(arr); return arr[idx] }
    throw e
  }
}

async function deleteCourseOnServer(uuid) {
  try {
    const res = await fetch(`${API_BASE}/courses/${encodeURIComponent(uuid)}`, { method: 'DELETE' })
    if (!res.ok && res.status !== 204) throw new Error('Delete failed')
    return true
  } catch (e) {
    const arr = loadCourses().filter(x => x.id !== uuid)
    saveCourses(arr)
    return true
  }
}

const isAuth = () => !!localStorage.getItem(AUTH_KEY)
const login = (username, password) => {
  if (username === LECTURER.username && password === LECTURER.password) {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ user: username }))
    updateNav()
    return true
  }
  return false
}
const logout = () => { localStorage.removeItem(AUTH_KEY); updateNav(); navigateTo('/') }

const routes = []

function route(path, renderer) { routes.push({ path, renderer }) }

function parseLocation() {
  return location.pathname
}

function findRoute(pathname) {
  for (const r of routes) {
    if (r.path === pathname) return { renderer: r.renderer, params: {} }
    const paramMatch = matchParam(r.path, pathname)
    if (paramMatch) return { renderer: r.renderer, params: paramMatch }
  }
  return null
}

function matchParam(routePath, pathname) {
  const routeParts = routePath.split('/').filter(Boolean)
  const pathParts = pathname.split('/').filter(Boolean)
  if (routeParts.length !== pathParts.length) return null
  const params = {}
  for (let i = 0; i < routeParts.length; i++) {
    if (routeParts[i].startsWith(':')) {
      params[routeParts[i].slice(1)] = decodeURIComponent(pathParts[i])
    } else if (routeParts[i] !== pathParts[i]) return null
  }
  return params
}

async function router() {
  const pathname = parseLocation()
  const match = findRoute(pathname)
  if (!match) { renderNotFound(); return }
  if (pathname === '/dashboard' && !isAuth()) { navigateTo('/login'); return }
  await match.renderer(match.params)
}

function navigateTo(url) {
  history.pushState(null, null, url)
  router()
}

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-link]')
  if (a && a.host === location.host) {
    e.preventDefault()
    navigateTo(a.pathname)
  }
})

window.addEventListener('popstate', router)

function updateNav() {
  const loginLink = document.getElementById('nav-login')
  const dashboardLink = document.getElementById('nav-dashboard')
  if (isAuth()) {
    loginLink.style.display = 'none'
    dashboardLink.style.display = ''
  } else {
    loginLink.style.display = ''
    dashboardLink.style.display = 'none'
  }
}

function renderNotFound() {
  app.innerHTML = `
    <section class="content">
      <div class="container">
        <div class="card">
          <h2>Not found</h2>
          <p class="muted">The page does not exist.</p>
          <p><a href="/" data-link class="btn-ghost">Back home</a></p>
        </div>
      </div>
    </section>
  `
}

function renderHome() {
  app.innerHTML = `
    <section class="hero">
      <div class="container hero-inner">
        <div>
          <h1>Noodle</h1>
          <p class="lead">A lightweight course & material manager — sleek, simple, private.</p>
          <div class="hero-actions">
            <a href="/courses" data-link class="btn">Explore courses</a>
            <a href="/login" data-link class="btn">Lecturer login</a>
          </div>
        </div>
        <div class="hero-illu"></div>
      </div>
    </section>
    <section class="content">
      <div class="container">
        <div class="grid">
          <div class="card">
            <h3>Fast</h3>
            <p class="muted">Built for quick demos and private classroom use.</p>
          </div>
          <div class="card">
            <h3>Simple</h3>
            <p class="muted">Manage courses and add resources in seconds.</p>
          </div>
          <div class="card">
            <h3>Focused</h3>
            <p class="muted">No unnecessary features — just materials and courses.</p>
          </div>
        </div>
      </div>
    </section>
  `
}

async function renderCourses() {
  const courses = await fetchCourses()
  app.innerHTML = `
    <section class="content">
      <div class="container">
        <h1>Courses</h1>
        <div style="margin-bottom:1rem;">
          <input id="search" class="search" placeholder="Search by title" />
        </div>
        <div id="courses-list" class="grid"></div>
      </div>
    </section>
  `
  const list = document.getElementById('courses-list')
  function show(filtered) {
    if (!filtered.length) { list.innerHTML = '<div class="card">No courses found.</div>'; return }
    list.innerHTML = filtered.map(c => `
      <article class="card course-card">
        <h3><a href="/courses/${c.uuid || c.id}" data-link>${escapeHtml(c.name || c.title)}</a></h3>
        <div class="meta">${escapeHtml(c.description || '')}</div>
        <div class="form-actions"><a href="/courses/${c.uuid || c.id}" data-link class="btn-ghost">View</a></div>
      </article>
    `).join('')
  }
  show(courses)
  const search = document.getElementById('search')
  search.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase()
    if (!q) return show(courses)
    show(courses.filter(c => (c.name || c.title || '').toLowerCase().includes(q)))
  })
}

async function renderCourseDetail(params) {
  const course = await fetchCourse(params.uuid)
  if (!course) { renderNotFound(); return }
  const materials = (course.materials || []).slice().sort((a,b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return tb - ta
  })
  app.innerHTML = `
    <section class="content">
      <div class="container">
        <div class="card">
          <h1>${escapeHtml(course.name || course.title)}</h1>
          <p class="muted">${escapeHtml(course.description || '')}</p>
        </div>
        <section style="margin-top:1rem">
          <h2>Materials</h2>
          <div id="public-materials-list" class="materials-list">
            ${materials.length ? materials.map(m => {
              if (m.type === 'file') {
                return `<div class="materials-item">
                  <div style="flex:1">
                    <strong>${escapeHtml(m.name)}</strong>
                    <div class="muted">${escapeHtml(m.description || '')}</div>
                    <div><a href="${m.fileUrl}" target="_blank" rel="noopener">Download</a></div>
                  </div>
                </div>`
              }
              return `<div class="materials-item">
                <div style="display:flex;gap:0.5rem;align-items:center;flex:1">
                  ${m.faviconUrl ? `<img src="${m.faviconUrl}" style="width:28px;height:28px;object-fit:contain;border-radius:6px" />` : ''}
                  <div>
                    <strong><a href="${m.url}" target="_blank" rel="noopener">${escapeHtml(m.name)}</a></strong>
                    <div class="muted">${escapeHtml(m.description || '')}</div>
                  </div>
                </div>
                <div><a href="${m.url || m.fileUrl}" target="_blank" rel="noopener" class="btn-ghost">Open</a></div>
              </div>`
            }).join('') : '<div class="card">No materials yet.</div>'}
          </div>
        </section>
        <p style="margin-top:1rem"><a href="/courses" data-link class="btn-ghost">Back to list</a></p>
      </div>
    </section>
  `
}

function renderLogin() {
  if (isAuth()) { navigateTo('/dashboard'); return }
  app.innerHTML = `
    <section class="content">
      <div class="container">
        <div class="card" style="max-width:520px;margin:0 auto;text-align:left">
          <h1>Lecturer Login</h1>
          <form id="login-form">
            <label class="field">Username
              <input type="text" name="username" placeholder="lecturer" required />
            </label>
            <label class="field">Password
              <input type="password" name="password" placeholder="••••••••" required />
            </label>
            <div class="form-actions" style="margin-top:0.5rem"><button type="submit">Login</button></div>
            <p id="login-error" class="muted" style="color:#ff7b7b"></p>
          </form>
        </div>
      </div>
    </section>
  `
  const form = document.getElementById('login-form')
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(form)
    const username = fd.get('username')
    const password = fd.get('password')
    if (login(username, password)) { navigateTo('/dashboard') } else {
      document.getElementById('login-error').textContent = 'Invalid credentials.'
    }
  })
}

async function renderDashboard() {
  if (!isAuth()) { navigateTo('/login'); return }
  const courses = await fetchCourses()
  app.innerHTML = `
    <section class="content">
      <div class="container">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
          <h1>Dashboard</h1>
          <div><button id="logout" class="ghost">Logout</button></div>
        </div>
        <div class="card">
          <h2>Add course</h2>
          <form id="add-form">
            <input name="title" placeholder="Title" required style="margin-bottom:0.5rem" />
            <textarea name="description" placeholder="Description" required style="margin-bottom:0.5rem"></textarea>
            <div><button type="submit">Add</button></div>
          </form>
        </div>
        <section style="margin-top:1rem">
          <h2>Your courses</h2>
          <div id="manage-list"></div>
        </section>
      </div>
    </section>
  `
  document.getElementById('logout').addEventListener('click', () => { logout() })
  const addForm = document.getElementById('add-form')
  addForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const fd = new FormData(addForm)
    const title = fd.get('title').trim()
    const description = fd.get('description').trim()
    if (!title) return
    await createCourseOnServer(title, description)
    renderDashboard()
  })
  renderManageList()
}

async function renderManageList() {
  const list = document.getElementById('manage-list')
  const courses = await fetchCourses()
  if (!courses.length) { list.innerHTML = '<div class="card">No courses yet.</div>'; return }
  list.innerHTML = courses.map(c => `
    <div class="materials-item">
      <div style="flex:1">
        <strong>${escapeHtml(c.name || c.title)}</strong>
        <div class="muted">${escapeHtml(c.description || '')}</div>
      </div>
      <div style="display:flex;gap:0.5rem">
        <button data-action="edit" data-id="${c.uuid || c.id}" class="ghost">Edit</button>
        <button data-action="manage" data-id="${c.uuid || c.id}" class="ghost">Manage</button>
        <button data-action="delete" data-id="${c.uuid || c.id}" class="ghost">Delete</button>
      </div>
    </div>
  `).join('')
  list.querySelectorAll('button').forEach(b => b.addEventListener('click', async (e) => {
    const id = e.currentTarget.dataset.id
    const action = e.currentTarget.dataset.action
    if (action === 'delete') {
      if (!confirm('Delete this course?')) return
      await deleteCourseOnServer(id)
      renderDashboard()
    } else if (action === 'edit') {
      openEditForm(id)
    } else if (action === 'manage') {
      navigateTo(`/dashboard/courses/${encodeURIComponent(id)}`)
    }
  }))
}

function openEditForm(id) {
  fetchCourse(id).then(course => {
    if (!course) return renderNotFound()
  app.innerHTML = `
    <section class="content">
      <div class="container">
        <div class="card" style="max-width:760px;margin:0 auto;text-align:left;">
          <h1>Edit course</h1>
          <form id="edit-form">
            <input name="title" value="${escapeHtml(course.name || course.title)}" required style="margin-bottom:0.5rem" />
            <textarea name="description" required style="margin-bottom:0.5rem">${escapeHtml(course.description || '')}</textarea>
            <div class="form-actions"><button type="submit">Save</button> <button id="cancel" class="ghost">Cancel</button></div>
          </form>
        </div>
      </div>
    </section>
  `
  document.getElementById('cancel').addEventListener('click', (e) => { e.preventDefault(); renderDashboard() })
  document.getElementById('edit-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const title = fd.get('title').trim()
    const description = fd.get('description').trim()
    await updateCourseOnServer(id, title, description)
    renderDashboard()
  })
  }).catch(() => renderNotFound())
}

// Lecturer: manage single course (materials)
async function renderManageCourse(params) {
  if (!isAuth()) { navigateTo('/login'); return }
  const id = params.uuid
  const course = await fetchCourse(id)
  if (!course) return renderNotFound()
  const materials = (course.materials || []).slice().sort((a,b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return tb - ta
  })
  app.innerHTML = `
    <section class="content">
      <div class="container">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
          <h1>Manage course: ${escapeHtml(course.name || course.title)}</h1>
          <div><a href="/dashboard" data-link class="btn-ghost">Back</a></div>
        </div>

        <div class="card">
          <h2>Materials</h2>
          <div id="materials-list" class="materials-list">
            ${materials.length ? '' : '<div class="card">No materials yet.</div>'}
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1rem">
          <div class="card">
            <h3>Add file</h3>
            <form id="upload-form">
              <label class="field">Title<input name="name" required /></label>
              <label class="field">Short description<input name="description" /></label>
              <label class="field">File<input type="file" name="file" required /></label>
              <input type="hidden" name="type" value="file" />
              <div class="form-actions"><button type="submit">Upload file</button></div>
            </form>
          </div>

          <div class="card">
            <h3>Add link</h3>
            <form id="link-form">
              <label class="field">Title<input name="name" required /></label>
              <label class="field">URL<input type="url" name="url" placeholder="https://..." required /></label>
              <label class="field">Short description<input name="description" /></label>
              <div class="form-actions"><button type="submit">Add link</button></div>
            </form>
          </div>
        </div>
      </div>
    </section>
  `

  function renderMaterials() {
    const container = document.getElementById('materials-list')
    const arr = (course.materials || []).slice().sort((a,b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return tb - ta
    })
    if (!arr.length) { container.innerHTML = '<div class="card">No materials yet.</div>'; return }
    container.innerHTML = arr.map(m => {
      if (m.type === 'file') {
        return `
          <div class="materials-item">
            <div style="flex:1">
              <strong>${escapeHtml(m.name)}</strong>
              <div class="muted">${escapeHtml(m.description || '')}</div>
              <div><a href="${m.fileUrl}" target="_blank" rel="noopener">Download</a> — ${m.mimeType || ''} ${m.sizeBytes ? '('+m.sizeBytes+' bytes)' : ''}</div>
            </div>
            <div style="display:flex;gap:0.5rem">
              <button data-action="edit-material" data-id="${m.uuid}" class="ghost">Edit</button>
              <button data-action="delete-material" data-id="${m.uuid}" class="ghost">Delete</button>
            </div>
          </div>
        `
      }
      return `
        <div class="materials-item">
          <div style="display:flex;gap:0.5rem;align-items:center;flex:1">
            ${m.faviconUrl ? `<img src="${m.faviconUrl}" style="width:28px;height:28px;object-fit:contain;border-radius:6px" />` : ''}
            <div>
              <strong><a href="${m.url}" target="_blank" rel="noopener">${escapeHtml(m.name)}</a></strong>
              <div class="muted">${escapeHtml(m.description || '')}</div>
            </div>
          </div>
          <div style="display:flex;gap:0.5rem">
            <button data-action="edit-material" data-id="${m.uuid}" class="ghost">Edit</button>
            <button data-action="delete-material" data-id="${m.uuid}" class="ghost">Delete</button>
          </div>
        </div>
      `
    }).join('')
    // attach listeners
    container.querySelectorAll('button').forEach(b => b.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id
      const action = e.currentTarget.dataset.action
      if (action === 'delete-material') {
        if (!confirm('Delete this material?')) return
        await fetch(`${API_BASE}/courses/${encodeURIComponent(idCourse(id))}/materials/${encodeURIComponent(id)}`, { method: 'DELETE' })
        // refresh
        const latest = await fetchCourse(idCourse(id))
        course.materials = latest.materials || []
        renderMaterials()
      } else if (action === 'edit-material') {
        openEditMaterial(id)
      }
    }))
  }

  function idCourse(materialId) {
    // helper — materials stored on this course
    return course.uuid || course.id
  }

  function openEditMaterial(materialId) {
    const m = (course.materials || []).find(x => x.uuid === materialId)
    if (!m) return
    const formHtml = `
      <h4>Edit material</h4>
      <form id="edit-material-form">
        <input name="name" value="${escapeHtml(m.name)}" required style="width:100%;padding:0.5rem;margin-bottom:0.5rem" />
        <input name="description" value="${escapeHtml(m.description || '')}" style="width:100%;padding:0.5rem;margin-bottom:0.5rem" />
        ${m.type === 'url' ? `<input name="url" value="${escapeHtml(m.url || '')}" style="width:100%;padding:0.5rem;margin-bottom:0.5rem" />` : ''}
        <div><button type="submit">Save</button> <button id="cancel-edit">Cancel</button></div>
      </form>
    `
    const container = document.getElementById('materials-list')
    container.insertAdjacentHTML('afterbegin', formHtml)
    document.getElementById('cancel-edit').addEventListener('click', (e) => { e.preventDefault(); renderMaterials() })
    document.getElementById('edit-material-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(e.currentTarget)
      const payload = { name: fd.get('name'), description: fd.get('description') }
      if (m.type === 'url') payload.url = fd.get('url')
      await fetch(`${API_BASE}/courses/${encodeURIComponent(idCourse(materialId))}/materials/${encodeURIComponent(materialId)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const latest = await fetchCourse(idCourse(materialId))
      course.materials = latest.materials || []
      renderMaterials()
    })
  }

  // upload handler
  document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const f = e.currentTarget
    const fd = new FormData(f)
    try {
      const res = await fetch(`${API_BASE}/courses/${encodeURIComponent(id)}/materials`, { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Upload failed')
        return
      }
      const created = await res.json()
      course.materials = (course.materials || []).concat([created])
      renderMaterials()
      f.reset()
    } catch (e) { alert('Upload failed') }
  })

  document.getElementById('link-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const payload = { type: 'url', name: fd.get('name'), description: fd.get('description'), url: fd.get('url') }
    try {
      const res = await fetch(`${API_BASE}/courses/${encodeURIComponent(id)}/materials`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) { const err = await res.json().catch(()=>({})); alert(err.error||'Failed'); return }
      const created = await res.json()
      course.materials = (course.materials || []).concat([created])
      renderMaterials()
      e.currentTarget.reset()
    } catch (e) { alert('Failed to add link') }
  })

  renderMaterials()
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
}

route('/', renderHome)
route('/courses', renderCourses)
route('/courses/:uuid', renderCourseDetail)
route('/login', renderLogin)
route('/dashboard', renderDashboard)
route('/dashboard/courses/:uuid', renderManageCourse)

updateNav()
router()

window.navigateTo = navigateTo

// mobile menu toggle
const menuToggle = document.querySelector('.menu-toggle')
if (menuToggle) {
  menuToggle.addEventListener('click', () => {
    const navEl = document.querySelector('.main-nav')
    if (!navEl) return
    const expanded = menuToggle.getAttribute('aria-expanded') === 'true'
    menuToggle.setAttribute('aria-expanded', String(!expanded))
    navEl.style.display = expanded ? 'none' : 'flex'
  })
  window.addEventListener('resize', () => {
    const navEl = document.querySelector('.main-nav')
    if (!navEl) return
    if (window.innerWidth > 900) navEl.style.display = ''
  })
}


// theme handling
const THEME_KEY = 'tda_theme'
function applyTheme(name) {
  const body = document.body
  if (name === 'light') body.classList.add('light-theme')
  else body.classList.remove('light-theme')
  const btn = document.getElementById('theme-toggle')
  if (btn) btn.textContent = name === 'light' ? '☀️' : '🌙'
}

function loadTheme() {
  try {
    const t = localStorage.getItem(THEME_KEY) || 'dark'
    applyTheme(t)
  } catch (e) { applyTheme('dark') }
}

function toggleTheme() {
  const isLight = document.body.classList.contains('light-theme')
  const next = isLight ? 'dark' : 'light'
  try { localStorage.setItem(THEME_KEY, next) } catch (e) {}
  applyTheme(next)
}

const themeBtn = document.getElementById('theme-toggle')
if (themeBtn) {
  themeBtn.addEventListener('click', () => toggleTheme())
}

loadTheme()

