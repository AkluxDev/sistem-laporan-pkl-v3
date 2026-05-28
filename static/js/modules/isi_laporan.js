'use strict';

import { getImage, saveImage } from './image_db.js';

let _babCounter = 0;
let _sortables = [];

export function initIsi() {
    const container = document.getElementById('containerIsi');
    if (!container) return;

    container.innerHTML = '';
    _babCounter = 0;
    _sortables.forEach(s => { try { s.destroy(); } catch {} });
    _sortables = [];

    _makeSortable(container, {
        onEnd: () => {
            _renumberBab();
            _renumberAllSubs();
            _refreshEditorStats();
        },
    });

    _refreshEditorStats();
}

function _makeSortable(el, opts = {}) {
    if (!el || el.__sortable) return;

    const sortable = new Sortable(el, {
        animation: 160,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        ...opts,
    });

    el.__sortable = sortable;
    _sortables.push(sortable);
    return sortable;
}

function _buildLabel(style, n) {
    switch (style) {
        case '1': return `${n}.`;
        case 'a': return `${String.fromCharCode(96 + n)}.`;
        case 'A': return `${String.fromCharCode(64 + n)}.`;
        case 'i': return `${_toRoman(n).toLowerCase()}.`;
        case 'I': return `${_toRoman(n)}.`;
        case 'bullet': return '•';
        case 'none': return '';
        default: return `${n}.`;
    }
}

function _toRoman(n) {
    const map = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let out = '';
    for (const [value, symbol] of map) {
        while (n >= value) {
            out += symbol;
            n -= value;
        }
    }
    return out;
}

function _stripLeadingLabel(text, label) {
    const raw = (text || '').trim();
    const prefix = (label || '').trim();
    if (!raw || !prefix) return raw;
    const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return raw.replace(new RegExp(`^${escape(prefix)}\\s*`, 'i'), '').trim();
}

function _getBabTitle(babEl) {
    return babEl?.querySelector('.bab-title-input')?.value?.trim() ?? '';
}

function _getSubTitle(subEl) {
    return subEl?.querySelector('.sub-title-input')?.value?.trim() ?? '';
}

function _toggleEmptyState() {
    const empty = document.getElementById('editorEmptyState');
    const count = document.querySelectorAll('#containerIsi > .isi-bab').length;
    if (empty) empty.style.display = count ? 'none' : 'block';
}

function _refreshEditorStats() {
    const babCount = document.querySelectorAll('#containerIsi > .isi-bab').length;
    const subCount = document.querySelectorAll('#containerIsi .isi-sub').length;
    const babText = `${babCount} BAB`;
    const subText = `${subCount} Sub BAB`;

    const babEl = document.getElementById('isiBabCount');
    const subEl = document.getElementById('isiSubCount');
    const sideBab = document.getElementById('sidebarBabCount');
    const sideSub = document.getElementById('sidebarSubCount');

    if (babEl) babEl.textContent = babText;
    if (subEl) subEl.textContent = subText;
    if (sideBab) sideBab.textContent = String(babCount);
    if (sideSub) sideSub.textContent = String(subCount);

    _toggleEmptyState();
}

function _setActiveBab(babEl) {
    document.querySelectorAll('#containerIsi > .isi-bab').forEach(item => {
        item.classList.toggle('is-active', item === babEl);
    });
}

function _updateBabSummary(babEl) {
    if (!babEl) return;

    const title = _getBabTitle(babEl);
    const subCount = babEl.querySelectorAll(':scope > .bab-body > .sub-container > .isi-sub').length;
    const titleEl = babEl.querySelector('.bab-summary-title');
    const metaEl = babEl.querySelector('.bab-summary-meta');

    if (titleEl) titleEl.textContent = title || 'Judul BAB belum diisi';
    if (metaEl) metaEl.textContent = `${subCount} sub bab · klik untuk buka/tutup`;
}

function _updateSubSummary(subEl) {
    if (!subEl) return;

    const title = _getSubTitle(subEl);
    const contentCount = subEl.querySelectorAll(':scope > .sub-body > .content-container > *').length;
    const titleEl = subEl.querySelector('.sub-summary-title');
    const metaEl = subEl.querySelector('.sub-summary-meta');

    if (titleEl) titleEl.textContent = title || 'Sub BAB belum diisi';
    if (metaEl) metaEl.textContent = `${contentCount} blok konten`;
}

