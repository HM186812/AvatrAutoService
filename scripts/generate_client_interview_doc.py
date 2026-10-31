import zipfile
import io
import os

def create_docx(filename):
    # XML templates for a professional Word document
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
        <w:lang w:val="th-TH"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="160" w:line="276" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
</w:styles>'''

    # Building document body elements
    # Helper functions for WordML elements
    def p(text="", bold=False, size=22, color="1E293B", align="left", space_after=160, italic=False, bullet=False):
        b_tag = "<w:b/>" if bold else ""
        i_tag = "<w:i/>" if italic else ""
        al_tag = f'<w:jc w:val="{align}"/>' if align != "left" else ""
        p_indent = '<w:ind w:left="360" w:hanging="240"/>' if bullet else ""
        bullet_char = "• " if bullet else ""
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
            <w:t xml:space="preserve">{bullet_char}{text}</w:t>
          </w:r>
        </w:p>'''

    def heading(text, level=1):
        if level == 1:
            return f'''<w:p>
              <w:pPr>
                <w:spacing w:before="360" w:after="160"/>
                <w:pBdr><w:bottom w:val="single" w:sz="12" w:space="4" w:color="0284C7"/></w:pBdr>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:b/>
                  <w:color w:val="0369A1"/>
                  <w:sz w:val="30"/>
                  <w:szCs w:val="30"/>
                  <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Phetsarath OT"/>
                </w:rPr>
                <w:t>{text}</w:t>
              </w:r>
            </w:p>'''
        elif level == 2:
            return f'''<w:p>
              <w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>
              <w:r>
                <w:rPr>
                  <w:b/>
                  <w:color w:val="0F172A"/>
                  <w:sz w:val="26"/>
                  <w:szCs w:val="26"/>
                  <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Phetsarath OT"/>
                </w:rPr>
                <w:t>{text}</w:t>
              </w:r>
            </w:p>'''
        else:
            return f'''<w:p>
              <w:pPr><w:spacing w:before="160" w:after="80"/></w:pPr>
              <w:r>
                <w:rPr>
                  <w:b/>
                  <w:color w:val="334155"/>
                  <w:sz w:val="24"/>
                  <w:szCs w:val="24"/>
                  <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Phetsarath OT"/>
                </w:rPr>
                <w:t>{text}</w:t>
              </w:r>
            </w:p>'''

    def callout(title, body_lines, bg="F0F9FF", border="0284C7"):
        content = ""
        content += f'''<w:p>
          <w:pPr><w:spacing w:after="80"/></w:pPr>
          <w:r>
            <w:rPr><w:b/><w:color w:val="{border}"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>
            <w:t>{title}</w:t>
          </w:r>
        </w:p>'''
        for line in body_lines:
            content += f'''<w:p>
              <w:pPr><w:spacing w:after="60"/></w:pPr>
              <w:r>
                <w:rPr><w:color w:val="1E293B"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr>
                <w:t>{line}</w:t>
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
              <w:top w:w="120" w:type="dxa"/>
              <w:left w:w="200" w:type="dxa"/>
              <w:bottom w:w="120" w:type="dxa"/>
              <w:right w:w="200" w:type="dxa"/>
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
        tbl += '<w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>'
        tbl += '<w:left w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>'
        tbl += '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>'
        tbl += '<w:right w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>'
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
                <w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>{h}</w:t></w:r>
              </w:p>
            </w:tc>'''
        tbl += '</w:tr>'

        # Rows
        for r_idx, row in enumerate(rows):
            bg = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
            tbl += '<w:tr>'
            for cell_idx, (c, w) in enumerate(zip(row, widths)):
                align = "center" if cell_idx == 0 or "%" in str(c) else "left"
                tbl += f'''<w:tc>
                  <w:tcPr>
                    <w:tcW w:w="{w}" w:type="dxa"/>
                    <w:shd w:val="clear" w:color="auto" w:fill="{bg}"/>
                  </w:tcPr>
                  <w:p>
                    <w:pPr><w:spacing w:after="0"/><w:jc w:val="{align}"/></w:pPr>
                    <w:r><w:rPr><w:color w:val="1E293B"/><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr><w:t>{c}</w:t></w:r>
                  </w:p>
                </w:tc>'''
            tbl += '</w:tr>'
            
        tbl += '</w:tbl><w:p><w:pPr><w:spacing w:after="160"/></w:pPr></w:p>'
        return tbl

    body = []

    # Title Block
    body.append(p("AVATR AUTO SERVICE LAOS", bold=True, size=36, color="0284C7", align="center", space_after=60))
    body.append(p("ບໍລິສັດ ລາວທານີ ກົນຈັກໜັກ ຈຳກັດຜູ້ດຽວ (Laothani Tractor Sole Co., Ltd)", bold=True, size=24, color="334155", align="center", space_after=120))
    body.append(p("ເອກະສານສຳຫຼວດຄວາມຕ້ອງການ ແລະ ແຜນງານດ້ານກົດໝາຍບັນຊີ 10 ປີ ພ້ອมການບໍລິຫານພື້ນທີ່ຖານຂໍ້ມູນ", italic=True, size=22, color="64748B", align="center", space_after=40))
    body.append(p("เอกสารสำรวจความต้องการและข้อตกลง: การบริหารจัดการข้อมูล ความจุฐานข้อมูล และการปฏิบัติตามกฎหมายบัญชี สปป.ลาว 10 ปี", italic=True, size=20, color="64748B", align="center", space_after=240))

    body.append(callout("📌 วัตถุประสงค์ของเอกสารฉบับนี้ (Executive Purpose)", [
        "1. เพื่อนำเสนอแผนสถาปัตยกรรมระบบที่รองรับ 'กฎหมายว่าด้วยการบัญชี สปป.ลาว 10 ปี' อย่างถูกต้อง 100%",
        "2. เพื่อกำหนดแนวนโยบายการจัดเก็บข้อมูลไม่ให้พื้นที่เซิร์ฟเวอร์เต็มตลอดอายุการใช้งาน",
        "3. เพื่อควบคุมต้นทุนค่าใช้จ่ายโครงสร้างพื้นฐานคลาวด์ให้อยู่ในระดับ 0 บาทถาวร (Free Tier ตลอดชีพ) โดยไม่มีภาระรายเดือน",
        "4. เพื่อสรุปข้อตกลงร่วมกันระหว่างทีมพัฒนาระบบ และฝ่ายบริหาร/ฝ่ายบัญชีของ บริษัท ลาวธานี กลจักรหนัก จำกัดผู้เดียว"
    ], bg="F0FDF4", border="16A34A"))

    # Section 1: Baseline Data
    body.append(heading("1. ข้อมูลตั้งต้นและขีดจำกัดทางเทคนิค (Baseline Infrastructure & Limits)", 1))
    body.append(p("ระบบปัจจุบันทำงานอยู่บนโครงสร้างพื้นฐานระดับสากลที่มีเสถียรภาพสูง โดยมีข้อจำกัดและปริมาณการใช้งานจริงดังนี้:"))

    headers_1 = ["ทรัพยากร (Resource)", "เพดานโควตาฟรี (Free Limit)", "ใช้งานปัจจุบัน", "คงเหลือ", "การประเมินความเสี่ยง"]
    rows_1 = [
        ["พื้นที่ฐานข้อมูล (Database)", "500 MB", "1.3 MB", "498.7 MB", "ปลอดภัยสูงมาก (ใช้ไปเพียง 0.26%)"],
        ["พื้นที่จัดเก็บไฟล์ (Storage)", "1,000 MB (1 GB)", "~15 MB", "~985 MB", "จุดที่ต้องควบคุม (รูปสลิปอาจสะสมจนเต็ม)"],
        ["แบนด์วิธส่งออก (Egress)", "2 GB / เดือน", "< 0.1 GB / เดือน", "> 1.9 GB", "ปลอดภัยสูง (ระบบใช้ 1-RTT Init RPC)"],
        ["การเรียกใช้งาน (Edge Functions)", "500,000 ครั้ง / เดือน", "< 50 ครั้ง", "99.99%", "ปลอดภัยสูง ใช้งานเฉพาะตอนสร้างพนักงาน"],
        ["ระบบหยุดทำงาน (Auto-Pause)", "ไม่ใช้งานติดต่อกัน 7 วัน", "มีการใช้งานต่อเนื่อง", "-", "ความเสี่ยงปานกลาง (ช่วงวันหยุดยาว)"]
    ]
    widths_1 = [2400, 1800, 1400, 1400, 2360]
    body.append(make_table(headers_1, rows_1, widths_1))

    # Section 2: Core Problem & Legal Constraint
    body.append(heading("2. โจทย์ความท้าทายและข้อกำหนดทางกฎหมาย สปป.ลาว (The Challenge & Legal Context)", 1))
    body.append(p("การออกแบบระบบต้องตอบสนองต่อ 2 ปัจจัยที่ดูเหมือนจะขัดแย้งกันอย่างสมดุล:"))
    
    body.append(p("ปัจจัยที่ 1: กฎหมายว่าด้วยการบัญชี สปป.ลาว (ກົດໝາຍວ່າດ້ວຍການບັນຊີ) ມາດຕາ 38-40", bold=True, size=22, color="0F172A"))
    body.append(p("กฎหมายบัญชีกำหนดให้วิสาหกิจต้องเก็บรักษาเอกสารทางบัญชี บัญชีประจำวัน บัญชีแยกประเภท งบการเงิน และ 'เอกสารประกอบการลงบัญชี (สลิปโอนเงิน, ใบเสร็จรับเงิน, ใบส่งมอบรถ)' ไว้อย่างน้อย 10 ปี เพื่อให้เจ้าหน้าที่ส่วยสาอากรสามารถตรวจสอบย้อนหลังได้ตลอดเวลา", bullet=True))
    body.append(p("กฎหมายเปิดช่องให้อนุรักษ์เอกสารในรูปแบบ 'สื่ออิเล็กทรอนิกส์' ได้ แต่ต้องเก็บรักษาไว้ ณ ที่ตั้งของวิสาหกิจใน สปป.ลาว และต้องสามารถพิมพ์ออกมาหรือเรียกดูได้ทันทีเมื่อมีการตรวจตรา", bullet=True))

    body.append(p("ปัจจัยที่ 2: ข้อจำกัดพื้นที่ฟรี 1 GB บนคลาวด์ และเป้าหมายค่าใช้จ่าย 0 บาท", bold=True, size=22, color="0F172A"))
    body.append(p("ข้อมูลตัวเลขบิล (Text): บิล 1,000 ใบ ใช้พื้นที่เพียง ~1 MB ดังนั้นในเวลา 10 ปี ตัวเลขบิลทั้งหมดจะกินพื้นที่ไม่เกิน 30 MB ซึ่งไม่มีวันเต็มโควตา 500 MB ของฐานข้อมูล", bullet=True))
    body.append(p("ข้อมูลรูปภาพสลิป (Images): สลิป 1 รูปขนาด 100-300 KB หากขายรถและมีงานบริการปีละ 500-1,000 รายการ ในเวลา 3-4 ปี พื้นที่ Storage 1 GB จะเต็ม หากไม่มีการบริหารจัดการ", bullet=True))

    # Section 3: Architecture Solution
    body.append(heading("3. แนวทางแก้ไขเชิงสถาปัตยกรรม: ระบบจัดเก็บแบบแยกชั้น (Tiered Hybrid Storage)", 1))
    body.append(p("เราออกแบบให้ระบบทำงานประสานกัน 2 ชั้น เพื่อให้ถูกกฎหมาย 100% โดยที่พื้นที่คลาวด์ไม่มีวันเต็ม และไม่มีค่าใช้จ่ายเพิ่ม:"))

    body.append(callout("💡 ชั้นที่ 1: Live Cloud Buffer (บน Supabase Singapore - ออนไลน์สด 1-2 ปี)", [
        "• ตัวเลขบิล รายการบัญชี ประวัติลูกค้า และเลข VIN ทั้งหมดถูกเก็บไว้บน Cloud ถาวรตลอด 10 ปี (ไม่เปลืองที่)",
        "• รูปภาพสลิปการโอนเงิน (BCEL One) จะถูกแสดงผลสดบนหน้าเว็บย้อนหลัง 1-2 ปีเต็ม เพื่อให้เซลส์และบัญชีเปิดตรวจได้ทันที",
        "• มีระบบบีบอัดรูปภาพ WebP Client-Side ลดขนาดรูปเหลือเพียง 80-120 KB แต่ตัวเลขบัญชีคมชัด 100%"
    ], bg="F8FAFC", border="0284C7"))

    body.append(callout("📦 ชั้นที่ 2: Legal Cold Archive (ระบบปิดงบและสำรองเอกสารประจำปี 10 ปี)", [
        "• ทุกวันที่ 31 ธันวาคม เมื่อฝ่ายบัญชีปิดรอบปี จะมีปุ่ม '📦 ปิดงบประจำปี & สำรองเอกสาร 10 ปี'",
        "• ระบบจะรวมเอกสารทั้งปีเป็นไฟล์ก้อนเดียว เช่น AVATR_FINANCIAL_2026.zip ซึ่งประกอบด้วย:",
        "    1) ไฟล์สรุปยอดขาย บัญชีรับ-จ่าย ประจำปี (Excel / CSV ตามแบบส่วยสาอากรลาว)",
        "    2) โฟลเดอร์รูปภาพสลิปเงินโอนตัวจริงทุกใบ ตั้งชื่อตามเลขบิลและวันที่อย่างเป็นระเบียบ",
        "    3) ไฟล์รหัสความปลอดภัยดิจิทัล (SHA-256 Checksum) รับรองว่าเอกสารไม่เคยถูกแก้ไขหลังปิดงบ",
        "• ฝ่ายบัญชีดาวน์โหลดเก็บไว้ใน Google Drive ของบริษัท (ซึ่งฟรี 15 GB) หรือ External Harddisk ของโชว์รูม",
        "• เมื่อสำรองข้อมูลเรียบร้อย ระบบจะล้างไฟล์รูปสลิปเก่าของปีนั้นออกจาก Storage คืนพื้นที่ 1 GB กลับมาว่าง 100% เสมอ!"
    ], bg="FEFCE8", border="CA8A04"))

    # Section 4: Questionnaire for Client
    body.append(heading("4. แบบสอบถามและประเด็นปรึกษาหารือกับลูกค้า (Client Decision Questionnaire)", 1))
    body.append(p("โปรดนำคำถามทั้ง 5 ข้อนี้ไปหารือกับผู้บริหารและฝ่ายบัญชีของ บริษัท ลาวธานี กลจักรหนัก จำกัดผู้เดียว:"))

    # Question 1
    body.append(heading("ประเด็นที่ 1: การสำรองรูปภาพสลิปเงินโอนประจำปี (Accounting Slip Retention)", 2))
    body.append(p("คำถาม: 'ตามกฎหมายบัญชีลาว ตัวเลขบิลทั้งหมดยังคงอยู่บนระบบเว็บให้ตรวจสอบได้ครบ 10 ปีแน่นอน แต่สำหรับรูปภาพสลิปเงินโอน ทางฝ่ายบัญชีเห็นชอบหรือไม่ หากในทุกสิ้นปี ระบบจะมีปุ่มให้กดดาวน์โหลดสรุปสลิปทั้งปีเป็นไฟล์ ZIP เก็บลงคอมพิวเตอร์บริษัท แล้วล้างรูปเก่าบนเว็บเพื่อไม่ให้พื้นที่เต็มและใช้งานได้ฟรีตลอดไป?'", italic=True, size=21, color="0369A1"))
    body.append(p("[  ] เห็นชอบตามแนวทางนี้ (แนะนำ) - ระบบจะใช้งานฟรีได้ตลอดชีพ พื้นที่ไม่เต็ม และมีไฟล์สำรองถูกต้องตามกฎหมาย", bullet=True))
    body.append(p("[  ] ต้องการเก็บรูปสลิปบนเว็บไว้ตลอดไป - (หมายเหตุ: จะใช้งานฟรีได้ประมาณ 4-5 ปี จากนั้นจะมีค่าบริการรายเดือนของ Supabase ~$25/เดือน)", bullet=True))

    # Question 2
    body.append(heading("ประเด็นที่ 2: ขอบเขตการบันทึกภาพถ่ายในระบบ (Image Scope)", 2))
    body.append(p("คำถาม: 'ทางโชว์รูมมีความจำเป็นต้องอัปโหลดรูปถ่ายสภาพรถจริงรอบคัน (PDI) ลงในระบบทุกคันหรือไม่ หรือเน้นเฉพาะรูปสลิปการเงินเป็นหลัก?'", italic=True, size=21, color="0369A1"))
    body.append(p("[  ] เน้นเฉพาะสลิปการเงินและเอกสารส่งมอบ (แนะนำ) - ประหยัดพื้นที่สูงสุด รองรับการขายได้หลายพันคัน", bullet=True))
    body.append(p("[  ] ต้องการแนบรูปรถตรวจสภาพด้วย (1-2 รูป/คัน) - ระบบจะบีบอัดเป็น WebP ควบคุมขนาดให้อัตโนมัติ", bullet=True))

    # Question 3
    body.append(heading("ประเด็นที่ 3: สกุลเงินและอัตราแลกเปลี่ยนทางการ (BOL Currency Regulations)", 2))
    body.append(p("คำถาม: 'ตามระเบียบธนาคารแห่ง สปป.ลาว (BOL) ในการออกใบเสร็จรับเงินอย่างเป็นทางการ ต้องการให้พิมพ์เฉพาะยอดเงินกีบ (LAK) หรือพิมพ์ทั้งสกุล USD ควบคู่กับ LAK?'", italic=True, size=21, color="0369A1"))
    body.append(p("[  ] แสดงทั้งสกุลเงิน USD ($) และ LAK (₭) ควบคู่กัน (ปัจจุบันระบบตั้งค่าไว้แบบนี้)", bullet=True))
    body.append(p("[  ] แสดงเฉพาะเงินกีบ (LAK) ในบิลทางการ แต่แสดง USD ในหน้าจอขายหน้าร้าน", bullet=True))
    body.append(p("หมายเหตุเรื่องอัตราแลกเปลี่ยน: [  ] อิงเรตธนาคารการค้าลาว (BCEL) รายวัน  |  [  ] อิงเรตที่ผู้จัดการโชว์รูมกำหนดเอง", bullet=True))

    # Question 4
    body.append(heading("ประเด็นที่ 4: ภาษีมูลค่าเพิ่ม (VAT 10%) และเลขทะเบียนวิสาหกิจ (TIN)", 2))
    body.append(p("คำถาม: 'ราคารถยนต์ที่ตั้งขายหน้าร้าน เป็นราคาที่รวมภาษีมูลค่าเพิ่ม 10% แล้ว หรือต้องแยกแสดงยอดฐานภาษีและภาษี VAT 10% ในบิลทางการสำหรับลูกค้าองค์กร?'", italic=True, size=21, color="0369A1"))
    body.append(p("[  ] ราคารถรวม VAT 10% แล้ว (Inclusive)", bullet=True))
    body.append(p("[  ] ต้องการให้มีตัวเลือกว่าจะออกบิลแบบ 'รวม VAT' หรือ 'แยก VAT 10%' ในขั้นตอนออกบิล", bullet=True))
    body.append(p("ข้อมูลบนหัวบิล: เลขทะเบียนวิสาหกิจ (Enterprise Code) และเลขประจำตัวผู้เสียภาษี (TIN) ของ บ.ลาวธานี ที่ต้องการระบุ: ___________________________", italic=True))

    # Question 5
    body.append(heading("ประเด็นที่ 5: ช่องทางการส่งเอกสารให้ลูกค้า (WhatsApp Integration)", 2))
    body.append(p("คำถาม: 'ลูกค้าใน สปป.ลาว นิยมรับเอกสารทาง WhatsApp เป็นหลัก ทางโชว์รูมต้องการให้มีปุ่มคลิกเดียวเพื่อส่งใบเสนอราคา (Quotation) หรือใบเสร็จเข้า WhatsApp ลูกค้าโดยตรงหรือไม่?'", italic=True, size=21, color="0369A1"))
    body.append(p("[  ] ต้องการปุ่มส่ง WhatsApp ในหน้าออกใบเสนอราคาและบิล (เพิ่มความสะดวกและทันสมัย)", bullet=True))
    body.append(p("[  ] ยังไม่จำเป็นในระยะนี้ เน้นการพิมพ์เป็นกระดาษ A4 หรือเซฟเป็นไฟล์ PDF ในเครื่อง", bullet=True))

    # Section 5: Sign-off
    body.append(heading("5. บันทึกข้อตกลงและการลงนามรับทราบ (Sign-off & Acknowledgment)", 1))
    body.append(p("เอกสารฉบับนี้จัดทำขึ้นเพื่อใช้เป็นแนวทางปฏิบัติร่วมกันในการส่งมอบและใช้งานระบบ Avatr Auto Service ให้เกิดประสิทธิภาพสูงสุดและถูกต้องตามกฎหมาย"))
    
    headers_sig = ["ฝ่ายบริหาร / ตัวแทน บริษัท ลาวธานี กลจักรหนัก จำกัดผู้เดียว", "ผู้รับผิดชอบพัฒนาระบบ (System Engineering)"]
    rows_sig = [
        ["\n\nลงชื่อ: ................................................................\n(................................................................)\nตำแหน่ง: ............................................................\nวันที่: ...... / ...... / 2026",
         "\n\nลงชื่อ: ................................................................\n(................................................................)\nตำแหน่ง: Lead System Engineer\nวันที่: ...... / ...... / 2026"]
    ]
    body.append(make_table(headers_sig, rows_sig, [4680, 4680]))

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

    with zipfile.ZipFile(filename, 'w', zipfile.ZIP_DEFLATED) as docx:
        docx.writestr('[Content_Types].xml', content_types)
        docx.writestr('_rels/.rels', rels)
        docx.writestr('word/_rels/document.xml.rels', document_rels)
        docx.writestr('word/styles.xml', styles)
        docx.writestr('word/document.xml', document_xml)

    print(f"Successfully generated: {filename}")

if __name__ == '__main__':
    target = 'docs/AVATR_System_Capacity_and_Lao_Legal_Compliance_Interview_Guide.docx'
    os.makedirs(os.path.dirname(target), exist_ok=True)
    create_docx(target)
