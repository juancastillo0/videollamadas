import { useState, ChangeEvent } from "react";

type Types = {
  onInput?: (newValue: string) => string | void;
  type?: string;
};

export default ({ onInput, type }: Types={}) => {
  const [value, setValue] = useState("");

  function onChange(event: ChangeEvent) {
    const target = event.target as HTMLInputElement;
    let newValue = target.value;
    if (onInput) {
      const changedValue = onInput(newValue);
      newValue = changedValue !== undefined ? changedValue : newValue;
    }

    setValue(newValue);
  }
  function reset() {
    setValue("");
  }
  return { value, input: { value, onChange, type: type || "text" }, reset };
};
