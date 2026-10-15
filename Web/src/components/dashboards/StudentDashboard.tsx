import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import type { FormMeta, SubmissionSummary } from "../../types";

export default function StudentDashboard() {
  const [forms, setForms] = useState<FormMeta[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [formsRes, subRes] = await Promise.allSettled([
          api.get("/forms"),
          api.get("/submissions"),
        ]);

        if (formsRes.status === "fulfilled") setForms(formsRes.value.data);
        if (subRes.status === "fulfilled") setSubmissions(subRes.value.data);
      } catch (error) {
        console.error("Failed to fetch data", error);
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
          Student Dashboard
        </h1>
        <div
          className="card"
          style={{ textAlign: "center", padding: "4rem 2rem" }}
        >
          <h2 style={{ marginBottom: "0.5rem" }}>Loading Dashboard...</h2>
          <p style={{ color: "var(--text-help)" }}>
            Please wait while we fetch your records.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: "1rem", color: "var(--text-heading)" }}>
        Student Dashboard
      </h1>

      <div className="card">
        <h2>Available Forms & Drafts</h2>
        {forms.length === 0 ? (
          <p>No forms available.</p>
        ) : (
          <div className="grid" style={{ marginBottom: "1rem" }}>
            {forms.map((f) => {
              const draft = submissions.find(
                (s) =>
                  (s.formId === f.id || s.formTitle === f.title) &&
                  s.status === "Draft",
              );
              const rejected = submissions.find(
                (s) =>
                  (s.formId === f.id || s.formTitle === f.title) &&
                  s.status === "Rejected",
              );
              const pending = submissions.find(
                (s) =>
                  (s.formId === f.id || s.formTitle === f.title) &&
                  s.status === "Pending",
              );
              const completed = submissions.find(
                (s) =>
                  (s.formId === f.id || s.formTitle === f.title) &&
                  s.status === "Completed",
              );
              const progress = draft?.progress || 0;

              return (
                <div
                  key={f.id}
                  className="nested-card"
                  style={{
                    marginBottom: 0,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "0.5rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <h3 style={{ margin: 0, color: "var(--text-heading)" }}>
                      {f.title}
                    </h3>
                    {rejected && (
                      <span
                        className="status status-rejected"
                        style={{ fontSize: "0.75rem" }}
                      >
                        Changes Requested
                      </span>
                    )}
                    {!rejected && pending && (
                      <span
                        className="status status-pending"
                        style={{ fontSize: "0.75rem" }}
                      >
                        Under Review
                      </span>
                    )}
                    {!rejected && !pending && completed && (
                      <span
                        className="status status-approved"
                        style={{ fontSize: "0.75rem" }}
                      >
                        Approved
                      </span>
                    )}
                  </div>

                  {rejected && (
                    <p
                      style={{
                        fontSize: "0.88rem",
                        color: "var(--text-help)",
                        marginBottom: "1rem",
                      }}
                    >
                      Revisions requested by faculty. Click below to review
                      feedback and edit your answers.
                    </p>
                  )}

                  {!rejected && progress > 0 && (
                    <div style={{ marginBottom: "1.5rem" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.85rem",
                          color: "var(--text-help)",
                          marginBottom: "4px",
                        }}
                      >
                        <span>Draft in progress</span>
                        <span>{progress}%</span>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: "6px",
                          backgroundColor: "var(--border-card)",
                          borderRadius: "3px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${progress}%`,
                            height: "100%",
                            backgroundColor: "var(--slu-gold)",
                            transition: "width 0.3s ease",
                          }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: "auto",
                      paddingTop: !rejected && progress === 0 ? "1rem" : 0,
                    }}
                  >
                    {rejected ? (
                      <Link
                        to={`/forms/${f.id}`}
                        className="btn"
                        style={{ width: "100%", textAlign: "center" }}
                      >
                        ✏️ Edit & Resubmit Form
                      </Link>
                    ) : pending || completed ? (
                      <Link
                        to={`/submissions/${(pending || completed)?.id}`}
                        className="btn btn-secondary"
                        style={{ width: "100%", textAlign: "center" }}
                      >
                        View Submission
                      </Link>
                    ) : (
                      <Link
                        to={`/forms/${f.id}`}
                        className="btn"
                        style={{ width: "100%", textAlign: "center" }}
                      >
                        {progress > 0 ? "Continue Draft" : "Start Form"}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Submitted Forms</h2>
        {submissions.filter((s) => s.status !== "Draft").length === 0 ? (
          <p>You have not submitted any forms yet.</p>
        ) : (
          <div className="dashboard-table-container">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Form</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {submissions
                  .filter((s) => s.status !== "Draft")
                  .map((s) => {
                    const isRejected = s.status === "Rejected";
                    return (
                      <tr key={s.id}>
                        <td className="table-cell-title">
                          {s.formTitle}
                          {s.isResubmission && (
                            <span
                              className="status status-resubmitted"
                              style={{
                                marginLeft: "0.5rem",
                                fontSize: "0.72rem",
                              }}
                            >
                              Revised
                            </span>
                          )}
                        </td>
                        <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                        <td>
                          <span
                            className={`status ${
                              s.status === "Completed" ||
                              s.status === "Approved"
                                ? "status-approved"
                                : isRejected
                                  ? "status-rejected"
                                  : "status-pending"
                            }`}
                          >
                            {isRejected ? "Changes Requested" : s.status}
                          </span>
                        </td>
                        <td>
                          <div
                            style={{
                              display: "inline-flex",
                              gap: "0.4rem",
                              alignItems: "center",
                            }}
                          >
                            <Link
                              to={`/submissions/${s.id}`}
                              className="btn-view"
                            >
                              {isRejected ? "Review Changes" : "View"}
                            </Link>
                            {isRejected && s.formId && (
                              <Link
                                to={`/forms/${s.formId}`}
                                className="btn-view"
                                style={{
                                  backgroundColor: "var(--bg-card-nested)",
                                  color: "var(--text-heading) !important",
                                  border: "1px solid var(--border-input)",
                                }}
                              >
                                ✏️ Edit
                              </Link>
                            )}
                          </div>
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
