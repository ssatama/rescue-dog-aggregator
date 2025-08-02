import type { Meta, StoryObj } from "@storybook/nextjs";

const TestComponent = () => {
  return (
    <div className="p-4 bg-blue-500 text-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-4">Tailwind Test</h1>
      <p className="text-sm opacity-80">
        If you can see blue background and white text, Tailwind is working!
      </p>
      <button className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 rounded transition-colors">
        Test Button
      </button>
    </div>
  );
};

const meta: Meta<typeof TestComponent> = {
  title: "Test/TailwindTest",
  component: TestComponent,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
