# RoomiesForms (SELU Internship Workflow System)

RoomiesForms is a capstone project designed to digitize the Computer Science Internship application process at Southeastern Louisiana University (SELU). It transforms a cumbersome, paper-based workflow into an intuitive, role-based digital system where students can submit internship forms, and faculty/department heads can review and approve them.

This repository serves as the starting point for a 5-person group project, implementing enterprise-grade architectural patterns to allow frontend and backend teams to collaborate without stepping on each other's toes.

## 🚀 Tech Stack

### Frontend (`/Web`)
*   **Framework:** React 18 (bootstrapped with Vite)
*   **Language:** TypeScript
*   **Routing:** React Router v6
*   **Forms:** React Hook Form
*   **Styling:** Custom CSS (SELU Green & Gold theme)

### Backend (`Google Apps Script` & `Google Sheets`)
*   **Architecture:** Serverless Web App (Google Apps Script) backed by Google Sheets
*   **Target Spreadsheet:** `RoomiesForms_Submissions_Test`
*   **API Protocol:** HTTP POST (JSON over `text/plain` to bypass CORS)
*   **Data Stores (9 Sheets):** `Submissions`, `Forms`, `Users`, `ReviewSteps`, `Assignments`, `Reviews`, `ExternalApprovals`, `AnonymousResponses`, `Notifications`
*   **Legacy Backend (`/Backend`):** Original .NET 10 Web API and SQLite schema (preserved for reference)

---

## 📂 File Structure

```text
RoomiesForms/
│
├── Backend/                        # .NET 10 Web API
│   ├── Controllers/                # HTTP API endpoints (Auth, Forms, Submissions)
│   ├── Data/                       # EF Core DbContext and database configurations
│   ├── DTOs/                       # Data Transfer Objects for strict API contracts
│   ├── Entities/                   # Database models mapped from the DBML schema
│   ├── Repositories/               # Repository & Unit of Work implementation for DB abstraction
│   ├── Services/                   # Core business logic (Submission workflows, Mock Data)
│   └── Program.cs                  # Application bootstrap and Dependency Injection setup
│
├── Web/                            # React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboards/         # Role-specific dashboard views (Student, Faculty)
│   │   │   └── forms/              # The 8 digitized SELU Internship React components
│   │   ├── context/                # Global state (JWT AuthContext)
│   │   ├── pages/                  # Main route pages (Login, Dashboard, FormView, SubmissionReview)
│   │   ├── services/               # Centralized Axios API interceptors
│   │   ├── types/                  # Shared TypeScript interfaces
│   │   ├── App.tsx                 # React Router configuration
│   │   └── index.css               # Global application styling
│   └── package.json
│
└── start.ps1                       # Convenience script to run both servers concurrently
```

---

## ✨ Features

*   **Role-Based Dashboards:** Distinct UI views for Students (to submit forms), Faculty (to review pending approvals), and Department Heads (for final sign-off).
*   **Digitized SELU Forms:** Hardcoded, intuitive React components for the entire CS Internship packet:
    *   CS 401: Internship Application
    *   CS 402: Employer Agreement
    *   CS 403: Measurable Learning Objectives
    *   CS 404: Time & Wage Report
    *   CS 405: Weekly Activity Log
    *   CS 410: Student's Evaluation of Employer
    *   CS 420: Employer's Evaluation of Student
    *   Exit Survey: CS Program Feedback
*   **Mock Authentication:** A seamless JWT-based mocking system that provisions users on-the-fly without needing a complex SSO setup during prototyping.
*   **Enterprise Architecture:** Clean separation of concerns on the backend (Controllers -> Services -> Repositories) ensuring high testability and clean team boundaries.

---

## 🛠️ Getting Started

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18+)

### Running Locally
To launch the React frontend development server, run:

```powershell
.\start.ps1
```

Or run directly within `Web/`:
```bash
cd Web
npm install
npm run dev
```

*   **Frontend URL:** `http://localhost:5173`
*   **Backend:** Powered live by Google Apps Script and Google Sheets (configured via `Web/.env`)

### Testing Accounts
The application uses a `MockDataService` to automatically seed realistic SELU structure (Colleges, Departments, Review Processes) and handles specific emails to test different roles. 

Simply enter one of the following emails on the Login page (no password required):

| Role | Email | Name |
| :--- | :--- | :--- |
| **Student** | `eliora.browning@selu.edu` | Eliora Browning |
| **Faculty** | `galkadi@selu.edu` | Dr. Ghassan Alkadi |
| **Department Head** | `bonnie.achee@southeastern.edu` | Dr. Bonnie Achée |
| **Generic Student** | *(Any other email)* | Test User |
