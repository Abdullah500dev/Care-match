import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Twitter, Linkedin, Github } from "lucide-react";

export default function Footer() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentYear = new Date().getFullYear();

  const sections = [
    {
      title: "Category 1",
      links: [
        { label: "Section 1", scrollTo: "section-1" },
        { label: "Page 1", path: "/page_1" },
        { label: "Page 2", path: "/page_2" },
      ],
    },
    {
      title: "Category 2",
      links: [
        { label: "Page 3", path: "/page_3" },
        { label: "Page 4", path: "/page_4" },
        { label: "Page 5", path: "/page_5" },
      ],
    },
    {
      title: "Category 3",
      links: [
        { label: "Page 6", path: "/page_6" },
        { label: "Page 7", path: "/page_7" },
        { label: "Page 8", path: "/page_8" },
      ],
    },
  ];

  const handleScrollLink = (e, sectionId) => {
    e.preventDefault();

    if (location.pathname === "/") {
      const el = document.getElementById(sectionId);
      if (el) {
        const yOffset = -80;
        const y = el.getBoundingClientRect().top + window.scrollY + yOffset;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    } else {
      navigate("/", { state: { scrollTo: sectionId } });
    }
  };

  return (
    <footer className="bg-white border-t">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          {/* Logo and Description */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center space-x-2">
              <img src="/assets/images/logo.png" alt="logo" width="150" />
            </Link>
            <p className="mt-4 text-gray-600 max-w-sm">
              Lorem Ipsum is simply dummy text of the printing and typesetting
              industry.
            </p>
            <div className="flex space-x-4 mt-6">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-500"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-500"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-500"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Navigation Sections */}
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="font-semibold text-gray-900 mb-4">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    {link.scrollTo ? (
                      <a
                        href={`/#${link.scrollTo}`}
                        onClick={(e) => handleScrollLink(e, link.scrollTo)}
                        className="text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        to={link.path}
                        className="text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm">
              © {currentYear} {import.meta.env.VITE_REACT_APP_PROJECT_NAME} All
              rights reserved. Powered by{" "}
              <a
                href="https://www.linkedin.com/in/muhammad-moaz-ahmed"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700"
              >
                Muhammad Moaz Ahmed
              </a>
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link
                to="/privacy"
                className="text-gray-500 hover:text-gray-900 text-sm"
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms"
                className="text-gray-500 hover:text-gray-900 text-sm"
              >
                Terms of Service
              </Link>
              <Link
                to="/security"
                className="text-gray-500 hover:text-gray-900 text-sm"
              >
                Security
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