function _renumberBab() {
    _babCounter = 0;
    document.querySelectorAll('#containerIsi > .isi-bab').forEach(bab => {
        _babCounter += 1;
        const label = bab.querySelector('.bab-label');
        if (label) label.textContent = `BAB ${_babCounter}`;
        _updateBabSummary(bab);
    });
}

function _renumberAllSubs() {
    document.querySelectorAll('.sub-container').forEach(container => {
        const subs = [...container.querySelectorAll(':scope > .isi-sub')];
        if (!subs.length) return;

        const firstStyle = subs[0].querySelector('.sub-style')?.value ?? 'A';
        subs.forEach((sub, index) => {
            const label = _buildLabel(firstStyle, index + 1);
            const labelEl = sub.querySelector('.sub-label');
            const select = sub.querySelector('.sub-style');

            if (select) {
                select.value = firstStyle;
                select.style.display = index === 0 ? 'inline-block' : 'none';
            }

            if (labelEl) {
                labelEl.textContent = label;
                labelEl.style.display = label ? 'inline-flex' : 'none';
            }

            _updateSubSummary(sub);
        });
    });
}

export function refreshAllSubNumbering() {
    _renumberAllSubs();
}

function _renumberListItems(container, style) {
    const items = [...container.querySelectorAll(':scope > .list-item')];
    items.forEach((item, index) => {
        let label = item.querySelector(':scope > .list-item-label');
        if (!label) {
            label = document.createElement('span');
            label.className = 'list-item-label';
            item.prepend(label);
        }

        const text = _buildLabel(style, index + 1);
        label.textContent = text;
        label.style.display = text ? 'inline-block' : 'none';
    });
}

export function refreshAllListNumbering() {
    document.querySelectorAll('[data-list-wrapper]').forEach(wrapper => {
        const style = wrapper.querySelector(':scope > .list-header .list-style')?.value ?? '1';
        const container = wrapper.querySelector(':scope > .list-items-container');
        if (container) _renumberListItems(container, style);
    });
}

function _createDragHandle() {
    return '<span class="drag-handle" title="Seret untuk urut ulang"><i class="bi bi-grip-vertical"></i></span>';
}

function _createDeleteButton(label = 'Hapus') {
    return `<button type="button" class="editor-delete-button" onclick="hapusItem(this)"><i class="bi bi-trash"></i>${label}</button>`;
}

function _toggleSection(btn, targetSelector, collapsedClass) {
    const card = btn.closest(targetSelector);
    if (!card) return;
    card.classList.toggle(collapsedClass);
}

export function toggleBabCollapse(btn) {
    const bab = btn.closest('.isi-bab');
    if (!bab) return;
    bab.classList.toggle('collapsed');
    _setActiveBab(bab);
}

export function toggleSubCollapse(btn) {
    const sub = btn.closest('.isi-sub');
    if (!sub) return;
    sub.classList.toggle('collapsed');
}

export function tambahBab() {
    const container = document.getElementById('containerIsi');
    if (!container) return;

    _babCounter += 1;
    const bab = document.createElement('section');
    bab.className = 'isi-bab is-active';
    bab.dataset.removable = 'bab';
    bab.innerHTML = `
        <button type="button" class="bab-header" onclick="toggleBabCollapse(this)">
            ${_createDragHandle()}
            <span class="bab-label-badge bab-label">BAB ${_babCounter}</span>
            <div class="bab-summary">
                <span class="bab-summary-title">Judul BAB belum diisi</span>
                <span class="bab-summary-meta">0 sub bab · klik untuk buka/tutup</span>
            </div>
            <div class="bab-header-actions">
                <span class="editor-ghost-button"><i class="bi bi-arrows-collapse"></i>Collapse</span>
                <i class="bi bi-chevron-down bab-chevron"></i>
            </div>
        </button>
        <div class="bab-body">
            <div class="bab-title-wrap">
                <label class="form-label">Judul BAB</label>
                <input type="text" class="form-control bab-title-input" placeholder="Contoh: PENDAHULUAN">
            </div>
            <div class="sub-container"></div>
            <div class="bab-actions mt-3">
                <div class="action-group-label">Aksi BAB</div>
                <div class="action-cluster">
                    <button type="button" class="btn-add-sub" onclick="tambahSub(this)">
                        <i class="bi bi-plus-circle"></i>Sub BAB
                    </button>
                    <button type="button" class="btn-sub-action danger" onclick="hapusBab(this)"><i class="bi bi-trash"></i>Hapus</button>
                </div>
            </div>
        </div>
    `;

    container.appendChild(bab);
    _bindBabEvents(bab);
    _makeSortable(bab.querySelector('.sub-container'), {
        onEnd: () => {
            _renumberAllSubs();
            _refreshEditorStats();
        },
    });

    _renumberBab();
    _refreshEditorStats();
    _setActiveBab(bab);
}

