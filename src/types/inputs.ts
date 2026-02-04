/**
 * Text input field for free-form text responses.
 */
export interface TextInput {
  type: "text";
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  maxLength?: number;
}

/**
 * Confirmation input for boolean yes/no responses.
 */
export interface ConfirmInput {
  type: "confirm";
  name: string;
  label?: string;
  defaultValue?: boolean;
}

/**
 * Option for select inputs.
 */
export interface SelectOption {
  value: string;
  label: string;
  /** Help text describing this option */
  description?: string;
}

/**
 * Select input for choosing from predefined options.
 */
export interface SelectInput {
  type: "select";
  name: string;
  label?: string;
  options: readonly string[] | readonly SelectOption[];
  required?: boolean;
  multiple?: boolean;
}

/**
 * Union of all input types.
 */
export type Input = TextInput | ConfirmInput | SelectInput;

/**
 * Maps an input type to its corresponding response type.
 */
type ResponseTypeFromInput<T extends Input> = T extends ConfirmInput
  ? boolean
  : T extends SelectInput
    ? T["multiple"] extends true
      ? string[]
      : string
    : T extends TextInput
      ? string
      : never;

/**
 * Infers the response object type from an array of inputs.
 *
 * @example
 * ```typescript
 * const inputs = [
 *   { type: "text", name: "filename" },
 *   { type: "confirm", name: "overwrite" },
 *   { type: "select", name: "format", options: ["json", "yaml"] },
 * ] as const;
 *
 * type Response = ResponseFromInputs<typeof inputs>;
 * // { filename: string; overwrite: boolean; format: string }
 * ```
 */
export type ResponseFromInputs<T extends readonly Input[]> = {
  [K in T[number] as K["name"]]: ResponseTypeFromInput<K>;
};
