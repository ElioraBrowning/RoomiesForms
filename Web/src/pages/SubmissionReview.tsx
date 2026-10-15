import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import type { SubmissionDetail, AuditLogEntry } from "../types";
import { labelFor } from "../components/forms/useValidatedForm";
import { useAuth } from "../context/AuthContext";
import "../index.css";

import CS401 from "../components/forms/CS401";
import CS402 from "../components/forms/CS402";
import CS403 from "../components/forms/CS403";
import CS404 from "../components/forms/CS404";
import CS405 from "../components/forms/CS405";
import CS410 from "../components/forms/CS410";
import CS420 from "../components/forms/CS420";
import ExitSurvey from "../components/forms/ExitSurvey";

interface QuestionReviewState {
  status: "unreviewed" | "approved" | "rejected" | "note";
  comment: string;
  isCommentOpen: boolean;
}

function parseQuestionFeedback(
  comments: string | null | undefined,
): Record<string, string> {
  if (!comments) return {};
  const feedbackMap: Record<string, string> = {};
  const lines = comments.split("\n");
  for (const line of lines) {
    const match = line.match(
      /^\[(Changes Needed|Rejected|Note)\]\s*([^:]+):\s*(.+)$/i,
    );
    if (match) {
      const qTitle = match[2].trim().toLowerCase();
      const feedback = match[3].trim();
      feedbackMap[qTitle] = feedback;
    }
  }
  return feedbackMap;
}

function getGeneralReviewerComment(
  comments: string | null | undefined,
): string {
  if (!comments) return "";
  const lines = comments.split("\n");
  const generalLines = lines.filter(
    (l) =>
      !l.match(/^\[(Changes Needed|Rejected|Note)\]/i) &&
      !l.startsWith("Question Feedback:"),
  );
  return generalLines.join("\n").trim();
}

