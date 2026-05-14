import './style.css'
import { STAGES } from './data/stages.js'
import { ITEMS } from './data/items.js'

// ═══ PROJECTS ═══
const PROJECT_COLORS = ['#6366F1','#3B82F6','#10B981','#F97316','#EC4899','#8B5CF6','#F59E0B','#14B8A6']
const DEFAULT_PROJECT = { id: 'default', name: 'Withfedd', color: '#6366F1' }

function getProjects() {
  return JSON.parse(localStorage.getItem('wf-projects') || 'null') || [DEFAULT_PROJECT]
}
function saveProjects(p) { localStorage.setItem('wf-projects', JSON.stringify(p)) }

let currentProjectId = localStorage.getItem('wf-current-project') || 'default'

// Migrate legacy wf-status / wf-checked into the default project slot
;(function migrate() {
  if (localStorage.getItem('wf-status-default')) return
  const legacy = localStorage.getItem('wf-status')
  if (legacy) localStorage.setItem('wf-status-default', legacy)
})()

function loadProjectStatuses(projectId) {
  const raw = JSON.parse(localStorage.getItem(`wf-status-${projectId}`) || '{}')
  // migrate old binary wf-checked for default project
  if (projectId === 'default') {
    const old = JSON.parse(localStorage.getItem('wf-checked') || '[]')
    old.forEach(k => { if (!raw[k]) raw[k] = 'done' })
  }
  return new Map(Object.entries(raw))
}

let statuses = loadProjectStatuses(currentProjectId)

// ═══ STATE ═══
let currentStage = null
let currentDetailKey = null
let currentView = 'home'

function saveStatuses() {
  const obj = {}
  statuses.forEach((v, k) => { obj[k] = v })
  localStorage.setItem(`wf-status-${currentProjectId}`, JSON.stringify(obj))
}

// ═══ PROJECT SWITCHER ═══
let _menuOpen = false

function toggleProjectMenu() {
  _menuOpen ? closeProjectMenu() : openProjectMenu()
}

function openProjectMenu() {
  _menuOpen = true
  renderProjectMenu()
  document.getElementById('project-menu').style.display = 'block'
}

function closeProjectMenu() {
  _menuOpen = false
  document.getElementById('project-menu').style.display = 'none'
}

function renderProjectMenu() {
  const projects = getProjects()
  const menu = document.getElementById('project-menu')
  menu.innerHTML = projects.map(p => `
    <div class="pm-item ${p.id === currentProjectId ? 'is-active' : ''}" onclick="switchProject('${p.id}')">
      <div class="pm-mark" style="background:${p.color}">${p.name[0].toUpperCase()}</div>
      <span class="pm-label">${p.name}</span>
      ${p.id === currentProjectId
        ? '<span class="pm-check">✓</span>'
        : projects.length > 1
          ? `<span class="pm-delete" onclick="event.stopPropagation();deleteProject('${p.id}')">✕</span>`
          : ''}
    </div>`).join('') + `
  <div class="pm-sep"></div>
  <div class="pm-item pm-new" onclick="showNewProjectInput()">
    <span style="width:20px;text-align:center;font-size:15px">+</span>
    <span class="pm-label">New project</span>
  </div>`
}

function showNewProjectInput() {
  const menu = document.getElementById('project-menu')
  menu.innerHTML = `
    <div class="pm-new-row">
      <input id="pm-input" placeholder="Project name…" onkeydown="handleProjectKey(event)" />
    </div>
    <div class="pm-item" onclick="closeProjectMenu()" style="font-size:12px">
      <span style="width:20px;text-align:center">↩</span>
      <span class="pm-label" style="color:var(--text3)">Cancel</span>
    </div>`
  setTimeout(() => document.getElementById('pm-input')?.focus(), 30)
}

function handleProjectKey(e) {
  if (e.key === 'Enter') {
    const name = e.target.value.trim()
    if (name) createProject(name)
  } else if (e.key === 'Escape') {
    closeProjectMenu()
  }
}

function createProject(name) {
  const projects = getProjects()
  const color = PROJECT_COLORS[projects.length % PROJECT_COLORS.length]
  const id = 'proj-' + Date.now()
  projects.push({ id, name, color })
  saveProjects(projects)
  switchProject(id)
}

