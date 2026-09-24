// All copy, contact details and image assignments for the site live here.
// Replace the values marked PLACEHOLDER when the real details arrive.
// Photos live under /public/images; `image: null` shows a designed placeholder.

export const site = {
  name: "We Land Resort", // as on the signage
  shortName: "We Land",
  suffix: "Resort",
  location: "Kakkadampoyil, Kozhikode, Kerala",
  locationShort: "Kakkadampoyil, Kerala",
  tagline: "A hilltop in Kakkadampoyil, above the mist.",
  description:
    "We Land Resort sits on a ridge in Kakkadampoyil with an infinity pool facing the mountains, a sky deck that walks out over the valley, six rooms, a dormitory for groups, and a hall for meetings and celebrations.",
  // Bookings and enquiries; the same number takes WhatsApp messages.
  phone: "+91 90744 24142",
  phoneHref: "tel:+919074424142",
  whatsappNumber: "919074424142", // digits only, with the country code
  whatsappHref: `https://wa.me/919074424142?text=${encodeURIComponent("Hello! I'd like to ask about a stay at We Land Resort.")}`,
  email: "welandresort0072@gmail.com",
  instagram: { href: "https://www.instagram.com/weland.resort/", handle: "@weland.resort" },
  // As on the resort's Google Maps listing.
  address: ["We Land Resort", "Foggy Mountain, Park Road", "Kakkadampoyil, Kozhikode, Kerala 673604"],
  mapsHref: "https://maps.app.goo.gl/sK3fXUWg9pns3AEaA",
  // By the listing's name: it pins the resort (11.3337, 76.1173) with its place card.
  mapEmbed: "https://maps.google.com/maps?q=Weland+Kakkadampoyil+Resort,+Kakkadampoyil,+Kerala+673604&z=15&output=embed",
  checkIn: "3:00 pm",
  checkOut: "12:00 noon",
};

export const images = {
  hero: { src: "/images/hero-sunset-deck.jpg", alt: "The We Land Resort sky deck and infinity pool at sunset, mountains fading into mist behind" },
};

export const nav = [
  { label: "Stays", href: "#stays" },
  { label: "Conference hall", href: "#conference" },
  { label: "Gallery", href: "#gallery" },
  { label: "Getting here", href: "#location" },
];

export interface Unit {
  id: string;
  name: string;
  note: string; // written from the photos — confirm with the resort
  image: { src: string; alt: string };
}

export interface Stay {
  slug: string;
  name: string;
  summary: string;
  description: string;
  count: string;
  sleeps: string;
  bathroom: string;
  view: string;
  fromPrice: string; // PLACEHOLDER rates
  priceUnit: string;
  image: { src: string; alt: string } | null; // null → designed placeholder until photos arrive
  /** Air-conditioned or not: shown as an icon beside the count */
  climate: "ac" | "non-ac";
  placeholderCaption: string;
  extras: { src: string; alt: string; caption: string }[];
  units?: Unit[];
  highlights: string[];
}

