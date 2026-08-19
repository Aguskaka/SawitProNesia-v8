import { login } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <main className="loginPage">
      <section className="loginCard">
        <div className="brandMark">🌴</div>
        <p className="eyebrow">SAWITPRONESIA v8</p>
        <h1>Masuk ke Kebun Anda</h1>
        <p className="muted">Foundation native Next.js + TypeScript dengan Supabase existing.</p>

        <form action={login} className="loginForm">
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          {error ? <div className="errorBox">{error}</div> : null}
          <button type="submit" className="primaryButton">Masuk</button>
        </form>
      </section>
    </main>
  );
}
