/* ============================================================
   isi_laporan_builder.js — v3.2 (Final Fixed)
   Visual Document Builder (Step 4)

   Tujuan:
   - Dual panel: Sidebar Struktur (tree) + Editor item aktif
   - Add block universal (+) & Sidebar logic
   - Contextual actions via Floating Menu & Hover
   - Drag & drop (SortableJS) untuk BAB, Subbab, dan Konten
   - Premium Aesthetics: Icons, Hierarchy Lines, Nested Design
   - Output collectIsiLaporanAsync() kompatibel dengan schema backend legacy
============================================================ */

'use strict';

import { getImage, saveImage } from './image_db.js';

import {
  ImageStore,
  handleGambarUpload,
  restoreGambarPreview,
  handleListItemImageUpload,
  restoreAllListItemImages,
  hydrateImageData,
  initImagePersistence,
} from './image_persistence.js';

// ── Configuration & State ─────────────────────────────────────
const TYPE = {
  BAB: 'bab',
  SUBBAB: 'subbab',
  PARAGRAF: 'paragraf',
  GAMBAR: 'gambar',
  LIST: 'list',
  TABLE: 'table',
  LAMPIRAN: 'lampiran',
};

// Global State
let docState = {
  version: 3,
  tree: [], // Level: [ { id, type: 'bab', title, collapsed, children: [ { type: 'subbab', ... } ] } ]
};

let uiState = {
  selectedId: null,
  activeNode: null,
  contextMenuId: null,
};

// Sortable instances tracker for cleanup
let _sortInstances = {
  bab: null,
  sub: {}, // babId -> Sortable
  content: {}, // subId -> Sortable
  lists: [], // Array of nested list Sortables
};

