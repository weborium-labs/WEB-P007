import type { Prisma } from "../generated/prisma/client.js";

export interface AuditEntry {
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    oldValue?: Prisma.InputJsonValue;
    newValue?: Prisma.InputJsonValue;
    ipAddress?: string;
}

export const recordAudit = (
    tx: Prisma.TransactionClient,
    entry: AuditEntry,
) => {
    return tx.auditLog.create({
        data: {
            actorId: entry.actorId,
            action: entry.action,
            entityType: entry.entityType,
            entityId: entry.entityId,
            oldValue: entry.oldValue,
            newValue: entry.newValue,
            ipAddress: entry.ipAddress,
        },
        select: { id: true },
    });
};