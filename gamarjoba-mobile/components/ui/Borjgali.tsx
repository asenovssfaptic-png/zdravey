/* The borjgali brand mark — 7 spiral arms (M50 50 Q58 30 50 12 rotated
 * k·(360/7)°) + center disc, same geometry as the web <symbol> and the
 * generated app icon. Decorative by default. */

import React from "react";
import Svg, { Circle, G, Path } from "react-native-svg";

import { colors } from "../../constants/theme";

export interface BorjgaliProps {
  size?: number;
  color?: string;
}

const ARMS = 7;

export function Borjgali({ size = 32, color = colors.accent }: BorjgaliProps): React.ReactElement {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: ARMS }, (_, k) => (
        <G key={k} rotation={(k * 360) / ARMS} origin="50, 50">
          <Path
            d="M50 50 Q58 30 50 12"
            stroke={color}
            strokeWidth={6}
            strokeLinecap="round"
            fill="none"
          />
        </G>
      ))}
      <Circle cx={50} cy={50} r={7} fill={color} />
    </Svg>
  );
}

export default Borjgali;
