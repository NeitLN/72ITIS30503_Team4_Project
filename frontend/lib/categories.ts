import { getSupabaseClient } from "@/lib/supabase";

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  sort_order: number;
};

export type Category = CategoryRow & {
  children: Category[];
};

const sampleCategories: CategoryRow[] = [
  { id: "sample-laptop", name: "Laptop", slug: "laptop", parent_id: null, sort_order: 1 },
  { id: "sample-phone", name: "Phone", slug: "phone", parent_id: null, sort_order: 2 },
  { id: "sample-accessories", name: "Accessories", slug: "accessories", parent_id: null, sort_order: 3 },
  { id: "sample-fashion", name: "Fashion", slug: "fashion", parent_id: null, sort_order: 4 },
];

export function buildCategoryTree(rows: CategoryRow[]): Category[] {
  const categoryMap = new Map<string, Category>();

  rows.forEach((row) => {
    categoryMap.set(row.id, { ...row, children: [] });
  });

  const roots: Category[] = [];

  rows.forEach((row) => {
    const category = categoryMap.get(row.id);

    if (!category) return;

    const parent = row.parent_id ? categoryMap.get(row.parent_id) : null;
    if (parent) {
      parent.children.push(category);
    } else {
      roots.push(category);
    }
  });

  const sortCategories = (categories: Category[]) => {
    categories.sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
    );
    categories.forEach((category) => sortCategories(category.children));
  };

  sortCategories(roots);
  return roots;
}

export async function getCategories(): Promise<Category[]> {
  const supabase = getSupabaseClient();

  // Backend retrieval: the navigation reads every active category from Supabase.
  // parent_id is included so the flat database result can become a nested menu.
  if (supabase) {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug, parent_id, sort_order")
      .eq("is_active", true)
      .order("sort_order")
      .order("name");

    if (!error && data?.length) {
      return buildCategoryTree(data as CategoryRow[]);
    }

    if (error) {
      console.error("Could not load navigation categories from Supabase:", error.message);
    }
  }

  // The migration seeds the same records in Supabase. This fallback lets the
  // project build and demonstrate the menu before local Supabase keys are set.
  return buildCategoryTree(sampleCategories);
}
