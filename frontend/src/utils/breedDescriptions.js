/**
 * Breed descriptions utility
 * Provides concise breed descriptions (100-150 words) for breed detail pages
 */

const BREED_DESCRIPTIONS = {
  'Galgo': `Spanish Greyhounds are gentle sighthounds known for their calm, affectionate nature. Despite their athletic build, they're surprisingly lazy, preferring short bursts of exercise followed by long naps. These sensitive souls thrive in quiet homes and bond deeply with their families. Most rescue Galgos are retired from hunting and adapt wonderfully to apartment living. They're typically good with other dogs but may chase small animals. Ideal for patient adopters who appreciate their independent yet loving personality.`,
  
  'Podenco': `Podencos are energetic, independent hunters from Spain with keen intelligence and playful spirits. These athletic dogs need regular exercise and mental stimulation but can be wonderfully affectionate companions. They're known for their distinctive upright ears and alert expression. While they can be reserved with strangers, they're deeply loyal to their families. Podencos do best with experienced owners who understand their high prey drive and need for secure fencing. Their adaptable nature makes them suitable for various living situations with proper exercise.`,
  
  'Greyhound': `Greyhounds are gentle giants known as "45 mph couch potatoes." Despite their racing background, they're calm indoor companions who need surprisingly little exercise. These sweet-natured dogs are typically quiet, clean, and well-mannered. They bond strongly with their families and often do well in apartments. Most retired racers adapt quickly to home life, though they may need help learning about stairs and glass doors. Their thin skin and lean build mean they need soft bedding and warm coats in cold weather.`,
  
  'Collie': `Collies are intelligent, loyal herding dogs famous for their devotion to family. These sensitive souls are excellent with children and make wonderful family pets. They're highly trainable and eager to please, though they can be vocal. Collies need regular exercise and mental stimulation to prevent boredom. Their beautiful coat requires regular grooming. They thrive in homes where they can be part of daily activities. Their gentle nature and intuitive understanding of human emotions make them excellent therapy and companion dogs.`,
  
  'Cocker Spaniel': `Cocker Spaniels are cheerful, affectionate dogs with gentle temperaments. These medium-sized companions are known for their beautiful, silky coats and expressive eyes. They're excellent family dogs who love children and get along well with other pets. Cockers are intelligent and trainable but can be sensitive. They need regular exercise and enjoy activities like fetch and swimming. Their coat requires regular grooming to prevent matting. These adaptable dogs do well in various living situations as long as they receive plenty of attention and affection.`,
  
  'German Shepherd Dog': `German Shepherds are versatile, intelligent working dogs known for loyalty and protective instincts. These confident dogs excel at various tasks and are devoted family guardians. They need experienced owners who can provide consistent training and socialization. GSDs require substantial daily exercise and mental stimulation. They're excellent with children they're raised with but can be reserved with strangers. Their double coat sheds year-round and needs regular brushing. These dogs thrive when given a job to do and form incredibly strong bonds with their families.`,
  
  'Siberian Husky': `Siberian Huskies are energetic, friendly dogs bred for endurance in harsh climates. These social, pack-oriented dogs are known for their striking appearance and vocal nature. They need substantial daily exercise and do best with active families. Huskies are intelligent but independent, making training a patient endeavor. They're typically good with children and other dogs but have high prey drive. Their thick coat requires regular brushing and sheds heavily twice yearly. These escape artists need secure fencing and plenty of mental stimulation to prevent destructive behavior.`,
  
  'Staffordshire Bull Terrier': `Staffordshire Bull Terriers, or "Staffies," are muscular, affectionate dogs known for their love of people. Despite their tough appearance, they're gentle, especially with children, earning the nickname "nanny dogs." These energetic companions need regular exercise and mental stimulation. They're intelligent and eager to please but can be strong-willed. Staffies typically love other dogs when properly socialized. Their short coat is low-maintenance. These loyal dogs form strong bonds with their families and thrive on human companionship, making them excellent family pets for active households.`,
  
  'French Bulldog': `French Bulldogs are charming, affectionate companions perfect for apartment living. These adaptable dogs are known for their distinctive "bat ears" and playful personalities. They're excellent with children and make wonderful family pets. Frenchies need minimal exercise but enjoy short walks and playtime. Their flat faces mean they're sensitive to heat and need climate-controlled environments. They can be stubborn but respond well to positive training. These social butterflies love being center of attention. Their minimal grooming needs and calm indoor demeanor make them ideal urban companions.`,
  
  'Beagle': `Beagles are friendly, curious hounds with merry personalities and excellent noses. These pack dogs are social and typically great with children and other dogs. They're sturdy, medium-sized companions who need regular exercise to prevent weight gain. Beagles can be vocal and will "bay" when excited. Their strong hunting instincts mean they need secure fencing and leash walking. They're intelligent but can be stubborn, following their noses over commands. Their short coat is easy to maintain. These cheerful dogs make wonderful family pets for active households.`,
  
  'Cavalier King Charles Spaniel': `Cavalier King Charles Spaniels are gentle, affectionate toy spaniels perfect for companionship. These adaptable dogs are equally happy on adventures or cuddling on laps. They're excellent with children, seniors, and other pets. Cavaliers are intelligent and eager to please, making training enjoyable. They need moderate exercise and love interactive play. Their silky coat requires regular brushing to prevent tangles. These social dogs don't do well alone for long periods. Their sweet, gentle nature and portable size make them ideal therapy dogs and family companions.`,
  
  'Labrador Retriever': `Labrador Retrievers are friendly, outgoing dogs known for their love of everyone. These energetic companions excel as family pets, therapy dogs, and working partners. Labs are highly intelligent and eager to please, making them very trainable. They need substantial daily exercise and love swimming. These food-motivated dogs can gain weight easily. Labs are excellent with children and typically good with other pets. Their short, dense coat sheds year-round. These loyal, patient dogs thrive in active families who can match their enthusiasm for life and adventure.`,
  
  'Jack Russell Terrier': `Jack Russell Terriers are small dogs with enormous personalities and endless energy. These intelligent, fearless terriers were bred for fox hunting and retain strong prey drive. They need extensive daily exercise and mental stimulation to prevent destructive behavior. JRTs are clever and independent, requiring patient, consistent training. They can be territorial and may not suit homes with small pets. Their minimal grooming needs are offset by their high activity requirements. These spirited dogs are best for experienced, active owners who appreciate their bold, entertaining nature.`,
  
  'Border Collie': `Border Collies are brilliant herding dogs considered the most intelligent breed. These intense, focused workers need jobs to stay happy and balanced. They require extensive physical and mental exercise daily. Border Collies excel at dog sports and training but can develop obsessive behaviors without proper outlets. They're loyal and affectionate with family but may be reserved with strangers. Their weather-resistant coat needs regular brushing. These dogs aren't suited for casual pet owners; they thrive with active, dedicated handlers who can channel their incredible drive and intelligence.`,
  
  'Bulldog': `Bulldogs are gentle, affectionate companions known for their distinctive wrinkled faces and sturdy builds. Despite their tough appearance, they're sweet-natured and excellent with children. These low-energy dogs are perfect for apartment living, needing only moderate exercise. Bulldogs are prone to overheating and need climate-controlled environments. They can be stubborn but respond to patient training. Their facial wrinkles need regular cleaning to prevent infections. These loyal, comical dogs form strong bonds with families. Their calm demeanor and minimal exercise needs make them ideal companions for less active households.`,
  
  'Poodle': `Poodles are intelligent, athletic dogs that come in three sizes but share similar temperaments. These highly trainable companions excel at various activities from agility to therapy work. They're typically good with children and other pets when socialized. Poodles need regular exercise and mental stimulation to prevent boredom. Their hypoallergenic coat requires professional grooming every 6-8 weeks. They're sensitive dogs who thrive on positive reinforcement. These elegant, playful dogs make excellent family pets for those willing to maintain their grooming needs and match their active, intelligent nature.`,
  
  'Yorkshire Terrier': `Yorkshire Terriers are tiny dogs with big personalities and brave hearts. These portable companions are affectionate with family but can be suspicious of strangers. Yorkies are intelligent and trainable but can be stubborn. Despite their size, they need daily exercise and mental stimulation. Their long, silky coat requires daily brushing to prevent matting. They can be vocal and make excellent watchdogs. These terriers may not suit homes with young children due to their delicate size. Their adaptability and small size make them perfect for apartment living with devoted owners.`,
  
  'Shih Tzu': `Shih Tzus are affectionate lap dogs bred for companionship in Chinese palaces. These friendly, outgoing dogs love everyone and make excellent family pets. They're adaptable to various living situations and need only moderate exercise. Shih Tzus are intelligent but can be stubborn during training. Their long, luxurious coat requires daily brushing and regular grooming. They're typically good with children and other pets. These dogs don't tolerate heat well due to their flat faces. Their cheerful disposition and portable size make them ideal companions for apartments, seniors, and families.`,
  
  'Lurcher': `Lurchers are unique sighthound crosses, typically combining speed with intelligence and versatility. These gentle, affectionate dogs make wonderful family companions despite their hunting heritage. They need regular exercise but are calm indoors, earning them "part-time athlete" status. Lurchers are typically good with children and can live with other dogs. Their thin skin means they need warm bedding and coats in winter. They retain prey drive and need secure areas for off-leash exercise. These adaptable, loving dogs suit various households that understand their sighthound nature and exercise needs.`,
  
  'Mixed Breed': `Mixed breed dogs combine traits from multiple breeds, creating unique personalities and appearances. These one-of-a-kind companions often have fewer inherited health issues due to genetic diversity. Every mixed breed is different, with temperaments ranging from calm to energetic, making them suitable for various lifestyles. They can excel at any activity from couch warming to agility. Mixed breeds often display the best qualities of their component breeds. Their unpredictable adult size and temperament make them adventures in themselves. These special dogs prove that pedigree isn't necessary for unconditional love and loyalty.`
};

