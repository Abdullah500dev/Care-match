import React, { useState, useEffect, useRef } from "react";
import { TiltCard } from "@/components/ui/tilt-card";

const STAGGER_MS = 80;
const DURATION_MS = 550;

const statCards = [
  {
    bg: "bg-[#00CFF4]",
    value: "+15,000",
    title: "Partner Communities",
    description:
      "Access verified assisted living, memory care, and skilled nursing communities across the nation for your loved one.",
    imageSrc: "/assets/images/search_img.svg",
    imageAlt: "Search for care",
  },
  {
    bg: "bg-[#1D2837]",
    value: "98%",
    title: "Client Satisfaction",
    description:
      "Families trust CareMatch to find the right fit. Our personalized matching leads to better outcomes and peace of mind.",
    imageSrc: "/assets/images/oldMan.svg",
    imageAlt: "Young people",
  },
  {
    bg: "bg-[#1D2837]",
    value: "50+ Years",
    title: "Combined Experience",
    description:
      "Our advisors bring decades of senior care expertise to guide you through options, costs, and community fit.",
    imageSrc: "/assets/images/greetingPeople.svg",
    imageAlt: "Greeting people",
  },
  {
    bg: "",
    backgroundStyle: "linear-gradient(138.09deg, #FAAD60 20.61%, #F2987D 76.35%)",
    value: null,
    title: "24/7 Service Availability",
    description:
      "Get answers and support anytime. We're here around the clock when you're researching care or need to talk.",
    imageSrc: "/assets/images/wheelChair.svg",
    imageAlt: "Search for care",
  },
];

const imageCards = [
  {
    src: "/assets/images/galery1.svg",
    alt: "Healthcare professional with smartphone",
  },
  {
    src: "/assets/images/galery2.svg",
    alt: "Medical team in operating room",
  },
];

const AUTO_FLIP_MS = 5000;
const MAX_INITIAL_DELAY_MS = 5000;

/** Random delay 0–MAX_INITIAL_DELAY_MS so cards flip at staggered times */
function getRandomInitialDelayMs() {
  return Math.random() * MAX_INITIAL_DELAY_MS;
}

