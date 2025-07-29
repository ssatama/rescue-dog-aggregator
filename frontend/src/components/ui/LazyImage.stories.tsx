import type { Meta, StoryObj } from '@storybook/nextjs';
import LazyImage from './LazyImage';

const meta: Meta<typeof LazyImage> = {
  title: 'UI/LazyImage',
  component: LazyImage,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const DogImage: Story = {
  args: {
    src: 'https://images.rescuedogs.me/rescue_dogs/animals/ksenon-2.jpg',
    alt: 'Ksenon - Mixed Breed from Animal Rescue Bosnia',
    className: 'w-64 h-48 object-cover rounded-lg',
  },
};

export const SmallDogImage: Story = {
  args: {
    src: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&h=300&fit=crop',
    alt: 'Small rescue dog',
    className: 'w-32 h-32 object-cover rounded-full',
  },
};

export const OrganizationLogo: Story = {
  args: {
    src: 'https://images.rescuedogs.me/rescue_dogs/organizations/org-logo-animalrescuebosnia.png',
    alt: 'Animal Rescue Bosnia logo',
    className: 'w-16 h-16 object-contain',
  },
};

export const LargeDogImage: Story = {
  args: {
    src: 'https://images.unsplash.com/photo-1551717743-49959800b1f6?w=800&h=600&fit=crop',
    alt: 'Large rescue dog portrait',
    className: 'w-96 h-64 object-cover rounded-xl shadow-lg',
  },
};

export const WithFallback: Story = {
  args: {
    src: 'https://broken-url.com/missing-image.jpg',
    alt: 'Dog image that will fail to load',
    className: 'w-64 h-48 object-cover rounded-lg',
  },
};

export const ResponsiveImage: Story = {
  args: {
    src: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=400&fit=crop',
    alt: 'Responsive dog image',
    className: 'w-full max-w-sm h-48 object-cover rounded-lg',
  },
};