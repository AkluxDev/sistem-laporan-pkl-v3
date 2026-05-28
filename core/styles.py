"""
styles.py — Standar Emas Laporan PKL Indonesia
================================================
Referensi: Panduan Teknis Penulisan Laporan PKL (Standar Nasional)

KONSTANTA:
- Kertas  : A4 (21 x 29.7 cm)
- Margin  : Kiri 4cm | Atas 4cm | Kanan 3cm | Bawah 3cm
- Font    : Times New Roman 12pt (body), 14pt (Heading 1)
- Spasi   : 1.5 lines
- Indent  : 1.27 cm (baris pertama paragraf)

HEADING HIERARCHY:
  Heading 1 — BAB (KAPITAL, BOLD, CENTER, 14pt)
  Heading 2 — Sub-Bab (Title Case, BOLD, LEFT, 12pt)
  Heading 3 — Anak Sub-Bab (Title Case, BOLD, LEFT, 12pt, indent)
  Heading 4 — Caption gambar (CENTER, italic, 11pt)

NOMOR HALAMAN:
  Cover          : tanpa nomor
  Halaman awal   : Romawi kecil (i, ii, iii) — tengah bawah, 1.5cm dari tepi
  Isi BAB        : Arab (1, 2, 3) — halaman BAB baru = tengah bawah,
                   halaman lanjutan = kanan atas
"""

from docx.enum.style import WD_STYLE_TYPE
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.shared import Cm, Pt

from .docx_utils import set_run_fonts

# ─────────────────────────────────────────────────────────────
# KONSTANTA UTAMA
# ─────────────────────────────────────────────────────────────
FONT_NAME          = "Times New Roman"
FONT_CODE          = "Courier New"   # untuk script/command

BODY_SIZE          = Pt(12)
HEADING_SIZE       = Pt(14)          # Heading 1 (BAB)
SUBHEADING_SIZE    = Pt(12)          # Heading 2, 3
CAPTION_SIZE       = Pt(11)          # Caption gambar / tabel
CODE_SIZE          = Pt(11)          # Code / script

MARGIN_LEFT_CM     = 4.0             # kiri (ruang jilid)
MARGIN_TOP_CM      = 4.0             # atas (juga untuk halaman BAB baru)
MARGIN_RIGHT_CM    = 3.0
MARGIN_BOTTOM_CM   = 3.0

# Lebar teks efektif = 21 - 4 - 3 = 14 cm
TEXT_WIDTH_CM      = 21.0 - MARGIN_LEFT_CM - MARGIN_RIGHT_CM

# Indentasi baris pertama paragraf
FIRST_LINE_INDENT  = Cm(1.27)

# Jarak header/footer dari tepi = 1.5 cm
HEADER_DIST_CM     = 1.5
FOOTER_DIST_CM     = 1.5


# ─────────────────────────────────────────────────────────────
# KONFIGURASI DOKUMEN (dipanggil sekali saat init)
# ─────────────────────────────────────────────────────────────
def configure_document_defaults(document):
    """
    Konfigurasi dasar dokumen sesuai standar laporan PKL.
    Dipanggil sekali di awal sebelum konten ditambahkan.
    """
    # ── Normal / Body ─────────────────────────────────────────
    normal = document.styles["Normal"]
    normal.font.name        = FONT_NAME
    normal.font.size        = BODY_SIZE
    normal.font.bold        = False
    normal.font.italic      = False
    normal.font.color.rgb   = None

    fmt = normal.paragraph_format
    fmt.space_before        = Pt(0)
    fmt.space_after         = Pt(0)
    fmt.line_spacing_rule   = WD_LINE_SPACING.ONE_POINT_FIVE
    fmt.first_line_indent   = FIRST_LINE_INDENT
    fmt.alignment           = WD_ALIGN_PARAGRAPH.JUSTIFY

    # ── Heading 1 — BAB ──────────────────────────────────────
    # KAPITAL, Bold, Center, 14pt, spasi sebelum=0, setelah=12pt
    _configure_heading(document.styles["Heading 1"],
        size=HEADING_SIZE, bold=True,
        align=WD_ALIGN_PARAGRAPH.CENTER,
        space_before=Pt(0), space_after=Pt(12),
        indent=Cm(0), keep_next=True)

    # ── Heading 2 — Sub-Bab ──────────────────────────────────
    # Title Case, Bold, Left, 12pt
    _configure_heading(document.styles["Heading 2"],
        size=SUBHEADING_SIZE, bold=True,
        align=WD_ALIGN_PARAGRAPH.LEFT,
        space_before=Pt(12), space_after=Pt(6),
        indent=Cm(0), keep_next=True)

    # ── Heading 3 — Anak Sub-Bab ─────────────────────────────
    # Title Case, Bold, Left, 12pt, indent 1.0 cm
    _configure_heading(document.styles["Heading 3"],
        size=SUBHEADING_SIZE, bold=True,
        align=WD_ALIGN_PARAGRAPH.LEFT,
        space_before=Pt(6), space_after=Pt(4),
        indent=Cm(1.0), keep_next=True)

    # ── Heading 4 — Caption / sub-sub ─────────────────────────
    _configure_heading(document.styles["Heading 4"],
        size=CAPTION_SIZE, bold=False, italic=True,
        align=WD_ALIGN_PARAGRAPH.CENTER,
        space_before=Pt(4), space_after=Pt(4),
        indent=Cm(0), keep_next=False)

    # ── TOC Styles ────────────────────────────────────────────
    for lvl in range(1, 5):
        _configure_toc_style(document, lvl)

    # ── PKL Custom Styles ─────────────────────────────────────
    _ensure_pkl_styles(document)


