import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Chip,
    Divider,
} from "@heroui/react";
import { FileText, Calendar, User, Network, Database, Hash, AlertCircle } from "lucide-react";
import type { AuditLog } from "../../types/audit";

interface AuditLogDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    auditLog: AuditLog | null;
}

function formatDateTime(iso: string) {
    try {
        const d = new Date(iso);
        return d.toLocaleString();
    } catch {
        return iso;
    }
}

function actionColor(action: AuditLog["action"]) {
    switch (action) {
        case "DELETE":
            return "danger" as const;
        case "UPDATE":
            return "warning" as const;
        case "CREATE":
            return "success" as const;
        default:
            return "default" as const;
    }
}

function formatJSON(value: unknown): string {
    if (value === null || value === undefined) {
        return "null";
    }
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}

export function AuditLogDetailModal({ isOpen, onClose, auditLog }: AuditLogDetailModalProps) {
    if (!auditLog) return null;

    const full = auditLog.actorFullName?.trim();
    const user = auditLog.actorName?.trim();
    const actorDisplay = full || user || "System";

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                                Audit Log #{auditLog.id}
                            </h2>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                Complete audit trail information
                            </p>
                        </div>
                    </div>
                </ModalHeader>
                <ModalBody>
                    <div className="space-y-6">
                        {/* Basic Information */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                        Timestamp
                                    </p>
                                </div>
                                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                    {formatDateTime(auditLog.timestamp)}
                                </p>
                            </div>

                            <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Chip
                                        size="sm"
                                        color={actionColor(auditLog.action)}
                                        variant="flat"
                                    >
                                        {auditLog.action}
                                    </Chip>
                                </div>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
                                    Action Type
                                </p>
                            </div>
                        </div>

                        {/* Actor Information */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <User className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                        Actor
                                    </p>
                                </div>
                                <div>
                                    <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                        {actorDisplay}
                                    </p>
                                    {!!full && !!user && (
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                            @{user}
                                        </p>
                                    )}
                                    {auditLog.actor && (
                                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                                            ID: {auditLog.actor}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Network className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                        IP Address
                                    </p>
                                </div>
                                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 font-mono text-sm">
                                    {auditLog.ipAddress || "-"}
                                </p>
                            </div>
                        </div>

                        {/* Record Information */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Database className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                        Table Name
                                    </p>
                                </div>
                                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                                    {auditLog.tableName}
                                </p>
                            </div>

                            <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Hash className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                        Record ID
                                    </p>
                                </div>
                                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                                    {auditLog.recordId}
                                </p>
                            </div>
                        </div>

                        <Divider />

                        {/* Old Value */}
                        {auditLog.oldValue !== null && auditLog.oldValue !== undefined && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <AlertCircle className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                        Old Value (Before Change)
                                    </p>
                                </div>
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                    <pre className="text-xs font-mono text-amber-900 dark:text-amber-100 whitespace-pre-wrap break-words overflow-x-auto">
                                        {formatJSON(auditLog.oldValue)}
                                    </pre>
                                </div>
                            </div>
                        )}

                        {/* New Value */}
                        {auditLog.newValue !== null && auditLog.newValue !== undefined && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <AlertCircle className="h-4 w-4 text-green-500 dark:text-green-400" />
                                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                        New Value (After Change)
                                    </p>
                                </div>
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                    <pre className="text-xs font-mono text-green-900 dark:text-green-100 whitespace-pre-wrap break-words overflow-x-auto">
                                        {formatJSON(auditLog.newValue)}
                                    </pre>
                                </div>
                            </div>
                        )}

                        {/* No values message */}
                        {auditLog.oldValue === null &&
                            auditLog.newValue === null &&
                            auditLog.action === "DELETE" && (
                                <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-center">
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                        Record was deleted. Old value was captured but is not
                                        available in this view.
                                    </p>
                                </div>
                            )}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button
                        variant="flat"
                        onPress={onClose}
                        className="!text-zinc-700 dark:!text-zinc-300"
                    >
                        Close
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
