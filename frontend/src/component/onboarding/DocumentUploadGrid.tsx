import type { DocType, OnboardingDocument } from "../../types/types";
import DocumentUploadCard from "./DocumentUploadCard";

interface DocumentUploadGridProps {
    documents: readonly OnboardingDocument[];
    disabled: boolean;
    onUploaded: (type: DocType) => void;
}

export default function DocumentUploadGrid({ documents, disabled, onUploaded }: DocumentUploadGridProps) {
    return (
        <div className="grid grid-cols-1 gap-6 @min-[640px]:grid-cols-2 @min-[1000px]:grid-cols-4">
            {documents.map((doc) => (
                <DocumentUploadCard key={doc.type} document={doc} disabled={disabled} onUploaded={onUploaded} />
            ))}
        </div>
    );
}