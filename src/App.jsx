import React, { useState, useMemo, useEffect, useRef } from "react";
import { Plane, MapPin, Users, Car, ChevronRight, Stamp, Calendar, GripVertical } from "lucide-react";

// ---------------------------------------------------------------------------
// Data layer — mirrors the "Calculator" sheet's real formulas & values.
// Three private-transport tier tables, exactly as in the source workbook.
// ---------------------------------------------------------------------------
const TIER_GENERAL = [
  { max: 6, cost: 30000 },
  { max: 12, cost: 100000 },
  { max: 16, cost: 125000 },
  { max: 35, cost: 205000 },
];
const TIER_AIRPORT = [
  { max: 8, cost: 25000 },
  { max: 17, cost: 50000 },
  { max: 26, cost: 75000 },
  { max: 35, cost: 100000 },
];
// used specifically for combo arrival/departure+city days (Airport Tokyo, Airport Osaka, Bullet Train days, Tokyo/Osaka + Airport)
const TIER_AIRPORT_CITY = [
  { max: 4, cost: 30000 },
  { max: 8, cost: 100000 },
  { max: 16, cost: 125000 },
  { max: 35, cost: 205000 },
];
const tierCost = (table, pax) => {
  if (!table) return 0;
  const hit = table.find((t) => pax <= t.max);
  return hit ? hit.cost : 0;
};

const MEAL_COST = { none: 0, breakfast: 1500, lunch: 2000, dinner: 2500 };
const HOTEL_COST = 9000;
const PUBLIC_FARE_PER_PAX = 2000; // train fare, adult & child only — infants excluded

const LOCATIONS = [
  { id: "arr_malam", group: "Arrival / Departure", name: "Airport (Night Arrival)", detail: "Airport Flight Malam", tier: TIER_AIRPORT, entrance: { adult: 0, child: 0 }, tgEntrance: 0, meal: "none", tgFee: 3000, hotel: true },
  { id: "arr_tokyo", group: "Arrival / Departure", name: "Airport Tokyo + Odaiba", detail: "Airport Flight Pagi · Odaiba", tier: TIER_AIRPORT_CITY, entrance: { adult: 0, child: 0 }, tgEntrance: 0, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "arr_osaka", group: "Arrival / Departure", name: "Airport Osaka + City", detail: "Airport Flight Pagi · Osaka Castle · Umeda Sky Building", tier: TIER_AIRPORT_CITY, entrance: { adult: 2500, child: 800 }, tgEntrance: 2500, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "tokyo_airport", group: "Arrival / Departure", name: "Tokyo + Departure", detail: "Odaiba → Airport (Night)", tier: TIER_AIRPORT_CITY, entrance: { adult: 0, child: 0 }, tgEntrance: 0, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "osaka_airport", group: "Arrival / Departure", name: "Osaka + Departure", detail: "Osaka Castle · Umeda Sky Building → Airport (Night)", tier: TIER_AIRPORT_CITY, entrance: { adult: 2600, child: 500 }, tgEntrance: 2600, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "arr_pagi", group: "Arrival / Departure", name: "Airport (Morning Departure)", detail: "Airport Balik Pagi", tier: TIER_AIRPORT, entrance: { adult: 0, child: 0 }, tgEntrance: 0, meal: "none", tgFee: 3000, hotel: false },
  { id: "tokyo_mix", group: "Tokyo", name: "Tokyo Mix", detail: "Asakusa · Shibuya", tier: TIER_GENERAL, entrance: { adult: 2500, child: 1500 }, tgEntrance: 2500, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "tokyo_1", group: "Tokyo", name: "Tokyo 1", detail: "Asakusa · Ueno · Akihabara", tier: TIER_GENERAL, entrance: { adult: 0, child: 0 }, tgEntrance: 0, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "tokyo_2", group: "Tokyo", name: "Tokyo 2", detail: "Harajuku · Shibuya", tier: TIER_GENERAL, entrance: { adult: 2500, child: 1500 }, tgEntrance: 2500, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "kamakura", group: "Tokyo", name: "Kamakura", detail: "Great Buddha · Old Town", tier: TIER_GENERAL, entrance: { adult: 0, child: 0 }, tgEntrance: 0, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "yokohama_1", group: "Tokyo", name: "Yokohama 1", detail: "Air Cabin · Brickhouse · Chinatown", tier: TIER_GENERAL, entrance: { adult: 2000, child: 900 }, tgEntrance: 0, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "yokohama_2", group: "Tokyo", name: "Yokohama 2", detail: "Yokohama Sea Paradise", tier: TIER_GENERAL, entrance: { adult: 5600, child: 4000 }, tgEntrance: 0, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "odaiba", group: "Tokyo", name: "Odaiba", detail: "Odaiba · Legoland", tier: TIER_GENERAL, entrance: { adult: 2500, child: 2500 }, tgEntrance: 0, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "asakusa_shinagawa", group: "Tokyo", name: "Asakusa + Shinagawa", detail: "Asakusa · Shinagawa Aquarium", tier: TIER_GENERAL, entrance: { adult: 1350, child: 600 }, tgEntrance: 0, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "shinjuku_gyoen", group: "Tokyo", name: "Shinjuku Gyoen", detail: "Shinjuku Gyoen Park · Tokyo Skytree", tier: TIER_GENERAL, entrance: { adult: 2700, child: 900 }, tgEntrance: 600, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "ueno_zoo", group: "Tokyo", name: "Ueno Zoo", detail: "Ueno Zoo · Tokyo Tower", tier: TIER_GENERAL, entrance: { adult: 2100, child: 1200 }, tgEntrance: 0, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "tokyo_museum", group: "Tokyo", name: "Tokyo Museum", detail: "Tokyo National Museum", tier: TIER_GENERAL, entrance: { adult: 1000, child: 0 }, tgEntrance: 0, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "sanrio", group: "Tokyo", name: "Sanrio Puroland", detail: "Sanrio Puroland", tier: TIER_GENERAL, entrance: { adult: 3400, child: 0 }, tgEntrance: 0, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "warnerbros", group: "Tokyo", name: "Warner Bros. Studio", detail: "Warner Bros Studio Tour", tier: TIER_GENERAL, entrance: { adult: 5000, child: 3000 }, tgEntrance: 0, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "edo_wonderland", group: "Tokyo", name: "Edo Wonderland", detail: "Edo Wonderland", tier: TIER_GENERAL, entrance: { adult: 5500, child: 2700 }, tgEntrance: 0, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "hitachi", group: "Tokyo", name: "Hitachi Seaside Park", detail: "Hitachi Park · Hitachi Railway", tier: TIER_GENERAL, entrance: { adult: 800, child: 0 }, tgEntrance: 0, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "nikko", group: "Tokyo", name: "Nikko", detail: "Kegon Falls · Lake Chuzenji · Shinkyo Bridge", tier: TIER_GENERAL, entrance: { adult: 0, child: 0 }, tgEntrance: 0, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "kamogawa", group: "Tokyo", name: "Kamogawa Seaworld", detail: "Kamogawa Seaworld", tier: TIER_GENERAL, entrance: { adult: 3300, child: 2000 }, tgEntrance: 0, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "bullet_tokyo", group: "Tokyo", name: "Bullet Train to Tokyo", detail: "Ueno · Akihabara", tier: TIER_AIRPORT_CITY, entrance: { adult: 20000, child: 10000 }, tgEntrance: 20000, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "mt_fuji", group: "Fuji / Hakone / Snow", name: "Mt Fuji", detail: "Iyashi No Sato · Saiko Lake · GPO", tier: TIER_GENERAL, entrance: { adult: 500, child: 300 }, tgEntrance: 500, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "fuji_snow", group: "Fuji / Hakone / Snow", name: "Fujiten Snow Resort", detail: "Fujiten Snow Resort", tier: TIER_GENERAL, entrance: { adult: 5500, child: 4500 }, tgEntrance: 0, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "hakone", group: "Fuji / Hakone / Snow", name: "Hakone", detail: "Cable Car · Lake Ashi Cruise", tier: TIER_GENERAL, entrance: { adult: 3300, child: 1700 }, tgEntrance: 0, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "odawara", group: "Fuji / Hakone / Snow", name: "Odawara", detail: "Bullet Train · Odawara Castle", tier: TIER_GENERAL, entrance: { adult: 10600, child: 220 }, tgEntrance: 10600, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "naeba", group: "Fuji / Hakone / Snow", name: "Naeba Snow Resort", detail: "Naeba Snow Resort", tier: TIER_GENERAL, entrance: { adult: 7200, child: 0 }, tgEntrance: 7200, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "gala_yuzawa", group: "Fuji / Hakone / Snow", name: "Gala Yuzawa", detail: "Gala Yuzawa · Bullet Train", tier: TIER_GENERAL, entrance: { adult: 21000, child: 2800 }, tgEntrance: 21000, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "hachikogen", group: "Fuji / Hakone / Snow", name: "Hachikogen Snow Resort", detail: "Hachikogen Snow Resort", tier: TIER_GENERAL, entrance: { adult: 7200, child: 4200 }, tgEntrance: 7200, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "hakuba", group: "Fuji / Hakone / Snow", name: "Hakuba Ski Resort", detail: "Hakuba Ski Resort", tier: TIER_GENERAL, entrance: { adult: 10000, child: 0 }, tgEntrance: 0, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "usj", group: "Kansai", name: "USJ", detail: "Universal Studios Japan", tier: TIER_GENERAL, entrance: { adult: 11000, child: 7400 }, tgEntrance: 0, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "kyoto_1", group: "Kansai", name: "Kyoto 1", detail: "Arashiyama · Higashiyama", tier: TIER_GENERAL, entrance: { adult: 0, child: 0 }, tgEntrance: 0, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "kyoto_2", group: "Kansai", name: "Kyoto 2", detail: "Nishiki Market · Gion", tier: TIER_GENERAL, entrance: { adult: 0, child: 0 }, tgEntrance: 0, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "kyoto_3", group: "Kansai", name: "Kyoto 3", detail: "Fushimi Inari Taisha · Gion", tier: TIER_GENERAL, entrance: { adult: 0, child: 0 }, tgEntrance: 0, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "nara", group: "Kansai", name: "Nara", detail: "Nara Park · Kaiyukan Aquarium", tier: TIER_GENERAL, entrance: { adult: 2700, child: 1500 }, tgEntrance: 0, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "nara_tempozan", group: "Kansai", name: "Nara + Tempozan", detail: "Nara Park · Tempozan", tier: TIER_GENERAL, entrance: { adult: 0, child: 0 }, tgEntrance: 0, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "cruise_nara", group: "Kansai", name: "Santa Maria Cruise + Nara", detail: "Santa Maria Cruise · Nara · Tempozan", tier: TIER_GENERAL, entrance: { adult: 2000, child: 0 }, tgEntrance: 0, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "osaka_1", group: "Kansai", name: "Osaka 1", detail: "Kuromon Market · Denden Town · Tsutenkaku", tier: TIER_GENERAL, entrance: { adult: 0, child: 0 }, tgEntrance: 0, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "osaka_2", group: "Kansai", name: "Osaka 2", detail: "Mino Park · Sumiyoshi Taisha", tier: TIER_GENERAL, entrance: { adult: 0, child: 0 }, tgEntrance: 0, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "kobe", group: "Kansai", name: "Kobe", detail: "Nunobiki Garden · Kobe Mosque · Harborland", tier: TIER_GENERAL, entrance: { adult: 1800, child: 900 }, tgEntrance: 0, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "mt_rokko", group: "Kansai", name: "Mt Rokko Snow Park", detail: "Mt Rokko Snow Park", tier: TIER_GENERAL, entrance: { adult: 2500, child: 0 }, tgEntrance: 2500, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "biwako", group: "Kansai", name: "Biwako Valley", detail: "Biwako Valley", tier: TIER_GENERAL, entrance: { adult: 3500, child: 1500 }, tgEntrance: 3500, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "kids_plaza", group: "Kansai", name: "Kids Plaza Osaka", detail: "Kids Plaza Osaka", tier: TIER_GENERAL, entrance: { adult: 1500, child: 800 }, tgEntrance: 0, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "museum_living", group: "Kansai", name: "Museum of Living Osaka", detail: "Osaka Museum of Housing & Living", tier: TIER_GENERAL, entrance: { adult: 600, child: 0 }, tgEntrance: 0, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "wakayama", group: "Kansai", name: "Wakayama", detail: "Wakayama", tier: TIER_GENERAL, entrance: { adult: 0, child: 0 }, tgEntrance: 0, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "awaji_island", group: "Kansai", name: "Awaji Island", detail: "Naruto x Boruto", tier: TIER_GENERAL, entrance: { adult: 3300, child: 1800 }, tgEntrance: 0, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "bullet_osaka", group: "Kansai", name: "Bullet Train to Osaka", detail: "Namba · Dotonbori", tier: TIER_AIRPORT_CITY, entrance: { adult: 20000, child: 10000 }, tgEntrance: 20000, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "hiroshima", group: "Kansai", name: "Hiroshima", detail: "Hiroshima Park · Downtown", tier: TIER_GENERAL, entrance: { adult: 0, child: 0 }, tgEntrance: 0, meal: "lunch", tgFee: 6000, hotel: true },
  { id: "free_easy", group: "Rest Day", name: "Free & Easy (No Tour Guide)", detail: "Self-guided day, no tour guide", tier: null, entrance: { adult: 0, child: 0 }, tgEntrance: 0, meal: "none", tgFee: 0, hotel: true },
  { id: "disney", group: "Tokyo", name: "Disneyland / DisneySea", detail: "1-Day Passport (peak season) — added manually, not a sheet preset", tier: TIER_GENERAL, entrance: { adult: 10900, child: 5600 }, tgEntrance: 0, meal: "lunch", tgFee: 6000, hotel: true },
];

