#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate_final_handover_docx.py
Generates the official Microsoft Word (.docx) Final Handover Dossier
for Avatr Auto Service (Laothani Tractor Sole Co., Ltd) in Lao & English.
Standard library only (zipfile + OpenXML).
"""

import zipfile
import html
import os

def create_handover_docx(output_path):
    content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>'''

    rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>'''

    document_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>'''

    styles = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Phetsarath OT"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
        <w:lang w:val="lo-LA"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="160" w:line="276" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
</w:styles>'''

    def esc(text):
        return html.escape(str(text))

    def p(text="", bold=False, size=22, color="1E293B", align="left", space_after=160, italic=False, bullet=False):
        b_tag = "<w:b/>" if bold else ""
        i_tag = "<w:i/>" if italic else ""
        al_tag = f'<w:jc w:val="{align}"/>' if align != "left" else ""
        p_indent = '<w:ind w:left="360" w:hanging="240"/>' if bullet else ""
        bullet_char = "• " if bullet else ""
        safe_text = esc(f"{bullet_char}{text}")
        return f'''<w:p>
          <w:pPr>
            {al_tag}
            <w:spacing w:after="{space_after}"/>
            {p_indent}
          </w:pPr>
          <w:r>
            <w:rPr>
              {b_tag}
              {i_tag}
              <w:color w:val="{color}"/>
              <w:sz w:val="{size}"/>
              <w:szCs w:val="{size}"/>
              <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Phetsarath OT"/>
            </w:rPr>
            <w:t xml:space="preserve">{safe_text}</w:t>
          </w:r>
        </w:p>'''

    def heading(text, level=1):
        safe_text = esc(text)
        if level == 1:
            return f'''<w:p>
              <w:pPr>
                <w:spacing w:before="360" w:after="160"/>
                <w:pBdr><w:bottom w:val="single" w:sz="14" w:space="4" w:color="0284C7"/></w:pBdr>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:b/>
                  <w:color w:val="0369A1"/>
                  <w:sz w:val="28"/>
                  <w:szCs w:val="28"/>
                  <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Phetsarath OT"/>
                </w:rPr>
                <w:t>{safe_text}</w:t>
              </w:r>
            </w:p>'''
        elif level == 2:
            return f'''<w:p>
              <w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>
              <w:r>
                <w:rPr>
                  <w:b/>
                  <w:color w:val="0F172A"/>
                  <w:sz w:val="24"/>
                  <w:szCs w:val="24"/>
                  <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Phetsarath OT"/>
                </w:rPr>
                <w:t>{safe_text}</w:t>
              </w:r>
            </w:p>'''
        else:
            return f'''<w:p>
              <w:pPr><w:spacing w:before="160" w:after="80"/></w:pPr>
              <w:r>
                <w:rPr>
                  <w:b/>
                  <w:color w:val="334155"/>
                  <w:sz w:val="22"/>
                  <w:szCs w:val="22"/>
                  <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Phetsarath OT"/>
                </w:rPr>
                <w:t>{safe_text}</w:t>
              </w:r>
            </w:p>'''

    def callout(title, body_lines, bg="F0F9FF", border="0284C7"):
        content = f'''<w:p>
          <w:pPr><w:spacing w:after="100"/></w:pPr>
          <w:r>
            <w:rPr><w:b/><w:color w:val="{border}"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Phetsarath OT"/></w:rPr>
            <w:t>{esc(title)}</w:t>
          </w:r>
        </w:p>'''
        for line in body_lines:
            content += f'''<w:p>
              <w:pPr><w:spacing w:after="60"/></w:pPr>
              <w:r>
                <w:rPr><w:color w:val="1E293B"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Phetsarath OT"/></w:rPr>
                <w:t>{esc(line)}</w:t>
              </w:r>
            </w:p>'''
        return f'''<w:tbl>
          <w:tblPr>
            <w:tblW w:w="9360" w:type="dxa"/>
            <w:tblBorders>
              <w:top w:val="none"/>
              <w:left w:val="single" w:sz="24" w:color="{border}"/>
              <w:bottom w:val="none"/>
              <w:right w:val="none"/>
            </w:tblBorders>
            <w:tblCellMar>
              <w:top w:w="140" w:type="dxa"/>
              <w:left w:w="220" w:type="dxa"/>
              <w:bottom w:w="140" w:type="dxa"/>
              <w:right w:w="220" w:type="dxa"/>
            </w:tblCellMar>
          </w:tblPr>
          <w:tr>
            <w:tc>
              <w:tcPr>
                <w:shd w:val="clear" w:color="auto" w:fill="{bg}"/>
                <w:tcW w:w="9360" w:type="dxa"/>
              </w:tcPr>
              {content}
            </w:tc>
          </w:tr>
        </w:tbl>
        <w:p><w:pPr><w:spacing w:after="160"/></w:pPr></w:p>'''

    def make_table(headers, rows, widths=None):
        if not widths:
            total = 9360
            col_w = total // len(headers)
            widths = [col_w] * len(headers)
        
        tbl = '<w:tbl>'
        tbl += '<w:tblPr>'
        tbl += '<w:tblW w:w="9360" w:type="dxa"/>'
        tbl += '<w:tblBorders>'
        tbl += '<w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>'
        tbl += '<w:left w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>'
        tbl += '<w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>'
        tbl += '<w:right w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>'
        tbl += '<w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>'
        tbl += '<w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>'
        tbl += '</w:tblBorders>'
        tbl += '<w:tblCellMar><w:top w:w="100" w:type="dxa"/><w:left w:w="140" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="140" w:type="dxa"/></w:tblCellMar>'
        tbl += '</w:tblPr>'
        
        # Header row
        tbl += '<w:tr><w:trPr><w:tblHeader/></w:trPr>'
        for h, w in zip(headers, widths):
            tbl += f'''<w:tc>
              <w:tcPr>
                <w:tcW w:w="{w}" w:type="dxa"/>
                <w:shd w:val="clear" w:color="auto" w:fill="0F172A"/>
              </w:tcPr>
              <w:p>
                <w:pPr><w:spacing w:after="0"/><w:jc w:val="center"/></w:pPr>
                <w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Phetsarath OT"/></w:rPr><w:t>{esc(h)}</w:t></w:r>
              </w:p>
            </w:tc>'''
        tbl += '</w:tr>'

        # Data rows
        for r_idx, row in enumerate(rows):
            bg = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
            tbl += '<w:tr>'
            for cell_idx, (c, w) in enumerate(zip(row, widths)):
                align = "center" if (cell_idx == 0 and len(str(c)) < 5) or "✅" in str(c) else "left"
                tbl += f'''<w:tc>
                  <w:tcPr>
                    <w:tcW w:w="{w}" w:type="dxa"/>
                    <w:shd w:val="clear" w:color="auto" w:fill="{bg}"/>
                  </w:tcPr>
                  <w:p>
                    <w:pPr><w:spacing w:after="0"/><w:jc w:val="{align}"/></w:pPr>
                    <w:r><w:rPr><w:color w:val="1E293B"/><w:sz w:val="19"/><w:szCs w:val="19"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Phetsarath OT"/></w:rPr><w:t>{esc(c)}</w:t></w:r>
                  </w:p>
                </w:tc>'''
            tbl += '</w:tr>'
            
        tbl += '</w:tbl><w:p><w:pPr><w:spacing w:after="160"/></w:pPr></w:p>'
        return tbl

    body = []

    # Title block
    body.append(p("AVATR AUTO SERVICE LAOS", bold=True, size=34, color="0284C7", align="center", space_after=40))
    body.append(p("ຄູ່ມືແມ່ບົດການມອບ-ຮັບລະບົບສະບັບສົມບູນ (Final System Handover Dossier)", bold=True, size=24, color="0F172A", align="center", space_after=60))
    body.append(p("MASTER SYSTEM SPECIFICATION & PRODUCTION HANDOVER HANDBOOK", bold=True, size=20, color="475569", align="center", space_after=180))

    # Metadata callout
    meta_lines = [
        "ສະບັບປັບປຸງທາງການ (Official Edition): v1.4.0 Final Production Handover",
        "ວັນທີມອບ-ຮັບງານ (Handover Date): 31 ຕຸລາ (October) 2026",
        "ເຈົ້າຂອງລະບົບ (Client Organization): ບໍລິສັດ ລາວທານີ ກົນຈັກໜັກ ຈຳກັດຜູ້ດຽວ (Laothani Tractor Sole Co., Ltd)",
        "ທີ່ຕັ້ງໂຊຣູມ (Showroom Location): ຖະໜົນ ໄກສອນ ພົມວິຫານ, ບ້ານ ສີວິໄລ, ເມືອງ ໄຊທານີ, ນະຄອນຫຼວງວຽງຈັນ, ສປປ ລາວ",
        "ສະຖານະການກວດສອບ (Verification Status): ຜ່ານການທົດສອບ Playwright E2E Test Suite 100% (15/15 Tests Passed)"
    ]
    body.append(callout("📋 ຂໍ້ມູນພື້ນຖານການມອບ-ຮັບງານ (Handover Metadata)", meta_lines, bg="F8FAFC", border="0EA5E9"))

    # Critical Scope Boundary Callout
    boundary_lines = [
        "1. ທີມພັດທະນາລະບົບ (Developer) ຮັບຜິດຊອບ: ພັດທະນາເວັບແອັບພລິເຄຊັນ SPA, ຖານຂໍ້ມູນ Supabase Cloud ທີ່ປອດໄພ, ເຄື່ອງຈັກອອກເອກະສານ A4 7 ແບບ, ໂຄງສ້າງເກັບຂໍ້ມູນບັນຊີ 10 ປີ, ລະບົບປ້ອງກັນຂາຍຊ້ຳ Atomic POS, ແລະ ລະບົບ Keep-Alive ຖານຂໍ້ມູນ 24/7.",
        "2. ບໍລິສັດ ລາວທານີ (ລູກຄ້າ) ຮັບຜິດຊອບ: ກຽມເນື້ອໃນຂໍ້ກຳນົດທາງກົດໝາຍ (Legal Terms & Policies), ກວດສອບ ແລະ ອະນຸມັດຂໍ້ຄວາມສັນຍາຊື້-ຂາຍ/ສັນຍາຈອງ, ປ້ອນຂໍ້ມູນລູກຄ້າຕົວຈິງ, ລົດຕົວຈິງ (Master Data Entry), ແລະ ດຳເນີນການລົງລາຍເຊັນທາງການ.",
        "3. ຂໍ້ປະກາດສຳຄັນ: ທີມພັດທະນາລະບົບ 'ບໍ່ແມ່ນຝ່າຍກຽມເອກະສານສັນຍາ ແລະ ຂໍ້ມູນ' (The Developer is NOT the legal drafting or operational data entry party). ລະບົບໄດ້ຈັດກຽມ Template ມາດຕະຖານ ແລະ Data Schema ໄວ້ໃຫ້ຄົບຖ້ວນ ສ່ວນເນື້ອໃນທາງນິຕິກຳ ແລະ ອັດຕາດອກເບ້ຍເປັນໜ້າທີ່ຂອງລູກຄ້າ."
    ]
    body.append(callout("⚠️ ຂອບເຂດການແບ່ງຄວາມຮັບຜິດຊອບທາງກົດໝາຍ ແລະ ຂໍ້ມູນ (Critical Scope Boundary)", boundary_lines, bg="FEF2F2", border="DC2626"))

    # Section 1: Executive Summary
    body.append(heading("ພາກທີ 1: ບົດສະຫຼຸບພາບລວມ ແລະ ຂອບເຂດຄວາມຮັບຜິດຊອບ (Executive Summary)", 1))
    body.append(p("ລະບົບ AVATR Auto Service (Laos) ຖືກອອກແບບ ແລະ ພັດທະນາຂຶ້ນມາສະເພາະສຳລັບໂຊຣູມລົດໄຟຟ້າອັດສະລິຍະ AVATR ໃນ ສປປ ລາວ ເພື່ອເຊື່ອມໂຍງການເຮັດວຽກແບບດິຈິທອນ 100% ລະຫວ່າງ ຝ່າຍຂາຍ (Sales CRM), ຈຸດຂາຍ ແລະ ການເງິນ (POS Cashier), ຝ່າຍສາງ ແລະ ຊ່າງເຕັກນິກ (Warehouse & PDI/EV SOH), ແລະ ຜູ້ບໍລິຫານສູນ (Admin Dashboard & Top Sales)."))
    
    headers_matrix = ["🛠️ ໜ້າທີ່ຂອງທີມພັດທະນາລະບົບ (Developer Scope)", "🏢 ໜ້າທີ່ຂອງບໍລິສັດ ລາວທານີ (Client Operational Scope)"]
    rows_matrix = [
        ["1. ພັດທະນາ Web Application SPA ໂຫຼດໄວ < 1s ປອດໄພ", "1. ກຽມເນື້ອໃນຂໍ້ກຳນົດທາງກົດໝາຍ ແລະ ນະໂຍບາຍພາຍໃນ"],
        ["2. ສ້າງ Engine ອອກເອກະສານ A4 7 ແບບ ພ້ອມຟອນ Phetsarath", "2. ກວດສອບ ແລະ ອະນຸມັດຂໍ້ຄວາມສັນຍາຊື້-ຂາຍ ແລະ ເງື່ອນໄຂຄໍ້າປະກັນ"],
        ["3. ວາງໂຄງສ້າງຖານຂໍ້ມູນຕາມກົດໝາຍບັນຊີລາວ 10 ປີ (Option B)", "3. ປ້ອນຂໍ້ມູນລູກຄ້າຕົວຈິງ, ລົດຕົວຈິງ (Master Data Entry)"],
        ["4. ລະບົບປ້ອງກັນຂາຍຊ້ຳ Atomic Concurrency Lock", "4. ລົງລາຍເຊັນ ແລະ ປະທັບຕາເອກະສານທາງການກັບລູກຄ້າ"],
        ["5. ລະບົບ Keep-Alive ຖານຂໍ້ມູນ 24/7 ຟຣີ 0 ບາດຕະຫຼອດຊີບ", "5. ຈັດການສິດ ແລະ ມອບໝາຍພະນັກງານຈິງໃນໂຊຣູມ"]
    ]
    body.append(make_table(headers_matrix, rows_matrix, [4680, 4680]))

    # Section 2: Operational Modules
    body.append(heading("ພາກທີ 2: ໂມດູນການເຮັດວຽກຕົວຈິງ 6 ໂມດູນຫຼັກ (Operational Modules & Workflows)", 1))
    
    body.append(heading("1. ໂມດູນສາງລົດ ແລະ ການຮັບລົດເຂົ້າ (Stock & Inventory)", 2))
    body.append(p("ກວດສອບ VIN 17 ຕົວ: ບັງຄັບກວດເຊັກຮູບແບບ ແລະ ຄວາມຍາວເລກຕົວຖັງ 17 ຕົວອັກສອນຕາມມາດຕະຖານສາກົນ ISO 3779", bullet=True))
    body.append(p("ການຮັບລົດເຂົ້າ (GRN Dual-Save): ບັນທຶກສະຖານະ ready, ສ້າງໃບບິນຮັບເຂົ້າ type='import' ໃນ bills, ແລະ ແສຕມປະຫວັດລົງ stock_movements ພ້ອມກັນໃນ Single ACID Transaction", bullet=True))
    body.append(p("ລຸ້ນລົດມາດຕະຖານ 4 ລຸ້ນ: AVATR 11, AVATR 12, AVATR 07 ພ້ອມຕັດຮູບ Base64 ຂະໜາດໃຫຍ່ອອກ ໂຫຼດໜ້າລາຍການໄວລະດັບ < 100ms", bullet=True))

    body.append(heading("2. ໂມດູນຈຸດຂາຍໜ້າຮ້ານ ແລະ ສົ່ງມອບລົດ (POS Sales & Delivery)", 2))
    body.append(p("Atomic Concurrency Lock (record_vehicle_bill): ໃຊ້ PostgreSQL Row-level Lock (FOR UPDATE) ແລະ Advisory Lock ປ້ອງກັນການຂາຍລົດຄັນດຽວກັນພ້ອມກັນ 100%", bullet=True))
    body.append(p("ຮູບແບບການຊຳລະ: ຊື້ເງິນສົດ (Cash), ໂອນຜ່ານທະນາຄານ (BCEL OnePay), ຫຼື ຈັດໄຟແນນຜ່ອນຊຳລະ (Installment) ພ້ອມຄິດໄລ່ເງິນດາວ (USD ແລະ %)", bullet=True))
    body.append(p("ຄວາມປອດໄພຂອງສະຕັອກ: ລົດຈະບໍ່ຖືກປ່ຽນເປັນ 'sold' ຈົນກວ່າໃບບິນຈະຖືກບັນທຶກສຳເລັດ 100% ເທົ່ານັ້ນ", bullet=True))

    body.append(heading("3. ໂມດູນການເງິນ, ສັນຍາຜ່ອນ ແລະ ຈັດການບິນ (Bills & Installments)", 2))
    body.append(p("ໃບບິນຮັບເງິນງວດ (type='installment'): ບັນທຶກຄ່າງວດລາຍເດືອນ, ຕັດຍອດເງິນຕົ້ນຄົງເຫຼືອ, ແລະ ແຍກດອກເບ້ຍ", bullet=True))
    body.append(p("ການອັບໂຫຼດສະລິບເງິນ: ບີບອັດຮູບອັດຕະໂນມັດເທິງບຣາວເຊີເປັນ WebP <= 300 KB ແລະ ເບິ່ງຜ່ານ Private Signed URL ອາຍຸ 1 ຊົ່ວໂມງ", bullet=True))
    body.append(p("Soft-Delete ຍົກເລີກບິນ (status='voided'): ຍົກເລີກບິນ ຕັດຍອດອອກຈາກລາຍງານ ແລະ ຄືນສະຖານະລົດກັບມາເປັນ 'ready' ພ້ອມຂາຍອັດຕະໂນມັດ", bullet=True))

    body.append(heading("4. ໂມດູນລູກຄ້າສຳພັນ ແລະ ຫຼັງການຂາຍ (CRM & After-Sales)", 2))
    body.append(p("Customer Lifecycle: ຕິດຕາມສະຖານະລູກຄ້າຕັ້ງແຕ່ new_lead, ກຳລັງເຈລະຈາ, ເຊັນສັນຍາ, ຈ່າຍເງິນສຳເລັດ, ຈົນຮອດສົ່ງມອບລົດ", bullet=True))
    body.append(p("ຂໍ້ມູນເຕັກນິກ EV: ຜູກເລກໄມລ໌ (current_mileage_km), ສຸຂະພາບແບັດເຕີຣີ (battery_health_soh %), ວັນທີເລີ່ມ/ໝົດປະກັນ", bullet=True))
    body.append(p("1-Click Handover: ເມື່ອ Admin ລະງັບບັນຊີເຊວ (suspended) ສາມາດໂອນເຄສລູກຄ້າທີ່ຄ້າງໄປໃຫ້ເພື່ອນຮ່ວມງານດູແລຕໍ່ໄດ້ທັນທີ", bullet=True))

    body.append(heading("5. ລະບົບອອກເອກະສານທາງການ A4 7 ສະບັບ (Official A4 Documents Suite)", 2))
    body.append(p("ຮອງຮັບການພິມ ແລະ ດາວໂຫຼດ PDF ພາສາລາວ ຟອນ Phetsarath ມາດຕະຖານ A4 ຄົບ 7 ແບບ: Quotation, Booking, Sale Contract, PDI Sheet, Handover, Installment Receipt, ແລະ EV SOH Warranty. ທຸກຄັ້ງທີ່ມີການພິມຈະແສຕມ Audit Log ລົງ document_issuance_logs ອັດຕະໂນມັດ."))

    body.append(heading("6. ແດຊບອດໂຊຣູມ ແລະ ກະດານ Top Sales 4 ຫຼຽญກຽດຕິຍົດ", 2))
    body.append(p("4 ຫຼຽญກຽດຕິຍົດ: Top Gun (ຈຳນວນຄັນສູງສຸດ), Margin Hero (ຄຸມລາຄາຂາຍດີເດັ່ນ), Speedy Closer (ປິດການຂາຍໄວ), Customer Care (ດູແລລູກຄ້າຫຼັງການຂາຍດີເດັ່ນ). ຮັກສາຄວາມເປັນສ່ວນຕົວໂດຍເຊື່ອງຍອດເງິນລວມຂອງເພື່ອນຮ່ວມງານ."))

    # Section 3: Legal Templates & Lao Accounting Law
    body.append(heading("ພາກທີ 3: ໂຄງສ້າງເອກະສານສັນຍາ ແລະ ຂໍ້ມູນຕາມກົດໝາຍ (Legal Templates & Lao Law Compliance)", 1))
    body.append(p("ຕາຕະລາງ Data Dictionary ເພື່ອໃຫ້ຝ່າຍນິຕິກຳ ແລະ ບັນຊີຂອງ ບໍລິສັດ ລາວທານີ ນຳໄປກຽມເນື້ອໃນສັນຍາຕົວຈິງ:"))

    headers_dict = ["ເອກະສານທາງການ", "ຟິວຂໍ້ມູນຫຼັກທີ່ລະບົບດຶງມາວາງ (System Field Mapping)", "ຂໍ້ມູນທີ່ຝ່າຍບໍລິສັດຕ້ອງກຽມ (Company Legal Terms)"]
    rows_dict = [
        ["1. ໃບສະເໜີລາຄາ (Quotation)", "ຊື່ລູກຄ້າ, ເບີໂທ, ລຸ້ນລົດ, ສີ, ລາຄາ USD/LAK, ສ່ວນຫຼຸດ, ຂອງແຖມ", "ຂໍ້ກຳນົດອາຍຸໃບສະເໜີລາຄາ (ເຊັ່ນ: ໃຊ້ໄດ້ 15 ວັນ), ເງື່ອນໄຂການປ່ຽນແປງລາຄາ"],
        ["2. ສັນຍາຈອງລົດ (Booking)", "ຊື່ຜູ້ຈອງ, ເລກບັດປະຊາຊົນ/Passport, ເງິນມັດຈຳ, ວັນທີນັດຮັບລົດ", "ເງື່ອນໄຂການຄືນ/ຮິບເງິນມັດຈຳ, ເຫດສຸດວິໄສ (Force Majeure) ໃນການຂົນສົ່ງ"],
        ["3. ສັນຍາຊື້-ຂາຍ (Sale Contract)", "ຊື່ຜູ້ຊື້, ທີ່ຢູ່, VIN 17 ຕົວ, ເລກມໍເຕີ, ເງິນດາວ, ດອກເບ້ຍ, ຈຳນວນງວດ", "ຂໍ້ກຳນົດກຳມະສິດ, ການຍຶດລົດກໍລະນີຜິດນັດຊຳລະ, ຂໍ້ຕົກລົງສານຕັດສິນ ສປປ ລາວ"],
        ["4. ໃບກວດ PDI (PDI Sheet)", "VIN, ສະຖານະແບັດເຕີຣີ, ຊອບແວ, ຊື່ຊ່າງກວດ, ວັນທີກວດ", "ລາຍການມາດຕະຖານກວດເຊັກ 50 ຈຸດຂອງສູນບໍລິການ AVATR Laos"],
        ["5. ໃບມອບ-ຮັບລົດ (Handover)", "VIN, ປ້າຍທະບຽນ, ເລກໄມລ໌ເລີ່ມຕົ້ນ, ລາຍການອຸປະກອນແຖມ", "ຂໍ້ຍອມຮັບສະພາບລົດ, ການສິ້ນສຸດຄວາມຮັບຜິດຊອບຂອງສູນເມື່ອລົດອອກຈາກປະຕູ"],
        ["6. ໃບຮັບເງິນງວດ (Receipt)", "ເລກບິນ, ງວດທີ, ຈຳນວນເງິນຕົ້ນ, ດອກເບ້ຍ, ຍອດຄົງເຫຼືອ, ຊື່ຜູ້ຮັບເງິນ", "ເງື່ອນໄຂຄ່າປັບໃໝຈ່າຍຊ້າ (Late Fee Penalty Rate) ຕາມລະບຽບການເງິນ"],
        ["7. ໃບຄໍ້າປະກັນ SOH (Warranty)", "VIN, ວັນເລີ່ມ/ໝົດປະກັນ, ໄລຍະທາງ (ກມ), ຄ່າ SOH % ມາດຕະຖານ", "ເງື່ອນໄຂການໝົດປະກັນ (ເຊັ່ນ: ດັດແປງລະບົບໄຟ, ເກີດອຸບັດຕິເຫດຈົມນ້ຳ)"]
    ]
    body.append(make_table(headers_dict, rows_dict, [2340, 3510, 3510]))

    body.append(p("ການປະຕິບັດຕາມກົດໝາຍວ່າດ້ວຍການບັນຊີ ສປປ ລາວ 10 ປີ (10-Year Archiving):", bold=True))
    body.append(p("ລະບົບແຍກພາທິຊັນຕາຕະລາງບິນ ແລະ ລາຍການບິນຕາມປີບັນຊີ (bills_archive_2023..2027 ແລະ bill_items_archive_2023..2027) ພ້ອມສ້າງ Unified Audit View (v_bills_10_year_audit) ເຮັດໃຫ້ກວດສອບ ແລະ Export ປະຫວັດບິນຍ້ອນຫຼັງ 10 ປີ ໄດ້ໃນຄຳສັ່ງດຽວ ໄວລະດັບ < 400ms.", space_after=200))

    # Section 4: Database Architecture & Security
    body.append(heading("ພາກທີ 4: ສະຖາປັດຕະຍະກຳຖານຂໍ້ມູນ ແລະ ຄວາມປອດໄພ (Database, RLS & Cyber Hardening)", 1))
    body.append(p("1. ຖານຂໍ້ມູນ Supabase Cloud: ຕັ້ງຢູ່ສູນຂໍ້ມູນ Singapore Data Center (Primary URL: https://ivybsqtzrfwdamibbumc.supabase.co)", bullet=True))
    body.append(p("2. WAN Optimization (1-RTT RPC): Stored Procedure get_showroom_initial_data() ດຶງຂໍ້ມູນ Models, Vehicles, Customers, Roles, Settings ຈົບໃນ 1 HTTP Request (~688 ms)", bullet=True))
    body.append(p("3. Atomic Bill Number Sequence: ອອກເລກບິນລຽງລຳດັບຜ່ານ Sequence ຂອງ PostgreSQL ປ້ອງກັນເລກບິນຊ້ຳຊ້ອນ 100%", bullet=True))
    body.append(p("4. Zero-Leak Defense: Runtime Guard ຫ້າມຄີ service_role ຫຼຸດໄປໜ້າບຣາວເຊີ ແລະ ລະບົບ Session Inactivity Auto-Logout ຕັດການເຊື່ອມຕໍ່ຫາກບໍ່ມີການເຄື່ອນໄຫວເກີນ 30 ນາທີ", bullet=True))

    # Section 5: DevOps, Keep-Alive & DR
    body.append(heading("ພາກທີ 5: ລະບົບອັດຕະໂນມັດ, ການບຳລຸງຮັກສາ ແລະ ການກູ້ຄືນ (DevOps, Keep-Alive & DR)", 1))
    body.append(p("1. Keep-Alive Cron Job (.github/workflows/supabase-keepalive.yml): GitHub Actions ຍິງ Heartbeat ເຂົ້າຕາຕະລາງຖານຂໍ້ມູນທຸກໆ 3 ວັນ (ເວລາ 11:00 AM) ປ້ອງກັນ Supabase Free Tier ຫຼັບຊ່ວງວັນພັກຍາວ (ຟຣີ 0 ບາດຕະຫຼອດຊີບ)", bullet=True))
    body.append(p("2. E2E Test Suite: ຜ່ານການທົດສອບ Playwright ຄົບ 100% (15/15 Passed) ທັງ Auth, POS, Bills, CRM, Stock-In, WebP Compression, ແລະ Theme/Languages", bullet=True))
    body.append(p("3. Disaster Recovery: ໂຄ້ດຖືກຊິງຄ໌ຂຶ້ນ GitHub 3 Repositories (HM186812, pheuangvichithkeokisith-del, Bh1214646563) ແລະ ຊຸດ Migration ຄົບ 41 ໄຟລ໌ ສາມາດ Recreate ຖານຂໍ້ມູນໃໝ່ໄດ້ພາຍໃນ 5 ນາທີ", bullet=True))

    # Section 6: Credentials & Acceptance Checklist
    body.append(heading("ພາກທີ 6: ຂໍ້ມູນການເຂົ້າໃຊ້ງານ ແລະ ເຊັກລິສກວດຮັບງານ (Access Credentials & Acceptance Sign-off)", 1))
    body.append(p("ບັນຊີຜູ້ດູແລລະບົບເລີ່ມຕົ້ນ (Initial Super Admin):", bold=True))
    body.append(p("ອີເມວ: test01@gmail.com | ສິດທິ: super_admin (ແນະນຳໃຫ້ຜູ້ບໍລິຫານຂອງ ລາວທານີ ເຂົ້າໄປປ່ຽນລະຫັດຜ່ານໃນໜ້າ Profile ຫຼັງຮັບມອບລະບົບ)"))

    headers_chk = ["ລຳດັບ", "ລາຍການກວດຮັບງານ (Deliverables Checklist)", "ສະຖານະລະບົບ", "ຜົນການກວດສອບ"]
    rows_chk = [
        ["1", "ລະບົບເວັບແອັບພລິເຄຊັນ SPA ໂຫຼດໄວ < 1 ວິນາທີ (Main JS ~215 kB)", "✅ ສຳເລັດ 100%", "ຜ່ານเกณฑ์ Build Code 0"],
        ["2", "ລະບົບຮັບລົດເຂົ້າສາງ (Stock-In) ກວດ VIN 17 ຕົວ ແລະ ອອກໃບ GRN", "✅ ສຳເລັດ 100%", "ຜ່ານ E2E Stock Suite"],
        ["3", "ຈຸດຂາຍໜ້າຮ້ານ (POS) ຕັດສະຕັອກ Atomic ປ້ອງກັນຂາຍລົດຊ້ຳຊ້ອນ", "✅ ສຳເລັດ 100%", "ຜ່ານ E2E POS Suite"],
        ["4", "ລະບົບການເງິນ, ບິນງວດ, ແນບສະລິບ WebP ແລະ Signed URL 1 ຊມ.", "✅ ສຳເລັດ 100%", "ຜ່ານ E2E Storage Suite"],
        ["5", "ເຄື່ອງຈັກພິມເອກະສານທາງການ A4 ພາສາລາວ ຄົບ 7 ຮູບແບບ ພ້ອມ Audit Log", "✅ ສຳເລັດ 100%", "ຜ່ານການກວດສອບ Template"],
        ["6", "ລະບົບພາທິຊັນເກັບຂໍ້ມູນບິນຍ້ອນຫຼັງ 10 ປີ ຕາມກົດໝາຍບັນຊີລາວ", "✅ ສຳເລັດ 100%", "ຜ່ານ Live View Query 320ms"],
        ["7", "ລະບົບອັດຕະໂນມັດ Keep-Alive Ping ທຸກ 3 ວັນ ປ້ອງກັນ Supabase ຫຼັບ", "✅ ສຳເລັດ 100%", "ຕິດຕັ້ງເທິງ GitHub Actions ແລ້ວ"],
        ["8", "ຊຸດທົດສອບອັດຕະໂນມັດ Playwright E2E 15 ການທົດສອບ", "✅ ສຳເລັດ 100%", "ຜ່ານ 15/15 Tests (Code 0)"]
    ]
    body.append(make_table(headers_chk, rows_chk, [700, 4860, 1800, 2000]))

    # Sign-off block
    body.append(heading("ລາຍເຊັນມອບ - ຮັບງານ (Handover Sign-off)", 2))
    headers_sig = [
        "ຝ່າຍມອບງານ (System Development Team)",
        "ຝ່າຍຮັບມອບງານ (Laothani Tractor Sole Co., Ltd)"
    ]
    rows_sig = [
        [
            "ລົງຊື່: ................................................................\n\n( ................................................................ )\n\nຕຳແໜ່ງ: Lead System Engineer\n\nວັນທີ: 31 / 10 / 2026",
            "ລົງຊື່: ................................................................\n\n( ................................................................ )\n\nຕຳແໜ່ງ: ............................................................\n\nວັນທີ: ...... / ...... / 2026"
        ]
    ]
    body.append(make_table(headers_sig, rows_sig, [4680, 4680]))

    # Assemble Document XML
    document_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    {''.join(body)}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1200" w:right="1200" w:bottom="1200" w:left="1200" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>'''

    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as docx:
        docx.writestr('[Content_Types].xml', content_types)
        docx.writestr('_rels/.rels', rels)
        docx.writestr('word/_rels/document.xml.rels', document_rels)
        docx.writestr('word/styles.xml', styles)
        docx.writestr('word/document.xml', document_xml)

    print(f"Successfully generated Final Handover Docx at: {output_path}")

if __name__ == '__main__':
    target = 'docs/handover/AVATR_FINAL_HANDOVER_HANDBOOK_LAO_ENG.docx'
    os.makedirs(os.path.dirname(target), exist_ok=True)
    create_handover_docx(target)
