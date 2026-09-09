import React from 'react';

interface Props {
  className?: string;
  size?: number;
  withBackground?: boolean;
}

export const PuenteDeLaMujerIcon: React.FC<Props> = ({
  className = 'w-8 h-8',
  size = 36,
  withBackground = false,
}) => {
  const uniqueId = React.useId().replace(/:/g, '');
  const gradId = `puenteGrad_${uniqueId}`;
  const glowId = `puenteGlow_${uniqueId}`;
  const waterGradId = `waterGrad_${uniqueId}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Isotipo oficial Puente de la Mujer - Puerto App"
    >
      <defs>
        {/* Electric Blue to Sky Cyan Gradient */}
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0A84FF" />
          <stop offset="100%" stopColor="#5AC8FA" />
        </linearGradient>

        {/* Water reflection subtle gradient */}
        <linearGradient id={waterGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0A84FF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#0A84FF" stopOpacity="0.05" />
        </linearGradient>

        {/* Diffuse glow filter */}
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Deep black rounded background if enabled */}
      {withBackground && (
        <rect width="64" height="64" rx="16" fill="#000000" stroke="#1c1c1e" strokeWidth="1" />
      )}

      {/* Water reflection ripples (Puerto Madero dock) */}
      <ellipse cx="33" cy="53" rx="22" ry="2.5" fill={`url(#${waterGradId})`} />
      <path
        d="M14 55 Q32 53.5 50 55"
        stroke="#5AC8FA"
        strokeWidth="1"
        opacity="0.4"
        strokeDasharray="3 3"
      />
      <path
        d="M20 58 Q33 56.5 46 58"
        stroke="#0A84FF"
        strokeWidth="0.8"
        opacity="0.25"
        strokeDasharray="2 2"
      />

      {/* Curved White Pedestrian Footbridge (Pasarela peatonal blanca) */}
      <path
        d="M7 45 Q32 42.5 57 45"
        stroke="#FFFFFF"
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Steel stay cables (Tensores de acero) in Electric Blue -> Sky Cyan with Glow */}
      <g filter={`url(#${glowId})`} opacity="0.9">
        <line x1="39" y1="11" x2="24" y2="44" stroke={`url(#${gradId})`} strokeWidth="1.2" />
        <line x1="39" y1="11" x2="29" y2="44" stroke={`url(#${gradId})`} strokeWidth="1.2" />
        <line x1="39" y1="11" x2="35" y2="44" stroke={`url(#${gradId})`} strokeWidth="1.2" />
        <line x1="39" y1="11" x2="41" y2="44" stroke={`url(#${gradId})`} strokeWidth="1.2" />
        <line x1="39" y1="11" x2="47" y2="44" stroke={`url(#${gradId})`} strokeWidth="1.2" />
      </g>

      {/* Inclined Diagonal Mast (Mástil diagonal característico) */}
      <path
        d="M18 44 L39 11"
        stroke={`url(#${gradId})`}
        strokeWidth="3.8"
        strokeLinecap="round"
        filter={`url(#${glowId})`}
      />

      {/* Mast needle tip glow point */}
      <circle cx="39" cy="11" r="1.8" fill="#FFFFFF" filter={`url(#${glowId})`} />
    </svg>
  );
};