# ─────────────────────────────────────────────────────────────
# HELPERS INTERNAL
# ─────────────────────────────────────────────────────────────
def _configure_heading(style, size, bold, align,
                        space_before, space_after, indent,
                        keep_next=True, italic=False):
    style.font.name         = FONT_NAME
    style.font.size         = size
    style.font.bold         = bold
    style.font.italic       = italic
    style.font.color.rgb    = None   # hitam auto

    fmt = style.paragraph_format
    fmt.alignment           = align
    fmt.space_before        = space_before
    fmt.space_after         = space_after
    fmt.line_spacing_rule   = WD_LINE_SPACING.ONE_POINT_FIVE
    fmt.first_line_indent   = Cm(0)
    fmt.left_indent         = indent
    fmt.keep_with_next      = keep_next


def _configure_toc_style(document, level: int):
    """
    TOC 1-4: indentasi hierarki, tab stop kanan dengan dot leader
    sesuai standar laporan PKL.

    TOC 1 (BAB)      : Bold, indent 0
    TOC 2 (Sub-bab)  : Normal, indent 0.5 cm
    TOC 3 (Anak sub) : Normal, indent 1.0 cm
    TOC 4 (Caption)  : Italic, indent 1.5 cm
    """
    from docx.enum.text import WD_TAB_ALIGNMENT, WD_TAB_LEADER

    style_name = f"TOC {level}"
    if style_name not in document.styles:
        document.styles.add_style(style_name, WD_STYLE_TYPE.PARAGRAPH)

    s = document.styles[style_name]
    s.font.name         = FONT_NAME
    s.font.size         = BODY_SIZE
    s.font.bold         = (level == 1)
    s.font.italic       = (level == 4)
    s.font.color.rgb    = None

    fmt = s.paragraph_format
    fmt.alignment           = WD_ALIGN_PARAGRAPH.LEFT
    fmt.space_before        = Pt(0)
    fmt.space_after         = Pt(2)
    fmt.line_spacing_rule   = WD_LINE_SPACING.ONE_POINT_FIVE
    fmt.first_line_indent   = Cm(0)
    fmt.left_indent         = Cm(0.5 * (level - 1))

    # Tab stop di 13.5 cm (sesuai TEXT_WIDTH_CM ≈ 14 cm) — titik-titik ke kanan
    fmt.tab_stops.add_tab_stop(
        Cm(13.5),
        alignment=WD_TAB_ALIGNMENT.RIGHT,
        leader=WD_TAB_LEADER.DOTS,
    )


