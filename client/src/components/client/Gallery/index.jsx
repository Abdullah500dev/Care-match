import React, { useState, useEffect, useRef } from "react";

const STAGGER_MS = 80;
const DURATION_MS = 550;

const statCards = [
  {
    bg: "bg-[#00CFF4]",
    tickIcon: "/assets/images/tick1.svg",
    value: "+15,000",
    title: "Partner Communities",
    description:
      "Lorem ipsum dolor sit amet consectetur adipiscing elit",
  },
  {
    bg: "bg-[#1D2837]",
    tickIcon: "/assets/images/tick2.svg",
    value: "98%",
    title: "Client Satisfaction",
    description:
      "Lorem ipsum dolor sit amet consectetur adipiscing elit",
  },
  {
    bg: "bg-[#1D2837]",
    tickIcon: "/assets/images/tick2.svg",
    value: "50+ Years",
    title: "Combined Experience",
    description:
      "Lorem ipsum dolor sit amet consectetur adipiscing elit",
  },
  {
    bg: "",
    backgroundStyle: "linear-gradient(138.09deg, #FAAD60 20.61%, #F2987D 76.35%)",
    tickIcon: "/assets/images/tick3.svg",
    value: null,
    title: "24/7 Service Availability",
    description:
      "Lorem ipsum dolor sit amet consectetur adipiscing elit",
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

function StatCard({ bg, backgroundStyle, tickIcon, value, title, description }) {
  return (
    <div
      className={`${bg || ""} flex flex-col rounded-xl shadow-md min-h-[150px] justify-between p-3 sm:min-h-[165px] sm:rounded-2xl sm:p-4 md:p-4 md:min-h-[180px] lg:min-h-0 lg:h-full lg:p-4 min-[1280px]:p-5 min-[1536px]:p-6`}
      style={backgroundStyle ? { background: backgroundStyle } : undefined}
    >
      <div className="flex items-start">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white sm:h-11 sm:w-11 md:h-12 md:w-12 lg:h-[52px] lg:w-[52px] min-[1280px]:h-14 min-[1280px]:w-14 min-[1536px]:h-16 min-[1536px]:w-16">
          <img src={tickIcon} alt="" className="h-5 w-5 object-contain sm:h-6 sm:w-6 md:h-6 md:w-6 lg:h-10 lg:w-10" />
        </span>
      </div>
      <div>
        {value && (
          <p className=" font-bold text-white text-sm sm:text-base md:text-lg min-[1280px]:text-2xl min-[1536px]:text-[28px]">
            {value}
          </p>
        )}
        <h3 className="mt-1 font-bold text-white text-sm sm:text-base md:text-lg min-[1280px]:text-2xl min-[1536px]:text-[28px]">{title}</h3>
        <p className="mt-1.5 text-sm font-normal text-white/90 sm:mt-2 sm:text-xs md:text-sm min-[1280px]:text-[16px] min-[1536px]:text-[18px] sm:mr-4">{description}</p>
      </div>
    </div>
  );
}

function ImageCard({ src, alt, className = "", aspectSquare = false, fillHeight = false }) {
  return (
    <div
      className={`overflow-hidden rounded-xl shadow-md sm:rounded-2xl ${aspectSquare ? "aspect-square min-h-[140px] sm:min-h-[160px] md:min-h-0" : ""} ${fillHeight ? "lg:aspect-auto lg:h-full lg:min-h-0" : ""} ${className}`}
    >
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover min-h-[160px] sm:min-h-[180px] md:min-h-[200px]"
      />
    </div>
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

  return (
    <section
      ref={sectionRef}
      className="bg-white py-8 sm:py-12 md:py-16 lg:py-20 min-[1280px]:py-24"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:max-w-6xl lg:px-8 min-[1280px]:max-w-[1400px] min-[1280px]:px-10 min-[1536px]:max-w-[1600px] min-[1536px]:px-12 min-[1920px]:max-w-[1800px] min-[1920px]:px-14">
        <div className="grid grid-cols-1 gap-2.5 sm:gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-[1.2fr_1.4fr_1.2fr_1.2fr] lg:grid-rows-[1fr_1fr] lg:gap-4 min-[1280px]:gap-5">
          {/* Left col: cyan (row 1) */}
          <div
            className={`lg:row-start-1 lg:col-start-1 lg:min-h-0 lg:h-full ${baseClass} ${visible ? visibleClass : hiddenClass}`}
            style={getStyle(0)}
          >
            <StatCard {...statCards[0]} />
          </div>
          {/* Left col: 98% (row 2) */}
          <div
            className={`lg:row-start-2 lg:col-start-1 lg:min-h-0 lg:h-full ${baseClass} ${visible ? visibleClass : hiddenClass}`}
            style={getStyle(1)}
          >
            <StatCard {...statCards[1]} />
          </div>
          {/* Column-full image */}
          <div
            className={`overflow-hidden rounded-xl shadow-md min-h-[180px] sm:min-h-[220px] sm:rounded-2xl md:col-span-2 md:min-h-[240px] lg:col-span-1 lg:row-span-2 lg:col-start-2 lg:row-start-1 lg:min-h-[360px] lg:h-full ${baseClass} ${visible ? visibleClass : hiddenClass}`}
            style={getStyle(2)}
          >
            <img
              src={imageCards[0].src}
              alt={imageCards[0].alt}
              className="h-full w-full object-cover min-h-full"
            />
          </div>
          {/* Right top: 50+ Years card */}
          <div
            className={`lg:row-start-1 lg:col-start-3 lg:min-h-0 lg:h-full ${baseClass} ${visible ? visibleClass : hiddenClass}`}
            style={getStyle(3)}
          >
            <StatCard {...statCards[2]} />
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
            <StatCard {...statCards[3]} />
          </div>
        </div>
      </div>
    </section>
  );
}
