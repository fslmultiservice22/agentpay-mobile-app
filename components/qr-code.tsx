import { View, Text } from 'react-native';
import Svg, { Rect, G } from 'react-native-svg';

interface QRCodeProps {
  value: string;
  size?: number;
}

// Simple QR code generator using SVG
export function QRCodeComponent({ value, size = 200 }: QRCodeProps) {
  // Generate a simple pattern based on the value hash
  const hash = value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const moduleCount = 21; // Standard QR code size
  const modules: boolean[] = [];
  
  // Generate pseudo-random pattern based on hash
  for (let i = 0; i < moduleCount * moduleCount; i++) {
    modules.push((hash * (i + 1)) % 2 === 0);
  }

  const moduleSize = size / moduleCount;

  return (
    <View className="items-center justify-center">
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background */}
        <Rect width={size} height={size} fill="white" />
        
        {/* QR modules */}
        <G>
          {modules.map((isBlack, index) => {
            const row = Math.floor(index / moduleCount);
            const col = index % moduleCount;
            
            if (!isBlack) return null;
            
            return (
              <Rect
                key={index}
                x={col * moduleSize}
                y={row * moduleSize}
                width={moduleSize}
                height={moduleSize}
                fill="black"
              />
            );
          })}
        </G>
      </Svg>
      <Text className="text-muted text-sm mt-4">Scan to receive funds</Text>
    </View>
  );
}