def _ensure_pkl_styles(document):
    """Pastikan semua style PKL custom tersedia."""
    from docx.shared import RGBColor

    STYLES = {
        "PKL Body": {
            "size": BODY_SIZE, "bold": False,
            "align": WD_ALIGN_PARAGRAPH.JUSTIFY,
            "indent": 1.27, "spacing": WD_LINE_SPACING.ONE_POINT_FIVE,
        },
        "PKL List": {
            "size": BODY_SIZE, "bold": False,
            "align": WD_ALIGN_PARAGRAPH.JUSTIFY,
            "indent": 0, "spacing": WD_LINE_SPACING.ONE_POINT_FIVE,
        },
        "PKL Caption": {
            "size": CAPTION_SIZE, "italic": True,
            "align": WD_ALIGN_PARAGRAPH.CENTER,
            "indent": 0, "spacing": WD_LINE_SPACING.SINGLE,
        },
        "PKL Table Caption": {
            "size": CAPTION_SIZE, "bold": True,
            "align": WD_ALIGN_PARAGRAPH.CENTER,
            "indent": 0, "spacing": WD_LINE_SPACING.SINGLE,
        },
        "PKL Figure Caption": {
            "size": CAPTION_SIZE, "italic": True,
            "align": WD_ALIGN_PARAGRAPH.CENTER,
            "indent": 0, "spacing": WD_LINE_SPACING.SINGLE,
        },
        "PKL Signature": {
            "size": BODY_SIZE,
            "align": WD_ALIGN_PARAGRAPH.CENTER,
            "indent": 0, "spacing": WD_LINE_SPACING.ONE_POINT_FIVE,
        },
        "PKL Code": {
            "size": CODE_SIZE, "font": FONT_CODE,
            "align": WD_ALIGN_PARAGRAPH.LEFT,
            "indent": 0, "spacing": WD_LINE_SPACING.SINGLE,
        },
        "PKL Centered": {
            "size": BODY_SIZE,
            "align": WD_ALIGN_PARAGRAPH.CENTER,
            "indent": 0, "spacing": WD_LINE_SPACING.ONE_POINT_FIVE,
        },
    }

    for name, cfg in STYLES.items():
        if name in document.styles:
            s = document.styles[name]
        else:
            s = document.styles.add_style(name, WD_STYLE_TYPE.PARAGRAPH)

        font_name = cfg.get("font", FONT_NAME)
        s.font.name     = font_name
        s.font.size     = cfg.get("size", BODY_SIZE)
        s.font.bold     = cfg.get("bold", False)
        s.font.italic   = cfg.get("italic", False)
        s.font.color.rgb = None

        fmt = s.paragraph_format
        fmt.alignment         = cfg.get("align", WD_ALIGN_PARAGRAPH.JUSTIFY)
        fmt.first_line_indent = Cm(cfg.get("indent", 0))
        fmt.line_spacing_rule = cfg.get("spacing", WD_LINE_SPACING.ONE_POINT_FIVE)
        fmt.space_before      = Pt(0)
        fmt.space_after       = Pt(0)


# ─────────────────────────────────────────────────────────────
# APPLY HELPERS (dipakai oleh engine-engine lain)
# ─────────────────────────────────────────────────────────────
def apply_normal_style(paragraph):
    """Paragraf isi: justify, indent 1.27 cm, spasi 1.5."""
    paragraph.style = "PKL Body"
    fmt = paragraph.paragraph_format
    fmt.space_before        = Pt(0)
    fmt.space_after         = Pt(0)
    fmt.line_spacing_rule   = WD_LINE_SPACING.ONE_POINT_FIVE
    fmt.first_line_indent   = FIRST_LINE_INDENT
    fmt.left_indent         = Cm(0)
    fmt.right_indent        = Cm(0)
    paragraph.alignment     = WD_ALIGN_PARAGRAPH.JUSTIFY
    return paragraph


def apply_heading_style(paragraph, level: int = 1):
    """
    Terapkan style Heading native Word.
    Level 1: CENTER (BAB)
    Level 2: LEFT (Sub-Bab)
    Level 3: LEFT + indent 1 cm (Anak Sub-Bab)
    """
    paragraph.style = f"Heading {level}"
    fmt = paragraph.paragraph_format

    if level == 1:
        fmt.space_before        = Pt(0)
        fmt.space_after         = Pt(12)
        fmt.line_spacing_rule   = WD_LINE_SPACING.ONE_POINT_FIVE
        fmt.first_line_indent   = Cm(0)
        fmt.left_indent         = Cm(0)
        paragraph.alignment     = WD_ALIGN_PARAGRAPH.CENTER

    elif level == 2:
        fmt.space_before        = Pt(12)
        fmt.space_after         = Pt(6)
        fmt.line_spacing_rule   = WD_LINE_SPACING.ONE_POINT_FIVE
        fmt.first_line_indent   = Cm(0)
        fmt.left_indent         = Cm(0)
        paragraph.alignment     = WD_ALIGN_PARAGRAPH.LEFT

    elif level == 3:
        fmt.space_before        = Pt(6)
        fmt.space_after         = Pt(4)
        fmt.line_spacing_rule   = WD_LINE_SPACING.ONE_POINT_FIVE
        fmt.first_line_indent   = Cm(0)
        fmt.left_indent         = Cm(1.0)
        paragraph.alignment     = WD_ALIGN_PARAGRAPH.LEFT

    else:  # level 4+
        fmt.space_before        = Pt(3)
        fmt.space_after         = Pt(6)
        fmt.line_spacing_rule   = WD_LINE_SPACING.SINGLE
        fmt.first_line_indent   = Cm(0)
        fmt.left_indent         = Cm(0)
        paragraph.alignment     = WD_ALIGN_PARAGRAPH.CENTER

    return paragraph