const OTHERS_FIXED = 3000; // Insurance — flat, added once per pax regardless of headcount
const OTHERS_SHARED = 21000; // Upah Book Flight + Flight TG — split across total pax

// --- Itinerary auto-suggestion engine ---
// --- Customer-facing narrative content (Bahasa Malaysia), matching the reference quotation style ---
const MALAY_DAYS = ["AHAD", "ISNIN", "SELASA", "RABU", "KHAMIS", "JUMAAT", "SABTU"];
const formatDateMY = (iso) => {
  if (!iso) return "";
  const d = parseISODate(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${String(d.getFullYear()).slice(-2)}`;
};
const dayNameMY = (iso) => {
  if (!iso) return "";
  return MALAY_DAYS[parseISODate(iso).getDay()];
};

const NARRATIVES = {
  arr_malam: "Tiba di Airport, Tour Guide akan menjemput anda di Arrival Gate sebelum menuju ke tempat penginapan dengan Private Transport untuk berehat selepas penerbangan panjang.",
  arr_tokyo: "Tiba di Narita Airport, Tour Guide akan menjemput anda di Arrival Gate sebelum menuju ke Odaiba dengan Private Transport. Nikmati suasana bandar moden Tokyo sebelum pulang ke tempat penginapan.",
  arr_osaka: "Tiba di Kansai Airport, Tour Guide akan menjemput anda di Arrival Gate sebelum menuju ke Osaka Castle dan Umeda Sky Building dengan Private Transport, sebelum pulang ke tempat penginapan untuk berehat.",
  tokyo_airport: "Tour Guide kami akan menjemput anda di tempat penginapan dan membawa anda ke Odaiba untuk lawatan terakhir sebelum bertolak ke Airport untuk penerbangan pulang.",
  osaka_airport: "Tour Guide kami akan menjemput anda di tempat penginapan dan membawa anda melawat Osaka Castle serta Umeda Sky Building sebelum bertolak ke Airport untuk penerbangan pulang.",
  arr_pagi: "Tour Guide kami akan menjemput anda di tempat penginapan menaiki Private Transport. Terus bertolak ke Airport 3 jam sebelum waktu perlepasan.",
  mt_fuji: "Tour Guide akan menjemput anda di tempat penginapan dan bertolak ke Mount Fuji. Destinasi pertama adalah Iyashi No Sato, sebuah perkampungan lama Jepun yang berlatar belakangkan pemandangan Mount Fuji. Kemudian kita akan ke Saiko Lake, salah satu daripada 5 tasik semula jadi terkenal berdekatan kaki gunung. Seterusnya kami akan bawa anda ke Gotemba Premium Outlet, tempat shopping outlet terbesar di Jepun, sebelum pulang ke tempat penginapan untuk berehat.",
  tokyo_mix: "Tour Guide akan menjemput anda di tempat penginapan dan bertolak ke Asakusa. Terokai Nakamise Street yang dipenuhi kedai cenderamata dan makanan tempatan, sebelum mengunjungi Senso-ji Temple, kuil tertua di Tokyo. Lawatan diteruskan ke Shibuya untuk menikmati suasana bandar paling sibuk di Jepun sebelum pulang ke penginapan.",
  kamakura: "Tour Guide kami akan menjemput anda di tempat penginapan dan bertolak ke Kamakura. Nikmati suasana bersejarah kota lama ini, termasuk Great Buddha yang terkenal, sebelum pulang ke tempat penginapan untuk berehat.",
  yokohama_1: "Tour Guide kami akan menjemput anda di tempat penginapan dan bertolak ke Yokohama. Naiki Air Cabin untuk pemandangan bandar pelabuhan, singgah di Brickhouse dan Chinatown untuk merasai suasana unik kawasan ini, sebelum pulang ke tempat penginapan.",
  bullet_tokyo: "Tour Guide kami akan menjemput anda di tempat penginapan dan bertolak ke stesen kereta api untuk menaiki Bullet Train ke Tokyo. Selepas sampai, destinasi seterusnya adalah Ueno dan Akihabara sebelum bertolak pulang ke tempat penginapan.",
  bullet_osaka: "Tour Guide kami akan menjemput anda di tempat penginapan dan bertolak ke stesen kereta api untuk menaiki Bullet Train yang berkelajuan 300 km/j ke Osaka. Setelah sampai, destinasi pertama adalah Namba dan Dotonbori yang terkenal dengan Glico Sign, sebelum kita bertolak pulang ke tempat penginapan.",
  usj: "Tour Guide kami akan menjemput anda di tempat penginapan dan bertolak ke Universal Studios Japan dengan Private Transport. Anda akan dilepaskan untuk free & easy di sini seharian, sebelum Tour Guide membawa anda pulang ke tempat penginapan untuk berehat.",
  kyoto_1: "Tour Guide kami akan menjemput anda di tempat penginapan dan bertolak ke Kyoto. Destinasi pertama adalah Arashiyama Bamboo Grove, hutan buluh yang terbentang luas dan sangat cantik untuk bergambar. Seterusnya ke Higashiyama, kawasan bandar lama tradisional Kyoto, sebelum pulang ke tempat penginapan.",
  nara: "Tour Guide akan menjemput anda di tempat penginapan menggunakan Private Transport. Destinasi pertama adalah Nara Park, terkenal dengan rusa jinak dan tarikan seperti Todaiji serta Kaiyukan Aquarium, sebelum kembali ke tempat penginapan.",
  disney: "Tour Guide kami akan menjemput anda di tempat penginapan. Bertolak ke Disneyland/DisneySea dengan Private Transport. Anda akan dilepaskan untuk free & easy seharian, sebelum Tour Guide membawa anda pulang ke tempat penginapan untuk berehat.",
  free_easy: "Hari bebas tanpa Tour Guide. Anda boleh meneroka kawasan sekitar tempat penginapan mengikut citarasa sendiri, atau berehat sepenuhnya sebelum meneruskan lawatan pada hari seterusnya.",
};
const getNarrative = (loc) => {
  if (NARRATIVES[loc.id]) return NARRATIVES[loc.id];
  return `Tour Guide kami akan menjemput anda di tempat penginapan dan bertolak ke ${loc.name}. Nikmati lawatan ke ${loc.detail}, sebelum Tour Guide membawa anda pulang ke tempat penginapan untuk berehat.`;
};


const TOKYO_PRIORITY = ["mt_fuji", "tokyo_mix", "kamakura", "yokohama_1", "tokyo_1", "tokyo_2", "shinjuku_gyoen"];
const KANSAI_PRIORITY = ["kyoto_1", "usj", "nara", "osaka_1", "kobe", "kyoto_2"];

const detectCity = (flightStr) => {
  if (!flightStr) return null;
  if (/haneda|narita|hnd|nrt/i.test(flightStr)) return "tokyo";
  if (/kansai|kix|osaka/i.test(flightStr)) return "osaka";
  return null;
};
// pulls the hour out of "(Arr HH:MM" or "(Dep HH:MM" style labels
const detectHour = (flightStr, kind) => {
  if (!flightStr) return null;
  const re = kind === "arrival" ? /Arr\s+(\d{1,2}):(\d{2})/ : /Dep\s+(\d{1,2}):(\d{2})/;
  const m = flightStr.match(re);
  if (!m) return null;
  return parseInt(m[1], 10);
};

const suggestItinerary = (dateStart, dateEnd, arrivalFlight, departureFlight) => {
  if (!dateStart || !dateEnd) return null;
  const totalDays = getDateRange(dateStart, dateEnd).length;
  if (totalDays < 2) return null;

  const arrivalCity = detectCity(arrivalFlight) || "tokyo";
  const departureCity = detectCity(departureFlight) || arrivalCity;
  const arrivalHour = detectHour(arrivalFlight, "arrival");
  const departureHour = detectHour(departureFlight, "departure");
  // morning arrival (roughly before 6pm landing) still leaves a usable day; night arrival doesn't
  const arrivalIsMorning = arrivalHour !== null ? arrivalHour < 18 : false;
  // night departure (roughly after 6pm) leaves room for a same-day activity before the airport
  const departureIsNight = departureHour !== null ? departureHour >= 18 : false;

  const firstDay = arrivalCity === "tokyo"
    ? (arrivalIsMorning ? "arr_tokyo" : "arr_malam")
    : (arrivalIsMorning ? "arr_osaka" : "arr_malam");

  const lastDay = departureCity === "tokyo"
    ? (departureIsNight ? "tokyo_airport" : "arr_pagi")
    : (departureIsNight ? "osaka_airport" : "arr_pagi");

  const needsTransfer = arrivalCity !== departureCity;
  const middleSlots = Math.max(0, totalDays - 2 - (needsTransfer ? 1 : 0));

  let middleIds = [];
  if (!needsTransfer) {
    const pool = arrivalCity === "tokyo" ? TOKYO_PRIORITY : KANSAI_PRIORITY;
    middleIds = pool.slice(0, middleSlots);
  } else {
    const firstPool = arrivalCity === "tokyo" ? TOKYO_PRIORITY : KANSAI_PRIORITY;
    const secondPool = departureCity === "tokyo" ? TOKYO_PRIORITY : KANSAI_PRIORITY;
    const firstCount = Math.ceil(middleSlots / 2);
    const secondCount = middleSlots - firstCount;
    const transferId = arrivalCity === "tokyo" ? "bullet_osaka" : "bullet_tokyo";
    middleIds = [...firstPool.slice(0, firstCount), transferId, ...secondPool.slice(0, secondCount)];
  }

  return [firstDay, ...middleIds, lastDay];
};

// Direct KUL → Tokyo / Osaka flights
const ARRIVAL_FLIGHT_OPTIONS = [
  "AirAsia X D7522 · Haneda (HND) (Arr 22:35)",
  "ANA NH886 · Haneda (HND) (Arr 22:15)",
  "Malaysia Airlines MH70 · Narita (NRT) (Arr 18:05)",
  "Malaysia Airlines MH88 · Narita (NRT) (Arr 07:03 +1)",
  "Japan Airlines JL7092 · Narita (NRT) (Arr 18:05) — codeshare on MH70",
  "Batik Air Malaysia OD872 · Narita (NRT) (Arr 08:25)",
  "Batik Air Malaysia OD870 · Narita (NRT) (Arr 20:50)",
  "AirAsia X D7532 · Kansai (KIX), Osaka (Arr 09:50)",
  "Malaysia Airlines MH52 · Kansai (KIX), Osaka (Arr 05:55 +1)",
  "Batik Air Malaysia OD860 · Kansai (KIX), Osaka (Arr 06:55, varies)",
];

// Direct Tokyo / Osaka → KUL flights
const DEPARTURE_FLIGHT_OPTIONS = [
  "AirAsia X D7523 · Haneda (HND) (Dep 23:50)",
  "ANA NH885 · Haneda (HND) (Dep 23:30)",
  "Malaysia Airlines MH71 · Narita (NRT) (Dep 21:45)",
  "Malaysia Airlines MH89 · Narita (NRT) (Dep 10:20)",
  "Japan Airlines JL7093 · Narita (NRT) (Dep 21:45) — codeshare on MH71",
  "Batik Air Malaysia OD871 · Narita (NRT) (Dep 21:50)",
  "Batik Air Malaysia OD873 · Narita (NRT) (Dep 10:25)",
  "AirAsia X D7533 · Kansai (KIX), Osaka (Dep 10:55)",
  "Malaysia Airlines MH53 · Kansai (KIX), Osaka (Dep 09:55)",
  "Batik Air Malaysia OD861 · Kansai (KIX), Osaka (Dep 09:30, varies)",
];

// --- Calendar helpers ---
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const parseISODate = (s) => new Date(s + "T00:00:00");
const toISODate = (d) => {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const getDateRange = (startStr, endStr) => {
  if (!startStr || !endStr) return [];
  const start = parseISODate(startStr);
  const end = parseISODate(endStr);
  if (end < start) return [];
  const dates = [];
  let cur = new Date(start);
  while (cur <= end) {
    dates.push(toISODate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
};
const getMonthsSpanned = (dates) => {
  const seen = new Set();
  const months = [];
  for (const d of dates) {
    const [y, m] = d.split("-").map(Number);
    const key = `${y}-${m}`;
    if (!seen.has(key)) { seen.add(key); months.push({ year: y, month: m }); }
  }
  return months;
};
const buildMonthWeeks = (year, month) => {
  const first = new Date(year, month - 1, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
};
// Continuous Sun–Sat weeks spanning the whole trip, even across a month boundary
const getContinuousWeeks = (startStr, endStr) => {
  if (!startStr || !endStr) return [];
  const start = parseISODate(startStr);
  const end = parseISODate(endStr);
  if (end < start) return [];
  const weekStart = new Date(start);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(end);
  weekEnd.setDate(weekEnd.getDate() + (6 - weekEnd.getDay()));
  const weeks = [];
  let cur = new Date(weekStart);
  while (cur <= weekEnd) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
};

export default function QuotationStudio() {
  const [customer, setCustomer] = useState("Wan Zuraida");
  const [customerPhone, setCustomerPhone] = useState("");
  const [quotationNo, setQuotationNo] = useState("269");
  const [depositRM, setDepositRM] = useState("900");
  const [rate, setRate] = useState(3.35);
  const [mkj, setMkj] = useState(40);
  const [adults, setAdults] = useState(3);
  const [children, setChildren] = useState(1);
  const [infants, setInfants] = useState(0);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  const changeDateStart = (val) => {
    setDateStart(val);
    if (val) {
      // default Date End to 5 days after the new Date Start
      const d = new Date(val + "T00:00:00");
      d.setDate(d.getDate() + 5);
      const defaultEnd = d.toISOString().slice(0, 10);
      setDateEnd(defaultEnd);
    }
  };
  const [arrivalFlight, setArrivalFlight] = useState("AirAsia X D7522 · Haneda (HND) (Arr 22:35)");
  const [arrivalCustom, setArrivalCustom] = useState(false);
  const [departureFlight, setDepartureFlight] = useState("AirAsia X D7523 · Haneda (HND) (Dep 23:50)");
  const [departureCustom, setDepartureCustom] = useState(false);

  // Days are the primary unit: an ordered array, each day holds a location + transport mode
  const makeDayUid = () => `d${Date.now()}${Math.random().toString(36).slice(2, 8)}`;

  const [dayPlan, setDayPlan] = useState([
    { uid: makeDayUid(), locationId: "arr_malam", mode: "private" },
    { uid: makeDayUid(), locationId: "kamakura", mode: "private" },
    { uid: makeDayUid(), locationId: "mt_fuji", mode: "private" },
    { uid: makeDayUid(), locationId: "tokyo_mix", mode: "private" },
    { uid: makeDayUid(), locationId: "tokyo_airport", mode: "private" },
  ]);
  const [openDayIndex, setOpenDayIndex] = useState(null); // which day's location-picker is expanded

  const totalPax = adults + children + infants;

  const updateDayMode = (i, mode) => {
    setDayPlan((prev) => prev.map((d, idx) => (idx === i ? { ...d, mode } : d)));
  };
  const selectLocationForDay = (i, locationId) => {
    setDayPlan((prev) => prev.map((d, idx) => (idx === i ? { ...d, locationId } : d)));
    setOpenDayIndex(null);
  };
  const addDay = () => {
    setDayPlan((prev) => [...prev, { uid: makeDayUid(), locationId: LOCATIONS[0].id, mode: "private" }]);
  };
  const removeDay = (i) => {
    setDayPlan((prev) => prev.filter((_, idx) => idx !== i));
    setOpenDayIndex(null);
  };
  const bulkSet = (mode) => {
    setDayPlan((prev) => prev.map((d) => ({ ...d, mode })));
  };

  // Drag-to-reorder days — uses Pointer Events (works on touch + mouse), with the
  // first day (arrival) and last day (departure) locked in place, and a slow-motion
  // FLIP animation so the swap is visually obvious rather than an instant snap.
  const dayRefs = useRef(new Map()); // uid -> DOM element
  const prevRectsRef = useRef(new Map()); // uid -> DOMRect, captured just before reorder
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const isLocked = (i) => i === 0 || i === dayPlan.length - 1;

  const handleDragStart = (i, e) => {
    if (isLocked(i)) return;
    setDragIndex(i);
    setDragOverIndex(i);
    setOpenDayIndex(null);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
  };
  const handleDragMove = (e) => {
    if (dragIndex === null) return;
    const y = e.clientY;
    let closest = dragIndex;
    let closestDist = Infinity;
    dayRefs.current.forEach((el, uid) => {
      if (!el) return;
      const idx = dayPlan.findIndex((d) => d.uid === uid);
      if (idx === -1 || isLocked(idx)) return; // can't drop onto the locked first/last day
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const dist = Math.abs(y - center);
      if (dist < closestDist) { closestDist = dist; closest = idx; }
    });
    if (closest !== dragOverIndex) setDragOverIndex(closest);
  };
  const handleDragEnd = () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex && !isLocked(dragIndex) && !isLocked(dragOverIndex)) {
      // capture pre-reorder positions for the slow-motion FLIP animation
      const rects = new Map();
      dayRefs.current.forEach((el, uid) => { if (el) rects.set(uid, el.getBoundingClientRect()); });
      prevRectsRef.current = rects;

      setDayPlan((prev) => {
        const next = [...prev];
        const [moved] = next.splice(dragIndex, 1);
        next.splice(dragOverIndex, 0, moved);
        return next;
      });
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // After the reorder commits, animate every moved card from its old position to its new one — slowly
  useEffect(() => {
    const prevRects = prevRectsRef.current;
    if (prevRects.size === 0) return;
    dayRefs.current.forEach((el, uid) => {
      if (!el) return;
      const prevRect = prevRects.get(uid);
      if (!prevRect) return;
      const newRect = el.getBoundingClientRect();
      const deltaY = prevRect.top - newRect.top;
      if (Math.abs(deltaY) > 1) {
        el.style.transition = "none";
        el.style.transform = `translateY(${deltaY}px)`;
        requestAnimationFrame(() => {
          el.style.transition = "transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)";
          el.style.transform = "translateY(0)";
        });
      }
    });
    prevRectsRef.current = new Map();
  }, [dayPlan]);

  // Auto-suggest itinerary whenever both dates (and current flights) are set
  const [autoSuggested, setAutoSuggested] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  useEffect(() => {
    if (!dateStart || !dateEnd) return;
    const suggestedIds = suggestItinerary(dateStart, dateEnd, arrivalFlight, departureFlight);
    if (!suggestedIds) return;
    setDayPlan(suggestedIds.map((id) => ({ uid: makeDayUid(), locationId: id, mode: "private" })));
    setAutoSuggested(true);
  }, [dateStart, dateEnd, arrivalFlight, departureFlight]);

  const result = useMemo(() => {
    if (totalPax === 0 || dayPlan.length === 0) return null;

    // Per-location, per-pax-type "daily cost" — same math as Q-column in the sheet.
    let costAdult = 0, costChild = 0, costInfant = 0;
    const dayRows = [];

    for (const { locationId, mode: dayMode } of dayPlan) {
      const loc = LOCATIONS.find((l) => l.id === locationId);
      if (!loc) continue;
      const isPrivate = dayMode === "private";

      const privateTotal = isPrivate ? tierCost(loc.tier, totalPax) : 0;
      const privatePerPax = totalPax ? privateTotal / totalPax : 0;
      // Public fare only applies to Adult & Child — infants ride free, matching real fare rules
      const publicFare = isPrivate ? 0 : PUBLIC_FARE_PER_PAX;

      const mealCust = MEAL_COST[loc.meal] || 0;
      const hotelCust = loc.hotel ? HOTEL_COST : 0;

      // tour-guide-side costs, shared equally across ALL pax
      const hasGuide = loc.tgFee > 0;
      const tgTransport = hasGuide ? 2000 : 0;
      const tgMeal = mealCust;
      const tgHotel = loc.hotel ? 3000 : 0;
      const tgFee = loc.tgFee;
      const tgEntrance = loc.tgEntrance || 0;
      const sharedTg = totalPax ? (tgTransport + tgMeal + tgHotel + tgFee + tgEntrance) / totalPax : 0;

      const a = loc.entrance.adult + privatePerPax + publicFare + mealCust + hotelCust + sharedTg;
      const c = loc.entrance.child + privatePerPax + publicFare + mealCust + hotelCust + sharedTg;
      const i = privatePerPax + sharedTg; // no public fare, no entrance, no meal/hotel for infants

      costAdult += a; costChild += c; costInfant += i;
      dayRows.push({
        ...loc, mode: dayMode, a, c, i,
        privateTotal, privatePerPax, publicFare, mealCust, hotelCust,
        tgTransport, tgMeal, tgHotel, tgFee, tgEntrance, sharedTg,
      });
    }

    const othersPerPax = OTHERS_FIXED + (totalPax ? OTHERS_SHARED / totalPax : 0);
    costAdult += othersPerPax; costChild += othersPerPax; costInfant += othersPerPax;

    const markup = 1 + mkj / 100;
    const sellAdult = costAdult * markup;
    const sellChild = costChild * markup;
    const sellInfant = costInfant * markup;

    const totalYen = sellAdult * adults + sellChild * children + sellInfant * infants;
    const tripCostYen = costAdult * adults + costChild * children + costInfant * infants;
    const mkjFeeYen = totalYen - tripCostYen;
    const toRM = (y) => y / rate / 10;

    return { dayRows, costAdult, costChild, costInfant, sellAdult, sellChild, sellInfant, totalYen, tripCostYen, mkjFeeYen, toRM };
  }, [dayPlan, adults, children, infants, rate, mkj, totalPax]);

  // --- Trip calendar mapping ---
  const tripDates = useMemo(() => getDateRange(dateStart, dateEnd), [dateStart, dateEnd]);
  const tripMonths = useMemo(() => getMonthsSpanned(tripDates), [tripDates]);
  const tripWeeks = useMemo(() => getContinuousWeeks(dateStart, dateEnd), [dateStart, dateEnd]);
  const calendarTitle = useMemo(() => {
    if (tripMonths.length === 0) return "";
    if (tripMonths.length === 1) return `${MONTH_NAMES[tripMonths[0].month - 1]} ${tripMonths[0].year}`;
    const first = tripMonths[0], last = tripMonths[tripMonths.length - 1];
    if (first.year === last.year) return `${MONTH_NAMES[first.month - 1]} – ${MONTH_NAMES[last.month - 1]} ${first.year}`;
    return `${MONTH_NAMES[first.month - 1]} ${first.year} – ${MONTH_NAMES[last.month - 1]} ${last.year}`;
  }, [tripMonths]);
  const dayIndexByDate = useMemo(() => {
    const map = {};
    tripDates.forEach((d, i) => { map[d] = i + 1; });
    return map;
  }, [tripDates]);
  const locationByDayIndex = useMemo(() => {
    const map = {};
    if (result) result.dayRows.forEach((row, i) => { map[i + 1] = row; });
    return map;
  }, [result]);

  const fmtY = (n) => `¥${Math.round(n).toLocaleString()}`;
  const fmtR = (n) => `RM${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const groups = [...new Set(LOCATIONS.map((l) => l.group))];

  // Builds a fully standalone HTML document (no external CSS/JS deps) so it can be
  // downloaded and opened/printed from the user's own browser — sidesteps the
  // artifact sandbox blocking window.print() / popups.
  const downloadCustomerHTML = () => {
    if (!result) return;
    const tripTitle = `Tokyo ${dayPlan.length}H${Math.max(0, dayPlan.length - 1)}M Itinerary`;
    const dateRange = (dateStart || dateEnd) ? `${formatDateMY(dateStart)} – ${formatDateMY(dateEnd)}` : "";

    const dayBlocks = dayPlan.map((day, i) => {
      const loc = LOCATIONS.find((l) => l.id === day.locationId);
      if (!loc) return "";
      const iso = tripDates[i];
      const dateLine = iso ? `${formatDateMY(iso)} · ${dayNameMY(iso)}` : "";
      const chips = loc.detail.split(" · ").map((s) => `<span class="chip">${s}</span>`).join("");
      return `
        <div class="day-block">
          <div class="day-head">
            <span class="day-badge">DAY ${i + 1}</span>
            ${dateLine ? `<span class="day-date">${dateLine}</span>` : ""}
          </div>
          <div class="day-title">${loc.name} ${day.mode === "public" ? "(PUBLIC TRANSPORT)" : "(PRIVATE TRANSPORT)"}</div>
          <p class="day-narrative">${getNarrative(loc)}</p>
          <div class="chips">${chips}</div>
        </div>`;
    }).join("\n");

    const html = `<!DOCTYPE html>
<html lang="ms">
<head>
<meta charset="UTF-8">
<title>${customer} - Quotation ${quotationNo}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #16283D; margin: 0; background: #EDF2F8; }
  .doc { width: 210mm; min-height: 297mm; margin: 0 auto; background: #FFFFFF; }
  .day-block { break-inside: avoid; page-break-inside: avoid; }
  .cover { background: #16283D; color: #FFFFFF; padding: 40px 32px; }
  .cover .label { color: #3574B0; font-family: Arial, sans-serif; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; }
  .cover h1 { font-size: 28px; margin: 0 0 4px 0; }
  .cover .sub { font-family: Arial, sans-serif; font-size: 13px; opacity: 0.8; margin-top: 4px; }
  .content { padding: 24px 32px; }
  .day-block { padding-bottom: 28px; margin-bottom: 28px; border-bottom: 1px dashed #CBD8E6; }
  .day-block:last-child { border-bottom: none; margin-bottom: 0; }
  .day-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 8px; font-family: Arial, sans-serif; }
  .day-badge { background: #16283D; color: #FFFFFF; font-size: 11px; font-weight: bold; padding: 4px 8px; border-radius: 4px; }
  .day-date { font-size: 13px; font-weight: 600; color: #4A6A88; }
  .day-title { color: #3574B0; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; font-family: Arial, sans-serif; }
  .day-narrative { font-size: 14px; line-height: 1.7; margin: 0 0 12px 0; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; font-family: Arial, sans-serif; }
  .chip { background: #EDF2F8; border: 1px solid #CBD8E6; color: #16283D; font-size: 11px; padding: 4px 8px; border-radius: 4px; }
  .footer { background: #EDF2F8; padding: 24px 32px; font-family: Arial, sans-serif; }
  .footer .cols { display: flex; gap: 32px; margin-bottom: 20px; }
  .footer .col { flex: 1; }
  .footer .col-title { font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
  .footer ul { list-style: none; padding: 0; margin: 0; font-size: 12px; color: #4A6A88; line-height: 1.8; }
  .footer .fine-print { font-size: 11px; font-style: italic; color: #4A6A88; line-height: 1.6; }
  .price-band { background: #16283D; color: #FFFFFF; padding: 24px 32px; font-family: Arial, sans-serif; }
  .price-band .row { display: flex; justify-content: space-between; align-items: baseline; }
  .price-band .total { font-size: 26px; font-weight: bold; text-align: right; }
  .price-band .total-rm { color: #3574B0; font-size: 14px; text-align: right; }
  .price-band .pax-note { font-size: 11px; opacity: 0.7; margin-top: 8px; }
  @media print { body { background: #FFFFFF; } .doc { box-shadow: none; } }
</style>
</head>
<body>
  <div class="doc">
    <div class="cover">
      <div class="label">Quotation #${quotationNo}</div>
      <h1>${customer}</h1>
      <div class="sub">${tripTitle}</div>
      ${dateRange ? `<div class="sub">${dateRange}</div>` : ""}
    </div>
    <div class="content">
      ${dayBlocks}
    </div>
    <div class="footer">
      <div class="cols">
        <div class="col">
          <div class="col-title">Include</div>
          <ul>
            <li>• Ticket Entrance</li>
            <li>• Private Tour Guide</li>
            <li>• Pengangkutan (Transport)</li>
            <li>• Panduan Solat</li>
            <li>• Makanan Halal (Lunch)</li>
            <li>• Travel Insurance</li>
            <li>• Penginapan (Hotel)</li>
          </ul>
        </div>
        <div class="col">
          <div class="col-title" style="color:#B23B2E;">Exclude</div>
          <ul>
            <li>• Tiket Penerbangan (Flight Ticket)</li>
            <li>• Breakfast & Dinner (bebas pilih sendiri)</li>
            <li>• Perbelanjaan peribadi</li>
          </ul>
        </div>
      </div>
      <div class="fine-print">
        *Makan tengah hari di Restaurant Halal Jepun atau menu bersamaan ¥1,500/orang. Untuk Breakfast dan Dinner, anda bebas memilih restoran mengikut citarasa sendiri.<br>
        **Harga pakej ini mungkin berubah mengikut musim disebabkan kos penginapan berbeza. Sila hubungi kami untuk pengesahan harga akhir.
      </div>
    </div>
    <div class="price-band">
      <div class="row">
        <span>Jumlah Harga (Total Price)</span>
        <div>
          <div class="total">${fmtY(result.totalYen)}</div>
          <div class="total-rm">${fmtR(result.toRM(result.totalYen))}</div>
        </div>
      </div>
      <div class="pax-note">${adults} Adult${adults !== 1 ? "s" : ""}${children ? `, ${children} Child` : ""}${infants ? `, ${infants} Infant` : ""} · Quotation #${quotationNo}</div>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${customer.replace(/\s+/g, "_")}_Quotation_${quotationNo}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Builds one day's data in the shape the MKJ template expects (route chain, include list, nota)
  const buildDayForServerPdf = (day, i) => {
    const loc = LOCATIONS.find((l) => l.id === day.locationId);
    if (!loc) return null;
    const iso = tripDates[i];
    const stops = loc.detail.split(" · ");
    const chain = i === 0 ? [loc.name, ...stops, "Accomodation"] : ["Accomodation", ...stops, "Accomodation"];

    const include = [];
    include.push(day.mode === "public" ? "Public Transport Ticket" : "Private Transportation (MPV/Van)");
    include.push("Travel Insurance");
    if (loc.meal !== "none") include.push("Meal (Lunch)");
    if (loc.entrance.adult > 0) include.push(`Entrance Fee — ${loc.name}`);
    if (loc.hotel) include.push("Accomodation");

    return {
      dayNumber: i + 1,
      date: iso ? formatDateMY(iso) : "",
      dayName: iso ? dayNameMY(iso) : "",
      routeTitle: `${loc.name}${day.mode === "public" ? " (PUBLIC TRANSPORT)" : " (PRIVATE TRANSPORT)"}`,
      narrative: getNarrative(loc),
      chain,
      include,
      nota: loc.meal !== "none"
        ? "Makan tengah hari di Restaurant Halal Jepun atau apa-apa menu dengan bajet bersamaan ¥1,500/orang."
        : null,
    };
  };

  // Calls the PDF backend — a persistent Express + Puppeteer server on Render
  // (see server/index.js). Set VITE_API_URL in your frontend's environment
  // variables to the deployed Render URL (e.g. https://mkj-pdf-server.onrender.com).
  // Falls back to a relative path for local dev if you're running both on the same origin.
  // to render the MKJ Travel template into a real, text-selectable PDF.
  // Only works once deployed — there's no server to call while running in this preview.
  const [serverPdfLoading, setServerPdfLoading] = useState(false);
  const generateServerPdf = async () => {
    if (!result) return;
    setServerPdfLoading(true);
    try {
      const payload = {
        customer,
        phone: customerPhone,
        quotationNo,
        quotationDate: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        rate,
        adults,
        children,
        infants,
        sellAdult: result.sellAdult,
        sellChild: result.sellChild,
        sellInfant: result.sellInfant,
        totalYen: result.totalYen,
        depositRM,
        packageName: `Tokyo ${dayPlan.length}H${Math.max(0, dayPlan.length - 1)}M Package`,
        days: dayPlan.map(buildDayForServerPdf).filter(Boolean),
      };
      const apiBase = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiBase}/api/generate-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Server returned ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${customer.replace(/\s+/g, "_")}_${quotationNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(
        "Server PDF generation failed. This only works once the app is deployed to Vercel (with the /api function live) — it won't work in this local preview or a plain static host.\n\nError: " + err.message
      );
    } finally {
      setServerPdfLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: "#EDF2F8", minHeight: "100vh", fontFamily: "'IBM Plex Sans', system-ui, sans-serif", color: "#16283D" }}>
      {/* Header */}
      <header style={{ backgroundColor: "#16283D" }} className="px-5 py-6 sm:px-10 sm:py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div>
            <div style={{ color: "#3574B0", letterSpacing: "0.2em" }} className="text-xs font-semibold uppercase mb-1">
              旅程 · Itinerary Ledger
            </div>
            <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif" }} className="text-2xl sm:text-3xl text-white font-bold">
              Quotation Studio
            </h1>
          </div>
          <div className="flex items-center gap-2 text-sm" style={{ color: "#CBD8E6" }}>
            <Plane size={16} />
            <span>Japan Tour Pricing Engine</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 sm:px-10 py-8 grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* LEFT — Trip Settings */}
        <div className="lg:col-span-2 space-y-6">
          <section style={{ backgroundColor: "#FFFFFF", border: "1px solid #CBD8E6" }} className="rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <div style={{ backgroundColor: "#16283D" }} className="w-7 h-7 rounded flex items-center justify-center">
                <MapPin size={14} color="#EDF2F8" />
              </div>
              <h2 className="font-semibold text-sm uppercase tracking-wide">Trip Details</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2 text-xs" style={{ color: "#4A6A88" }}>
                Customer Name
                <input value={customer} onChange={(e) => setCustomer(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded border text-sm" style={{ borderColor: "#CBD8E6" }} />
              </label>
              <label className="col-span-2 text-xs" style={{ color: "#4A6A88" }}>
                Customer Phone
                <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+60..."
                  className="w-full mt-1 px-3 py-2 rounded border text-sm" style={{ borderColor: "#CBD8E6" }} />
              </label>
              <label className="text-xs" style={{ color: "#4A6A88" }}>
                Quotation No.
                <input value={quotationNo} onChange={(e) => setQuotationNo(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded border text-sm" style={{ borderColor: "#CBD8E6" }} />
              </label>
              <label className="text-xs" style={{ color: "#4A6A88" }}>
                Currency Rate (¥/RM ÷10)
                <input type="number" step="0.01" value={rate} onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 px-3 py-2 rounded border text-sm font-mono" style={{ borderColor: "#CBD8E6" }} />
              </label>
              <label className="col-span-2 text-xs" style={{ color: "#4A6A88" }}>
                Deposit (RM)
                <input value={depositRM} onChange={(e) => setDepositRM(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded border text-sm font-mono" style={{ borderColor: "#CBD8E6" }} />
              </label>
            </div>
          </section>

          <section style={{ backgroundColor: "#FFFFFF", border: "1px solid #CBD8E6" }} className="rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <div style={{ backgroundColor: "#16283D" }} className="w-7 h-7 rounded flex items-center justify-center">
                <Users size={14} color="#EDF2F8" />
              </div>
              <h2 className="font-semibold text-sm uppercase tracking-wide">Passengers</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[["Adult", adults, setAdults], ["Child (3-11)", children, setChildren], ["Infant (0-2)", infants, setInfants]].map(([label, val, setter]) => (
                <label key={label} className="text-xs" style={{ color: "#4A6A88" }}>
                  {label}
                  <input type="number" min="0" value={val} onChange={(e) => setter(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full mt-1 px-3 py-2 rounded border text-sm font-mono text-center" style={{ borderColor: "#CBD8E6" }} />
                </label>
              ))}
            </div>
            <div className="mt-3 text-xs flex justify-between pt-3" style={{ borderTop: "1px dashed #CBD8E6", color: "#4A6A88" }}>
              <span>Total Pax</span>
              <span className="font-mono font-semibold" style={{ color: "#16283D" }}>{totalPax}</span>
            </div>
          </section>

          <section style={{ backgroundColor: "#FFFFFF", border: "1px solid #CBD8E6" }} className="rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <div style={{ backgroundColor: "#16283D" }} className="w-7 h-7 rounded flex items-center justify-center">
                <Car size={14} color="#EDF2F8" />
              </div>
              <h2 className="font-semibold text-sm uppercase tracking-wide">Transport & Margin</h2>
            </div>
            <div className="text-xs mb-2" style={{ color: "#4A6A88" }}>
              Transport is set per day, in the itinerary below. Quick bulk-apply:
            </div>
            <div className="flex gap-2 mb-4">
              <button onClick={() => bulkSet("private")}
                className="flex-1 text-xs py-2 rounded border font-medium"
                style={{ borderColor: "#CBD8E6", color: "#16283D" }}>
                Set all Private
              </button>
              <button onClick={() => bulkSet("public")}
                className="flex-1 text-xs py-2 rounded border font-medium"
                style={{ borderColor: "#CBD8E6", color: "#16283D" }}>
                Set all Public
              </button>
            </div>
            <label className="text-xs" style={{ color: "#4A6A88" }}>
              MKJ Margin (%)
              <input type="number" value={mkj} onChange={(e) => setMkj(parseFloat(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded border text-sm font-mono" style={{ borderColor: "#CBD8E6" }} />
            </label>
            <div className="text-xs mt-3 pt-3" style={{ borderTop: "1px dashed #CBD8E6", color: "#4A6A88" }}>
              Public transport fare: <span className="font-mono font-semibold" style={{ color: "#16283D" }}>¥{PUBLIC_FARE_PER_PAX.toLocaleString()}</span>/pax (Adult & Child only — Infants ride free)
            </div>
          </section>

          <section style={{ backgroundColor: "#FFFFFF", border: "1px solid #CBD8E6" }} className="rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <div style={{ backgroundColor: "#16283D" }} className="w-7 h-7 rounded flex items-center justify-center">
                <Calendar size={14} color="#EDF2F8" />
              </div>
              <h2 className="font-semibold text-sm uppercase tracking-wide">Dates & Flights</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <label className="text-xs" style={{ color: "#4A6A88" }}>
                Date Start
                <input type="date" value={dateStart} onChange={(e) => changeDateStart(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded border text-sm"
                  style={{ borderColor: "#CBD8E6", colorScheme: "light", height: "38px", boxSizing: "border-box", WebkitAppearance: "none", appearance: "none" }} />
              </label>
              <label className="text-xs" style={{ color: "#4A6A88" }}>
                <span className="flex items-center gap-1">
                  <Plane size={11} style={{ transform: "rotate(45deg)" }} /> Arrival Flight
                </span>
                {!arrivalCustom ? (
                  <select
                    value={ARRIVAL_FLIGHT_OPTIONS.includes(arrivalFlight) ? arrivalFlight : "__custom__"}
                    onChange={(e) => {
                      if (e.target.value === "__custom__") { setArrivalCustom(true); setArrivalFlight(""); }
                      else setArrivalFlight(e.target.value);
                    }}
                    className="w-full mt-1 px-3 py-2 rounded border text-sm" style={{ borderColor: "#CBD8E6" }}
                  >
                    {ARRIVAL_FLIGHT_OPTIONS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                    <option value="__custom__">Other — type manually</option>
                  </select>
                ) : (
                  <div className="flex gap-1 mt-1">
                    <input value={arrivalFlight} onChange={(e) => setArrivalFlight(e.target.value)}
                      placeholder="Flight No. · Airport · Time"
                      className="w-full px-3 py-2 rounded border text-sm" style={{ borderColor: "#CBD8E6" }} />
                    <button type="button" onClick={() => { setArrivalCustom(false); setArrivalFlight(ARRIVAL_FLIGHT_OPTIONS[0]); }}
                      className="text-xs px-2 rounded border" style={{ borderColor: "#CBD8E6", color: "#4A6A88" }}>
                      List
                    </button>
                  </div>
                )}
              </label>
              <label className="text-xs" style={{ color: "#4A6A88" }}>
                Date End
                <input type="date" value={dateEnd} min={dateStart || undefined} onChange={(e) => setDateEnd(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded border text-sm"
                  style={{ borderColor: "#CBD8E6", colorScheme: "light", height: "38px", boxSizing: "border-box", WebkitAppearance: "none", appearance: "none" }} />
              </label>
              <label className="text-xs" style={{ color: "#4A6A88" }}>
                <span className="flex items-center gap-1">
                  <Plane size={11} style={{ transform: "rotate(-135deg)" }} /> Departure Flight
                </span>
                {!departureCustom ? (
                  <select
                    value={DEPARTURE_FLIGHT_OPTIONS.includes(departureFlight) ? departureFlight : "__custom__"}
                    onChange={(e) => {
                      if (e.target.value === "__custom__") { setDepartureCustom(true); setDepartureFlight(""); }
                      else setDepartureFlight(e.target.value);
                    }}
                    className="w-full mt-1 px-3 py-2 rounded border text-sm" style={{ borderColor: "#CBD8E6" }}
                  >
                    {DEPARTURE_FLIGHT_OPTIONS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                    <option value="__custom__">Other — type manually</option>
                  </select>
                ) : (
                  <div className="flex gap-1 mt-1">
                    <input value={departureFlight} onChange={(e) => setDepartureFlight(e.target.value)}
                      placeholder="Flight No. · Airport · Time"
                      className="w-full px-3 py-2 rounded border text-sm" style={{ borderColor: "#CBD8E6" }} />
                    <button type="button" onClick={() => { setDepartureCustom(false); setDepartureFlight(DEPARTURE_FLIGHT_OPTIONS[0]); }}
                      className="text-xs px-2 rounded border" style={{ borderColor: "#CBD8E6", color: "#4A6A88" }}>
                      List
                    </button>
                  </div>
                )}
              </label>
            </div>
          </section>

          {/* TRIP CALENDAR */}
          {dateStart && dateEnd && tripDates.length > 0 && (
            <section style={{ backgroundColor: "#FFFFFF", border: "1px solid #CBD8E6" }} className="rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <div style={{ backgroundColor: "#16283D" }} className="w-7 h-7 rounded flex items-center justify-center">
                  <Calendar size={14} color="#EDF2F8" />
                </div>
                <h2 className="font-semibold text-sm uppercase tracking-wide">Trip Calendar</h2>
              </div>

              <div style={{ color: "#3574B0" }} className="text-xs font-semibold uppercase tracking-wide mb-2">
                {calendarTitle}
              </div>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="text-center text-[10px] font-semibold uppercase" style={{ color: "#4A6A88" }}>{w}</div>
                ))}
              </div>
              <div className="space-y-1">
                {tripWeeks.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7 gap-1">
                    {week.map((date, di) => {
                      const iso = toISODate(date);
                      const dayIdx = dayIndexByDate[iso];
                      const inTrip = Boolean(dayIdx);
                      const loc = inTrip ? locationByDayIndex[dayIdx] : null;
                      // mark a new-month boundary (skip the very first cell overall)
                      const isMonthStart = date.getDate() === 1 && !(wi === 0 && di === 0);
                      return (
                        <div key={di}
                          className="aspect-square rounded flex flex-col items-center justify-center px-0.5 text-center"
                          style={{
                            backgroundColor: inTrip ? "#16283D" : "#EDF2F8",
                            border: isMonthStart ? "2px solid #B23B2E" : `1px solid ${inTrip ? "#16283D" : "#CBD8E6"}`,
                            color: inTrip ? "#FFFFFF" : "#4A6A88",
                          }}
                        >
                          <div className="text-[10px] font-semibold leading-none">{date.getDate()}</div>
                          {inTrip && (
                            <div className="text-[7px] leading-tight mt-0.5" style={{ color: "#3574B0" }}>
                              D{dayIdx}
                            </div>
                          )}
                          {inTrip && loc && (
                            <div className="text-[6.5px] leading-tight opacity-80 truncate w-full px-0.5">
                              {loc.name}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="text-xs pt-3 mt-2" style={{ borderTop: "1px dashed #CBD8E6", color: "#4A6A88" }}>
                Each highlighted date maps to a day in your itinerary, in the order destinations are ticked above (D1, D2, D3…). Tick/untick or reorder your selections above to shift what shows on each date.
              </div>
            </section>
          )}
        </div>

        {/* RIGHT — Itinerary + Ledger */}
        <div className="lg:col-span-3 space-y-6">
          <section style={{ backgroundColor: "#FFFFFF", border: "1px solid #CBD8E6" }} className="rounded-lg p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-sm uppercase tracking-wide">Build Itinerary</h2>
              <span className="text-xs font-mono" style={{ color: "#4A6A88" }}>{dayPlan.length} day{dayPlan.length !== 1 ? "s" : ""}</span>
            </div>
            {autoSuggested && (
              <div className="text-xs mb-4" style={{ color: "#3574B0" }}>
                ✨ Auto-suggested from your dates & flights. Tap any day to change its destination.
              </div>
            )}
            {!autoSuggested && <div className="mb-4" />}

            <div className="space-y-2">
              {dayPlan.map((day, i) => {
                const loc = LOCATIONS.find((l) => l.id === day.locationId);
                const iso = tripDates[i];
                const isOpen = openDayIndex === i;
                const isDragging = dragIndex === i;
                const isDragOver = dragOverIndex === i && dragIndex !== null && dragIndex !== i;
                const locked = isLocked(i);
                return (
                  <div key={day.uid}
                    ref={(el) => {
                      if (el) dayRefs.current.set(day.uid, el);
                      else dayRefs.current.delete(day.uid);
                    }}
                    className="rounded overflow-hidden"
                    style={{
                      border: `1px solid ${isDragOver ? "#3574B0" : isOpen ? "#16283D" : "#CBD8E6"}`,
                      opacity: isDragging ? 0.5 : 1,
                      boxShadow: isDragOver ? "0 0 0 2px #3574B0" : "none",
                    }}>
                    <div className="w-full flex items-center justify-between text-left px-1.5 py-2.5"
                      style={{ backgroundColor: isOpen ? "#16283D" : "#EDF2F8", color: isOpen ? "#FFFFFF" : "#16283D" }}>
                      <button
                        onPointerDown={(e) => handleDragStart(i, e)}
                        onPointerMove={handleDragMove}
                        onPointerUp={handleDragEnd}
                        onPointerCancel={handleDragEnd}
                        disabled={locked}
                        className="px-1.5 flex-shrink-0 self-stretch flex items-center"
                        style={{
                          touchAction: "none",
                          cursor: locked ? "not-allowed" : "grab",
                          color: locked ? (isOpen ? "#3E5A78" : "#B7C6D9") : (isOpen ? "#A8C5E8" : "#4A6A88"),
                        }}
                        aria-label={locked ? "Fixed day — cannot be reordered" : "Drag to reorder"}
                        title={locked ? "Arrival/Departure day — fixed in place" : "Drag to reorder"}>
                        <GripVertical size={16} />
                      </button>
                      <button onClick={() => setOpenDayIndex(isOpen ? null : i)} className="flex-1 min-w-0 flex items-center justify-between text-left">
                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: isOpen ? "#A8C5E8" : "#3574B0" }}>
                            Day {i + 1}{iso ? ` · ${iso}` : ""}
                          </div>
                          <div className="text-sm font-medium truncate">{loc ? loc.name : "Select a destination"}</div>
                          {loc && <div className="text-xs opacity-70 truncate">{loc.detail}</div>}
                        </div>
                        <ChevronRight size={16} style={{ transform: isOpen ? "rotate(90deg)" : "none", flexShrink: 0, marginLeft: 8 }} />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 px-3 py-2" style={{ backgroundColor: "#FFFFFF" }}>
                      {["private", "public"].map((m) => (
                        <button key={m} onClick={() => updateDayMode(i, m)}
                          className="flex-1 text-[11px] py-1.5 rounded font-semibold uppercase tracking-wide"
                          style={{
                            backgroundColor: day.mode === m ? "#3574B0" : "#EDF2F8",
                            color: day.mode === m ? "#16283D" : "#4A6A88",
                            border: "1px solid #CBD8E6",
                          }}>
                          {m}
                        </button>
                      ))}
                      <button onClick={() => removeDay(i)}
                        className="text-[11px] px-2 py-1.5 rounded font-semibold"
                        style={{ color: "#B23B2E", border: "1px solid #CBD8E6" }}>
                        Remove
                      </button>
                    </div>

                    {isOpen && (
                      <div className="p-2 max-h-72 overflow-y-auto" style={{ borderTop: "1px solid #CBD8E6", backgroundColor: "#EDF2F8" }}>
                        {groups.map((g) => (
                          <div key={g} className="mb-2 last:mb-0">
                            <div className="text-[10px] font-semibold uppercase tracking-wide px-1 mb-1" style={{ color: "#3574B0" }}>{g}</div>
                            {LOCATIONS.filter((l) => l.group === g).map((l) => (
                              <button key={l.id} onClick={() => selectLocationForDay(i, l.id)}
                                className="w-full text-left px-2 py-1.5 rounded text-sm"
                                style={{
                                  backgroundColor: l.id === day.locationId ? "#16283D" : "transparent",
                                  color: l.id === day.locationId ? "#FFFFFF" : "#16283D",
                                }}>
                                {l.name}
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <button onClick={addDay}
                className="w-full text-xs py-2.5 rounded border font-medium"
                style={{ borderColor: "#CBD8E6", color: "#16283D" }}>
                + Add Day
              </button>
            </div>
          </section>

          <section style={{ backgroundColor: "#FFFFFF", border: "1px solid #CBD8E6" }} className="rounded-lg overflow-hidden relative">
            <div style={{ backgroundColor: "#16283D" }} className="px-5 py-3">
              <h2 className="text-sm uppercase tracking-wide text-white font-semibold">Price Ledger</h2>
            </div>

            {!result ? (
              <div className="p-8 text-center text-sm" style={{ color: "#4A6A88" }}>
                Add at least one passenger and one destination to see pricing.
              </div>
            ) : (
              <div className="p-5">
                {(dateStart || dateEnd || arrivalFlight || departureFlight) && (
                  <div className="mb-4 pb-4 text-xs space-y-1" style={{ borderBottom: "1px dashed #CBD8E6", color: "#4A6A88" }}>
                    {(dateStart || dateEnd) && (
                      <div className="flex justify-between">
                        <span>Travel Dates</span>
                        <span className="font-mono" style={{ color: "#16283D" }}>{dateStart || "?"} → {dateEnd || "?"}</span>
                      </div>
                    )}
                    {arrivalFlight && (
                      <div className="flex justify-between">
                        <span>Arrival</span>
                        <span className="font-mono" style={{ color: "#16283D" }}>{arrivalFlight}</span>
                      </div>
                    )}
                    {departureFlight && (
                      <div className="flex justify-between">
                        <span>Departure</span>
                        <span className="font-mono" style={{ color: "#16283D" }}>{departureFlight}</span>
                      </div>
                    )}
                  </div>
                )}
                <table className="w-full text-sm mb-4">
                  <thead>
                    <tr style={{ color: "#4A6A88" }} className="text-xs uppercase">
                      <th className="text-left pb-2 font-medium">Pax Type</th>
                      <th className="text-right pb-2 font-medium">Qty</th>
                      <th className="text-right pb-2 font-medium">Per Pax</th>
                      <th className="text-right pb-2 font-medium">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {adults > 0 && (
                      <tr style={{ borderTop: "1px dashed #CBD8E6" }}>
                        <td className="py-2">Adult</td>
                        <td className="text-right py-2">{adults}</td>
                        <td className="text-right py-2">{fmtY(result.sellAdult)}</td>
                        <td className="text-right py-2 font-semibold">{fmtY(result.sellAdult * adults)}</td>
                      </tr>
                    )}
                    {children > 0 && (
                      <tr style={{ borderTop: "1px dashed #CBD8E6" }}>
                        <td className="py-2">Child</td>
                        <td className="text-right py-2">{children}</td>
                        <td className="text-right py-2">{fmtY(result.sellChild)}</td>
                        <td className="text-right py-2 font-semibold">{fmtY(result.sellChild * children)}</td>
                      </tr>
                    )}
                    {infants > 0 && (
                      <tr style={{ borderTop: "1px dashed #CBD8E6" }}>
                        <td className="py-2">Infant</td>
                        <td className="text-right py-2">{infants}</td>
                        <td className="text-right py-2">{fmtY(result.sellInfant)}</td>
                        <td className="text-right py-2 font-semibold">{fmtY(result.sellInfant * infants)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <div style={{ borderTop: "2px solid #16283D" }} className="pt-4 space-y-1.5 font-mono text-sm">
                  <div className="flex justify-between" style={{ color: "#4A6A88" }}>
                    <span>Trip Cost</span>
                    <span>{fmtY(result.tripCostYen)} · {fmtR(result.toRM(result.tripCostYen))}</span>
                  </div>
                  <div className="flex justify-between" style={{ color: "#4A6A88" }}>
                    <span>MKJ Fee ({mkj}%)</span>
                    <span>{fmtY(result.mkjFeeYen)} · {fmtR(result.toRM(result.mkjFeeYen))}</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-2" style={{ borderTop: "1px dashed #CBD8E6" }}>
                    <span style={{ fontFamily: "Georgia, serif" }} className="text-base font-bold" >Selling Price</span>
                    <div className="text-right">
                      <div style={{ color: "#16283D" }} className="text-lg font-bold">{fmtY(result.totalYen)}</div>
                      <div style={{ color: "#3574B0" }} className="text-sm font-semibold">{fmtR(result.toRM(result.totalYen))}</div>
                    </div>
                  </div>
                </div>

                {/* Hanko stamp signature element */}
                <div className="flex justify-end mt-5">
                  <div
                    style={{
                      border: "2.5px solid #B23B2E",
                      color: "#B23B2E",
                      borderRadius: "50%",
                      width: 74,
                      height: 74,
                      transform: "rotate(-8deg)",
                      opacity: 0.85,
                    }}
                    className="flex flex-col items-center justify-center font-mono text-[9px] font-bold leading-tight"
                  >
                    <Stamp size={16} className="mb-0.5" />
                    <span>QUOTED</span>
                    <span>#{quotationNo}</span>
                  </div>
                </div>

                <button onClick={() => setShowPreview(true)}
                  className="w-full mt-4 py-3 rounded font-semibold text-sm uppercase tracking-wide"
                  style={{ backgroundColor: "#16283D", color: "#FFFFFF" }}>
                  Preview & Generate Customer PDF
                </button>
              </div>
            )}
          </section>

          {/* FULL COST DETAILS — for Operations */}
          {result && (
            <section style={{ backgroundColor: "#FFFFFF", border: "1px solid #CBD8E6" }} className="rounded-lg overflow-hidden">
              <div style={{ backgroundColor: "#16283D" }} className="px-5 py-3">
                <h2 className="text-sm uppercase tracking-wide text-white font-semibold">Full Cost Details</h2>
              </div>

              <div className="p-5 space-y-6">
                {/* Per-day component breakdown */}
                <div>
                  <div style={{ color: "#3574B0" }} className="text-xs font-semibold uppercase tracking-wide mb-2">
                    Per-Day Cost Detail
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono min-w-[720px]">
                      <thead>
                        <tr style={{ color: "#4A6A88" }} className="text-left uppercase">
                          <th className="pb-2 pr-3 font-medium">Day</th>
                          <th className="pb-2 pr-3 font-medium">Mode</th>
                          <th className="pb-2 pr-3 font-medium text-right">Transport (Total/Pax)</th>
                          <th className="pb-2 pr-3 font-medium text-right">Public Fare</th>
                          <th className="pb-2 pr-3 font-medium text-right">Meal</th>
                          <th className="pb-2 pr-3 font-medium text-right">Hotel</th>
                          <th className="pb-2 pr-3 font-medium text-right">TG Entrance</th>
                          <th className="pb-2 pr-3 font-medium text-right">TG Fee</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.dayRows.map((d) => (
                          <tr key={d.id} style={{ borderTop: "1px dashed #CBD8E6" }}>
                            <td className="py-2 pr-3">{d.name}</td>
                            <td className="py-2 pr-3 capitalize" style={{ color: d.mode === "public" ? "#B23B2E" : "#16283D" }}>{d.mode}</td>
                            <td className="py-2 pr-3 text-right">{fmtY(d.privateTotal)} / {fmtY(d.privatePerPax)}</td>
                            <td className="py-2 pr-3 text-right">{d.publicFare ? fmtY(d.publicFare) : "–"}</td>
                            <td className="py-2 pr-3 text-right">{d.mealCust ? fmtY(d.mealCust) : "–"}</td>
                            <td className="py-2 pr-3 text-right">{d.hotelCust ? fmtY(d.hotelCust) : "–"}</td>
                            <td className="py-2 pr-3 text-right">{d.tgEntrance ? fmtY(d.tgEntrance) : "–"}</td>
                            <td className="py-2 pr-3 text-right">{fmtY(d.tgFee)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Daily cost by pax type */}
                <div>
                  <div style={{ color: "#3574B0" }} className="text-xs font-semibold uppercase tracking-wide mb-2">
                    Daily Cost by Pax Type
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono min-w-[420px]">
                      <thead>
                        <tr style={{ color: "#4A6A88" }} className="text-left uppercase">
                          <th className="pb-2 pr-3 font-medium">Day</th>
                          <th className="pb-2 pr-3 font-medium text-right">Adult (A)</th>
                          <th className="pb-2 pr-3 font-medium text-right">Child (C)</th>
                          <th className="pb-2 pr-3 font-medium text-right">Infant (I)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.dayRows.map((d) => (
                          <tr key={d.id} style={{ borderTop: "1px dashed #CBD8E6" }}>
                            <td className="py-2 pr-3">{d.name}</td>
                            <td className="py-2 pr-3 text-right">{fmtY(d.a)}</td>
                            <td className="py-2 pr-3 text-right">{fmtY(d.c)}</td>
                            <td className="py-2 pr-3 text-right">{fmtY(d.i)}</td>
                          </tr>
                        ))}
                        <tr style={{ borderTop: "2px solid #16283D" }} className="font-semibold">
                          <td className="py-2 pr-3">Total (before Others/MKJ)</td>
                          <td className="py-2 pr-3 text-right">{fmtY(result.dayRows.reduce((s, d) => s + d.a, 0))}</td>
                          <td className="py-2 pr-3 text-right">{fmtY(result.dayRows.reduce((s, d) => s + d.c, 0))}</td>
                          <td className="py-2 pr-3 text-right">{fmtY(result.dayRows.reduce((s, d) => s + d.i, 0))}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Base cost & selling price summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div style={{ color: "#3574B0" }} className="text-xs font-semibold uppercase tracking-wide mb-2">
                      Base Cost (Pre-Markup)
                    </div>
                    <table className="w-full text-xs font-mono">
                      <tbody>
                        <tr style={{ borderTop: "1px dashed #CBD8E6" }}>
                          <td className="py-1.5">Adult</td><td className="py-1.5 text-right">{fmtY(result.costAdult)}</td>
                        </tr>
                        <tr style={{ borderTop: "1px dashed #CBD8E6" }}>
                          <td className="py-1.5">Child</td><td className="py-1.5 text-right">{fmtY(result.costChild)}</td>
                        </tr>
                        <tr style={{ borderTop: "1px dashed #CBD8E6" }}>
                          <td className="py-1.5">Infant</td><td className="py-1.5 text-right">{fmtY(result.costInfant)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <div style={{ color: "#3574B0" }} className="text-xs font-semibold uppercase tracking-wide mb-2">
                      Selling Price (+{mkj}% MKJ)
                    </div>
                    <table className="w-full text-xs font-mono">
                      <tbody>
                        <tr style={{ borderTop: "1px dashed #CBD8E6" }}>
                          <td className="py-1.5">Adult</td><td className="py-1.5 text-right">{fmtY(result.sellAdult)}</td>
                        </tr>
                        <tr style={{ borderTop: "1px dashed #CBD8E6" }}>
                          <td className="py-1.5">Child</td><td className="py-1.5 text-right">{fmtY(result.sellChild)}</td>
                        </tr>
                        <tr style={{ borderTop: "1px dashed #CBD8E6" }}>
                          <td className="py-1.5">Infant</td><td className="py-1.5 text-right">{fmtY(result.sellInfant)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Fixed line items note */}
                <div className="text-xs pt-3" style={{ borderTop: "1px dashed #CBD8E6", color: "#4A6A88" }}>
                  Includes fixed "Others Charge" per pax: Insurance {fmtY(OTHERS_FIXED)} (flat) + Booking/Flight TG {fmtY(OTHERS_SHARED)} (split across {totalPax || 1} pax = {fmtY(totalPax ? OTHERS_SHARED / totalPax : 0)}/pax)
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-5 sm:px-10 pb-8 text-xs text-center" style={{ color: "#4A6A88" }}>
        Prototype — pricing logic mirrors the original quotation spreadsheet's formulas.
      </footer>

      {/* PRINT-ONLY STYLES — hides the app UI, shows only the document when printing, sized to real A4 */}
      <style>{`
        @page { size: A4; margin: 15mm; }
        @media print {
          body * { visibility: hidden; }
          #customer-doc, #customer-doc * { visibility: visible; }
          #customer-doc { position: absolute; top: 0; left: 0; width: 100%; box-shadow: none !important; }
          .no-print { display: none !important; }
          .a4-day-block { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      {/* CUSTOMER PDF PREVIEW OVERLAY — sized to real A4 (210mm × 297mm) so what you see matches the printed/downloaded page */}
      {showPreview && result && (
        <div className="fixed inset-0 z-50 overflow-y-auto" style={{ backgroundColor: "rgba(22,40,61,0.6)" }}>
          <div className="mx-auto my-6 px-3" style={{ maxWidth: "230mm" }}>
            <div className="no-print flex items-center justify-between mb-3 sticky top-0 z-10 py-2 px-3 rounded" style={{ backgroundColor: "#16283D" }}>
              <span className="text-white text-sm font-semibold">Customer Itinerary Preview <span style={{ color: "#A8C5E8", fontWeight: 400 }}>· A4</span></span>
              <div className="flex gap-2 flex-wrap justify-end">
                <button onClick={generateServerPdf} disabled={serverPdfLoading}
                  className="text-xs px-3 py-1.5 rounded font-semibold" style={{ backgroundColor: "#F4C430", color: "#0A2149", opacity: serverPdfLoading ? 0.6 : 1 }}>
                  {serverPdfLoading ? "Generating…" : "Generate MKJ PDF (Server)"}
                </button>
                <button onClick={() => window.print()}
                  className="text-xs px-3 py-1.5 rounded font-semibold" style={{ backgroundColor: "#EDF2F8", color: "#16283D", border: "1px solid #CBD8E6" }}>
                  Print / Save as PDF
                </button>
                <button onClick={downloadCustomerHTML}
                  className="text-xs px-3 py-1.5 rounded font-semibold" style={{ backgroundColor: "#3574B0", color: "#16283D" }}>
                  Download File
                </button>
                <button onClick={() => setShowPreview(false)}
                  className="text-xs px-3 py-1.5 rounded font-semibold" style={{ backgroundColor: "#EDF2F8", color: "#16283D" }}>
                  Close
                </button>
              </div>
            </div>

            <div id="customer-doc"
              style={{ backgroundColor: "#FFFFFF", color: "#16283D", fontFamily: "Georgia, 'Times New Roman', serif", width: "210mm", minHeight: "297mm", margin: "0 auto" }}
              className="overflow-hidden shadow-xl">
              {/* Cover */}
              <div style={{ backgroundColor: "#16283D" }} className="px-8 py-10 text-white">
                <div style={{ color: "#3574B0" }} className="text-xs uppercase tracking-widest mb-2 font-sans">Quotation #{quotationNo}</div>
                <h1 className="text-3xl font-bold mb-1">{customer}</h1>
                <div className="text-sm opacity-80 font-sans">
                  {(() => {
                    const firstCity = (LOCATIONS.find((l) => l.id === dayPlan[0]?.locationId)?.name) || "Japan";
                    return `Tokyo ${dayPlan.length}H${Math.max(0, dayPlan.length - 1)}M Itinerary`;
                  })()}
                </div>
                {(dateStart || dateEnd) && (
                  <div className="text-sm opacity-80 mt-1 font-sans">{formatDateMY(dateStart)} – {formatDateMY(dateEnd)}</div>
                )}
              </div>

              {/* Day-by-day narrative */}
              <div className="px-8 py-6 space-y-8">
                {dayPlan.map((day, i) => {
                  const loc = LOCATIONS.find((l) => l.id === day.locationId);
                  if (!loc) return null;
                  const iso = tripDates[i];
                  return (
                    <div key={i} style={{ borderBottom: i < dayPlan.length - 1 ? "1px dashed #CBD8E6" : "none" }} className="a4-day-block pb-8 last:border-0 last:pb-0">
                      <div className="flex items-baseline gap-3 mb-2 font-sans">
                        <span style={{ backgroundColor: "#16283D", color: "#FFFFFF" }} className="text-xs font-bold px-2 py-1 rounded">DAY {i + 1}</span>
                        {iso && <span className="text-sm font-semibold" style={{ color: "#4A6A88" }}>{formatDateMY(iso)} · {dayNameMY(iso)}</span>}
                      </div>
                      <div style={{ color: "#3574B0" }} className="text-sm font-bold uppercase tracking-wide mb-2 font-sans">
                        {loc.name} {day.mode === "public" ? "(PUBLIC TRANSPORT)" : "(PRIVATE TRANSPORT)"}
                      </div>
                      <p className="text-sm leading-relaxed mb-3">{getNarrative(loc)}</p>
                      <div className="flex flex-wrap gap-2 font-sans">
                        {loc.detail.split(" · ").map((stop) => (
                          <span key={stop} style={{ backgroundColor: "#EDF2F8", color: "#16283D", border: "1px solid #CBD8E6" }} className="text-xs px-2 py-1 rounded">
                            {stop}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Include / Exclude footer */}
              <div style={{ backgroundColor: "#EDF2F8" }} className="px-8 py-6 font-sans">
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <div style={{ color: "#16283D" }} className="text-xs font-bold uppercase tracking-wide mb-2">Include</div>
                    <ul className="text-xs space-y-1" style={{ color: "#4A6A88" }}>
                      <li>• Ticket Entrance</li>
                      <li>• Private Tour Guide</li>
                      <li>• Pengangkutan (Transport)</li>
                      <li>• Panduan Solat</li>
                      <li>• Makanan Halal (Lunch)</li>
                      <li>• Travel Insurance</li>
                      <li>• Penginapan (Hotel)</li>
                    </ul>
                  </div>
                  <div>
                    <div style={{ color: "#B23B2E" }} className="text-xs font-bold uppercase tracking-wide mb-2">Exclude</div>
                    <ul className="text-xs space-y-1" style={{ color: "#4A6A88" }}>
                      <li>• Tiket Penerbangan (Flight Ticket)</li>
                      <li>• Breakfast & Dinner (bebas pilih sendiri)</li>
                      <li>• Perbelanjaan peribadi</li>
                    </ul>
                  </div>
                </div>
                <div className="text-xs italic leading-relaxed" style={{ color: "#4A6A88" }}>
                  *Makan tengah hari di Restaurant Halal Jepun atau menu bersamaan ¥1,500/orang. Untuk Breakfast dan Dinner, anda bebas memilih restoran mengikut citarasa sendiri.
                  <br />**Harga pakej ini mungkin berubah mengikut musim disebabkan kos penginapan berbeza. Sila hubungi kami untuk pengesahan harga akhir.
                </div>
              </div>

              {/* Price summary */}
              <div style={{ backgroundColor: "#16283D" }} className="px-8 py-6 text-white font-sans">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm">Jumlah Harga (Total Price)</span>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{fmtY(result.totalYen)}</div>
                    <div className="text-sm" style={{ color: "#3574B0" }}>{fmtR(result.toRM(result.totalYen))}</div>
                  </div>
                </div>
                <div className="text-xs mt-2 opacity-70">
                  {adults} Adult{adults !== 1 ? "s" : ""}{children ? `, ${children} Child` : ""}{infants ? `, ${infants} Infant` : ""} · Quotation #{quotationNo}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
