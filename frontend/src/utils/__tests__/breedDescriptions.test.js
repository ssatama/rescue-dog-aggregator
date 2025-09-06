import { getBreedDescription, getAllBreedDescriptions, hasBreedDescription } from '../breedDescriptions';

describe('Breed Descriptions', () => {
  describe('getBreedDescription', () => {
    it('returns description for known breed', () => {
      const description = getBreedDescription('Galgo');
      expect(description).toBeDefined();
      expect(description).toContain('Spanish Greyhounds');
      expect(description).toContain('gentle');
      expect(description).toContain('calm');
      expect(description.split(' ').length).toBeGreaterThanOrEqual(100);
      expect(description.split(' ').length).toBeLessThanOrEqual(150);
    });

    it('returns description for Podenco', () => {
      const description = getBreedDescription('Podenco');
      expect(description).toBeDefined();
      expect(description).toContain('energetic');
      expect(description).toContain('independent');
      expect(description.split(' ').length).toBeGreaterThanOrEqual(100);
      expect(description.split(' ').length).toBeLessThanOrEqual(150);
    });

    it('returns description for Collie', () => {
      const description = getBreedDescription('Collie');
      expect(description).toBeDefined();
      expect(description).toContain('intelligent');
      expect(description).toContain('loyal');
      expect(description.split(' ').length).toBeGreaterThanOrEqual(100);
      expect(description.split(' ').length).toBeLessThanOrEqual(150);
    });

    it('returns description for German Shepherd Dog', () => {
      const description = getBreedDescription('German Shepherd Dog');
      expect(description).toBeDefined();
      expect(description).toContain('versatile');
      expect(description).toContain('protective');
      expect(description.split(' ').length).toBeGreaterThanOrEqual(100);
      expect(description.split(' ').length).toBeLessThanOrEqual(150);
    });

    it('returns description for French Bulldog', () => {
      const description = getBreedDescription('French Bulldog');
      expect(description).toBeDefined();
      expect(description).toContain('affectionate');
      expect(description).toContain('apartment');
      expect(description.split(' ').length).toBeGreaterThanOrEqual(100);
      expect(description.split(' ').length).toBeLessThanOrEqual(150);
    });

    it('returns null for unknown breed', () => {
      const description = getBreedDescription('Unknown Breed XYZ');
      expect(description).toBeNull();
    });

    it('handles case-insensitive breed names', () => {
      const description1 = getBreedDescription('galgo');
      const description2 = getBreedDescription('GALGO');
      const description3 = getBreedDescription('Galgo');
      
      expect(description1).toEqual(description2);
      expect(description2).toEqual(description3);
      expect(description1).toBeDefined();
    });

    it('handles breed name variations', () => {
      // Test for breed name with trailing spaces
      const description1 = getBreedDescription('Galgo ');
      expect(description1).toBeDefined();
      
      // Test for breed name with leading spaces
      const description2 = getBreedDescription(' Galgo');
      expect(description2).toBeDefined();
    });
  });

  describe('getAllBreedDescriptions', () => {
    it('returns object with all breed descriptions', () => {
      const allDescriptions = getAllBreedDescriptions();
      
      expect(allDescriptions).toBeDefined();
      expect(typeof allDescriptions).toBe('object');
      expect(Object.keys(allDescriptions).length).toBeGreaterThanOrEqual(19); // At least 19 purebreds from PRD
    });

    it('includes all major breeds from PRD', () => {
      const allDescriptions = getAllBreedDescriptions();
      const expectedBreeds = [
        'Galgo',
        'Podenco',
        'Greyhound',
        'Collie',
        'Cocker Spaniel',
        'German Shepherd Dog',
        'Siberian Husky',
        'Staffordshire Bull Terrier',
        'French Bulldog',
        'Beagle'
      ];
      
      expectedBreeds.forEach(breed => {
        expect(allDescriptions[breed]).toBeDefined();
        expect(allDescriptions[breed].split(' ').length).toBeGreaterThanOrEqual(100);
        expect(allDescriptions[breed].split(' ').length).toBeLessThanOrEqual(150);
      });
    });

    it('all descriptions meet length requirements', () => {
      const allDescriptions = getAllBreedDescriptions();
      
      Object.entries(allDescriptions).forEach(([breed, description]) => {
        expect(description.split(' ').length).toBeGreaterThanOrEqual(100);
        expect(description.split(' ').length).toBeLessThanOrEqual(150);
      });
    });
  });

  describe('hasBreedDescription', () => {
    it('returns true for breeds with descriptions', () => {
      expect(hasBreedDescription('Galgo')).toBe(true);
      expect(hasBreedDescription('Podenco')).toBe(true);
      expect(hasBreedDescription('Collie')).toBe(true);
    });

    it('returns false for breeds without descriptions', () => {
      expect(hasBreedDescription('Unknown Breed')).toBe(false);
      expect(hasBreedDescription('Random Mix')).toBe(false);
      expect(hasBreedDescription('')).toBe(false);
    });

    it('handles case-insensitive checking', () => {
      expect(hasBreedDescription('galgo')).toBe(true);
      expect(hasBreedDescription('GALGO')).toBe(true);
      expect(hasBreedDescription('GaLgO')).toBe(true);
    });
  });

  describe('Breed description content quality', () => {
    it('descriptions contain key breed characteristics', () => {
      const galgoDesc = getBreedDescription('Galgo');
      // Should mention key traits like calm, gentle, exercise needs
      expect(galgoDesc).toMatch(/calm|gentle|lazy|exercise|nap/i);
      
      const collieDesc = getBreedDescription('Collie');
      // Should mention intelligence and herding
      expect(collieDesc).toMatch(/intelligent|smart|herd|active|energy/i);
    });

    it('descriptions mention suitable home environment', () => {
      const frenchBulldogDesc = getBreedDescription('French Bulldog');
      expect(frenchBulldogDesc).toMatch(/apartment|home|family|companion/i);
      
      const huskyDesc = getBreedDescription('Siberian Husky');
      expect(huskyDesc).toMatch(/active|exercise|space|yard/i);
    });

    it('descriptions avoid technical jargon', () => {
      const allDescriptions = getAllBreedDescriptions();
      
      Object.values(allDescriptions).forEach(description => {
        // Should not contain overly technical terms
        expect(description).not.toMatch(/phenotype|genotype|allele|chromosome/i);
        // Should use accessible language
        expect(description).toMatch(/dog|pet|companion|family/i);
      });
    });
  });
});