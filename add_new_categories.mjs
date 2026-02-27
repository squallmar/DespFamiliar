import pkg from 'pg';
const { Pool } = pkg;
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/despfamiliar'
});

async function addNewCategories() {
  try {
    console.log('🔍 Buscando todos os usuários...');
    const usersResult = await pool.query('SELECT id, email FROM users');
    const users = usersResult.rows;
    
    console.log(`📊 Encontrados ${users.length} usuário(s)\n`);

    const newCategories = [
      { name: 'Dívidas', color: '#E74C3C', icon: '💳' },
      { name: 'Cartões de Crédito', color: '#C0392B', icon: '💸' }
    ];

    for (const user of users) {
      console.log(`👤 Processando usuário: ${user.email}`);
      
      for (const category of newCategories) {
        // Verificar se a categoria já existe para o usuário
        const existingResult = await pool.query(
          'SELECT id FROM categories WHERE user_id = $1 AND name = $2',
          [user.id, category.name]
        );
        
        if (existingResult.rows.length > 0) {
          console.log(`   ⏭️  Categoria "${category.name}" já existe, pulando...`);
        } else {
          const id = uuidv4();
          await pool.query(
            'INSERT INTO categories (id, name, color, icon, user_id) VALUES ($1, $2, $3, $4, $5)',
            [id, category.name, category.color, category.icon, user.id]
          );
          console.log(`   ✅ Adicionada categoria "${category.name}"`);
        }
      }
      console.log('');
    }

    console.log('✨ Processo concluído com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao adicionar categorias:', error);
    process.exit(1);
  }
}

addNewCategories();
