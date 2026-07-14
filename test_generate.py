import requests
from pymongo import MongoClient

# 1. Fetch questions from MongoDB to use in payload
client = MongoClient('mongodb://localhost:27017')
db = client['question_paper_generator']
questions_col = db['questions']

# Fetch and serialize
def get_serialized_questions(filter_query):
    qs = list(questions_col.find(filter_query))
    for q in qs:
        q['_id'] = str(q['_id'])
    return qs

questions_a = get_serialized_questions({'subject_code': 'OCS353', 'part': 'A'})[:10]

# Part B has 5 units. Select 2 questions per unit.
part_b = []
for unit in ["Unit I", "Unit II", "Unit III", "Unit IV", "Unit V"]:
    unit_qs = get_serialized_questions({'subject_code': 'OCS353', 'part': 'B', 'unit': unit})[:2]
    part_b.append(unit_qs)

# Part C. Select 2 questions.
part_c = get_serialized_questions({'subject_code': 'OCS353', 'part': 'C'})[:2]

if len(questions_a) < 10:
    print(f"Error: Not enough Part A questions found in DB (found {len(questions_a)})")
    exit(1)
if any(len(pair) < 2 for pair in part_b):
    print("Error: Some Part B units do not have 2 questions in DB")
    exit(1)
if len(part_c) < 2:
    print(f"Error: Not enough Part C questions found in DB (found {len(part_c)})")
    exit(1)

# 2. Build payload
payload = {
    "config": {
        "institution_name": "JAYA EDUCATIONAL TRUST",
        "exam_name": "MODEL EXAMINATION",
        "regulation": "2021-Regulation",
        "semester": "ODD SEMESTER-2025-26",
        "subject_code": "OCS353",
        "subject_name": "Data Science fundamentals",
        "degree_branch_sem": "BE/BTECH/ CIVIL/AERO/MECH/EEE/TEXT/VII",
        "time": "3 Hours",
        "max_marks": 100,
        "set": "SET-IV",
        "date": "03-07-2026"
    },
    "part_a": questions_a,
    "part_b": part_b,
    "part_c": part_c
}

# 3. Call API
print("Sending generation request to backend...")
response = requests.post('http://localhost:8000/api/generate-docx', json=payload)

print("Status Code:", response.status_code)
if response.status_code == 200:
    output_path = r'c:\Users\Deepak\Projects\Qn\Generated_Paper_Test.docx'
    with open(output_path, 'wb') as f:
        f.write(response.content)
    print(f"Success! Generated question paper saved to: {output_path}")
else:
    print("Failed! Response:", response.text)
