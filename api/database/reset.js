const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function resetDatabase() {
  const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    multipleStatements: true
  };
  const dbName = process.env.DB_NAME || 'serina_evolution';

  let connection;

  try {
    console.log('🔗 Connecting to MySQL server...');
    connection = await mysql.createConnection(config);

    console.log(`🗑️ Dropping existing database ${dbName} if exists...`);
    await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    
    console.log('✅ Database reset completed!');
    
  } catch (error) {
    console.error('❌ Reset failed:', error.message);
  } finally {
    if (connection) {
      console.log('🔌 Database connection closed');
      await connection.end();
    }
  }
}

resetDatabase();