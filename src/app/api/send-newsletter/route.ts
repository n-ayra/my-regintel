import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { fetchUpdates } from '@/lib/fetchUpdates';
import { renderNewsletter } from '@/lib/renderNewsletter';

export async function GET() {
  const articles = await fetchUpdates();
  const html = renderNewsletter(articles);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: `"Regintels" <${process.env.EMAIL_USER}>`,
      to: 'h@prefchem.com.my',
      subject: 'Weekly Regulatory Updates',
      html,
    });

    return NextResponse.json({ status: 'success', message: 'Email sent!' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ status: 'error', message: 'Failed to send email' });
  }
}
