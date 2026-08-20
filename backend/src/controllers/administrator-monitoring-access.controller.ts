import {
  administratorMonitoringAccessService,
} from "../services/administrator-monitoring-access.service.js";
import {
  jsonController,
} from "../utils/controller.js";
import type {
  UpdateAdministratorMonitoringAccessInput,
} from "../validation/administrator-monitoring-access.validation.js";

export class AdministratorMonitoringAccessController {
  getCurrent =
    jsonController(
      200,
      "Administrator monitoring access fetched successfully",
      ({ req }) =>
        administratorMonitoringAccessService
          .getCurrent(
            req.user!.id,
            req.user!.role,
          ),
    );

  list =
    jsonController(
      200,
      "Administrator monitoring access list fetched successfully",
      () =>
        administratorMonitoringAccessService
          .listAdministrators(),
    );

  update =
    jsonController(
      200,
      "Administrator monitoring access updated successfully",
      ({ req }) =>
        administratorMonitoringAccessService
          .updateAdministrator(
            req.params
              .administratorUserId,
            req.body as UpdateAdministratorMonitoringAccessInput,
            req.user!.id,
          ),
    );
}

export const administratorMonitoringAccessController =
  new AdministratorMonitoringAccessController();