// ── Utilities ──────────────────────────────────────────────────
function uid(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 6)}`;
}

function iconForType(t) {
  switch (t) {
    case TYPE.BAB:         return '<i class="bi bi-book-half"></i>';
    case TYPE.SUBBAB:      return '<i class="bi bi-journal-text"></i>';
    case TYPE.PARAGRAF:    return '<i class="bi bi-text-paragraph"></i>';
    case TYPE.GAMBAR:      return '<i class="bi bi-image"></i>';
    case TYPE.LIST:        return '<i class="bi bi-list-check"></i>';
    case TYPE.TABLE:       return '<i class="bi bi-grid-3x2"></i>';
    case TYPE.LAMPIRAN:    return '<i class="bi bi-paperclip"></i>';
    default:               return '<i class="bi bi-dot"></i>';
  }
}

function getTypeLabel(t) {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function roman(n) {
  const map = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  for (const [v, s] of map) { while (n >= v) { out += s; n -= v; } }
  return out;
}

function alpha(n, uppercase = false) {
  let current = Math.max(Number(n) || 1, 1);
  let out = '';
  const base = uppercase ? 65 : 97;
  while (current > 0) {
    current -= 1;
    out = String.fromCharCode(base + (current % 26)) + out;
    current = Math.floor(current / 26);
  }
  return out;
}

function buildLabel(style, n) {
  const pad = (num, size) => {
    let s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
  }
  
  switch (style) {
    case '1.': return `${n}.`;
    case '1)': return `${n})`;
    case '(1)': return `(${n})`;
    case '01.': return `${pad(n, 2)}.`;
    case '001.': return `${pad(n, 3)}.`;
    
    case 'a.': return `${alpha(n)}.`;
    case 'a)': return `${alpha(n)})`;
    case '(a)': return `(${alpha(n)})`;
    
    case 'A.': return `${alpha(n, true)}.`;
    case 'A)': return `${alpha(n, true)})`;
    case '(A)': return `(${alpha(n, true)})`;
    
    case 'i.': return `${roman(n).toLowerCase()}.`;
    case 'i)': return `${roman(n).toLowerCase()})`;
    case '(i)': return `(${roman(n).toLowerCase()})`;
    
    case 'I.': return `${roman(n)}.`;
    case 'I)': return `${roman(n)})`;
    case '(I)': return `(${roman(n)})`;
    
    case 'bullet': return '•';
    case 'circle': return '○';
    case 'square': return '▪';
    case 'dash': return '—';
    case 'arrow': return '→';
    
    case 'none': return '';
    default: return `${n}.`;
  }
}

function normalizeListStyle(style) {
  return style || '1.';
}

/**
 * Numbering Engine: Determine automatic style based on depth if no override.
 */
function getDefaultStyleForLevel(level) {
  const defaults = ['1.', 'a.', 'i.', 'bullet', 'circle', 'square'];
  return defaults[Math.min(level, defaults.length - 1)];
}

function getListStyleForLevel(block, level) {
  return normalizeListStyle(level === 0 ? block.style : getDefaultStyleForLevel(level));
}

function escapeHtml(str) {
  return (str ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// ── Tree Logic ─────────────────────────────────────────────────
function findNode(id) {
  const search = (nodes) => {
    for (const n of (nodes || [])) {
      if (n.id === id) return n;
      const sub = search(n.children || n.items);
      if (sub) return sub;
    }
  };
  return search(docState.tree);
}

function findParent(nodeId) {
  const search = (nodes, parent = null) => {
    for (const n of (nodes || [])) {
      if (n.id === nodeId) return parent;
      const sub = search(n.children || n.items, n);
      if (sub) return sub;
    }
  };
  return search(docState.tree);
}

function _updateHierarchyMetadata() {
  docState.tree.forEach((bab, bi) => {
    bab.displayLabel = `BAB ${roman(bi + 1)}`;
    (bab.children || []).forEach((sub, si) => {
      const style = sub.labelStyle || 'A';
      if (style === 'A') sub.label = `${alpha(si + 1, true)}.`;
      else if (style === '1') sub.label = `${si + 1}.`;
      else if (style === 'a') sub.label = `${alpha(si + 1)}.`;
      else if (style === 'I') sub.label = `${roman(si + 1)}.`;
      else if (style === 'i') sub.label = `${roman(si + 1).toLowerCase()}.`;
      else if (style === 'bullet') sub.label = '•';
      else if (style === 'none') sub.label = '';
      else sub.label = `${String.fromCharCode(65 + si)}.`;
    });
  });
}

// ── Rendering Core ─────────────────────────────────────────────
export function initIsiBuilder() {
  const container = document.getElementById('containerIsiSidebar');
  if (!container) return;

  window.__getDocState    = () => docState;
  window.__getActiveNode  = () => uiState.activeNode;
  window.__getSelectedId  = () => uiState.selectedId;
  initImagePersistence();

  renderSidebar();
  renderEditor();
}

export function initIsiBuilderBindings() {
  const fab = document.getElementById('isiAddFab');
  const menu = document.getElementById('isiFabMenu');
  
  if (fab) {
    fab.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.style.display = menu.style.display === 'none' ? 'grid' : 'none';
      fab.classList.toggle('active');
    });
  }

  document.addEventListener('click', () => {
    if (menu) menu.style.display = 'none';
    if (fab) fab.classList.remove('active');
  });
}

function renderSidebar() {
  const container = document.getElementById('containerIsiSidebar');
  if (!container) return;
  
  _updateHierarchyMetadata();
  container.innerHTML = '';

  if (docState.tree.length === 0) {
    const empty = document.getElementById('editorEmptyState');
    if (empty) empty.style.display = 'block';
    return;
  } else {
    const empty = document.getElementById('editorEmptyState');
    if (empty) empty.style.display = 'none';
  }

  docState.tree.forEach((bab) => {
    const babEl = _createTreeNodeEl(bab, 0);
    container.appendChild(babEl);

    if (!bab.collapsed) {
      const subContainer = babEl.querySelector('.isi-tree-children');
      (bab.children || []).forEach(sub => {
        const subEl = _createTreeNodeEl(sub, 1, bab.id);
        subContainer.appendChild(subEl);

        if (!sub.collapsed) {
          const contentContainer = subEl.querySelector('.isi-tree-children');
          (sub.children || []).forEach(item => {
            const itemEl = _createTreeNodeEl(item, 2, sub.id);
            contentContainer.appendChild(itemEl);
            
            // Recursive List Item in Sidebar
            if (item.type === TYPE.LIST && !item.collapsed) {
              const listContainer = itemEl.querySelector('.isi-tree-children');
              const renderNested = (listItems, level, blockId) => {
                (listItems || []).forEach((li, idx) => {
                  const liEl = _createTreeNodeEl(li, level + 3, blockId);
                  listContainer.appendChild(liEl);
                  if (!li.collapsed && li.children?.length) {
                    const childContainer = liEl.querySelector('.isi-tree-children');
                    renderNested(li.children, level + 1, blockId);
                  }
                });
              };
              renderNested(item.items, 0, item.id);
            }
          });
        }
      });
    }
  });

  _initSidebarSortables();
  _updateSyncStats();
}

function _createTreeNodeEl(node, level, parentId = null) {
  const el = document.createElement('div');
  const isSelected = uiState.selectedId === node.id;
  el.className = `isi-tree-node level-${level} ${isSelected ? 'active' : ''} isi-tree-${node.type || 'list-item'}`;
  el.dataset.id = node.id;
  el.dataset.type = node.type || 'list-item';

  const hasChildren = (node.children?.length > 0) || (node.items?.length > 0);
  const isLeaf = !hasChildren && level >= 2;
  const chevron = isLeaf ? '' : `<span class="tree-chevron ${node.collapsed ? '' : 'expanded'}"><i class="bi bi-chevron-right"></i></span>`;
  
  const type = node.type || 'list-item';
  let title = node.title || '';

  if (type === TYPE.BAB) {
    title = `${node.displayLabel} — ${node.title || 'Tanpa Judul'}`;
  } else if (type === TYPE.SUBBAB) {
    title = `${node.label} ${node.title || 'Tanpa Judul'}`;
  } else if (!title) {
    if (type === TYPE.PARAGRAF) title = (node.text || '').substring(0, 30);
    else if (type === TYPE.GAMBAR) title = node.caption || 'Gambar';
    else if (type === TYPE.LIST) title = 'Daftar Terstruktur';
    else title = `Item ${getTypeLabel(type)}`;
  }
  
  if (title.length > 40) title = title.substring(0, 40) + '...';

  // Specific label for List Items in Sidebar
  let prefix = '';
  if (type === 'list-item') {
    const parentNode = findNode(parentId);
    const siblings = parentNode?.children || parentNode?.items || [];
    const idx = siblings.findIndex(s => s.id === node.id);
    const block = type === TYPE.LIST ? node : (findParentBlock(node.id) || node);
    const style = node.style || block.style || getDefaultStyleForLevel(Math.max(0, level - 3));
    prefix = buildLabel(style, idx + 1) + ' ';
    if (!node.title && node.text) {
       title = node.text.substring(0, 25) + (node.text.length > 25 ? '...' : '');
    }
  }

  el.innerHTML = `
    <div class="tree-row" onclick="selectNode('${node.id}')">
      <div class="tree-row-left">
        ${chevron}
        <span class="tree-icon">${iconForType(type)}</span>
        <span class="tree-title">${prefix}${escapeHtml(title)}</span>
      </div>
      <div class="tree-actions">
        <button type="button" class="btn-node-opt" onclick="event.stopPropagation(); window.openContextPopup('${node.id}', event)">
          <i class="bi bi-three-dots-vertical"></i>
        </button>
      </div>
    </div>
    <div class="isi-tree-children" style="display: ${node.collapsed ? 'none' : 'block'}"></div>
  `;

  if (!isLeaf) {
    el.querySelector('.tree-chevron')?.addEventListener('click', (e) => {
      e.stopPropagation();
      node.collapsed = !node.collapsed;
      renderSidebar();
    });
  }

  return el;
}

/**
 * Find the top-level block for a list item
 */
function findParentBlock(id) {
  let curr = findNode(id);
  while (curr) {
    const p = findParent(curr.id);
    if (!p) return null;
    if (Object.values(TYPE).includes(p.type) && p.type !== 'list-item') return p;
    curr = p;
  }
  return null;
}

// ── Editor Logic ───────────────────────────────────────────────
export function selectNode(id) {
  uiState.selectedId = id;
  const node = findNode(id);
  uiState.activeNode = node;
  
  renderSidebar();
  renderEditor();
}

function renderEditor() {
  const body = document.getElementById('isiEditorBody');
  const badge = document.getElementById('activeItemBadge');
  const clearBtn = document.getElementById('btnClearSelection');
  const editorPanel = document.querySelector('.builder-editor');
  
  if (!body) return;

  const node = uiState.activeNode;
  
  // Clean existing fixed footer if any
  editorPanel.querySelector('.editor-fixed-footer')?.remove();

  if (!node) {
    body.innerHTML = `
      <div class="isi-editor-empty">
        <div class="empty-anim">
           <i class="bi bi-pencil-square"></i>
        </div>
        <p class="isi-editor-empty-title">Selamat Datang di Visual Builder</p>
        <p class="isi-editor-empty-text">Pilih item di sebelah kiri untuk mulai mengedit atau tambahkan konten baru.</p>
      </div>
    `;
    if (badge) badge.textContent = 'Tidak ada item dipilih';
    if (clearBtn) clearBtn.style.display = 'none';
    return;
  }

  if (badge) badge.textContent = `Editor: ${getTypeLabel(node.type)}`;
  if (clearBtn) clearBtn.style.display = 'flex';

  if (node.type === TYPE.BAB || node.type === TYPE.SUBBAB) {
    body.innerHTML = _getFullViewHtml(node);
    _bindFullViewEvents(node);
  } else {
    body.innerHTML = _getEditorHtml(node);
    _bindEditorEvents(node);
  }
  
  _initEditorSortables();
  
  // Inject Fixed Global Footer
  const footer = document.createElement('div');
  footer.className = 'editor-fixed-footer';
  
  let buttons = '';
  if (node.type === TYPE.BAB) {
    buttons = `
      <button class="btn btn-primary" onclick="window.quickAdd('subbab')"><i class="bi bi-plus-lg me-2"></i>Tambah Subbab</button>
      <button class="btn btn-outline-danger" onclick="window.deleteNode('${node.id}')"><i class="bi bi-trash"></i></button>
    `;
  } else if (node.type === TYPE.SUBBAB) {
    buttons = `
      <button class="btn btn-primary" onclick="window.quickAdd('paragraf')"><i class="bi bi-plus-lg me-2"></i>Tambah Konten</button>
      <button class="btn btn-outline-danger" onclick="window.deleteNode('${node.id}')"><i class="bi bi-trash"></i></button>
    `;
  } else if (node.type === TYPE.LIST) {
    buttons = `
      <button class="btn btn-success" onclick="window.addListItem('${node.id}')"><i class="bi bi-plus-circle me-2"></i>Tambah Poin List</button>
      <button class="btn btn-outline-danger" onclick="window.deleteNode('${node.id}')"><i class="bi bi-trash"></i></button>
    `;
  } else {
    buttons = `
      <button class="btn btn-outline-danger w-100" onclick="window.deleteNode('${node.id}')"><i class="bi bi-trash me-2"></i>Hapus ${getTypeLabel(node.type)}</button>
    `;
  }
  
  footer.innerHTML = buttons;
  editorPanel.appendChild(footer);
  
  // Auto resize textareas
  body.querySelectorAll('textarea').forEach(ta => {
    ta.style.height = 'auto';
    ta.style.height = (ta.scrollHeight) + 'px';
  });
}

function _getFullViewHtml(node) {
  let html = `<div class="full-view-container">`;
  
  // Header for the selected container
  html += `
    <div class="full-view-main-header">
       <span class="full-view-icon">${iconForType(node.type)}</span>
       <div>
          <p class="editor-view-title-meta">${node.type === TYPE.BAB ? 'BAB' : 'Sub BAB'}</p>
          <h4 class="m-0 font-900">${node.type === TYPE.BAB ? node.displayLabel : node.label} ${node.title || 'Untitled'}</h4>
       </div>
    </div>
    <div class="mb-4">
      <label class="editor-label">Judul ${node.type === TYPE.BAB ? 'BAB' : 'Subbab'}</label>
      <input type="text" data-id="${node.id}" class="editor-input-lg full-view-title-sync" value="${escapeHtml(node.title)}" placeholder="Masukkan judul...">
    </div>
    <hr class="full-view-divider">
  `;

  const children = node.type === TYPE.BAB ? node.children : node.children;
  if (!children || children.length === 0) {
    html += `<div class="text-center py-5 text-muted opacity-50"><i class="bi bi-inbox fs-1 d-block mb-2"></i>Belum ada konten di dalam ini.</div>`;
  } else {
    children.forEach(child => {
      html += `
        <div class="full-view-child-item" data-id="${child.id}">
           ${_getEditorHtml(child, true)}
        </div>
      `;
      if (child.type === TYPE.SUBBAB && child.children) {
        child.children.forEach(grandChild => {
          html += `
            <div class="full-view-child-item nested" data-id="${grandChild.id}">
               ${_getEditorHtml(grandChild, true)}
            </div>
          `;
        });
      }
    });
  }

  html += `</div>`;
  return html;
}

function _bindFullViewEvents(node) {
  const body = document.getElementById('isiEditorBody');
  if (!body) return;

  // Sync main title
  const mainTitle = body.querySelector(`.full-view-title-sync[data-id="${node.id}"]`);
  if (mainTitle) {
    mainTitle.addEventListener('input', () => {
      node.title = mainTitle.value;
      renderSidebar();
    });
  }

  // Bind children events
  const children = node.type === TYPE.BAB ? node.children : node.children;
  if (children) {
    children.forEach(child => {
      _bindEditorEvents(child);
      if (child.type === TYPE.SUBBAB && child.children) {
        child.children.forEach(grandChild => _bindEditorEvents(grandChild));
      }
    });
  }
}

function _getEditorHtml(node, compact = false) {
  const cardClass = compact ? 'editor-view-card compact' : `editor-view-card editor-card-${node.type}`;
  
  switch (node.type) {
    case TYPE.BAB:
      if (compact) return ''; // Already handled by parent in Full View
      return `
        <div class="${cardClass}">
          <div class="editor-view-header">
             <span class="editor-view-icon">${iconForType(node.type)}</span>
             <div>
                <p class="editor-view-title-meta">Level 0: BAB</p>
                <h5 class="m-0 font-900">${node.displayLabel}</h5>
             </div>
          </div>
          <div class="editor-label">Judul BAB</div>
          <input type="text" id="edit-title" class="editor-input-lg" value="${escapeHtml(node.title)}" placeholder="Contoh: PENDAHULUAN">
          <div class="editor-helper-text">Tips: Gunakan huruf kapital untuk standar laporan formal.</div>
          
        </div>
      `;
    case TYPE.SUBBAB:
      return `
        <div class="${cardClass}">
          <div class="editor-view-header">
             <span class="editor-view-icon">${iconForType(node.type)}</span>
             <div>
                <p class="editor-view-title-meta">Level 1: Subbab</p>
                <h5 class="m-0 font-900">${node.label} ${node.title || 'Untitled'}</h5>
             </div>
          </div>
          <div class="row g-3">
            <div class="col-md-3">
              <div class="editor-label">Format Label</div>
              <select data-id="${node.id}" class="form-select editor-select edit-style">
                <option value="A" ${node.labelStyle === 'A' ? 'selected' : ''}>A.</option>
                <option value="1" ${node.labelStyle === '1' ? 'selected' : ''}>1.</option>
                <option value="a" ${node.labelStyle === 'a' ? 'selected' : ''}>a.</option>
                <option value="I" ${node.labelStyle === 'I' ? 'selected' : ''}>I.</option>
                <option value="bullet" ${node.labelStyle === 'bullet' ? 'selected' : ''}>•</option>
              </select>
            </div>
            <div class="col-md-9">
              <div class="editor-label">Judul Subbab</div>
              <input type="text" data-id="${node.id}" class="editor-input-lg edit-title" value="${escapeHtml(node.title)}" placeholder="Contoh: Latar Belakang">
            </div>
          </div>
        </div>
      `;
    case TYPE.PARAGRAF:
      return `
        <div class="${cardClass} editor-card-paragraf" data-id="${node.id}">
          <div class="editor-view-header">
             <span class="editor-view-icon" style="background-color: #f1f5f9; color: #475569;">${iconForType(node.type)}</span>
             <div>
                <p class="editor-view-title-meta">Konten: Paragraf</p>
                <h5 class="m-0 font-900 text-secondary">Teks Laporan</h5>
             </div>
             ${compact ? `<div class="ms-auto"><button type="button" class="btn-node-opt-danger" onclick="window.deleteNode('${node.id}')"><i class="bi bi-trash"></i></button></div>` : ''}
          </div>
          <div class="editor-label">Isi Paragraf</div>
          <textarea data-id="${node.id}" class="editor-textarea edit-text" placeholder="Tulis konten laporan di sini...">${escapeHtml(node.text)}</textarea>
        </div>
      `;
    case TYPE.GAMBAR: {
      const previewSrc = node.imgData || ImageStore.get(node.imgId) || '';
      const hasImage = !!previewSrc;
      return `
        <div class="${cardClass} editor-card-gambar" data-id="${node.id}">
          <div class="editor-view-header">
             <span class="editor-view-icon" style="background-color: #fffbeb; color: #d97706;">${iconForType(node.type)}</span>
             <div>
                <p class="editor-view-title-meta">Konten: Gambar</p>
                <h5 class="m-0 font-900 text-warning">Upload & Caption</h5>
             </div>
             ${compact ? `<div class="ms-auto"><button type="button" class="btn-node-opt-danger" onclick="window.deleteNode('${node.id}')"><i class="bi bi-trash"></i></button></div>` : ''}
          </div>
          <div class="editor-label">File Gambar</div>
          <div class="image-editor-upload">
             <input type="file" data-id="${node.id}" class="d-none edit-image" accept="image/*">
             <div class="image-preview-zone" onclick="document.querySelector('.edit-image[data-id=\\'${node.id}\\']').click()">
                ${hasImage
                  ? `<img src="${previewSrc}" class="img-fluid rounded preview-img" data-id="${node.id}" style="max-width:100%; max-height:300px; object-fit:contain;">`
                  : `<div class="upload-placeholder"><i class="bi bi-cloud-arrow-up"></i><p>Klik untuk upload gambar</p></div>`}
             </div>
          </div>
          <div class="mt-3">
             <div class="editor-label">Caption Gambar</div>
             <input type="text" data-id="${node.id}" class="editor-input edit-caption" value="${escapeHtml(node.caption)}" placeholder="Contoh: Gambar 1.1 Struktur Organisasi">
          </div>
        </div>
      `;
    }
    case TYPE.LIST:
      return `
        <div class="${cardClass} editor-card-list" data-id="${node.id}">
          <div class="editor-view-header">
             <span class="editor-view-icon" style="background-color: #ecfdf5; color: #059669;">${iconForType(node.type)}</span>
             <div>
                <p class="editor-view-title-meta">Konten: List Berjenjang</p>
                <h5 class="m-0 font-900 text-success">Hierarki Poin Laporan</h5>
             </div>
             <div class="ms-auto d-flex align-items-center gap-3">
                <div class="d-flex flex-column align-items-end">
                   <label class="font-900 text-success mb-1" style="font-size: 0.75rem;">GAYA PENOMORAN</label>
                   <select data-id="${node.id}" class="form-select form-select-sm edit-list-style" style="width: 140px; font-weight: 700;">
                   <optgroup label="Numbers">
                     <option value="1." ${node.style === '1.' ? 'selected' : ''}>1. 2. 3.</option>
                     <option value="1)" ${node.style === '1)' ? 'selected' : ''}>1) 2) 3)</option>
                     <option value="(1)" ${node.style === '(1)' ? 'selected' : ''}>(1) (2)</option>
                     <option value="01." ${node.style === '01.' ? 'selected' : ''}>01. 02.</option>
                   </optgroup>
                   <optgroup label="Letters">
                     <option value="a." ${node.style === 'a.' ? 'selected' : ''}>a. b. c.</option>
                     <option value="a)" ${node.style === 'a)' ? 'selected' : ''}>a) b) c)</option>
                     <option value="A." ${node.style === 'A.' ? 'selected' : ''}>A. B. C.</option>
                   </optgroup>
                   <optgroup label="Roman">
                     <option value="i." ${node.style === 'i.' ? 'selected' : ''}>i. ii.</option>
                     <option value="I." ${node.style === 'I.' ? 'selected' : ''}>I. II.</option>
                   </optgroup>
                   <optgroup label="Bullets">
                     <option value="bullet" ${node.style === 'bullet' ? 'selected' : ''}>Bulat (•)</option>
                     <option value="circle" ${node.style === 'circle' ? 'selected' : ''}>Cincin (○)</option>
                     <option value="square" ${node.style === 'square' ? 'selected' : ''}>Kotak (▪)</option>
                     <option value="arrow" ${node.style === 'arrow' ? 'selected' : ''}>Panah (→)</option>
                   </optgroup>
                </select>
                ${compact ? `<button type="button" class="btn-node-opt-danger" onclick="window.deleteNode('${node.id}')"><i class="bi bi-trash"></i></button>` : ''}
              </div>
           </div>
          </div>
          
          <div class="list-items-container sortable-list-items" data-parent-id="${node.id}" data-depth="0">
             ${(node.items || []).map((item, idx) => _renderListItem(node, item, idx, 0)).join('')}
             ${(node.items || []).length === 0 ? '<div class="text-center p-4 text-muted border border-dashed rounded-3">Belum ada poin. Klik tombol di bawah untuk mulai.</div>' : ''}
          </div>
        </div>
      `;
    case TYPE.TABLE:
       return `
        <div class="${cardClass}" data-id="${node.id}">
          <div class="editor-view-header">
             <span class="editor-view-icon">${iconForType(node.type)}</span>
             <div>
                <p class="editor-view-title-meta">Konten: Tabel</p>
                <h5 class="m-0 font-900">Data Tabular</h5>
             </div>
             ${compact ? `<div class="ms-auto"><button type="button" class="btn-node-opt-danger" onclick="window.deleteNode('${node.id}')"><i class="bi bi-trash"></i></button></div>` : ''}
          </div>
          <div class="editor-label">Data Tabel (Text raw)</div>
          <textarea data-id="${node.id}" class="editor-textarea edit-raw" placeholder="Row 1 | Cell 2\nRow 2 | Cell 2">${escapeHtml(node.raw || '')}</textarea>
        </div>
      `;
    default:
      return `<div class="p-3">Editor untuk type ${node.type} belum tersedia.</div>`;
  }
}

/**
 * Recursive Renderer for List Items
 */
function _renderListItem(block, item, idx, level, parentId = null) {
  const label = buildLabel(item.style || getListStyleForLevel(block, level), idx + 1);
  const isComplex = item.mode === 'complex';
  
  return `
    <div class="list-item-block level-${level}" data-item-id="${item.id}" data-parent-id="${parentId || block.id}">
       <div class="list-item-main">
          <div class="list-item-handle" data-depth="${level}" title="Geser untuk urutkan"><i class="bi bi-grip-vertical"></i></div>
          <div class="list-item-label">${label}</div>
          <div class="list-item-content">
             <!-- Mode Switch -->
             <div class="mb-2 d-flex gap-2 align-items-center">
                <div class="btn-group btn-group-sm bg-light rounded-pill p-1 shadow-sm">
                   <button class="btn py-0 px-2 rounded-pill font-900 ${!isComplex ? 'btn-success' : 'btn-light'}" style="font-size: 0.65rem;" onclick="window.setListItemMode('${block.id}', '${item.id}', 'simple')">POIN BIASA</button>
                   <button class="btn py-0 px-2 rounded-pill font-900 ${isComplex ? 'btn-success' : 'btn-light'}" style="font-size: 0.65rem;" onclick="window.setListItemMode('${block.id}', '${item.id}', 'complex')">JUDUL + ISI</button>
                </div>
                <div class="ms-auto d-flex gap-1">
                   <button class="btn btn-outline-success btn-xs" title="Tambah Sub-poin" onclick="window.addListChild('${block.id}', '${item.id}')"><i class="bi bi-node-plus"></i></button>
                   <button class="btn btn-outline-success btn-xs" title="Tambah Poin Baru" onclick="window.addListItemAfter('${block.id}', '${item.id}')"><i class="bi bi-plus-lg"></i></button>
                   <button class="btn btn-outline-danger btn-xs" title="Hapus" onclick="window.removeListItemFromBlock('${block.id}', '${item.id}')"><i class="bi bi-trash"></i></button>
                </div>
             </div>

             ${isComplex ? `
               <div class="list-item-title-wrapper mb-2">
                 <input type="text" class="list-item-title-input" data-item-id="${item.id}" placeholder="Masukkan judul..." value="${escapeHtml(item.title)}">
               </div>
             ` : ''}
             
             <textarea class="list-item-text-input" data-item-id="${item.id}" placeholder="Tulis keterangan..." style="height: ${isComplex ? '60px' : 'auto'}">${escapeHtml(item.text || item.teks)}</textarea>
             
             <!-- Image area -->
             <div class="mt-2 d-flex align-items-center gap-2">
                ${item.imgId ? `
                  <button title="Ganti Gambar" class="btn btn-link btn-xs p-0 text-success text-decoration-none" onclick="window.triggerListItemImg('${item.id}')"><i class="bi bi-image"></i> Ganti Foto</button>
                  <button title="Hapus Gambar" class="btn btn-link btn-xs p-0 text-danger text-decoration-none" onclick="window.removeListItemImg('${block.id}', '${item.id}')"><i class="bi bi-trash"></i> Hapus Foto</button>
                ` : `
                  <button title="Tambah Gambar" class="btn btn-link btn-xs p-0 text-secondary text-decoration-none" onclick="window.triggerListItemImg('${item.id}')"><i class="bi bi-image"></i> Tambah Foto</button>
                `}
             </div>
             
             <input type="file" id="file-${item.id}" class="d-none" accept="image/*" onchange="window.handleListItemImg('${block.id}', '${item.id}', event)">
             
             ${item.imgId ? `
               <div class="list-item-img-container mt-2">
                  <img src="" class="list-item-img-preview" data-item-id="${item.id}" style="max-height: 120px; border-radius: 8px; border: 1px solid #e2e8f0;">
               </div>
             ` : ''}
          </div>
       </div>
       
       <!-- Children container -->
       <div class="list-item-children sortable-list-items" data-parent-id="${item.id}" data-depth="${level + 1}">
          ${(item.children || []).map((child, cIdx) => _renderListItem(block, child, cIdx, level + 1, item.id)).join('')}
       </div>
    </div>
  `;
}

window.setListItemMode = (listId, itemId, mode) => {
  const item = findNode(itemId);
  if (!item) return;
  item.mode = mode;
  renderEditor();
  renderSidebar();
  _debouncedSave();
};

window.addListItem = (listId) => {
  const node = findNode(listId);
  if (!node) return;
  node.items = node.items || [];
  node.items.push({
    id: uid('li'),
    mode: 'simple',
    title: '',
    text: '',
    children: []
  });
  renderEditor();
  renderSidebar();
  _debouncedSave();
};

function _bindEditorEvents(node) {
  const body = document.getElementById('isiEditorBody');
  if (!body) return;

  const selector = (sel) => body.querySelector(`${sel}[data-id="${node.id}"]`);

  const titleInp = selector('.edit-title');
  if (titleInp) {
    titleInp.addEventListener('input', () => {
      node.title = titleInp.value;
      renderSidebar();
    });
  }

  const textInp = selector('.edit-text');
  if (textInp) {
    textInp.addEventListener('input', (e) => {
      node.text = textInp.value;
      e.target.style.height = 'auto';
      e.target.style.height = (e.target.scrollHeight) + 'px';
      renderSidebar();
    });
  }

  const styleSel = selector('.edit-style');
  if (styleSel) {
    styleSel.addEventListener('change', () => {
      node.labelStyle = styleSel.value;
      renderSidebar();
    });
  }

  const subStyleSel = selector('.edit-sub-style');
  if (subStyleSel) {
    subStyleSel.addEventListener('change', () => {
      node.labelStyle = subStyleSel.value;
      _updateHierarchyMetadata();
      renderSidebar();
      renderEditor();
      _debouncedSave();
    });
  }

  const listStyleSel = selector('.edit-list-style');
  if (listStyleSel) {
    listStyleSel.addEventListener('change', () => {
      node.style = listStyleSel.value;
      renderEditor();
      renderSidebar();
      _debouncedSave();
    });
  }

  const captionInp = selector('.edit-caption');
  if (captionInp) {
    captionInp.addEventListener('input', () => {
      node.caption = captionInp.value;
      renderSidebar();
    });
  }

  const imgInp = selector('.edit-image');
  if (imgInp) {
    imgInp.addEventListener('change', async () => {
      await handleGambarUpload(
        imgInp.files[0],
        node,
        _renderEditorImage,
        renderSidebar,
      );
      _debouncedSave();
    });

    restoreGambarPreview(node);
  }

  // Recursive List Item Binding
  if (node.type === TYPE.LIST) {
    const bindItems = async (items) => {
      for (const item of (items || [])) {
        // Title Sync
        const titleInp = body.querySelector(`.list-item-title-input[data-item-id="${item.id}"]`);
        if (titleInp) {
          titleInp.addEventListener('input', () => {
            item.title = titleInp.value;
            renderSidebar();
          });
        }
        
        // Text Sync
        const textInp = body.querySelector(`.list-item-text-input[data-item-id="${item.id}"]`);
        if (textInp) {
          textInp.addEventListener('input', (e) => {
            item.text = textInp.value;
            item.teks = textInp.value; // Sync both for compatibility
            e.target.style.height = 'auto';
            e.target.style.height = (e.target.scrollHeight) + 'px';
            renderSidebar();
          });
        }
        
        // Image Preview
        if (item.imgId || item.imgData) {
          const img = body.querySelector(`.list-item-img-preview[data-item-id="${item.id}"]`);
          if (img) {
            const base64 = item.imgData || ImageStore.get(item.imgId);
            if (base64) img.src = base64;
          }
        }
        
        // Recurse children
        if (item.children?.length) await bindItems(item.children);
      }
    };
    bindItems(node.items);

    // ← TAMBAHKAN INI:
    restoreAllListItemImages(node.items);
  }

  const rawInp = selector('.edit-raw');
  if (rawInp) {
    rawInp.addEventListener('input', () => {
      node.raw = rawInp.value;
    });
  }
}

async function _renderEditorImage(node) {
  const img = document.querySelector(`.preview-img[data-id="${node.id}"]`);
  if (!img || !node.imgId) return;
  const file = await getImage(node.imgId);
  if (file) {
    img.src = URL.createObjectURL(file);
    const placeholder = img.parentElement.querySelector('.upload-placeholder');
    if (placeholder) placeholder.style.display = 'none';
  }
}

// ── List Item Management ─────────────────────────────────────
window.addListItem = (listId) => {
  const node = findNode(listId);
  if (!node) return;
  node.items = node.items || [];
  node.items.push({ id: uid('li'), mode: 'simple', title: '', text: '', teks: '', children: [] });
  renderEditor();
  _debouncedSave();
};

window.addListItemAfter = (listId, afterId) => {
  const node = findNode(listId);
  if (!node) return;
  
  const insert = (items) => {
    const idx = items.findIndex(it => it.id === afterId);
    if (idx > -1) {
      items.splice(idx + 1, 0, { id: uid('li'), mode: 'simple', title: '', text: '', teks: '', children: [] });
      return true;
    }
    for (const it of items) {
      if (it.children && insert(it.children)) return true;
    }
    return false;
  };
  insert(node.items);
  renderEditor();
  renderSidebar();
  _debouncedSave();
};

window.addListItem = (listId) => {
  const node = findNode(listId);
  if (!node) return;
  node.items = node.items || [];
  node.items.push({ id: uid('li'), mode: 'simple', title: '', text: '', teks: '', children: [] });
  renderEditor();
  renderSidebar();
  _debouncedSave();
};

window.addListChild = (listId, parentId) => {
  const parent = findNode(parentId);
  if (!parent) return;
  parent.children = parent.children || [];
  parent.children.push({ id: uid('li'), mode: 'simple', title: '', text: '', teks: '', children: [] });
  parent.collapsed = false;
  renderEditor();
  renderSidebar();
  _debouncedSave();
};

window.toggleListItemMode = (listId, itemId) => {
  const item = findNode(itemId);
  if (!item) return;
  item.mode = item.mode === 'complex' ? 'simple' : 'complex';
  renderEditor();
  _debouncedSave();
};

window.removeListItemFromBlock = (listId, itemId) => {
  if (!confirm('Hapus poin ini?')) return;
  const block = findNode(listId);
  if (!block) return;
  
  const remove = (items) => {
    const idx = (items || []).findIndex(it => it.id === itemId);
    if (idx > -1) {
      items.splice(idx, 1);
      return true;
    }
    for (const it of (items || [])) {
      if (it.children && remove(it.children)) return true;
    }
    return false;
  };
  remove(block.items);
  renderEditor();
  renderSidebar();
  _debouncedSave();
};

window.triggerListItemImg = (itemId) => {
  const input = document.getElementById(`file-${itemId}`);
  if (!input) return;

  // Reset value agar onChange selalu terpicu saat user pilih file yang sama
  // dan mencegah perilaku browser membuka dialog terus menerus karena state input tetap.
  input.value = '';
  input.click();
};


window.handleListItemImg = async (listId, itemId, event) => {
  await handleListItemImageUpload(
    listId,
    itemId,
    event.target.files[0],
    findNode,
    renderEditor,
  );
  _debouncedSave();
};

window.removeListItemImg = (listId, itemId) => {
  const item = findNode(itemId);
  if (!item) return;
  delete item.imgId;
  renderEditor();
  _debouncedSave();
};

// ── CRUD Ops ───────────────────────────────────────────────
export function quickAdd(type, initData = {}) {
  const node = { id: uid(type), type, collapsed: false, ...initData };
  
  if (type === TYPE.BAB) {
    node.title = node.title || '';
    node.children = [];
    docState.tree.push(node);
  } 
  else if (type === TYPE.SUBBAB) {
    const parent = uiState.activeNode?.type === TYPE.BAB ? uiState.activeNode : findParent(uiState.selectedId);
    let targetBab = parent?.type === TYPE.BAB ? parent : docState.tree[docState.tree.length - 1];
    if (!targetBab) {
        quickAdd(TYPE.BAB);
        targetBab = docState.tree[0];
    }
    
    node.title = '';
    node.labelStyle = 'A';
    node.children = [];
    targetBab.children = targetBab.children || [];
    targetBab.children.push(node);
    targetBab.collapsed = false;
  }
  else {
    // Content levels — resolve targetSub correctly
    let targetSub = uiState.activeNode?.type === TYPE.SUBBAB ? uiState.activeNode : null;

    // If active node is a content item, find its parent sub
    if (!targetSub && uiState.selectedId) {
      const p = findParent(uiState.selectedId);
      if (p?.type === TYPE.SUBBAB) targetSub = p;
    }

    // If active node is a BAB, use its last subbab
    if (!targetSub && uiState.activeNode?.type === TYPE.BAB) {
      const activeBab = uiState.activeNode;
      targetSub = activeBab.children?.[activeBab.children.length - 1] || null;
      if (!targetSub) {
        quickAdd(TYPE.SUBBAB);
        targetSub = activeBab.children?.[0] || null;
      }
    }

    // Final fallback: use last sub in last bab
    if (!targetSub) {
      const lastBab = docState.tree[docState.tree.length - 1];
      if (!lastBab) {
          quickAdd(TYPE.BAB);
          const b = docState.tree[0];
          quickAdd(TYPE.SUBBAB);
          targetSub = b.children[0];
      } else {
          targetSub = lastBab.children?.[lastBab.children.length - 1];
          if (!targetSub) {
              quickAdd(TYPE.SUBBAB);
              targetSub = lastBab.children[0];
          }
      }
    }

    targetSub.children = targetSub.children || [];
    if (type === TYPE.PARAGRAF) node.text = '';
    if (type === TYPE.GAMBAR) { node.imgId = null; node.caption = ''; }
    if (type === TYPE.LIST) { node.items = []; node.style = '1.'; }
    if (type === TYPE.TABLE) node.raw = '';
    
    targetSub.children.push(node);
    targetSub.collapsed = false;
  }

  selectNode(node.id);
  _debouncedSave();
}

export function deleteNode(id) {
  const node = findNode(id);
  if (!node) return;
  
  const label = node.type === TYPE.BAB ? `BAB ${node.displayLabel}` : (node.type === TYPE.SUBBAB ? `Subbab ${node.title}` : node.type);
  if (!confirm(`Apakah Anda yakin ingin menghapus ${label}? Seluruh isinya juga akan terhapus.`)) return;

  if (id === uiState.selectedId) {
    uiState.selectedId = null;
    uiState.activeNode = null;
  }
  
  // Existing delete logic...
  const bIdx = docState.tree.findIndex(b => b.id === id);
  if (bIdx > -1) {
    docState.tree.splice(bIdx, 1);
    renderSidebar(); renderEditor(); return;
  }
  for (const bab of docState.tree) {
    const sIdx = (bab.children || []).findIndex(s => s.id === id);
    if (sIdx > -1) {
      bab.children.splice(sIdx, 1);
      renderSidebar(); renderEditor(); return;
    }
    for (const sub of (bab.children || [])) {
      const cIdx = (sub.children || []).findIndex(c => c.id === id);
      if (cIdx > -1) {
        sub.children.splice(cIdx, 1);
        renderSidebar(); renderEditor(); return;
      }
    }
  }
}

export function clearIsiSelection() {
  uiState.selectedId = null;
  uiState.activeNode = null;
  renderSidebar();
  renderEditor();
}

// ── Drag & Drop System (State Driven & Professional Grade) ─────────────────

/**
 * Fungsi utilitas rekursif global untuk menghapus node dari state tree
 * dan mengembalikan objek node yang dihapus beserta parent asalnya.
 */
function removeNodeFromState(tree, id) {
  for (let i = 0; i < tree.length; i++) {
    if (tree[i].id === id) {
      return { node: tree.splice(i, 1)[0], array: tree };
    }
    const childrenField = tree[i].children ? 'children' : (tree[i].items ? 'items' : null);
    if (childrenField && tree[i][childrenField]) {
      const found = removeNodeFromState(tree[i][childrenField], id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Validasi sirkular: memastikan target parent bukan bagian dari subtree node itu sendiri
 */
function isCircularHierarchy(movedNode, targetParentId) {
  if (movedNode.id === targetParentId) return true;
  const check = (node) => {
    const sub = node.children || node.items || [];
    for (const n of sub) {
      if (n.id === targetParentId) return true;
      if (check(n)) return true;
    }
    return false;
  };
  return check(movedNode);
}

/**
 * 1. SIDEBAR DRAG & DROP
 * Mengatur pergerakan granular di panel navigasi struktur kiri.
 */
function _initSidebarSortables() {
  const sidebar = document.getElementById('containerIsiSidebar');
  if (!sidebar || !window.Sortable) return;

  const Sortable = window.Sortable;

  // Cleanup instances lama jika ada
  if (_sortInstances.bab) _sortInstances.bab.destroy();
  Object.values(_sortInstances.sub).forEach(s => s?.destroy());
  Object.values(_sortInstances.content).forEach(s => s?.destroy());
  _sortInstances.sub = {};
  _sortInstances.content = {};

  // Sortable Level 0: BAB Utama
  _sortInstances.bab = new Sortable(sidebar, {
    group: 'sidebar-babs',
    animation: 180,
    handle: '.tree-row',
    draggable: '.isi-tree-bab',
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    onEnd: (evt) => {
      if (evt.oldIndex === evt.newIndex) return;
      // Mutasi State Array Posisi Bab Utama
      const [movedBab] = docState.tree.splice(evt.oldIndex, 1);
      docState.tree.splice(evt.newIndex, 0, movedBab);
      
      _updateHierarchyMetadata();
      renderSidebar();
      _debouncedSave();
    }
  });

  // Sortable Level 1: Subbab di dalam setiap BAB
  document.querySelectorAll('.isi-tree-bab > .isi-tree-children').forEach(el => {
    const babId = el.closest('.isi-tree-node')?.dataset.id;
    if (!babId) return;

    _sortInstances.sub[babId] = new Sortable(el, {
      group: 'sidebar-subs',
      animation: 180,
      handle: '.tree-row',
      draggable: '.isi-tree-subbab',
      ghostClass: 'sortable-ghost',
      fallbackOnBody: true,
      swapThreshold: 0.65,
      onEnd: (evt) => {
        const fromBabId = evt.from.closest('.isi-tree-bab')?.dataset.id;
        const toBabId = evt.to.closest('.isi-tree-bab')?.dataset.id;
        if (!fromBabId || !toBabId) return;

        const fromBab = findNode(fromBabId);
        const toBab = findNode(toBabId);
        if (!fromBab || !toBab) return;

        const movedNodeId = evt.item.dataset.id;
        const result = removeNodeFromState(docState.tree, movedNodeId);
        if (!result) return;

        toBab.children = toBab.children || [];
        // Hitung posisi insert indeks berdasarkan susunan element DOM riil saat drop selesai
        const targetIds = Array.from(evt.to.querySelectorAll(':scope > .isi-tree-subbab')).map(el => el.dataset.id);
        let insertIdx = targetIds.indexOf(movedNodeId);
        if (insertIdx === -1) insertIdx = toBab.children.length;

        toBab.children.splice(insertIdx, 0, result.node);

        _updateHierarchyMetadata();
        renderSidebar();
        // Cegah kehilangan fokus dengan mengecek selectedId
        if (uiState.selectedId === movedNodeId) {
          renderEditor(); 
        }
        _debouncedSave();
      }
    });
  });

  // Sortable Level 2: Blok Konten (Paragraf, Gambar, List) di dalam Subbab
  document.querySelectorAll('.isi-tree-subbab > .isi-tree-children').forEach(el => {
    const subId = el.closest('.isi-tree-subbab')?.dataset.id;
    if (!subId) return;

    _sortInstances.content[subId] = new Sortable(el, {
      group: 'sidebar-contents',
      animation: 180,
      handle: '.tree-row',
      draggable: '.level-2',
      ghostClass: 'sortable-ghost',
      onEnd: (evt) => {
        const fromSubId = evt.from.closest('.isi-tree-subbab')?.dataset.id;
        const toSubId = evt.to.closest('.isi-tree-subbab')?.dataset.id;
        if (!fromSubId || !toSubId) return;

        const fromSub = findNode(fromSubId);
        const toSub = findNode(toSubId);
        if (!fromSub || !toSub) return;

        const movedItemId = evt.item.dataset.id;
        const result = removeNodeFromState(docState.tree, movedItemId);
        if (!result) return;

        toSub.children = toSub.children || [];
        const targetIds = Array.from(evt.to.querySelectorAll(':scope > .level-2')).map(el => el.dataset.id);
        let insertIdx = targetIds.indexOf(movedItemId);
        if (insertIdx === -1) insertIdx = toSub.children.length;

        toSub.children.splice(insertIdx, 0, result.node);

        renderSidebar();
        if (uiState.selectedId === movedItemId || uiState.selectedId === toSubId || uiState.selectedId === fromSubId) {
          renderEditor();
        }
        _debouncedSave();
      }
    });
  });
}

/**
 * 2. EDITOR DRAG & DROP
 * Mengatur pergerakan granular di panel workspace pengeditan kanan.
 * Menjamin textarea tidak blur, cursor tidak reset, dan input tetap aman.
 */
function _initEditorSortables() {
  if (!window.Sortable) return;
  const Sortable = window.Sortable;

  // Hancurkan lists tracker lama
  if (_sortInstances.lists && _sortInstances.lists.length) {
    _sortInstances.lists.forEach(s => s?.destroy());
  }
  _sortInstances.lists = [];

  // A. Jika yang aktif adalah Full View Container (BAB / SUBBAB aktif)
  const fullViewContainer = document.querySelector('.full-view-container');
  if (fullViewContainer) {
    // Buat element wrapper di HTML jika belum ada, atau gunakan langsung container-nya
    let childWrapper = fullViewContainer.querySelector('.full-view-child-container');
    if (!childWrapper) {
      // Kelompokkan semua .full-view-child-item ke dalam 1 wrapper aman
      childWrapper = document.createElement('div');
      childWrapper.className = 'full-view-child-container';
      const items = Array.from(fullViewContainer.querySelectorAll(':scope > .full-view-child-item'));
      if (items.length > 0) {
        items[0].parentNode.insertBefore(childWrapper, items[0]);
        items.forEach(it => childWrapper.appendChild(it));
      }
    }

    if (childWrapper) {
      const activeNode = uiState.activeNode;
      const sInst = new Sortable(childWrapper, {
        group: 'editor-fullview-items',
        animation: 180,
        handle: '.editor-view-header', // Hanya drag di header card, bukan input/textarea
        draggable: '.full-view-child-item',
        ghostClass: 'sortable-ghost',
        onEnd: (evt) => {
          if (evt.oldIndex === evt.newIndex) return;
          
          // Dapatkan field array target (children)
          if (activeNode && activeNode.children) {
            const [moved] = activeNode.children.splice(evt.oldIndex, 1);
            activeNode.children.splice(evt.newIndex, 0, moved);
            
            // Simpan posisi scroll agar editor terasa seamless tanpa lompatan layar
            const scrollPos = document.getElementById('isiEditorBody')?.parentElement?.scrollTop;
            
            _updateHierarchyMetadata();
            renderSidebar();
            
            // Render ulang parsial dengan restore scroll position
            renderEditor();
            if (scrollPos) {
              const bodyParent = document.getElementById('isiEditorBody')?.parentElement;
              if (bodyParent) bodyParent.scrollTop = scrollPos;
            }
            _debouncedSave();
          }
        }
      });
      _sortInstances.lists.push(sInst);
    }
  }

  // B. Nested List Item Drag & Drop (Mendukung Multi-level List, Pindah Level, Keluar/Masuk Parent)
  const listContainers = document.querySelectorAll('.sortable-list-items');
  if (listContainers.length === 0) return;

  listContainers.forEach(container => {
    const sInst = new Sortable(container, {
      group: 'nested-list-items', // Nama grup sama agar bisa saling cross-drop antar level
      animation: 180,
      handle: '.list-item-handle', // Drag handle titik enam khusus agar input teks bebas hambatan
      draggable: '.list-item-block',
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      emptyInsertThreshold: 10,
      fallbackOnBody: true,
      invertSwap: true,
      onStart: (evt) => {
        // Berikan feedback drop zone aktif di seluruh list tree
        document.querySelectorAll('.sortable-list-items').forEach(el => {
          el.classList.add('sortable-drop-zone-active');
        });
      },
      onEnd: (evt) => {
        // Bersihkan class feedback visual
        document.querySelectorAll('.sortable-list-items').forEach(el => {
          el.classList.remove('sortable-drop-zone-active');
        });

        const itemId = evt.item.dataset.itemId;
        const fromParentId = evt.from.dataset.parentId;
        const toParentId = evt.to.dataset.parentId;

        if (!itemId || !fromParentId || !toParentId) return;

        // Cegah circular nesting secara aman di sisi data
        const movedNode = findNode(itemId);
        if (!movedNode) return;
        if (isCircularHierarchy(movedNode, toParentId)) {
          alert('Kesalahan struktur: Tidak bisa memindahkan item ke dalam anaknya sendiri!');
          renderEditor();
          return;
        }

        // 1. Ekstrak objek data murni dari state pohon lama
        const result = removeNodeFromState(docState.tree, itemId);
        if (!result) return;

        // 2. Temukan target kontainer baru di dalam state
        const targetParent = findNode(toParentId);
        if (!targetParent) {
          renderEditor();
          return;
        }

        // Tentukan array penampung target (apakah .items untuk root list, atau .children untuk sub-item)
        let targetArray = [];
        if (targetParent.type === TYPE.LIST) {
          targetParent.items = targetParent.items || [];
          targetArray = targetParent.items;
        } else {
          targetParent.children = targetParent.children || [];
          targetArray = targetParent.children;
        }

        // 3. Hitung indeks insert riil dari DOM element anak langsung (`:scope`)
        const directDOMIds = Array.from(evt.to.querySelectorAll(':scope > .list-item-block')).map(el => el.dataset.itemId);
        let insertIdx = directDOMIds.indexOf(itemId);
        if (insertIdx === -1) insertIdx = targetArray.length;

        // 4. Masukkan item baru ke posisi yang tepat pada state data murni
        targetArray.splice(insertIdx, 0, result.node);

        // Pertahankan scroll & focus state jika user sedang mengedit teks
        const activeElementId = document.activeElement?.dataset.itemId || document.activeElement?.dataset.id;
        const selectionStart = document.activeElement?.selectionStart;
        const scrollPos = document.getElementById('isiEditorBody')?.parentElement?.scrollTop;

        renderSidebar();
        renderEditor();

        // Kembalikan posisi scroll dan focus kursor agar tidak mental atau blur
        if (scrollPos) {
          const bodyParent = document.getElementById('isiEditorBody')?.parentElement;
          if (bodyParent) bodyParent.scrollTop = scrollPos;
        }
        if (activeElementId) {
          const elToFocus = document.querySelector(`[data-item-id="${activeElementId}"], [data-id="${activeElementId}"]`);
          if (elToFocus && (elToFocus.tagName === 'INPUT' || elToFocus.tagName === 'TEXTAREA')) {
            elToFocus.focus();
            if (selectionStart !== undefined) {
              elToFocus.selectionStart = elToFocus.selectionEnd = selectionStart;
            }
          }
        }

        _debouncedSave();
      }
    });
    _sortInstances.lists.push(sInst);
  });
}

// ── Context Menu ─────────────────────────────────────────────
window.openContextPopup = (id, event) => {
  const existing = document.getElementById('node-context-menu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.id = 'node-context-menu';
  menu.className = 'node-context-menu';
  menu.style.left = `${event.pageX}px`;
  menu.style.top = `${event.pageY}px`;
  
  menu.innerHTML = `
    <div class="menu-item" onclick="window.duplicateNode('${id}')"><i class="bi bi-copy"></i> Duplikat</div>
    <div class="menu-item danger" onclick="window.deleteNode('${id}')"><i class="bi bi-trash"></i> Hapus</div>
  `;
  document.body.appendChild(menu);

  const closer = () => { menu.remove(); document.removeEventListener('click', closer); };
  setTimeout(() => document.addEventListener('click', closer), 10);
};

window.duplicateNode = (id) => {
  const node = findNode(id);
  if (!node) return;
  const copy = JSON.parse(JSON.stringify(node));
  const regenIds = (n) => {
    n.id = uid(n.type || 'li');
    (n.children || n.items || []).forEach(regenIds);
  };
  regenIds(copy);

  const parent = findParent(id);
  if (!parent) {
     const idx = docState.tree.findIndex(b => b.id === id);
     docState.tree.splice(idx + 1, 0, copy);
  } else {
     const idx = parent.children.findIndex(c => c.id === id);
     parent.children.splice(idx + 1, 0, copy);
  }
  _updateHierarchyMetadata();
  renderSidebar();
};

// ── Integration & Persistence ─────────────────────────────────
function _updateSyncStats() {
  const bCount = docState.tree.length;
  let sCount = 0;
  docState.tree.forEach(b => sCount += (b.children?.length || 0));

  const hBab = document.getElementById('isiBabCount');
  const hSub = document.getElementById('isiSubCount');
  if (hBab) hBab.textContent = `${bCount} BAB`;
  if (hSub) hSub.textContent = `${sCount} Sub BAB`;

  // Sync to sidebar workspace
  const sBab = document.getElementById('sidebarBabCount');
  const sSub = document.getElementById('sidebarSubCount');
  if (sBab) sBab.textContent = bCount;
  if (sSub) sSub.textContent = sCount;
}

function _debouncedSave() {
  document.dispatchEvent(new Event('input')); // Triggers saveDraft in main.js
}

/**
 * Mengumpulkan data dari tree untuk disimpan atau digenerate.
 * @param {boolean} includeBase64 Jika true, akan menyertakan data base64 gambar (berat).
 *                              Gunakan false untuk auto-save draft, true untuk generate docx.
 */
export async function collectIsiLaporanAsync(includeBase64 = true) {
  const result = [];

  const imagePayloadForItem = async (li) => {
    const payloads = [];
    if (!li.imgId && !li.imgData) return payloads;

    const payload = {
      type: 'gambar',
      imgId: li.imgId || null,
      caption: li.caption || '',
    };

    if (includeBase64) {
      if (li.imgData) {
        payload.data = li.imgData;
      } else {
        const stored = ImageStore.get(li.imgId);
        if (stored) {
          payload.data = stored;
          li.imgData = stored;
        } else {
          try {
            const file = await getImage(li.imgId);
            if (file) {
              payload.data = await _toBase64(file);
              li.imgData = payload.data;
            }
          } catch (_) {}
        }
      }
    }

    payloads.push(payload);
    return payloads;
  };

  const collectListItems = async (listItems, block, depth = 0) => {
    const output = [];
    for (const li of (listItems || [])) {
      const children = await collectListItems(li.children || [], block, depth + 1);
      output.push({
        id: li.id,
        type: li.mode === 'complex' ? 'title' : 'simple',
        mode: li.mode === 'complex' ? 'title' : 'simple',
        judul: li.title || '',
        title: li.title || '',
        teks: li.text || li.teks || '',
        text: li.text || li.teks || '',
        gambar_items: await imagePayloadForItem(li),
        anak: children.length
          ? [{
              type: 'list',
              style: getListStyleForLevel(block, depth + 1),
              mode: 'simple',
              items: children,
            }]
          : [],
      });
    }
    return output;
  };

  for (const bab of docState.tree) {
    const babObj = {
      judul_bab: `${bab.displayLabel} — ${bab.title || ''}`,
      subs: []
    };
    for (const sub of (bab.children || [])) {
      const subObj = {
        judul_sub: `${sub.label} ${sub.title || ''}`,
        contents: []
      };
      for (const item of (sub.children || [])) {
        if (item.type === TYPE.PARAGRAF) subObj.contents.push({ type: 'paragraf', teks: item.text });
        if (item.type === TYPE.GAMBAR && (item.imgId || item.imgData)) {
          const contentItem = {
            type: 'gambar',
            imgId: item.imgId || null,
            caption: item.caption || '',
          };

          if (includeBase64) {
            if (item.imgData) {
              contentItem.data = item.imgData;
            } else {
              const stored = ImageStore.get(item.imgId);
              if (stored) {
                contentItem.data = stored;
                item.imgData = stored;
              } else {
                try {
                  const file = await getImage(item.imgId);
                  if (file) {
                    const b64 = await _toBase64(file);
                    contentItem.data = b64;
                    item.imgData = b64;
                  }
                } catch (_) {}
              }
            }
          }

          subObj.contents.push(contentItem);
        }
        if (item.type === TYPE.LIST) {
          subObj.contents.push({ 
            type: 'list', 
            style: normalizeListStyle(item.style || '1.'),
            mode: 'simple',
            items: await collectListItems(item.items, item, 0) 
          });
        }
        if (item.type === TYPE.TABLE) subObj.contents.push({ type: 'paragraf', teks: item.raw });
      }
      babObj.subs.push(subObj);
    }
    result.push(babObj);
  }
  return result;
}

window.__restoreIsiBuilderFromDraft = async (data) => {
  if (!data || !Array.isArray(data)) return;
  
  console.log('[isi_laporan_builder] Restoring from data...', data);
  // Heuristic: v3 tree check
  if (data.length > 0 && data[0].id) {
     docState.tree = data;
  } else {
     // Legacy conversion
     docState.tree = data.map((b, bi) => ({
       id: uid('bab'), type: TYPE.BAB, title: (b.judul_bab || '').split('—')[1]?.trim() || (b.judul_bab || '').replace(/^BAB\s+[IVXLCDM.]+\s*(?:-\s*)?/i, '') || '', collapsed: true,
       children: (b.subs || []).map((s, si) => ({
         id: uid('sub'), type: TYPE.SUBBAB, title: (s.judul_sub || '').replace(/^[A-Z1-9a-z]+\.\s*/, '').trim(), collapsed: true, labelStyle: 'A',
         children: (s.contents || []).map(c => {
           const nid = uid(c.type);
            if (c.type === 'paragraf') return { id: nid, type: TYPE.PARAGRAF, text: c.teks };
            if (c.type === 'gambar') return { id: nid, type: TYPE.GAMBAR, imgId: c.imgId, caption: c.caption };
            if (c.type === 'list') {
              const migrateItems = (itms) => {
                return (itms || []).map(li => ({
                  id: li.id || uid('li'),
                  mode: li.type === 'complex' || li.mode === 'complex' ? 'complex' : 'simple',
                  title: li.title || '',
                  text: li.teks || li.text || '',
                  teks: li.teks || li.text || '',
                  imgId: li.imgId || null,
                  children: migrateItems(li.children || li.anak || [])
                }));
              };
              return { id: nid, type: TYPE.LIST, items: migrateItems(c.items), style: c.style || '1.' };
            }
            return { id: nid, type: TYPE.PARAGRAF, text: '[Unknown Type]' };
         })
       }))
     }));
  }
  hydrateImageData(docState.tree);
  renderSidebar();
};

/**
 * Validasi untuk wizard: pastikan setidaknya ada 1 BAB dan semua BAB memiliki judul.
 */
export function validateBuilder() {
  if (docState.tree.length === 0) return false;
  return docState.tree.every(bab => (bab.title || '').trim() !== '');
}

function _toBase64(file) {
  return new Promise((r, j) => {
    const f = new FileReader();
    f.onload = () => r(f.result);
    f.onerror = j;
    f.readAsDataURL(file);
  });
}

// ── Global Exports ─────────────────────────────────────────────
Object.assign(window, {
  initIsiBuilder,
  quickAdd,
  selectNode,
  deleteNode,
  clearIsiSelection,
  collectIsiLaporanAsync,
  duplicateNode,
  openContextPopup,
  validateBuilder
});
