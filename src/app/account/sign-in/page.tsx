import Link from "next/link";
import { redirect } from "next/navigation";
import { customerAuth, getCustomerSession, isCustomerAuthConfigured } from "@/customer-auth";
import { PublicHeader } from "@/components/public-header";
import { customerReturnTo } from "@/lib/customer-return";

export default async function CustomerSignInPage({ searchParams }: {
  searchParams: Promise<{ next?: string | string[]; callbackUrl?: string | string[]; error?: string | string[] }>;
}) {
  const query = await searchParams;
  const next = customerReturnTo(query.next ?? query.callbackUrl);
  const configured = isCustomerAuthConfigured();
  if (await getCustomerSession()) redirect(next);

  return (
    <div lang="bn" className="min-h-screen bg-[#f7f7ee] text-[#193d32]">
      <PublicHeader />
      <main className="mx-auto max-w-xl px-6 py-10">
        <h1 className="text-3xl font-bold">বুকিংয়ের জন্য সাইন ইন</h1>
        <p className="mt-3 text-[#526558]">Google অ্যাকাউন্ট দিয়ে সাইন ইন করে আসন সংরক্ষণ করুন ও বুকিংয়ের অবস্থা দেখুন।</p>
        {query.error && (
          <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-800">
            সাইন ইন করা যায়নি। আবার চেষ্টা করুন।
          </p>
        )}
        {configured ? (
          <form className="mt-6" action={async () => {
            "use server";
            if (!isCustomerAuthConfigured()) return;
            await customerAuth.signIn("google", { redirectTo: next });
          }}>
            <button className="rounded-lg bg-[#254f3e] px-4 py-2.5 font-medium text-white" type="submit">
              Google দিয়ে সাইন ইন
            </button>
          </form>
        ) : (
          <p className="mt-6 rounded-lg border border-[#cad2c4] p-4">গ্রাহক সাইন ইন এখনো চালু হয়নি।</p>
        )}
        <Link className="mt-6 inline-block underline underline-offset-4" href="/tours">ট্যুর তালিকায় ফিরুন</Link>
      </main>
    </div>
  );
}
