import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Noto_Sans_Bengali } from "next/font/google";
import { ArrowDown, ArrowUpRight, Compass, MapPin, Mountain, Waves, Trees } from "lucide-react";
import styles from "./home.module.css";

const bengali = Noto_Sans_Bengali({ subsets: ["bengali", "latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Unmukto | ভ্রমণের নতুন গল্প",
  description: "উন্মুক্তর সাথে বাংলাদেশের পাহাড়, জল আর সবুজের পথে নতুন ভ্রমণের গল্প। আমাদের আসন্ন ট্যুর আয়োজনের খবর জানুন।",
  openGraph: { title: "Unmukto — ভ্রমণের নতুন গল্প", description: "চেনা গণ্ডির বাইরে, নতুন পথের খোঁজে।", locale: "bn_BD", type: "website" },
};

const journeys = [
  { number: "০১", label: "পাহাড়ের পথে", detail: "মেঘের কাছাকাছি, সবুজ পাহাড় আর নতুন পথের খোঁজে।", english: "THE HILLS", icon: Mountain, color: styles.hills },
  { number: "০২", label: "জলের কাছে", detail: "নদী, হাওর কিংবা সমুদ্র—জলের পাশে একটু অন্যরকম সময়।", english: "THE WATER", icon: Waves, color: styles.water },
  { number: "০৩", label: "সবুজের মাঝে", detail: "প্রকৃতির কাছে ফিরে যাওয়া, ব্যস্ততার বাইরে কিছুটা অবকাশ।", english: "THE GREEN", icon: Trees, color: styles.green },
];

export default function Home() {
  return (
    <div lang="bn" className={`${styles.home} ${bengali.className}`}>
      <a href="#main" className={styles.skipLink}>মূল অংশে যান</a>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="উন্মুক্ত হোম">
          <span className={styles.brandMark}><Compass size={26} strokeWidth={1.5} aria-hidden="true" /></span>
          <span><strong lang="en">UNMUKTO<span className={styles.brandDot}>.</span></strong><small>খোলা পথে, নতুন গল্পে</small></span>
        </Link>
        <nav aria-label="প্রধান নেভিগেশন" className={styles.nav}>
          <a href="#journeys">ভ্রমণের ভাবনা</a><a href="#about">আমাদের কথা</a>
          <a href="#upcoming" className={styles.navButton}>আসন্ন আয়োজন <ArrowUpRight size={16} aria-hidden="true" /></a>
        </nav>
      </header>
      <main id="main">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><span /> বাংলাদেশের পথে, একসাথে</p>
            <h1 id="hero-title">চেনা গণ্ডির বাইরে,<br />গল্প হোক <span className={styles.headingAccent}>নতুন পথে।</span></h1>
            <p className={styles.heroDescription}>পাহাড়ের মেঘ, নদীর হাওয়া আর সবুজের নীরবতা। একটু থামুন, চারপাশটা দেখুন—উন্মুক্তর সাথে শুরু হোক আপনার পরের ভ্রমণের গল্প।</p>
            <div className={styles.heroActions}>
              <a href="#upcoming" className={styles.primaryButton}>আসন্ন আয়োজন দেখুন <ArrowUpRight size={20} aria-hidden="true" /></a>
              <a href="#about" className={styles.textLink}>উন্মুক্তকে জানুন <ArrowDown size={17} aria-hidden="true" /></a>
            </div>
            <div className={styles.heroNote}><span className={styles.noteIcon}><MapPin size={21} aria-hidden="true" /></span><p>শুরুটা বাংলাদেশ থেকে।<br /><strong>সামনে আরও কত পথ, কত গল্প।</strong></p></div>
          </div>
          <div className={styles.heroArt}>
            <Image src="/images/unmukto-landscape.svg" alt="সবুজ পাহাড়ের মধ্য দিয়ে বয়ে যাওয়া নদী, পালতোলা নৌকা আর সোনালি সূর্যের ভ্রমণচিত্র" fill priority sizes="(max-width: 760px) 100vw, 48vw" className={styles.landscape} />
            <div className={styles.artLabel}><span className={styles.labelDot} /><span lang="en">A LITTLE CLOSER TO NATURE</span></div>
            <div className={styles.artCaption}><span lang="en">GO SOMEWHERE.</span><strong>ফিরুন এক নতুন গল্প নিয়ে।</strong></div>
            <span className={styles.artStamp} aria-hidden="true"><Compass size={28} strokeWidth={1} /><span lang="en">TAKE THE<br />SCENIC ROUTE</span></span>
          </div>
        </section>
        <div className={styles.strip}><span>নতুন জায়গা</span><span aria-hidden="true">✳</span><span>নতুন অভিজ্ঞতা</span><span aria-hidden="true">✳</span><span>একসাথে পথচলা</span><span aria-hidden="true">✳</span><span>মনে রাখার মতো গল্প</span></div>
        <section id="journeys" className={styles.journeys} aria-labelledby="journeys-title">
          <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>ভ্রমণের ভাবনা</p><h2 id="journeys-title">মন কোন পথে যেতে চায়?</h2></div><p>বাংলাদেশকে নতুন করে দেখার<br />অনেক পথ এখনো বাকি।</p></div>
          <div className={styles.journeyGrid}>{journeys.map(({ number, label, detail, english, icon: Icon, color }) => (
            <article key={number} className={`${styles.journeyCard} ${color}`}>
              <div className={styles.journeyTop}><span>{number}</span><Icon size={38} strokeWidth={1.2} aria-hidden="true" /></div>
              <p lang="en" className={styles.journeyEnglish}>{english}</p><h3>{label}</h3><p className={styles.journeyDetail}>{detail}</p>
            </article>
          ))}</div>
          <p className={styles.journeyDisclaimer}>এগুলো আমাদের ভ্রমণের অনুপ্রেরণা। নির্দিষ্ট ট্যুরের তারিখ ও বিস্তারিত আসন্ন আয়োজন বিভাগে প্রকাশ করা হবে।</p>
        </section>
        <section id="about" className={styles.about} aria-labelledby="about-title">
          <div className={styles.aboutVisual}><span lang="en">LESS ROUTINE.<br />MORE <em>WONDER.</em></span><Compass size={106} strokeWidth={.65} aria-hidden="true" /></div>
          <div className={styles.aboutCopy}><p className={styles.eyebrow}>আমাদের কথা</p><h2 id="about-title">ভ্রমণ শুধু গন্তব্য নয়,<br />পথের গল্পও।</h2><p>উন্মুক্তর ভাবনা সহজ—দৈনন্দিন ব্যস্ততার বাইরে গিয়ে নতুন জায়গা দেখা, প্রকৃতির কাছে থাকা আর একসাথে সুন্দর কিছু স্মৃতি তৈরি করা।</p><p>আমরা নিজেদের ট্যুর আয়োজন নিয়ে কাজ করছি। প্রতিটি আয়োজনের তারিখ, যাত্রাপথ, খরচ ও প্রয়োজনীয় তথ্য এখানে প্রকাশ করা হবে, যাতে ভ্রমণের আগে আপনি পরিষ্কারভাবে সবকিছু জেনে নিতে পারেন।</p><span className={styles.aboutSignature}>চলুন, পথের দিকে তাকাই। <ArrowUpRight size={20} aria-hidden="true" /></span></div>
        </section>
        <section id="upcoming" className={styles.upcoming} aria-labelledby="upcoming-title">
          <div className={styles.upcomingSymbol} aria-hidden="true"><Compass size={42} strokeWidth={1.2} /></div>
          <p className={styles.eyebrow}>আসন্ন আয়োজন</p><h2 id="upcoming-title">নতুন যাত্রার প্রস্তুতি চলছে।</h2><p>আমাদের প্রথম ট্যুর আয়োজনের তারিখ, বিস্তারিত ও বুকিংয়ের খবর শিগগিরই এখানে পাবেন।<br className={styles.desktopBreak} /> তার আগে, ভ্রমণের স্বপ্নগুলো গুছিয়ে রাখুন।</p>
          <span className={styles.comingSoon}><span /> ট্যুর ঘোষণা শিগগিরই</span>
        </section>
      </main>
      <footer className={styles.footer}><div><strong lang="en">UNMUKTO.</strong><span>খোলা পথে, নতুন গল্পে।</span></div><p lang="en">© {new Date().getFullYear()} Unmukto. All rights reserved.</p><a href="#main">উপরে ফিরুন ↑</a></footer>
    </div>
  );
}
