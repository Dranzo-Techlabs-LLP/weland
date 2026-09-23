import Hero from "@/components/Hero";
import BookingStrip from "@/components/BookingStrip";
import About from "@/components/About";
import Stays from "@/components/Stays";
import Conference from "@/components/Conference";
import Day from "@/components/Day";
import Dining from "@/components/Dining";
import Gallery from "@/components/Gallery";
import Location from "@/components/Location";
import Enquire from "@/components/Enquire";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <main id="top">
        <Hero />
        <BookingStrip />
        <About />
        <Stays />
        <Conference />
        <Day />
        <Dining />
        <Gallery />
        <Location />
        <Enquire />
      </main>
      <Footer />
    </>
  );
}
