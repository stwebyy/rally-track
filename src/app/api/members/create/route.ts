import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('Create member API called');

    // Supabase認証チェック
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('Authentication failed:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { name } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    console.log('Creating member for user:', user.id, 'with name:', name);

    // 既存のメンバーがいるかチェック
    const { data: existingMember } = await supabase
      .from('harataku_members')
      .select('id, name')
      .eq('auth_id', user.id)
      .single();

    if (existingMember) {
      return NextResponse.json(
        {
          error: 'Member already exists',
          member: existingMember
        },
        { status: 409 }
      );
    }

    // 新しいメンバーを作成
    const { data: newMember, error: insertError } = await supabase
      .from('harataku_members')
      .insert([
        {
          name: name.trim(),
          auth_id: user.id
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating member:', insertError);
      throw insertError;
    }

    console.log('Member created successfully:', newMember);

    return NextResponse.json({
      member: newMember,
      message: 'Member created successfully'
    });

  } catch (error) {
    console.error('Create member API error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