function switchProject(id) {
  saveStatuses()
  currentProjectId = id
  localStorage.setItem('wf-current-project', id)
  statuses = loadProjectStatuses(id)
  const proj = getProjects().find(p => p.id === id)
  if (proj) _applyProjectHeader(proj)
  closeProjectMenu()
  closeDetail()
  updateSidebarProgress()
  showHome()
}

function deleteProject(id) {
  const projects = getProjects()
  if (projects.length <= 1) return
  if (!confirm(`Delete "${projects.find(p=>p.id===id)?.name}"? Progress will be lost.`)) return
  saveProjects(projects.filter(p => p.id !== id))
  localStorage.removeItem(`wf-status-${id}`)
  if (currentProjectId === id) switchProject(getProjects()[0].id)
  else renderProjectMenu()
}

function _applyProjectHeader(proj) {
  document.getElementById('ws-mark').textContent = proj.name[0].toUpperCase()
  document.getElementById('ws-mark').style.background = proj.color
  document.getElementById('ws-name').textContent = proj.name
  document.title = `${proj.name} — Design Process`
}

function getStatus(key) { return statuses.get(key) || 'todo' }

// ═══ STATUS SVG ═══
function statusSVG(key, color) {
  const s = getStatus(key)
  if (s === 'done')
    return `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="7" fill="#10B981"/><polyline points="4,7 6.5,9.5 10.5,4.5" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  if (s === 'doing')
    return `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="${color || '#5A5A68'}" stroke-width="1.5" opacity="0.2"/><circle cx="7" cy="7" r="6" stroke="#F59E0B" stroke-width="1.8" stroke-dasharray="19 20" stroke-linecap="round" transform="rotate(-90 7 7)"/></svg>`
  return `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="${color || '#5A5A68'}" stroke-width="1.5"/></svg>`
}

function prioritySVG(p) {
  const colors = { urgent:'#EF4444', high:'#F97316', medium:'#F59E0B', low:'#8A8A96', none:'#46464F' }
  const heights = { urgent:[8,8,8], high:[4,6,8], medium:[4,6,0], low:[4,0,0], none:[0,0,0] }
  const c = colors[p] || colors.none
  const h = heights[p] || heights.none
  if (p === 'none') return `<span style="color:var(--text3);font-size:11px;">—</span>`
  return `<div class="prio-icon">${h.map(hh => hh ? `<span style="height:${hh}px;background:${c};opacity:1"></span>` : '').join('')}</div>`
}

// ═══ ROW HTML ═══
function rowHTML(k, st) {
  const it = ITEMS[k]
  const id = `${st.code}-0${it.n}`
  const s = getStatus(k)
  return `<div class="issue-row ${s === 'done' ? 'is-done' : s === 'doing' ? 'is-doing' : ''}" id="row-${k}" onclick="openDetail('${k}')" style="--acc-color:${st.color}">
    <div class="ir-status" onclick="event.stopPropagation();cycleStatus('${k}')">${statusSVG(k, st.color)}</div>
    <div class="ir-priority">${prioritySVG(it.priority)}</div>
    <span class="ir-id">${id}</span>
    <span class="ir-title">${it.title}</span>
    <div class="ir-meta">${it.tag ? `<span class="ir-tag">${it.tag}</span>` : ''}</div>
  </div>`
}

// ═══ RENDER ═══
function renderIssueList(stageId) {
  const st = STAGES.find(s => s.id === stageId)
  const keys = Object.keys(ITEMS).filter(k => ITEMS[k].stage === stageId)
  const todo  = keys.filter(k => getStatus(k) === 'todo')
  const doing = keys.filter(k => getStatus(k) === 'doing')
  const done  = keys.filter(k => getStatus(k) === 'done')

  const el = document.getElementById('issue-list-area')
  el.innerHTML = ''

  function renderGroup(title, ks, dotColor) {
    if (!ks.length) return
    const g = document.createElement('div')
    g.innerHTML = `
      <div class="group-header" onclick="toggleGroup(this)">
        <span class="gh-icon">▾</span>
        <span class="gh-title" style="color:${dotColor}">${title}</span>
        <span class="gh-count">${ks.length}</span>
      </div>
      <div class="group-body">${ks.map(k => rowHTML(k, st)).join('')}</div>`
    el.appendChild(g)
  }

  renderGroup('Todo',        todo,  'var(--text2)')
  renderGroup('In Progress', doing, '#F59E0B')
  renderGroup('Done',        done,  '#10B981')

  if (!keys.length) {
    el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:200px;color:var(--text3);gap:8px;"><div style="font-size:28px">${st.icon}</div><div style="font-size:13px;font-weight:600;color:var(--text2)">No issues found</div></div>`
  }

  const total = keys.length, ndone = done.length, ndoing = doing.length
  document.getElementById('sh-total').textContent = total
  document.getElementById('sh-done').textContent = ndone + (ndoing ? ` · ${ndoing} in progress` : '')
  document.getElementById('sh-pct').textContent = total ? Math.round(ndone / total * 100) + '%' : '0%'
  document.getElementById('sh-eyebrow').textContent = `Stage ${st.num}`
  document.getElementById('sh-title').textContent = st.name
  document.getElementById('sh-desc').textContent = st.desc
  document.getElementById('sh-eyebrow').style.color = st.color
  document.getElementById('spb-fill').style.width = (total ? ndone / total * 100 : 0) + '%'
  document.getElementById('spb-fill').style.background = st.color
}

