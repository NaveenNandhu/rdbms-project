# 🚀 DB Insight AI
### AI-Powered RDBMS Analyzer, Database Design Validator & Educational Learning Platform

**DB Insight AI** is a production-grade, educational relational database design analysis platform architected for college students, software engineers, and database learners. It bridges the gap between theoretical database normalization and practical SQL architecture through deterministic rule-based validation, interactive ER visualization, and AI-powered educational tutoring.

---

## 🌟 Key Highlights & Architectural Features

### 1. Multiple Input Methods
- **SQL Code Input**: Paste SQL DDL or upload `.sql` files with multi-dialect support (PostgreSQL, MySQL, SQLite). Parses `CREATE TABLE`, `ALTER TABLE`, inline and table constraints, composite keys, and data types.
- **ER Diagram Image Input**: Accepts PNG, JPG, JPEG, WEBP, and PDF diagrams created in Figma, Canva, draw.io, or Lucidchart.
- **Handwritten Diagram Recognition**: Multi-stage OCR pipeline (rotation alignment, contrast filtering, bounding box extraction) for notebook photos and whiteboard drawings with confidence scoring.
- **Visual Table Builder**: Interactive visual studio to create relational tables, define attributes, assign primary/foreign keys, and specify cardinality.
- **Human Confirmation Screen**: Pre-analysis review screen flagging low-confidence OCR fields with yellow badges for verification before analysis runs.

### 2. Deterministic Database Analysis Engine
- **Normalization Analyzer (1NF to BCNF)**:
  - **1NF**: Enforces attribute atomicity and detects repeating column patterns (`phone1, phone2`).
  - **2NF**: Identifies candidate keys and eliminates partial functional dependencies on composite keys.
  - **3NF**: Eliminates transitive dependencies between non-prime attributes ($X \rightarrow Y$).
  - **BCNF**: Strictly verifies that every non-trivial determinant is a superkey.
  - **Student Functional Dependency Input**: Students can manually define custom dependencies ($X \rightarrow Y$) to re-run formal normalization proofs.
- **Integrity Constraint Checker**:
  - **Entity Integrity**: Validates primary key presence, uniqueness, and non-nullability.
  - **Referential Integrity**: Checks foreign key target tables, referenced column types, and `ON DELETE` actions.
  - **Domain Integrity**: Validates domain data types and NOT NULL enforcement.
  - **User-Defined Integrity**: Checks domain boundary conditions and CHECK constraints.
  - *Distinguishes Schema-Level checks from live Data-Level checks.*
- **Database Anomaly Detector**:
  - Synthesizes realistic concrete sample rows from the student's schema to visually demonstrate **Insertion**, **Update**, and **Deletion** anomalies.
- **Auto-Correction & Recommendation Engine**:
  - Severity ranking: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`.
  - Generates side-by-side **Before & After schema comparisons** and **Corrected SQL** scripts.

### 3. Interactive ER Visualizer (Cytoscape.js)
- Pan, zoom, drag-and-drop table nodes.
- Crow's foot and cardinality notation (1:1, 1:N, M:N, junction tables).
- Node highlighting, relationship tracing, and table detail inspector drawer.
- One-click **Export as PNG**.

### 4. AI Database Tutor & Dual Learning Modes
- Context selector: **Entire Database**, **Current Table**, or **Analysis Session**.
- **Beginner Mode**: Approachable analogies, intuitive explanations, and step-by-step guidance.
- **Advanced Mode**: Formal relational theory, candidate key closures, relational algebra, and Boyce-Codd proofs.
- **Pluggable AI Provider**: Works seamlessly with Google Gemini, OpenAI, or the built-in offline educational tutor.

### 5. Learning Center & Curriculum
- Comprehensive units and topics covering Relational Theory, ER Modeling, Normalization, Integrity, and Anomalies.
- Interactive multiple-choice quizzes with scoring and rationales.
- **Professor / Administrator Panel**: Professors can add, edit, and organize units, topics, and assignments dynamically.

### 6. Executive PDF Audit Reports
- Generates professional, publication-quality PDF reports covering all 14 standard database audit sections.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | Angular 20 (Standalone Components, Signals, RxJS) |
| **Styling & Design System** | Tailwind CSS (Clean white theme with `#F97316` orange accents) |
| **Typography** | Inter & JetBrains Mono |
| **ER Graph Visualization** | Cytoscape.js |
| **Backend Framework** | Node.js, Express.js, TypeScript |
| **ORM & Database** | Prisma ORM with SQLite (Local default) & PostgreSQL support |
| **OCR & Vision** | Tesseract.js / Image processing pipeline |
| **PDF Generation** | PDFKit |
| **Authentication** | JWT, bcryptjs password hashing |

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js v20.x or higher
- npm v10.x or higher

### 1. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies (already installed)
npm install

# Push database schema and generate Prisma client
npx prisma db push

# Seed database with demo curriculum, users, and pre-calculated projects
npm run prisma:seed

# Start backend development server (Runs on http://localhost:5000)
npm run dev
```

### 2. Frontend Setup
```bash
# Open a new terminal and navigate to frontend
cd frontend

# Install dependencies (already installed)
npm install

# Start Angular development server (Runs on http://localhost:4200)
npm start
```

### 3. Access the Application
Open your browser and visit: **[http://localhost:4200](http://localhost:4200)**

---

## 🔑 Demo Accounts

The database is pre-seeded with three accounts for evaluation:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Student** | `student@dbinsight.ai` | `password123` | Upload designs, run analysis, take quizzes, ask AI tutor |
| **Professor** | `prof@dbinsight.ai` | `password123` | All student features + Curriculum & Syllabus Management |
| **Administrator** | `admin@dbinsight.ai` | `password123` | Full administrative privileges |

*Tip: You can also switch roles instantly using the "Role" dropdown pill in the top navigation bar!*

---

## 🔒 Security Architecture
- **Zero Arbitrary Execution**: User SQL is parsed strictly into an Abstract Syntax Tree (AST) using safe tokenization. Uploaded SQL is **never executed** directly against the application database.
- **Safe Credentials**: AI API keys (`GEMINI_API_KEY`, `OPENAI_API_KEY`) are kept in backend environment variables and are never transmitted to client browsers.

---

## 📄 License
MIT License. Built for university computer science departments and database learners.
