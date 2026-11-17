import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { sendSuccess } from '../../../shared/utils/response.js';

/** Tầng Controller: nhận request, gọi service, định dạng response. Không chứa nghiệp vụ. */
export const createAuthController = (authService) => ({
  login: asyncHandler(async (req, res) => {
    const data = await authService.login(req.body);
    sendSuccess(res, data, 'Đăng nhập thành công');
  }),

  me: asyncHandler(async (req, res) => {
    sendSuccess(res, req.user);
  }),
});
