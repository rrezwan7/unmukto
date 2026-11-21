import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="mt-auto border-t border-[#d6ddcd] bg-[#f7f7ee]">
      <div className="mx-auto flex max-w-[1300px] flex-wrap items-center justify-between gap-6 px-6 py-8 text-xs text-[#61746a] md:px-12">
        <div className="flex items-center gap-4">
          <strong className="text-base tracking-tight text-[#193d32] font-sans">
            UNMUKTO.
          </strong>
          <span>খোলা পথে, নতুন গল্পে।</span>
        </div>

        <p className="text-xs">
          © {new Date().getFullYear()} Unmukto. All rights reserved.
        </p>

        <div className="flex items-center gap-4">
          <Link href="/login" className="hover:text-[#193d32]">
            অ্যাডমিন লগইন
          </Link>
          <a href="#top" className="hover:text-[#193d32]">
            উপরে ফিরুন ↑
          </a>
        </div>
      </div>
    </footer>
  );
}
