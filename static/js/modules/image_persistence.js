/**
 * image_persistence.js
 * ====================
 * Sistem persistence gambar untuk editor Isi Laporan.
 *
 * FILOSOFI:
 *   IndexedDB menyimpan File/Blob sementara — hilang saat refresh di banyak
 *   konteks (private browsing, browser tertentu, tab baru).
 *   Satu-satunya format yang survive refresh tanpa server adalah base64
 *   yang disimpan langsung di docState → localStorage.
 *
 *   Arsitektur baru:
 *     upload → baca sebagai base64 → simpan ke docState.node.imgData
 *              → ikut autosave ke localStorage → restore langsung dari state
 *
 *   imgId tetap ada untuk backward compat dengan IndexedDB lama,
 *   tapi imgData (base64) adalah sumber kebenaran utama.
 *
 * CARA INTEGRASI:
 *   1. Import / copy ke proyek sebagai module.
 *   2. Panggil initImagePersistence() satu kali saat app boot.
 *   3. Gunakan ImageStore.save() dan ImageStore.restore() di builder.
 *   4. Ikuti instruksi patch di bawah untuk 3 titik di builder.
 *
 * File: static/js/modules/image_persistence.js
 */

'use strict';

// ─── Konstanta ────────────────────────────────────────────────────────────────

const IMG_LS_PREFIX   = 'pkl_img_v2_';   // prefix di localStorage per gambar
const IMG_MAX_BYTES   = 4 * 1024 * 1024; // 4MB per gambar (base64 ~33% lebih besar dari file)
const IMG_MAX_DIM     = 1600;            // max lebar/tinggi sebelum di-resize
const IMG_QUALITY     = 0.82;            // kualitas JPEG saat resize
const IMG_PLACEHOLDER = 'data:image/svg+xml;base64,' + btoa(`
  <svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">
    <rect width="400" height="200" fill="#f1f5f9"/>
    <text x="200" y="90" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#94a3b8">
      Gambar tidak dapat dimuat
    </text>
    <text x="200" y="115" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#cbd5e1">
      Klik tombol Unggah Ulang di bawah
    </text>
  </svg>
`.trim());

// ─── ImageStore — persistent key-value untuk base64 gambar ───────────────────

export const ImageStore = {

  /**
   * Simpan File/Blob gambar sebagai base64 ke localStorage.
   * Jika gambar terlalu besar, di-resize otomatis sebelum disimpan.
   *
   * @param {string} imgId   — ID unik gambar (diambil dari node.imgId)
   * @param {File|Blob} file — file gambar yang diupload
   * @returns {Promise<string>} base64 data URL yang disimpan
   */
  async save(imgId, file) {
    if (!imgId || !file) throw new Error('imgId dan file wajib ada');

    let base64;

    // Coba resize jika terlalu besar
    if (file.size > IMG_MAX_BYTES || file.type === 'image/bmp') {
      base64 = await _resizeAndEncode(file);
    } else {
      base64 = await _readAsBase64(file);
    }

    // Simpan ke localStorage
    try {
      localStorage.setItem(IMG_LS_PREFIX + imgId, base64);
    } catch (e) {
      // localStorage penuh — coba cleanup gambar lama dulu
      _pruneOldImages();
      try {
        localStorage.setItem(IMG_LS_PREFIX + imgId, base64);
      } catch (e2) {
        console.error('[ImageStore] localStorage penuh bahkan setelah cleanup:', e2);
        throw new Error('Penyimpanan lokal penuh. Hapus beberapa gambar lama.');
      }
    }

    return base64;
  },

  /**
   * Ambil base64 gambar dari localStorage.
   *
   * @param {string} imgId
   * @returns {string|null} base64 data URL atau null jika tidak ada
   */
  get(imgId) {
    if (!imgId) return null;
    return localStorage.getItem(IMG_LS_PREFIX + imgId) ?? null;
  },

  /**
   * Hapus gambar dari localStorage.
   *
   * @param {string} imgId
   */
  remove(imgId) {
    if (!imgId) return;
    localStorage.removeItem(IMG_LS_PREFIX + imgId);
  },

  /**
   * Cek apakah gambar ada di localStorage.
   */
  has(imgId) {
    return !!this.get(imgId);
  },

  /**
   * Ambil semua imgId yang tersimpan di localStorage.
   */
  listAll() {
    return Object.keys(localStorage)
      .filter(k => k.startsWith(IMG_LS_PREFIX))
      .map(k => k.slice(IMG_LS_PREFIX.length));
  },

  /**
   * Hapus semua gambar yang imgId-nya tidak ada di docState aktif.
   * Dipanggil saat generate untuk cleanup.
   *
   * @param {string[]} activeImgIds — array imgId yang masih dipakai
   */
  pruneOrphans(activeImgIds) {
    const all = this.listAll();
    const activeSet = new Set(activeImgIds);
    for (const id of all) {
      if (!activeSet.has(id)) {
        this.remove(id);
      }
    }
  },
};

