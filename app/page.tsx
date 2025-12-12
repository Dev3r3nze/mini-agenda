// temporalmente en app/page.tsx (hacer commit + push)
export const dynamic = "force-dynamic";

export default function TestPage() {
  return (
    <main style={{padding:32}}>
      <h1>Deploy test: Static content</h1>
      <p>If you see this, Vercel serves / correctly.</p>
    </main>
  );
}
