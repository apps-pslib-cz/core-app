import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import ThemedContent from "./ThemedContent";

interface AppLogoProps {
  width?: number;
  height?: number;
  className?: string;
  alt?: string;
  clickable?: boolean; // New prop to control clickability
}

// Logo appky - placeholder převzatý z projects-v1-app, vyměňte za logo
// konkrétní appky postavené na téhle šabloně (public/images/logos/app2-*.svg).
const AppLogo: React.FC<AppLogoProps> = ({
  width = 235,
  height = 55,
  className,
  alt = "core-app",
  clickable = true, // Default to clickable
}) => {
  const params = useParams();
  const currentLang = (params?.lang as string) || "cs"; // Default to 'cs' if no lang
  const homeUrl = `/${currentLang}`;

  const logoContent = (
    <ThemedContent
      light={
        <Image
          src="/images/logos/app2-light.svg"
          alt={alt}
          width={width}
          height={height}
          className={className}
          style={{
            cursor: clickable ? "pointer" : "default",
            transition: "opacity 0.2s ease-in-out",
          }}
        />
      }
      dark={
        <Image
          src="/images/logos/app2-dark.svg"
          alt={alt}
          width={width}
          height={height}
          className={className}
          style={{
            cursor: clickable ? "pointer" : "default",
            transition: "opacity 0.2s ease-in-out",
          }}
        />
      }
    />
  );

  // If clickable, wrap in Link, otherwise return content directly
  if (clickable) {
    return (
      <Link
        href={homeUrl}
        style={{
          textDecoration: "none",
          display: "inline-block",
          lineHeight: 0, // Prevents extra spacing around images
          transition: "opacity 0.2s ease-in-out",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "0.8";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "1";
        }}
        aria-label={`Přejít na hlavní stránku (${alt})`}
      >
        {logoContent}
      </Link>
    );
  }

  return logoContent;
};

export default AppLogo;
