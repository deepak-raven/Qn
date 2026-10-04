import os
import io
import re
import copy
import logging
import base64
import docx
import docx.oxml
import docx.oxml.ns
from docx.table import _Cell
from docx.shared import Pt, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls, qn
from typing import List, Dict, Any, Optional
from app.models import PaperConfig, Question

logger = logging.getLogger("app.generator")

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
W_PREFIX = f"{{{W_NS}}}"

TCPR_SCHEMA_ORDER = [
    'tcW', 'gridSpan', 'hMerge', 'vMerge', 'tcBorders', 'shd', 
    'noWrap', 'tcMar', 'textDirection', 'tcFitText', 'vAlign', 
    'hideMark', 'headers', 'cellIns', 'cellDel', 'cellMerge', 'tcPrChange'
]

TRPR_SCHEMA_ORDER = [
    'cnfStyle', 'divId', 'gridBefore', 'gridAfter', 'wBefore', 'wAfter', 
    'cantSplit', 'trHeight', 'tblHeader', 'tblCellSpacing', 'jc', 
    'hidden', 'ins', 'del', 'trPrChange'
]

PPR_SCHEMA_ORDER = [
    'pStyle', 'keepNext', 'keepLines', 'pageBreakBefore', 'framePr', 
    'widowControl', 'numPr', 'pBdr', 'shd', 'tabs', 'suppressAutoHyphens', 
    'kinsoku', 'wordWrap', 'overflowPunct', 'topLinePunct', 'autoSpaceDE', 
    'autoSpaceDN', 'bidi', 'adjustRightInd', 'snapToGrid', 'spacing', 
    'ind', 'contextualSpacing', 'mirrorIndents', 'suppressOverlap', 'jc', 
    'textDirection', 'textAlignment', 'textboxTightWrap', 'outlineLvl', 
    'divId', 'cnfStyle', 'rPr', 'sectPr', 'pPrChange'
]

TBLPR_SCHEMA_ORDER = [
    'tblStyle', 'tblpPr', 'tblOverlap', 'bidiVisual', 'tblStyleRowBandSize', 
    'tblStyleColBandSize', 'tblW', 'jc', 'tblCellSpacing', 'tblInd', 
    'tblBorders', 'shd', 'tblLayout', 'tblCellMar', 'tblLook', 
    'tblCaption', 'tblDescription', 'tblPrChange'
]

RPR_SCHEMA_ORDER = [
    'rStyle', 'rFonts', 'b', 'bCs', 'i', 'iCs', 'caps', 'smallCaps', 
    'strike', 'dstrike', 'outline', 'shadow', 'emboss', 'imprint', 
    'noProof', 'snapToGrid', 'vanish', 'webHidden', 'color', 'spacing', 
    'w', 'kern', 'position', 'sz', 'szCs', 'highlight', 'u', 'effect', 
    'bdr', 'shd', 'fitText', 'vertAlign', 'rtl', 'cs', 'em', 'lang', 
    'eastAsianLayout', 'specVanish', 'oMath', 'rPrChange'
]

SCHEMA_MAP = {
    f'{W_PREFIX}tcPr': TCPR_SCHEMA_ORDER,
    f'{W_PREFIX}trPr': TRPR_SCHEMA_ORDER,
    f'{W_PREFIX}pPr': PPR_SCHEMA_ORDER,
    f'{W_PREFIX}tblPr': TBLPR_SCHEMA_ORDER,
    f'{W_PREFIX}rPr': RPR_SCHEMA_ORDER,
}

def sanitize_document_ooxml(doc):
    """
    Ensures that all child elements of OpenXML property nodes (tcPr, trPr, pPr, tblPr, rPr)
    strictly conform to ECMA-376 (ISO/IEC 29500) sequence rules.
    This completely prevents 'unreadable content' or 'Unable to open file' errors in
    WPS Office and Microsoft Word.
    """
    root = doc._element
    for elem in root.iter():
        if elem.tag in SCHEMA_MAP:
            order = SCHEMA_MAP[elem.tag]
            children = list(elem)
            if not children:
                continue
            
            def get_order_key(child):
                local_tag = child.tag.replace(W_PREFIX, '')
                return order.index(local_tag) if local_tag in order else 999
            
            current_keys = [get_order_key(c) for c in children]
            if current_keys != sorted(current_keys):
                sorted_children = sorted(children, key=get_order_key)
                for c in children:
                    elem.remove(c)
                for c in sorted_children:
                    elem.append(c)

def get_row_cell(table, row_idx: int, tc_idx: int) -> Optional[_Cell]:
    if row_idx >= len(table.rows):
        return None
    row = table.rows[row_idx]
    tc_list = row._tr.xpath('./w:tc')
    if tc_idx < len(tc_list):
        return _Cell(tc_list[tc_idx], table)
    return None

def set_cell_border_edge(cell, edge: str, val: str = 'single', sz: str = '4', space: str = '0', color: str = 'auto'):
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = tcPr.find(docx.oxml.ns.qn('w:tcBorders'))
    if tcBorders is None:
        tcBorders = parse_xml(f'<w:tcBorders {nsdecls("w")}/>')
        tcPr.append(tcBorders)
    
    for child in list(tcBorders):
        if child.tag.endswith(edge) or child.tag.endswith(f":{edge}") or child.tag == edge:
            tcBorders.remove(child)
    
    b_elem = parse_xml(f'<w:{edge} {nsdecls("w")} w:val="{val}" w:sz="{sz}" w:space="{space}" w:color="{color}"/>')
    tcBorders.append(b_elem)

def normalize_unit(unit_str: str) -> str:
    if not unit_str:
        return "Unit I"
    u = unit_str.strip().upper()
    if "VI" in u or u == "UNIT 6" or u == "6":
        return "Unit VI"
    if "III" in u or u == "UNIT 3" or u == "3":
        return "Unit III"
    if "II" in u or u == "UNIT 2" or u == "2":
        return "Unit II"
    if "IV" in u or u == "UNIT 4" or u == "4":
        return "Unit IV"
    if "V" in u or u == "UNIT 5" or u == "5":
        return "Unit V"
    if "I" in u or u == "UNIT 1" or u == "1":
        return "Unit I"
    return "Unit I"

def normalize_kl(kl_str: str) -> str:
    if not kl_str:
        return "K1"
    k = kl_str.strip().upper()
    if "K1" in k or "REMEMBER" in k: return "K1"
    if "K2" in k or "UNDERSTAND" in k: return "K2"
    if "K3" in k or "APPLY" in k or "APPLI" in k: return "K3"
    if "K4" in k or "ANALY" in k: return "K4"
    if "K5" in k or "EVALUAT" in k: return "K5"
    if "K6" in k or "CREAT" in k: return "K6"
    digits = re.findall(r'\d', k)
    if digits and 1 <= int(digits[0]) <= 6:
        return f"K{digits[0]}"
    return "K1"

def get_q_field(q, field: str, default: str = "") -> str:
    if not q:
        return default
    if isinstance(q, dict):
        val = q.get(field)
    else:
        val = getattr(q, field, None)
    return str(val) if val is not None else default

def get_q_co(q, default_unit: str = "Unit I") -> str:
    if not q:
        return ""
    co = get_q_field(q, "co").strip()
    if co:
        return co
    u = normalize_unit(get_q_field(q, "unit", default_unit))
    unit_co_map = {
        "Unit I": "CO1",
        "Unit II": "CO2",
        "Unit III": "CO3",
        "Unit IV": "CO4",
        "Unit V": "CO5",
        "Unit VI": "CO6"
    }
    return unit_co_map.get(u, "CO1")

def get_q_kl(q, default: str = "") -> str:
    if not q:
        return default
    kl = get_q_field(q, "kl").strip()
    if kl:
        return normalize_kl(kl) or kl
    part = get_q_field(q, "part", "A").upper()
    marks = get_q_field(q, "marks", "1")
    if part == "A":
        return "K1"
    elif part == "B":
        return "K2" if str(marks) == "3" else "K3"
    elif part == "C":
        return "K4"
    return default or "K1"

def strip_leading_qnum(text: str) -> str:
    if not text:
        return ""
    text = clean_text_content(text)
    # Strip repeatedly if there are multiple prefixes e.g. "1. 1." or "Q1. (a)"
    for _ in range(3):
        prev = text
        text = re.sub(
            r'^(?:(?:Q(?:uestion)?\.?\s*\d*[\.\:\-\)]\s*)|(?:\(?\d{1,3}\s*[\.\)\-:]\s*)|(?:\([a-zA-Z]\)\s*)|(?:[a-zA-Z][\.\)\:]\s+))',
            '',
            text,
            flags=re.IGNORECASE
        ).strip()
        if text == prev:
            break
    return text

def get_q_text(q, default: str = "") -> str:
    raw = get_q_field(q, "text", default)
    return strip_leading_qnum(raw)

def clean_text_content(text: str) -> str:
    if not text:
        return ""
    text = str(text).replace('\r', '')
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    return "\n".join(lines)

def set_cell_text_preserve_style(
    cell, 
    text: str, 
    align: Optional[WD_ALIGN_PARAGRAPH] = None, 
    image_data: Optional[str] = None,
    font_size_pt: float = 11,
    bold: bool = False,
    space_before: float = 2.0,
    space_after: float = 2.0,
    line_spacing: float = 1.08
):
    """
    Clears the text in a cell while preserving its original cell borders,
    and applies standard uniform font size, line spacing, paragraph spacing,
    and vertical alignment.
    """
    while len(cell.paragraphs) > 1:
        p_elem = cell.paragraphs[-1]._p
        p_elem.getparent().remove(p_elem)

    if len(cell.paragraphs) == 0:
        p = cell.add_paragraph()
    else:
        p = cell.paragraphs[0]

    # Strip any automatic Word list numbering (numPr) and ListParagraph styling
    pPr = p._p.get_or_add_pPr()
    for child in list(pPr):
        if child.tag.endswith('numPr') or child.tag.endswith(':numPr') or child.tag == 'numPr':
            pPr.remove(child)
        if child.tag.endswith('pStyle') or child.tag.endswith(':pStyle') or child.tag == 'pStyle':
            pPr.remove(child)

    if align is not None:
        p.alignment = align

    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = line_spacing

    cleaned = clean_text_content(text)
    p.text = ""
    
    if "\n" in cleaned:
        lines = cleaned.split("\n")
        for idx, line in enumerate(lines):
            if idx > 0:
                p_extra = cell.add_paragraph()
                pPr_extra = p_extra._p.get_or_add_pPr()
                for child in list(pPr_extra):
                    if child.tag.endswith('numPr') or child.tag.endswith(':numPr') or child.tag == 'numPr':
                        pPr_extra.remove(child)
                    if child.tag.endswith('pStyle') or child.tag.endswith(':pStyle') or child.tag == 'pStyle':
                        pPr_extra.remove(child)
                if align is not None:
                    p_extra.alignment = align
                p_extra.paragraph_format.space_before = Pt(1.0)
                p_extra.paragraph_format.space_after = Pt(space_after if idx == len(lines) - 1 else 1.0)
                p_extra.paragraph_format.line_spacing = line_spacing
                run = p_extra.add_run(line)
            else:
                p.paragraph_format.space_after = Pt(1.0 if len(lines) > 1 else space_after)
                run = p.add_run(line)
            run.font.name = "Times New Roman"
            run.font.size = Pt(font_size_pt)
            run.bold = bold
    else:
        run = p.add_run(cleaned)
        run.font.name = "Times New Roman"
        run.font.size = Pt(font_size_pt)
        run.bold = bold

    # Remove individual cell margins and set vertical alignment to center in tcPr
    tcPr = cell._tc.get_or_add_tcPr()
    for child in list(tcPr):
        if child.tag.endswith('vAlign') or child.tag.endswith(':vAlign') or child.tag == 'vAlign':
            tcPr.remove(child)
        if child.tag.endswith('tcMar') or child.tag.endswith(':tcMar') or child.tag == 'tcMar':
            tcPr.remove(child)
    v_elem = parse_xml(f'<w:vAlign {nsdecls("w")} w:val="center"/>')
    tcPr.append(v_elem)

    if image_data:
        try:
            import base64
            raw_b64 = image_data.split(",")[-1] if "," in image_data else image_data
            img_bytes = base64.b64decode(raw_b64)
            p_img = cell.add_paragraph()
            p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_img.paragraph_format.space_before = Pt(3)
            p_img.paragraph_format.space_after = Pt(2)
            p_img.paragraph_format.line_spacing = 1.0
            run_img = p_img.add_run()
            run_img.add_picture(io.BytesIO(img_bytes), width=Inches(2.5))
        except Exception as img_err:
            logger.warning(f"Could not insert diagram into question cell: {img_err}")