function _bindBabEvents(bab) {
    const input = bab.querySelector('.bab-title-input');
    if (input) {
        input.addEventListener('input', () => _updateBabSummary(bab));
        input.addEventListener('focus', () => _setActiveBab(bab));
    }

    const header = bab.querySelector('.bab-header');
    if (header) {
        header.addEventListener('focusin', () => _setActiveBab(bab));
    }
}

export function hapusBab(btn) {
    const bab = btn.closest('.isi-bab');
    if (!bab) return;
    bab.remove();
    _renumberBab();
    _renumberAllSubs();
    _refreshEditorStats();
}

export function tambahSub(btn) {
    const bab = btn.closest('.isi-bab');
    const container = bab?.querySelector('.sub-container');
    if (!container) return;

    const sub = document.createElement('section');
    sub.className = 'isi-sub';
    sub.dataset.removable = 'sub';
    sub.innerHTML = `
        <button type="button" class="sub-header" onclick="toggleSubCollapse(this)">
            ${_createDragHandle()}
            <span class="sub-label-badge sub-label">A.</span>
            <div class="sub-summary">
                <span class="sub-summary-title">Sub BAB belum diisi</span>
                <span class="sub-summary-meta">0 blok konten</span>
            </div>
            <div class="sub-header-actions">
                <span class="editor-ghost-button"><i class="bi bi-chevron-expand"></i>Toggle</span>
                <i class="bi bi-chevron-down sub-chevron"></i>
            </div>
        </button>
        <div class="sub-body">
            <div class="sub-title-wrap">
                <div class="row g-2 align-items-end">
                    <div class="col-md-3 col-lg-2">
                        <label class="form-label">Format Label</label>
                        <select class="form-select sub-style" onchange="refreshAllSubNumbering()">
                            <option value="A">A.</option>
                            <option value="1">1.</option>
                            <option value="a">a.</option>
                            <option value="I">I.</option>
                            <option value="i">i.</option>
                            <option value="bullet">•</option>
                            <option value="none">Tanpa</option>
                        </select>
                    </div>
                    <div class="col-md-9 col-lg-10">
                        <label class="form-label">Judul Sub BAB</label>
                        <input type="text" class="form-control sub-title-input" placeholder="Contoh: Latar Belakang">
                    </div>
                </div>
            </div>
            <div class="content-container"></div>
            <div class="sub-actions mt-3">
                <div class="action-group-label">Tambah Konten</div>
                <div class="action-cluster">
                    <button type="button" class="btn-sub-action" onclick="tambahParagraf(this)"><i class="bi bi-text-paragraph"></i>Teks</button>
                    <button type="button" class="btn-sub-action" onclick="tambahList(this)"><i class="bi bi-list-ol"></i>List</button>
                    <button type="button" class="btn-sub-action" onclick="tambahGambar(this)"><i class="bi bi-image"></i>Gambar</button>
                </div>
                <div class="action-group-label danger mt-2">Aksi</div>
                <div class="action-cluster compact">
                    <button type="button" class="btn-sub-action danger" onclick="hapusItem(this)"><i class="bi bi-trash"></i>Hapus Sub BAB</button>
                </div>
            </div>
        </div>
    `;

    container.appendChild(sub);
    _makeSortable(sub.querySelector('.content-container'), {
        onEnd: () => {
            _updateSubSummary(sub);
            refreshAllListNumbering();
        },
    });

    const titleInput = sub.querySelector('.sub-title-input');
    if (titleInput) titleInput.addEventListener('input', () => _updateSubSummary(sub));

    _renumberAllSubs();
    _refreshEditorStats();
    _updateBabSummary(bab);
}