export default function SubmissionReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [activeTab, setActiveTab] = useState<"questions" | "form">("questions");
  const [generalComments, setGeneralComments] = useState("");
  const [questionReviews, setQuestionReviews] = useState<
    Record<string, QuestionReviewState>
  >({});
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Check whether the active logged-in user is a reviewer (Faculty, Dept Head, External)
  const isReviewer = Boolean(
    user?.roles?.some((r) =>
      ["Faculty", "Department Head", "External"].includes(r),
    ),
  );

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        const res = await api.get(`/submissions/${id}`);
        setSubmission(res.data);
      } catch (err) {
        console.error(err);
        setError("Could not load this submission.");
      }
    };
    fetchSubmission();
  }, [id]);

  // Extract every answered field to present for question review
  const answered = useMemo(() => {
    const r = (submission?.responses ?? {}) as Record<string, unknown>;
    return Object.entries(r)
      .filter(
        ([k, v]) =>
          k !== "__progress" && v !== "" && v !== null && v !== undefined,
      )
      .map(([k, v]) => {
        let displayVal = "";
        if (typeof v === "boolean") {
          displayVal = v ? "Yes / Agreed" : "No";
        } else if (Array.isArray(v)) {
          displayVal = v.join(", ");
        } else {
          displayVal = String(v);
        }
        return {
          field: k,
          label: labelFor(k),
          value: displayVal,
        };
      });
  }, [submission]);

  // Find the latest audit log entry with reviewer comments
  const latestAuditLog: AuditLogEntry | undefined = useMemo(() => {
    if (!submission?.auditLogs || submission.auditLogs.length === 0)
      return undefined;
    return [...submission.auditLogs].reverse().find((a) => a.comments?.trim());
  }, [submission]);

  const studentQuestionFeedback = useMemo(() => {
    return parseQuestionFeedback(latestAuditLog?.comments);
  }, [latestAuditLog]);

  const generalFeedbackMessage = useMemo(() => {
    return getGeneralReviewerComment(latestAuditLog?.comments);
  }, [latestAuditLog]);

  const isClosed =
    submission?.status === "Completed" || submission?.status === "Rejected";

  // Metrics for reviewer
  const approvedCount = Object.values(questionReviews).filter(
    (q) => q.status === "approved",
  ).length;
  const rejectedCount = Object.values(questionReviews).filter(
    (q) => q.status === "rejected",
  ).length;
  const noteCount = Object.values(questionReviews).filter(
    (q) => q.status === "note" || (q.comment.trim() && q.status !== "rejected"),
  ).length;

  const handleApproveQuestion = (field: string) => {
    if (!isReviewer || isClosed) return;
    setQuestionReviews((prev) => {
      const current = prev[field] ?? {
        status: "unreviewed",
        comment: "",
        isCommentOpen: false,
      };
      return {
        ...prev,
        [field]: {
          ...current,
          status: "approved",
        },
      };
    });
  };

  const handleRejectQuestion = (field: string) => {
    if (!isReviewer || isClosed) return;
    setQuestionReviews((prev) => {
      const current = prev[field] ?? {
        status: "unreviewed",
        comment: "",
        isCommentOpen: false,
      };
      return {
        ...prev,
        [field]: {
          ...current,
          status: "rejected",
          isCommentOpen: true, // Revealing comment box underneath question
        },
      };
    });
  };

  const handleNoteQuestion = (field: string) => {
    if (!isReviewer || isClosed) return;
    setQuestionReviews((prev) => {
      const current = prev[field] ?? {
        status: "unreviewed",
        comment: "",
        isCommentOpen: false,
      };
      return {
        ...prev,
        [field]: {
          ...current,
          status: current.status === "unreviewed" ? "note" : current.status,
          isCommentOpen: true, // Revealing comment box underneath question
        },
      };
    });
  };

  const handleCommentChange = (field: string, comment: string) => {
    if (!isReviewer || isClosed) return;
    setQuestionReviews((prev) => {
      const current = prev[field] ?? {
        status: "unreviewed",
        comment: "",
        isCommentOpen: true,
      };
      return {
        ...prev,
        [field]: {
          ...current,
          comment,
        },
      };
    });
  };

  const handleClearComment = (field: string) => {
    if (!isReviewer || isClosed) return;
    setQuestionReviews((prev) => {
      const current = prev[field] ?? {
        status: "unreviewed",
        comment: "",
        isCommentOpen: false,
      };
      return {
        ...prev,
        [field]: {
          ...current,
          comment: "",
          isCommentOpen: current.status === "rejected",
        },
      };
    });
  };

  const handleApproveAll = () => {
    if (!isReviewer || isClosed) return;
    setQuestionReviews((prev) => {
      const next = { ...prev };
      for (const item of answered) {
        if (!next[item.field] || next[item.field].status === "unreviewed") {
          next[item.field] = {
            ...(next[item.field] ?? { comment: "", isCommentOpen: false }),
            status: "approved",
          };
        }
      }
      return next;
    });
  };

  const describeFailure = (err: unknown, action: string) => {
    const status = (err as { response?: { status?: number } })?.response
      ?.status;
    if (status === 404 || status === 405) {
      return `The ${action} endpoint does not exist on the backend yet.`;
    }
    if (status === 403)
      return "Your account is not allowed to perform this action.";
    return `Could not ${action} this submission. Check that the backend is running.`;
  };

  const handleApprove = async () => {
    if (!isReviewer) return;
    if (rejectedCount > 0) {
      const proceed = window.confirm(
        `There are ${rejectedCount} question(s) marked as rejected. Approving the entire submission will approve all steps. Do you wish to proceed?`,
      );
      if (!proceed) return;
    }

    setError("");
    setBusy("approve");
    try {
      await api.post(`/submissions/${id}/approve`, {
        comments: generalComments.trim() || null,
      });
      setNotice("Approved successfully. Returning to the dashboard...");
      setTimeout(() => navigate("/dashboard"), 900);
    } catch (err) {
      console.error(err);
      setError(describeFailure(err, "approve"));
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async () => {
    if (!isReviewer) return;
    const flaggedItems = answered
      .map((q) => ({
        field: q.field,
        label: q.label,
        review: questionReviews[q.field],
      }))
      .filter(
        (item) =>
          item.review &&
          (item.review.status === "rejected" || item.review.comment.trim()),
      );

    if (flaggedItems.length === 0 && !generalComments.trim()) {
      setError(
        "Please reject at least one question (using ✗) or provide comments so the student knows what to change.",
      );
      return;
    }

    const questionFeedbackSummary = flaggedItems
      .map((item) => {
        const action =
          item.review.status === "rejected" ? "[Changes Needed]" : "[Note]";
        const note = item.review.comment.trim()
          ? item.review.comment.trim()
          : "Requires review/correction";
        return `${action} ${item.label}: ${note}`;
      })
      .join("\n");

    const compiledComments = generalComments.trim()
      ? `${generalComments.trim()}\n\nQuestion Feedback:\n${questionFeedbackSummary}`
      : questionFeedbackSummary;

    setError("");
    setBusy("reject");
    try {
      await api.post(`/submissions/${id}/reject`, {
        comments: compiledComments,
        questionReviews: flaggedItems.map((item) => ({
          field: item.field,
          status: item.review.status,
          comment: item.review.comment.trim() || null,
        })),
      });
      setNotice(
        "Sent back to student with corrections. Returning to the dashboard...",
      );
      setTimeout(() => navigate("/dashboard"), 900);
    } catch (err) {
      console.error(err);
      setError(describeFailure(err, "reject"));
    } finally {
      setBusy(null);
    }
  };

  if (error && !submission)
    return (
      <div className="card">
        <p>{error}</p>
      </div>
    );
  if (!submission)
    return (
      <div className="card">
        <p className="empty-state">Loading submission...</p>
      </div>
    );

  const formId = submission.form?.googleFormId;
  const formProps = {
    onSubmit: () => {},
    defaultValues: submission.responses,
    isReadonly: true,
  };
  const renderForm = () => {
    switch (formId) {
      case "CS401":
        return <CS401 {...formProps} />;
      case "CS402":
        return <CS402 {...formProps} />;
      case "CS403":
        return <CS403 {...formProps} />;
      case "CS404":
        return <CS404 {...formProps} />;
      case "CS405":
        return <CS405 {...formProps} />;
      case "CS410":
        return <CS410 {...formProps} />;
      case "CS420":
        return <CS420 {...formProps} />;
      case "ExitSurvey":
        return <ExitSurvey {...formProps} />;
      default:
        return <pre>{JSON.stringify(submission.responses, null, 2)}</pre>;
    }
  };

  const isSubmissionRejected = submission.status === "Rejected";

  return (
    <div>
      {/* Top Header */}
      <div className="review-head">
        <div>
          <h1>
            {!isReviewer && isSubmissionRejected
              ? `Change Request: ${submission.form?.title}`
              : isReviewer
                ? `Review submission #${submission.id}`
                : `Submission #${submission.id}: ${submission.form?.title}`}
          </h1>
          <p className="review-meta">
            {submission.form?.title} &middot; {submission.student?.fullName} (
            {submission.student?.wNumber})
          </p>
        </div>
        <span
          className={
            submission.status === "Completed" ||
            submission.status === "Approved"
              ? "status status-approved"
              : isSubmissionRejected
                ? "status status-rejected"
                : "status status-pending"
          }
        >
          {isSubmissionRejected ? "Changes Requested" : submission.status}
        </span>
      </div>

      {/* STUDENT VIEW: Status & Feedback Banner */}
      {!isReviewer && (
        <>
          {isSubmissionRejected ? (
            <div className="student-alert-card student-alert-rejected">
              <div className="student-alert-header">
                <span className="student-alert-icon">⚠️</span>
                <div>
                  <h3>Action Required: Changes Requested</h3>
                  <p>
                    A faculty reviewer has inspected this form and returned it
                    with requested corrections. Please review the notes on each
                    question below, make the necessary updates, and resubmit.
                  </p>
                </div>
              </div>

              {generalFeedbackMessage && (
                <div className="student-feedback-box">
                  <strong>Reviewer Message:</strong>
                  <pre>{generalFeedbackMessage}</pre>
                </div>
              )}

              <div className="student-alert-actions">
                <Link to={`/forms/${submission.form?.id}`} className="btn">
                  ✏️ Edit & Resubmit Form
                </Link>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="btn btn-secondary"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          ) : submission.status === "Pending" ? (
            <div className="student-alert-card student-alert-pending">
              <div className="student-alert-header">
                <span className="student-alert-icon">⏳</span>
                <div>
                  <h3>Submission Under Review</h3>
                  <p>
                    Your submission has been received and is currently being
                    reviewed by faculty. You will be notified once an approval
                    decision is recorded.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="student-alert-card student-alert-approved">
              <div className="student-alert-header">
                <span className="student-alert-icon">✓</span>
                <div>
                  <h3>Submission Approved</h3>
                  <p>Your submission has completed the approval process.</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Navigation Tabs */}
      <div className="review-nav-tabs">
        <button
          type="button"
          className={`review-tab-btn ${activeTab === "questions" ? "active" : ""}`}
          onClick={() => setActiveTab("questions")}
        >
          {isReviewer ? "Question-by-Question Review" : "Submitted Responses"}
        </button>
        <button
          type="button"
          className={`review-tab-btn ${activeTab === "form" ? "active" : ""}`}
          onClick={() => setActiveTab("form")}
        >
          Original Form Layout
        </button>
      </div>

      {activeTab === "form" ? (
        <div className="card">
          <h2>Original Form Layout</h2>
          <div className="review-form">{renderForm()}</div>
        </div>
      ) : (
        <div>
          {/* Reviewer Toolbar (Only visible to faculty/reviewers) */}
          {isReviewer && (
            <div className="review-summary-toolbar">
              <div className="review-stats-chips">
                <span className="review-chip chip-total">
                  {answered.length} Questions
                </span>
                <span className="review-chip chip-approved">
                  ✓ {approvedCount} Approved
                </span>
                {rejectedCount > 0 && (
                  <span className="review-chip chip-rejected">
                    ✗ {rejectedCount} Rejected
                  </span>
                )}
                {noteCount > 0 && (
                  <span className="review-chip chip-note">
                    … {noteCount} Noted
                  </span>
                )}
              </div>

              {!isClosed && answered.length > 0 && (
                <div className="review-quick-actions">
                  <button
                    type="button"
                    className="btn-quick-approve"
                    onClick={handleApproveAll}
                    title="Mark all remaining unreviewed questions as approved"
                  >
                    ✓ Mark All Approved
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Question Cards */}
          {answered.length === 0 ? (
            <div className="card">
              <p className="empty-state">
                This submission contains no responses.
              </p>
            </div>
          ) : (
            <div>
              {answered.map(({ field, label, value }) => {
                const review = questionReviews[field] ?? {
                  status: isClosed ? "approved" : "unreviewed",
                  comment: "",
                  isCommentOpen: false,
                };
                const isApproved = review.status === "approved";
                const isRejected = review.status === "rejected";
                const isNote = review.status === "note";
                const showComment =
                  review.isCommentOpen ||
                  review.comment.trim().length > 0 ||
                  isRejected;

                // For students: check if this question has feedback in the audit log
                const studentNote =
                  studentQuestionFeedback[label.toLowerCase()] ||
                  studentQuestionFeedback[field.toLowerCase()];

                return (
                  <div
                    key={field}
                    className={`question-review-card ${
                      isReviewer
                        ? isApproved
                          ? "status-card-approved"
                          : isRejected
                            ? "status-card-rejected"
                            : isNote
                              ? "status-card-note"
                              : ""
                        : studentNote
                          ? "status-card-rejected"
                          : ""
                    }`}
                  >
                    <div className="question-card-top">
                      <div className="question-card-info">
                        <div className="question-card-header">
                          <span className="question-title-text">{label}</span>

                          {/* Reviewer status badge */}
                          {isReviewer && review.status !== "unreviewed" && (
                            <span
                              className={`status ${
                                isApproved
                                  ? "status-approved"
                                  : isRejected
                                    ? "status-rejected"
                                    : "status-pending"
                              }`}
                            >
                              {isApproved
                                ? "✓ Approved"
                                : isRejected
                                  ? "✗ Rejected"
                                  : "… Note"}
                            </span>
                          )}

                          {/* Student view: Flag indicator if question needs changes */}
                          {!isReviewer && studentNote && (
                            <span className="status status-rejected">
                              ✗ Action Required
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Reviewer Action Buttons: Checkmark (✓), X (✗), and ... (…) */}
                      {/* CRITICAL: ONLY rendered for reviewers, NEVER for students! */}
                      {isReviewer && (
                        <div className="question-action-group">
                          <button
                            type="button"
                            title="Approve this answer"
                            className={`review-item-btn btn-action-approve ${isApproved ? "active" : ""}`}
                            onClick={() => handleApproveQuestion(field)}
                            disabled={isClosed}
                          >
                            ✓ Approve
                          </button>
                          <button
                            type="button"
                            title="Reject this answer and specify what needs changing"
                            className={`review-item-btn btn-action-reject ${isRejected ? "active" : ""}`}
                            onClick={() => handleRejectQuestion(field)}
                            disabled={isClosed}
                          >
                            ✗ Reject
                          </button>
                          <button
                            type="button"
                            title="Leave a note or feedback for this answer"
                            className={`review-item-btn btn-action-note ${isNote ? "active" : ""}`}
                            onClick={() => handleNoteQuestion(field)}
                            disabled={isClosed}
                          >
                            … Note
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Submitted Answer Value */}
                    <div className="question-response-box">
                      {value || (
                        <span className="question-response-empty">
                          (No response provided)
                        </span>
                      )}
                    </div>

                    {/* REVIEWER VIEW: Inline Comment Box */}
                    {isReviewer && showComment && (
                      <div
                        className={`question-inline-comment ${isRejected ? "comment-rejected" : ""}`}
                      >
                        <div className="inline-comment-header">
                          <span className="inline-comment-label">
                            {isRejected
                              ? "✗ Rejection Feedback & Correction Instructions:"
                              : "… Reviewer Note:"}
                          </span>
                          {review.comment && !isClosed && (
                            <button
                              type="button"
                              className="inline-comment-btn-clear"
                              onClick={() => handleClearComment(field)}
                            >
                              Clear comment
                            </button>
                          )}
                        </div>
                        <textarea
                          className="inline-comment-textarea"
                          placeholder={
                            isRejected
                              ? "Explain what is incorrect and what the student needs to fix..."
                              : "Leave an optional note or guidance for this response..."
                          }
                          value={review.comment}
                          onChange={(e) =>
                            handleCommentChange(field, e.target.value)
                          }
                          disabled={isClosed}
                          rows={2}
                        />
                        <p className="inline-comment-hint">
                          This comment appears right underneath this question
                          when sent back to the student.
                        </p>
                      </div>
                    )}

                    {/* STUDENT VIEW: Reviewer Feedback Box under Question */}
                    {!isReviewer && studentNote && (
                      <div className="student-question-feedback">
                        <div className="student-question-feedback-label">
                          <span>⚠️ Correction Needed:</span>
                        </div>
                        <p className="student-question-feedback-text">
                          {studentNote}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Review & Revision History Timeline */}
      {submission.auditLogs && submission.auditLogs.length > 0 && (
        <div className="card" style={{ marginTop: "1.75rem" }}>
          <h2
            style={{
              fontSize: "1.25rem",
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span>📜</span> Review & Revision History
          </h2>
          <div className="audit-trail-timeline">
            {submission.auditLogs.map((log) => (
              <div key={log.id} className="audit-trail-item">
                <div className="audit-trail-header">
                  <span
                    className={`status ${
                      log.action === "Approved"
                        ? "status-approved"
                        : log.action === "Rejected"
                          ? "status-rejected"
                          : "status-resubmitted"
                    }`}
                  >
                    {log.action}
                  </span>
                  <span className="audit-trail-actor">
                    {log.reviewer?.fullName ||
                      (log.action === "Resubmitted"
                        ? submission.student?.fullName
                        : "Reviewer")}
                  </span>
                  <span className="audit-trail-date">
                    &middot; {new Date(log.actionTimestamp).toLocaleString()}
                  </span>
                </div>
                {log.comments && (
                  <div className="audit-trail-comments">
                    <pre>{log.comments}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REVIEWER: Final Decision Deck */}
      {isReviewer ? (
        <div className="card review-final-card">
          <h2>Overall Decision</h2>

          <div className="form-group">
            <label htmlFor="general-comments">
              Additional Remarks (Optional)
            </label>
            <textarea
              id="general-comments"
              rows={3}
              value={generalComments}
              onChange={(e) => setGeneralComments(e.target.value)}
              placeholder="Add any overall remarks or general message for the student..."
              disabled={isClosed}
            />
          </div>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="review-notice" role="status">
              {notice}
            </p>
          )}

          <div className="review-actions">
            <button
              onClick={handleApprove}
              className="btn"
              disabled={isClosed || busy !== null}
            >
              {busy === "approve" ? "Approving..." : "Approve Submission"}
            </button>
            <button
              onClick={handleReject}
              className="btn btn-danger"
              disabled={isClosed || busy !== null}
            >
              {busy === "reject" ? "Sending..." : "Request Changes"}
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="btn btn-secondary"
            >
              Back to Dashboard
            </button>
          </div>

          {isClosed && (
            <p className="help-text" style={{ marginTop: "1rem" }}>
              This submission is {submission.status.toLowerCase()} and can no
              longer be modified.
            </p>
          )}
        </div>
      ) : (
        /* STUDENT: Simple Navigation / Action Footer */
        <div
          className="card review-final-card"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <h3 style={{ margin: "0 0 0.25rem 0" }}>Form Submission Review</h3>
            <p
              style={{
                margin: 0,
                color: "var(--text-help)",
                fontSize: "0.9rem",
              }}
            >
              {isSubmissionRejected
                ? "Review the feedback above and click below to update your answers."
                : "Your submission details are preserved above."}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {isSubmissionRejected && (
              <Link to={`/forms/${submission.form?.id}`} className="btn">
                ✏️ Edit & Resubmit Form
              </Link>
            )}
            <button
              onClick={() => navigate("/dashboard")}
              className="btn btn-secondary"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
