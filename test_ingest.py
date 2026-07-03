import requests
import os

url = 'http://localhost:8000/api/upload-docx'
file_path = r'c:\Users\Deepak\Projects\Qn\Question Banks\Question Bank.docx'

if not os.path.exists(file_path):
    print("Error: Question Bank file not found!")
    exit(1)

print("Ingesting question bank...")
with open(file_path, 'rb') as f:
    files = {'file': (os.path.basename(file_path), f, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')}
    data = {
        'subject_code': 'OCS353',
        'subject_name': 'Data Science fundamentals',
        'semester': 'VII',
        'regulation': '2021'
    }
    
    response = requests.post(url, files=files, data=data)

print("Status Code:", response.status_code)
try:
    print("Response JSON:", response.json())
except Exception:
    print("Response Text:", response.text)
