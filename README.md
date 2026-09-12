# Question Paper Generator (Qn)

An automated question bank parser and university examination question paper generator supporting **Anna University Regulation 2021** and **Regulation 2025** formats (Continuous Assessment Tests: CAT-1, CAT-2, CAT-3 and Model Examinations).

---

## 📋 Prerequisites

Before running the application, ensure you have the following installed:

1. **Python**: Version 3.10 or higher
2. **Node.js**: Version 18 or higher (with npm)
3. **MongoDB**: Local MongoDB instance running on `localhost:27017` or a MongoDB Atlas URI

---

## 🚀 Quick Start (Recommended)

You can launch both the **Backend API** and **Frontend UI** with a single command from the project root directory:

```bash
python run.py
```

- **Frontend URL**: `http://localhost:5173`
- **Backend API Docs (Swagger UI)**: `http://localhost:8000/docs`

> **Note**: Press `Ctrl + C` in the terminal to stop both backend and frontend servers simultaneously.

---

## 🛠️ Manual Setup & Running Separately

If you prefer to run the backend and frontend in separate terminals:

### 1. Backend Setup

```bash
# Navigate to the backend directory
cd backend

# Create a virtual environment (optional but recommended)
python -m venv .venv

# Activate the virtual environment
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the backend server
python run.py
```

The backend will start at: `http://localhost:8000`

---

### 2. Frontend Setup

```bash
# Open a new terminal and navigate to the frontend directory
cd frontend

# Install Node.js dependencies
npm install

# Start the development server
npm run dev
```

The frontend will start at: `http://localhost:5173`

---

## ⚙️ Environment Configuration

### Backend (`backend/.env`)
Copy `backend/.env.example` to `backend/.env` if not present:
```env
MONGODB_URL=mongodb://localhost:27017
DB_NAME=question_paper_generator
JWT_SECRET=your_secret_key_here
ACCESS_TOKEN_EXPIRE_MINUTES=1440
LOG_LEVEL=INFO
```

### Frontend (`frontend/.env`)
Copy `frontend/.env.example` to `frontend/.env` if not present:
```env
VITE_API_BASE_URL=http://localhost:8000/api
```

---

## ✨ Features

- **Question Bank Ingestion**: Upload `.docx` or `.pdf` files; extracts questions, units, Bloom's Knowledge Levels (KL: K1-K6), Course Outcomes (CO1-CO5), and diagrams.
- **Drag-and-Drop Question Paper Builder**: Organize questions into Part A, Part B, and Part C with live unit and cognitive level validations.
- **Support for Partial Downloads**: Download generated `.docx` question papers anytime—even if all slots aren't filled yet. Unfilled slots are kept cleanly blank in the downloaded Word document.
- **Multiple Paper Sets**: Easily manage multiple paper variants (SET-I, SET-II, SET-III) per subject.
- **Automated Table of Specifications (ToS)**: Real-time calculation of cognitive level distribution and unit marks breakdown.
- **Template Compatibility**: Generates pixel-perfect official Anna University examination `.docx` templates.
