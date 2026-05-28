"use client";

type ConfirmSubmitButtonProps = {
  className: string;
  children: React.ReactNode;
  confirmMessage: string;
  formAction?: (formData: FormData) => void | Promise<void>;
};

export function ConfirmSubmitButton({
  className,
  children,
  confirmMessage,
  formAction,
}: ConfirmSubmitButtonProps) {
  return (
    <button
      className={className}
      type="submit"
      formAction={formAction}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
