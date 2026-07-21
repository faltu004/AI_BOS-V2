export function createSimplePdfBuffer(title: string, lines: string[]) {
  const content = `${title}\n\n${lines.join("\n")}`;
  const escaped = content.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${escaped.length + 64} >>
stream
BT
/F1 11 Tf
50 740 Td
14 TL
(${escaped}) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
trailer
<< /Root 1 0 R /Size 6 >>
startxref
0
%%EOF`;

  return Buffer.from(pdf);
}
