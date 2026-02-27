import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgres://postgres:mM202038%40@localhost:5432/despfamiliar'
});

async function listUsers() {
  try {
    const result = await pool.query(`
      SELECT id, name, email, premium, admin, created_at 
      FROM users 
      ORDER BY created_at DESC
    `);
    
    console.log('\n=== USUÁRIOS NO BANCO DE DADOS ===\n');
    
    if (result.rows.length === 0) {
      console.log('Nenhum usuário encontrado no banco de dados.');
    } else {
      console.log(`Total de usuários: ${result.rows.length}\n`);
      
      result.rows.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Premium: ${user.premium ? 'Sim' : 'Não'}`);
        console.log(`   Admin: ${user.admin ? 'Sim' : 'Não'}`);
        console.log(`   Criado em: ${new Date(user.created_at).toLocaleString('pt-BR')}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('Erro ao consultar usuários:', error.message);
  } finally {
    await pool.end();
  }
}

listUsers();
