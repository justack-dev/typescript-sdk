import { expectTypeOf, describe, it } from "vitest";
import type {
  ResponseFromInputs,
  TextInput,
  ConfirmInput,
  SelectInput,
  Input,
} from "../../src/types/inputs";

describe("ResponseFromInputs type inference", () => {
  it("infers string for text inputs", () => {
    const inputs = [{ type: "text", name: "filename" }] as const;

    type Result = ResponseFromInputs<typeof inputs>;

    expectTypeOf<Result>().toEqualTypeOf<{ filename: string }>();
  });

  it("infers boolean for confirm inputs", () => {
    const inputs = [{ type: "confirm", name: "proceed" }] as const;

    type Result = ResponseFromInputs<typeof inputs>;

    expectTypeOf<Result>().toEqualTypeOf<{ proceed: boolean }>();
  });

  it("infers string for select inputs", () => {
    const inputs = [
      { type: "select", name: "format", options: ["json", "yaml"] },
    ] as const;

    type Result = ResponseFromInputs<typeof inputs>;

    expectTypeOf<Result>().toEqualTypeOf<{ format: string }>();
  });

  it("infers combined types for multiple inputs", () => {
    const inputs = [
      { type: "text", name: "filename" },
      { type: "confirm", name: "overwrite" },
      { type: "select", name: "format", options: ["json", "yaml"] },
    ] as const;

    type Result = ResponseFromInputs<typeof inputs>;

    expectTypeOf<Result>().toEqualTypeOf<{
      filename: string;
      overwrite: boolean;
      format: string;
    }>();
  });

  it("handles text input with all options", () => {
    const inputs = [
      {
        type: "text",
        name: "message",
        label: "Message",
        placeholder: "Enter message",
        required: true,
        multiline: true,
        maxLength: 1000,
      },
    ] as const;

    type Result = ResponseFromInputs<typeof inputs>;

    expectTypeOf<Result>().toEqualTypeOf<{ message: string }>();
  });

  it("handles confirm input with default value", () => {
    const inputs = [
      {
        type: "confirm",
        name: "notify",
        label: "Send notification",
        defaultValue: true,
      },
    ] as const;

    type Result = ResponseFromInputs<typeof inputs>;

    expectTypeOf<Result>().toEqualTypeOf<{ notify: boolean }>();
  });

  it("handles select input with object options", () => {
    const inputs = [
      {
        type: "select",
        name: "priority",
        label: "Priority",
        options: [
          { value: "low", label: "Low" },
          { value: "high", label: "High" },
        ],
        required: true,
      },
    ] as const;

    type Result = ResponseFromInputs<typeof inputs>;

    expectTypeOf<Result>().toEqualTypeOf<{ priority: string }>();
  });

  it("validates Input union type", () => {
    expectTypeOf<TextInput>().toMatchTypeOf<Input>();
    expectTypeOf<ConfirmInput>().toMatchTypeOf<Input>();
    expectTypeOf<SelectInput>().toMatchTypeOf<Input>();
  });
});
