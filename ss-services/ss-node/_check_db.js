// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

const path = require('path');
const mod = require(path.resolve('node_modules/.pnpm/sqlite3@6.0.1/node_modules/sqlite3'));
const dbPath = path.resolve('../../ss-project/测试工程/db/system.db');
const db = new mod.Database(dbPath);

db.all('PRAGMA table_info(dev_devices)', (err, rows) => {
  if (err) { console.error(err); db.close(); return; }
  console.log('=== Schema ===');
  rows.forEach(r => console.log(r.cid, r.name, r.type, r.dflt_value, 'pk=' + r.pk));
  
  db.all('SELECT sql FROM sqlite_master WHERE type="table" AND name="dev_devices"', (err2, rows2) => {
    if (err2) { console.error(err2); }
    console.log('=== CREATE TABLE ===');
    if (rows2 && rows2[0]) console.log(rows2[0].sql);
    
    db.all('SELECT id, device_name, device_code, projectId FROM dev_devices', (err3, rows3) => {
      console.log('=== Data ===');
      console.log(JSON.stringify(rows3, null, 2));
      db.close();
    });
  });
});
