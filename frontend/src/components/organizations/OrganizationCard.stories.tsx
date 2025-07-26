import type { Meta, StoryObj } from '@storybook/nextjs';
import OrganizationCard from './OrganizationCard';

const meta: Meta<typeof OrganizationCard> = {
  title: 'Components/Organizations/OrganizationCard',
  component: OrganizationCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockOrganization = {
  id: 1,
  name: 'Animal Rescue Bosnia',
  slug: 'animal-rescue-bosnia',
  city: 'Goražde',
  country: 'BA',
  website_url: 'https://www.animal-rescue-bosnia.org/',
  description: 'Animal Rescue Bosnia is a project of the EMKA Group for the rescue and placement of stray dogs without a home in new and loving hands in Europe.',
  logo_url: 'https://images.rescuedogs.me/rescue_dogs/organizations/org-logo-animalrescuebosnia.png',
  active: true,
  total_dogs: 45,
  new_this_week: 3,
  ships_to: ['UK', 'AT', 'DE', 'DK', 'NL'],
  established_year: 2019,
  recent_dogs: [
    {
      id: 1,
      name: 'Ksenon',
      slug: 'ksenon-rescue-bosnia',
      primary_image_url: 'https://images.rescuedogs.me/rescue_dogs/animals/ksenon-2.jpg'
    },
    {
      id: 2, 
      name: 'Mirta',
      slug: 'mirta-rescue-bosnia',
      primary_image_url: 'https://images.unsplash.com/photo-1551717743-49959800b1f6?w=400&h=300&fit=crop'
    },
    {
      id: 3,
      name: 'Lorka', 
      slug: 'lorka-rescue-bosnia',
      primary_image_url: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&h=300&fit=crop'
    }
  ],
  social_media: {
    website: 'https://www.animal-rescue-bosnia.org/',
    facebook: 'https://www.facebook.com/animalrescuebosnia/',
    instagram: 'https://www.instagram.com/animalrescuebosnia/'
  }
};

export const Default: Story = {
  args: {
    organization: mockOrganization,
  },
};

export const LargeInternationalOrganization: Story = {
  args: {
    organization: {
      id: 2,
      name: 'Pets in Turkey',
      slug: 'pets-in-turkey',
      city: 'Izmir',
      country: 'TR',
      website_url: 'https://www.petsinturkey.org/',
      description: 'We are a group of animal and nature loving people living in Switzerland with close ties to Turkey. Our mission is to help all breeds of cats and dogs in Turkey.',
      logo_url: 'https://images.rescuedogs.me/rescue_dogs/organizations/org-logo-pets-in-turkey.jpg',
      active: true,
      total_dogs: 189,
      new_this_week: 12,
      ships_to: ['UK', 'CH', 'NO', 'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK'],
      established_year: 2018,
      recent_dogs: [
        {
          id: 4,
          name: 'Ayla',
          slug: 'ayla-pets-turkey',
          primary_image_url: 'https://images.rescuedogs.me/rescue_dogs/animals/ayla-turkey.jpg'
        },
        {
          id: 5,
          name: 'Murat',
          slug: 'murat-pets-turkey',
          primary_image_url: 'https://images.unsplash.com/photo-1520175480921-4edfa2983e0f?w=400&h=300&fit=crop'
        },
        {
          id: 6,
          name: 'Zeynep',
          slug: 'zeynep-pets-turkey',
          primary_image_url: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=300&fit=crop'
        }
      ],
      social_media: {
        website: 'https://www.petsinturkey.org/',
        facebook: 'https://www.facebook.com/petsinturkey/',
        instagram: 'https://www.instagram.com/petsinturkey/'
      }
    },
  },
};

export const GermanRescue: Story = {
  args: {
    organization: {
      id: 3,
      name: 'Daisy Family Rescue e.V.',
      slug: 'daisy-family-rescue',
      city: 'Munich',
      country: 'DE',
      website_url: 'https://daisyfamilyrescue.de/',
      description: 'Daisy Family Rescue e.V. is a registered animal welfare organization in Germany dedicated to rescuing and rehoming dogs in need.',
      logo_url: 'https://images.rescuedogs.me/rescue_dogs/organizations/org-logo-daisy-family.png',
      active: true,
      total_dogs: 28,
      new_this_week: 2,
      ships_to: ['DE', 'AT', 'CH', 'NL', 'BE'],
      established_year: 2020,
      recent_dogs: [
        {
          id: 7,
          name: 'Tina',
          slug: 'tina-daisy-rescue',
          primary_image_url: 'https://images.rescuedogs.me/rescue_dogs/animals/tina-small.jpg'
        },
        {
          id: 8,
          name: 'Bruno',
          slug: 'bruno-daisy-rescue',
          primary_image_url: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=300&fit=crop'
        }
      ],
      social_media: {
        website: 'https://daisyfamilyrescue.de/',
        facebook: 'https://www.facebook.com/daisyfamilyrescue',
        instagram: 'https://www.instagram.com/daisyfamilyrescue'
      }
    },
  },
};