function renderOverview() {
  const el = document.getElementById('stage-overview')
  el.innerHTML = STAGES.map(st => {
    const keys = Object.keys(ITEMS).filter(k => ITEMS[k].stage === st.id)
    const ndone = keys.filter(k => getStatus(k) === 'done').length
    const pct = keys.length ? Math.round(ndone / keys.length * 100) : 0
    return `<div class="stage-card" onclick="showStage('${st.id}')">
      <div class="sc-head">
        <div class="sc-dot" style="background:${st.color}"></div>
        <span class="sc-name">${st.icon} ${st.name}</span>
        <span class="sc-num">${st.num}</span>
      </div>
      <div class="sc-desc">${st.desc}</div>
      <div class="sc-bar"><div class="sc-bar-fill" style="width:${pct}%;background:${st.color}"></div></div>
      <div class="sc-footer"><span>${ndone}/${keys.length} complete</span><span>${pct}%</span></div>
    </div>`
  }).join('')
}

function toggleGroup(header) {
  header.classList.toggle('is-collapsed')
  header.nextElementSibling.classList.toggle('is-collapsed')
}

// ═══ SIDEBAR PROGRESS ═══
function updateSidebarProgress() {
  let totalAll = 0, doneAll = 0, doingAll = 0
  STAGES.forEach(st => {
    const keys = Object.keys(ITEMS).filter(k => ITEMS[k].stage === st.id)
    const ndone  = keys.filter(k => getStatus(k) === 'done').length
    const ndoing = keys.filter(k => getStatus(k) === 'doing').length
    totalAll += keys.length; doneAll += ndone; doingAll += ndoing
    const el = document.getElementById('sp-' + st.id)
    if (el) el.textContent = ndone + '/' + keys.length
  })
  document.getElementById('total-count').textContent = totalAll
  document.getElementById('done-count').textContent = doneAll + (doingAll ? ` · ${doingAll}` : '')
}

// ═══ STATUS CYCLE ═══
function cycleStatus(key) {
  const cur = getStatus(key)
  const next = cur === 'todo' ? 'doing' : cur === 'doing' ? 'done' : 'todo'
  _setStatus(key, next)
}

function advanceStatus(key) {
  const cur = getStatus(key)
  const next = cur === 'todo' ? 'doing' : cur === 'doing' ? 'done' : 'todo'
  _setStatus(key, next)
}

function resetStatus(key) { _setStatus(key, 'todo') }

function _setStatus(key, next) {
  if (next === 'todo') statuses.delete(key)
  else statuses.set(key, next)
  saveStatuses()
  updateSidebarProgress()

  const sel = currentDetailKey
  if (currentView === 'stage' && currentStage) {
    renderIssueList(currentStage)
    if (sel) document.getElementById('row-' + sel)?.classList.add('is-selected')
  } else if (currentView === 'all') {
    _refreshAllRows()
    if (sel) document.getElementById('row-' + sel)?.classList.add('is-selected')
  } else if (currentView === 'done') {
    showDone()
  }

  if (currentDetailKey === key) refreshDetailPanel(key)
}

