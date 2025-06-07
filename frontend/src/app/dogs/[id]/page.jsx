import { getAnimalById } from '../../../services/animalsService';
import DogDetailClient from './DogDetailClient';

export async function generateMetadata({ params }) {
  try {
    const dog = await getAnimalById(params.id);
    
    const title = `${dog.name} - ${dog.standardized_breed || dog.breed || 'Dog'} Available for Adoption | Rescue Dog Aggregator`;
    
    let description = `Meet ${dog.name}, a ${dog.standardized_breed || dog.breed || 'lovely dog'} looking for a forever home.`;
    
    if (dog.description || dog.properties?.description) {
      description += ` ${dog.description || dog.properties.description}`;
    } else {
      description += ' Available for adoption now.';
    }
    
    if (dog.organization) {
      description += ` Available for adoption from ${dog.organization.name}`;
      if (dog.organization.city || dog.organization.country) {
        description += ` in ${[dog.organization.city, dog.organization.country].filter(Boolean).join(', ')}.`;
      } else {
        description += '.';
      }
    }

    const metadata = {
      title,
      description,
      openGraph: {
        title: `${dog.name} - Available for Adoption`,
        description: `Meet ${dog.name}, a ${dog.standardized_breed || dog.breed || 'lovely dog'} looking for a forever home.${(dog.description || dog.properties?.description) ? ` ${dog.description || dog.properties.description}` : ''}`,
        type: 'article',
        siteName: 'Rescue Dog Aggregator'
      },
      twitter: {
        card: 'summary_large_image',
        title: `${dog.name} - Available for Adoption`,
        description: `Meet ${dog.name}, a ${dog.standardized_breed || dog.breed || 'lovely dog'} looking for a forever home.`
      }
    };

    if (dog.primary_image_url) {
      metadata.openGraph.images = [dog.primary_image_url];
      metadata.twitter.images = [dog.primary_image_url];
    }

    return metadata;
  } catch (error) {
    return {
      title: 'Dog Not Found | Rescue Dog Aggregator',
      description: 'The requested dog could not be found. Browse our available dogs for adoption.'
    };
  }
}

export default function DogDetailPage({ params }) {
  return <DogDetailClient params={params} />;
}