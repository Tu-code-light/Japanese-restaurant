import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { sendSuccess } from '../../../shared/utils/response.js';

export const createPublicController = ({ tablesService, menuService }) => ({
  verifyTable: asyncHandler(async (req, res) => {
    sendSuccess(res, await tablesService.verifyToken(req.params.token));
  }),

  getTableMenu: asyncHandler(async (req, res) => {
    const table = await tablesService.resolveByToken(req.params.token);
    const menu = await menuService.getPublicMenu(table.storeId);
    sendSuccess(res, {
      table: { id: table.id, name: table.name, area: table.area },
      store: { id: table.storeId, name: table.storeName },
      menu,
    });
  }),
});
