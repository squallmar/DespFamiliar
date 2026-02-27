import pg from 'pg';
import bcrypt from 'bcryptjs';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgres://postgres:mM202038%40@localhost:5432/despfamiliar'
});

async function resetPasswords() {
  try {
    // Senha temporária para ambos os usuários
    const tempPassword = 'Temp123!';
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    
    // Usuário 2: Dayran
    const userId2 = '995c5a3a-126f-47cf-b52c-d39da33b4749';
    await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, userId2]
    );
    
    // Usuário 3: Marcel
    const userId3 = '815ac3d2-9fc2-47b4-8fea-7a5920aefc79';
    await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, userId3]
    );
    
    console.log('\n✅ Senhas resetadas com sucesso!\n');
    console.log('=== CREDENCIAIS TEMPORÁRIAS ===\n');
    console.log('Usuário: Dayran Daynela Bastidas Quintero');
    console.log('Email: dayranbastidas@gmail.com');
    console.log('Senha temporária: Temp123!\n');
    console.log('---\n');
    console.log('Usuário: Marcel da Silveira Mendes');
    console.log('Email: marcelmendes05@gmail.com');
    console.log('Senha temporária: Temp123!\n');
    console.log('⚠️  IMPORTANTE: Peça aos usuários para alterarem a senha após o primeiro login!\n');
    
  } catch (error) {
    console.error('Erro ao resetar senhas:', error.message);
  } finally {
    await pool.end();
  }
}

resetPasswords();
