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

// QUIZ API Functions
async function fetchQuizzesForCourse(courseUuid) {
  try {
    const res = await fetch(`${API_BASE}/quizzes/course/${encodeURIComponent(courseUuid)}`)
    if (!res.ok) throw new Error('Failed to fetch')
    return await res.json()
  } catch (e) {
    console.error(e)
    return []
  }
}

async function fetchQuizForTaking(quizId) {
  try {
    const res = await fetch(`${API_BASE}/quizzes/${encodeURIComponent(quizId)}/take`)
    if (!res.ok) throw new Error('Failed to fetch')
    return await res.json()
  } catch (e) {
    console.error(e)
    return null
  }
}

async function fetchQuizDetails(quizId) {
  try {
    const res = await fetch(`${API_BASE}/quizzes/${encodeURIComponent(quizId)}/detail`)
    if (!res.ok) throw new Error('Failed to fetch')
    return await res.json()
  } catch (e) {
    console.error(e)
    return null
  }
}

async function createQuiz(courseUuid, title, description, questions) {
  try {
    const res = await fetch(`${API_BASE}/quizzes/course/${encodeURIComponent(courseUuid)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, questions })
    })
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      throw new Error(errBody.error || 'Create failed')
    }
    return await res.json()
  } catch (e) {
    console.error(e)
    throw e
  }
}

async function updateQuiz(quizId, title, description, questions) {
  try {
    const res = await fetch(`${API_BASE}/quizzes/${encodeURIComponent(quizId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, questions })
    })
    if (!res.ok) throw new Error('Update failed')
    return await res.json()
  } catch (e) {
    console.error(e)
    throw e
  }
}

async function deleteQuiz(quizId) {
  try {
    const res = await fetch(`${API_BASE}/quizzes/${encodeURIComponent(quizId)}`, { method: 'DELETE' })
    if (!res.ok && res.status !== 204) throw new Error('Delete failed')
    return true
  } catch (e) {
    console.error(e)
    throw e
  }
}

async function deleteQuestionFromQuiz(quizId, questionId) {
  try {
    const res = await fetch(`${API_BASE}/quizzes/${encodeURIComponent(quizId)}/questions/${encodeURIComponent(questionId)}`, { method: 'DELETE' })
    if (!res.ok && res.status !== 204) throw new Error('Delete failed')
    return true
  } catch (e) {
    console.error(e)
    throw e
  }
}

async function updateQuestion(quizId, questionId, data) {
  try {
    const res = await fetch(`${API_BASE}/quizzes/${encodeURIComponent(quizId)}/questions/${encodeURIComponent(questionId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error('Update failed')
    return await res.json()
  } catch (e) {
    console.error(e)
    throw e
  }
}

async function submitQuiz(quizId, answers) {
  try {
    const res = await fetch(`${API_BASE}/quizzes/${encodeURIComponent(quizId)}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers })
    })
    if (!res.ok) throw new Error('Submit failed')
    return await res.json()
  } catch (e) {
    console.error(e)
    throw e
  }
}

async function fetchQuizResults(quizId) {
  try {
    const res = await fetch(`${API_BASE}/quizzes/${encodeURIComponent(quizId)}/results`)
    if (!res.ok) throw new Error('Failed to fetch')
    return await res.json()
  } catch (e) {
    console.error(e)
    return null
  }
}

// FEED API Functions
async function fetchFeedPosts(courseUuid) {
  try {
    const res = await fetch(`${API_BASE}/courses/${encodeURIComponent(courseUuid)}/feed`)
    if (!res.ok) throw new Error('Failed to fetch')
    return await res.json()
  } catch (e) {
    console.error(e)
    return []
  }
}

