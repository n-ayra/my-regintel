import { NextResponse } from 'next/server';
import { supabase } from '@/lib/core/database';

// GET all keywords
export async function GET() {
  const { data, error } = await supabase.from('impact_keywords').select('*');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST new keyword
export async function POST(req: Request) {
  const { keyword, level } = await req.json();
  if (!keyword || !level) return NextResponse.json({ error: 'Missing keyword or level' }, { status: 400 });

  const { data, error } = await supabase.from('impact_keywords').insert({ keyword, level });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PUT: update keyword level
export async function PUT(req: Request) {
  const { id, level } = await req.json();
  if (!id || !level) return NextResponse.json({ error: 'Missing id or level' }, { status: 400 });

  const { data, error } = await supabase.from('impact_keywords').update({ level }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE keyword
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { data, error } = await supabase.from('impact_keywords').delete().eq('id', Number(id));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