def apply_subheading_style(paragraph, level: int = 2):
    return apply_heading_style(paragraph, level=level)


def apply_caption_style(paragraph):
    """Caption gambar: CENTER, italic, 11pt, spasi 1."""
    paragraph.style = "PKL Caption"
    fmt = paragraph.paragraph_format
    fmt.space_before        = Pt(3)
    fmt.space_after         = Pt(6)
    fmt.line_spacing_rule   = WD_LINE_SPACING.SINGLE
    fmt.first_line_indent   = Cm(0)
    fmt.left_indent         = Cm(0)
    paragraph.alignment     = WD_ALIGN_PARAGRAPH.CENTER
    return paragraph


def apply_table_caption_style(paragraph):
    """Caption tabel: CENTER, bold, 11pt — di ATAS tabel."""
    paragraph.style = "PKL Table Caption"
    fmt = paragraph.paragraph_format
    fmt.space_before        = Pt(6)
    fmt.space_after         = Pt(3)
    fmt.line_spacing_rule   = WD_LINE_SPACING.SINGLE
    fmt.first_line_indent   = Cm(0)
    paragraph.alignment     = WD_ALIGN_PARAGRAPH.CENTER
    return paragraph


def apply_signature_style(paragraph):
    """Baris center (cover, TTD, identitas): CENTER, no indent."""
    paragraph.style = "PKL Signature"
    fmt = paragraph.paragraph_format
    fmt.space_before        = Pt(0)
    fmt.space_after         = Pt(0)
    fmt.line_spacing_rule   = WD_LINE_SPACING.ONE_POINT_FIVE
    fmt.first_line_indent   = Cm(0)
    fmt.left_indent         = Cm(0)
    paragraph.alignment     = WD_ALIGN_PARAGRAPH.CENTER
    return paragraph


def apply_centered_style(paragraph):
    """Alias apply_signature_style."""
    return apply_signature_style(paragraph)


def apply_list_style(paragraph, level: int = 0):
    """
    Item list: justify, indent berjenjang.
    level=0 → indent 1.27 cm (sejajar teks paragraf)
    level=1 → indent 2.17 cm
    level=2 → indent 3.07 cm
    Hanging indent -0.75 cm agar label menjorok.
    """
    paragraph.style = "PKL List"
    fmt = paragraph.paragraph_format
    fmt.space_before        = Pt(0)
    fmt.space_after         = Pt(0)
    fmt.line_spacing_rule   = WD_LINE_SPACING.ONE_POINT_FIVE
    fmt.first_line_indent   = Cm(-0.75)
    fmt.left_indent         = Cm(1.27 + (level * 0.9))
    fmt.right_indent        = Cm(0)
    paragraph.alignment     = WD_ALIGN_PARAGRAPH.JUSTIFY
    return paragraph


def apply_code_style(paragraph):
    """Script / command line: Courier New 11pt, spasi 1, no indent."""
    paragraph.style = "PKL Code"
    fmt = paragraph.paragraph_format
    fmt.space_before        = Pt(2)
    fmt.space_after         = Pt(2)
    fmt.line_spacing_rule   = WD_LINE_SPACING.SINGLE
    fmt.first_line_indent   = Cm(0)
    fmt.left_indent         = Cm(1.27)
    paragraph.alignment     = WD_ALIGN_PARAGRAPH.LEFT
    return paragraph


def format_run(run, *, bold=False, italic=False, size=None, underline=False, code=False):
    font_name = FONT_CODE if code else FONT_NAME
    set_run_fonts(
        run,
        font_name=font_name,
        size=size or BODY_SIZE,
        bold=bold,
        italic=italic,
        underline=underline,
    )
    return run


def apply_table_cell_style(cell, font_size=None, bold=False, center=False):
    """Apply standar ke sel tabel: 11pt, spasi 1."""
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.shared import Pt as _Pt
    for para in cell.paragraphs:
        para.alignment = WD_ALIGN_PARAGRAPH.CENTER if center else WD_ALIGN_PARAGRAPH.LEFT
        fmt = para.paragraph_format
        fmt.space_before        = _Pt(2)
        fmt.space_after         = _Pt(2)
        fmt.line_spacing_rule   = WD_LINE_SPACING.SINGLE
        fmt.first_line_indent   = Cm(0)
        for run in para.runs:
            run.font.name = FONT_NAME
            run.font.size = font_size or _Pt(11)
            run.font.bold = bold
