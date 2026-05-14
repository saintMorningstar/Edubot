import React from 'react';
import Svg, { Rect, Circle, Path, Ellipse } from 'react-native-svg';

interface Props {
  size?:         number;
  primaryColor?: string;
}

export default function RobotSVG({ size = 120, primaryColor = '#4ECDC4' }: Props) {
  return (
    <Svg width={size} height={size * 1.12} viewBox="0 0 120 134">
      {/* Antenna stem */}
      <Rect x="57" y="4" width="6" height="16" rx="3" fill={primaryColor} />
      {/* Antenna tip */}
      <Circle cx="60" cy="3.5" r="5.5" fill={primaryColor} />
      <Circle cx="60" cy="3.5" r="3"   fill="#fff" opacity="0.55" />


      {/* Eye sockets */}
      <Ellipse cx="39" cy="55" rx="15" ry="16" fill="#EEF6FF" />
      <Ellipse cx="81" cy="55" rx="15" ry="16" fill="#EEF6FF" />

      {/* Pupils */}
      <Circle cx="39" cy="56" r="8" fill="#1A2340" />
      <Circle cx="81" cy="56" r="8" fill="#1A2340" />

      {/* Eye shine */}
      <Circle cx="43" cy="51" r="3" fill="#FFFFFF" />
      <Circle cx="85" cy="51" r="3" fill="#FFFFFF" />
      <Circle cx="37" cy="60" r="1.5" fill="#FFFFFF" opacity="0.6" />
      <Circle cx="79" cy="60" r="1.5" fill="#FFFFFF" opacity="0.6" />

      {/* Smile */}
      <Path
        d="M 36 74 Q 60 86 84 74"
        stroke="#1A2340"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Cheeks */}
      <Ellipse cx="20" cy="68" rx="11" ry="6.5" fill="#FF6B6B" opacity="0.28" />
      <Ellipse cx="100" cy="68" rx="11" ry="6.5" fill="#FF6B6B" opacity="0.28" />

      {/* Neck */}
      <Rect x="47" y="100" width="26" height="13" rx="6.5" fill={primaryColor} opacity="0.55" />

      {/* Body */}
      <Rect x="20" y="113" width="80" height="19" rx="9.5" fill={primaryColor} opacity="0.80" />
      <Ellipse cx="60" cy="122.5" rx="20" ry="6" fill="#FFFFFF" opacity="0.32" />
    </Svg>
  );
}