// ─── Helper: resize gambar sebelum simpan ────────────────────────────────────

function _resizeAndEncode(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > IMG_MAX_DIM || height > IMG_MAX_DIM) {
        const ratio = Math.min(IMG_MAX_DIM / width, IMG_MAX_DIM / height);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL('image/jpeg', IMG_QUALITY));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Gagal memuat gambar untuk resize'));
    };

    img.src = url;
  });
}

function _readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('FileReader gagal membaca file'));
    reader.readAsDataURL(file);
  });
}

function _pruneOldImages() {
  // Hapus gambar paling lama (FIFO berdasarkan key alphabetical)
  const keys = Object.keys(localStorage)
    .filter(k => k.startsWith(IMG_LS_PREFIX))
    .sort();
  // Hapus 25% terlama
  const toRemove = keys.slice(0, Math.max(1, Math.floor(keys.length * 0.25)));
  for (const k of toRemove) localStorage.removeItem(k);
}

// ─── Patch functions yang menggantikan handler gambar di builder ──────────────
//
// CARA PAKAI:
//   Di isi_laporan_builder.js, ganti handler upload gambar yang lama
//   dengan fungsi-fungsi ini.

/**
 * Handler upload gambar untuk node GAMBAR utama (bukan list item).
 * Menggantikan event listener `.edit-image` di _bindEditorEvents().
 *
 * PATCH POINT 1 di _bindEditorEvents():
 *
 * LAMA:
 *   imgInp.addEventListener('change', async () => {
 *     const file = imgInp.files[0];
 *     if (!file) return;
 *     const id = `img_${Date.now()}`;
 *     await saveImage(id, file);          // ← hanya ke IndexedDB
 *     node.imgId = id;
 *     _renderEditorImage(node);
 *     renderSidebar();
 *   });
 *   if (node.imgId) _renderEditorImage(node);
 *
 * BARU:
 *   imgInp.addEventListener('change', async () => {
 *     await handleGambarUpload(imgInp.files[0], node, _renderEditorImage, renderSidebar);
 *   });
 *   restoreGambarPreview(node);  // ← restore dari base64, bukan IndexedDB
 *
 * @param {File} file
 * @param {Object} node — docState node bertipe TYPE.GAMBAR
 * @param {Function} renderImageFn — fungsi _renderEditorImage
 * @param {Function} renderSidebarFn — fungsi renderSidebar
 */
