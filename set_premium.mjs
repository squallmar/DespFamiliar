import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgres://postgres:mM202038%40@localhost:5432/despfamiliar'
});

async function setPremium() {
  try {
    // Usuário 2: Dayran
    const userId2 = '995c5a3a-126f-47cf-b52c-d39da33b4749';
    await pool.query(
      'UPDATE users SET premium = true WHERE id = $1',
      [userId2]
    );
    
    // Usuário 3: Marcel
    const userId3 = '815ac3d2-9fc2-47b4-8fea-7a5920aefc79';
    await pool.query(
      'UPDATE users SET premium = true WHERE id = $1',
      [userId3]
    );
    
    console.log('\n✅ Status atualizado com sucesso!\n');
    console.log('=== USUÁRIOS AGORA PREMIUM ===\n');
    
    // Verifica os usuários atualizados
    const result = await pool.query(`
      SELECT id, name, email, premium, admin 
      FROM users 
      WHERE id IN ($1, $2)
      ORDER BY name
    `, [userId2, userId3]);
    
    result.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Premium: ${user.premium ? '⭐ Sim' : 'Não'}`);
      console.log(`   Admin: ${user.admin ? '👑 Sim' : 'Não'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Erro ao atualizar status premium:', error.message);
  } finally {
    await pool.end();
  }
}

setPremium();