async function createFeedPost(courseUuid, message) {
  try {
    const res = await fetch(`${API_BASE}/courses/${encodeURIComponent(courseUuid)}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    })
    if (!res.ok) throw new Error('Create failed')
    return await res.json()
  } catch (e) {
    console.error(e)
    throw e
  }
}

async function updateFeedPost(courseUuid, postId, message) {
  try {
    const res = await fetch(`${API_BASE}/courses/${encodeURIComponent(courseUuid)}/feed/${encodeURIComponent(postId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    })
    if (!res.ok) throw new Error('Update failed')
    return await res.json()
  } catch (e) {
    console.error(e)
    throw e
  }
}

async function deleteFeedPost(courseUuid, postId) {
  try {
    const res = await fetch(`${API_BASE}/courses/${encodeURIComponent(courseUuid)}/feed/${encodeURIComponent(postId)}`, {
      method: 'DELETE'
    })
    if (!res.ok && res.status !== 204) throw new Error('Delete failed')
    return true
  } catch (e) {
    console.error(e)
    throw e
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
  const quizzes = await fetchQuizzesForCourse(params.uuid)
  const feedPosts = await fetchFeedPosts(params.uuid)
  
  app.innerHTML = `
    <section class="content">
      <div class="container">
        <div class="card">
          <h1>${escapeHtml(course.name || course.title)}</h1>
          <p class="muted">${escapeHtml(course.description || '')}</p>
        </div>
        <section class="feedCont" style="margin-top:1rem">
          <h2>Feed</h2>
          <div id="feed-container" style="min-height:200px">
            <div class="card">Loading...</div>
          </div>
        </section>
        <section style="margin-top:1rem">
          <h2>Quizzes</h2>
          <div id="public-quizzes-list" class="materials-list">
            ${quizzes && quizzes.length ? quizzes.map(q => `<div class="materials-item">
              <div style="flex:1">
                <strong>${escapeHtml(q.title)}</strong>
                <div class="muted">${escapeHtml(q.description || '')}</div>
                <div class="muted">Completed: ${q.attemptsCount} times</div>
              </div>
              <div><button data-action="take-quiz" data-id="${q.id}" class="btn-ghost">Take Quiz</button></div>
            </div>`).join('') : '<div class="card">No quizzes yet.</div>'}
          </div>
        </section>
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
  
  // Initialize feed UI and SSE connection
  initializeFeedUI(params.uuid, feedPosts)
  
  // Attach quiz event listeners
  document.querySelectorAll('[data-action="take-quiz"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const quizId = e.currentTarget.dataset.id
      navigateTo(`/quiz/${encodeURIComponent(quizId)}`)
    })
  })
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

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-top:1rem">
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

          <div class="card">
            <h3>Add quiz</h3>
            <form id="new-quiz-form">
              <label class="field">Title<input name="title" required /></label>
              <label class="field">Description<textarea name="description" rows="2"></textarea></label>
              <div class="form-actions"><button type="submit">Create Quiz</button></div>
            </form>
          </div>

        </div>

        <section style="margin-top:1rem">
          <h2>Existing Quizzes</h2>
          <div id="quizzes-list"></div>
        </section>

        <div class="card" style="margin-bottom:1rem">
          <h2>Feed</h2>
          <div id="feed-management-container" style="min-height:200px">
            <div class="card">Loading...</div>
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
      await renderMaterials()
      f.reset()
    } catch (e) {
      console.error('Failed to upload material:', e)
      alert('Upload failed')
    }
  })

  document.getElementById('link-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const payload = { type: 'url', name: fd.get('name'), description: fd.get('description'), url: fd.get('url') }
    try {
      const res = await fetch(`${API_BASE}/courses/${encodeURIComponent(id)}/materials`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) { const err = await res.json().catch(()=>({})); alert(err.error||'Failed'); return }
      const created = await res.json()
      course.materials = (course.materials || []).concat([created])
      await renderMaterials()
      form.reset()
    } catch (e) {
      console.error('Failed to add link:', e)
      alert('Failed to add link')
    }
  })

  async function renderQuizzes() {
    try {
      const container = document.getElementById('quizzes-list')
      const quizzes = await fetchQuizzesForCourse(id)
      if (!quizzes || !quizzes.length) {
        container.innerHTML = '<div class="card">No quizzes yet.</div>'
        return
      }
      container.innerHTML = quizzes.map(q => `
        <div class="materials-item">
          <div style="flex:1">
            <strong>${escapeHtml(q.title)}</strong>
            <div class="muted">${escapeHtml(q.description || '')}</div>
            <div class="muted">${q.questions.length} questions | ${q.attemptsCount} attempts</div>
          </div>
          <div style="display:flex;gap:0.5rem">
            <button data-action="edit-quiz" data-id="${q.id}" class="ghost">Edit</button>
            <button data-action="view-results" data-id="${q.id}" class="ghost">Results</button>
            <button data-action="delete-quiz" data-id="${q.id}" class="ghost">Delete</button>
          </div>
        </div>
      `).join('')
      
      container.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const quizId = e.currentTarget.dataset.id
          const action = e.currentTarget.dataset.action
          
          if (action === 'delete-quiz') {
            if (!confirm('Delete this quiz?')) return
            await deleteQuiz(quizId)
            await renderQuizzes()
          } else if (action === 'edit-quiz') {
            navigateTo(`/dashboard/quiz-edit/${encodeURIComponent(quizId)}`)
          } else if (action === 'view-results') {
            navigateTo(`/dashboard/quiz-results/${encodeURIComponent(quizId)}`)
          }
        })
      })
    } catch (e) {
      console.error('renderQuizzes error:', e)
      throw e
    }
  }

  document.getElementById('new-quiz-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const title = fd.get('title')
    const description = fd.get('description')
    
    try {
      await createQuiz(id, title, description, [])
      await renderQuizzes()
      form.reset()
    } catch (e) {
      console.error(e)
      alert('Failed to create quiz')
    }
  })

  renderMaterials()
  renderQuizzes()
  
  // Initialize feed UI for lecturers (with editing capabilities)
  initializeFeedUIForLecturer(id)
}

// Feed UI initialization for regular users/students
function initializeFeedUI(courseUuid, initialPosts) {
  const container = document.getElementById('feed-container')
  if (!container) return

  // Render initial posts
  function renderFeedPosts(posts) {
    if (!posts || posts.length === 0) {
      container.innerHTML = '<div class="feed-empty">Feed channel is empty.</div>'
      return
    }

    container.innerHTML = posts.map(post => `
      <div class="feed-post ${post.edited ? 'edited' : ''}">
        <div class="feed-post-header">
          <div style="flex: 1;">
            <div class="feed-post-meta">
              <span>${post.authorType === 'system' ? '🔔 System' : '👨‍🏫 Lecturer'}</span>
              <span>${new Date(post.createdAt).toLocaleString('cs-CZ')}</span>
              ${post.edited && post.editedAt ? `<span>edited ${new Date(post.editedAt).toLocaleString('cs-CZ')}</span>` : ''}
            </div>
            <div class="feed-post-content">${escapeHtml(post.message)}</div>
          </div>
        </div>
      </div>
    `).join('')
  }

  renderFeedPosts(initialPosts)

  // Connect to SSE for real-time updates
  const eventSource = new EventSource(`${API_BASE}/courses/${encodeURIComponent(courseUuid)}/feed/stream`)

  eventSource.addEventListener('new_post', (e) => {
    try {
      const post = JSON.parse(e.data)
      // Prepend new post to the top
      const allPosts = [post]
      const existingHtml = container.innerHTML
      if (!existingHtml.includes('feed-empty')) {
        const posts = document.querySelectorAll('.feed-post')
        if (posts.length > 0) {
          const allText = Array.from(posts).map(p => p.outerHTML).join('')
          container.innerHTML = `
            <div class="feed-post ${post.edited ? 'edited' : ''}">
              <div class="feed-post-header">
                <div style="flex: 1;">
                  <div class="feed-post-meta">
                    <span>${post.authorType === 'system' ? '🔔 System' : '👨‍🏫 Lecturer'}</span>
                    <span>${new Date(post.createdAt).toLocaleString('cs-CZ')}</span>
                  </div>
                  <div class="feed-post-content">${escapeHtml(post.message)}</div>
                </div>
              </div>
            </div>
          ` + allText
          return
        }
      }
      renderFeedPosts([post])
    } catch (err) {
      console.error('Failed to parse SSE event:', err)
    }
  })

  eventSource.addEventListener('updated_post', (e) => {
    try {
      const post = JSON.parse(e.data)
      // Find and update the post
      const posts = document.querySelectorAll('.feed-post')
      let found = false
      posts.forEach(el => {
        const postText = el.innerText
        if (postText.includes(post.message)) {
          el.classList.add('edited')
          found = true
        }
      })
    } catch (err) {
      console.error('Failed to parse SSE event:', err)
    }
  })

  eventSource.addEventListener('deleted_post', (e) => {
    try {
      const data = JSON.parse(e.data)
      // The post is removed from the feed on the server side
      // In a real app, you'd refresh the feed or remove the post from DOM
      location.reload()
    } catch (err) {
      console.error('Failed to parse SSE event:', err)
    }
  })

  return eventSource
}

// Feed UI initialization for lecturers (with editing capabilities)
function initializeFeedUIForLecturer(courseUuid) {
  const container = document.getElementById('feed-management-container')
  if (!container) return

  let eventSource = null
  let allPosts = []

  async function loadAndRenderPosts() {
    try {
      allPosts = await fetchFeedPosts(courseUuid)
      renderFeedPosts(allPosts)
    } catch (err) {
      console.error('Failed to load feed posts:', err)
      container.innerHTML = '<div class="card">Chyba při načítání kanálu.</div>'
    }
  }

  function renderFeedPosts(posts) {
    if (!posts || posts.length === 0) {
      container.innerHTML = `
        <div class="feed-empty">Feed channel is empty.</div>
        <div class="feed-new-post-form">
          <textarea id="new-feed-message" placeholder="New post..."></textarea>
          <button id="add-feed-post-btn">Add post</button>
        </div>
      `
    } else {
      container.innerHTML = `
        <div class="feed-new-post-form">
          <textarea id="new-feed-message" placeholder="New post..."></textarea>
          <button id="add-feed-post-btn">Add post</button>
        </div>
      ` + posts.map(post => `
        <div class="feed-post ${post.edited ? 'edited' : ''}" data-post-id="${post.uuid}">
          <div class="feed-post-header">
            <div style="flex: 1;">
              <div class="feed-post-meta">
                <span>${post.authorType === 'system' ? '🔔 System' : '👨‍🏫 Lecturer'}</span>
                <span>${new Date(post.createdAt).toLocaleString('cs-CZ')}</span>
                ${post.edited && post.editedAt ? `<span>edited ${new Date(post.editedAt).toLocaleString('cs-CZ')}</span>` : ''}
              </div>
              <div class="feed-post-content">${escapeHtml(post.message)}</div>
            </div>
          </div>
          ${post.type === 'manual' ? `
            <div class="feed-post-actions">
              <!--<button data-action="edit-post" data-post-id="${post.uuid}">Edit</button>-->
              <button data-action="delete-post" data-post-id="${post.uuid}">Delete</button>
            </div>
          ` : ''}
        </div>
      `).join('')
    }

    // Attach event listeners
    attachFeedEventListeners()
  }

  function attachFeedEventListeners() {
    // Add new post button
    const addBtn = document.getElementById('add-feed-post-btn')
    if (addBtn) {
      addBtn.removeEventListener('click', handleAddPost)
      addBtn.addEventListener('click', handleAddPost)
    }

    // Edit buttons
    document.querySelectorAll('[data-action="edit-post"]').forEach(btn => {
      btn.removeEventListener('click', handleEditPost)
      btn.addEventListener('click', handleEditPost)
    })

    // Delete buttons
    document.querySelectorAll('[data-action="delete-post"]').forEach(btn => {
      btn.removeEventListener('click', handleDeletePost)
      btn.addEventListener('click', handleDeletePost)
    })
  }

  async function handleAddPost() {
    const textarea = document.getElementById('new-feed-message')
    const message = textarea.value.trim()
    if (!message) return

    try {
      await createFeedPost(courseUuid, message)
      textarea.value = ''
      await loadAndRenderPosts()
    } catch (err) {
      alert('Chyba při vytváření příspěvku')
      console.error(err)
    }
  }

  async function handleEditPost(e) {
    const postId = e.currentTarget.dataset.postId
    const post = allPosts.find(p => p.id === postId)
    if (!post) return

    const newMessage = prompt('Upravit příspěvek:', post.message)
    if (newMessage === null || newMessage.trim() === '') return

    try {
      await updateFeedPost(courseUuid, postId, newMessage)
      await loadAndRenderPosts()
    } catch (err) {
      alert('Chyba při úpravě příspěvku')
      console.error(err)
    }
  }

  async function handleDeletePost(e) {
    const postId = e.currentTarget.dataset.postId
    if (!confirm('Opravdu chcete smazat tento příspěvek?')) return

    try {
      await deleteFeedPost(courseUuid, postId)
      await loadAndRenderPosts()
    } catch (err) {
      alert('Chyba při mazání příspěvku')
      console.error(err)
    }
  }

  // Load initial posts and setup SSE
  loadAndRenderPosts()

  // Setup SSE connection for real-time updates
  eventSource = new EventSource(`${API_BASE}/courses/${encodeURIComponent(courseUuid)}/feed/stream`)

  eventSource.addEventListener('new_post', (e) => {
    try {
      const post = JSON.parse(e.data)
      allPosts.unshift(post)
      renderFeedPosts(allPosts)
    } catch (err) {
      console.error('Failed to parse SSE event:', err)
    }
  })

  eventSource.addEventListener('updated_post', (e) => {
    try {
      const post = JSON.parse(e.data)
      const idx = allPosts.findIndex(p => p.id === post.id)
      if (idx !== -1) {
        allPosts[idx] = post
        renderFeedPosts(allPosts)
      }
    } catch (err) {
      console.error('Failed to parse SSE event:', err)
    }
  })

  eventSource.addEventListener('deleted_post', (e) => {
    try {
      const data = JSON.parse(e.data)
      allPosts = allPosts.filter(p => p.id !== data.id)
      renderFeedPosts(allPosts)
    } catch (err) {
      console.error('Failed to parse SSE event:', err)
    }
  })
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
}

route('/', renderHome)
route('/courses', renderCourses)
route('/courses/:uuid', renderCourseDetail)
route('/login', renderLogin)
route('/dashboard', renderDashboard)
// Take quiz - user taking a quiz
async function renderTakeQuiz(params) {
  const quizId = params.quizId
  const quiz = await fetchQuizForTaking(quizId)
  if (!quiz) { renderNotFound(); return }
  
  app.innerHTML = `
    <section class="content">
      <div class="container">
        <div class="card">
          <h1>${escapeHtml(quiz.title)}</h1>
          <p class="muted">${escapeHtml(quiz.description || '')}</p>
        </div>
        <form id="quiz-form" style="margin-top:1rem">
          <div id="questions-container"></div>
          <div style="margin-top:1rem" class="form-actions">
            <button type="submit">Submit Quiz</button>
            <a href="/courses" data-link class="btn-ghost">Cancel</a>
          </div>
        </form>
      </div>
    </section>
  `
  
  const container = document.getElementById('questions-container')
  const questionsHtml = quiz.questions.map((q, idx) => {
    if (q.type === 'single') {
      return `
        <div class="card" style="margin-bottom:1rem">
          <h3>${idx + 1}. ${escapeHtml(q.text)}</h3>
          <div style="margin-top:0.5rem">
            ${q.options.map((opt, i) => `
              <label style="display:block;margin-bottom:0.5rem">
                <input type="radio" name="question-${q.id}" value="${escapeHtml(opt)}" required />
                ${escapeHtml(opt)}
              </label>
            `).join('')}
          </div>
        </div>
      `
    } else { // multiple
      return `
        <div class="card" style="margin-bottom:1rem">
          <h3>${idx + 1}. ${escapeHtml(q.text)}</h3>
          <div style="margin-top:0.5rem">
            ${q.options.map((opt, i) => `
              <label style="display:block;margin-bottom:0.5rem">
                <input type="checkbox" name="question-${q.id}" value="${escapeHtml(opt)}" />
                ${escapeHtml(opt)}
              </label>
            `).join('')}
          </div>
        </div>
      `
    }
  }).join('')
  
  container.innerHTML = questionsHtml
  
  const form = document.getElementById('quiz-form')
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    const answers = quiz.questions.map(q => {
      const inputs = form.querySelectorAll(`[name="question-${q.id}"]`)
      const selected = Array.from(inputs).filter(i => i.checked).map(i => i.value)
      return { questionId: q.id, selectedOptions: selected }
    })
    
    try {
      const result = await submitQuiz(quizId, answers)
      // Store result before navigation
      sessionStorage.setItem(`quiz_result_${result.id}`, JSON.stringify(result))
      navigateTo(`/quiz-result/${encodeURIComponent(quizId)}/${encodeURIComponent(result.id)}`)
    } catch (e) {
      alert('Failed to submit quiz: ' + (e.message || 'Unknown error'))
    }
  })
}

// Show quiz results
async function renderQuizResult(params) {
  const { quizId, resultId } = params
  const quiz = await fetchQuizDetails(quizId)
  
  if (!quiz) { renderNotFound(); return }
  
  // Get result from local storage (we pass it after submission)
  const resultStr = sessionStorage.getItem(`quiz_result_${resultId}`)
  let result = resultStr ? JSON.parse(resultStr) : null
  
  // If not in session, we could fetch from API (but results are not exposed in our API)
  if (!result) {
    alert('Result not found. Please retake the quiz.')
    navigateTo('/courses')
    return
  }
  
  sessionStorage.removeItem(`quiz_result_${resultId}`)
  
  app.innerHTML = `
    <section class="content">
      <div class="container">
        <div class="card">
          <h1>Quiz Results</h1>
          <h2>${escapeHtml(quiz.title)}</h2>
          <div style="margin-top:1rem;font-size:1.5rem;font-weight:bold">
            Score: ${result.score.toFixed(1)}%
            <span style="margin-left:1rem;color:${result.isPassed ? '#4CAF50' : '#ff6b6b'}">${result.isPassed ? '✓ Passed' : '✗ Failed'}</span>
          </div>
        </div>
        <div id="results-detail" style="margin-top:1rem"></div>
        <div style="margin-top:1rem">
          <a href="/courses" data-link class="btn-ghost">Back to courses</a>
        </div>
      </div>
    </section>
  `
  
  const detailContainer = document.getElementById('results-detail')
  const detailsHtml = result.questions.map((q, idx) => {
    const isCorrect = JSON.stringify(q.userAnswer.sort()) === JSON.stringify(q.correctAnswers.sort())
    return `
      <div class="card" style="margin-bottom:1rem;border-left:4px solid ${isCorrect ? '#4CAF50' : '#ff6b6b'}">
        <h3>${idx + 1}. ${escapeHtml(q.text)}</h3>
        <div style="margin-top:0.5rem">
          <div><strong>Your answer:</strong> ${escapeHtml(q.userAnswer.join(', ') || 'Not answered')}</div>
          <div><strong>Correct answer:</strong> ${escapeHtml(q.correctAnswers.join(', '))}</div>
          <div style="margin-top:0.5rem;color:${isCorrect ? '#4CAF50' : '#ff6b6b'};font-weight:bold">
            ${isCorrect ? '✓ Correct' : '✗ Incorrect'}
          </div>
        </div>
      </div>
    `
  }).join('')
  detailContainer.innerHTML = detailsHtml
  
  sessionStorage.removeItem(`quiz_result_${resultId}`)
}

// Manage quizzes - lecturer view
// Edit quiz questions
async function renderEditQuiz(params) {
  if (!isAuth()) { navigateTo('/login'); return }
  const quizId = params.quizId
  const quiz = await fetchQuizDetails(quizId)
  
  if (!quiz) { renderNotFound(); return }
  
  app.innerHTML = `
    <section class="content">
      <div class="container">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
          <h1>Edit Quiz: ${escapeHtml(quiz.title)}</h1>
          <div><a href="/dashboard" data-link class="btn-ghost">Back</a></div>
        </div>
        
        <div class="card" style="margin-bottom:1rem">
          <h2>Quiz Info</h2>
          <form id="quiz-info-form">
            <label class="field">Title<input name="title" value="${escapeHtml(quiz.title)}" required /></label>
            <label class="field">Description<textarea name="description" rows="2">${escapeHtml(quiz.description || '')}</textarea></label>
            <div class="form-actions"><button type="submit">Save</button></div>
          </form>
        </div>
        
        <div class="card" style="margin-bottom:1rem">
          <h2>Add Question</h2>
          <form id="new-question-form">
            <label class="field">Question Text<input name="text" required /></label>
            <label class="field">Type
              <select name="type" required style="padding:0.5rem">
                <option value="">Select type...</option>
                <option value="single">Single Choice</option>
                <option value="multiple">Multiple Choice</option>
              </select>
            </label>
            <label class="field">Options (comma-separated)<input name="options" placeholder="Option 1, Option 2, Option 3" required /></label>
            <label class="field">Correct Answers (comma-separated)<input name="correctAnswers" placeholder="Option 1, Option 3" required /></label>
            <div class="form-actions"><button type="submit">Add Question</button></div>
          </form>
        </div>
        
        <section>
          <h2>Questions</h2>
          <div id="questions-list"></div>
        </section>
      </div>
    </section>
  `
  
  // Handle quiz info update
  document.getElementById('quiz-info-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const title = fd.get('title')
    const description = fd.get('description')
    
    try {
      await updateQuiz(quizId, title, description, quiz.questions)
      quiz.title = title
      quiz.description = description
      renderEditQuiz(params)
    } catch (e) {
      alert('Failed to update quiz')
    }
  })
  
  // Handle new question
  document.getElementById('new-question-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const text = fd.get('text')
    const type = fd.get('type')
    const options = fd.get('options').split(',').map(o => o.trim())
    const correctAnswers = fd.get('correctAnswers').split(',').map(o => o.trim())
    
    if (!text || !type || !options.length || !correctAnswers.length) {
      alert('All fields are required')
      return
    }
    
    const newQuestion = {
      id: uuid(),
      type,
      text,
      options,
      correctAnswers
    }
    
    try {
      const updated = await updateQuiz(quizId, quiz.title, quiz.description, [...quiz.questions, newQuestion])
      quiz.questions = updated.questions
      renderEditQuiz(params)
    } catch (e) {
      alert('Failed to add question')
    }
  })
  
  renderQuestionsList(quizId, quiz)
}

async function renderQuestionsList(quizId, quiz) {
  const container = document.getElementById('questions-list')
  
  if (!quiz.questions || !quiz.questions.length) {
    container.innerHTML = '<div class="card">No questions yet.</div>'
    return
  }
  
  container.innerHTML = quiz.questions.map((q, idx) => `
    <div class="card" style="margin-bottom:1rem">
      <div style="display:flex;justify-content:space-between;align-items:start">
        <div style="flex:1">
          <h4>${idx + 1}. ${escapeHtml(q.text)}</h4>
          <div class="muted" style="margin-top:0.5rem">Type: ${q.type === 'single' ? 'Single Choice' : 'Multiple Choice'}</div>
          <div class="muted">Options: ${escapeHtml(q.options.join(', '))}</div>
          <div class="muted">Correct: ${escapeHtml(q.correctAnswers.join(', '))}</div>
        </div>
        <div style="display:flex;gap:0.5rem">
          <button data-action="edit-question" data-id="${q.id}" class="ghost">Edit</button>
          <button data-action="delete-question" data-id="${q.id}" class="ghost">Delete</button>
        </div>
      </div>
    </div>
  `).join('')
  
  container.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const questionId = e.currentTarget.dataset.id
      const action = e.currentTarget.dataset.action
      
      if (action === 'delete-question') {
        if (!confirm('Delete this question?')) return
        await deleteQuestionFromQuiz(quizId, questionId)
        const updated = await fetchQuizDetails(quizId)
        quiz.questions = updated.questions
        renderQuestionsList(quizId, quiz)
      } else if (action === 'edit-question') {
        const question = quiz.questions.find(q => q.id === questionId)
        if (!question) return
        
        const formHtml = `
          <div class="card" style="margin-bottom:1rem">
            <h4>Edit Question</h4>
            <form id="edit-question-form">
              <label class="field">Question Text<input name="text" value="${escapeHtml(question.text)}" required style="width:100%;padding:0.5rem;margin-bottom:0.5rem" /></label>
              <label class="field">Type
                <select name="type" required style="width:100%;padding:0.5rem;margin-bottom:0.5rem">
                  <option value="single" ${question.type === 'single' ? 'selected' : ''}>Single Choice</option>
                  <option value="multiple" ${question.type === 'multiple' ? 'selected' : ''}>Multiple Choice</option>
                </select>
              </label>
              <label class="field">Options (comma-separated)<input name="options" value="${escapeHtml(question.options.join(', '))}" required style="width:100%;padding:0.5rem;margin-bottom:0.5rem" /></label>
              <label class="field">Correct Answers (comma-separated)<input name="correctAnswers" value="${escapeHtml(question.correctAnswers.join(', '))}" required style="width:100%;padding:0.5rem;margin-bottom:0.5rem" /></label>
              <div><button type="submit">Save</button> <button id="cancel-edit" type="button">Cancel</button></div>
            </form>
          </div>
        `
        container.insertAdjacentHTML('afterbegin', formHtml)
        
        document.getElementById('cancel-edit').addEventListener('click', (e) => {
          e.preventDefault()
          renderQuestionsList(quizId, quiz)
        })
        
        document.getElementById('edit-question-form').addEventListener('submit', async (e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          const text = fd.get('text')
          const type = fd.get('type')
          const options = fd.get('options').split(',').map(o => o.trim())
          const correctAnswers = fd.get('correctAnswers').split(',').map(o => o.trim())
          
          try {
            const updatedQuestions = quiz.questions.map(q => 
              q.id === questionId ? { ...q, text, type, options, correctAnswers } : q
            )
            const updated = await updateQuiz(quizId, quiz.title, quiz.description, updatedQuestions)
            quiz.questions = updated.questions
            renderQuestionsList(quizId, quiz)
          } catch (e) {
            alert('Failed to update question')
          }
        })
      }
    })
  })
}

// View quiz results
async function renderQuizResults(params) {
  if (!isAuth()) { navigateTo('/login'); return }
  const quizId = params.quizId
  const quiz = await fetchQuizDetails(quizId)
  const results = await fetchQuizResults(quizId)
  
  if (!quiz || !results) { renderNotFound(); return }
  
  app.innerHTML = `
    <section class="content">
      <div class="container">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
          <h1>Quiz Results: ${escapeHtml(quiz.title)}</h1>
          <div><a href="/dashboard" data-link class="btn-ghost">Back</a></div>
        </div>
        
        <div class="card">
          <h2>Statistics</h2>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem">
            <div>
              <div class="muted">Total Attempts</div>
              <div style="font-size:2rem;font-weight:bold">${results.totalAttempts}</div>
            </div>
            <div>
              <div class="muted">Average Score</div>
              <div style="font-size:2rem;font-weight:bold">${results.averageScore}%</div>
            </div>
            <div>
              <div class="muted">Pass Rate</div>
              <div style="font-size:2rem;font-weight:bold">${results.totalAttempts > 0 ? ((results.results.filter(r => r.isPassed).length / results.totalAttempts) * 100).toFixed(1) : 0}%</div>
            </div>
          </div>
        </div>
        
        <section style="margin-top:1rem">
          <h2>Individual Results</h2>
          <div id="results-list"></div>
        </section>
      </div>
    </section>
  `
  
  const resultsList = document.getElementById('results-list')
  if (!results.results || !results.results.length) {
    resultsList.innerHTML = '<div class="card">No submissions yet.</div>'
  } else {
    resultsList.innerHTML = results.results.map((r, idx) => `
      <div class="materials-item">
        <div style="flex:1">
          <strong>Submission ${idx + 1}</strong>
          <div class="muted">Score: ${r.score.toFixed(1)}% | Status: ${r.isPassed ? 'Passed' : 'Failed'}</div>
          <div class="muted">Submitted: ${new Date(r.submittedAt).toLocaleString()}</div>
        </div>
      </div>
    `).join('')
  }
}

route('/dashboard/courses/:uuid', renderManageCourse)
route('/quiz/:quizId', renderTakeQuiz)
route('/quiz-result/:quizId/:resultId', renderQuizResult)
route('/dashboard/quiz-edit/:quizId', renderEditQuiz)
route('/dashboard/quiz-results/:quizId', renderQuizResults)

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

