import nodemailer from 'nodemailer';

export async function sendResetEmail(to: string, token: string) {
  // Configure seu SMTP real aqui
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset/confirm?token=${token}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@despfamiliar.com',
    to,
    subject: 'Redefinição de senha - DespFamiliar',
    html: `<p>Você solicitou a redefinição de senha.</p>
      <p>Clique no link abaixo para criar uma nova senha:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Se não foi você, ignore este email.</p>`
  });
}