function _refreshAllRows() {
  const el = document.getElementById('issue-list-area')
  const total  = Object.keys(ITEMS).length
  const ndone  = Object.keys(ITEMS).filter(k => getStatus(k) === 'done').length
  const ndoing = Object.keys(ITEMS).filter(k => getStatus(k) === 'doing').length
  document.getElementById('sh-done').textContent = ndone + (ndoing ? ` · ${ndoing} in progress` : '')
  document.getElementById('sh-pct').textContent = Math.round(ndone / total * 100) + '%'
  document.getElementById('spb-fill').style.width = (ndone / total * 100) + '%'
  el.innerHTML = ''
  STAGES.forEach(st => {
    const keys = Object.keys(ITEMS).filter(k => ITEMS[k].stage === st.id)
    if (!keys.length) return
    const g = document.createElement('div')
    g.innerHTML = `<div class="group-header" onclick="toggleGroup(this)"><span class="gh-icon">▾</span><div style="width:8px;height:8px;border-radius:50%;background:${st.color};flex-shrink:0"></div><span class="gh-title">${st.name}</span><span class="gh-count">${keys.length}</span></div><div class="group-body">${keys.map(k => rowHTML(k, st)).join('')}</div>`
    el.appendChild(g)
  })
}

// ═══ NAVIGATION ═══
function setActiveNav(id) {
  document.querySelectorAll('.sb-item').forEach(el => el.classList.remove('is-active'))
  if (id) document.getElementById(id)?.classList.add('is-active')
}

function showStage(stageId) {
  currentStage = stageId
  currentView = 'stage'
  const st = STAGES.find(s => s.id === stageId)
  setActiveNav('nav-' + stageId)
  document.getElementById('stage-view').style.display = 'flex'
  document.getElementById('overview-view').style.display = 'none'
  document.getElementById('tb-stage').textContent = st.name
  renderIssueList(stageId)
  updateSidebarProgress()
}

function showHome() {
  currentView = 'home'
  currentStage = null
  setActiveNav('nav-home')
  document.getElementById('stage-view').style.display = 'none'
  document.getElementById('overview-view').style.display = 'flex'
  document.getElementById('tb-stage').textContent = 'Overview'
  document.getElementById('spb-fill').style.width = '0'
  renderOverview()
}

function showAllIssues() {
  currentView = 'all'
  currentStage = 'all'
  setActiveNav(null)
  document.getElementById('stage-view').style.display = 'flex'
  document.getElementById('overview-view').style.display = 'none'
  document.getElementById('tb-stage').textContent = 'All Issues'
  document.getElementById('sh-eyebrow').textContent = 'All Stages'
  document.getElementById('sh-eyebrow').style.color = 'var(--acc)'
  document.getElementById('sh-title').textContent = 'All Issues'
  document.getElementById('sh-desc').textContent = 'Every checklist item across all 7 design process stages.'
  document.getElementById('sh-total').textContent = Object.keys(ITEMS).length
  document.getElementById('spb-fill').style.background = 'var(--acc)'
  _refreshAllRows()
}

function showDone() {
  currentView = 'done'
  setActiveNav(null)
  document.getElementById('stage-view').style.display = 'flex'
  document.getElementById('overview-view').style.display = 'none'
  document.getElementById('tb-stage').textContent = 'Completed'
  document.getElementById('sh-eyebrow').textContent = 'Completed'
  document.getElementById('sh-eyebrow').style.color = '#10B981'
  document.getElementById('sh-title').textContent = 'Completed Issues'
  document.getElementById('sh-desc').textContent = 'All checklist items you\'ve marked as done.'
  const doneKeys  = Object.keys(ITEMS).filter(k => getStatus(k) === 'done')
  const doingKeys = Object.keys(ITEMS).filter(k => getStatus(k) === 'doing')
  document.getElementById('sh-total').textContent = doneKeys.length
  document.getElementById('sh-done').textContent = doneKeys.length + (doingKeys.length ? ` · ${doingKeys.length} in progress` : '')
  document.getElementById('sh-pct').textContent = doneKeys.length ? '100%' : '0%'
  document.getElementById('spb-fill').style.width = doneKeys.length ? '100%' : '0%'
  document.getElementById('spb-fill').style.background = '#10B981'
  const el = document.getElementById('issue-list-area')
  if (!doneKeys.length && !doingKeys.length) {
    el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:240px;gap:10px;color:var(--text3)"><div style="font-size:28px">✓</div><div style="font-size:13px;font-weight:600;color:var(--text2)">Nothing completed yet</div><div style="font-size:12px">Check off items in each stage to see them here.</div></div>`
    return
  }
  el.innerHTML = ''
  function doneGroup(title, ks, dotColor) {
    if (!ks.length) return
    const g = document.createElement('div')
    g.innerHTML = `<div class="group-header" onclick="toggleGroup(this)"><span class="gh-icon">▾</span><span class="gh-title" style="color:${dotColor}">${title}</span><span class="gh-count">${ks.length}</span></div><div class="group-body">${ks.map(k => {
      const st = STAGES.find(s => s.id === ITEMS[k].stage)
      return rowHTML(k, st)
    }).join('')}</div>`
    el.appendChild(g)
  }
  doneGroup('In Progress', doingKeys, '#F59E0B')
  doneGroup('Done',        doneKeys,  '#10B981')
}