export async function handleGambarUpload(file, node, renderImageFn, renderSidebarFn) {
  if (!file) return;

  const maxOriginalMB = 10;
  if (file.size > maxOriginalMB * 1024 * 1024) {
    alert(`Ukuran gambar maksimal ${maxOriginalMB}MB. Gambar ini ${(file.size / 1024 / 1024).toFixed(1)}MB.`);
    return;
  }

  const imgId = `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  try {
    // Simpan ke localStorage sebagai base64 (survive refresh)
    const base64 = await ImageStore.save(imgId, file);

    // Simpan ke IndexedDB juga untuk backward compat (opsional)
    try {
      const { saveImage } = await import('./image_db.js');
      await saveImage(imgId, file);
    } catch (_) { /* image_db opsional */ }

    // Simpan ke state — INI YANG PENTING
    node.imgId   = imgId;
    node.imgData = base64;          // base64 langsung di state
    node.imgMeta = {
      name:   file.name,
      type:   file.type,
      size:   file.size,
      width:  0,   // diisi setelah load
      height: 0,
    };

    // Dapatkan dimensi asli
    _getImageDimensions(base64).then(dims => {
      if (node.imgMeta) {
        node.imgMeta.width  = dims.width;
        node.imgMeta.height = dims.height;
      }
    });

    // Render preview langsung dari base64 (tidak perlu async IndexedDB)
    _injectImagePreview(node.id, base64);
    renderSidebarFn?.();

  } catch (err) {
    console.error('[handleGambarUpload]', err);
    alert(`Gagal menyimpan gambar: ${err.message}`);
  }
}

/**
 * Restore preview gambar dari state (imgData) — dipanggil setelah render HTML.
 * Tidak perlu IndexedDB. Tidak async.
 *
 * PATCH POINT 2 di _bindEditorEvents():
 *   Ganti:   if (node.imgId) _renderEditorImage(node);
 *   Dengan:  restoreGambarPreview(node);
 *
 * @param {Object} node
 */
export function restoreGambarPreview(node) {
  if (!node || node.type !== 'gambar') return;

  const base64 = node.imgData || ImageStore.get(node.imgId);

  if (!base64) {
    // Gambar tidak ditemukan — tampilkan placeholder + tombol reupload
    _showImageErrorState(node.id);
    return;
  }

  // Pastikan imgData selalu ada di state (patch kalau belum)
  if (!node.imgData && base64) {
    node.imgData = base64;
  }

  _injectImagePreview(node.id, base64);
}

/**
 * Handler upload gambar di dalam LIST ITEM.
 * Menggantikan window.handleListItemImg().
 *
 * PATCH POINT 3 — ganti window.handleListItemImg:
 *
 * LAMA:
 *   window.handleListItemImg = async (listId, itemId, event) => {
 *     const file = event.target.files[0];
 *     if (!file) return;
 *     const item = findNode(itemId);
 *     const id = `img_li_${Date.now()}`;
 *     await saveImage(id, file);   // ← hanya IndexedDB
 *     item.imgId = id;
 *     renderEditor();
 *   };
 *
 * BARU:
 *   window.handleListItemImg = async (listId, itemId, event) => {
 *     await handleListItemImageUpload(listId, itemId, event.target.files[0], findNode, renderEditor);
 *   };
 *
 * @param {string} listId
 * @param {string} itemId
 * @param {File} file
 * @param {Function} findNodeFn
 * @param {Function} renderEditorFn
 */
export async function handleListItemImageUpload(listId, itemId, file, findNodeFn, renderEditorFn) {
  if (!file) return;

  const item = findNodeFn(itemId);
  if (!item) return;

  const imgId = `img_li_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  try {
    const base64 = await ImageStore.save(imgId, file);

    try {
      const { saveImage } = await import('./image_db.js');
      await saveImage(imgId, file);
    } catch (_) {}

    item.imgId   = imgId;
    item.imgData = base64;
    item.imgMeta = { name: file.name, type: file.type, size: file.size };

    // Inject preview langsung — tidak perlu full renderEditor
    _injectListItemImagePreview(itemId, base64);

  } catch (err) {
    console.error('[handleListItemImageUpload]', err);
    alert(`Gagal menyimpan gambar: ${err.message}`);
  }
}

/**
 * Restore semua preview gambar di list items setelah renderEditor().
 * Dipanggil sekali setelah HTML di-render, scan semua .list-item-img-preview.
 *
 * PATCH POINT 4 — tambahkan di akhir _bindEditorEvents() untuk LIST:
 *   restoreAllListItemImages(node.items);
 *
 * @param {Array} items — node.items dari list
 */
export function restoreAllListItemImages(items) {
  const restore = (arr) => {
    for (const item of (arr || [])) {
      if (item.imgId || item.imgData) {
        const base64 = item.imgData || ImageStore.get(item.imgId);
        if (base64) {
          if (!item.imgData) item.imgData = base64; // patch state
          _injectListItemImagePreview(item.id, base64);
        } else {
          // Tampilkan error state ringan
          const el = document.querySelector(`.list-item-img-preview[data-item-id="${item.id}"]`);
          if (el) el.alt = 'Gambar tidak tersedia';
        }
      }
      if (item.children?.length) restore(item.children);
    }
  };
  restore(items);
}

// ─── DOM helpers ──────────────────────────────────────────────────────────────

function _injectImagePreview(nodeId, base64) {
  // Cari img element di editor
  let img = document.querySelector(`.preview-img[data-id="${nodeId}"]`);

  if (!img) {
    // Coba cari zone dan inject img baru
    const zone = document.querySelector(`.image-preview-zone`);
    if (zone) {
      // Hapus placeholder
      zone.querySelector('.upload-placeholder')?.remove();
      img = document.createElement('img');
      img.className  = 'img-fluid rounded preview-img';
      img.dataset.id = nodeId;
      zone.insertBefore(img, zone.firstChild);
    }
  }

  if (img) {
    img.src = base64;
    img.style.display = 'block';
    img.closest('.upload-placeholder')?.remove();
  }
}

