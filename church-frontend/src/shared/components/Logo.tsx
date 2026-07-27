import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

export default function Logo({ className = "", size = 120, style }: LogoProps) {
  return (
    <div
      className={`logo-container ${className}`}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        position: "relative",
        userSelect: "none",
        ...style,
      }}
    >
      <svg
        viewBox="0 0 400 400"
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Main outer circle representing the faith shield. It has a custom gap for the 'H' calligraphic glyph. */}
        {/* Circle Radius = 150, center = 200, 200 */}
        <path
          d="M 110 270 A 150 150 0 1 1 110 130"
          fill="none"
          stroke="var(--primary, #003b73)"
          strokeWidth="12"
          strokeLinecap="round"
        />

        {/* Small bottom-left arc section representing the lower gap of 'H' */}
        <path
          d="M 125 315 A 150 150 0 0 1 115 300"
          fill="none"
          stroke="var(--primary, #003b73)"
          strokeWidth="12"
          strokeLinecap="round"
        />

        {/* Calligraphic "Heritage" cursive script text */}
        <text
          x="200"
          y="215"
          fontFamily="'Great Vibes', 'Playball', 'Brush Script MT', cursive"
          fontSize="100"
          fill="var(--primary, #003b73)"
          textAnchor="middle"
          fontWeight="bold"
        >
          Heritage
        </text>

        {/* Bold clean sans-serif "OF FAITH" text */}
        <text
          x="200"
          y="275"
          fontFamily="'Inter', -apple-system, sans-serif"
          fontSize="32"
          fontWeight="800"
          fill="var(--primary, #003b73)"
          letterSpacing="3"
          textAnchor="middle"
        >
          OF FAITH
        </text>
      </svg>
    </div>
  );
}