function markStageDone() {
  if (!currentStage || currentStage === 'all') return
  const keys = Object.keys(ITEMS).filter(k => ITEMS[k].stage === currentStage)
  keys.forEach(k => statuses.set(k, 'done'))
  saveStatuses()
  updateSidebarProgress()
  showStage(currentStage)
}

// ═══ DETAIL PANEL ═══
function openDetail(key) {
  currentDetailKey = key
  document.querySelectorAll('.issue-row').forEach(r => r.classList.remove('is-selected'))
  document.getElementById('row-' + key)?.classList.add('is-selected')
  refreshDetailPanel(key)
  document.getElementById('detail-panel').classList.add('is-open')
}

function refreshDetailPanel(key) {
  const it = ITEMS[key]
  const st = STAGES.find(s => s.id === it.stage)
  const id = `${st.code}-0${it.n}`
  const s  = getStatus(key)
  document.getElementById('dp-id').textContent = id
  document.getElementById('dp-badge').textContent = st.name
  document.getElementById('dp-badge').style.background = st.color + '22'
  document.getElementById('dp-badge').style.color = st.color
  document.getElementById('dp-title').textContent = it.title

  const statusMeta = {
    todo:  { dot: '#5A5A68',  label: 'Todo' },
    doing: { dot: '#F59E0B',  label: 'In Progress' },
    done:  { dot: '#10B981',  label: 'Done' },
  }
  document.getElementById('dp-status-dot').style.background = statusMeta[s].dot
  document.getElementById('dp-status-text').textContent = statusMeta[s].label

  const pLabels = { urgent:'🔴 Urgent', high:'High', medium:'Medium', low:'Low', none:'None' }
  document.getElementById('dp-priority-val').textContent = pLabels[it.priority] || 'Medium'
  document.getElementById('dp-time-val').textContent = it.time
  document.getElementById('dp-stage-val').textContent = `${st.num} · ${st.name}`
  document.getElementById('dp-desc').textContent = it.desc
  document.getElementById('dp-tools').innerHTML = it.tools.map(t => `<span class="dp-tool">${t}</span>`).join('')

  const btn  = document.getElementById('dp-advance-btn')
  const undo = document.getElementById('dp-undo-btn')
  if (s === 'todo') {
    btn.textContent = '→ Start'
    btn.style.background = '#F59E0B'
    btn.classList.remove('is-done')
    undo.style.display = 'none'
  } else if (s === 'doing') {
    btn.textContent = '✓ Mark as done'
    btn.style.background = st.color
    btn.classList.remove('is-done')
    undo.style.display = 'block'
    undo.textContent = '↩ Reset to Todo'
  } else {
    btn.textContent = '✓ Done'
    btn.style.background = ''
    btn.classList.add('is-done')
    undo.style.display = 'block'
    undo.textContent = '↩ Mark as In Progress'
  }
}

function closeDetail() {
  document.getElementById('detail-panel').classList.remove('is-open')
  document.querySelectorAll('.issue-row').forEach(r => r.classList.remove('is-selected'))
  currentDetailKey = null
}

function advanceFromPanel() { if (currentDetailKey) advanceStatus(currentDetailKey) }
function undoFromPanel() {
  if (!currentDetailKey) return
  const cur = getStatus(currentDetailKey)
  _setStatus(currentDetailKey, cur === 'done' ? 'doing' : 'todo')
}

