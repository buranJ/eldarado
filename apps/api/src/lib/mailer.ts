import nodemailer from 'nodemailer';
import { env } from './env.js';

export const mailConfigured = (): boolean =>
  Boolean(
    env.smtp.host &&
      Number.isInteger(env.smtp.port) &&
      env.smtp.port > 0 &&
      env.smtp.user &&
      env.smtp.pass &&
      env.smtp.from,
  );

const transport = mailConfigured()
  ? nodemailer.createTransport({
      host: env.smtp.host!,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: { user: env.smtp.user!, pass: env.smtp.pass! },
    })
  : null;

export const sendPasswordResetEmail = async (input: {
  email: string;
  displayName: string;
  token: string;
}): Promise<void> => {
  if (!transport || !env.smtp.from) throw new Error('SMTP не настроен');
  const url = new URL('/', env.appOrigin);
  url.searchParams.set('resetToken', input.token);
  const safeName = input.displayName
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  await transport.sendMail({
    from: env.smtp.from,
    to: input.email,
    subject: 'Восстановление пароля GameStock',
    text: `Здравствуйте, ${safeName}. Чтобы задать новый пароль GameStock, откройте ссылку: ${url.toString()}\n\nСсылка действует 30 минут и может быть использована один раз. Если вы не запрашивали восстановление, проигнорируйте письмо.`,
    html: `<p>Здравствуйте, ${safeName}.</p><p>Чтобы задать новый пароль GameStock, откройте ссылку:</p><p><a href="${url.toString()}">Задать новый пароль</a></p><p>Ссылка действует 30 минут и может быть использована один раз. Если вы не запрашивали восстановление, проигнорируйте письмо.</p>`,
  });
};
