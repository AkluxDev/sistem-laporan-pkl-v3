"""
PDF Generator v3.0 — Standar Akademik Laporan PKL

Perbaikan:
- Gambar selalu muncul (decode dari data URI, base64, path)
- Caption bernomor otomatis: "Gambar 1. Keterangan"
- Spacing konsisten (12pt sebelum gambar, 6pt setelah caption)
- Font Times New Roman, margin standar PKL
- Cover dengan gambar logo sekolah
"""

import io

from .doc_generator import _normalize_data, _list_label
from .docx_utils import decode_image_stream, get_image_dimensions_cm, sanitize_inline_text, sanitize_paragraph_lines


def _walk_list_items(items, style="1.", level=0):
    rows = []
    for index, item in enumerate(items or [], start=1):
        label    = _list_label(style, index)
        title    = sanitize_inline_text(item.get("judul") or item.get("title") or "")
        text     = sanitize_inline_text(item.get("teks")  or item.get("text")  or "")
        images   = item.get("gambar_items") or []
        rows.append((level, label, title, text, images))
        for nested in item.get("anak", []) or item.get("children", []):
            if isinstance(nested, dict):
                rows.extend(_walk_list_items(nested.get("items", []), nested.get("style", "a."), level + 1))
    return rows


def generate_laporan_pkl_pdf(data: dict) -> bytes:
    """
    Generate PDF laporan PKL dengan standar akademik:
    - A4, margin kiri 4cm, kanan 3cm, atas 4cm, bawah 3cm
    - Times New Roman 12pt, spasi 1.5
    - Nomor halaman di tengah bawah
    - Gambar dengan caption bernomor
    """
    try:
        from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import cm
        from reportlab.platypus import (
            Image as RLImage, PageBreak, Paragraph,
            SimpleDocTemplate, Spacer, HRFlowable, KeepTogether,
        )
        from reportlab.lib import colors
    except ImportError as exc:
        raise RuntimeError(
            "Fitur PDF membutuhkan paket reportlab. Jalankan: pip install reportlab"
        ) from exc

    normalized  = _normalize_data(data)
    buffer      = io.BytesIO()

    # ── Margin standar PKL ──────────────────────────────────────────
    LEFT_M  = 4 * cm
    RIGHT_M = 3 * cm
    TOP_M   = 4 * cm
    BOT_M   = 3 * cm
    PAGE_W  = A4[0]
    TEXT_W  = PAGE_W - LEFT_M - RIGHT_M  # ~14.1 cm

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=LEFT_M,
        rightMargin=RIGHT_M,
        topMargin=TOP_M,
        bottomMargin=BOT_M,
        title=f"Laporan PKL {sanitize_inline_text(normalized.get('nama_lengkap', ''))}".strip(),
    )

    # ── Nomor halaman ────────────────────────────────────────────────
    def draw_page_number(canvas, _doc):
        canvas.saveState()
        canvas.setFont("Times-Roman", 10)
        canvas.drawCentredString(PAGE_W / 2, 1.5 * cm, str(canvas.getPageNumber()))
        canvas.restoreState()

    # ── Styles ───────────────────────────────────────────────────────
    base = getSampleStyleSheet()

    ST = {
        "cover_title": ParagraphStyle(
            "CoverTitle", parent=base["Title"],
            fontName="Times-Bold", fontSize=18,
            leading=28, alignment=TA_CENTER,
            spaceAfter=12, spaceBefore=6,
        ),
        "cover_sub": ParagraphStyle(
            "CoverSub", parent=base["Normal"],
            fontName="Times-Bold", fontSize=14,
            leading=20, alignment=TA_CENTER,
            spaceAfter=8, spaceBefore=4,
        ),
        "cover_body": ParagraphStyle(
            "CoverBody", parent=base["Normal"],
            fontName="Times-Roman", fontSize=12,
            leading=18, alignment=TA_CENTER,
            spaceAfter=4,
        ),
        "h1": ParagraphStyle(
            "H1", parent=base["Heading1"],
            fontName="Times-Bold", fontSize=14,
            leading=21, alignment=TA_CENTER,
            spaceBefore=12, spaceAfter=12,
        ),
        "h2": ParagraphStyle(
            "H2", parent=base["Heading2"],
            fontName="Times-Bold", fontSize=12,
            leading=18, alignment=TA_LEFT,
            spaceBefore=10, spaceAfter=6,
        ),
        "h3": ParagraphStyle(
            "H3", parent=base["Heading3"],
            fontName="Times-Bold", fontSize=12,
            leading=18, alignment=TA_LEFT,
            spaceBefore=8, spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "Body", parent=base["BodyText"],
            fontName="Times-Roman", fontSize=12,
            leading=21,  # 1.5 × 14pt ≈ 21
            firstLineIndent=1.27 * cm,
            alignment=TA_JUSTIFY,
            spaceAfter=6,
        ),
        "caption": ParagraphStyle(
            "Caption", parent=base["Normal"],
            fontName="Times-Italic", fontSize=11,
            leading=16, alignment=TA_CENTER,
            spaceBefore=3, spaceAfter=10,
        ),
        "caption_num": ParagraphStyle(
            "CaptionNum", parent=base["Normal"],
            fontName="Times-Bold", fontSize=11,
            leading=16, alignment=TA_CENTER,
            spaceBefore=3, spaceAfter=10,
        ),
        "ref": ParagraphStyle(
            "Ref", parent=base["BodyText"],
            fontName="Times-Roman", fontSize=12,
            leading=18, leftIndent=1.27 * cm,
            firstLineIndent=-1.27 * cm,
            alignment=TA_JUSTIFY,
            spaceAfter=6,
        ),
    }

    story      = []
    fig_count  = [0]  # mutable counter

    # ── Helper: sisipkan gambar dengan caption bernomor ──────────────
    def append_image(image_source, caption=""):
        stream = decode_image_stream(image_source)
        if not stream:
            return  # gambar tidak valid, skip

        dims = get_image_dimensions_cm(stream)
        if dims:
            orig_w, orig_h = dims
            # Scale agar masuk ke lebar teks, dengan upscale minimal 60%
            scale_fit = min(
                (TEXT_W / cm) / orig_w,
                17.0 / orig_h,
            )
            # Pastikan gambar minimal 60% lebar teks
            min_scale = (TEXT_W * 0.6 / cm) / orig_w
            scale = max(scale_fit, min_scale)
            # Tapi tidak boleh melebihi lebar teks
            scale = min(scale, (TEXT_W / cm) / orig_w, 17.0 / orig_h)
            width  = orig_w * scale * cm
            height = orig_h * scale * cm
        else:
            width  = TEXT_W * 0.8
            height = TEXT_W * 0.5

        fig_count[0] += 1
        num = fig_count[0]

        stream.seek(0)
        img = RLImage(stream, width=width, height=height)
        img.hAlign = "CENTER"

        # Buat caption: "Gambar N. Keterangan" (bold nomor, italic keterangan)
        cap_text = caption.strip() if caption else ""
        if cap_text:
            caption_para = Paragraph(
                f"<b>Gambar {num}.</b> <i>{cap_text}</i>",
                ST["caption"],
            )
        else:
            caption_para = Paragraph(
                f"<b>Gambar {num}</b>",
                ST["caption_num"],
            )

        # KeepTogether agar gambar + caption tidak terpisah halaman
        story.append(Spacer(1, 12))
        story.append(KeepTogether([img, caption_para]))

    # ── COVER ────────────────────────────────────────────────────────
    if normalized.get("buat_cover", True):
        story += [
            Spacer(1, 48),
            Paragraph("LAPORAN", ST["cover_title"]),
            Paragraph("PRAKTIK KERJA LAPANGAN (PKL)", ST["cover_title"]),
            Paragraph(
                f"DI {sanitize_inline_text(normalized.get('nama_instansi', '')).upper()}",
                ST["cover_sub"],
            ),
            Spacer(1, 24),
        ]

        # Logo sekolah di cover
        cover_img_src = normalized.get("cover_image_path") or normalized.get("cover_image_base64")
        if cover_img_src:
            stream = decode_image_stream(cover_img_src)
            if stream:
                dims = get_image_dimensions_cm(stream)
                if dims:
                    scale = min(6.0 / dims[0], 6.0 / dims[1], 1.0)
                    iw = dims[0] * scale * cm
                    ih = dims[1] * scale * cm
                else:
                    iw = ih = 5 * cm
                stream.seek(0)
                logo = RLImage(stream, width=iw, height=ih)
                logo.hAlign = "CENTER"
                story.append(logo)
                story.append(Spacer(1, 24))

        story += [
            Paragraph("Disusun Oleh:", ST["cover_body"]),
            Spacer(1, 4),
            Paragraph(f"<b>{sanitize_inline_text(normalized.get('nama_lengkap', ''))}</b>", ST["cover_sub"]),
        ]
        if normalized.get("nis_nim"):
            story.append(Paragraph(sanitize_inline_text(normalized["nis_nim"]), ST["cover_body"]))
        if normalized.get("kelas_jurusan"):
            story.append(Paragraph(sanitize_inline_text(normalized["kelas_jurusan"]), ST["cover_body"]))

        story += [
            Spacer(1, 36),
            Paragraph(f"<b>{sanitize_inline_text(normalized.get('nama_sekolah', '')).upper()}</b>", ST["cover_sub"]),
        ]
        if normalized.get("tahun_ajaran"):
            story.append(Paragraph(
                f"TAHUN PELAJARAN {sanitize_inline_text(normalized['tahun_ajaran'])}",
                ST["cover_body"],
            ))
        story.append(PageBreak())

    # ── KATA PENGANTAR ───────────────────────────────────────────────
    kata = normalized.get("kata_pengantar", {})
    if kata.get("judul"):
        story.append(Paragraph(sanitize_inline_text(kata["judul"]).upper(), ST["h1"]))
        for block in sanitize_paragraph_lines(kata.get("kata_pembuka", "")):
            story.append(Paragraph(block, ST["body"]))
        for item in kata.get("ucapan_terima", []):
            nama    = sanitize_inline_text(item.get("nama", ""))
            jabatan = sanitize_inline_text(item.get("jabatan", ""))
            if nama or jabatan:
                teks = f"{nama}, selaku {jabatan}." if jabatan else f"{nama}."
                story.append(Paragraph(f"• {teks}", ST["body"]))
        for block in sanitize_paragraph_lines(kata.get("kata_penutup", "")):
            story.append(Paragraph(block, ST["body"]))
        if kata.get("kota_tanggal"):
            story.append(Spacer(1, 16))
            story.append(Paragraph(sanitize_inline_text(kata["kota_tanggal"]), ParagraphStyle(
                "KotaTgl", parent=ST["body"], alignment=TA_RIGHT, firstLineIndent=0,
            )))
        if kata.get("nama_penulis"):
            story.append(Spacer(1, 48))
            story.append(Paragraph(
                f"<b>{sanitize_inline_text(kata['nama_penulis'])}</b>",
                ParagraphStyle("Penulis", parent=ST["body"], alignment=TA_RIGHT, firstLineIndent=0),
            ))
        story.append(PageBreak())

    # ── ISI LAPORAN ──────────────────────────────────────────────────
    for bab in normalized.get("isi_laporan", []):
        story.append(Paragraph(sanitize_inline_text(bab.get("judul_bab", "")).upper(), ST["h1"]))

        for sub in bab.get("subs", []):
            if sub.get("judul_sub"):
                story.append(Paragraph(sanitize_inline_text(sub["judul_sub"]), ST["h2"]))

            for content in sub.get("contents", []):
                ctype = content.get("type", "")

                if ctype == "paragraf":
                    for block in sanitize_paragraph_lines(content.get("teks", "")):
                        story.append(Paragraph(block, ST["body"]))

                elif ctype == "gambar":
                    # Coba semua kemungkinan key data gambar
                    img_src = (
                        content.get("data") or
                        content.get("imgData") or
                        content.get("image") or
                        content.get("src") or
                        content.get("imgId")
                    )
                    append_image(img_src, content.get("caption", ""))

                elif ctype == "list":
                    for level, label, title, text, images in _walk_list_items(
                        content.get("items", []), content.get("style", "1.")
                    ):
                        indent = (1.27 + level * 0.9) * cm
                        lst_style = ParagraphStyle(
                            f"List{level}",
                            parent=ST["body"],
                            leftIndent=indent,
                            firstLineIndent=-0.75 * cm,
                        )
                        parts = [f"<b>{label}</b>"]
                        if title:
                            parts.append(f"<b> {title}</b>")
                        if text:
                            parts.append(f" {text}")
                        story.append(Paragraph("".join(parts), lst_style))
                        for img in images or []:
                            img_src = (
                                img.get("data") or img.get("imgData") or
                                img.get("image") or img.get("src")
                            )
                            append_image(img_src, img.get("caption", ""))

                elif ctype in ("heading", "subheading"):
                    lvl = int(content.get("level", 2) or 2)
                    txt = sanitize_inline_text(content.get("teks") or content.get("judul") or "")
                    if txt:
                        story.append(Paragraph(txt, ST["h2"] if lvl <= 2 else ST["h3"]))

                elif ctype == "tabel":
                    # Tabel sederhana sebagai teks sementara
                    if content.get("caption"):
                        story.append(Paragraph(f"[Tabel: {sanitize_inline_text(content['caption'])}]", ST["body"]))

        story.append(PageBreak())

    # ── DAFTAR RUJUKAN ───────────────────────────────────────────────
    rujukan = normalized.get("rujukan", [])
    if rujukan:
        story.append(Paragraph("DAFTAR RUJUKAN", ST["h1"]))
        for item in rujukan:
            for block in sanitize_paragraph_lines(item.get("teks", "")):
                story.append(Paragraph(block, ST["ref"]))

    doc.build(story, onFirstPage=draw_page_number, onLaterPages=draw_page_number)
    buffer.seek(0)
    return buffer.getvalue()
