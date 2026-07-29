import { permissionCatalog } from "../constants/permissions.js";
import { jsonController } from "../utils/controller.js";

export class PermissionCatalogController {
  get = jsonController(200, "Permission catalog fetched successfully", () => permissionCatalog);
}

export const permissionCatalogController = new PermissionCatalogController();
