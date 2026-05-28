from .docx_utils import sanitize_inline_text
from .image_engine import ImageEngine
from .layout_engine import LayoutEngine
from .paragraph_engine import ParagraphEngine, enable_flow_control
from .styles import apply_signature_style, format_run


class SignatureEngine:
    def __init__(self, document):
        self.document = document
        self.layout = LayoutEngine(document)
        self.images = ImageEngine(document)
        self.paragraphs = ParagraphEngine(document)

    def build_approval_page(self, page_data: dict, defaults: dict):
        title = sanitize_inline_text(page_data.get("judul") or "LEMBAR PENGESAHAN")
        self.paragraphs.add_section_heading(title)

        jenis = sanitize_inline_text(page_data.get("jenis_laporan") or "LAPORAN PRAKTIK KERJA INDUSTRI")
        p_jenis = self.document.add_paragraph()
        apply_signature_style(p_jenis)
        enable_flow_control(p_jenis, keep_next=True, keep_lines=True)
        format_run(p_jenis.add_run(jenis.upper()), bold=True, italic=False)

        instansi = sanitize_inline_text(page_data.get("nama_pt") or defaults.get("nama_instansi"))
        if instansi:
            p_instansi = self.document.add_paragraph()
            apply_signature_style(p_instansi)
            enable_flow_control(p_instansi, keep_next=True, keep_lines=True)
            format_run(p_instansi.add_run(f"DI {instansi.upper()}"), bold=True, italic=False)

        tujuan = sanitize_inline_text(page_data.get("tujuan", ""))
        if tujuan:
            p_tujuan = self.document.add_paragraph()
            apply_signature_style(p_tujuan)
            enable_flow_control(p_tujuan, keep_lines=True)
            format_run(p_tujuan.add_run(tujuan), bold=False, italic=False)
            p_tujuan.paragraph_format.space_after = 6

        identity_lines = [
            ("Nama", page_data.get("nama_penyusun") or defaults.get("nama_lengkap")),
            ("NIS / NIM", page_data.get("nis") or defaults.get("nis_nim")),
            ("Kelas / Program Keahlian", page_data.get("kelas") or defaults.get("kelas_jurusan")),
            ("Tahun Pelajaran", page_data.get("tahun_pelajaran") or defaults.get("tahun_ajaran")),
        ]
        for label, value in identity_lines:
            value = sanitize_inline_text(value)
            if not value:
                continue
            p_line = self.document.add_paragraph()
            apply_signature_style(p_line)
            enable_flow_control(p_line, keep_lines=True)
            format_run(p_line.add_run(f"{label}: {value}"), italic=False, bold=(label == "Nama"))

        p_date = self.document.add_paragraph()
        apply_signature_style(p_date)
        enable_flow_control(p_date, keep_next=True, keep_lines=True)
        format_run(p_date.add_run("Tanggal Pengesahan :"), italic=False)
        p_date.paragraph_format.space_before = 10
        p_date.paragraph_format.space_after = 28

        pre_sign = self.document.add_paragraph()
        apply_signature_style(pre_sign)
        format_run(pre_sign.add_run(" "), italic=False)
        pre_sign.paragraph_format.space_before = 0
        pre_sign.paragraph_format.space_after = 28

        signers = page_data.get("penandatangan") or self._fallback_signers(defaults)
        self.build_signature_layout(signers, defaults)

    def build_signature_layout(self, signers: list[dict], defaults: dict):
        normalized = [self._normalize_signer(item) for item in signers if isinstance(item, dict)]
        if not normalized:
            normalized = self._fallback_signers(defaults)

        table = self.layout.add_invisible_table(rows=6, cols=2, widths_cm=[7.0, 7.0])
        table.rows[0].height = 0
        table.rows[1].height = 0
        table.rows[2].height = 0
        table.rows[3].height = 0
        table.rows[4].height = 0
        table.rows[5].height = 0

        top_left = normalized[0] if len(normalized) > 0 else None
        top_right = normalized[1] if len(normalized) > 1 else None
        bottom_center = normalized[2] if len(normalized) > 2 else None

        self._render_signature_block(table.cell(0, 0), top_left, defaults=defaults)
        self._render_signature_block(table.cell(0, 1), top_right, defaults=defaults)
        if bottom_center:
            merged = table.cell(5, 0).merge(table.cell(5, 1))
            self._render_signature_block(merged, bottom_center, defaults=defaults)

    def _render_signature_block(self, cell, signer: dict | None, defaults: dict | None = None):
        if not signer:
            return
        cell.text = ""
        defaults = defaults or {}

        lines = self._signature_heading_lines(signer, defaults)
        title = cell.paragraphs[0]
        apply_signature_style(title)
        enable_flow_control(title, keep_next=True, keep_lines=True)
        format_run(title.add_run(lines[0]), bold=False, italic=False)
        title.paragraph_format.space_before = 0
        title.paragraph_format.space_after = 6

        for line in lines[1:]:
            line_paragraph = cell.add_paragraph()
            apply_signature_style(line_paragraph)
            enable_flow_control(line_paragraph, keep_next=True, keep_lines=True)
            format_run(line_paragraph.add_run(line), bold=False, italic=False)
            line_paragraph.paragraph_format.space_before = 0
            line_paragraph.paragraph_format.space_after = 4

        image_paragraph = cell.add_paragraph()
        apply_signature_style(image_paragraph)
        inserted = self.images.insert_image_fit(signer["image"], max_width_cm=4.2, max_height_cm=3.2, paragraph=image_paragraph)
        image_paragraph.paragraph_format.space_before = 18
        image_paragraph.paragraph_format.space_after = 18
        if inserted is None:
            format_run(image_paragraph.add_run(" "), italic=False)

        for _ in range(3):
            spacer = cell.add_paragraph()
            apply_signature_style(spacer)
            format_run(spacer.add_run(" "), italic=False)
            spacer.paragraph_format.space_before = 0
            spacer.paragraph_format.space_after = 14

        name_paragraph = cell.add_paragraph()
        apply_signature_style(name_paragraph)
        enable_flow_control(name_paragraph, keep_lines=True)
        format_run(name_paragraph.add_run(signer["nama"]), bold=True, italic=False)
        name_paragraph.paragraph_format.space_before = 0
        name_paragraph.paragraph_format.space_after = 0

    def _signature_heading_lines(self, signer: dict, defaults: dict):
        jabatan = signer["jabatan"].strip()
        if jabatan.lower() == "kepala sekolah":
            school_name = sanitize_inline_text(defaults.get("nama_sekolah") or "Sekolah")
            return ["Mengetahui,", f"Kepala {school_name}"]
        return [jabatan]

    def _normalize_signer(self, signer: dict):
        return {
            "jabatan": sanitize_inline_text(signer.get("jabatan") or "Pihak Terkait"),
            "nama": sanitize_inline_text(signer.get("nama") or "_______________"),
            "image": signer.get("image"),
        }

    def _fallback_signers(self, defaults: dict):
        return [
            {
                "jabatan": "Kepala Program Keahlian",
                "nama": sanitize_inline_text(defaults.get("nama_pembimbing_lapangan") or "_______________"),
                "image": None,
            },
            {
                "jabatan": "Pembimbing",
                "nama": sanitize_inline_text(defaults.get("nama_pembimbing_sekolah") or "_______________"),
                "image": None,
            },
            {
                "jabatan": "Kepala Sekolah",
                "nama": sanitize_inline_text(defaults.get("nama_kepala_sekolah") or "_______________"),
                "image": None,
            },
        ]