export const stays: Stay[] = [
  {
    slug: "rooms",
    name: "The Rooms",
    summary: "Six rooms in the main building, each opening onto a terrace and the hills.",
    description:
      "Six rooms across two floors of the main building, with the rooftop above and the pool and sky deck a few steps away. Every room has a wide sliding window onto a turf terrace with chairs, wood-panelled walls, an electric kettle, a wardrobe and an attached bathroom with a glass shower and hot water. Room A1 has two beds for a family; B2 is the largest, with a sitting area.",
    count: "6 rooms",
    sleeps: "2 adults and 1 child; room A1 sleeps 4",
    bathroom: "Attached, glass shower, hot water",
    view: "Valley and mountains from the terrace",
    fromPrice: "₹4,500",
    priceUnit: "per night, from",
    image: { src: "/images/room-view.jpg", alt: "A room with the bed facing wide windows onto the misty valley" },
    climate: "non-ac",
    placeholderCaption: "Photo: a room",
    extras: [
      { src: "/images/room-terrace.jpg", alt: "The turf terrace outside the rooms with hanging lamps and rattan chairs", caption: "The terrace outside" },
      { src: "/images/room-bathroom.jpg", alt: "Attached bathroom with a glass shower partition", caption: "Attached bathroom" },
      { src: "/images/room-dusk.jpg", alt: "A lit room seen from the balcony at dusk, forest behind", caption: "Dusk from the balcony" },
    ],
    units: [
      { id: "A1", name: "Room A1", note: "Two beds, so a family of four stays together. Corner windows onto the valley and its own turf balcony.", image: { src: "/images/room-a1.jpg", alt: "Room A1 with two beds and wood-panelled walls" } },
      { id: "A2", name: "Room A2", note: "A double with a wardrobe and kettle, opening onto the shared terrace with the hanging lamps.", image: { src: "/images/room-a2.jpg", alt: "Room A2 with a double bed and wardrobe" } },
      { id: "A3", name: "Room A3", note: "A double beside the stairway to the terrace. The big window faces the trees.", image: { src: "/images/room-a3.jpg", alt: "Room A3 with a double bed and tall curtained windows" } },
      { id: "A4", name: "Room A4", note: "A double on the terrace level, with chairs outside the door under the deck.", image: { src: "/images/room-a4.jpg", alt: "Room A4 with a double bed facing the window" } },
      { id: "B1", name: "Room B1", note: "A double at the end of the row, where the balcony looks straight down the valley at dusk.", image: { src: "/images/room-b1.jpg", alt: "Room B1 with a double bed and a chair by the window" } },
      { id: "B2", name: "Room B2", note: "The largest room: a double with a sitting area, two chairs and a desk under pendant lights.", image: { src: "/images/room-b2.jpg", alt: "Room B2 with a double bed, a desk and two chairs" } },
    ],
    highlights: ["Attached bathroom with hot water", "Terrace with chairs", "Electric kettle", "Wardrobe"],
  },
  {
    slug: "dormitory",
    name: "The Dormitory",
    summary: "Bunk beds for a group, with a deck that hangs out over the trees.",
    description:
      "A separate block below the main building with air-conditioned bunk beds, shared washrooms with several cubicles, and a covered deck that cantilevers over the slope, which is where the group ends up every evening. Made for trekking groups, student trips, corporate teams and big families travelling together.",
    count: "1 dormitory block",
    sleeps: "Up to 16, in 16 bunk beds",
    bathroom: "Shared washrooms, hot water",
    view: "Forest and valley from the deck",
    fromPrice: "₹1,200",
    priceUnit: "per bed per night, from",
    image: { src: "/images/dorm-bunks.jpg", alt: "The dormitory with rows of wooden bunk beds and black steel ladders" },
    climate: "ac",
    placeholderCaption: "Photo: the dormitory",
    extras: [
      { src: "/images/dorm-exterior.jpg", alt: "The dormitory block with its covered deck cantilevered over the slope", caption: "The block and its deck" },
      { src: "/images/dorm-deck-dusk.jpg", alt: "The dormitory deck at dusk with pendant lamps and jali screens", caption: "The deck at dusk" },
      { src: "/images/dorm-washrooms.jpg", alt: "Shared washrooms with separate cubicles", caption: "Shared washrooms" },
    ],
    highlights: ["Air-conditioned", "Covered deck", "Shared washrooms", "Close to the campfire lawn"],
  },
];

export const conference = {
  title: "A hall for meetings and celebrations.",
  text:
    "A wood-panelled hall with glass walls onto the garden, set up theatre-style for offsites, training days and family functions. The sound system is built in, the washrooms are attached, and the pool deck and sky deck are right outside for breaks and photographs. Between bookings it is the games room: carrom boards come out and the chairs go to the walls.",
  // PLACEHOLDER — confirm seat count and projector availability with the resort.
  facts: [
    ["Seats", "Around 80, theatre-style"],
    ["Layouts", "Theatre, classroom, round table"],
    ["Equipment", "Sound system installed; projector and screen arranged on request"],
    ["Washrooms", "Attached to the hall"],
    ["Catering", "From the resort kitchen"],
    ["Good for", "Offsites, workshops, receptions, birthdays, games evenings"],
  ],
  image: { src: "/images/hall-main.jpg", alt: "The conference hall set theatre-style with rows of rattan chairs and glass walls onto the garden" } as { src: string; alt: string } | null,
  placeholderCaption: "Photo: the conference hall",
  extras: [
    { src: "/images/hall-stage-wall.jpg", alt: "The We Land stage wall with lamps and speakers", caption: "The stage wall" },
    { src: "/images/hall-seating.jpg", alt: "Rows of chairs with a carrom board table in the foreground", caption: "Carrom between bookings" },
    { src: "/images/hall-washrooms.jpg", alt: "Attached washrooms with marble finish and separate cubicles", caption: "Attached washrooms" },
  ],
};

// The "above the mist" section between About and Stays. The three lines
// crossfade as the morning cloud sinks into the valley below the resort.
export const mist = {
  beats: [
    "Most mornings here begin inside a cloud.",
    "By half past seven it sinks into the valley,",
    "and We Land is left standing *above the mist.*",
  ],
  label: "We Land Resort",
};

export interface GalleryItem {
  caption: string;
  /** w and h are the file's pixel size: the gallery shows every photo whole, in its own shape */
  image: { src: string; alt: string; w: number; h: number };
  /** Leads the gallery, larger, with its caption showing */
  feature?: boolean;
}

