from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
import os

pdf_path = r'C:/Users/ASUS/.gemini/antigravity/scratch/cartrust-ai/sample-documents/brake_invoice_demo.pdf'
doc = SimpleDocTemplate(pdf_path, pagesize=letter)
styles = getSampleStyleSheet()

elements = []
elements.append(Paragraph('<b>APEX AUTO CARE</b>', styles['Heading1']))
elements.append(Paragraph('104 Auto Hub, Bhopal MP | Contact: +91 755 1234567', styles['Normal']))
elements.append(Spacer(1, 15))

elements.append(Paragraph('<b>TAX INVOICE / SERVICE RECEIPT</b>', styles['Heading2']))
elements.append(Paragraph('Invoice Number: <b>INV-DEMO-1001</b>', styles['Normal']))
elements.append(Paragraph('Vendor: Apex Auto Care', styles['Normal']))
elements.append(Paragraph('Date: 2025-08-14', styles['Normal']))
elements.append(Paragraph('Vehicle VIN: <b>DEMO-VIN-HC-2019-001</b>', styles['Normal']))
elements.append(Paragraph('Recorded Odometer: <b>72300 km</b>', styles['Normal']))
elements.append(Spacer(1, 15))

table_data = [
    ['Item Description', 'Part #', 'Qty', 'Unit Price (INR)', 'Total (INR)'],
    ['Front Brake Pads Set (OEM Spec)', 'BP-HON-CITY-01', '1', '6,970.00', '6,970.00'],
    ['Brake Caliper Servicing & Labor', 'LABOR-BRK-02', '1', '1,530.00', '1,530.00'],
    ['', '', '', 'Subtotal:', '7,203.39'],
    ['', '', '', 'GST (18%):', '1,296.61'],
    ['', '', '', '<b>Total Amount:</b>', '<b>8500.00</b>']
]
t = Table(table_data, colWidths=[200, 100, 40, 100, 100])
t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E2E8F0')),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold')
]))
elements.append(t)
doc.build(elements)
print('Sample invoice PDF generated at:', pdf_path)
