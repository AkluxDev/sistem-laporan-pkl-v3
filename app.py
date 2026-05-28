"""
Flask App â€” Sistem Laporan PKL  v2.1 (fixed)

FIX:
- File cover sementara di UPLOAD_DIR sekarang dihapus setelah
  generate selesai (sebelumnya file leak tak terbatas).
- MAX_CONTENT_LENGTH disesuaikan: 20 MB sudah cukup karena
  gambar tanda tangan dan cover dikirim sebagai base64 di JSON
  (base64 ~33% lebih besar dari binary), dan validasi di JS
  membatasi 5 MB per file.
- generate(): cleanup dilakukan di blok finally agar file
  selalu dihapus meski terjadi exception.
- Tambah endpoint /cleanup-uploads untuk maintenance manual.
- Error response selalu JSON dengan key 'error' yang konsisten.
"""

from flask import Flask, request, jsonify, send_file, render_template
import os
import io
import json
import time
import tempfile
from werkzeug.utils import secure_filename
from core.doc_generator import generate_laporan_pkl
from core.pdf_generator import generate_laporan_pkl_pdf

app = Flask(__name__, static_folder='static', static_url_path='/static')

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'}

# FIX: 20 MB cukup. Base64 dari 5 MB file â‰ˆ 6.7 MB di JSON.
# Beberapa file TTD + cover = ~20 MB aman.
app.config['MAX_CONTENT_LENGTH'] = 20 * 1024 * 1024


def allowed_file(filename: str) -> bool:
    return (
        '.' in filename and
        filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
    )


def _cleanup_file(path: str):
    """Hapus file sementara dengan aman (tidak raise jika gagal)."""
    if path and os.path.isfile(path):
        try:
            os.remove(path)
        except OSError:
            pass


@app.route('/')
def index():
    """Serve halaman utama."""
    return render_template('index.html')


@app.route('/generate', methods=['POST'])
@app.route('/generate/<file_format>', methods=['POST'])
def generate(file_format='docx'):
    """
    Generate dokumen .docx dari data form.

    Mode 1: application/json  â†’ data form (gambar dalam base64 di JSON)
    Mode 2: multipart/form-data â†’ data form + file gambar cover fisik
    """
    cover_path = None   # path file sementara untuk di-cleanup

    try:
        content_type = request.content_type or ''

        if 'multipart/form-data' in content_type:
            raw_data = request.form.get('data')
            if not raw_data:
                return jsonify({"error": "Field 'data' tidak ditemukan di form"}), 400

            try:
                data = json.loads(raw_data)
            except json.JSONDecodeError as e:
                return jsonify({"error": f"JSON tidak valid: {e}"}), 400

            # Simpan file cover ke disk sementara
            if 'cover_image' in request.files:
                file = request.files['cover_image']
                if file and file.filename and allowed_file(file.filename):
                    ext       = file.filename.rsplit('.', 1)[1].lower()
                    # FIX: gunakan tempfile agar nama unik dan tidak kolisi
                    fd, cover_path = tempfile.mkstemp(suffix=f'.{ext}', dir=UPLOAD_DIR)
                    os.close(fd)
                    file.save(cover_path)
                    data['cover_image_path'] = cover_path
        else:
            try:
                data = request.get_json(force=True)
            except Exception:
                data = None

            if not data:
                return jsonify({"error": "Body JSON tidak valid atau kosong"}), 400

        # Validasi field wajib
        for field in ('nama_lengkap', 'nama_instansi'):
            val = data.get(field, '')
            if not (isinstance(val, str) and val.strip()):
                return jsonify({"error": f"Field '{field}' wajib diisi"}), 400

        file_format = (file_format or request.args.get('format') or 'docx').lower()
        if file_format not in {'docx', 'pdf'}:
            return jsonify({"error": "Format unduhan tidak didukung. Gunakan docx atau pdf."}), 400

        nama_safe = data['nama_lengkap'].strip().replace(' ', '_')[:40]
        if file_format == 'pdf':
            doc_bytes = generate_laporan_pkl_pdf(data)
            filename = f"Laporan_PKL_{nama_safe}.pdf"
            mimetype = 'application/pdf'
        else:
            doc_bytes = generate_laporan_pkl(data)
            filename = f"Laporan_PKL_{nama_safe}.docx"
            mimetype = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

        return send_file(
            io.BytesIO(doc_bytes),
            mimetype=mimetype,
            as_attachment=True,
            download_name=filename,
        )

    except Exception as e:
        app.logger.exception("Error saat generate laporan")
        return jsonify({"error": f"Terjadi kesalahan: {str(e)}"}), 500

    finally:
        # FIX: selalu hapus file cover sementara setelah selesai
        _cleanup_file(cover_path)


@app.route('/upload-cover', methods=['POST'])
def upload_cover():
    """
    Endpoint opsional untuk upload cover terpisah.
    Mengembalikan path sementara untuk digunakan generate.
    """
    if 'cover_image' not in request.files:
        return jsonify({"error": "File gambar tidak ditemukan"}), 400

    file = request.files['cover_image']
    if not file.filename:
        return jsonify({"error": "Tidak ada file yang dipilih"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Format tidak didukung. Gunakan PNG, JPG, JPEG, GIF, atau WEBP"}), 400

    ext       = file.filename.rsplit('.', 1)[1].lower()
    fd, path  = tempfile.mkstemp(suffix=f'.{ext}', dir=UPLOAD_DIR)
    os.close(fd)
    file.save(path)

    return jsonify({"success": True, "path": path, "filename": os.path.basename(path)})


@app.route('/cleanup-uploads', methods=['POST'])
def cleanup_uploads():
    """
    Hapus file sementara yang lebih dari 1 jam (maintenance manual).
    Endpoint ini sebaiknya dilindungi auth di production.
    """
    cutoff  = time.time() - 3600  # 1 jam
    removed = 0

    for fname in os.listdir(UPLOAD_DIR):
        fpath = os.path.join(UPLOAD_DIR, fname)
        try:
            if os.path.isfile(fpath) and os.path.getmtime(fpath) < cutoff:
                os.remove(fpath)
                removed += 1
        except OSError:
            pass

    return jsonify({"removed": removed, "message": f"{removed} file dihapus"})


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok", "message": "Sistem Laporan PKL berjalan"})


@app.errorhandler(413)
def request_too_large(_):
    return jsonify({"error": "Ukuran file terlalu besar. Maksimal 20 MB total."}), 413


@app.errorhandler(404)
def not_found(_):
    return jsonify({"error": "Endpoint tidak ditemukan"}), 404


@app.errorhandler(500)
def internal_error(_):
    return jsonify({"error": "Terjadi kesalahan internal server"}), 500


if __name__ == '__main__':
    print("=" * 50)
    print("  Sistem Laporan PKL â€” Barrr Creative  v2.1")
    print("  Akses : http://localhost:5000")
    print("=" * 50)
    app.run(debug=True, host='0.0.0.0', port=5000)

