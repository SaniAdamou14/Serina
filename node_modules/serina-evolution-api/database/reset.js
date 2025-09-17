const mysql = require('mysql2/promise');

async function resetDatabase() {
  const config = {
    host: 'localhost',
    user: 'root',
    password: '', // WAMP default
    multipleStatements: true
  };

  let connection;

  try {
    console.log('🔗 Connecting to MySQL server...');
    connection = await mysql.createConnection(config);
    
    console.log('🗑️ Dropping existing database if exists...');
    await connection.query('DROP DATABASE IF EXISTS serina_evolution');
    
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