// ═══ THEME ═══
function toggleTheme() {
  document.body.classList.toggle('light')
  localStorage.setItem('wf-theme', document.body.classList.contains('light') ? 'light' : 'dark')
}

// ═══ CMD PALETTE ═══
const CMD_ITEMS = [
  { label:'Overview',        icon:'⊟', action: () => showHome() },
  { label:'All Issues',      icon:'◈', action: () => showAllIssues() },
  { label:'Completed',       icon:'✓', action: () => showDone() },
  ...STAGES.map(s => ({ label: s.name, icon: s.icon, action: () => showStage(s.id), kbd: '⌘' + (STAGES.indexOf(s) + 1) })),
  { label:'Toggle Theme',    icon:'◑', action: () => toggleTheme() },
  { label:'Mark Stage Done', icon:'✓', action: () => markStageDone() },
]
let cmdIdx = 0

function openCmd() {
  document.getElementById('cmd-overlay').classList.add('is-open')
  document.getElementById('cmd-input').value = ''
  renderCmdItems('')
  setTimeout(() => document.getElementById('cmd-input').focus(), 50)
}
function closeCmd() { document.getElementById('cmd-overlay').classList.remove('is-open') }

function renderCmdItems(query) {
  const q = query.toLowerCase()
  const filtered = CMD_ITEMS.filter(i => i.label.toLowerCase().includes(q))
  cmdIdx = 0
  document.getElementById('cmd-results').innerHTML = `
    <div class="cmd-section-label">Actions</div>
    ${filtered.map((it, i) => `
      <div class="cmd-item ${i === 0 ? 'is-selected' : ''}" onclick="(${it.action.toString()})();closeCmd()" data-idx="${i}">
        <span class="cmd-item-icon">${it.icon}</span>
        <span class="cmd-item-label">${it.label}</span>
        ${it.kbd ? `<span class="cmd-item-kbd">${it.kbd}</span>` : ''}
      </div>`).join('')}
    ${!filtered.length ? '<div style="text-align:center;padding:20px;color:var(--text3);font-size:12px">No results</div>' : ''}`
}

function filterCmd(val) { renderCmdItems(val) }

function cmdKeydown(e) {
  const items = document.querySelectorAll('.cmd-item')
  if (e.key === 'ArrowDown') { cmdIdx = Math.min(cmdIdx + 1, items.length - 1) }
  else if (e.key === 'ArrowUp') { cmdIdx = Math.max(cmdIdx - 1, 0) }
  else if (e.key === 'Enter') { items[cmdIdx]?.click(); return }
  else if (e.key === 'Escape') { closeCmd(); return }
  items.forEach((el, i) => el.classList.toggle('is-selected', i === cmdIdx))
}

// ═══ TOPBAR ACTIONS ═══
function filterToggle() { /* future: filter panel */ }
function groupToggle()  { /* future: display options */ }

// ═══ KEYBOARD SHORTCUTS ═══
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeCmd(); closeDetail() }
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openCmd() }
  if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key >= '1' && e.key <= '7') {
    e.preventDefault(); showStage(STAGES[+e.key - 1].id)
  }
})

// Close detail on background click
document.getElementById('main').addEventListener('click', e => {
  if (!e.target.closest('.issue-row') && !e.target.closest('#detail-panel')) closeDetail()
})

// ═══ INIT ═══
if (localStorage.getItem('wf-theme') === 'light') document.body.classList.add('light')

// Apply saved project header
const _initProj = getProjects().find(p => p.id === currentProjectId) || getProjects()[0]
currentProjectId = _initProj.id
_applyProjectHeader(_initProj)

// Close project menu on outside click
document.addEventListener('click', e => {
  if (_menuOpen && !e.target.closest('.sb-top')) closeProjectMenu()
})

updateSidebarProgress()
showHome()

// Expose to window for inline onclick handlers in HTML
Object.assign(window, {
  showStage, showHome, showAllIssues, showDone,
  cycleStatus, toggleGroup,
  openDetail, closeDetail,
  advanceFromPanel, undoFromPanel,
  openCmd, closeCmd, filterCmd, cmdKeydown,
  toggleTheme, markStageDone, filterToggle, groupToggle,
  toggleProjectMenu, closeProjectMenu, switchProject,
  showNewProjectInput, handleProjectKey, createProject, deleteProject,
})
