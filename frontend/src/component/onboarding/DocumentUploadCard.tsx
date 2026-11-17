import { useRef, useState, type DragEvent } from "react";
import { ACCEPT_ATTRIBUTE, validateDocumentFile } from "../../lib/onboarding";
import { useUploadDocumentMutation } from "../../hooks/useOnboarding";
import type { OnboardingDocument } from "../../types/types";
import { CheckIcon } from "../intern-dashboard/Icons";

interface DocumentUploadCardProps {
    document: OnboardingDocument;
    disabled?: boolean;
    onUploaded: (type: OnboardingDocument["type"]) => void;
}

/** Document-Upload states: disabled · default · drag-over · uploading · uploaded · error. */
export default function DocumentUploadCard({ document, disabled = false, onUploaded }: DocumentUploadCardProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    // Child enter/leave events fire constantly while dragging; count them to avoid flicker.
    const dragDepth = useRef(0);
    const [isDragging, setIsDragging] = useState(false);
    const [progress, setProgress] = useState(0);
    const [fileName, setFileName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const upload = useUploadDocumentMutation();

    const isUploading = upload.isPending;
    const isUploaded = Boolean(fileName) && upload.isSuccess;
    const locked = disabled || isUploading;

    const handleFile = (file: File | undefined) => {
        if (!file || locked) return;
        const problem = validateDocumentFile(file);
        if (problem) {
            setError(problem);
            return;
        }
        setError(null);
        setProgress(0);
        upload.mutate(
            { docType: document.type, file, onProgress: setProgress },
            {
                onSuccess: () => {
                    setFileName(file.name);
                    onUploaded(document.type);
                },
                onError: (err) => setError(err instanceof Error ? err.message : "Upload failed. Please try again."),
            },
        );
    };

    const resetDrag = () => {
        dragDepth.current = 0;
        setIsDragging(false);
    };

    const onDragEnter = (e: DragEvent) => {
        e.preventDefault();
        if (locked || !e.dataTransfer.types.includes("Files")) return;
        dragDepth.current += 1;
        setIsDragging(true);
    };
    const onDragOver = (e: DragEvent) => e.preventDefault(); // required to allow dropping
    const onDragLeave = (e: DragEvent) => {
        e.preventDefault();
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setIsDragging(false);
    };
    const onDrop = (e: DragEvent) => {
        e.preventDefault();
        resetDrag();
        if (locked) return;
        const files = e.dataTransfer.files;
        if (files.length > 1) {
            setError("Please upload one file at a time.");
            return;
        }
        handleFile(files[0]);
    };

    const borderTone = disabled ? "border-ink-400" : isUploaded ? "border-ok-bright" : "border-line-mid";

    return (
        <div className="flex min-w-0 flex-col gap-2">
            <button
                type="button"
                disabled={disabled}
                aria-busy={isUploading}
                aria-label={`Upload ${document.label}`}
                onClick={() => inputRef.current?.click()}
                onDragEnter={onDragEnter}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={`relative flex min-h-[152px] w-full flex-col items-center gap-6 overflow-hidden rounded-lg border border-dashed bg-surface px-6 py-8 font-inter transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/35 disabled:cursor-not-allowed ${borderTone} ${disabled ? "" : "cursor-pointer hover:bg-grey-25"}`}
            >
                <span className={`text-sm font-semibold leading-5 ${disabled ? "text-ink-400" : "text-ink"}`}>
                    Upload {document.label}
                </span>

                {isUploading ? (
                    <span className="flex w-full flex-col items-center gap-2" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                        <span className="h-1.5 w-full overflow-hidden rounded-full bg-grey-50">
                            <span className="block h-full rounded-full bg-brand transition-[width] duration-150" style={{ width: `${progress}%` }} />
                        </span>
                        <span className="text-xs font-medium leading-4 text-ink-400">Uploading… {progress}%</span>
                    </span>
                ) : isUploaded ? (
                    <span className="flex max-w-full items-center gap-1.5 text-ok-bright">
                        <CheckIcon width={16} height={16} />
                        <span className="truncate text-xs font-medium leading-4">{fileName}</span>
                    </span>
                ) : (
                    <span className="flex flex-col items-center gap-1 text-xs font-medium leading-4 text-ink-400">
                        <span>JPG, PNG, PDF</span>
                        <span>Maximum file size: 5MB</span>
                    </span>
                )}

                {isDragging ? (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg border-[3px] border-dashed border-brand bg-blue-200 text-xs font-medium leading-4 text-ink dark:bg-brand-soft">
                        Drop the file here!
                    </span>
                ) : null}
            </button>

            <input
                ref={inputRef}
                type="file"
                accept={ACCEPT_ATTRIBUTE}
                tabIndex={-1}
                className="hidden"
                onChange={(e) => {
                    handleFile(e.target.files?.[0]);
                    e.target.value = ""; // allow re-selecting the same file
                }}
            />

            {error ? (
                <p role="alert" className="text-xs font-medium leading-4 text-bad">
                    {error}
                </p>
            ) : null}
        </div>
    );
}