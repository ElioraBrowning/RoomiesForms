import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import type { SubmissionSummary } from "../../types";
import { useAuth } from "../../context/AuthContext";

export default function FacultyDashboard() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const isDepartmentHead = user?.roles?.includes("Department Head");
  const reviewerTitle = isDepartmentHead
    ? "Department Head Dashboard — Dr. Bonnie Achée"
    : "Faculty Review Dashboard — Dr. Ghassan Alkadi";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/submissions");
        setSubmissions(res.data);
      } catch (error) {
        console.error("Failed to fetch pending approvals", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div>
        <h1 style={{ marginBottom: "1.5rem", color: "var(--text-heading)" }}>
          {reviewerTitle}
        </h1>
        <div className="card" style={{ textAlign: "center", padding: "4rem 2rem" }}>
          <h2 style={{ marginBottom: "0.5rem" }}>Loading Submissions...</h2>
          <p style={{ color: "var(--text-help)" }}>
            Please wait while we securely fetch pending records.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: "0 0 0.4rem 0" }}>{reviewerTitle}</h1>
        <p style={{ margin: 0, color: "var(--text-help)", fontSize: "0.95rem" }}>
          {isDepartmentHead
            ? "Step 2 of 2: Final departmental authorization for submissions previously reviewed and approved by Dr. Ghassan Alkadi."
            : "Step 1 of 2: Initial faculty evaluation of internship applications and forms before departmental approval."}
        </p>
      </div>

      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          <h2 style={{ margin: 0 }}>Pending Approvals in Your Queue</h2>
          <span className="status status-pending" style={{ fontSize: "0.85rem" }}>
            {submissions.length} Awaiting Your Action
          </span>
        </div>

        {submissions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-help)" }}>
            <p style={{ fontSize: "1.05rem", margin: 0 }}>
              🎉 You have no pending submissions awaiting your review.
            </p>
          </div>
        ) : (
          <div className="dashboard-table-container">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Form</th>
                  <th>Student</th>
                  <th>Date Submitted</th>
                  <th>Approval Progress</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => {
                  const step1 = s.approvals?.find((a) => a.stepOrder === 1);
                  const step2 = s.approvals?.find((a) => a.stepOrder === 2);

                  return (
                    <tr key={s.id}>
                      <td className="table-cell-title">
                        {s.formTitle}
                        {s.isResubmission && (
                          <span
                            className="status status-resubmitted"
                            style={{ marginLeft: "0.5rem", fontSize: "0.72rem" }}
                          >
                            Revised
                          </span>
                        )}
                      </td>
                      <td>
                        <strong>{s.studentName}</strong>
                      </td>
                      <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                      <td style={{ minWidth: "260px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                          {/* Step 1 Badge */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              fontSize: "0.76rem",
                              gap: "8px",
                            }}
                          >
                            <span style={{ color: "var(--text-help)" }}>
                              1. Faculty Review (Alkadi):
                            </span>
                            <span
                              className={`status ${
                                step1?.status === "Approved"
                                  ? "status-approved"
                                  : step1?.status === "Changes Requested"
                                    ? "status-rejected"
                                    : "status-pending"
                              }`}
                              style={{ fontSize: "0.68rem", padding: "1px 6px" }}
                            >
                              {step1?.status === "Approved"
                                ? "✓ Approved"
                                : step1?.status === "Changes Requested"
                                  ? "⚠️ Changes Needed"
                                  : "⏳ In Review"}
                            </span>
                          </div>

                          {/* Step 2 Badge */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              fontSize: "0.76rem",
                              gap: "8px",
                            }}
                          >
                            <span style={{ color: "var(--text-help)" }}>
                              2. Dept Head Review (Achée):
                            </span>
                            <span
                              className={`status ${
                                step2?.status === "Approved"
                                  ? "status-approved"
                                  : step2?.status === "Changes Requested"
                                    ? "status-rejected"
                                    : step2?.status === "Pending Review"
                                      ? "status-pending"
                                      : "status-draft"
                              }`}
                              style={{ fontSize: "0.68rem", padding: "1px 6px" }}
                            >
                              {step2?.status === "Approved"
                                ? "✓ Approved"
                                : step2?.status === "Changes Requested"
                                  ? "⚠️ Changes Needed"
                                  : step2?.status === "Pending Review"
                                    ? "⏳ In Review"
                                    : "⏸ Awaiting"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Link to={`/submissions/${s.id}`} className="btn-review">
                          Review &amp; Decide
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
