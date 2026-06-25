export default async function Category({ params }: { params: Promise<{ slug: string }> }) { const resolved = await params; return <div>Category: {resolved.slug}</div>; }
