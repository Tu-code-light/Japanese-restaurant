/**
 * Khởi tạo DB: chạy schema.sql rồi nạp dữ liệu mẫu (nếu DB còn trống).
 * Chạy: npm run db:init
 *
 * Tài khoản mẫu (ĐỔI NGAY khi triển khai thật):
 *   admin / admin123   (quản lý)
 *   staff / staff123   (nhân viên)
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { pool, withTransaction, closePool } from '../src/infrastructure/config/database.js';

const here = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const schema = await fs.readFile(path.join(here, '../db/schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('✔ Đã tạo schema');

  const reset = process.argv.includes('--reset') || process.argv.includes('--force');
  if (reset) {
    await pool.query('TRUNCATE stores, users, tables, categories, menu_items, orders, order_items RESTART IDENTITY CASCADE;');
    console.log('✔ Đã làm mới cơ sở dữ liệu');
  } else {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM stores');
    if (rows[0].n > 0) {
      console.log('• DB đã có dữ liệu. Dùng "npm run db:reset" nếu muốn nạp lại từ đầu theo menu mới.');
      return;
    }
  }

  await withTransaction(async (db) => {
    const { rows: [store] } = await db.query(
      `INSERT INTO stores (name) VALUES ('Quán Demo QR') RETURNING id`,
    );

    const [adminHash, staffHash] = await Promise.all([bcrypt.hash('admin123', 10), bcrypt.hash('staff123', 10)]);
    await db.query(
      `INSERT INTO users (store_id, username, password_hash, full_name, role) VALUES
         ($1,'admin',$2,'Quản lý','admin'),
         ($1,'staff',$3,'Nhân viên','staff')`,
      [store.id, adminHash, staffHash],
    );



    const menu = {
      'Sushi & Sashimi': [
        ['Sushi cá hồi', 59000, '2 miếng sushi cá hồi tươi'],
        ['Sushi cá ngừ', 65000, '2 miếng sushi cá ngừ'],
        ['Sushi tôm', 49000, '2 miếng sushi tôm luộc'],
        ['California Roll', 79000, 'Cuộn sushi thanh cua, bơ và dưa leo'],
        ['Salmon Roll', 99000, 'Sushi cuộn cá hồi và rong biển'],
        ['Sashimi cá hồi', 129000, '5 lát cá hồi tươi ăn kèm wasabi'],
        ['Sashimi cá ngừ', 139000, '5 lát cá ngừ tươi']
      ],

      'Ramen & Udon': [
        ['Shoyu Ramen', 99000, 'Mì ramen nước tương Nhật'],
        ['Miso Ramen', 109000, 'Mì ramen nước dùng miso'],
        ['Tonkotsu Ramen', 119000, 'Mì ramen nước dùng xương heo'],
        ['Spicy Ramen', 109000, 'Mì ramen cay kiểu Nhật'],
        ['Tempura Udon', 99000, 'Mì udon ăn kèm tôm tempura'],
        ['Beef Udon', 109000, 'Mì udon thịt bò']
      ],

      'Cơm Nhật - Donburi': [
        ['Gyudon', 89000, 'Cơm thịt bò xào hành tây'],
        ['Katsudon', 99000, 'Cơm thịt heo chiên xù và trứng'],
        ['Oyakodon', 89000, 'Cơm gà và trứng kiểu Nhật'],
        ['Chicken Teriyaki', 99000, 'Cơm gà sốt teriyaki'],
        ['Katsu Curry', 109000, 'Cơm cà ri Nhật với thịt chiên xù'],
        ['Unadon', 189000, 'Cơm lươn nướng sốt Nhật']
      ],

      'Món ăn nhẹ Nhật Bản': [
        ['Takoyaki', 49000, '6 viên bánh bạch tuộc'],
        ['Gyoza', 59000, '5 bánh xếp Nhật áp chảo'],
        ['Tôm Tempura', 89000, 'Tôm chiên giòn kiểu Nhật'],
        ['Karaage', 69000, 'Gà chiên giòn kiểu Nhật'],
        ['Edamame', 39000, 'Đậu nành Nhật luộc'],
        ['Korokke', 49000, 'Bánh khoai tây chiên xù']
      ],

      'Đồ uống & Tráng miệng': [
        ['Trà xanh Nhật', 25000, 'Trà xanh nóng hoặc lạnh'],
        ['Matcha Latte', 45000, 'Matcha Nhật kết hợp sữa tươi'],
        ['Trà đào', 35000, 'Trà đào thanh mát'],
        ['Ramune', 45000, 'Nước ngọt có ga kiểu Nhật'],
        ['Mochi', 39000, '2 bánh mochi nhân ngọt'],
        ['Dorayaki', 39000, 'Bánh rán Nhật nhân đậu đỏ'],
        ['Kem Matcha', 45000, 'Kem vị trà xanh Nhật Bản']
      ]


    };

    let order = 0;
    for (const [catName, items] of Object.entries(menu)) {
      const { rows: [cat] } = await db.query(
        'INSERT INTO categories (store_id, name, sort_order) VALUES ($1,$2,$3) RETURNING id',
        [store.id, catName, order++],
      );
      for (const [name, price, description] of items) {
        await db.query(
          'INSERT INTO menu_items (store_id, category_id, name, description, price) VALUES ($1,$2,$3,$4,$5)',
          [store.id, cat.id, name, description, price],
        );
      }
    }

    for (let i = 1; i <= 10; i++) {
      await db.query(
        'INSERT INTO tables (store_id, name, area, qr_token) VALUES ($1,$2,$3,$4)',
        [store.id, `Bàn ${i}`, i <= 5 ? 'Tầng 1' : 'Tầng 2', crypto.randomBytes(24).toString('hex')],
      );
    }
  });
  console.log('✔ Đã nạp dữ liệu mẫu (10 bàn, 7 món, 2 tài khoản)');
}

main()
  .catch((err) => {
    console.error('❌ Khởi tạo DB thất bại:', err);
    process.exitCode = 1;
  })
  .finally(closePool);
