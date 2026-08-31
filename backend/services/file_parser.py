import io
import re
from typing import Optional
from pypdf import PdfReader

class FileParser:
    @staticmethod
    def extract_text(filename: str, file_bytes: bytes) -> str:
        """
        Extracts plain text from uploaded files (PDF, TXT, MD, DOCX/DOC).
        """
        filename_lower = filename.lower()
        
        # 1. Handle PDF
        if filename_lower.endswith('.pdf'):
            try:
                reader = PdfReader(io.BytesIO(file_bytes))
                extracted_pages = []
                for i, page in enumerate(reader.pages):
                    text = page.extract_text()
                    if text:
                        extracted_pages.append(text.strip())
                full_text = "\n\n".join(extracted_pages)
                return full_text.strip()
            except Exception as e:
                return f"[PDF Extraction Note: Could not read PDF stream - {str(e)}]"

        # 2. Handle Text, Markdown, CSV, JSON
        if filename_lower.endswith(('.txt', '.md', '.json', '.vtt', '.srt', '.csv')):
            try:
                return file_bytes.decode('utf-8', errors='replace').strip()
            except Exception:
                return file_bytes.decode('latin-1', errors='replace').strip()

        # 3. Handle DOCX
        if filename_lower.endswith('.docx'):
            try:
                import zipfile
                import xml.etree.ElementTree as ET
                
                with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
                    xml_content = z.read('word/document.xml')
                    tree = ET.fromstring(xml_content)
                    paragraphs = []
                    for elem in tree.iter():
                        if elem.tag.endswith('}p'):
                            texts = [node.text for node in elem.iter() if node.text]
                            if texts:
                                paragraphs.append("".join(texts))
                    return "\n".join(paragraphs).strip()
            except Exception as e:
                return file_bytes.decode('utf-8', errors='ignore').strip()

        # Default fallback
        try:
            return file_bytes.decode('utf-8', errors='replace').strip()
        except Exception:
            return f"[Unsupported binary file format for {filename}]"
