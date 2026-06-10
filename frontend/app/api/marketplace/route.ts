import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export async function GET() {
  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ cart_count: 0, wishlist_product_ids: [] });

  const { data, error } = await supabase.rpc("get_demo_marketplace_state");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const body = (await request.json()) as {
    action?: "cart" | "wishlist";
    productId?: string;
    variantId?: string;
  };

  if (!body.productId || !body.action) {
    return NextResponse.json({ error: "Missing marketplace action data." }, { status: 400 });
  }

  const result =
    body.action === "cart"
      ? await supabase.rpc("add_demo_cart_item", {
          target_product_id: body.productId,
          target_variant_id: body.variantId ?? null,
        })
      : await supabase.rpc("toggle_demo_wishlist", {
          target_product_id: body.productId,
        });

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 400 });
  }

  return NextResponse.json(result.data);
}