// All the resort photos (the GEN set), each shown whole. The layout puts them
// in rows that run edge to edge (GalleryRows.tsx); tap any one for the slideshow.
export const gallery: GalleryItem[] = [
  { caption: "We Land at dusk, above the mist", image: { src: "/images/resort-dusk-mist.jpg", alt: "Aerial view of We Land Resort at dusk: the lit main building, the pool and the garden paths on the forested hilltop, with mist lying over the hills behind", w: 2000, h: 1500 }, feature: true },
  { caption: "The sky deck and pool at sunset", image: { src: "/images/hero-sunset-deck.jpg", alt: "The sky deck and infinity pool at sunset, mountains fading into mist behind", w: 2400, h: 1623 } },
  { caption: "The pool at sunset", image: { src: "/images/pool-sunset.jpg", alt: "The infinity pool at sunset with the sun setting behind the mountains", w: 2000, h: 1356 } },
  { caption: "The sky deck in mist", image: { src: "/images/sky-deck-mist.jpg", alt: "The red-roofed sky deck gateway leading out into the mist", w: 1078, h: 1600 } },
  { caption: "Dinner on the sky deck", image: { src: "/images/deck-dinner-sunset.jpg", alt: "A table set at the end of the sky deck at sunset, hills in every direction", w: 2000, h: 1353 } },
  { caption: "The building at dusk", image: { src: "/images/building-dusk.jpg", alt: "The main building lit up at dusk with string lights along the terrace", w: 1600, h: 1177 } },
  { caption: "The resort from the air", image: { src: "/images/aerial-resort.jpg", alt: "The main building and the pool on the hilltop from the air, forest falling away below and mist along the ridge", w: 2000, h: 1500 } },
  { caption: "Play area", image: { src: "/images/play-area.jpg", alt: "Swings and a slide on the paved terrace with hills behind", w: 1600, h: 1085 } },
  { caption: "Campfire", image: { src: "/images/campfire-night.jpg", alt: "Guests around a campfire at night under strings of lights", w: 1600, h: 1043 } },
  { caption: "Garden path", image: { src: "/images/garden-path.jpg", alt: "A railed path winding down the hillside garden past a rock face", w: 1067, h: 1600 } },
  { caption: "Pool and slide by day", image: { src: "/images/pool-slide-day.jpg", alt: "The pool, the sky deck gateway and a children's slide on a cloudy afternoon", w: 2000, h: 1333 } },
  { caption: "Stairways at night", image: { src: "/images/stairs-night.jpg", alt: "Lit stairways through the garden at night", w: 1600, h: 1067 } },
  { caption: "Mural and swings", image: { src: "/images/mural-swing.jpg", alt: "A carved mural wall with a ship sculpture beside a nest swing and a bench swing", w: 1600, h: 1067 } },
  { caption: "The main building by day", image: { src: "/images/building-day.jpg", alt: "The terracotta main building with its rooftop terrace, outside stairway and glass-fronted ground floor", w: 2000, h: 1276 } },
  { caption: "Evening at the pool", image: { src: "/images/pool-sunset-tall.jpg", alt: "The pool reflecting an orange evening sky", w: 1085, h: 1600 } },
];

// Road distances from the resort's map pin; times allow for the hill road.
// Estimates: ask the resort to confirm.
export const routes = [
  { from: "Calicut International Airport (CCJ)", how: "By road, 40 km", time: "About 1 h 15 min" },
  { from: "Kozhikode city and railway station", how: "By road, 50 km", time: "About 1 h 45 min" },
  { from: "Coimbatore", how: "By road, 180 km", time: "About 4 h 30 min" },
];

export const enquiryOptions = ["A room", "Two or more rooms", "The dormitory", "Conference hall", "Not sure yet"];

// ---------- full-screen slideshows ----------

/** A photo in a full-screen slideshow */
export interface Slide {
  src: string;
  alt: string;
  caption: string;
  w?: number;
  h?: number;
}

/** A stay's photos in page order: the main one, the ones beside it, then room by room. */
function stayPhotos(stay: Stay): Slide[] {
  return [
    ...(stay.image ? [{ ...stay.image, caption: stay.name }] : []),
    ...stay.extras.map((x) => ({ src: x.src, alt: x.alt, caption: `${stay.name}: ${x.caption.toLowerCase()}` })),
    ...(stay.units ?? []).map((u) => ({ ...u.image, caption: `${u.name}. ${u.note}` })),
  ];
}

// Tap a photo and its whole group plays as slides.
export const photoGroups = {
  gallery: gallery.map((g) => ({ ...g.image, caption: g.caption })),
  rooms: stayPhotos(stays[0]),
  dormitory: stayPhotos(stays[1]),
  conference: [
    ...(conference.image ? [{ ...conference.image, caption: "The conference hall" }] : []),
    ...conference.extras.map((x) => ({ src: x.src, alt: x.alt, caption: `The hall: ${x.caption.toLowerCase()}` })),
  ],
} satisfies Record<string, Slide[]>;

export type PhotoGroup = keyof typeof photoGroups;
