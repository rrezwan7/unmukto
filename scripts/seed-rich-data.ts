import "dotenv/config";
import "temporal-polyfill/full/global";
import { Temporal } from "temporal-polyfill";
import postgres from "@prisma/orm-postgres/runtime";
import type { Contract } from "../src/prisma/contract.d";
import contractJson from "../src/prisma/contract.json" with { type: "json" };

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing.");
}

const db = postgres<Contract>({
  contractJson,
  url: process.env.DATABASE_URL,
});

async function main() {
  console.log("🌱 Starting rich seed data generation for Unmukto...");

  // 1. Create or ensure Seat Layout (36-Seat Tourist Coach)
  let coachLayout = await db.orm.public.SeatLayout
    .where({ name: "Luxury Hino 1J Tourist Coach (36 Seats)" })
    .first();

  if (!coachLayout) {
    coachLayout = await db.orm.public.SeatLayout.create({
      name: "Luxury Hino 1J Tourist Coach (36 Seats)",
      description: "২x২ সিটিং কনফিগারেশন, আরামদায়ক পুশ-ব্যাক সিট ও লেগ-স্পেস সহ মোট ৩৬ সিট",
    });
    console.log("Created Coach Layout:", coachLayout.id);

    // Create 36 seats: 9 rows (A to I), 4 seats per row (1, 2 left aisle, 3, 4 right aisle)
    const rows = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
    const seatsToCreate = [];
    for (let r = 0; r < rows.length; r++) {
      const rowLetter = rows[r];
      for (let c = 1; c <= 4; c++) {
        seatsToCreate.push({
          seatLayoutId: coachLayout.id,
          seatNumber: `${rowLetter}${c}`,
          rowNumber: r + 1,
          columnNumber: c,
          isAvailable: true,
        });
      }
    }
    await db.orm.public.Seat.createAll(seatsToCreate);
    console.log(`Created ${seatsToCreate.length} seats for coach layout.`);
  }

  // 2. Create or ensure Vehicles
  let coachVehicle = await db.orm.public.Vehicle
    .where({ registrationNumber: "DHAKA-METRO-BA-14-8921" })
    .first();

  if (!coachVehicle) {
    coachVehicle = await db.orm.public.Vehicle.create({
      name: "Unmukto Royal Express",
      type: "COACH",
      registrationNumber: "DHAKA-METRO-BA-14-8921",
      description: "হিনো ১-জে লাক্সারি ট্যুরিস্ট কোচ (এসি ও আরামদায়ক পুশব্যাক সিট)",
      seatLayoutId: coachLayout.id,
      isActive: true,
    });
    console.log("Created Coach Vehicle:", coachVehicle.id);
  }

  // 3. Create or ensure Partner Hotels & Rooms
  let sajekHotel = await db.orm.public.Hotel
    .where({ name: "মেঘকাব্য ইকো রিসোর্ট (Meghkabya Resort)" })
    .first();

  if (!sajekHotel) {
    sajekHotel = await db.orm.public.Hotel.create({
      name: "মেঘকাব্য ইকো রিসোর্ট (Meghkabya Resort)",
      location: "রুইলুই পাড়া, সাজেক ভ্যালি",
      address: "রুইলুই পাড়া হেলিপ্যাড সংলগ্ন, সাজেক ভ্যালি, বাঘাইছড়ি",
      phone: "+8801819000001",
      description: "সাজেকের মেঘের ভিউ সহ প্রিমিয়াম কাঠের কটেজ ও ইকো রিসোর্ট",
      isActive: true,
    });
    console.log("Created Sajek Hotel:", sajekHotel.id);

    await db.orm.public.Room.createAll([
      { hotelId: sajekHotel.id, roomNumber: "C-101", roomType: "COUPLE", capacity: 2, description: "হিল ভিউ কাপল কটেজ (ব্যালকনি সহ)" },
      { hotelId: sajekHotel.id, roomNumber: "C-102", roomType: "COUPLE", capacity: 2, description: "ক্লাউড ভিউ কাপল কটেজ" },
      { hotelId: sajekHotel.id, roomNumber: "S-201", roomType: "SHARED", capacity: 4, description: "৪ বেড শেয়ারিং রুম" },
      { hotelId: sajekHotel.id, roomNumber: "S-202", roomType: "SHARED", capacity: 4, description: "৪ বেড শেয়ারিং রুম" },
      { hotelId: sajekHotel.id, roomNumber: "P-301", roomType: "PRIVATE", capacity: 4, description: "ভিআইপি প্রাইভেট কাঠের বাংলো" },
    ]);
  }

  let haorHotel = await db.orm.public.Hotel
    .where({ name: "জলজোছনা প্রিমিয়াম হাউজবোট (Joljochna Houseboat)" })
    .first();

  if (!haorHotel) {
    haorHotel = await db.orm.public.Hotel.create({
      name: "জলজোছনা প্রিমিয়াম হাউজবোট (Joljochna Houseboat)",
      location: "টাঙ্গুয়ার হাওর, সুনামগঞ্জ",
      address: "সাহেব বাড়ি ঘাট, তাহিরপুর, সুনামগঞ্জ",
      phone: "+8801819000002",
      description: "টাঙ্গুয়ার হাওরে ভাসমান আধুনিক প্রিমিয়াম হাউজবোট",
      isActive: true,
    });
    console.log("Created Haor Hotel:", haorHotel.id);

    await db.orm.public.Room.createAll([
      { hotelId: haorHotel.id, roomNumber: "CABIN-01", roomType: "COUPLE", capacity: 2, description: "ওয়াটার ভিউ কাপল কেবিন (অ্যাটাচড ওয়াশরুম)" },
      { hotelId: haorHotel.id, roomNumber: "CABIN-02", roomType: "COUPLE", capacity: 2, description: "ওয়াটার ভিউ কাপল কেবিন (অ্যাটাচড ওয়াশরুম)" },
      { hotelId: haorHotel.id, roomNumber: "SHARED-01", roomType: "SHARED", capacity: 4, description: "৪ বেড হাউজবোট কেবিন" },
      { hotelId: haorHotel.id, roomNumber: "SUITE-01", roomType: "PRIVATE", capacity: 4, description: "মাস্টার সুইট কেবিন" },
    ]);
  }

  // 4. Tour Data Definitions
  const tourDataList = [
    {
      title: "মেঘের রাজ্য সাজেক ভ্যালি ও কংলাক পাহাড়",
      slug: "sajek-valley-cloud-kingdom",
      description: "পাহাড়ের বাঁকে মেঘেদের লুকোচুরি, কংলাক পাহাড়ের চূড়ায় দাঁড়িয়ে এক কাপ চা আর রুইলুই পাড়ার স্নিগ্ধ জীবন। চাঁদের গাড়ির রোমাঞ্চ, আলুটিলা গুহার রহস্য আর তারেং পাহাড়ের সূর্যাস্ত—উন্মুক্তর সাথে মেঘের দেশে তিন দিনের দারুণ অবকাশ।",
      coverImage: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
      itineraries: [
        {
          dayNumber: 1,
          title: "রাতের জার্নি ও খাগড়াছড়ি পৌঁছানো",
          description: "রাত ১০টায় আরামবাগ/কলাবাগান থেকে আরামদায়ক এসি বাসে খাগড়াছড়ির উদ্দেশ্যে যাত্রা শুরু।",
          destinations: [
            { name: "ঢাকা (আরামবাগ কাউন্টার)", description: "ট্যুর ব্রিফিং ও বাসে যাত্রা শুরু", arrivalTime: "২১:৩০", departureTime: "২২:০০" },
            { name: "খাগড়াছড়ি শহর", description: "সকালের নাস্তা ও চান্দের গাড়িতে স্থানান্তর", arrivalTime: "০৭:০০", departureTime: "০৮:৩০" },
          ],
        },
        {
          dayNumber: 2,
          title: "চান্দের গাড়িতে সাজেক ভ্যালি ও কংলাক পাহাড়ে সূর্যাস্ত",
          description: "সেনাবাহিনীর এসকর্টে সাজেক ভ্যালিতে প্রবেশ। রিসোর্টে চেক-ইন, দুপুরের খাবারের পর কংলাক পাহাড়ে মেঘের উপরে সূর্যাস্ত দর্শন ও রাতে ব্যাম্বু চিকেন বারবিকিউ।",
          destinations: [
            { name: "বাঘাইহাট পুলিশ ক্যাম্প (এসকর্ট)", description: "নিরাপত্তা এসকর্টের সাথে সাজেক প্রবেশ", arrivalTime: "১০:৩০", departureTime: "১১:০০" },
            { name: "রুইলুই পাড়া, সাজেক", description: "রিসোর্টে চেক-ইন ও দুপুরের পাহাড়ি খাবার", arrivalTime: "১২:৩০", departureTime: "১৫:০০" },
            { name: "কংলাক পাহাড় চূড়া", description: "সাজেকের সর্বোচ্চ চূড়ায় মেঘ দর্শন ও সূর্যাস্ত", arrivalTime: "১৬:০০", departureTime: "১৮:০০" },
          ],
        },
        {
          dayNumber: 3,
          title: "সাজেকের মেঘের ভোর ও আলুটিলা গুহা অভিযান",
          description: "ভোরবেলায় রিসোর্টের ব্যালকনি থেকে মেঘের ভেলা উপভোগ। সকালের নাস্তা শেষে খাগড়াছড়ি ফেরা, আলুটিলা রহস্যময় গুহা ও তারেং পাহাড়ে ভ্রমণ।",
          destinations: [
            { name: "হেলিপ্যাড, সাজেক", description: "ভোরের সূর্যোদয় ও মেঘের সমুদ্র দর্শন", arrivalTime: "০৫:৪৫", departureTime: "০৭:৩০" },
            { name: "আলুটিলা রহস্যময় গুহা", description: "মশাল জ্বালিয়ে প্রাকৃতিক পাথুরে গুহা পারাপার", arrivalTime: "১২:৩০", departureTime: "১৪:০০" },
            { name: "তারেং হিলটপ", description: "খাগড়াছড়ির মনোরম হিলটপ ভিউ", arrivalTime: "১৫:০০", departureTime: "১৭:০০" },
          ],
        },
      ],
      pricing: { adultFare: "6800.00", childFeeEnabled: true, childFare: "3800.00" },
      roomOptions: [
        { roomType: "SHARED" as const, surcharge: "0.00", maxAdults: 4, maxChildren: 2, maxOccupants: 4, description: "৪ জন শেয়ারিং রুম (সবার জন্য পৃথক সিঙ্গেল বেড)", displayOrder: 1 },
        { roomType: "COUPLE" as const, surcharge: "2000.00", maxAdults: 2, maxChildren: 1, maxOccupants: 3, description: "প্রাইভেট ক্লাউড-ভিউ কাপল কটেজ (ব্যালকনি ও অ্যাটাচড বাথ)", displayOrder: 2 },
        { roomType: "PRIVATE" as const, surcharge: "4500.00", maxAdults: 4, maxChildren: 2, maxOccupants: 6, description: "ভিআইপি প্রিমিয়াম ফ্যামিলি কটেজ", displayOrder: 3 },
      ],
      hotel: sajekHotel,
      departureDates: [
        { dep: "2026-11-20", ret: "2026-11-23" },
        { dep: "2026-11-27", ret: "2026-11-30" },
        { dep: "2026-12-04", ret: "2026-12-07" },
        { dep: "2026-12-18", ret: "2026-12-21" },
      ],
    },
    {
      title: "টাঙ্গুয়ার হাওর প্রিমিয়াম হাউজবোট ও নীলাদ্রি লেক",
      slug: "tanguar-haor-luxury-houseboat",
      description: "পান্না সবুজ জলে ভাসমান প্রিমিয়াম হাউজবোট, পাহাড়ি নদী জাদুকাটা, শিমুল বাগান ও মেঘালয়ের আকাশছোঁয়া পাহাড় ঘেরা নীলাদ্রি লেক। হাওরের বুকে পূর্ণিমা রাতে খোলা ছাদে গানের আসর ও খাঁটি দেশি খাবারের স্বাদ।",
      coverImage: "https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80",
      itineraries: [
        {
          dayNumber: 1,
          title: "সুনামগঞ্জ পৌঁছানো ও হাউজবোটে যাত্রা শুরু",
          description: "সকালে সুনামগঞ্জ পৌঁছে হাউজবোটে উঠা। ঐতিহ্যবাহী হাঁসের মাংস ও দেশি মাছ দিয়ে দুপুরের খাবার, টাঙ্গুয়ার ওয়াচটাওয়ার ও হাওরের নীল জলে সাঁতার।",
          destinations: [
            { name: "সাহেব বাড়ি ঘাট, তাহিরপুর", description: "হাউজবোটে স্বাগতম ড্রিংকস ও চেক-ইন", arrivalTime: "০৮:৩০", departureTime: "০৯:৩০" },
            { name: "টাঙ্গুয়ার হাওর ওয়াচ টাওয়ার", description: "হাওরের বুক চিরে ওয়াচ টাওয়ার দর্শন ও সাঁতার", arrivalTime: "১২:০০", departureTime: "১৫:০০" },
            { name: "টেকেরঘাট কয়লা খনি ঘাট", description: "হাউজবোট নোঙর ও রাতের বারবিকিউ পার্টি", arrivalTime: "১৭:৩০", departureTime: "২৩:০০" },
          ],
        },
        {
          dayNumber: 2,
          title: "নীলাদ্রি লেক, বারিক্কা টিলা ও জাদুকাটা নদী",
          description: "ভোরবেলায় নীলাদ্রি লেকের শান্ত স্নিগ্ধ জল দর্শন। মোটর বাইকে বা নৌকা যোগে বারিক্কা টিলা, সীমান্ত নদী জাদুকাটার স্ফটিক স্বচ্ছ জল ও শিমুল বাগান ঘুরে দেখা।",
          destinations: [
            { name: "নীলাদ্রি লেক (শহীদ সিরাজ লেক)", description: "নীল জলের লেক ও পাহাড়ের দৃশ্য", arrivalTime: "০৭:০০", departureTime: "০৯:০০" },
            { name: "বারিক্কা টিলা ও জাদুকাটা নদী", description: "মেঘালয়ের পাহাড় ও স্বচ্ছ কাঁচের মত নদী", arrivalTime: "১০:০০", departureTime: "১২:৩০" },
            { name: "জৈনপুর শিমুল বাগান", description: "বিশাল শিমুল গাছের ছায়ায় রূপময় প্রকৃতি", arrivalTime: "১৩:০০", departureTime: "১৪:৩০" },
          ],
        },
        {
          dayNumber: 3,
          title: "হাওর থেকে বিদায় ও ঢাকা ফেরা",
          description: "সকালের নাস্তা শেষে হাউজবোটে আরামদায়ক ফিরতি ক্রুজ। তাহিরপুর ঘাট হয়ে সুনামগঞ্জ শহর ও রাতে ঢাকার বাসে যাত্রা।",
          destinations: [
            { name: "তাহিরপুর ঘাট", description: "হাউজবোট থেকে চেক-আউট", arrivalTime: "১০:০০", departureTime: "১১:০০" },
            { name: "সুনামগঞ্জ সদর", description: "হাসন রাজার বাড়ি দর্শন ও কেনাকাটা", arrivalTime: "১২:০০", departureTime: "১৪:০০" },
          ],
        },
      ],
      pricing: { adultFare: "7800.00", childFeeEnabled: true, childFare: "4500.00" },
      roomOptions: [
        { roomType: "SHARED" as const, surcharge: "0.00", maxAdults: 4, maxChildren: 2, maxOccupants: 4, description: "৪ বেড শেয়ারিং কেবিন (কমন অ্যাটাচড বাথ)", displayOrder: 1 },
        { roomType: "COUPLE" as const, surcharge: "3000.00", maxAdults: 2, maxChildren: 1, maxOccupants: 3, description: "প্রিমিয়াম ওয়াটার-ভিউ কাপল কেবিন (ব্যক্তিগত অ্যাটাচড বাথ)", displayOrder: 2 },
        { roomType: "PRIVATE" as const, surcharge: "5500.00", maxAdults: 4, maxChildren: 2, maxOccupants: 5, description: "মাস্টার সুইট কেবিন (প্যানোরামিক ব্যালকনি)", displayOrder: 3 },
      ],
      hotel: haorHotel,
      departureDates: [
        { dep: "2026-11-21", ret: "2026-11-24" },
        { dep: "2026-12-05", ret: "2026-12-08" },
        { dep: "2026-12-25", ret: "2026-12-28" },
      ],
    },
    {
      title: "কেওক্রাডং চূড়া ও বগালেক রোমাঞ্চকর ট্রেইল",
      slug: "bandarban-keokradong-trail",
      description: "রহস্যঘেরা বগালেকের স্নিগ্ধ নীরবতা, চাঁদের গাড়িতে পাহাড়ি আঁকাবাঁকা পথ আর দেশের অন্যতম সর্বোচ্চ শৃঙ্গ কেওক্রাডং সামিট। দার্জিলিং পাড়ার জুম চাষিদের সহজ জীবন ও পাহাড়ি মেঘ ছুঁয়ে দেখা ট্রেকিং অ্যাডভেঞ্চার।",
      coverImage: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
      itineraries: [
        {
          dayNumber: 1,
          title: "বান্দরবান থেকে চান্দের গাড়িতে বগালেক",
          description: "সকালে বান্দরবান শহর থেকে রুমা বাজার হয়ে চান্দের গাড়িতে পাহাড়ি চড়াই-উতরাই পেরিয়ে প্রাকৃতিক বগালেকে পৌঁছানো। লেকের পাড়ে ট্রাইবাল কটেজে রাতযাপন।",
          destinations: [
            { name: "রুমা বাজার", description: "সেনাবাহিনীর এন্ট্রি পারমিশন ও গাইড নেওয়া", arrivalTime: "০৯:০০", departureTime: "১০:৩০" },
            { name: "বগালেক (Boga Lake)", description: "রহস্যময় বগালেকে পৌঁছানো ও আদিবাসী কটেজে চেক-ইন", arrivalTime: "১৩:০০", departureTime: "১৫:০০" },
          ],
        },
        {
          dayNumber: 2,
          title: "কেওক্রাডং চূড়ায় ট্রেকিং ও সামিট জয়",
          description: "ভোরবেলায় বগালেক থেকে ট্রেকিং শুরু। চিংড়ি ঝর্ণা ও দার্জিলিং পাড়া পার হয়ে কেওক্রাডং চূড়ায় পৌঁছানো এবং মেঘের বুক থেকে অপরূপ সূর্যাস্ত উপভোগ।",
          destinations: [
            { name: "চিংড়ি ঝর্ণা", description: "পাহাড়ি ট্রেইলে ঝর্ণার শীতল জল ও বিশ্রাম", arrivalTime: "০৮:০০", departureTime: "০৮:৪৫" },
            { name: "দার্জিলিং পাড়া", description: "পাহাড়ের চূড়ার আদিবাসী গ্রাম ও পাহাড়ি পেঁপে খাওয়া", arrivalTime: "১০:০০", departureTime: "১১:০০" },
            { name: "কেওক্রাডং সামিট (৩,১৭২ ফুট)", description: "বাংলাদেশের অন্যতম সর্বোচ্চ চূড়ায় অবস্থান ও ক্লাউড ভিউ", arrivalTime: "১২:০০", departureTime: "১৬:০০" },
          ],
        },
        {
          dayNumber: 3,
          title: "বগালেক থেকে ফিরে ঢাকা যাত্রা",
          description: "কেওক্রাডং থেকে নেমে বগালেক হয়ে রুমা বাজার এবং বান্দরবান শহর ফেরা। রাতে ঢাকার উদ্দেশ্যে যাত্রা।",
          destinations: [
            { name: "বান্দরবান শহর", description: "নীলাচল ও স্বর্ণমন্দির দর্শন", arrivalTime: "১৪:০০", departureTime: "১৭:০০" },
          ],
        },
      ],
      pricing: { adultFare: "8500.00", childFeeEnabled: false, childFare: "0.00" },
      roomOptions: [
        { roomType: "SHARED" as const, surcharge: "0.00", maxAdults: 4, maxChildren: 0, maxOccupants: 4, description: "ট্রাইবাল ব্যাম্বু কটেজ (ম্যাট ও ব্ল্যাঙ্কেট)", displayOrder: 1 },
        { roomType: "COUPLE" as const, surcharge: "2500.00", maxAdults: 2, maxChildren: 0, maxOccupants: 2, description: "মাউন্টেন ভিউ প্রাইভেট কাপল কটেজ", displayOrder: 2 },
      ],
      hotel: sajekHotel,
      departureDates: [
        { dep: "2026-11-28", ret: "2026-12-01" },
        { dep: "2026-12-12", ret: "2026-12-15" },
      ],
    },
    {
      title: "চায়ের দেশে স্নিগ্ধ নীরবতা — শ্রীমঙ্গল ও লাউয়াছড়া",
      slug: "sreemangal-tea-garden-escape",
      description: "সবুজ গালিচায় মোড়ানো মাইলের পর মাইল চা বাগান, লাউয়াছড়া রেইনফরেস্টের পাখির ডাক আর মাধবপুর লেকের পদ্মফুল। খাঁটি সাতরঙা চা আর নিস্তব্ধ প্রকৃতির কোলে চমৎকার একটি উইকএন্ড রিল্যাক্সিং ট্যুর।",
      coverImage: "https://images.unsplash.com/photo-1598970434795-0c54fe7c0648?auto=format&fit=crop&w=1200&q=80",
      itineraries: [
        {
          dayNumber: 1,
          title: "শ্রীমঙ্গল পৌঁছানো ও চা বাগানে সাইক্লিং",
          description: "সকালে ট্রেন বা বাসে শ্রীমঙ্গল পৌঁছানো। ইকো রিসোর্টে চেক-ইন ও বিকালে ফিনলে চা বাগানের আঁকাবাঁকা মেঠোপথে হেঁটে প্রকৃতির সান্নিধ্য।",
          destinations: [
            { name: "শ্রীমঙ্গল শহর", description: "রিসোর্টে চেক-ইন ও স্থানীয় খাবার", arrivalTime: "০৮:০০", departureTime: "০৯:০০" },
            { name: "ফিনলে টি এস্টেট", description: "চা পাতা তোলার দৃশ্য ও ফটোসেশন", arrivalTime: "১৫:০০", departureTime: "১৭:৩০" },
          ],
        },
        {
          dayNumber: 2,
          title: "লাউয়াছড়া জাতীয় উদ্যান ও মাধবপুর লেক",
          description: "ভোরে লাউয়াছড়া রেইনফরেস্টে ট্রেকিং (উল্লুক ও বিরল পশুপাখি দর্শন)। দুপুরে মাধবপুর লেকের পদ্মপুকুর ও রাতে ঢাকা ফেরা।",
          destinations: [
            { name: "লাউয়াছড়া জাতীয় উদ্যান", description: "রেইনফরেস্ট ট্রেইল ও বন দর্শন", arrivalTime: "০৭:০০", departureTime: "১০:০০" },
            { name: "মাধবপুর লেক", description: "চা বাগানের মাঝে নীল জলের পদ্ম লেক", arrivalTime: "১১:০০", departureTime: "১৩:০০" },
          ],
        },
      ],
      pricing: { adultFare: "5200.00", childFeeEnabled: true, childFare: "2800.00" },
      roomOptions: [
        { roomType: "SHARED" as const, surcharge: "0.00", maxAdults: 4, maxChildren: 2, maxOccupants: 4, description: "টি গার্ডেন ভিউ শেয়ারিং কটেজ", displayOrder: 1 },
        { roomType: "COUPLE" as const, surcharge: "1800.00", maxAdults: 2, maxChildren: 1, maxOccupants: 3, description: "ডিলাক্স ব্যালকনি কাপল রুম", displayOrder: 2 },
      ],
      hotel: sajekHotel,
      departureDates: [
        { dep: "2026-11-22", ret: "2026-11-24" },
        { dep: "2026-12-06", ret: "2026-12-08" },
      ],
    },
  ];

  for (const item of tourDataList) {
    let tour = await db.orm.public.Tour
      .where({ slug: item.slug })
      .first();

    if (!tour) {
      tour = await db.orm.public.Tour.create({
        title: item.title,
        slug: item.slug,
        description: item.description,
        coverImage: item.coverImage,
        isActive: true,
      });
      console.log(`Created Tour: "${item.title}" (ID: ${tour.id})`);
    } else {
      console.log(`Tour already exists: "${item.title}" (ID: ${tour.id})`);
    }

    // Create Itineraries & Destinations if not already present
    const existingItineraries = await db.orm.public.Itinerary
      .where({ tourId: tour.id })
      .all();

    if (existingItineraries.length === 0) {
      for (const itin of item.itineraries) {
        const createdItin = await db.orm.public.Itinerary.create({
          tourId: tour.id,
          dayNumber: itin.dayNumber,
          title: itin.title,
          description: itin.description,
        });

        for (const dest of itin.destinations) {
          await db.orm.public.Destination.create({
            itineraryId: createdItin.id,
            name: dest.name,
            description: dest.description,
            arrivalTime: dest.arrivalTime,
            departureTime: dest.departureTime,
          });
        }
      }
      console.log(`Created ${item.itineraries.length} itinerary days for Tour ID: ${tour.id}`);
    }

    // Create Departures, Pricing, RoomOptions & Vehicle Allocations
    for (const depDate of item.departureDates) {
      const depInstant = Temporal.Instant.from(`${depDate.dep}T22:00:00+06:00`);
      const retInstant = Temporal.Instant.from(`${depDate.ret}T18:00:00+06:00`);

      const existingDep = await db.orm.public.Departure
        .where({ tourId: tour.id })
        .all();

      const dateMatch = existingDep.find((d) => {
        try {
          return d.departureDate.toString().startsWith(depDate.dep);
        } catch {
          return false;
        }
      });

      let departureId: number;
      if (!dateMatch) {
        const createdDep = await db.orm.public.Departure.create({
          tourId: tour.id,
          departureDate: depInstant,
          returnDate: retInstant,
          departureTime: "22:00",
          returnTime: "18:00",
          bookingOpen: true,
          customerVisible: true,
        });
        departureId = createdDep.id;
        console.log(`Created Departure ${departureId} for Tour "${tour.title}" on ${depDate.dep}`);
      } else {
        departureId = dateMatch.id;
      }

      // Check / Create Pricing
      const existingPricing = await db.orm.public.DeparturePricing
        .where({ departureId })
        .first();

      if (!existingPricing) {
        await db.orm.public.DeparturePricing.create({
          departureId,
          adultFare: item.pricing.adultFare,
          childFeeEnabled: item.pricing.childFeeEnabled,
          childFare: item.pricing.childFare,
        });
      }

      // Check / Create Room Options
      const existingRooms = await db.orm.public.DepartureRoomOption
        .where({ departureId })
        .all();

      if (existingRooms.length === 0) {
        for (const ro of item.roomOptions) {
          await db.orm.public.DepartureRoomOption.create({
            departureId,
            roomType: ro.roomType,
            surcharge: ro.surcharge,
            maxAdults: ro.maxAdults,
            maxChildren: ro.maxChildren,
            maxOccupants: ro.maxOccupants,
            description: ro.description,
            displayOrder: ro.displayOrder,
            isAvailable: true,
          });
        }
      }

      // Check / Create Vehicle Allocation
      const existingVehicles = await db.orm.public.DepartureVehicle
        .where({ departureId })
        .all();

      if (existingVehicles.length === 0 && coachVehicle) {
        await db.orm.public.DepartureVehicle.create({
          departureId,
          vehicleId: coachVehicle.id,
          visibleToCustomer: true,
          displayName: "রয়েল এক্সপ্রেস লাক্সারি কোচ",
          displayOrder: 1,
        });
      }

      // Check / Create Hotel Stay
      const existingStays = await db.orm.public.HotelStay
        .where({ departureId })
        .all();

      if (existingStays.length === 0 && item.hotel) {
        await db.orm.public.HotelStay.create({
          departureId,
          hotelId: item.hotel.id,
          checkInDate: depInstant,
          checkOutDate: retInstant,
        });
      }
    }
  }

  console.log("✅ Rich tour and departure seed data successfully generated!");
}

main().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
