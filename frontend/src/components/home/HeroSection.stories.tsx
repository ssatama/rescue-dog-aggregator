import type { Meta, StoryObj } from '@storybook/nextjs';
import HeroSection from './HeroSection';

const meta: Meta<typeof HeroSection> = {
  title: 'Components/Home/HeroSection',
  component: HeroSection,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithCustomMessage: Story = {
  args: {
    title: 'Find Your Perfect Companion',
    subtitle: 'Connect with rescue organizations worldwide to find dogs in need of loving homes.',
  },
};

export const InternationalFocus: Story = {
  args: {
    title: 'Rescue Dogs from Around the World',
    subtitle: 'Discover amazing dogs from Bosnia, Turkey, Germany, Cyprus and the UK waiting for their forever homes.',
  },
};

export const MobileView: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};