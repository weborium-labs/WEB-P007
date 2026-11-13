import type { RequestHandler } from "express";
import { getValidated } from "../middlewares/validate.middleware.js";
import * as teamService from "../services/team.service.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import type {
    AssignGroupManagersInput,
    CreateTeamInput,
    ListTeamsQuery,
    ManageTeamInternsInput,
    UpdateTeamInput,
} from "../validators/team.validator.js";

import type { UserRole } from "../services/team.service.js";

function getRequester(req: Parameters<RequestHandler>[0]) {
    const user = req.user as { id?: string; role?: UserRole } | undefined;
    if (!user?.id || !user?.role) {
        throw new ApiError(401, "Authentication required.");
    }
    return {
        id: user.id,
        role: user.role,
    };
}

export const createTeam: RequestHandler = asyncHandler(async (req, res) => {
    const input = getValidated<CreateTeamInput>(req, "body");
    const requester = getRequester(req);
    const team = await teamService.createTeam(input, requester);

    return res
        .status(201)
        .json(new ApiResponse(201, team, "Team created successfully."));
});

export const getAllTeams: RequestHandler = asyncHandler(async (req, res) => {
    const query = getValidated<ListTeamsQuery>(req, "query");
    const requester = getRequester(req);
    const result = await teamService.getAllTeams(query, requester);

    return res
        .status(200)
        .json(new ApiResponse(200, result, "Teams fetched successfully."));
});

export const getTeamById: RequestHandler = asyncHandler(async (req, res) => {
    const { teamId } = getValidated<{ teamId: string }>(req, "params");
    const requester = getRequester(req);
    const team = await teamService.getTeamById(teamId, requester);

    return res
        .status(200)
        .json(new ApiResponse(200, team, "Team fetched successfully."));
});

export const updateTeam: RequestHandler = asyncHandler(async (req, res) => {
    const { teamId } = getValidated<{ teamId: string }>(req, "params");
    const input = getValidated<UpdateTeamInput>(req, "body");
    const requester = getRequester(req);
    const team = await teamService.updateTeam(teamId, input, requester);

    return res
        .status(200)
        .json(new ApiResponse(200, team, "Team updated successfully."));
});

export const assignGroupManagers: RequestHandler = asyncHandler(async (req, res) => {
    const { teamId } = getValidated<{ teamId: string }>(req, "params");
    const input = getValidated<AssignGroupManagersInput>(req, "body");
    const team = await teamService.assignGroupManagers(teamId, input);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                team,
                "Group Manager(s) assigned to team successfully.",
            ),
        );
});

export const addInternsToTeam: RequestHandler = asyncHandler(async (req, res) => {
    const { teamId } = getValidated<{ teamId: string }>(req, "params");
    const input = getValidated<ManageTeamInternsInput>(req, "body");
    const requester = getRequester(req);
    const team = await teamService.addInternsToTeam(teamId, input, requester);

    return res
        .status(200)
        .json(new ApiResponse(200, team, "Intern(s) added to team successfully."));
});

export const removeInternsFromTeam: RequestHandler = asyncHandler(async (req, res) => {
    const { teamId } = getValidated<{ teamId: string }>(req, "params");
    const input = getValidated<ManageTeamInternsInput>(req, "body");
    const requester = getRequester(req);
    const team = await teamService.removeInternsFromTeam(teamId, input, requester);

    return res
        .status(200)
        .json(
            new ApiResponse(200, team, "Intern(s) removed from team successfully."),
        );
});

export const deleteTeam: RequestHandler = asyncHandler(async (req, res) => {
    const { teamId } = getValidated<{ teamId: string }>(req, "params");
    const requester = getRequester(req);
    const result = await teamService.deleteTeam(teamId, requester);

    return res
        .status(200)
        .json(new ApiResponse(200, result, "Team deleted successfully."));
});