type AdminFeedbackProps = {
  success?: string;
  error?: string;
};

export function AdminFeedback({ success, error }: AdminFeedbackProps) {
  if (!success && !error) {
    return null;
  }

  return (
    <div className="admin-feedback-stack">
      {success ? (
        <p className="admin-feedback is-success">{success}</p>
      ) : null}
      {error ? (
        <p className="admin-feedback is-error">{error}</p>
      ) : null}
    </div>
  );
}
