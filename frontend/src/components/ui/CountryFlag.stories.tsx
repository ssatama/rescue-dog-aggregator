import type { Meta, StoryObj } from "@storybook/nextjs";
import CountryFlag from "./CountryFlag";

const meta: Meta<typeof CountryFlag> = {
  title: "UI/CountryFlag",
  component: CountryFlag,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    country: {
      control: { type: "select" },
      options: ["BA", "TR", "DE", "GB", "AT", "CH", "FR", "NL", "BE", "DK"],
    },
    size: {
      control: { type: "select" },
      options: ["sm", "md", "lg"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Bosnia: Story = {
  args: {
    country: "BA",
    size: "md",
  },
};

export const Turkey: Story = {
  args: {
    country: "TR",
    size: "md",
  },
};

export const Germany: Story = {
  args: {
    country: "DE",
    size: "md",
  },
};

export const UnitedKingdom: Story = {
  args: {
    country: "GB",
    size: "md",
  },
};

export const Small: Story = {
  args: {
    country: "BA",
    size: "sm",
  },
};

export const Large: Story = {
  args: {
    country: "TR",
    size: "lg",
  },
};

export const AllCountries: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4 items-center">
      <div className="flex items-center gap-2">
        <CountryFlag country="BA" size="md" />
        <span>Bosnia</span>
      </div>
      <div className="flex items-center gap-2">
        <CountryFlag country="TR" size="md" />
        <span>Turkey</span>
      </div>
      <div className="flex items-center gap-2">
        <CountryFlag country="DE" size="md" />
        <span>Germany</span>
      </div>
      <div className="flex items-center gap-2">
        <CountryFlag country="GB" size="md" />
        <span>UK</span>
      </div>
      <div className="flex items-center gap-2">
        <CountryFlag country="AT" size="md" />
        <span>Austria</span>
      </div>
      <div className="flex items-center gap-2">
        <CountryFlag country="CH" size="md" />
        <span>Switzerland</span>
      </div>
    </div>
  ),
};
