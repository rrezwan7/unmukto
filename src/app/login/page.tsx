import { signIn } from "@/auth";
import { isAuthConfigured } from "@/lib/admin-auth";

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const configured = isAuthConfigured();

  return (
    <main className="mx-auto w-full max-w-md p-8">
      <h1 className="text-3xl font-bold">Unmukto admin</h1>
      <p className="mt-3 text-muted-foreground">Sign in with your authorized GitHub account.</p>
      {error && <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-red-700">
        Sign-in could not be completed. Use an authorized account or contact the site administrator.
      </p>}
      {!configured ? (
        <p className="mt-6 rounded-md border p-4">Admin sign-in is awaiting setup. Contact the site administrator.</p>
      ) : (
        <form className="mt-6" action={async () => {
          "use server";
          await signIn("github", { redirectTo: "/admin/tours" });
        }}>
          <button className="rounded-md bg-primary px-5 py-3 text-primary-foreground" type="submit">
            Sign in with GitHub
          </button>
        </form>
      )}
    </main>
  );
}
