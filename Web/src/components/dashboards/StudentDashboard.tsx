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
                        marginBottom: "0.75rem",
                      }}
                    >
                      Revisions requested by reviewer. Click below to review
                      feedback and edit your answers.
                    </p>
                  )}

                  {/* Two-Stage Approval Pipeline in Card */}
                  {(rejected || pending || completed) && (rejected || pending || completed)?.approvals && (
                    <div style={{ marginBottom: "1rem" }}>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "var(--text-heading)",
                          marginBottom: "4px",
                        }}
                      >
                        Approval Pipeline:
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {(rejected || pending || completed)!.approvals!.map((app) => {
                          const isAppApproved = app.status === "Approved";
                          const isAppRejected = app.status === "Changes Requested";
                          const isAppPending = app.status === "Pending Review";
                          return (
                            <div
                              key={app.stepOrder}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                fontSize: "0.75rem",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                background: "var(--bg-main)",
                                border: "1px solid var(--border-card)",
                              }}
                            >
                              <span style={{ color: "var(--text-main)" }}>
                                {app.stepOrder}. {app.roleName} ({app.reviewerName.replace("Dr. ", "")})
                              </span>
                              <span
                                className={`status ${
                                  isAppApproved
                                    ? "status-approved"
                                    : isAppRejected
                                      ? "status-rejected"
                                      : isAppPending
                                        ? "status-pending"
                                        : "status-draft"
                                }`}
                                style={{ fontSize: "0.68rem", padding: "1px 6px" }}
                              >
                                {isAppApproved
                                  ? "✓ Approved"
                                  : isAppRejected
                                    ? "⚠️ Changes"
                                    : isAppPending
                                      ? "⏳ In Review"
                                      : "⏸ Awaiting"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
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
                          backgroundColor:
                            "var(--progress-track-bg, var(--border-card))",
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
                  <th>Approvals</th>
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
                        <td style={{ minWidth: "230px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            {s.approvals && s.approvals.length > 0 ? (
                              s.approvals.map((app) => {
                                const isAppApproved = app.status === "Approved";
                                const isAppRejected = app.status === "Changes Requested";
                                const isAppPending = app.status === "Pending Review";
                                return (
                                  <div
                                    key={app.stepOrder}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      gap: "8px",
                                      fontSize: "0.75rem",
                                    }}
                                  >
                                    <span style={{ color: "var(--text-help)", whiteSpace: "nowrap" }}>
                                      {app.roleName === "Faculty" ? "Faculty (Alkadi):" : "Dept Head (Achée):"}
                                    </span>
                                    <span
                                      className={`status ${
                                        isAppApproved
                                          ? "status-approved"
                                          : isAppRejected
                                            ? "status-rejected"
                                            : isAppPending
                                              ? "status-pending"
                                              : "status-draft"
                                      }`}
                                      style={{ fontSize: "0.68rem", padding: "1px 6px", whiteSpace: "nowrap" }}
                                    >
                                      {isAppApproved
                                        ? "✓ Approved"
                                        : isAppRejected
                                          ? "⚠️ Changes"
                                          : isAppPending
                                            ? "⏳ In Review"
                                            : "⏸ Awaiting"}
                                    </span>
                                  </div>
                                );
                              })
                            ) : (
                              <span style={{ fontSize: "0.75rem", color: "var(--text-help)" }}>
                                1. Faculty &middot; 2. Dept Head
                              </span>
                            )}
                          </div>
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
                              <svg
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                                style={{ flexShrink: 0 }}
                              >
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                              <span>{isRejected ? "Requested Changes" : "View"}</span>
                            </Link>
                            {isRejected && s.formId && (
                              <Link
                                to={`/forms/${s.formId}`}
                                className="btn-view btn-view-secondary"
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