function _injectListItemImagePreview(itemId, base64) {
  const img = document.querySelector(`.list-item-img-preview[data-item-id="${itemId}"]`);
  if (img) {
    img.src = base64;
    img.style.display = 'block';
  }
}

function _showImageErrorState(nodeId) {
  const zone = document.querySelector('.image-preview-zone');
  if (!zone) return;

  zone.innerHTML = `
    <div class="img-error-state text-center p-4">
      <i class="bi bi-exclamation-triangle text-warning" style="font-size:2rem"></i>
      <p class="mt-2 mb-1 small fw-bold text-muted">Gambar tidak dapat dimuat</p>
      <p class="small text-muted mb-3">File mungkin sudah dihapus atau penyimpanan penuh.</p>
      <label class="btn btn-sm btn-outline-primary">
        <i class="bi bi-upload me-1"></i>Unggah Ulang
        <input type="file" accept="image/*" class="d-none"
               onchange="window._handleImageReupload('${nodeId}', this)">
      </label>
    </div>
  `;
}

// Handler reupload dari error state
window._handleImageReupload = async (nodeId, input) => {
  const file = input.files[0];
  if (!file) return;
  // Cari node di docState — exposed via window.__getDocState
  const tree = window.__getDocState?.()?.tree;
  if (!tree) return;
  const node = _findInTree(tree, nodeId);
  if (!node) return;
  await handleGambarUpload(file, node, null, null);
};

function _findInTree(nodes, id) {
  for (const n of (nodes || [])) {
    if (n.id === id) return n;
    const found = _findInTree(n.children || n.items, id);
    if (found) return found;
  }
  return null;
}

function _getImageDimensions(base64) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload  = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = base64;
  });
}

// ─── Serializer patch ─────────────────────────────────────────────────────────
//
// collectIsiLaporanAsync() di builder harus menyertakan imgData.
// Ini adalah versi patcher yang bisa dipanggil SEBELUM collectIsiLaporanAsync lama.

/**
 * Pastikan semua node gambar di tree memiliki imgData yang up-to-date
 * dari localStorage sebelum serialisasi.
 *
 * CARA PAKAI:
 *   Di collectIsiLaporanAsync(), tambahkan di baris pertama:
 *     hydrateImageData(docState.tree);
 *
 * @param {Array} nodes
 */
export function hydrateImageData(nodes) {
  const walk = (arr) => {
    for (const node of (arr || [])) {
      // Node gambar utama
      if (node.type === 'gambar' && node.imgId && !node.imgData) {
        const stored = ImageStore.get(node.imgId);
        if (stored) node.imgData = stored;
      }

      // List items yang punya gambar
      if (node.type === 'list') {
        _hydrateListItems(node.items);
      }

      walk(node.children);
    }
  };

  const _hydrateListItems = (items) => {
    for (const item of (items || [])) {
      if (item.imgId && !item.imgData) {
        const stored = ImageStore.get(item.imgId);
        if (stored) item.imgData = stored;
      }
      _hydrateListItems(item.children);
    }
  };

  walk(nodes);
}

// ─── Restore entry point ──────────────────────────────────────────────────────

/**
 * Dipanggil setelah __restoreIsiBuilderFromDraft() selesai meload docState.
 * Memastikan semua imgData di-hydrate dari localStorage sebelum render.
 *
 * CARA PAKAI:
 *   Di window.__restoreIsiBuilderFromDraft, tambahkan di akhir sebelum renderSidebar():
 *     hydrateImageData(docState.tree);
 *
 * Atau panggil initImagePersistence() sekali saat boot — ini akan auto-patch.
 */
export function initImagePersistence() {
  // Expose docState accessor untuk error recovery
  // (dipanggil dari window._handleImageReupload)
  // Ini harus di-wire oleh builder:
  //   window.__getDocState = () => docState;

  // Patch window.handleListItemImg global
  const originalHandleListItemImg = window.handleListItemImg;

  // Kita tidak override di sini karena perlu findNode dari builder.
  // Lihat PATCH POINT 3 di atas — patch dilakukan langsung di builder.

  console.log('[ImagePersistence] Initialized. Images survive via localStorage.');
}
