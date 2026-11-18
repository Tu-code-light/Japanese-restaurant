import { api } from './http';

export const menuApi = {
  // Lấy danh sách món ăn 
  getMenuItems: (params = {}, opts = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value);
      }
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return api.get(`/menu${queryString}`, opts);
  },

  // Lấy danh sách danh mục món ăn (Sushi, Sashimi, Ramen...)
  getCategories: (opts = {}) => {
    return api.get('/categories', opts);
  },
};