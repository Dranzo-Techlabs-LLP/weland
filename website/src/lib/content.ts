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
  phone: "+91 00000 00000", // PLACEHOLDER
  phoneHref: "tel:+910000000000", // PLACEHOLDER
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "910000000000", // PLACEHOLDER
  email: "hello@welandresort.com", // PLACEHOLDER
  address: ["We Land Resort", "Kakkadampoyil", "Kozhikode district, Kerala"],
  // PLACEHOLDER — swap for the resort's own Google Maps share link once you have it.
  mapsHref: "https://www.google.com/maps/search/?api=1&query=Kakkadampoyil",
  mapEmbed: "https://maps.google.com/maps?q=Kakkadampoyil,Kozhikode,Kerala&z=13&output=embed",
  checkIn: "2:00 pm",
  checkOut: "11:00 am",
};

export const images = {
  hero: { src: "/images/hero-sunset-deck.jpg", alt: "The We Land Resort sky deck and infinity pool at sunset, mountains fading into mist behind" },
  aerial: { src: "/images/aerial-resort.jpg", alt: "Aerial view of the resort on its ridge, the pool and terraces surrounded by forest" },
  building: { src: "/images/building-day.jpg", alt: "The terracotta main building with its rooftop terrace and glass-fronted ground floor" },
  dining: { src: "/images/deck-dinner-sunset.jpg", alt: "A table set at the end of the sky deck at sunset, hills in every direction" },
};

export const nav = [
  { label: "Stays", href: "#stays" },
  { label: "Conference hall", href: "#conference" },
  { label: "A day here", href: "#day" },
  { label: "Dining", href: "#dining" },
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
      "Six rooms across two floors of the main building, with the rooftop above and the pool and sky deck a few steps away. Every room has a wide sliding window onto a turf terrace with chairs, wood-panelled walls, an electric kettle, a wardrobe and an attached bathroom with a glass shower and hot water. Room A1 has two beds for a family; A6 is the largest, with a sitting area.",
    count: "6 rooms",
    sleeps: "2 adults and 1 child; room A1 sleeps 4",
    bathroom: "Attached, glass shower, hot water",
    view: "Valley and mountains from the terrace",
    fromPrice: "₹4,500",
    priceUnit: "per night, from",
    image: { src: "/images/room-view.jpg", alt: "A room with the bed facing wide windows onto the misty valley" },
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
      { id: "A5", name: "Room A5", note: "A double at the end of the row, where the balcony looks straight down the valley at dusk.", image: { src: "/images/room-a5.jpg", alt: "Room A5 with a double bed and a chair by the window" } },
      { id: "A6", name: "Room A6", note: "The largest room: a double with a sitting area, two chairs and a desk under pendant lights.", image: { src: "/images/room-a6.jpg", alt: "Room A6 with a double bed, a desk and two chairs" } },
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
    sleeps: "Up to 10 in bunk beds", // PLACEHOLDER — confirm the bed count
    bathroom: "Shared washrooms, hot water",
    view: "Forest and valley from the deck",
    fromPrice: "₹1,200",
    priceUnit: "per bed per night, from",
    image: { src: "/images/dorm-bunks.jpg", alt: "The dormitory with rows of wooden bunk beds and black steel ladders" },
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

export const day = [
  { time: "6:30 am", title: "Mist on the sky deck", text: "Walk out along the deck while the valley is still under cloud. It hangs over the edge of the ridge; the mist usually lifts by half past seven." },
  { time: "8:00 am", title: "Breakfast", text: "Puttu, appam, dosa and filter coffee on the terrace, looking down the valley." },
  { time: "10:30 am", title: "Pool", text: "The infinity pool faces the mountains and is quietest in the morning. The play area beside it keeps children busy." },
  { time: "1:00 pm", title: "Lunch", text: "A Kerala meal on banana leaf, or something lighter if you ask in the morning." },
  { time: "3:30 pm", title: "Waterfalls", text: "Kozhippara Falls is a few minutes down the hill and Thusharagiri about an hour away. We can arrange a jeep and a guide." },
  { time: "6:00 pm", title: "Sunset", text: "The best seat is the end of the sky deck. The sun drops behind the far ridges and the mist comes back in." },
  { time: "8:00 pm", title: "Dinner", text: "On the terrace when it is clear, in the dining hall when it rains." },
  { time: "9:00 pm", title: "Campfire", text: "Firewood, fairy lights, and music if you want it. The lights along the stairways stay on until midnight." },
];

export const dining = {
  title: "Cooked here, from close by.",
  text: "The kitchen cooks Kerala food from what the Thiruvambady market has that week: meals on banana leaf at lunch, grills on the terrace at night, and a breakfast that changes daily. Tell us about allergies and preferences when you book and the kitchen will plan around them.",
  notes: ["Vegetarian and vegan menus daily", "Children's portions", "Private dinner at the end of the sky deck, on request"],
};

export interface GalleryItem {
  caption: string;
  image: { src: string; alt: string } | null;
  wide?: boolean;
  tall?: boolean;
}

// Laid out on a 4-column grid; wide = 2 columns, tall = 2 rows.
export const gallery: GalleryItem[] = [
  { caption: "The pool at sunset", image: { src: "/images/pool-sunset.jpg", alt: "The infinity pool at sunset with the sun setting behind the mountains" }, wide: true },
  { caption: "The sky deck in mist", image: { src: "/images/sky-deck-mist.jpg", alt: "The red-roofed sky deck gateway leading out into the mist" }, tall: true },
  { caption: "Play area", image: { src: "/images/play-area.jpg", alt: "Swings and a slide on the paved terrace with hills behind" } },
  { caption: "Campfire", image: { src: "/images/campfire-night.jpg", alt: "Guests around a campfire at night under strings of lights" } },
  { caption: "Pool and slide by day", image: { src: "/images/pool-slide-day.jpg", alt: "The pool, the sky deck gateway and a children's slide on a cloudy afternoon" }, wide: true },
  { caption: "Garden path", image: { src: "/images/garden-path.jpg", alt: "A railed path winding down the hillside garden past a rock face" }, tall: true },
  { caption: "The building at dusk", image: { src: "/images/building-dusk.jpg", alt: "The main building lit up at dusk with string lights along the terrace" } },
  { caption: "Stairways at night", image: { src: "/images/stairs-night.jpg", alt: "Lit stairways through the garden at night" } },
  { caption: "Mural and swings", image: { src: "/images/mural-swing.jpg", alt: "A carved mural wall with a ship sculpture beside a nest swing and a bench swing" } },
  { caption: "Mist over the forest", image: { src: "/images/aerial-mist.jpg", alt: "Aerial view of cloud rolling over the forested hills around the resort" } },
  { caption: "Evening at the pool", image: { src: "/images/pool-sunset-tall.jpg", alt: "The pool reflecting an orange evening sky" }, tall: true },
];

// Travel times as published for Kakkadampoyil by road.
export const routes = [
  { from: "Calicut International Airport (CCJ)", how: "By road", time: "About 1 h" },
  { from: "Kozhikode city and railway station", how: "By road", time: "About 45 min" },
  { from: "Coimbatore", how: "By road", time: "About 2 h 30 min" },
];

export const enquiryOptions = ["A room", "Two or more rooms", "The dormitory", "Conference hall", "Not sure yet"];
