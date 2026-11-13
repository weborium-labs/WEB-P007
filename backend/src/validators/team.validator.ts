import { z } from "zod";

const uuidSchema = z.string().uuid("Invalid UUID format.");

export const createTeamSchema = {
    body: z.object({
        name: z
            .string("Team name is required.")
            .trim()
            .min(2, "Team name must be at least 2 characters.")
            .max(80, "Team name cannot exceed 80 characters."),
        batchId: uuidSchema,
        gpmId: uuidSchema.optional(),
        groupManagerIds: z
            .array(uuidSchema)
            .max(2, "A team can have at most 2 Group Managers.")
            .optional(),
        internIds: z.array(uuidSchema).optional(),
    }),
};

export const updateTeamSchema = {
    params: z.object({
        teamId: uuidSchema,
    }),
    body: z
        .object({
            name: z
                .string()
                .trim()
                .min(2, "Team name must be at least 2 characters.")
                .max(80, "Team name cannot exceed 80 characters.")
                .optional(),
            gpmId: uuidSchema.nullable().optional(),
            groupManagerIds: z
                .array(uuidSchema)
                .max(2, "A team can have at most 2 Group Managers.")
                .optional(),
        })
        .refine((data) => Object.keys(data).length > 0, {
            message: "Provide at least one field to update.",
        }),
};

export const teamIdParamSchema = {
    params: z.object({
        teamId: uuidSchema,
    }),
};

export const listTeamsSchema = {
    query: z.object({
        batchId: uuidSchema.optional(),
        gpmId: uuidSchema.optional(),
        search: z.string().trim().optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
    }),
};

export const assignGroupManagersSchema = {
    params: z.object({
        teamId: uuidSchema,
    }),
    body: z.object({
        gpmId: uuidSchema.nullable().optional(),
        groupManagerIds: z
            .array(uuidSchema)
            .min(1, "Provide at least 1 Group Manager.")
            .max(2, "A team can have at most 2 Group Managers."),
    }),
};

export const manageTeamInternsSchema = {
    params: z.object({
        teamId: uuidSchema,
    }),
    body: z.object({
        internIds: z
            .array(uuidSchema)
            .min(1, "Provide at least 1 intern ID."),
    }),
};

export type CreateTeamInput = z.infer<typeof createTeamSchema.body>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema.body>;
export type ListTeamsQuery = z.infer<typeof listTeamsSchema.query>;
export type AssignGroupManagersInput = z.infer<typeof assignGroupManagersSchema.body>;
export type ManageTeamInternsInput = z.infer<typeof manageTeamInternsSchema.body>;