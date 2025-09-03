import React, { useState } from 'react';

interface SliderProps {
  name: string;
  defaultValue?: number[];
  min?: number;
  max?: number;
  step?: number;
  onValueChange?: (value: number[]) => void;
  className?: string;
}

export const Slider: React.FC<SliderProps> = ({
  name,
  defaultValue = [0],
  min = 0,
  max = 100,
  step = 1, // تغيير الخطوة الافتراضية إلى 20
  onValueChange,
  className
}) => {
  const [value, setValue] = useState<number[]>(defaultValue);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = [Math.round(parseInt(e.target.value) / step) * step]; // ضمان القيم مضاعفات 20
    setValue(newValue);
    if (onValueChange) {
      onValueChange(newValue);
    }
  };

  return (
    <div className={`relative w-full ${className}`}>
      <input
        type="range"
        name={name}
        min={min}
        max={max}
        step={step}
        value={value[0]}
        onChange={handleChange}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
        style={{
          background: `linear-gradient(to right, #3b82f6 ${value[0]}%, #e5e7eb ${value[0]}%)`
        }}
      />
      {/* <span className="absolute -top-6 left-0 text-sm font-medium text-gray-600">
        {value[0]}%
      </span> */}
    </div>
  );
};