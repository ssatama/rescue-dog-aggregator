import type { Meta, StoryObj } from '@storybook/nextjs';
import { Button } from './button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: { type: 'select' },
      options: ['default', 'sm', 'lg', 'icon'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: 'Meet Ksenon →',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'View Profile',
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Remove from Favorites',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Learn More',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Share',
  },
};

export const Link: Story = {
  args: {
    variant: 'link',
    children: 'Visit Website',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Find Your Perfect Companion',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Filter',
  },
};