export function tambahParagraf(btn) {
    const container = btn.closest('.isi-sub')?.querySelector('.content-container');
    if (!container) return;

    const block = document.createElement('div');
    block.className = 'content-item';
    block.dataset.removable = 'content';
    block.innerHTML = `
        <div class="content-block-header">
            ${_createDragHandle()}
            <span class="content-block-title">Paragraf</span>
            ${_createDeleteButton('Hapus')}
        </div>
        <div class="content-item-body">
            <div></div>
            <textarea class="form-control auto-resize" rows="4" placeholder="Isi paragraf..."></textarea>
            <div></div>
        </div>
    `;

    container.appendChild(block);
    _notifyAutoResize(block);
    _updateSubSummary(btn.closest('.isi-sub'));
}

function _createGambarEl() {
    const uid = Date.now() + Math.random().toString(36).slice(2, 6);
    const block = document.createElement('div');
    block.className = 'content-item gambar-item';
    block.dataset.removable = 'content';
    block.dataset.type = 'gambar';
    block.innerHTML = `
        <div class="content-block-header">
            ${_createDragHandle()}
            <span class="content-block-title">Gambar</span>
            ${_createDeleteButton('Hapus')}
        </div>
        <div class="image-drop-meta"><i class="bi bi-image"></i>Upload gambar dan isi caption bila diperlukan</div>
        <input type="file" accept="image/*" class="form-control form-control-sm input-gambar">
        <div class="preview-gambar mt-2" id="prev-${uid}"></div>
        <input type="text" class="form-control form-control-sm mt-2 input-caption" placeholder="Caption gambar (opsional)">
    `;

    const input = block.querySelector('.input-gambar');
    const preview = block.querySelector(`#prev-${uid}`);
    input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file) return;

        const id = `img_${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
        await saveImage(id, file);
        block.dataset.imgId = id;
        _renderImagePreview(preview, file);
    });

    return block;
}

function _renderImagePreview(previewEl, file) {
    if (!previewEl || !file) return;
    const url = URL.createObjectURL(file);
    previewEl.innerHTML = `<img src="${url}" alt="Preview gambar">`;
}

async function _imagePayloadFromElement(gambarEl) {
    if (!gambarEl) return null;
    const imgId = gambarEl.dataset.imgId || null;
    const caption = gambarEl.querySelector('.input-caption')?.value?.trim() ?? '';
    if (!imgId) return null;

    const file = await getImage(imgId);
    if (!file) return null;

    return {
        type: 'gambar',
        imgId,
        data: await _readBase64(file),
        caption,
    };
}

export function tambahGambar(btn) {
    const container = btn.closest('.isi-sub')?.querySelector('.content-container')
        || btn.closest('.item-extra-container');
    if (!container) return;

    container.appendChild(_createGambarEl());
    _updateSubSummary(btn.closest('.isi-sub'));
}

export function tambahGambarDiItem(btn) {
    const extra = btn.closest('.list-item')?.querySelector('.item-extra-container');
    if (!extra) return;
    extra.appendChild(_createGambarEl());
}

export function tambahList(btn) {
    const container = btn.closest('.isi-sub')?.querySelector('.content-container');
    if (!container) return;

    const block = document.createElement('div');
    block.className = 'list-wrapper-card content-item';
    block.dataset.removable = 'content';
    block.dataset.listWrapper = 'true';
    block.innerHTML = `
        <div class="list-header">
            ${_createDragHandle()}
            <div class="list-header-meta"><i class="bi bi-list-check"></i>List</div>
            <div class="list-header-controls">
                <select class="form-select form-select-sm w-auto list-style" onchange="refreshAllListNumbering()">
                    <option value="1">1. Angka</option>
                    <option value="a">a. Huruf kecil</option>
                    <option value="A">A. Huruf besar</option>
                    <option value="i">i. Romawi kecil</option>
                    <option value="I">I. Romawi besar</option>
                    <option value="bullet">• Bullet</option>
                    <option value="none">Tanpa nomor</option>
                </select>
                <select class="form-select form-select-sm w-auto list-mode">
                    <option value="simple">Isi saja</option>
                    <option value="title">Judul + Isi</option>
                </select>
                <div class="action-group-label">Aksi List</div>
                <div class="action-cluster compact">
                    <button type="button" class="btn-sub-action" onclick="tambahListItem(this)"><i class="bi bi-plus"></i>Item</button>
                    <button type="button" class="btn-sub-action danger" onclick="hapusItem(this)"><i class="bi bi-trash"></i>Hapus</button>
                </div>
            </div>
        </div>
        <div class="list-items-container"></div>
    `;

    container.appendChild(block);
    _makeSortable(block.querySelector('.list-items-container'), {
        onEnd: () => refreshAllListNumbering(),
    });
    _addListItemToContainer(block);
    _updateSubSummary(btn.closest('.isi-sub'));
}

export function tambahListItem(btn) {
    const wrapper = btn.closest('[data-list-wrapper]');
    if (!wrapper) return;
    _addListItemToContainer(wrapper);
}

function _itemActionButtons() {
    return `
        <div class="list-item-actions mt-2">
            <div class="action-group-label">Aksi Item</div>
            <div class="action-cluster compact">
                <button type="button" class="btn-sub-action" onclick="tambahNestedList(this)"><i class="bi bi-diagram-3"></i>Sublist</button>
                <button type="button" class="btn-sub-action" onclick="tambahGambarDiItem(this)"><i class="bi bi-image"></i>Gambar</button>
            </div>
        </div>
        <div class="nested-list-container"></div>
        <div class="item-extra-container"></div>
    `;
}

function _addListItemToContainer(wrapper) {
    const container = wrapper.querySelector(':scope > .list-items-container');
    const mode = wrapper.querySelector(':scope > .list-header .list-mode')?.value ?? 'simple';
    const style = wrapper.querySelector(':scope > .list-header .list-style')?.value ?? '1';
    if (!container) return;

    const item = document.createElement('div');
    item.className = 'list-item';
    item.dataset.removable = 'list-item';

    const label = _buildLabel(style, container.children.length + 1);
    const fields = mode === 'title'
        ? `
            <input type="text" class="form-control form-control-sm input-judul-item mb-2" placeholder="Judul item">
            <textarea class="form-control form-control-sm input-teks-item auto-resize" rows="3" placeholder="Deskripsi / isi"></textarea>
          `
        : `
            <input type="text" class="form-control form-control-sm input-teks-item" placeholder="Isi item list">
          `;

    item.innerHTML = `
        <span class="list-item-label">${label}</span>
        ${_createDragHandle()}
        <div class="list-item-main">
            ${fields}
            ${_itemActionButtons()}
        </div>
        ${_createDeleteButton('Hapus')}
    `;

    container.appendChild(item);
    _notifyAutoResize(item);
    refreshAllListNumbering();
}

export function tambahNestedList(btn) {
    const target = btn.closest('.list-item-main')?.querySelector('.nested-list-container');
    if (!target) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'nested-list-card';
    wrapper.dataset.listWrapper = 'true';
    wrapper.dataset.removable = 'nested';
    wrapper.innerHTML = `
        <div class="list-header">
            <div class="list-header-meta"><i class="bi bi-diagram-2"></i>Sub List</div>
            <div class="list-header-controls">
                <select class="form-select form-select-sm w-auto list-style" onchange="refreshAllListNumbering()">
                    <option value="a">a. Huruf kecil</option>
                    <option value="1">1. Angka</option>
                    <option value="A">A. Huruf besar</option>
                    <option value="i">i. Romawi kecil</option>
                    <option value="I">I. Romawi besar</option>
                    <option value="bullet">• Bullet</option>
                    <option value="none">Tanpa nomor</option>
                </select>
                <select class="form-select form-select-sm w-auto list-mode">
                    <option value="simple">Isi saja</option>
                    <option value="title">Judul + Isi</option>
                </select>
                <div class="action-group-label">Aksi Sublist</div>
                <div class="action-cluster compact">
                    <button type="button" class="btn-sub-action" onclick="tambahListItem(this)"><i class="bi bi-plus"></i>Item</button>
                    <button type="button" class="btn-sub-action danger" onclick="hapusItem(this)"><i class="bi bi-trash"></i>Hapus</button>
                </div>
            </div>
        </div>
        <div class="list-items-container"></div>
    `;

    target.appendChild(wrapper);
    _makeSortable(wrapper.querySelector('.list-items-container'), {
        onEnd: () => refreshAllListNumbering(),
    });
    _addListItemToContainer(wrapper);
}

export function hapusItem(btn) {
    const bab = btn.closest('.isi-bab');
    const sub = btn.closest('.isi-sub');
    const target = btn.closest('[data-removable]');
    if (!target) return;

    if (target.classList.contains('isi-bab')) {
        target.remove();
        _renumberBab();
        _renumberAllSubs();
        _refreshEditorStats();
        return;
    }

    target.remove();
    refreshAllListNumbering();
    _renumberAllSubs();
    if (bab) _updateBabSummary(bab);
    if (sub) _updateSubSummary(sub);
    _refreshEditorStats();
}

function _notifyAutoResize(scope) {
    document.dispatchEvent(new CustomEvent('codex:auto-resize', { detail: { scope } }));
}

export async function collectIsiLaporanAsync() {
    const result = [];
    let babIndex = 0;

    for (const bab of document.querySelectorAll('#containerIsi > .isi-bab')) {
        babIndex += 1;
        const labelBab = bab.querySelector('.bab-label')?.textContent?.trim() ?? `BAB ${babIndex}`;
        const judulBab = _getBabTitle(bab);
        const babObj = {
            judul_bab: judulBab ? `${labelBab} - ${judulBab}` : labelBab,
            subs: [],
        };

        const subElements = [...bab.querySelectorAll(':scope > .bab-body > .sub-container > .isi-sub')];
        for (const [subIndex, sub] of subElements.entries()) {
            const styleSub = sub.querySelector('.sub-style')?.value ?? 'A';
            const labelSub = _buildLabel(styleSub, subIndex + 1);
            const judulSubRaw = _getSubTitle(sub);
            const judulSub = _stripLeadingLabel(judulSubRaw, labelSub);

            const subObj = {
                judul_sub: `${labelSub} ${judulSub}`.trim(),
                contents: [],
            };

            const contents = sub.querySelector(':scope > .sub-body > .content-container');
            for (const child of contents?.children ?? []) {
                if (child.dataset.type === 'gambar') {
                    const payload = await _imagePayloadFromElement(child);
                    if (payload) subObj.contents.push(payload);
                } else if (child.dataset.listWrapper) {
                    const list = await _collectListData(child);
                    if (list?.items?.length) subObj.contents.push(list);
                } else {
                    const text = child.querySelector('textarea')?.value?.trim() ?? '';
                    if (text) subObj.contents.push({ type: 'paragraf', teks: text });
                }
            }

            babObj.subs.push(subObj);
        }

        result.push(babObj);
    }

    return result;
}

async function _collectListData(wrapper) {
    const style = wrapper.querySelector(':scope > .list-header .list-style')?.value ?? '1';
    const mode = wrapper.querySelector(':scope > .list-header .list-mode')?.value ?? 'simple';
    const container = wrapper.querySelector(':scope > .list-items-container');
    if (!container) return null;

    const items = [];
    for (const item of container.querySelectorAll(':scope > .list-item')) {
        const data = { type: mode, anak: [], gambar_items: [] };
        if (mode === 'title') {
            data.judul = item.querySelector('.input-judul-item')?.value?.trim() ?? '';
            data.teks = item.querySelector('.input-teks-item')?.value?.trim() ?? '';
        } else {
            data.teks = item.querySelector('.input-teks-item')?.value?.trim() ?? '';
        }

        const extra = item.querySelector('.item-extra-container');
        if (extra) {
            for (const gambarEl of extra.querySelectorAll('.gambar-item')) {
                const payload = await _imagePayloadFromElement(gambarEl);
                if (payload) data.gambar_items.push(payload);
            }
        }

        const nestedContainer = item.querySelector('.nested-list-container');
        if (nestedContainer) {
            for (const nestedWrapper of nestedContainer.querySelectorAll(':scope > [data-list-wrapper]')) {
                const nested = await _collectListData(nestedWrapper);
                if (nested?.items?.length) data.anak.push(nested);
            }
        }

        items.push(data);
    }

    return { type: 'list', style, mode, items };
}

function _readBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('FileReader error'));
        reader.readAsDataURL(file);
    });
}

Object.assign(window, {
    tambahBab,
    hapusBab,
    tambahSub,
    tambahParagraf,
    tambahGambar,
    tambahGambarDiItem,
    tambahList,
    tambahListItem,
    tambahNestedList,
    hapusItem,
    toggleBabCollapse,
    toggleSubCollapse,
    refreshAllListNumbering,
    refreshAllSubNumbering,
    collectIsiLaporanAsync,
});
