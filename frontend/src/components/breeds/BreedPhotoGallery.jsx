'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export default function BreedPhotoGallery({ dogs, breedName, className = "" }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const handleImageClick = (dog, index) => {
    setSelectedImage({ dog, index });
    setIsModalOpen(true);
  };
  
  const handleImageError = (e) => {
    e.target.src = '/images/dog-placeholder.jpg';
  };
  
  if (!dogs || dogs.length === 0) {
    return (
      <div className={`grid grid-cols-2 md:grid-cols-3 gap-2 ${className}`}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <div className={`breed-photo-gallery ${className}`}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {dogs?.slice(0, 6).map((dog, index) => (
          <div 
            key={dog.id} 
            className="aspect-square relative overflow-hidden rounded-lg cursor-pointer group"
            onClick={() => handleImageClick(dog, index)}
          >
            <Image
              src={dog.primary_image_url}
              alt={`${dog.name} - ${breedName} rescue dog`}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              priority={index < 3}
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              onError={handleImageError}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
            <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <span className="text-white text-sm font-medium bg-black/50 px-2 py-1 rounded">
                {dog.name}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {isModalOpen && selectedImage && (
        <ImageModal
          dog={selectedImage.dog}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          breedName={breedName}
        />
      )}
    </div>
  );
}

function ImageModal({ dog, isOpen, onClose, breedName }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative max-w-4xl max-h-[90vh] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors p-2"
          aria-label="Close modal"
        >
          <X size={24} />
        </button>
        
        <div className="bg-white rounded-lg overflow-hidden shadow-2xl">
          <div className="relative aspect-video">
            <Image
              src={dog.primary_image_url}
              alt={`${dog.name} - ${breedName} rescue dog`}
              fill
              className="object-cover"
              priority
            />
          </div>
          
          <div className="p-6">
            <h3 className="text-2xl font-bold mb-2">{dog.name}</h3>
            <p className="text-gray-600 mb-4">{breedName} • {dog.organization?.name}</p>
            <Link href={`/dogs/${dog.slug}`}>
              <Button className="w-full">
                View {dog.name}'s Profile
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}