/** Flip card: image on front, text on back; 180deg Y flip on hover or after random delay then every 5s */
function FlipStatCard({ bg, backgroundStyle, value, title, description, imageSrc, imageAlt }) {
  const [initialDelayMs] = useState(getRandomInitialDelayMs);
  const [timerFlipped, setTimerFlipped] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    let intervalId = null;
    const timeoutId = setTimeout(() => {
      setTimerFlipped(true);
      intervalId = setInterval(() => setTimerFlipped((prev) => !prev), AUTO_FLIP_MS);
    }, initialDelayMs);
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [initialDelayMs]);

  const showBack = isHovered || timerFlipped;

  return (
    <div
      className="h-full min-h-[150px] sm:min-h-[165px] md:min-h-[180px] lg:min-h-0 cursor-pointer"
      style={{ perspective: "1000px" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
    <div
  className="relative h-full w-full transition-transform"
  style={{
    transformStyle: "preserve-3d",
    transform: showBack ? "rotateY(180deg)" : "rotateY(0deg)",
    transition: "transform 2s cubic-bezier(0.77, 0, 0.175, 1)", // slow & smooth
  }}
>
        {/* Front: image */}
        <div
          className="absolute inset-0 overflow-hidden rounded-xl shadow-md sm:rounded-2xl [backface-visibility:hidden]"
          style={{ transform: "rotateY(0deg)" }}
        >
          <img
            src={imageSrc}
            alt={imageAlt}
            className="h-full w-full object-cover"
          />
        </div>
        {/* Back: text content */}
        <div
          className={`absolute inset-0 flex flex-col justify-between rounded-xl shadow-md p-3 sm:rounded-2xl sm:p-4 md:p-4 lg:p-4 min-[1280px]:p-5 min-[1536px]:p-6 [backface-visibility:hidden] ${bg || ""}`}
          style={{
            transform: "rotateY(180deg)",
            ...(backgroundStyle ? { background: backgroundStyle } : {}),
          }}
        >
          <div className="flex-1 min-w-0">
            {value && (
              <p className="font-bold text-white text-sm sm:text-base md:text-lg min-[1280px]:text-2xl min-[1536px]:text-[28px]">
                {value}
              </p>
            )}
            <h3 className="mt-1 font-bold text-white text-sm sm:text-base md:text-lg min-[1280px]:text-2xl min-[1536px]:text-[28px]">{title}</h3>
            <p className="mt-1.5 text-sm font-normal text-white/90 sm:mt-2 sm:text-xs md:text-sm min-[1280px]:text-[16px] min-[1536px]:text-[18px] sm:mr-4">{description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageCard({ src, alt, className = "", aspectSquare = false, fillHeight = false }) {
  return (
    <TiltCard className={`h-full ${aspectSquare ? "aspect-square min-h-[140px] sm:min-h-[160px] md:min-h-0" : ""} ${fillHeight ? "lg:aspect-auto lg:h-full lg:min-h-0" : ""} ${className}`} innerClassName="overflow-hidden rounded-xl shadow-md sm:rounded-2xl h-full w-full">
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover min-h-[160px] sm:min-h-[180px] md:min-h-[200px]"
      />
    </TiltCard>
  );
}

export default function Gallery() {
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const baseClass = "transition-all ease-out";
  const hiddenClass = "opacity-0 translate-y-6";
  const visibleClass = "opacity-100 translate-y-0";

  const getStyle = (index) => ({
    transitionDuration: `${DURATION_MS}ms`,
    transitionDelay: visible ? `${index * STAGGER_MS}ms` : "0ms",
  });

  const renderGalleryItem = (itemIndex) => {
    const mobileCardHeight = "h-[35vh]";

    if (itemIndex === 0) return <div className={mobileCardHeight}><FlipStatCard {...statCards[0]} /></div>;
    if (itemIndex === 1) return <div className={mobileCardHeight}><FlipStatCard {...statCards[1]} /></div>;
    if (itemIndex === 2) {
      return (
        <div className={`${mobileCardHeight} overflow-hidden rounded-xl shadow-md sm:rounded-2xl`}>
          <TiltCard className="h-full" innerClassName="overflow-hidden rounded-xl h-full w-full">
            <img
              src={imageCards[0].src}
              alt={imageCards[0].alt}
              className="h-full w-full object-cover"
              style={{ objectPosition: "10% 40%" }}
            />
          </TiltCard>
        </div>
      );
    }
    if (itemIndex === 3) return <div className={mobileCardHeight}><FlipStatCard {...statCards[2]} /></div>;
    if (itemIndex === 4) {
      return (
        <div className={`${mobileCardHeight} overflow-hidden rounded-xl shadow-md sm:rounded-2xl`}>
          <TiltCard className="h-full" innerClassName="overflow-hidden rounded-xl h-full w-full">
            <img
              src={imageCards[1].src}
              alt={imageCards[1].alt}
              className="h-full w-full object-cover"
            />
          </TiltCard>
        </div>
      );
    }
    return <div className={mobileCardHeight}><FlipStatCard {...statCards[3]} /></div>;
  };

  return (
    <section
      id="gallery-cards-section"
      ref={sectionRef}
      className="bg-white py-8 sm:py-12 md:py-16 lg:py-20 min-[1280px]:py-24"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:max-w-6xl lg:px-8 min-[1280px]:max-w-[1400px] min-[1280px]:px-10 min-[1536px]:max-w-[1600px] min-[1536px]:px-12 min-[1920px]:max-w-[1800px] min-[1920px]:px-14">
        <div className="lg:hidden">
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className={`w-full shrink-0 snap-start space-y-2.5 sm:space-y-3 md:space-y-4 ${baseClass} ${visible ? visibleClass : hiddenClass}`} style={getStyle(0)}>
              {renderGalleryItem(0)}
              {renderGalleryItem(1)}
              {renderGalleryItem(2)}
            </div>
            <div className={`w-full shrink-0 snap-start space-y-2.5 sm:space-y-3 md:space-y-4 ${baseClass} ${visible ? visibleClass : hiddenClass}`} style={getStyle(3)}>
              {renderGalleryItem(3)}
              {renderGalleryItem(4)}
              {renderGalleryItem(5)}
            </div>
          </div>
        </div>

        <div className="hidden lg:grid grid-cols-1 gap-2.5 sm:gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-[1.2fr_1.4fr_1.2fr_1.2fr] lg:grid-rows-[1fr_1fr] lg:gap-4 min-[1280px]:gap-5">
          {/* Left col: cyan (row 1) */}
          <div
            className={`lg:row-start-1 lg:col-start-1 lg:min-h-0 lg:h-full ${baseClass} ${visible ? visibleClass : hiddenClass}`}
            style={getStyle(0)}
          >
            <FlipStatCard {...statCards[0]} />
          </div>
          {/* Left col: 98% (row 2) */}
          <div
            className={`lg:row-start-2 lg:col-start-1 lg:min-h-0 lg:h-full ${baseClass} ${visible ? visibleClass : hiddenClass}`}
            style={getStyle(1)}
          >
            <FlipStatCard {...statCards[1]} />
          </div>
          {/* Column-full image */}
          <div
            className={`overflow-hidden rounded-xl shadow-md min-h-[180px] sm:min-h-[220px] sm:rounded-2xl md:col-span-2 md:min-h-[240px] lg:col-span-1 lg:row-span-2 lg:col-start-2 lg:row-start-1 lg:min-h-[360px] lg:h-full ${baseClass} ${visible ? visibleClass : hiddenClass}`}
            style={getStyle(2)}
          >
            <TiltCard className="h-full" innerClassName="overflow-hidden rounded-xl h-full w-full">
              <img
                src={imageCards[0].src}
                alt={imageCards[0].alt}
                className="h-full w-full object-cover min-h-full"
              />
            </TiltCard>
          </div>
          {/* Right top: 50+ Years card */}
          <div
            className={`lg:row-start-1 lg:col-start-3 lg:min-h-0 lg:h-full ${baseClass} ${visible ? visibleClass : hiddenClass}`}
            style={getStyle(3)}
          >
            <FlipStatCard {...statCards[2]} />
          </div>
          {/* Right top: square image */}
          <div
            className={`lg:row-start-1 lg:col-start-4 lg:min-h-0 lg:h-full ${baseClass} ${visible ? visibleClass : hiddenClass}`}
            style={getStyle(4)}
          >
            <ImageCard {...imageCards[1]} aspectSquare fillHeight />
          </div>
          {/* Row-full: orange card */}
          <div
            className={`md:col-span-2 lg:row-start-2 lg:col-span-2 lg:col-start-3 lg:min-h-0 lg:h-full ${baseClass} ${visible ? visibleClass : hiddenClass}`}
            style={getStyle(5)}
          >
            <FlipStatCard {...statCards[3]} />
          </div>
        </div>
      </div>
    </section>
  );
}
