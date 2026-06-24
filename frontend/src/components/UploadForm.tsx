import { useRef, useState } from "react";
import type { DragEvent, FormEvent } from "react";

interface UploadFormProps {
  disabled: boolean;
  disabledReason?: string;
  onSubmit: (resume: File, jobDescription: string) => void;
}

export function UploadForm({ disabled, disabledReason, onSubmit }: UploadFormProps) {
  const [resume, setResume] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function validateAndSetFile(file: File | undefined) {
    if (!file) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setFileError("Please upload a PDF file.");
      return;
    }
    setFileError(null);
    setResume(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    validateAndSetFile(e.dataTransfer.files[0]);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!resume || !jobDescription.trim()) return;
    onSubmit(resume, jobDescription);
  }

  const canSubmit = !disabled && resume !== null && jobDescription.trim().length > 0;

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <div
        className={`dropzone ${isDragging ? "dropzone--active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          hidden
          onChange={(e) => validateAndSetFile(e.target.files?.[0])}
        />
        {resume ? (
          <p className="dropzone__filename">📄 {resume.name}</p>
        ) : (
          <p>Drop your resume PDF here, or click to choose a file</p>
        )}
      </div>
      {fileError && <p className="field-error">{fileError}</p>}

      <label htmlFor="job-description">Job description</label>
      <textarea
        id="job-description"
        rows={10}
        placeholder="Paste the job description here..."
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
      />

      <button type="submit" disabled={!canSubmit}>
        Evaluate resume
      </button>
      {disabled && disabledReason && <p className="field-error">{disabledReason}</p>}
    </form>
  );
}
