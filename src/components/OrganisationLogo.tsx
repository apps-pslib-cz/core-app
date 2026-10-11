import React from "react";
import Image from "next/image";
import ThemedContent from "./ThemedContent";

interface OrganisationLogoProps {
  width?: number;
  height?: number;
  className?: string;
  alt?: string;
}

const OrganisationLogo: React.FC<OrganisationLogoProps> = ({
  width = 110,
  height = 20,
  className,
  alt = "Průmyslová škola Liberec",
}) => (
  <ThemedContent
    light={
      <Image
        src="/images/logos/pslib-large-light.svg"
        alt={alt}
        width={width}
        height={height}
        className={className}
      />
    }
    dark={
      <Image
        src="/images/logos/pslib-large-dark.svg"
        alt={alt}
        width={width}
        height={height}
        className={className}
      />
    }
  />
);

export default OrganisationLogo;
