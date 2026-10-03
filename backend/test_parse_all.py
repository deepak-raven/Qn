import os
import glob
from app.parser import parse_question_bank_docx

files = glob.glob("../Question Banks/*.docx") + glob.glob("uploaded_qbs/*.docx")
for fpath in files:
    print("=" * 60)
    print("FILE:", fpath)
    with open(fpath, "rb") as f:
        file_bytes = f.read()
    questions = parse_question_bank_docx(file_bytes, "TEST", "6")
    print(f"Total questions parsed: {len(questions)}")
    for i, q in enumerate(questions):
        txt = q["text"]
        if txt.startswith("ples.") or "ples." in txt or len(txt) < 25:
            print(f"  [{i}] (Part {q['part']}, {q['kl']}, {q['co']}): {txt}")