/**
 * Get breed description for a specific breed
 * @param {string} breedName - Name of the breed
 * @returns {string|null} - Breed description or null if not found
 */
export function getBreedDescription(breedName) {
  if (!breedName) return null;
  
  // Normalize breed name (trim and handle case)
  const normalizedBreed = breedName.trim();
  
  // Try exact match first
  if (BREED_DESCRIPTIONS[normalizedBreed]) {
    return BREED_DESCRIPTIONS[normalizedBreed];
  }
  
  // Try case-insensitive match
  const breedKey = Object.keys(BREED_DESCRIPTIONS).find(
    key => key.toLowerCase() === normalizedBreed.toLowerCase()
  );
  
  return breedKey ? BREED_DESCRIPTIONS[breedKey] : null;
}

/**
 * Get all available breed descriptions
 * @returns {Object} - Object with all breed descriptions
 */
export function getAllBreedDescriptions() {
  return { ...BREED_DESCRIPTIONS };
}

/**
 * Check if a breed has a description available
 * @param {string} breedName - Name of the breed
 * @returns {boolean} - True if description exists
 */
export function hasBreedDescription(breedName) {
  return getBreedDescription(breedName) !== null;
}

export default {
  getBreedDescription,
  getAllBreedDescriptions,
  hasBreedDescription
};