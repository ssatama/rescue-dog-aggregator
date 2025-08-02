import type { Meta, StoryObj } from "@storybook/nextjs";
import AnimatedCounter from "./AnimatedCounter";

const meta: Meta<typeof AnimatedCounter> = {
  title: "UI/AnimatedCounter",
  component: AnimatedCounter,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const DogCount: Story = {
  args: {
    value: 45,
    duration: 2000,
  },
};

export const LargeDogCount: Story = {
  args: {
    value: 189,
    duration: 2500,
  },
};

export const NewThisWeek: Story = {
  args: {
    value: 12,
    duration: 1500,
  },
};

export const SmallCount: Story = {
  args: {
    value: 3,
    duration: 1000,
  },
};

export const ZeroCount: Story = {
  args: {
    value: 0,
    duration: 500,
  },
};

export const FastAnimation: Story = {
  args: {
    value: 28,
    duration: 800,
  },
};

export const SlowAnimation: Story = {
  args: {
    value: 67,
    duration: 4000,
  },
};
