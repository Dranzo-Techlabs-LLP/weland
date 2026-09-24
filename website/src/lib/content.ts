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
  whatsappHref: `https://wa.me/919074424142?text=${encodeURIComponent("Hello! I'd like to ask about a stay at We Land Resort.")}`,
  email: "hello@welandresort.com", // PLACEHOLDER
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
  building: { src: "/images/building-day.jpg", alt: "The terracotta main building with its rooftop terrace and glass-fronted ground floor" },
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
  image: { src: string; alt: string } | null;
  /** The big tile at the start of the gallery, shown with its caption */
  feature?: boolean;
  /** Which part of the photo to keep when the tile crops it (CSS object-position) */
  focus?: string;
}

// The first photo is featured. All the others share one tile size, so every
// row comes out full on any screen: twelve tiles fill 4, 3 or 2 columns.
export const gallery: GalleryItem[] = [
  { caption: "We Land at dusk, above the mist", image: { src: "/images/resort-dusk-mist.jpg", alt: "Aerial view of We Land Resort at dusk: the lit main building, the pool and the garden paths on the forested hilltop, with mist lying over the hills behind" }, feature: true, focus: "55% 62%" },
  { caption: "The pool at sunset", image: { src: "/images/pool-sunset.jpg", alt: "The infinity pool at sunset with the sun setting behind the mountains" } },
  { caption: "The sky deck in mist", image: { src: "/images/sky-deck-mist.jpg", alt: "The red-roofed sky deck gateway leading out into the mist" }, focus: "50% 35%" },
  { caption: "Dinner on the sky deck", image: { src: "/images/deck-dinner-sunset.jpg", alt: "A table set at the end of the sky deck at sunset, hills in every direction" } },
  { caption: "The building at dusk", image: { src: "/images/building-dusk.jpg", alt: "The main building lit up at dusk with string lights along the terrace" } },
  { caption: "Play area", image: { src: "/images/play-area.jpg", alt: "Swings and a slide on the paved terrace with hills behind" } },
  { caption: "Campfire", image: { src: "/images/campfire-night.jpg", alt: "Guests around a campfire at night under strings of lights" } },
  { caption: "Pool and slide by day", image: { src: "/images/pool-slide-day.jpg", alt: "The pool, the sky deck gateway and a children's slide on a cloudy afternoon" } },
  { caption: "Garden path", image: { src: "/images/garden-path.jpg", alt: "A railed path winding down the hillside garden past a rock face" } },
  { caption: "Stairways at night", image: { src: "/images/stairs-night.jpg", alt: "Lit stairways through the garden at night" } },
  { caption: "Mural and swings", image: { src: "/images/mural-swing.jpg", alt: "A carved mural wall with a ship sculpture beside a nest swing and a bench swing" } },
  { caption: "Mist over the forest", image: { src: "/images/aerial-mist.jpg", alt: "Aerial view of cloud rolling over the forested hills around the resort" } },
  { caption: "Evening at the pool", image: { src: "/images/pool-sunset-tall.jpg", alt: "The pool reflecting an orange evening sky" } },
];

// Travel times as published for Kakkadampoyil by road.
export const routes = [
  { from: "Calicut International Airport (CCJ)", how: "By road", time: "About 1 h" },
  { from: "Kozhikode city and railway station", how: "By road", time: "About 45 min" },
  { from: "Coimbatore", how: "By road", time: "About 2 h 30 min" },
];

export const enquiryOptions = ["A room", "Two or more rooms", "The dormitory", "Conference hall", "Not sure yet"];
