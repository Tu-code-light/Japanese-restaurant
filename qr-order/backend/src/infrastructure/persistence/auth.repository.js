import { query } from '../config/database.js';

/** Tầng Repository: CHỈ chứa SQL, không chứa logic nghiệp vụ. */
export const authRepository = {
  async findByUsername(username) {
    const { rows } = await query(
      `SELECT id, store_id, username, password_hash, full_name, role
         FROM users WHERE username = $1`,
      [username],
    );
    return rows[0] ?? null;
  },
};