def set_or_row(table, row_idx: int):
    """
    Sets '(OR)' in the Questions column only, and clears all other cells (Q.No, Sub, KL, CO)
    in the (OR) row, supporting both 4-cell (merged Sub+Questions gridSpan) and 5-cell layouts,
    without clearing the parent vMerge on the Q.No column.
    """
    if not table or row_idx >= len(table.rows):
        return
    row = table.rows[row_idx]
    tc_list = row._tr.xpath('./w:tc')
    if len(tc_list) == 4:
        # tc[0] is Q.No (vMerge continue), tc[1] is Sub+Questions (gridSpan 2), tc[2] is KL, tc[3] is CO
        c0 = _Cell(tc_list[0], table)
        for p in c0.paragraphs:
            p.text = ""
        set_cell_text_preserve_style(_Cell(tc_list[1], table), "(OR)", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
        set_cell_text_preserve_style(_Cell(tc_list[2], table), "", align=WD_ALIGN_PARAGRAPH.CENTER)
        set_cell_text_preserve_style(_Cell(tc_list[3], table), "", align=WD_ALIGN_PARAGRAPH.CENTER)
    elif len(tc_list) >= 5:
        # tc[0] is Q.No (vMerge continue or separate), tc[1] is Sub, tc[2] is Questions, tc[3] is KL, tc[4] is CO
        c0 = _Cell(tc_list[0], table)
        for p in c0.paragraphs:
            p.text = ""
        set_cell_text_preserve_style(_Cell(tc_list[1], table), "", align=WD_ALIGN_PARAGRAPH.CENTER)
        set_cell_text_preserve_style(_Cell(tc_list[2], table), "(OR)", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
        set_cell_text_preserve_style(_Cell(tc_list[3], table), "", align=WD_ALIGN_PARAGRAPH.CENTER)
        set_cell_text_preserve_style(_Cell(tc_list[4], table), "", align=WD_ALIGN_PARAGRAPH.CENTER)
    else:
        for i, c in enumerate(row.cells):
            if i == (1 if len(row.cells) == 4 else 2):
                set_cell_text_preserve_style(c, "(OR)", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
            else:
                set_cell_text_preserve_style(c, "", align=WD_ALIGN_PARAGRAPH.CENTER)


def standardize_question_table(table, col_type: str = "part_a"):
    """
    Standardizes row heights, cell vertical alignment, paragraph spacing,
    and column widths across all rows and cells in a Question table so that
    spacing is perfectly uniform across every question.
    """
    if not table or len(table.rows) == 0:
        return

    num_cols = len(table.columns)
    if num_cols == 4:
        col_widths_in = [0.70, 4.25, 0.65, 0.90]
    elif num_cols == 5:
        col_widths_in = [0.60, 0.45, 3.90, 0.65, 0.90]
    else:
        col_widths_in = None

    # 1. Standardize column widths with explicit tcW dxa values so Q.No header never breaks
    if col_widths_in:
        for row in table.rows:
            for i, w_val in enumerate(col_widths_in):
                if i < len(row.cells):
                    cell = row.cells[i]
                    cell.width = Inches(w_val)
                    tcPr = cell._tc.get_or_add_tcPr()
                    for child in list(tcPr):
                        if child.tag.endswith('tcW') or child.tag.endswith(':tcW') or child.tag == 'tcW':
                            tcPr.remove(child)
                    w_dxa = int(w_val * 1440)
                    tcW_elem = parse_xml(f'<w:tcW {nsdecls("w")} w:w="{w_dxa}" w:type="dxa"/>')
                    tcPr.insert(0, tcW_elem)

    # 2. Standardize row heights, cell vertical alignment & paragraph spacing
    for r_idx, row in enumerate(table.rows):
        trPr = row._tr.get_or_add_trPr()
        for child in list(trPr):
            if child.tag.endswith('trHeight') or child.tag.endswith(':trHeight') or child.tag == 'trHeight':
                trPr.remove(child)
            if child.tag.endswith('cantSplit') or child.tag.endswith(':cantSplit') or child.tag == 'cantSplit':
                trPr.remove(child)
        cs_elem = parse_xml(f'<w:cantSplit {nsdecls("w")}/>')
        trPr.append(cs_elem)
        h_elem = parse_xml(f'<w:trHeight {nsdecls("w")} w:val="260" w:hRule="atLeast"/>')
        trPr.append(h_elem)

        for c_idx, cell in enumerate(row.cells):
            tcPr = cell._tc.get_or_add_tcPr()
            for child in list(tcPr):
                if child.tag.endswith('tcMar') or child.tag.endswith(':tcMar') or child.tag == 'tcMar':
                    tcPr.remove(child)
                if child.tag.endswith('vAlign') or child.tag.endswith(':vAlign') or child.tag == 'vAlign':
                    tcPr.remove(child)
            v_elem = parse_xml(f'<w:vAlign {nsdecls("w")} w:val="center"/>')
            tcPr.append(v_elem)

            # Remove empty trailing paragraphs
            while len(cell.paragraphs) > 1 and not cell.paragraphs[-1].text.strip() and not cell.paragraphs[-1]._p.xpath('.//w:drawing'):
                p_elem = cell.paragraphs[-1]._p
                p_elem.getparent().remove(p_elem)

            for p in cell.paragraphs:
                pPr = p._p.get_or_add_pPr()
                for child in list(pPr):
                    if child.tag.endswith('numPr') or child.tag.endswith(':numPr') or child.tag == 'numPr':
                        pPr.remove(child)
                    if child.tag.endswith('pStyle') or child.tag.endswith(':pStyle') or child.tag == 'pStyle':
                        pPr.remove(child)
                p.paragraph_format.space_before = Pt(2.0)
                p.paragraph_format.space_after = Pt(2.0)
                p.paragraph_format.line_spacing = 1.08
                for r in p.runs:
                    r.font.name = "Times New Roman"
                    if r_idx == 0:
                        r.font.size = Pt(11)
                        r.bold = True
                    else:
                        r.font.size = Pt(11)


def clean_degree_branch(deg_input: str) -> str:
    if not deg_input:
        return "B.E/CSE"
    cleaned = re.sub(r'\s*/\s*(?:[I|V|X]+|\d+)\s*$', '', deg_input.strip(), flags=re.IGNORECASE)
    cleaned = cleaned.replace("BE/BTECH", "B.E").replace("BE / BTECH", "B.E")
    cleaned = re.sub(r'\s*/\s*', '/', cleaned)
    return cleaned if cleaned else "B.E/CSE"

ROMAN_YEAR_SEM = {
    1: ("I", "I"), 2: ("I", "II"), 3: ("II", "III"), 4: ("II", "IV"),
    5: ("III", "V"), 6: ("III", "VI"), 7: ("IV", "VII"), 8: ("IV", "VIII")
}
ROMAN_MAP = {8: "VIII", 7: "VII", 6: "VI", 5: "V", 4: "IV", 3: "III", 2: "II", 1: "I"}

def format_year_sem(sem_input: str, alt_input: str = "", subject_code: str = "") -> str:
    text = f"{sem_input or ''} {alt_input or ''}".upper()

    m = re.search(r'\b([I|V|X]+)\s*/\s*([I|V|X]+)\b', text)
    if m:
        return f"{m.group(1)} / {m.group(2)}"

    # Check explicit semester suffix in sem_input e.g. "B.E/CSE / V" or "B.E/CSE/5"
    m_sem = re.search(r'/\s*([I|V|X]+|\d)\b', sem_input or '', re.IGNORECASE)
    if m_sem:
        s_val = m_sem.group(1).upper()
        for num in range(8, 0, -1):
            if ROMAN_MAP[num] == s_val or str(num) == s_val:
                year_rom, sem_rom = ROMAN_YEAR_SEM[num]
                return f"{year_rom} / {sem_rom}"

    for num in range(8, 0, -1):
        rom = ROMAN_MAP[num]
        if re.search(rf'\b({rom}|SEM\s*{num}|SEM\s*{rom})\b', text):
            year_rom, sem_rom = ROMAN_YEAR_SEM[num]
            return f"{year_rom} / {sem_rom}"

    # Infer semester from Anna University subject code (e.g. CS3551 -> sem 5 -> III / V)
    if subject_code:
        digits = re.sub(r'\D', '', subject_code)
        if len(digits) >= 3:
            sem_digit = int(digits[1])
            if 1 <= sem_digit <= 8:
                year_rom, sem_rom = ROMAN_YEAR_SEM[sem_digit]
                return f"{year_rom} / {sem_rom}"

    if "EVEN" in text:
        return "II / IV"
    return "III / V"

def set_cell_bold_label_value(cell, label_bold: str, value_normal: str, font_size_pt: float = 11):
    if len(cell.paragraphs) == 0:
        cell.add_paragraph()
    p = cell.paragraphs[0]
    p.text = ""
    
    r1 = p.add_run(label_bold)
    r1.bold = True
    r1.font.name = "Times New Roman"
    r1.font.size = Pt(font_size_pt)
    
    if value_normal:
        r2 = p.add_run(f" {value_normal.strip()}")
        r2.bold = False
        r2.font.name = "Times New Roman"
        r2.font.size = Pt(font_size_pt)

def replace_text_runs(doc, old_text: str, new_text: str):
    if not old_text:
        return
    if old_text == new_text:
        return
        
    def replace_in_paragraph(paragraph, old, new):
        if old not in paragraph.text:
            return
        
        search_start = 0
        while True:
            runs = paragraph.runs
            text = "".join(run.text for run in runs)
            start_idx = text.find(old, search_start)
            if start_idx == -1:
                break
                
            end_idx = start_idx + len(old)
            
            current_len = 0
            start_run_idx = -1
            start_run_offset = -1
            end_run_idx = -1
            end_run_offset = -1
            
            for i, run in enumerate(runs):
                run_len = len(run.text)
                if start_run_idx == -1 and current_len <= start_idx < current_len + run_len:
                    start_run_idx = i
                    start_run_offset = start_idx - current_len
                if current_len <= end_idx <= current_len + run_len:
                    end_run_idx = i
                    end_run_offset = end_idx - current_len
                    break
                current_len += run_len
                
            if start_run_idx != -1 and end_run_idx != -1:
                if start_run_idx == end_run_idx:
                    run = runs[start_run_idx]
                    run.text = run.text[:start_run_offset] + new + run.text[end_run_offset:]
                else:
                    start_run = runs[start_run_idx]
                    start_run.text = start_run.text[:start_run_offset] + new
                    
                    for r_idx in range(start_run_idx + 1, end_run_idx):
                        runs[r_idx].text = ""
                        
                    end_run = runs[end_run_idx]
                    end_run.text = end_run.text[end_run_offset:]
                
                search_start = start_idx + len(new)
            else:
                break

    for p in doc.paragraphs:
        replace_in_paragraph(p, old_text, new_text)
                
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    replace_in_paragraph(p, old_text, new_text)

def replace_set_placeholder(doc, target_set: str):
    if not target_set:
        return
    pattern = re.compile(r'\bSET\s*[\u2013\u2014\-–]?\s*(?:I{1,3}|IV|V|VI|VII|\d+)\b', re.IGNORECASE)
    for p in doc.paragraphs:
        matches = pattern.findall(p.text)
        for match_str in set(matches):
            replace_text_runs(doc, match_str, target_set)
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    matches = pattern.findall(p.text)
                    for match_str in set(matches):
                        replace_text_runs(doc, match_str, target_set)

def replace_exam_title_placeholder(doc, exam_title: str):
    if not exam_title:
        return
    pattern = re.compile(r'CONTINUOUS ASSESSMENT TEST\s*[\u2013\u2014\-–]?\s*(?:I{1,3}|IV|V|VI|VII|\d+)', re.IGNORECASE)
    for p in doc.paragraphs:
        m = pattern.search(p.text)
        if m:
            replace_text_runs(doc, m.group(0), exam_title)
    for table in doc.tables:
        for row in table.rows:
            for cell in row.cells:
                for p in cell.paragraphs:
                    m = pattern.search(p.text)
                    if m:
                        replace_text_runs(doc, m.group(0), exam_title)

def remove_table_rows(table, start_row_idx: int):
    """
    Safely removes rows from start_row_idx to the end of the table.
    """
    for row_idx in range(len(table.rows) - 1, start_row_idx - 1, -1):
        tr = table.rows[row_idx]._tr
        tr.getparent().remove(tr)

LEGACY_INSTITUTION_NAMES = {
    "NAME OF THE INSTITUTION:",
    "NAME OF THE INSTITUTION",
    "NAME OF THE INSTUTION:",
    "NAME OF THE INSTUTION",
    "JAYA ENGINEERING COLLEGE",
    "JAYA EDUCATIONAL TRUST",
    ""
}

def _populate_exam_header_and_course(doc, config: PaperConfig, default_exam_title: str = "CONTINUOUS ASSESSMENT TEST - I", is_model: bool = False):
    cat_titles = [
        "CONTINUOUS ASSESSMENT TEST-I", "CONTINUOUS ASSESSMENT TEST-II", "CONTINUOUS ASSESSMENT TEST-III",
        "CONTINUOUS ASSESSMENT TEST - I", "CONTINUOUS ASSESSMENT TEST - II", "CONTINUOUS ASSESSMENT TEST - III",
        "CONTINUOUS ASSESSMENT TEST -1", "CONTINUOUS ASSESSMENT TEST -2", "CONTINUOUS ASSESSMENT TEST -3",
        "CONTINUOUS ASSESSMENT TEST- 1", "CONTINUOUS ASSESSMENT TEST- 2", "CONTINUOUS ASSESSMENT TEST- 3",
        "CONTINUOUS ASSESSMENT TEST- I", "CONTINUOUS ASSESSMENT TEST- II", "CONTINUOUS ASSESSMENT TEST- III",
        "CAT-1", "CAT-2", "CAT-3", "IAT-1", "IAT-2", "IAT-3"
    ]
    if not config.exam_name or config.exam_name.strip() in cat_titles:
        exam_title = default_exam_title
    else:
        exam_title = config.exam_name
    replace_exam_title_placeholder(doc, exam_title)
    
    if config.set:
        replace_set_placeholder(doc, config.set)
        
    is_2025 = bool(config.regulation and "2025" in config.regulation)
    reg_str = ""
    if config.regulation:
        reg_str = f"({config.regulation}-REGULATION)" if "REGULATION" not in config.regulation.upper() else config.regulation
        replace_text_runs(doc, "2021-REGULATION", reg_str)
        replace_text_runs(doc, "2025-REGULATION", reg_str)

    # Dynamically locate Header Table and Course Details Table
    t_header = None
    t_course = None
    for t in doc.tables[:3]:
        txt = " ".join(c.text.strip() for row in t.rows for c in row.cells).upper()
        if ("SUB. CODE" in txt or "DEGREE / BRANCH" in txt or "DEGREE/BRANCH" in txt) and t_course is None:
            t_course = t
        elif ("NAME OF THE INSTITUTION" in txt or "CONTINUOUS ASSESSMENT TEST" in txt or "MODEL EXAMINATION" in txt or "DATE/\nSESSION" in txt or "DATE / SESSION" in txt or "PAGES" in txt or "COPIES" in txt) and t_header is None:
            t_header = t

    if t_header is None and len(doc.tables) > 0:
        t_header = doc.tables[0]
    if t_course is None and len(doc.tables) > 1:
        t_course = doc.tables[1]

    # Header / Date & Session Table
    if t_header and len(t_header.rows) >= 4:
        if config.institution_name and config.institution_name.strip().upper() not in LEGACY_INSTITUTION_NAMES:
            replace_text_runs(doc, "NAME OF THE INSTITUTION :", config.institution_name.upper())
            replace_text_runs(doc, "NAME OF THE INSTITUTION:", config.institution_name.upper())

        if len(t_header.rows) >= 5:
            # Row 1: Title & DATE/SESSION & Date value
            tcs1 = t_header.rows[1]._tr.xpath('./w:tc')
            if len(tcs1) >= 3:
                c_title = _Cell(tcs1[0], t_header)
                c_title.text = ""
                p = c_title.paragraphs[0]
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                r = p.add_run(exam_title)
                r.bold = True
                r.underline = True
                r.font.name = "Times New Roman"
                r.font.size = Pt(14)
                
                c_date = _Cell(tcs1[2], t_header)
                c_date.text = ""
                date_clean = (config.date or "").replace("_", "").strip()
                if date_clean:
                    p = c_date.paragraphs[0]
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    r = p.add_run(date_clean)
                    r.font.name = "Times New Roman"
                    r.font.size = Pt(12)

            # Row 2: Session value
            tcs2 = t_header.rows[2]._tr.xpath('./w:tc')
            if len(tcs2) >= 3:
                c_sess = _Cell(tcs2[2], t_header)
                c_sess.text = ""
                sess_clean = (config.session or "").replace("_", "").strip()
                if sess_clean:
                    p = c_sess.paragraphs[0]
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    r = p.add_run(sess_clean)
                    r.font.name = "Times New Roman"
                    r.font.size = Pt(12)

            # Row 3: Regulation & PAGES
            tcs3 = t_header.rows[3]._tr.xpath('./w:tc')
            if len(tcs3) >= 3:
                c_reg = _Cell(tcs3[0], t_header)
                c_reg.text = ""
                p = c_reg.paragraphs[0]
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                reg_text = reg_str if reg_str else ("(2025-REGULATION)" if is_2025 else "(2021-REGULATION)")
                if not reg_text.startswith("("):
                    reg_text = f"({reg_text})"
                r = p.add_run(reg_text)
                r.font.name = "Times New Roman"
                r.font.size = Pt(14)

            # Row 4: Semester & COPIES
            tcs4 = t_header.rows[4]._tr.xpath('./w:tc')
            if len(tcs4) >= 3:
                c_sem = _Cell(tcs4[0], t_header)
                c_sem.text = ""
                p = c_sem.paragraphs[0]
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                sem_text = config.semester.strip() if (config.semester and not re.match(r'^[IVX\s/]+$', config.semester.strip(), re.I)) else "ODD SEMESTER 2026-27"
                r = p.add_run(sem_text)
                r.font.name = "Times New Roman"
                r.font.size = Pt(14)

        elif len(t_header.rows) == 4:
            # 4-row layout (CAT-2)
            tcs1 = t_header.rows[1]._tr.xpath('./w:tc')
            if len(tcs1) >= 3:
                c_title = _Cell(tcs1[0], t_header)
                c_title.text = ""
                p = c_title.paragraphs[0]
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                r = p.add_run(exam_title)
                r.bold = True
                r.underline = True
                r.font.name = "Times New Roman"
                r.font.size = Pt(14)

                c_date = _Cell(tcs1[2], t_header)
                c_date.text = ""
                date_clean = (config.date or "").replace("_", "").strip()
                if date_clean:
                    p = c_date.paragraphs[0]
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    r = p.add_run(date_clean)
                    r.font.name = "Times New Roman"
                    r.font.size = Pt(12)

            tcs2 = t_header.rows[2]._tr.xpath('./w:tc')
            if len(tcs2) >= 3:
                c_reg = _Cell(tcs2[0], t_header)
                c_reg.text = ""
                p = c_reg.paragraphs[0]
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                reg_text = reg_str if reg_str else ("(2025-REGULATION)" if is_2025 else "(2021-REGULATION)")
                if not reg_text.startswith("("):
                    reg_text = f"({reg_text})"
                r = p.add_run(reg_text)
                r.font.name = "Times New Roman"
                r.font.size = Pt(14)

            tcs3 = t_header.rows[3]._tr.xpath('./w:tc')
            if len(tcs3) >= 3:
                c_sem = _Cell(tcs3[0], t_header)
                c_sem.text = ""
                p = c_sem.paragraphs[0]
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                sem_text = config.semester.strip() if (config.semester and not re.match(r'^[IVX\s/]+$', config.semester.strip(), re.I)) else "ODD SEMESTER 2026-27"
                r = p.add_run(sem_text)
                r.font.name = "Times New Roman"
                r.font.size = Pt(14)

    # Course & Exam Info Box (Table 1)
    if t_course:
        sub_code = (config.subject_code or "").strip()
        sub_name = (config.subject_name or "").strip()
        sub_name = re.sub(r'\s*-\s*\d+\s*units?\b', '', sub_name, flags=re.IGNORECASE).strip()

        if sub_code and sub_name:
            sub_val = f"{sub_code} – {sub_name}"
        elif sub_code:
            sub_val = sub_code
        elif sub_name:
            sub_val = sub_name
        else:
            sub_val = ""

        if len(t_course.rows) > 0 and len(t_course.rows[0].cells) > 0:
            set_cell_bold_label_value(t_course.rows[0].cells[0], "Sub. Code / Sub. Name  :", sub_val)
            if len(t_course.rows[0].cells) > 1:
                set_cell_bold_label_value(t_course.rows[0].cells[1], "Sub. Code / Sub. Name  :", sub_val)
            
        deg_branch = clean_degree_branch(config.degree_branch_sem)
        if len(t_course.rows) > 1 and len(t_course.rows[1].cells) > 0:
            set_cell_bold_label_value(t_course.rows[1].cells[0], "Degree / Branch:", deg_branch)
            
        sem_val = format_year_sem(config.degree_branch_sem, config.semester, config.subject_code)
        if len(t_course.rows) > 1 and len(t_course.rows[1].cells) > 1:
            set_cell_bold_label_value(t_course.rows[1].cells[1], "Year / Semester:", sem_val)
            
        default_time = "3 Hours" if is_model else "90 Minutes"
        time_val = (config.time or "").strip() or default_time
        if is_model and not time_val:
            time_val = "3 Hours"
        if len(t_course.rows) > 2 and len(t_course.rows[2].cells) > 0:
            set_cell_bold_label_value(t_course.rows[2].cells[0], "Time:", time_val)
            
        default_marks = "100" if is_model else "50"
        marks_val = str(config.max_marks) if config.max_marks else default_marks
        if len(t_course.rows) > 2 and len(t_course.rows[2].cells) > 1:
            set_cell_bold_label_value(t_course.rows[2].cells[1], "Maximum Marks:", marks_val)


def _generate_cat_paper(
    doc, 
    config: PaperConfig, 
    part_a: List[Question], 
    part_b: List[List[Question]], 
    part_c: List[Question]
):
    # 1. Populate Header & Course Metadata
    _populate_exam_header_and_course(doc, config, "CONTINUOUS ASSESSMENT TEST - I", is_model=False)

    # 2. Find Question Tables (Part A, Part B, Part C) dynamically
    q_tables = []
    for t in doc.tables:
        if len(t.rows) > 0 and len(t.rows[0].cells) in [4, 5, 7]:
            header = " ".join(c.text.strip() for c in t.rows[0].cells).upper()
            if "Q.NO" in header and ("QUESTION" in header or "QUESTIONS" in header):
                q_tables.append(t)

    t_part_a = q_tables[0] if len(q_tables) > 0 else (doc.tables[3] if len(doc.tables) > 3 else None)
    t_part_b = q_tables[1] if len(q_tables) > 1 else (doc.tables[4] if len(doc.tables) > 4 else None)
    t_part_c = q_tables[2] if len(q_tables) > 2 else (doc.tables[5] if len(doc.tables) > 5 else None)

    # Determine CAT layout and target units dynamically
    is_cat3 = config.exam_type in ["CAT-3", "IAT-3"]
    is_cat2 = config.exam_type in ["CAT-2", "IAT-2"]
    is_2025_cat_layout = False
    if t_part_b and len(t_part_b.rows) > 0 and len(t_part_b.rows[0].cells) == 4:
        is_2025_cat_layout = True
    is_2025 = ("2025" in config.regulation) if config.regulation else is_2025_cat_layout

    for p in doc.paragraphs:
        p_txt = p.text.upper()
        if is_2025:
            if "PART" in p_txt or "MARKS" in p_txt:
                if ("1" in p_txt and "5" in p_txt) and ("3" not in p_txt and "10" not in p_txt and "15" not in p_txt and "30" not in p_txt):
                    p.text = "PART – A (5 x 1 = 5 Marks)"
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    p.paragraph_format.space_before = Pt(4)
                    p.paragraph_format.space_after = Pt(2)
                    for r in p.runs:
                        r.font.name = "Times New Roman"
                        r.font.size = Pt(13)
                        r.bold = True
                elif ("3" in p_txt and "15" in p_txt) or ("5 X 3" in p_txt):
                    p.text = "PART – A (5 x 3 = 15 Marks)"
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    p.paragraph_format.space_before = Pt(4)
                    p.paragraph_format.space_after = Pt(2)
                    for r in p.runs:
                        r.font.name = "Times New Roman"
                        r.font.size = Pt(13)
                        r.bold = True
                elif ("10" in p_txt and "30" in p_txt) or ("3 X 10" in p_txt) or (re.search(r'\bPART\s*[\u2013\u2014\-–]?\s*[BC]\b', p_txt) and ("MARK" in p_txt or "=" in p_txt)):
                    p.text = "PART – B (3 x 10 = 30 Marks)"
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    p.paragraph_format.page_break_before = True
                    p.paragraph_format.space_before = Pt(4)
                    p.paragraph_format.space_after = Pt(2)
                    for r in p.runs:
                        r.font.name = "Times New Roman"
                        r.font.size = Pt(13)
                        r.bold = True
        else:
            # 2021 Regulation CAT: Part B starts on page 2
            if ("PART" in p_txt and "B" in p_txt) or ("2 X 13" in p_txt) or ("26 MARKS" in p_txt):
                p.paragraph_format.page_break_before = True
                p.paragraph_format.space_before = Pt(4)
                p.paragraph_format.space_after = Pt(2)

        # For both 2025 and 2021 CAT: Table of Specifications starts on page 3
        if "TABLE OF SPECIFICATIONS" in p_txt and ("QUESTION" in p_txt or ("WISE" in p_txt and "MARKS" not in p_txt) or "SYLLABUS" in p_txt):
            p.paragraph_format.page_break_before = True
            p.paragraph_format.space_before = Pt(4)
            p.paragraph_format.space_after = Pt(2)
        elif "TABLE OF SPECIFICATIONS" in p_txt and "MARKS" in p_txt:
            p.paragraph_format.page_break_before = False
            p.paragraph_format.space_before = Pt(4)
            p.paragraph_format.space_after = Pt(2)
        elif "QB APPROVED BY HOD" in p_txt:
            p.paragraph_format.page_break_before = False
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)

    total_units = getattr(config, "total_units", 5) or 5
    if isinstance(total_units, str) and total_units.isdigit():
        total_units = int(total_units)
    elif not isinstance(total_units, int):
        total_units = 5

    if is_2025:
        if total_units == 4:
            if is_cat3:
                target_units = ["Unit IV"]
                unit_labels = ["IV"]
            elif is_cat2:
                target_units = ["Unit II", "Unit III"]
                unit_labels = ["II", "III"]
            else:
                target_units = ["Unit I", "Unit II"]
                unit_labels = ["I", "II"]
        elif total_units == 6:
            if is_cat3:
                target_units = ["Unit V", "Unit VI"]
                unit_labels = ["V", "VI"]
            elif is_cat2:
                target_units = ["Unit III", "Unit IV"]
                unit_labels = ["III", "IV"]
            else:
                target_units = ["Unit I", "Unit II"]
                unit_labels = ["I", "II"]
        else:
            # 5 units (standard)
            if is_cat3:
                target_units = ["Unit IV", "Unit V"]
                unit_labels = ["IV", "V"]
            elif is_cat2:
                target_units = ["Unit II", "Unit III"]
                unit_labels = ["II", "III"]
            else:
                target_units = ["Unit I", "Unit II"]
                unit_labels = ["I", "II"]
    else:
        if is_cat3:
            target_units = ["Unit IV", "Unit V"]
            unit_labels = ["IV", "V"]
        elif is_cat2:
            target_units = ["Unit II", "Unit III"]
            unit_labels = ["II", "III"]
        else:
            target_units = ["Unit I", "Unit II"]
            unit_labels = ["I", "II"]

    # 2. Part A
    if t_part_a:
        if len(t_part_a.rows) > 0 and len(t_part_a.rows[0].cells) >= 4:
            set_cell_text_preserve_style(t_part_a.rows[0].cells[0], "Q.No.", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
            set_cell_text_preserve_style(t_part_a.rows[0].cells[1], "Questions", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
            set_cell_text_preserve_style(t_part_a.rows[0].cells[2], "KL", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
            set_cell_text_preserve_style(t_part_a.rows[0].cells[3], "CO Attainment" if "ATTAINMENT" in t_part_a.rows[0].cells[3].text.upper() else "CO", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)

        for idx, q in enumerate(part_a[:5]):
            row_idx = 1 + idx
            if len(target_units) == 1:
                default_u = target_units[0]
            elif is_cat2 and total_units in [4, 5]:
                default_u = target_units[0] if idx < 2 else target_units[1]
            else:
                default_u = target_units[0] if idx < 3 else target_units[1]
            if row_idx < len(t_part_a.rows):
                if len(t_part_a.rows[row_idx].cells) > 0:
                    set_cell_text_preserve_style(t_part_a.rows[row_idx].cells[0], f"{idx + 1}.", align=WD_ALIGN_PARAGRAPH.CENTER)
                if len(t_part_a.rows[row_idx].cells) > 1:
                    set_cell_text_preserve_style(t_part_a.rows[row_idx].cells[1], get_q_text(q), image_data=get_q_field(q, "image_data"))
                if len(t_part_a.rows[row_idx].cells) > 2:
                    set_cell_text_preserve_style(t_part_a.rows[row_idx].cells[2], get_q_kl(q), align=WD_ALIGN_PARAGRAPH.CENTER)
                if len(t_part_a.rows[row_idx].cells) > 3:
                    set_cell_text_preserve_style(t_part_a.rows[row_idx].cells[3], get_q_co(q, default_u), align=WD_ALIGN_PARAGRAPH.CENTER)

    # 3. Part B & Part C based on template table structure
    if is_2025_cat_layout and t_part_b:
        # 2025 Regulation: Part B (Q6..Q10 short questions)
        if len(t_part_b.rows) > 0 and len(t_part_b.rows[0].cells) >= 4:
            set_cell_text_preserve_style(t_part_b.rows[0].cells[0], "Q.No.", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
            set_cell_text_preserve_style(t_part_b.rows[0].cells[1], "Questions", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
            set_cell_text_preserve_style(t_part_b.rows[0].cells[2], "KL", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
            set_cell_text_preserve_style(t_part_b.rows[0].cells[3], "CO Attainment" if "ATTAINMENT" in t_part_b.rows[0].cells[3].text.upper() else "CO", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)

        for idx in range(5):
            q = part_b[idx] if idx < len(part_b) else None
            if isinstance(q, (list, tuple)) and len(q) > 0:
                q = q[0]
            row_idx = 1 + idx
            if len(target_units) == 1:
                default_u = target_units[0]
            elif is_cat2 and total_units in [4, 5]:
                default_u = target_units[0] if idx < 2 else target_units[1]
            else:
                default_u = target_units[0] if idx < 3 else target_units[1]
            if row_idx < len(t_part_b.rows):
                if len(t_part_b.rows[row_idx].cells) > 0:
                    set_cell_text_preserve_style(t_part_b.rows[row_idx].cells[0], f"{6 + idx}.", align=WD_ALIGN_PARAGRAPH.CENTER)
                if len(t_part_b.rows[row_idx].cells) > 1:
                    set_cell_text_preserve_style(t_part_b.rows[row_idx].cells[1], get_q_text(q), image_data=get_q_field(q, "image_data"))
                if len(t_part_b.rows[row_idx].cells) > 2:
                    set_cell_text_preserve_style(t_part_b.rows[row_idx].cells[2], get_q_kl(q), align=WD_ALIGN_PARAGRAPH.CENTER)
                if len(t_part_b.rows[row_idx].cells) > 3:
                    set_cell_text_preserve_style(t_part_b.rows[row_idx].cells[3], get_q_co(q, default_u), align=WD_ALIGN_PARAGRAPH.CENTER)

        # 2025 Regulation: Part C (Q11a/11b, Q12a/12b, Q13a/13b)
        if t_part_c:
            pair_rows_c = [(1, 3), (4, 6), (7, 9)]
            for p_idx in range(3):
                pair = part_c[p_idx] if p_idx < len(part_c) else None
                row_a_idx, row_b_idx = pair_rows_c[p_idx]
                row_or_idx = row_a_idx + 1
                if len(target_units) == 1:
                    default_u = target_units[0]
                elif is_cat2 and total_units in [4, 5]:
                    default_u = target_units[0] if p_idx < 1 else target_units[1]
                else:
                    default_u = target_units[0] if p_idx < 2 else target_units[1]

                q_a = pair[0] if isinstance(pair, (list, tuple)) and len(pair) > 0 else (pair.get('a') if isinstance(pair, dict) else (pair if p_idx == 0 and not isinstance(pair, (list, tuple, dict)) else None))
                q_b = pair[1] if isinstance(pair, (list, tuple)) and len(pair) > 1 else (pair.get('b') if isinstance(pair, dict) else None)

                if row_a_idx < len(t_part_c.rows):
                    r_a = t_part_c.rows[row_a_idx]
                    if len(r_a.cells) > 0:
                        set_cell_text_preserve_style(r_a.cells[0], f"{11 + p_idx}.", align=WD_ALIGN_PARAGRAPH.CENTER)
                    if len(r_a.cells) > 1:
                        set_cell_text_preserve_style(r_a.cells[1], "(a)", align=WD_ALIGN_PARAGRAPH.CENTER)
                    if len(r_a.cells) > 2:
                        set_cell_text_preserve_style(r_a.cells[2], get_q_text(q_a), image_data=get_q_field(q_a, "image_data"))
                    if len(r_a.cells) > 3:
                        set_cell_text_preserve_style(r_a.cells[3], get_q_kl(q_a), align=WD_ALIGN_PARAGRAPH.CENTER)
                    if len(r_a.cells) > 4:
                        set_cell_text_preserve_style(r_a.cells[4], get_q_co(q_a, default_u), align=WD_ALIGN_PARAGRAPH.CENTER)

                if row_or_idx < len(t_part_c.rows):
                    set_or_row(t_part_c, row_or_idx)

                if row_b_idx < len(t_part_c.rows):
                    r_b = t_part_c.rows[row_b_idx]
                    if len(r_b.cells) > 1:
                        set_cell_text_preserve_style(r_b.cells[1], "(b)", align=WD_ALIGN_PARAGRAPH.CENTER)
                    if len(r_b.cells) > 2:
                        set_cell_text_preserve_style(r_b.cells[2], get_q_text(q_b), image_data=get_q_field(q_b, "image_data"))
                    if len(r_b.cells) > 3:
                        set_cell_text_preserve_style(r_b.cells[3], get_q_kl(q_b), align=WD_ALIGN_PARAGRAPH.CENTER)
                    if len(r_b.cells) > 4:
                        set_cell_text_preserve_style(r_b.cells[4], get_q_co(q_b, default_u), align=WD_ALIGN_PARAGRAPH.CENTER)

    else:
        # 2021 Regulation: Part B (Either-Or pairs Q6a/b, Q7a/b)
        if t_part_b:
            pair_rows = [(1, 3), (4, 6)]
            for idx in range(2):
                pair = part_b[idx] if idx < len(part_b) else None
                row_a_idx, row_b_idx = pair_rows[idx]
                row_or_idx = row_a_idx + 1
                pair_default_u = target_units[idx] if idx < len(target_units) else "Unit I"
                q_a = pair[0] if isinstance(pair, (list, tuple)) and len(pair) > 0 else (pair.get('a') if isinstance(pair, dict) else None)
                q_b = pair[1] if isinstance(pair, (list, tuple)) and len(pair) > 1 else (pair.get('b') if isinstance(pair, dict) else None)

                if row_a_idx < len(t_part_b.rows):
                    r_a_tcs = t_part_b.rows[row_a_idx]._tr.xpath('./w:tc')
                    if len(r_a_tcs) >= 5:
                        set_cell_text_preserve_style(_Cell(r_a_tcs[0], t_part_b), f"{6 + idx}.", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
                        set_cell_text_preserve_style(_Cell(r_a_tcs[1], t_part_b), "(a)", align=WD_ALIGN_PARAGRAPH.CENTER)
                        set_cell_text_preserve_style(_Cell(r_a_tcs[2], t_part_b), get_q_text(q_a), image_data=get_q_field(q_a, "image_data"))
                        set_cell_text_preserve_style(_Cell(r_a_tcs[3], t_part_b), get_q_kl(q_a), align=WD_ALIGN_PARAGRAPH.CENTER)
                        set_cell_text_preserve_style(_Cell(r_a_tcs[4], t_part_b), get_q_co(q_a, pair_default_u), align=WD_ALIGN_PARAGRAPH.CENTER)
                    elif len(r_a_tcs) == 4:
                        set_cell_text_preserve_style(_Cell(r_a_tcs[0], t_part_b), f"{6 + idx}. (a)", align=WD_ALIGN_PARAGRAPH.CENTER)
                        set_cell_text_preserve_style(_Cell(r_a_tcs[1], t_part_b), get_q_text(q_a), image_data=get_q_field(q_a, "image_data"))
                        set_cell_text_preserve_style(_Cell(r_a_tcs[2], t_part_b), get_q_kl(q_a), align=WD_ALIGN_PARAGRAPH.CENTER)
                        set_cell_text_preserve_style(_Cell(r_a_tcs[3], t_part_b), get_q_co(q_a, pair_default_u), align=WD_ALIGN_PARAGRAPH.CENTER)

                if row_or_idx < len(t_part_b.rows):
                    set_or_row(t_part_b, row_or_idx)

                if row_b_idx < len(t_part_b.rows):
                    r_b_tcs = t_part_b.rows[row_b_idx]._tr.xpath('./w:tc')
                    if len(r_b_tcs) >= 5:
                        c0 = _Cell(r_b_tcs[0], t_part_b)
                        for p in c0.paragraphs:
                            p.text = ""
                        set_cell_text_preserve_style(_Cell(r_b_tcs[1], t_part_b), "(b)", align=WD_ALIGN_PARAGRAPH.CENTER)
                        set_cell_text_preserve_style(_Cell(r_b_tcs[2], t_part_b), get_q_text(q_b), image_data=get_q_field(q_b, "image_data"))
                        set_cell_text_preserve_style(_Cell(r_b_tcs[3], t_part_b), get_q_kl(q_b), align=WD_ALIGN_PARAGRAPH.CENTER)
                        set_cell_text_preserve_style(_Cell(r_b_tcs[4], t_part_b), get_q_co(q_b, pair_default_u), align=WD_ALIGN_PARAGRAPH.CENTER)
                    elif len(r_b_tcs) == 4:
                        set_cell_text_preserve_style(_Cell(r_b_tcs[0], t_part_b), "(b)", align=WD_ALIGN_PARAGRAPH.CENTER)
                        set_cell_text_preserve_style(_Cell(r_b_tcs[1], t_part_b), get_q_text(q_b), image_data=get_q_field(q_b, "image_data"))
                        set_cell_text_preserve_style(_Cell(r_b_tcs[2], t_part_b), get_q_kl(q_b), align=WD_ALIGN_PARAGRAPH.CENTER)
                        set_cell_text_preserve_style(_Cell(r_b_tcs[3], t_part_b), get_q_co(q_b, pair_default_u), align=WD_ALIGN_PARAGRAPH.CENTER)

        # 2021 Regulation: Part C (Either-Or pair Q8a/b in Table Part C)
        if t_part_c:
            pair = part_c[0] if len(part_c) > 0 else None
            q_a = pair[0] if isinstance(pair, (list, tuple)) and len(pair) > 0 else (pair.get('a') if isinstance(pair, dict) else None)
            q_b = pair[1] if isinstance(pair, (list, tuple)) and len(pair) > 1 else (pair.get('b') if isinstance(pair, dict) else None)

            if len(t_part_c.rows) > 1:
                r_a_tcs = t_part_c.rows[1]._tr.xpath('./w:tc')
                if len(r_a_tcs) >= 5:
                    set_cell_text_preserve_style(_Cell(r_a_tcs[0], t_part_c), "8.", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
                    set_cell_text_preserve_style(_Cell(r_a_tcs[1], t_part_c), "(a)", align=WD_ALIGN_PARAGRAPH.CENTER)
                    set_cell_text_preserve_style(_Cell(r_a_tcs[2], t_part_c), get_q_text(q_a), image_data=get_q_field(q_a, "image_data"))
                    set_cell_text_preserve_style(_Cell(r_a_tcs[3], t_part_c), get_q_kl(q_a), align=WD_ALIGN_PARAGRAPH.CENTER)
                    set_cell_text_preserve_style(_Cell(r_a_tcs[4], t_part_c), get_q_co(q_a, target_units[0]), align=WD_ALIGN_PARAGRAPH.CENTER)
                elif len(r_a_tcs) == 4:
                    set_cell_text_preserve_style(_Cell(r_a_tcs[0], t_part_c), "8. (a)", align=WD_ALIGN_PARAGRAPH.CENTER)
                    set_cell_text_preserve_style(_Cell(r_a_tcs[1], t_part_c), get_q_text(q_a), image_data=get_q_field(q_a, "image_data"))
                    set_cell_text_preserve_style(_Cell(r_a_tcs[2], t_part_c), get_q_kl(q_a), align=WD_ALIGN_PARAGRAPH.CENTER)
                    set_cell_text_preserve_style(_Cell(r_a_tcs[3], t_part_c), get_q_co(q_a, target_units[0]), align=WD_ALIGN_PARAGRAPH.CENTER)

            if len(t_part_c.rows) > 2:
                set_or_row(t_part_c, 2)

            if len(t_part_c.rows) > 3:
                r_b_tcs = t_part_c.rows[3]._tr.xpath('./w:tc')
                if len(r_b_tcs) >= 5:
                    c0 = _Cell(r_b_tcs[0], t_part_c)
                    for p in c0.paragraphs:
                        p.text = ""
                    set_cell_text_preserve_style(_Cell(r_b_tcs[1], t_part_c), "(b)", align=WD_ALIGN_PARAGRAPH.CENTER)
                    set_cell_text_preserve_style(_Cell(r_b_tcs[2], t_part_c), get_q_text(q_b), image_data=get_q_field(q_b, "image_data"))
                    set_cell_text_preserve_style(_Cell(r_b_tcs[3], t_part_c), get_q_kl(q_b), align=WD_ALIGN_PARAGRAPH.CENTER)
                    set_cell_text_preserve_style(_Cell(r_b_tcs[4], t_part_c), get_q_co(q_b, target_units[1] if len(target_units) > 1 else target_units[0]), align=WD_ALIGN_PARAGRAPH.CENTER)
                elif len(r_b_tcs) == 4:
                    set_cell_text_preserve_style(_Cell(r_b_tcs[0], t_part_c), "(b)", align=WD_ALIGN_PARAGRAPH.CENTER)
                    set_cell_text_preserve_style(_Cell(r_b_tcs[1], t_part_c), get_q_text(q_b), image_data=get_q_field(q_b, "image_data"))
                    set_cell_text_preserve_style(_Cell(r_b_tcs[2], t_part_c), get_q_kl(q_b), align=WD_ALIGN_PARAGRAPH.CENTER)
                    set_cell_text_preserve_style(_Cell(r_b_tcs[3], t_part_c), get_q_co(q_b, target_units[1] if len(target_units) > 1 else target_units[0]), align=WD_ALIGN_PARAGRAPH.CENTER)

    # Standardize and align all question tables with uniform row heights and cell spacing
    if t_part_a:
        standardize_question_table(t_part_a, "part_a")
    if t_part_b:
        standardize_question_table(t_part_b, "part_b")
    if t_part_c:
        standardize_question_table(t_part_c, "part_c")

    # Ensure all Question table KL and CO column cells are centered
    for t in q_tables:
        if len(t.rows) > 0:
            for col_idx, c in enumerate(t.rows[0].cells):
                col_name = c.text.strip().upper()
                if "CO" in col_name or "KL" in col_name or "Q.NO" in col_name:
                    for row in t.rows[1:]:
                        if col_idx < len(row.cells):
                            for p in row.cells[col_idx].paragraphs:
                                p.alignment = WD_ALIGN_PARAGRAPH.CENTER

    # 4. Table of Specifications (TOS) for CAT
    kls_map = {"K1": 0, "K2": 1, "K3": 2, "K4": 3, "K5": 4, "K6": 5}
    num_target_units = len(target_units)
    tos_counts = [[0 for _ in range(6)] for _ in range(num_target_units)]
    tos_marks = [[0 for _ in range(6)] for _ in range(num_target_units)]

    is_2025 = ("2025" in config.regulation) if config.regulation else is_2025_cat_layout
    part_a_mark = 1 if is_2025 else 2
    part_b_mark = 3 if is_2025 else 13
    part_c_mark = 10 if is_2025 else 14

    questions_with_marks = []
    for q in part_a:
        if q:
            questions_with_marks.append((q, part_a_mark))

    for item in part_b:
        if isinstance(item, list):
            for q in item:
                if q:
                    questions_with_marks.append((q, part_b_mark))
        elif item:
            questions_with_marks.append((item, part_b_mark))

    for item in part_c:
        if isinstance(item, list):
            for q in item:
                if q:
                    questions_with_marks.append((q, part_c_mark))
        elif item:
            questions_with_marks.append((item, part_c_mark))

    for q, section_mark in questions_with_marks:
        u_norm = normalize_unit(get_q_field(q, "unit", target_units[0]))
        if num_target_units == 1:
            u_idx = 0
        elif u_norm == target_units[0]:
            u_idx = 0
        elif num_target_units > 1 and u_norm == target_units[1]:
            u_idx = 1
        else:
            u_idx = 0
        
        kl_key = normalize_kl(get_q_field(q, "kl", "K1"))
        kl_idx = kls_map.get(kl_key, 0)

        tos_counts[u_idx][kl_idx] += 1
        tos_marks[u_idx][kl_idx] += section_mark

    # Locate TOS tables dynamically by checking table content
    t6 = None  # Question-wise TOS
    t7 = None  # Marks-wise TOS
    for t in doc.tables:
        if len(t.rows) > 0 and len(t.rows[0].cells) >= 8:
            header_text = " ".join(c.text for row in t.rows[:2] for c in row.cells).upper()
            if "SYLLABUS" in header_text or "NO. OF QUESTIONS" in header_text or "MARKS" in header_text:
                if t6 is None:
                    t6 = t
                elif t7 is None:
                    t7 = t

    # Fallback to index-based if not found
    if t6 is None and len(doc.tables) > 6:
        t6 = doc.tables[6]
    if t7 is None and len(doc.tables) > 7:
        t7 = doc.tables[7]

    # Table 6 (Question-wise TOS)
    if t6 is not None and len(t6.rows) >= 4:
        unit_row_start = 2 if len(t6.rows) == 5 else (3 if len(t6.rows) > 5 else 2)
        total_row_idx = len(t6.rows) - 1
        max_unit_rows = total_row_idx - unit_row_start

        for u_idx in range(max_unit_rows):
            row_idx = unit_row_start + u_idx
            if row_idx < total_row_idx and len(t6.rows[row_idx].cells) >= 8:
                if u_idx < num_target_units:
                    set_cell_text_preserve_style(t6.rows[row_idx].cells[0], unit_labels[u_idx], align=WD_ALIGN_PARAGRAPH.CENTER)
                    row_sum = 0
                    for k_idx in range(6):
                        val = tos_counts[u_idx][k_idx]
                        set_cell_text_preserve_style(t6.rows[row_idx].cells[1 + k_idx], str(val) if val > 0 else "", align=WD_ALIGN_PARAGRAPH.CENTER)
                        row_sum += val
                    set_cell_text_preserve_style(t6.rows[row_idx].cells[7], str(row_sum), align=WD_ALIGN_PARAGRAPH.CENTER)
                else:
                    for col_i in range(8):
                        set_cell_text_preserve_style(t6.rows[row_idx].cells[col_i], "", align=WD_ALIGN_PARAGRAPH.CENTER)

        # Total row in Table 6
        if total_row_idx < len(t6.rows) and len(t6.rows[total_row_idx].cells) >= 8:
            set_cell_text_preserve_style(t6.rows[total_row_idx].cells[0], "Total", align=WD_ALIGN_PARAGRAPH.CENTER)
            for k_idx in range(6):
                col_sum = sum(tos_counts[u_idx][k_idx] for u_idx in range(num_target_units))
                set_cell_text_preserve_style(t6.rows[total_row_idx].cells[1 + k_idx], str(col_sum) if col_sum > 0 else "0", align=WD_ALIGN_PARAGRAPH.CENTER)
            grand_total = sum(sum(r) for r in tos_counts)
            set_cell_text_preserve_style(t6.rows[total_row_idx].cells[7], str(grand_total), align=WD_ALIGN_PARAGRAPH.CENTER)

    # Table 7 (Marks-wise TOS)
    if t7 is not None and len(t7.rows) >= 4:
        unit_row_start = 2 if len(t7.rows) == 5 else (3 if len(t7.rows) > 5 else 2)
        total_row_idx = len(t7.rows) - 1
        max_unit_rows = total_row_idx - unit_row_start

        for u_idx in range(max_unit_rows):
            row_idx = unit_row_start + u_idx
            if row_idx < total_row_idx and len(t7.rows[row_idx].cells) >= 8:
                if u_idx < num_target_units:
                    set_cell_text_preserve_style(t7.rows[row_idx].cells[0], unit_labels[u_idx], align=WD_ALIGN_PARAGRAPH.CENTER)
                    row_sum = 0
                    for k_idx in range(6):
                        val = tos_marks[u_idx][k_idx]
                        set_cell_text_preserve_style(t7.rows[row_idx].cells[1 + k_idx], str(val) if val > 0 else "", align=WD_ALIGN_PARAGRAPH.CENTER)
                        row_sum += val
                    set_cell_text_preserve_style(t7.rows[row_idx].cells[7], str(row_sum), align=WD_ALIGN_PARAGRAPH.CENTER)
                else:
                    for col_i in range(8):
                        set_cell_text_preserve_style(t7.rows[row_idx].cells[col_i], "", align=WD_ALIGN_PARAGRAPH.CENTER)

        # Total row in Table 7
        if total_row_idx < len(t7.rows) and len(t7.rows[total_row_idx].cells) >= 8:
            set_cell_text_preserve_style(t7.rows[total_row_idx].cells[0], "Total", align=WD_ALIGN_PARAGRAPH.CENTER)
            for k_idx in range(6):
                col_sum = sum(tos_marks[u_idx][k_idx] for u_idx in range(num_target_units))
                set_cell_text_preserve_style(t7.rows[total_row_idx].cells[1 + k_idx], str(col_sum) if col_sum > 0 else "0", align=WD_ALIGN_PARAGRAPH.CENTER)
            grand_total = sum(sum(r) for r in tos_marks)
            set_cell_text_preserve_style(t7.rows[total_row_idx].cells[7], str(grand_total), align=WD_ALIGN_PARAGRAPH.CENTER)

    # Center all cells in TOS tables (SYLLABUS, Unit header, unit labels, counts/marks, Total)
    for t_tos in [t6, t7]:
        if t_tos is not None:
            for row in t_tos.rows:
                for cell in row.cells:
                    for p in cell.paragraphs:
                        p.alignment = WD_ALIGN_PARAGRAPH.CENTER

    # 6. Populate Staff Signatures Table (Table 8 / Footer table)
    _populate_signature_table(doc, config)


def _populate_signature_table(doc, config: PaperConfig):
    for t in doc.tables:
        t_text = " ".join(c.text.strip() for row in t.rows for c in row.cells).upper()
        if "PREPARED BY" in t_text or "ACADEMIC INSTITUTION" in t_text or "SIGN WITH DATE" in t_text or "VERIFIED BY" in t_text:
            for row in t.rows:
                trPr = row._tr.get_or_add_trPr()
                if not trPr.findall(qn('w:cantSplit')):
                    cs_elem = parse_xml(f'<w:cantSplit {nsdecls("w")}/>')
                    trPr.insert(0, cs_elem)
                for cell in row.cells:
                    tcPr = cell._tc.get_or_add_tcPr()
                    for tcMar in tcPr.findall(qn('w:tcMar')):
                        tcPr.remove(tcMar)
                    for p in cell.paragraphs:
                        p.paragraph_format.space_before = Pt(2)
                        p.paragraph_format.space_after = Pt(2)
                        p.paragraph_format.line_spacing = 1.05

                row_label = row.cells[0].text.strip().upper() if len(row.cells) > 0 else ""
                if "PREPARED" in row_label:
                    if len(row.cells) > 1 and getattr(config, "prepared_by_name", None):
                        set_cell_text_preserve_style(row.cells[1], config.prepared_by_name, align=WD_ALIGN_PARAGRAPH.CENTER, space_before=2.0, space_after=2.0)
                    if len(row.cells) > 2 and getattr(config, "prepared_by_sign", None):
                        set_cell_text_preserve_style(row.cells[2], config.prepared_by_sign, align=WD_ALIGN_PARAGRAPH.CENTER, space_before=2.0, space_after=2.0)
                elif "VERIFIED" in row_label:
                    if len(row.cells) > 1 and getattr(config, "verified_by_name", None):
                        set_cell_text_preserve_style(row.cells[1], config.verified_by_name, align=WD_ALIGN_PARAGRAPH.CENTER, space_before=2.0, space_after=2.0)
                    if len(row.cells) > 2 and getattr(config, "verified_by_sign", None):
                        set_cell_text_preserve_style(row.cells[2], config.verified_by_sign, align=WD_ALIGN_PARAGRAPH.CENTER, space_before=2.0, space_after=2.0)
                elif "REVIEWED" in row_label or "APPROVED" in row_label:
                    if len(row.cells) > 1 and getattr(config, "reviewed_by_name", None):
                        set_cell_text_preserve_style(row.cells[1], config.reviewed_by_name, align=WD_ALIGN_PARAGRAPH.CENTER, space_before=2.0, space_after=2.0)
                    if len(row.cells) > 2 and getattr(config, "reviewed_by_sign", None):
                        set_cell_text_preserve_style(row.cells[2], config.reviewed_by_sign, align=WD_ALIGN_PARAGRAPH.CENTER, space_before=2.0, space_after=2.0)


def _generate_model_paper(doc, config: PaperConfig, part_a: List[Question], part_b: List[List[Question]], part_c: List[Question]):
    # 1. Populate Header & Course Metadata
    _populate_exam_header_and_course(doc, config, "MODEL EXAMINATION", is_model=True)

    # 2. Section headers and page breaks formatting
    part_paragraphs = [p for p in doc.paragraphs if "PART" in p.text.upper()]
    if len(part_paragraphs) >= 1:
        part_paragraphs[0].text = "PART – A (10 x 2 = 20 Marks)"
    if len(part_paragraphs) >= 2:
        part_paragraphs[1].text = "PART – B (5 x 13 = 65 Marks)"
    if len(part_paragraphs) >= 3:
        part_paragraphs[2].text = "PART – C (1 x 15 = 15 Marks)"
    for p in part_paragraphs[:3]:
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs:
            r.font.name = "Times New Roman"
            r.font.size = Pt(13)
            r.bold = True

    for p in doc.paragraphs:
        p_txt = p.text.upper()
        if ("PART" in p_txt and "B" in p_txt) or ("5 X 13" in p_txt) or ("65 MARKS" in p_txt):
            p.paragraph_format.page_break_before = True
            p.paragraph_format.space_before = Pt(4)
            p.paragraph_format.space_after = Pt(2)
        elif "TABLE OF SPECIFICATIONS" in p_txt and ("QUESTION" in p_txt or ("WISE" in p_txt and "MARKS" not in p_txt)):
            p.paragraph_format.page_break_before = True
            p.paragraph_format.space_before = Pt(4)
            p.paragraph_format.space_after = Pt(2)
        elif "TABLE OF SPECIFICATIONS" in p_txt and "MARKS" in p_txt:
            p.paragraph_format.page_break_before = False
            p.paragraph_format.space_before = Pt(4)
            p.paragraph_format.space_after = Pt(2)
        elif "QB APPROVED BY HOD" in p_txt:
            p.paragraph_format.page_break_before = False
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)

    # 3. Discover Question Tables
    q_tables = []
    for t in doc.tables:
        if len(t.rows) > 0 and len(t.rows[0].cells) in [4, 5]:
            header = " ".join(c.text.strip() for c in t.rows[0].cells).upper()
            if "Q.NO" in header and ("QUESTION" in header or "QUESTIONS" in header):
                q_tables.append(t)

    t1 = q_tables[0] if len(q_tables) > 0 else (doc.tables[3] if len(doc.tables) > 3 else None)
    t2 = q_tables[1] if len(q_tables) > 1 else (doc.tables[4] if len(doc.tables) > 4 else None)
    t3 = q_tables[2] if len(q_tables) > 2 else (doc.tables[5] if len(doc.tables) > 5 else None)

    # Populate Part A (Table 1 / Table 3)
    if t1:
        if len(t1.rows) > 0 and len(t1.rows[0].cells) >= 4:
            set_cell_text_preserve_style(t1.rows[0].cells[0], "Q.No.", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
            set_cell_text_preserve_style(t1.rows[0].cells[1], "Questions", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
            set_cell_text_preserve_style(t1.rows[0].cells[2], "KL", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
            set_cell_text_preserve_style(t1.rows[0].cells[3], "CO Attainment" if "ATTAINMENT" in t1.rows[0].cells[3].text.upper() else "CO", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)

        for idx in range(10):
            q = part_a[idx] if idx < len(part_a) else None
            row_idx = 1 + idx
            if row_idx < len(t1.rows):
                if len(t1.rows[row_idx].cells) > 0:
                    set_cell_text_preserve_style(t1.rows[row_idx].cells[0], f"{idx + 1}.", align=WD_ALIGN_PARAGRAPH.CENTER)
                if len(t1.rows[row_idx].cells) > 1:
                    set_cell_text_preserve_style(t1.rows[row_idx].cells[1], get_q_text(q), image_data=get_q_field(q, "image_data"))
                if len(t1.rows[row_idx].cells) > 2:
                    set_cell_text_preserve_style(t1.rows[row_idx].cells[2], get_q_kl(q), align=WD_ALIGN_PARAGRAPH.CENTER)
                default_u = f"Unit {(idx // 2) + 1}"
                if len(t1.rows[row_idx].cells) > 3:
                    set_cell_text_preserve_style(t1.rows[row_idx].cells[3], get_q_co(q, default_u), align=WD_ALIGN_PARAGRAPH.CENTER)
        standardize_question_table(t1, "part_a")

    # Populate Part B (Table 2 / Table 4)
    if t2:
        if len(t2.rows) > 0:
            tc_list = t2.rows[0]._tr.xpath('./w:tc')
            if len(tc_list) == 4:
                set_cell_text_preserve_style(_Cell(tc_list[0], t2), "Q.No.", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
                set_cell_text_preserve_style(_Cell(tc_list[1], t2), "Questions", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
                set_cell_text_preserve_style(_Cell(tc_list[2], t2), "KL", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
                set_cell_text_preserve_style(_Cell(tc_list[3], t2), "CO Attainment" if any("ATTAINMENT" in c.text.upper() for c in t2.rows[0].cells) else "CO", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
            elif len(tc_list) >= 5:
                set_cell_text_preserve_style(_Cell(tc_list[0], t2), "Q.No.", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
                set_cell_text_preserve_style(_Cell(tc_list[1], t2), "Sub", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
                set_cell_text_preserve_style(_Cell(tc_list[2], t2), "Questions", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
                set_cell_text_preserve_style(_Cell(tc_list[3], t2), "KL", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
                set_cell_text_preserve_style(_Cell(tc_list[4], t2), "CO Attainment" if any("ATTAINMENT" in c.text.upper() for c in t2.rows[0].cells) else "CO", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)

        for idx in range(5):
            pair = part_b[idx] if idx < len(part_b) else None
            row_a_idx = 1 + idx * 3
            row_or_idx = 2 + idx * 3
            row_b_idx = 3 + idx * 3
            default_u = f"Unit {idx + 1}"
            q_num = 11 + idx
            
            q_a = pair[0] if isinstance(pair, (list, tuple)) and len(pair) > 0 else (pair.get('a') if isinstance(pair, dict) else None)
            q_b = pair[1] if isinstance(pair, (list, tuple)) and len(pair) > 1 else (pair.get('b') if isinstance(pair, dict) else None)
            
            if row_a_idx < len(t2.rows):
                r_a_tcs = t2.rows[row_a_idx]._tr.xpath('./w:tc')
                if len(r_a_tcs) >= 5:
                    set_cell_text_preserve_style(_Cell(r_a_tcs[0], t2), f"{q_num}.", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
                    set_cell_text_preserve_style(_Cell(r_a_tcs[1], t2), "(a)", align=WD_ALIGN_PARAGRAPH.CENTER)
                    set_cell_text_preserve_style(_Cell(r_a_tcs[2], t2), get_q_text(q_a), image_data=get_q_field(q_a, "image_data"))
                    set_cell_text_preserve_style(_Cell(r_a_tcs[3], t2), get_q_kl(q_a), align=WD_ALIGN_PARAGRAPH.CENTER)
                    set_cell_text_preserve_style(_Cell(r_a_tcs[4], t2), get_q_co(q_a, default_u), align=WD_ALIGN_PARAGRAPH.CENTER)
                elif len(r_a_tcs) == 4:
                    set_cell_text_preserve_style(_Cell(r_a_tcs[0], t2), f"{q_num}. (a)", align=WD_ALIGN_PARAGRAPH.CENTER)
                    set_cell_text_preserve_style(_Cell(r_a_tcs[1], t2), get_q_text(q_a), image_data=get_q_field(q_a, "image_data"))
                    set_cell_text_preserve_style(_Cell(r_a_tcs[2], t2), get_q_kl(q_a), align=WD_ALIGN_PARAGRAPH.CENTER)
                    set_cell_text_preserve_style(_Cell(r_a_tcs[3], t2), get_q_co(q_a, default_u), align=WD_ALIGN_PARAGRAPH.CENTER)
                
            if row_or_idx < len(t2.rows):
                set_or_row(t2, row_or_idx)

            if row_b_idx < len(t2.rows):
                r_b_tcs = t2.rows[row_b_idx]._tr.xpath('./w:tc')
                if len(r_b_tcs) >= 5:
                    c0 = _Cell(r_b_tcs[0], t2)
                    for p in c0.paragraphs:
                        p.text = ""
                    set_cell_text_preserve_style(_Cell(r_b_tcs[1], t2), "(b)", align=WD_ALIGN_PARAGRAPH.CENTER)
                    set_cell_text_preserve_style(_Cell(r_b_tcs[2], t2), get_q_text(q_b), image_data=get_q_field(q_b, "image_data"))
                    set_cell_text_preserve_style(_Cell(r_b_tcs[3], t2), get_q_kl(q_b), align=WD_ALIGN_PARAGRAPH.CENTER)
                    set_cell_text_preserve_style(_Cell(r_b_tcs[4], t2), get_q_co(q_b, default_u), align=WD_ALIGN_PARAGRAPH.CENTER)
                elif len(r_b_tcs) == 4:
                    set_cell_text_preserve_style(_Cell(r_b_tcs[0], t2), "(b)", align=WD_ALIGN_PARAGRAPH.CENTER)
                    set_cell_text_preserve_style(_Cell(r_b_tcs[1], t2), get_q_text(q_b), image_data=get_q_field(q_b, "image_data"))
                    set_cell_text_preserve_style(_Cell(r_b_tcs[2], t2), get_q_kl(q_b), align=WD_ALIGN_PARAGRAPH.CENTER)
                    set_cell_text_preserve_style(_Cell(r_b_tcs[3], t2), get_q_co(q_b, default_u), align=WD_ALIGN_PARAGRAPH.CENTER)
        standardize_question_table(t2, "part_b")

    # Populate Part C (Table 3 / Table 5)
    if t3:
        if len(t3.rows) > 0:
            tc_list = t3.rows[0]._tr.xpath('./w:tc')
            if len(tc_list) == 4:
                set_cell_text_preserve_style(_Cell(tc_list[0], t3), "Q.No.", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
                set_cell_text_preserve_style(_Cell(tc_list[1], t3), "Questions", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
                set_cell_text_preserve_style(_Cell(tc_list[2], t3), "KL", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
                set_cell_text_preserve_style(_Cell(tc_list[3], t3), "CO Attainment" if any("ATTAINMENT" in c.text.upper() for c in t3.rows[0].cells) else "CO", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
            elif len(tc_list) >= 5:
                set_cell_text_preserve_style(_Cell(tc_list[0], t3), "Q.No.", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
                set_cell_text_preserve_style(_Cell(tc_list[1], t3), "Sub", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
                set_cell_text_preserve_style(_Cell(tc_list[2], t3), "Questions", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
                set_cell_text_preserve_style(_Cell(tc_list[3], t3), "KL", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
                set_cell_text_preserve_style(_Cell(tc_list[4], t3), "CO Attainment" if any("ATTAINMENT" in c.text.upper() for c in t3.rows[0].cells) else "CO", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)

        pair_c = part_c[0] if len(part_c) > 0 else None
        q_c_a = pair_c[0] if isinstance(pair_c, (list, tuple)) and len(pair_c) > 0 else (pair_c.get('a') if isinstance(pair_c, dict) else (part_c[0] if len(part_c) > 0 and not isinstance(part_c[0], (list, tuple, dict)) else None))
        q_c_b = pair_c[1] if isinstance(pair_c, (list, tuple)) and len(pair_c) > 1 else (pair_c.get('b') if isinstance(pair_c, dict) else (part_c[1] if len(part_c) > 1 and not isinstance(part_c[1], (list, tuple, dict)) else None))

        if len(t3.rows) > 1:
            r_a_tcs = t3.rows[1]._tr.xpath('./w:tc')
            if len(r_a_tcs) >= 5:
                set_cell_text_preserve_style(_Cell(r_a_tcs[0], t3), "16.", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
                set_cell_text_preserve_style(_Cell(r_a_tcs[1], t3), "(a)", align=WD_ALIGN_PARAGRAPH.CENTER)
                set_cell_text_preserve_style(_Cell(r_a_tcs[2], t3), get_q_text(q_c_a), image_data=get_q_field(q_c_a, "image_data"))
                set_cell_text_preserve_style(_Cell(r_a_tcs[3], t3), get_q_kl(q_c_a), align=WD_ALIGN_PARAGRAPH.CENTER)
                set_cell_text_preserve_style(_Cell(r_a_tcs[4], t3), get_q_co(q_c_a, "Unit V"), align=WD_ALIGN_PARAGRAPH.CENTER)
            elif len(r_a_tcs) == 4:
                set_cell_text_preserve_style(_Cell(r_a_tcs[0], t3), "16. (a)", align=WD_ALIGN_PARAGRAPH.CENTER)
                set_cell_text_preserve_style(_Cell(r_a_tcs[1], t3), get_q_text(q_c_a), image_data=get_q_field(q_c_a, "image_data"))
                set_cell_text_preserve_style(_Cell(r_a_tcs[2], t3), get_q_kl(q_c_a), align=WD_ALIGN_PARAGRAPH.CENTER)
                set_cell_text_preserve_style(_Cell(r_a_tcs[3], t3), get_q_co(q_c_a, "Unit V"), align=WD_ALIGN_PARAGRAPH.CENTER)
            
        if len(t3.rows) > 2:
            set_or_row(t3, 2)

        if len(t3.rows) > 3:
            r_b_tcs = t3.rows[3]._tr.xpath('./w:tc')
            if len(r_b_tcs) >= 5:
                c0 = _Cell(r_b_tcs[0], t3)
                for p in c0.paragraphs:
                    p.text = ""
                set_cell_text_preserve_style(_Cell(r_b_tcs[1], t3), "(b)", align=WD_ALIGN_PARAGRAPH.CENTER)
                set_cell_text_preserve_style(_Cell(r_b_tcs[2], t3), get_q_text(q_c_b), image_data=get_q_field(q_c_b, "image_data"))
                set_cell_text_preserve_style(_Cell(r_b_tcs[3], t3), get_q_kl(q_c_b), align=WD_ALIGN_PARAGRAPH.CENTER)
                set_cell_text_preserve_style(_Cell(r_b_tcs[4], t3), get_q_co(q_c_b, "Unit V"), align=WD_ALIGN_PARAGRAPH.CENTER)
            elif len(r_b_tcs) == 4:
                set_cell_text_preserve_style(_Cell(r_b_tcs[0], t3), "(b)", align=WD_ALIGN_PARAGRAPH.CENTER)
                set_cell_text_preserve_style(_Cell(r_b_tcs[1], t3), get_q_text(q_c_b), image_data=get_q_field(q_c_b, "image_data"))
                set_cell_text_preserve_style(_Cell(r_b_tcs[2], t3), get_q_kl(q_c_b), align=WD_ALIGN_PARAGRAPH.CENTER)
                set_cell_text_preserve_style(_Cell(r_b_tcs[3], t3), get_q_co(q_c_b, "Unit V"), align=WD_ALIGN_PARAGRAPH.CENTER)
        standardize_question_table(t3, "part_c")

    # Discover TOS tables
    tos_tables = []
    for t in doc.tables:
        if len(t.rows) > 1 and len(t.rows[1].cells) >= 7:
            hdr2 = " ".join(c.text.strip() for c in t.rows[1].cells).upper()
            if "K1" in hdr2 and "K2" in hdr2:
                tos_tables.append(t)

    t4 = tos_tables[0] if len(tos_tables) > 0 else (doc.tables[6] if len(doc.tables) > 6 else None)
    t5 = tos_tables[1] if len(tos_tables) > 1 else (doc.tables[7] if len(doc.tables) > 7 else None)

    # 5. Compute Table of Specifications (TOS)
    units_map = {"Unit I": 0, "Unit II": 1, "Unit III": 2, "Unit IV": 3, "Unit V": 4}
    kls_map = {"K1": 0, "K2": 1, "K3": 2, "K4": 3, "K5": 4, "K6": 5}
    
    tos_counts = [[0 for _ in range(6)] for _ in range(5)]
    tos_marks = [[0 for _ in range(6)] for _ in range(5)]
    
    is_2025 = ("2025" in config.regulation) if config.regulation else False
    part_a_mark = 1 if is_2025 else 2
    part_b_mark = 3 if is_2025 else 13
    part_c_mark = 10 if is_2025 else 15

    questions_with_marks = []
    for q in part_a:
        if q:
            questions_with_marks.append((q, part_a_mark))
            
    for pair in part_b:
        if isinstance(pair, list):
            for q in pair:
                if q:
                    questions_with_marks.append((q, part_b_mark))
        elif pair:
            questions_with_marks.append((pair, part_b_mark))
            
    for item in part_c:
        if isinstance(item, list):
            for q in item:
                if q:
                    questions_with_marks.append((q, part_c_mark))
        elif item:
            questions_with_marks.append((item, part_c_mark))
            
    for q, section_mark in questions_with_marks:
        u_norm = normalize_unit(get_q_field(q, "unit", "Unit I"))
        unit_idx = units_map.get(u_norm)
        kl_key = normalize_kl(get_q_field(q, "kl", "K1"))
        kl_idx = kls_map.get(kl_key)
        
        if unit_idx is not None and kl_idx is not None:
            tos_counts[unit_idx][kl_idx] += 1
            tos_marks[unit_idx][kl_idx] += section_mark

    # 6. Populate Table 4 (Question-Wise TOS)
    unit_labels_model = ["Unit I", "Unit II", "Unit III", "Unit IV", "Unit V"]
    if t4 and len(t4.rows) >= 8:
        for u_idx in range(5):
            row_idx = 2 + u_idx
            set_cell_text_preserve_style(t4.rows[row_idx].cells[0], unit_labels_model[u_idx], align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
            u_total = 0
            for k_idx in range(6):
                val = tos_counts[u_idx][k_idx]
                u_total += val
                txt = str(val) if val > 0 else ""
                set_cell_text_preserve_style(t4.rows[row_idx].cells[1 + k_idx], txt, align=WD_ALIGN_PARAGRAPH.CENTER)
            set_cell_text_preserve_style(t4.rows[row_idx].cells[7], str(u_total), align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)

        # Total row
        grand_total_q = 0
        set_cell_text_preserve_style(t4.rows[7].cells[0], "Total", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
        for k_idx in range(6):
            col_tot = sum(tos_counts[u_idx][k_idx] for u_idx in range(5))
            grand_total_q += col_tot
            txt = str(col_tot) if col_tot > 0 else ""
            set_cell_text_preserve_style(t4.rows[7].cells[1 + k_idx], txt, align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
        set_cell_text_preserve_style(t4.rows[7].cells[7], str(grand_total_q), align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)

    # 7. Populate Table 5 (Marks-Wise TOS)
    if t5 and len(t5.rows) >= 8:
        for u_idx in range(5):
            row_idx = 2 + u_idx
            set_cell_text_preserve_style(t5.rows[row_idx].cells[0], unit_labels_model[u_idx], align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
            u_total = 0
            for k_idx in range(6):
                val = tos_marks[u_idx][k_idx]
                u_total += val
                txt = str(val) if val > 0 else ""
                set_cell_text_preserve_style(t5.rows[row_idx].cells[1 + k_idx], txt, align=WD_ALIGN_PARAGRAPH.CENTER)
            set_cell_text_preserve_style(t5.rows[row_idx].cells[7], str(u_total), align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)

        # Total row
        grand_total_m = 0
        set_cell_text_preserve_style(t5.rows[7].cells[0], "Total", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
        for k_idx in range(6):
            col_tot = sum(tos_marks[u_idx][k_idx] for u_idx in range(5))
            grand_total_m += col_tot
            txt = str(col_tot) if col_tot > 0 else ""
            set_cell_text_preserve_style(t5.rows[7].cells[1 + k_idx], txt, align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
        set_cell_text_preserve_style(t5.rows[7].cells[7], str(grand_total_m), align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)

    # 8. Populate Staff Signatures Table if present in model template
    _populate_signature_table(doc, config)


def _generate_2025_model_paper(doc, config: PaperConfig, part_a: List[Question], part_b: List[Any], part_c: List[Any]):
    # 1. Populate Header & Course Metadata
    _populate_exam_header_and_course(doc, config, "MODEL EXAMINATION", is_model=True)

    # 2. Section headers and page breaks formatting
    part_paragraphs = [p for p in doc.paragraphs if "PART" in p.text.upper()]
    if len(part_paragraphs) >= 1:
        part_paragraphs[0].text = "PART – A (10 x 1 = 10 Marks)"
    if len(part_paragraphs) >= 2:
        part_paragraphs[1].text = "PART – A (10 x 3 = 30 Marks)"
    if len(part_paragraphs) >= 3:
        part_paragraphs[2].text = "PART – B (5 x 12 = 60 Marks)"
    for p in part_paragraphs[:3]:
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs:
            r.font.name = "Times New Roman"
            r.font.size = Pt(13)
            r.bold = True

    for p in doc.paragraphs:
        p_txt = p.text.upper()
        if ("PART" in p_txt and "B" in p_txt) or ("5 X 12" in p_txt) or ("60 MARKS" in p_txt):
            p.paragraph_format.page_break_before = True
            p.paragraph_format.space_before = Pt(4)
            p.paragraph_format.space_after = Pt(2)
        elif "TABLE OF SPECIFICATIONS" in p_txt and ("QUESTION" in p_txt or ("WISE" in p_txt and "MARKS" not in p_txt)):
            p.paragraph_format.page_break_before = True
            p.paragraph_format.space_before = Pt(4)
            p.paragraph_format.space_after = Pt(2)
        elif "TABLE OF SPECIFICATIONS" in p_txt and "MARKS" in p_txt:
            p.paragraph_format.page_break_before = False
            p.paragraph_format.space_before = Pt(4)
            p.paragraph_format.space_after = Pt(2)
        elif "QB APPROVED BY HOD" in p_txt:
            p.paragraph_format.page_break_before = False
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)

    # Discover Question Tables
    q_tables = []
    for t in doc.tables:
        if len(t.rows) > 0 and len(t.rows[0].cells) in [4, 5]:
            header = " ".join(c.text.strip() for c in t.rows[0].cells).upper()
            if "Q.NO" in header and ("QUESTION" in header or "QUESTIONS" in header):
                q_tables.append(t)

    t_pa1 = q_tables[0] if len(q_tables) > 0 else (doc.tables[2] if len(doc.tables) > 2 else None)
    t_pa3 = q_tables[1] if len(q_tables) > 1 else (doc.tables[3] if len(doc.tables) > 3 else None)
    t_pb = q_tables[2] if len(q_tables) > 2 else (doc.tables[4] if len(doc.tables) > 4 else None)

    # 2. Populate Part A (1 Mark MCQ: Q1 to Q10)
    if t_pa1:
        if len(t_pa1.rows) > 0 and len(t_pa1.rows[0].cells) >= 4:
            set_cell_text_preserve_style(t_pa1.rows[0].cells[0], "Q.No.", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
            set_cell_text_preserve_style(t_pa1.rows[0].cells[1], "Questions", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
            set_cell_text_preserve_style(t_pa1.rows[0].cells[2], "KL", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
            set_cell_text_preserve_style(t_pa1.rows[0].cells[3], "CO Attainment", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)

        for idx in range(10):
            q = part_a[idx] if idx < len(part_a) else None
            row_idx = 1 + idx
            if row_idx < len(t_pa1.rows):
                row = t_pa1.rows[row_idx]
                if len(row.cells) > 0:
                    set_cell_text_preserve_style(row.cells[0], f"{idx + 1}.", align=WD_ALIGN_PARAGRAPH.CENTER)
                if len(row.cells) > 1:
                    set_cell_text_preserve_style(row.cells[1], get_q_text(q), image_data=get_q_field(q, "image_data"))
                if len(row.cells) > 2:
                    set_cell_text_preserve_style(row.cells[2], get_q_kl(q), align=WD_ALIGN_PARAGRAPH.CENTER)
                default_u = f"Unit {(idx // 2) + 1}"
                if len(row.cells) > 3:
                    set_cell_text_preserve_style(row.cells[3], get_q_co(q, default_u), align=WD_ALIGN_PARAGRAPH.CENTER)

        standardize_question_table(t_pa1, "part_a")

    # 3. Populate Part A Section 2 (3 Marks Short Answer: Q11 to Q20)
    if t_pa3:
        if len(t_pa3.rows) > 0 and len(t_pa3.rows[0].cells) >= 4:
            set_cell_text_preserve_style(t_pa3.rows[0].cells[0], "Q.No.", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
            set_cell_text_preserve_style(t_pa3.rows[0].cells[1], "Questions", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
            set_cell_text_preserve_style(t_pa3.rows[0].cells[2], "KL", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
            set_cell_text_preserve_style(t_pa3.rows[0].cells[3], "CO Attainment", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)

        for idx in range(10):
            item = part_b[idx] if idx < len(part_b) else None
            q = item.get('a') if isinstance(item, dict) and 'a' in item else (item[0] if isinstance(item, (list, tuple)) and len(item) > 0 else item)
            row_idx = 1 + idx
            if row_idx < len(t_pa3.rows):
                row = t_pa3.rows[row_idx]
                if len(row.cells) > 0:
                    set_cell_text_preserve_style(row.cells[0], f"{11 + idx}.", align=WD_ALIGN_PARAGRAPH.CENTER)
                if len(row.cells) > 1:
                    set_cell_text_preserve_style(row.cells[1], get_q_text(q), image_data=get_q_field(q, "image_data"))
                if len(row.cells) > 2:
                    set_cell_text_preserve_style(row.cells[2], get_q_kl(q), align=WD_ALIGN_PARAGRAPH.CENTER)
                default_u = f"Unit {(idx // 2) + 1}"
                if len(row.cells) > 3:
                    set_cell_text_preserve_style(row.cells[3], get_q_co(q, default_u), align=WD_ALIGN_PARAGRAPH.CENTER)

        standardize_question_table(t_pa3, "part_b")

    # 4. Populate Part B (12 Marks Either-Or: Q21 to Q25)
    if t_pb:
        if len(t_pb.rows) > 0:
            tc_list = t_pb.rows[0]._tr.xpath('./w:tc')
            if len(tc_list) == 4:
                set_cell_text_preserve_style(_Cell(tc_list[0], t_pb), "Q.No.", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
                set_cell_text_preserve_style(_Cell(tc_list[1], t_pb), "Questions", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
                set_cell_text_preserve_style(_Cell(tc_list[2], t_pb), "KL", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
                set_cell_text_preserve_style(_Cell(tc_list[3], t_pb), "CO Attainment", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
            elif len(tc_list) >= 5:
                set_cell_text_preserve_style(_Cell(tc_list[0], t_pb), "Q.No.", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
                set_cell_text_preserve_style(_Cell(tc_list[1], t_pb), "Sub", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
                set_cell_text_preserve_style(_Cell(tc_list[2], t_pb), "Questions", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
                set_cell_text_preserve_style(_Cell(tc_list[3], t_pb), "KL", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
                set_cell_text_preserve_style(_Cell(tc_list[4], t_pb), "CO Attainment", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)

        for idx in range(5):
            pair = part_c[idx] if idx < len(part_c) else None
            row_a_idx = 1 + idx * 3
            row_or_idx = 2 + idx * 3
            row_b_idx = 3 + idx * 3
            default_u = f"Unit {idx + 1}"
            q_num = 21 + idx

            q_a = pair[0] if isinstance(pair, (list, tuple)) and len(pair) > 0 else (pair.get('a') if isinstance(pair, dict) else None)
            q_b = pair[1] if isinstance(pair, (list, tuple)) and len(pair) > 1 else (pair.get('b') if isinstance(pair, dict) else None)

            if row_a_idx < len(t_pb.rows):
                r_a_tcs = t_pb.rows[row_a_idx]._tr.xpath('./w:tc')
                if len(r_a_tcs) >= 5:
                    set_cell_text_preserve_style(_Cell(r_a_tcs[0], t_pb), f"{q_num}.", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
                    set_cell_text_preserve_style(_Cell(r_a_tcs[1], t_pb), "(a)", align=WD_ALIGN_PARAGRAPH.CENTER)
                    set_cell_text_preserve_style(_Cell(r_a_tcs[2], t_pb), get_q_text(q_a), image_data=get_q_field(q_a, "image_data"))
                    set_cell_text_preserve_style(_Cell(r_a_tcs[3], t_pb), get_q_kl(q_a), align=WD_ALIGN_PARAGRAPH.CENTER)
                    set_cell_text_preserve_style(_Cell(r_a_tcs[4], t_pb), get_q_co(q_a, default_u), align=WD_ALIGN_PARAGRAPH.CENTER)
                elif len(r_a_tcs) == 4:
                    set_cell_text_preserve_style(_Cell(r_a_tcs[0], t_pb), f"{q_num}. (a)", align=WD_ALIGN_PARAGRAPH.CENTER)
                    set_cell_text_preserve_style(_Cell(r_a_tcs[1], t_pb), get_q_text(q_a), image_data=get_q_field(q_a, "image_data"))
                    set_cell_text_preserve_style(_Cell(r_a_tcs[2], t_pb), get_q_kl(q_a), align=WD_ALIGN_PARAGRAPH.CENTER)
                    set_cell_text_preserve_style(_Cell(r_a_tcs[3], t_pb), get_q_co(q_a, default_u), align=WD_ALIGN_PARAGRAPH.CENTER)

            if row_or_idx < len(t_pb.rows):
                set_or_row(t_pb, row_or_idx)

            if row_b_idx < len(t_pb.rows):
                r_b_tcs = t_pb.rows[row_b_idx]._tr.xpath('./w:tc')
                if len(r_b_tcs) >= 5:
                    c0 = _Cell(r_b_tcs[0], t_pb)
                    for p in c0.paragraphs:
                        p.text = ""
                    set_cell_text_preserve_style(_Cell(r_b_tcs[1], t_pb), "(b)", align=WD_ALIGN_PARAGRAPH.CENTER)
                    set_cell_text_preserve_style(_Cell(r_b_tcs[2], t_pb), get_q_text(q_b), image_data=get_q_field(q_b, "image_data"))
                    set_cell_text_preserve_style(_Cell(r_b_tcs[3], t_pb), get_q_kl(q_b), align=WD_ALIGN_PARAGRAPH.CENTER)
                    set_cell_text_preserve_style(_Cell(r_b_tcs[4], t_pb), get_q_co(q_b, default_u), align=WD_ALIGN_PARAGRAPH.CENTER)
                elif len(r_b_tcs) == 4:
                    set_cell_text_preserve_style(_Cell(r_b_tcs[0], t_pb), "(b)", align=WD_ALIGN_PARAGRAPH.CENTER)
                    set_cell_text_preserve_style(_Cell(r_b_tcs[1], t_pb), get_q_text(q_b), image_data=get_q_field(q_b, "image_data"))
                    set_cell_text_preserve_style(_Cell(r_b_tcs[2], t_pb), get_q_kl(q_b), align=WD_ALIGN_PARAGRAPH.CENTER)
                    set_cell_text_preserve_style(_Cell(r_b_tcs[3], t_pb), get_q_co(q_b, default_u), align=WD_ALIGN_PARAGRAPH.CENTER)

        standardize_question_table(t_pb, "part_c")

    # 5. Table of Specifications (TOS)
    units_map = {"Unit I": 0, "Unit II": 1, "Unit III": 2, "Unit IV": 3, "Unit V": 4}
    kls_map = {"K1": 0, "K2": 1, "K3": 2, "K4": 3, "K5": 4, "K6": 5}
    tos_counts = [[0 for _ in range(6)] for _ in range(5)]
    tos_marks = [[0 for _ in range(6)] for _ in range(5)]

    # Part A (1m MCQ)
    for idx, q in enumerate(part_a[:10]):
        if q:
            u_str = normalize_unit(get_q_field(q, "unit", f"Unit {(idx // 2) + 1}"))
            k_str = normalize_kl(get_q_kl(q))
            u_i = units_map.get(u_str, min(idx // 2, 4))
            k_i = kls_map.get(k_str, 0)
            tos_counts[u_i][k_i] += 1
            tos_marks[u_i][k_i] += 1

    # Part A Section 2 (3m Short Ans)
    for idx, item in enumerate(part_b[:10]):
        q = item.get('a') if isinstance(item, dict) and 'a' in item else (item[0] if isinstance(item, (list, tuple)) and len(item) > 0 else item)
        if q:
            u_str = normalize_unit(get_q_field(q, "unit", f"Unit {(idx // 2) + 1}"))
            k_str = normalize_kl(get_q_kl(q))
            u_i = units_map.get(u_str, min(idx // 2, 4))
            k_i = kls_map.get(k_str, 1)
            tos_counts[u_i][k_i] += 1
            tos_marks[u_i][k_i] += 3

    # Part B (12m Either-Or)
    for idx, pair in enumerate(part_c[:5]):
        q_a = pair[0] if isinstance(pair, (list, tuple)) and len(pair) > 0 else (pair.get('a') if isinstance(pair, dict) else None)
        if q_a:
            u_str = normalize_unit(get_q_field(q_a, "unit", f"Unit {idx + 1}"))
            k_str = normalize_kl(get_q_kl(q_a))
            u_i = units_map.get(u_str, min(idx, 4))
            k_i = kls_map.get(k_str, 2)
            tos_counts[u_i][k_i] += 1
            tos_marks[u_i][k_i] += 12

    # Discover TOS tables
    tos_tables = []
    for t in doc.tables:
        if len(t.rows) > 1 and len(t.rows[1].cells) >= 7:
            hdr2 = " ".join(c.text.strip() for c in t.rows[1].cells).upper()
            if "K1" in hdr2 and "K2" in hdr2:
                tos_tables.append(t)

    t4 = tos_tables[0] if len(tos_tables) > 0 else None
    t5 = tos_tables[1] if len(tos_tables) > 1 else None

    unit_labels_model = ["Unit I", "Unit II", "Unit III", "Unit IV", "Unit V"]
    if t4 and len(t4.rows) >= 8:
        for u_idx in range(5):
            row_idx = 2 + u_idx
            set_cell_text_preserve_style(t4.rows[row_idx].cells[0], unit_labels_model[u_idx], align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
            u_total = 0
            for k_idx in range(6):
                val = tos_counts[u_idx][k_idx]
                u_total += val
                txt = str(val) if val > 0 else ""
                set_cell_text_preserve_style(t4.rows[row_idx].cells[1 + k_idx], txt, align=WD_ALIGN_PARAGRAPH.CENTER)
            set_cell_text_preserve_style(t4.rows[row_idx].cells[7], str(u_total), align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)

        # Total row
        grand_total_q = 0
        set_cell_text_preserve_style(t4.rows[7].cells[0], "Total", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
        for k_idx in range(6):
            col_tot = sum(tos_counts[u_idx][k_idx] for u_idx in range(5))
            grand_total_q += col_tot
            txt = str(col_tot) if col_tot > 0 else ""
            set_cell_text_preserve_style(t4.rows[7].cells[1 + k_idx], txt, align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
        set_cell_text_preserve_style(t4.rows[7].cells[7], str(grand_total_q), align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)

    if t5 and len(t5.rows) >= 8:
        for u_idx in range(5):
            row_idx = 2 + u_idx
            set_cell_text_preserve_style(t5.rows[row_idx].cells[0], unit_labels_model[u_idx], align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
            u_total = 0
            for k_idx in range(6):
                val = tos_marks[u_idx][k_idx]
                u_total += val
                txt = str(val) if val > 0 else ""
                set_cell_text_preserve_style(t5.rows[row_idx].cells[1 + k_idx], txt, align=WD_ALIGN_PARAGRAPH.CENTER)
            set_cell_text_preserve_style(t5.rows[row_idx].cells[7], str(u_total), align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)

        # Total row
        grand_total_m = 0
        set_cell_text_preserve_style(t5.rows[7].cells[0], "Total", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
        for k_idx in range(6):
            col_tot = sum(tos_marks[u_idx][k_idx] for u_idx in range(5))
            grand_total_m += col_tot
            txt = str(col_tot) if col_tot > 0 else ""
            set_cell_text_preserve_style(t5.rows[7].cells[1 + k_idx], txt, align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)
        set_cell_text_preserve_style(t5.rows[7].cells[7], str(grand_total_m), align=WD_ALIGN_PARAGRAPH.CENTER, bold=True)

    # 6. Staff Signatures
    _populate_signature_table(doc, config)


def generate_question_paper(
    template_path: str,
    output_path: Any,
    config: PaperConfig,
    part_a: List[Question],
    part_b: List[List[Question]],
    part_c: List[Question]
):
    if not os.path.exists(template_path):
        raise FileNotFoundError(f"Template Word document not found at '{template_path}'")

    doc = docx.Document(template_path)
    
    if len(doc.tables) < 6:
        raise ValueError(f"Template document structure invalid. Expected at least 6 tables, found {len(doc.tables)}.")

    logger.info(f"Generating question paper for {config.subject_code} ({config.set}) - Exam Type: {config.exam_type}")

    is_cat_template = "cat" in os.path.basename(template_path).lower()
    is_2025 = bool(config.regulation and "2025" in config.regulation)
    is_2025_model = is_2025 and (not is_cat_template)

    if is_2025_model:
        _generate_2025_model_paper(doc, config, part_a, part_b, part_c)
    elif is_cat_template:
        _generate_cat_paper(doc, config, part_a, part_b, part_c)
    else:
        _generate_model_paper(doc, config, part_a, part_b, part_c)
        
    sanitize_document_ooxml(doc)
    doc.save(output_path)
    logger.info(f"Successfully generated question paper document at: {output_path}")

