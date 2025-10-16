import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { name, email, currentPassword, newPassword } = await request.json();

    if (!name || !email) {
      return NextResponse.json({ error: 'Nome e email são obrigatórios' }, { status: 400 });
    }

    const db = await getDatabase();

    // Verifica se o email já está em uso por outro usuário
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email, user.userId]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json({ error: 'Este email já está em uso' }, { status: 400 });
    }

    // Se está alterando a senha
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Senha atual é obrigatória para alterar a senha' }, { status: 400 });
      }

      // Verifica a senha atual
      const userResult = await db.query('SELECT password, admin, premium FROM users WHERE id = $1', [user.userId]);
      const currentUser = userResult.rows[0];
      
      const isValid = await bcrypt.compare(currentPassword, currentUser.password);
      if (!isValid) {
        return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 401 });
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'A nova senha deve ter no mínimo 6 caracteres' }, { status: 400 });
      }

      // Atualiza com nova senha
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.query(
        'UPDATE users SET name = $1, email = $2, password = $3 WHERE id = $4',
        [name, email, hashedPassword, user.userId]
      );
      
      return NextResponse.json({ 
        message: 'Perfil atualizado com sucesso',
        user: { id: user.userId, name, email, premium: currentUser.premium, admin: currentUser.admin }
      });
    } else {
      // Atualiza apenas nome e email
      await db.query(
        'UPDATE users SET name = $1, email = $2 WHERE id = $3',
        [name, email, user.userId]
      );
      
      // Busca dados atualizados do usuário
      const updatedUser = await db.query('SELECT admin, premium FROM users WHERE id = $1', [user.userId]);
      const userData = updatedUser.rows[0];
      
      return NextResponse.json({ 
        message: 'Perfil atualizado com sucesso',
        user: { id: user.userId, name, email, premium: userData.premium, admin: userData.admin }
      });
    }

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 });
  }
}
