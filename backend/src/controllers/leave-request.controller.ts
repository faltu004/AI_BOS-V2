import { leaveRequestService } from "../services/leave-request.service.js";
import { jsonController } from "../utils/controller.js";
import type {
  ApplyLeaveInput,
  LeaveDecisionInput,
  ListApprovalsQuery,
  ListMyLeaveQuery,
} from "../validation/leave-request.validation.js";

export class LeaveRequestController {
  apply = jsonController(201, "Leave request submitted successfully", ({ req }) =>
    leaveRequestService.apply(req.user?.id, req.body as ApplyLeaveInput),
  );

  myRequests = jsonController(200, "Leave requests fetched successfully", ({ req }) =>
    leaveRequestService.myRequests(req.user?.id, req.query as unknown as ListMyLeaveQuery),
  );

  approvals = jsonController(200, "Leave approvals fetched successfully", ({ req }) =>
    leaveRequestService.approvals(req.user?.id, req.query as unknown as ListApprovalsQuery),
  );

  decide = jsonController(200, "Leave request updated successfully", ({ req }) =>
    leaveRequestService.decide(req.user?.id, req.params.id, req.body as LeaveDecisionInput),
  );

  cancel = jsonController(200, "Leave request cancelled successfully", ({ req }) =>
    leaveRequestService.cancel(req.user?.id, req.params.id),
  );
}

export const leaveRequestController = new LeaveRequestController();
