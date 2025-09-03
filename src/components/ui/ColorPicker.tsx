"use client";
import { ChromePicker } from "react-color";

interface Props {
  color: string;
  onChange: (color: string) => void;
}

export default function ColorPicker({ color, onChange }: Props) {
  return (
    <div>
      <ChromePicker
        color={color}
        onChange={(updatedColor) => onChange(updatedColor.hex)}
        disableAlpha
      />
    </div>
  );
}